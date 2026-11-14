export const PRODUCT_ID = 'reviora-shampoo-150ml';

export function productEvent(unitPrice, quantity = 1) {
  return {
    content_ids: [PRODUCT_ID], content_name: 'Reviora shampooing anti-chute 150 ml',
    content_type: 'product', contents: [{ id: PRODUCT_ID, quantity, item_price: unitPrice }],
    num_items: quantity, value: Math.round(unitPrice * quantity * 100) / 100, currency: 'MAD',
  };
}

/** No script, requests or tracking storage are created until a real pixel ID exists. */
export function createMetaTracker(pixelId, browser, loadScript) {
  const enabled = /^\d{5,25}$/.test(pixelId || '') && Boolean(browser);
  const sent = new Set();
  let initialized = false;
  let pageId;
  const initialize = () => {
    if (!enabled || initialized) return false;
    try {
      if (!browser.fbq) {
        const fbq = function (...args) {
          if (fbq.callMethod) fbq.callMethod(...args);
          else fbq.queue.push(args);
        };
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.push = fbq;
        browser.fbq = fbq;
        if (!browser._fbq) browser._fbq = fbq;
      }
      // Explicit events only; do not enable automatic form detection or advanced matching.
      browser.fbq('set', 'autoConfig', false, pixelId);
      browser.fbq('init', pixelId);
      loadScript();
      initialized = true;
      return true;
    } catch { return false; }
  };
  return {
    track(event, params = {}, key = event) {
      if (!enabled || sent.has(key)) return;
      try {
        if (!initialized && !initialize()) return;
        pageId ||= browser.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        browser.fbq('trackSingle', pixelId, event, params, { eventID: /^(purchase|lead)-/.test(key) ? key : `${pageId}-${key}` });
        sent.add(key);
      } catch { /* Ad blockers or analytics must never interrupt checkout. */ }
    },
  };
}

let tracker;
function currentTracker() {
  if (typeof window === 'undefined') return null;
  if (!tracker) tracker = createMetaTracker(process.env.NEXT_PUBLIC_META_PIXEL_ID, window, () => {
    if (document.getElementById('reviora-meta-pixel')) return;
    const script = document.createElement('script');
    script.id = 'reviora-meta-pixel';
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  });
  return tracker;
}

export function trackMetaEvent(event, parameters = {}, deduplicationKey = event) {
  try { currentTracker()?.track(event, parameters, deduplicationKey); } catch { /* Non-blocking analytics. */ }
}
