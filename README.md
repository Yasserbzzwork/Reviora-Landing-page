# Reviora — Next.js landing page

Mobile-first Arabic (RTL) COD landing page for Morocco. Includes all 4 supplied Reviora assets in `public/images`.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Before launching

1. Connect the private Google Sheets integration using [the setup guide](integrations/google-sheets/SETUP.md). Checkout saves orders through `/api/orders` using server-only service account credentials and confirms success only after Google acknowledges the write.
2. Set `NEXT_PUBLIC_PRODUCT_PRICE` to your verified selling price in MAD.
3. Update `NEXT_PUBLIC_DELIVERY_TEXT` to the real delivery terms.
4. Check product ingredients and any claims against packaging and substantiation. The current copy deliberately avoids medical or hair-growth promises.
5. Add your privacy policy, returns terms, and merchant details before production.

Edit page copy and FAQs in `app/page.tsx`; styles are in `app/globals.css`.

## Brand update
- Original purple Reviora logo: `public/images/reviora-logo.png`
- Bilingual French/Arabic headlines, navigation, FAQ, and checkout labels.
- Default product price: **179 MAD**. You can override it with `NEXT_PUBLIC_PRODUCT_PRICE=179` in `.env.local`.

## Language selector
Use the **العربية / FR** buttons in the header to switch the entire page between Arabic (RTL) and French (LTR). The page never mixes the two languages. All product copy, navigation, FAQ, checkout fields, messages, and price labels change together. The price defaults to **179 MAD**.

## Positionnement produit
Reviora est présenté comme un shampooing anti-chute / شامبو مضاد لتساقط الشعر dans les deux versions linguistiques. Les affirmations de performance doivent être validées avec les preuves produit avant publication.

## Storefront interactions

- The language choice is remembered locally on the visitor’s device.
- The gallery supports thumbnails, directional buttons, horizontal swipes, and keyboard arrows. Open the enlarged image with the + button; Escape closes it.
- Checkout shows a live product subtotal. Delivery fees are confirmed separately before shipping.
- The phone field accepts any format without country or formatting restrictions.
- Development assets are written to `.next-dev/`, separate from production `.next/`, so a production build does not overwrite the running preview.

## Order integration

Checkout writes orders to a private Google Sheet through the authenticated Sheets API. Follow [Google Sheets setup](integrations/google-sheets/SETUP.md) to configure the dedicated service account. Run `npm test` for order validation, pricing, signed authentication, Google acknowledgement, RAW text handling, and retry deduplication checks.

## Meta Pixel events

Set `NEXT_PUBLIC_META_PIXEL_ID` to your real numeric Meta Pixel ID when available. Until then, no Meta script loads and no events are sent. Restart/rebuild the app after configuring this public build-time value, including on the production host.

- `PageView`: once per page load.
- `ViewContent`: once per page load for Reviora 150 ml.
- `InitiateCheckout`: once per page load when a shopper clicks an order link or interacts with the order form.
- `Purchase`: only after the server confirms the order was saved in Google Sheets. This measures a submitted cash-on-delivery order, not a collected payment. The order reference is used as the event ID; value and quantity come from the server. Delivery charges are excluded because they are not known yet.

Events include a stable product ID (`reviora-shampoo-150ml`), quantity, value and `MAD` currency. Automatic event configuration and advanced matching are not enabled; customer names, phone numbers, cities and addresses are not included in event payloads. There is no `AddToCart` event because the storefront has no cart. Analytics errors cannot block checkout.

After adding the ID, verify a visit, checkout start and successful test order in Meta Events Manager → Test events. Live Meta receipt cannot be verified until the real ID is configured. Browser tracking may be blocked by visitor privacy settings or ad blockers. Conversions API is not configured by this change.
