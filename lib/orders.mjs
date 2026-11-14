import { savePrivateOrder } from './google-sheets.mjs';

/** Validate customer input; prices and delivery terms always come from the server. */
export function prepareOrder(input, env = process.env) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_ORDER');
  const fields = { name: 160, phone: 160, city: 160, address: 1000 };
  const customer = {};
  for (const [field, limit] of Object.entries(fields)) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > limit) {
      throw new Error('INVALID_ORDER');
    }
    customer[field] = input[field].trim();
  }
  // Intentionally accept every phone format, including international numbers.
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10 ||
      !['ar', 'fr'].includes(input.language) ||
      typeof input.orderId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.orderId)) {
    throw new Error('INVALID_ORDER');
  }
  const configuredPrice = Number(env.NEXT_PUBLIC_PRODUCT_PRICE);
  const unitPrice = Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : 179;
  return {
    orderId: input.orderId,
    createdAt: new Date().toISOString(),
    ...customer,
    product: 'Reviora shampooing anti-chute 150 ml',
    quantity: input.quantity,
    unitPrice,
    subtotal: Math.round(unitPrice * input.quantity * 100) / 100,
    currency: 'MAD',
    delivery: env.NEXT_PUBLIC_DELIVERY_TEXT || (input.language === 'ar' ? 'يتم تأكيدها عند الطلب' : 'À confirmer lors de la commande'),
    language: input.language,
    status: 'New',
  };
}

export const saveOrder = savePrivateOrder;
