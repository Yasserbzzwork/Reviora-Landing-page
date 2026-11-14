import { readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import an owner-provided service-account key without printing credential contents.
const filename = process.argv[2];
if (!filename) throw new Error('Usage: node scripts/connect-google-sheets.mjs /absolute/path/to/key.json');
const credentials = JSON.parse(await readFile(path.resolve(filename), 'utf8'));
if (credentials.type !== 'service_account' ||
    credentials.client_email !== 'reviora-orders@ornate-axiom-514618-h2.iam.gserviceaccount.com' ||
    typeof credentials.private_key !== 'string' || !credentials.private_key.includes('PRIVATE KEY')) {
  throw new Error('The file is not the expected Reviora service-account credential.');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
let current = '';
try { current = await readFile(envFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const values = {
  GOOGLE_SHEETS_SPREADSHEET_ID: '1UVeZ1FUOA61Vz6vEFlxVkXN97Hd0_AI4mrg8VO75Nws',
  GOOGLE_SHEETS_TAB: 'Orders',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: credentials.client_email,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: JSON.stringify(credentials.private_key),
};
let lines = current.split('\n').filter(line => !Object.keys(values).some(key => line.startsWith(key + '=')));
lines = lines.filter(line => line.trim());
for (const [key,value] of Object.entries(values)) lines.push(`${key}=${value}`);
await writeFile(envFile, lines.join('\n') + '\n', {mode:0o600});
await chmod(envFile, 0o600);
console.log('Private Google Sheets credentials configured. No secret values were printed.');
