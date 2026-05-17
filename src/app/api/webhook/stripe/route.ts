import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'edge';

/**
 * Stripe webhook receiver.
 *
 * Authorization model — read this before adding storage:
 * Cloudflare Pages free tier has no persistent storage out of the box, so
 * "this session has paid" is verified at PDF-download time by re-calling
 * `stripe.checkout.sessions.retrieve(session_id)` and checking
 * `payment_status === 'paid'`. That makes Stripe the single source of
 * truth and removes the need for a session→token table.
 *
 * This webhook is therefore the audit-and-side-effect path: it logs the
 * completed session, and is the place to add idempotent side-effects like
 * sending an email receipt or queueing a report generation job. Do NOT
 * use it as the sole gate for unlocking the PDF.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 },
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Stripe requires the raw request body to verify the signature; the SDK
  // helper recomputes the HMAC over the exact bytes we received. On the
  // edge runtime the synchronous constructEvent (which uses Node crypto)
  // is unavailable — we use constructEventAsync with the SDK's
  // SubtleCrypto provider so HMAC-SHA256 verification runs on the
  // platform-native Web Crypto API.
  const rawBody = await request.text();
  const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown signature error';
    console.warn('[webhook/stripe] signature verification failed', msg);
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const metadata = session.metadata ?? {};
      console.info('[webhook/stripe] checkout.session.completed', {
        sessionId: session.id,
        product: metadata.product,
        address: metadata.address,
        spi: metadata.spi,
        lang: metadata.lang,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
      // Side-effect hook: send receipt email, enqueue report build, etc.
      // Do NOT mark "PDF unlocked" here — the download endpoint must call
      // Stripe to verify, which keeps the system stateless and correct.
      break;
    }
    case 'payment_intent.payment_failed':
    case 'checkout.session.expired':
      console.info('[webhook/stripe] payment did not complete', { type: event.type, id: event.data.object.id });
      break;
    default:
      // Ignore unrelated events. Stripe expects 200 even for events we
      // don't handle, otherwise it will retry indefinitely.
      break;
  }

  return NextResponse.json({ received: true });
}
