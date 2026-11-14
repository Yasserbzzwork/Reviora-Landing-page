import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createAssertion } from '../lib/google-sheets.mjs';
import { prepareOrder, saveOrder } from '../lib/orders.mjs';

const input = {
  orderId: 'c077b951-d3b5-4b54-b5c8-39a9ac219e71',
  name: 'Test Customer', phone: '+1 (555) 123-4567 ext 42',
  city: 'Test City', address: 'Test Address', quantity: 2, language: 'fr',
};
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: {type:'pkcs8',format:'pem'}, publicKeyEncoding: {type:'spki',format:'pem'} });
const config = {
  GOOGLE_SHEETS_SPREADSHEET_ID: 'test-spreadsheet',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'orders@test-project.iam.gserviceaccount.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey,
};

test('prices come from server configuration, never the customer', () => {
  const order = prepareOrder({ ...input, unitPrice: 1, subtotal: 1 }, { NEXT_PUBLIC_PRODUCT_PRICE: '179' });
  assert.equal(order.unitPrice, 179);
  assert.equal(order.subtotal, 358);
  assert.equal(order.delivery, 'À confirmer lors de la commande');
});
test('phone formats are unrestricted and preserved', () => {
  for (const phone of ['0612345678', '+212 (6) 12-34-56-78', '0032 470 00 00 00', '555 ext. 2', '١٢٣٤٥٦']) {
    assert.equal(prepareOrder({ ...input, phone }).phone, phone);
  }
});
test('rejects missing customer details, invalid quantities, IDs and languages', () => {
  for (const patch of [{phone:''}, {name:' '}, {address:null}, {city:'x'.repeat(161)}, {quantity:0}, {quantity:11}, {quantity:1.5}, {orderId:'x'}, {language:'xx'}]) {
    assert.throws(() => prepareOrder({ ...input, ...patch }), /INVALID_ORDER/);
  }
});
test('rejects missing private credentials without sending data', async () => {
  for (const env of [{}, {...config, GOOGLE_SHEETS_SPREADSHEET_ID:'bad/id'}, {...config, GOOGLE_SERVICE_ACCOUNT_EMAIL:''}]) {
    await assert.rejects(saveOrder(prepareOrder(input), env, () => assert.fail('must not send')), /NOT_CONFIGURED/);
  }
});
test('signs the service account assertion with a Sheets-only scope', () => {
  const assertion = createAssertion(config.GOOGLE_SERVICE_ACCOUNT_EMAIL, privateKey, 1000);
  const [header, body, signature] = assertion.split('.');
  const claims = JSON.parse(Buffer.from(body,'base64url').toString());
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
  assert.equal(claims.exp, 4600);
  assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(createVerify('RSA-SHA256').update(`${header}.${body}`).verify(publicKey,signature,'base64url'),true);
});
function fakeSheets() {
  const rows = [['Order ID']];
  let writes = 0;
  const fetcher = async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({access_token:'test-token', expires_in:3600});
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url.includes(':append?')) {
      assert.ok(url.includes('valueInputOption=RAW'));
      const {values} = JSON.parse(options.body);
      rows.push(values[0]); writes++;
      return Response.json({spreadsheetId:'test-spreadsheet',updates:{updatedRows:1}});
    }
    return Response.json({values:rows});
  };
  return {fetcher,rows,get writes(){return writes;}};
}
test('saves customer input as RAW text, preserves phone and confirms Google acknowledgement', async () => {
  const fake = fakeSheets();
  const order = prepareOrder({...input,name:'=IMPORTXML("example")'});
  assert.deepEqual(await saveOrder(order,config,fake.fetcher),{orderId:order.orderId});
  assert.equal(fake.rows[1][2], order.name);
  assert.equal(fake.rows[1][3], input.phone);
  assert.equal(fake.rows[1][9], 358);
});
test('retries and simultaneous duplicate requests create one row on the server instance', async () => {
  const fake = fakeSheets();
  const order = prepareOrder(input);
  await Promise.all([saveOrder(order,config,fake.fetcher),saveOrder(order,config,fake.fetcher)]);
  await saveOrder(order,config,fake.fetcher);
  assert.equal(fake.writes,1);
});
test('does not confirm failed writes or malformed Google acknowledgements', async () => {
  for (const result of [new Response('failed',{status:500}),Response.json({updates:{updatedRows:0}})]) {
    const fake=fakeSheets();
    await assert.rejects(saveOrder(prepareOrder(input),config,async (url,options)=>url.includes(':append?')?result:fake.fetcher(url,options)),/SAVE_FAILED/);
  }
});
