import { NextRequest, NextResponse } from 'next/server';
import { prepareOrder, saveOrder } from '../../../lib/orders.mjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const respond = (body: object, status: number) => NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return respond({ error: 'FORBIDDEN' }, 403);
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return respond({ error: 'INVALID_ORDER' }, 415);
  }
  let order;
  try {
    // Read at most 8 KB, including for chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: 'INVALID_ORDER' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return respond({ error: 'INVALID_ORDER' }, 413);
      }
      chunks.push(value);
    }
    order = prepareOrder(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    return respond({ error: 'INVALID_ORDER' }, 400);
  }
  try {
    return respond({ ok: true, ...await saveOrder(order), unitPrice: order.unitPrice, quantity: order.quantity, subtotal: order.subtotal, currency: order.currency }, 201);
  } catch (error) {
    // Never log contact details or the webhook secret.
    const unavailable = error instanceof Error && error.message === 'NOT_CONFIGURED';
    return respond({ error: unavailable ? 'NOT_CONFIGURED' : 'SAVE_FAILED' }, unavailable ? 503 : 502);
  }
}
