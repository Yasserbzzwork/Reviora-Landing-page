/**
 * Paste into a standalone Google Apps Script project.
 * setup() generates a private ORDER_SECRET in Script properties.
 * Run setup() once, then deploy as a Web app: Execute as Me, access Anyone.
 * Keep the spreadsheet private. The endpoint requires the server-only secret.
 */
const HEADERS = [
  'Order ID', 'Created at (UTC)', 'Name', 'Phone', 'City', 'Address', 'Product',
  'Quantity', 'Unit price (MAD)', 'Product subtotal (MAD)', 'Currency',
  'Delivery terms', 'Language', 'Status'
];

function setup() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('ORDER_SECRET')) {
    properties.setProperty('ORDER_SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  let spreadsheet;
  const id = properties.getProperty('SPREADSHEET_ID');
  if (id) {
    spreadsheet = SpreadsheetApp.openById(id);
  } else {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('Reviora Orders');
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }
  let sheet = spreadsheet.getSheetByName('Orders');
  if (!sheet) {
    // Reuse the initial empty sheet in a newly created workbook.
    sheet = spreadsheet.getSheets().length === 1 && spreadsheet.getSheets()[0].getLastRow() === 0
      ? spreadsheet.getSheets()[0].setName('Orders') : spreadsheet.insertSheet('Orders');
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setBackground('#5725a0').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).createFilter();
    sheet.setColumnWidths(1, HEADERS.length, 160);
    sheet.setColumnWidth(1, 290);
    sheet.setColumnWidth(6, 280);
    sheet.setColumnWidth(7, 280);
    sheet.setColumnWidth(12, 260);
  }
  console.log(spreadsheet.getUrl());
}

function doPost(event) {
  const reply = (value) => ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('ORDER_SECRET');
    const payload = JSON.parse(event.postData.contents);
    if (!expectedSecret || expectedSecret.length < 32 || payload.secret !== expectedSecret) {
      return reply({ ok: false });
    }
    const order = payload.order;
    if (!order || !/^[0-9a-f-]{36}$/i.test(order.orderId) ||
        !Number.isInteger(order.quantity) || order.quantity < 1 || order.quantity > 10 ||
        !Number.isFinite(order.unitPrice) || order.unitPrice <= 0 ||
        order.subtotal !== Math.round(order.unitPrice * order.quantity * 100) / 100 ||
        !['name', 'phone', 'city', 'address'].every(key => typeof order[key] === 'string' && order[key].trim())) {
      return reply({ ok: false });
    }
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID')).getSheetByName('Orders');
    if (!sheet || sheet.getRange(1, 1).getValue() !== HEADERS[0]) return reply({ ok: false });
    // The lock makes checking and appending atomic across simultaneous requests.
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
        .createTextFinder(order.orderId).matchEntireCell(true).findNext()) {
      return reply({ ok: true, orderId: order.orderId });
    }
    // Keep phone numbers and user input as text; never interpret a customer's input as a formula.
    const text = value => {
      const string = String(value == null ? '' : value);
      return /^[\s]*[=+@-]/.test(string) ? "'" + string : string;
    };
    const row = [order.orderId, order.createdAt, order.name, order.phone, order.city, order.address,
      order.product, order.quantity, order.unitPrice, order.subtotal, order.currency,
      order.delivery, order.language, 'New'];
    const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length);
    target.setNumberFormat('@');
    target.setValues([row.map(value => typeof value === 'number' ? value : text(value))]);
    target.setVerticalAlignment('top').setWrap(true);
    sheet.getRange(target.getRow(), 8).setNumberFormat('0');
    sheet.getRange(target.getRow(), 9, 1, 2).setNumberFormat('0.00');
    SpreadsheetApp.flush();
    return reply({ ok: true, orderId: order.orderId });
  } catch (_) {
    return reply({ ok: false });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
