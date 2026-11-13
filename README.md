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

1. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local` to the real business WhatsApp number (country code +212, digits only). The order form opens WhatsApp with a prefilled order; the customer **must press Send**. It does not store or process orders on a server.
2. Set `NEXT_PUBLIC_PRODUCT_PRICE` to your verified selling price in MAD.
3. Update `NEXT_PUBLIC_DELIVERY_TEXT` to the real delivery terms.
4. Check product ingredients and any claims against packaging and substantiation. The current copy deliberately avoids medical or hair-growth promises.
5. Add privacy policy, returns, merchant details, analytics and a real order backend before production if required.

Edit page copy and FAQs in `app/page.tsx`; styles are in `app/globals.css`.

## Brand update
- Original purple Reviora logo: `public/images/reviora-logo.png`
- Bilingual French/Arabic headlines, navigation, FAQ, and checkout labels.
- Default product price: **179 MAD**. You can override it with `NEXT_PUBLIC_PRODUCT_PRICE=179` in `.env.local`.

## Language selector
Use the **العربية / FR** buttons in the header to switch the entire page between Arabic (RTL) and French (LTR). The page never mixes the two languages. All product copy, navigation, FAQ, checkout fields, messages, and price labels change together. The price defaults to **179 MAD**.

## Positionnement produit
Reviora est présenté comme un shampooing anti-chute / شامبو مضاد لتساقط الشعر dans les deux versions linguistiques. Les affirmations de performance doivent être validées avec les preuves produit avant publication.
