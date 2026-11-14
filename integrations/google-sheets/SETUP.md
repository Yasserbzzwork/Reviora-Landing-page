# Private Google Sheets checkout integration

The checkout uses an authenticated Google Sheets API request from the website server. The spreadsheet stays private. No public Apps Script deployment is required, and customers do not sign in to Google.

## Existing orders spreadsheet

[Reviora Orders](https://docs.google.com/spreadsheets/d/1UVeZ1FUOA61Vz6vEFlxVkXN97Hd0_AI4mrg8VO75Nws/edit) has an `Orders` tab with the expected headers.

## Current Google resources

- Project: `ornate-axiom-514618-h2` (Reviora Orders).
- Dedicated service account: `reviora-orders@ornate-axiom-514618-h2.iam.gserviceaccount.com`.
- Google Sheets API enabled; no project-wide roles were granted.
- Active credential: locally generated RSA key, with only its public X.509 certificate uploaded to Google. The private key is in ignored `.env.local` with owner-only permissions.
- The uploaded certificate expires on November 13, 2027. Replace the credential before expiry. The earlier Google-generated key was left in place at the owner’s request.
- Verified live checkout submission on November 13, 2026: order `59f1622a-3150-4b78-bb3e-289c736d4a79`, labelled **TEST ORDER - DO NOT SHIP**, was saved to row 2 and read back from the spreadsheet.

## One-time Google setup

1. Create a dedicated Google Cloud project and enable the **Google Sheets API**. Billing is not needed for this integration.
2. Create a service account named **Reviora Orders**. Do not grant it project-wide IAM roles or domain-wide delegation.
3. Create a JSON key for that service account and store it securely outside source control.
4. Share only the orders spreadsheet with the service account's email address as **Editor**. Keep general access **Restricted**.
5. Configure these server-only values in ignored `.env.local` and in the production host when deployed:

```dotenv
GOOGLE_SHEETS_SPREADSHEET_ID=1UVeZ1FUOA61Vz6vEFlxVkXN97Hd0_AI4mrg8VO75Nws
GOOGLE_SHEETS_TAB=Orders
GOOGLE_SERVICE_ACCOUNT_EMAIL=SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="PEM_PRIVATE_KEY_WITH_ESCAPED_NEWLINES"
```

Never prefix these credentials with `NEXT_PUBLIC_`, put them in the browser, or commit them. The server exchanges a signed assertion for a short-lived Sheets API access token.

The development server must load the new environment settings. Keep it running on port 3000; Next.js normally reloads after `.env.local` changes.

## Verify

Submit a clearly labelled test order. The website should show the order reference only after Google confirms one row was saved. Confirm the row in `Orders` and then retry the same request ID to check that no duplicate row appears.

Columns: order ID, UTC timestamp, name, phone, city, address, product, quantity, unit price, product subtotal, currency, delivery terms, language, and status. Status starts as `New` and can be updated manually in the spreadsheet.

Prices are calculated on the server. Phone formats are unrestricted. Values use `RAW` mode so customer input is stored as text and never executed as a spreadsheet formula. The server serializes writes and checks existing order IDs before appending. This protects retries on a single server instance; use a durable database with unique order IDs before scaling checkout across multiple server instances, because the Sheets append API has no atomic uniqueness constraint.

Until credentials are configured, checkout shows a localized unavailable message and preserves the customer's input. It never pretends to save an order.

## Apps Script project

The bound Apps Script project was used to initialize the spreadsheet. It is **not deployed publicly** and is not used by checkout. The `Code.gs` source remains as an optional initialization helper; no webhook configuration is used by the application.

Google documentation: [service account authentication](https://developers.google.com/identity/protocols/oauth2/service-account), [appending spreadsheet rows](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append).
