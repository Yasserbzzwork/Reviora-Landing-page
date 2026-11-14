import { createHash, createSign } from 'node:crypto';

const tokenCache = new Map();
const sheetQueues = new Map();
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export function createAssertion(email, privateKey, now = Math.floor(Date.now() / 1000)) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}

async function accessToken(email, privateKey, fetcher) {
  const key = createHash('sha256').update(email + privateKey).digest('hex');
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const response = await fetcher(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: createAssertion(email, privateKey) }),
    signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  if (!response.ok) throw new Error('SAVE_FAILED');
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('SAVE_FAILED');
  // Retain only the current credential's short-lived token.
  tokenCache.clear();
  tokenCache.set(key, { token: data.access_token, expires: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

export async function savePrivateOrder(order, env = process.env, fetcher = fetch) {
  const id = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const tab = env.GOOGLE_SHEETS_TAB || 'Orders';
  if (!id || !/^[\w-]+$/.test(id) || !email?.endsWith('.iam.gserviceaccount.com') || !privateKey?.includes('PRIVATE KEY')) throw new Error('NOT_CONFIGURED');
  const queueKey = `${id}:${tab}`;
  const previous = sheetQueues.get(queueKey) || Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    const token = await accessToken(email, privateKey, fetcher);
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/`;
    const quotedTab = `'${tab.replace(/'/g, "''")}'`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const read = await fetcher(`${base}${encodeURIComponent(`${quotedTab}!A:A`)}`, {
      headers, signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
    if (!read.ok) throw new Error('SAVE_FAILED');
    const existing = await read.json();
    if (existing.values?.[0]?.[0] !== 'Order ID') throw new Error('SAVE_FAILED');
    if (existing.values.some(row => row[0] === order.orderId)) return { orderId: order.orderId };
    const row = [order.orderId, order.createdAt, order.name, order.phone, order.city, order.address,
      order.product, order.quantity, order.unitPrice, order.subtotal, order.currency, order.delivery, order.language, 'New'];
    const response = await fetcher(`${base}${encodeURIComponent(`${quotedTab}!A:N`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST', headers, body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
      signal: AbortSignal.timeout(20000), cache: 'no-store',
    });
    if (!response.ok) throw new Error('SAVE_FAILED');
    const result = await response.json();
    if (result.spreadsheetId !== id || result.updates?.updatedRows !== 1) throw new Error('SAVE_FAILED');
    return { orderId: order.orderId };
  });
  sheetQueues.set(queueKey, operation);
  try { return await operation; }
  finally { if (sheetQueues.get(queueKey) === operation) sheetQueues.delete(queueKey); }
}
