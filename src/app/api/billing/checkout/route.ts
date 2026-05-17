/**
 * Phase 1 monetization shell.
 *
 * Two product lines:
 *
 *   - `subscription` → recurring monthly Pro tier (unlimited reports,
 *     priority queue, full export history). Driven by an env-supplied
 *     `STRIPE_PRO_MONTHLY_PRICE_ID` (a Stripe Price record on a
 *     recurring product).
 *
 *   - `credits` → one-shot pay-per-report token packs. Driven by
 *     `STRIPE_CREDIT_PACK_PRICE_ID` (a Stripe Price record on a
 *     non-recurring product) with a quantity supplied by the caller.
 *
 * Both flows return a Stripe Checkout `session.url` the client
 * redirects to. Edge-runtime compatible: uses Stripe's
 * `createFetchHttpClient()` shim instead of the Node http stack.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'edge';

type Plan = 'subscription' | 'credits';

type CheckoutBody = {
  plan?: Plan;
  /** Number of report-credit packs to buy. Ignored for `subscription`. */
  quantity?: number;
  /** Echo into session metadata so the success page can confirm context. */
  address?: string | null;
  spi?: string | null;
  lang?: 'en' | 'zh';
};

function isPlan(v: unknown): v is Plan {
  return v === 'subscription' || v === 'credits';
}

function isLang(v: unknown): v is 'en' | 'zh' {
  return v === 'en' || v === 'zh';
}

function clampQuantity(q: unknown): number {
  const n = typeof q === 'number' ? q : Number(q);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(20, Math.floor(n)));
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isPlan(body.plan)) {
    return NextResponse.json(
      {
        error:
          'Body must include `plan: "subscription" | "credits"`.',
      },
      { status: 400 },
    );
  }

  const lang = isLang(body.lang) ? body.lang : 'en';
  const address = (body.address ?? '').trim().slice(0, 240);
  const spi = (body.spi ?? '').trim().slice(0, 64);

  const proPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const creditsPriceId = process.env.STRIPE_CREDIT_PACK_PRICE_ID;

  if (body.plan === 'subscription' && !proPriceId) {
    return NextResponse.json(
      {
        error:
          'STRIPE_PRO_MONTHLY_PRICE_ID is not configured. Provision a recurring Stripe Price and add the id to environment.',
      },
      { status: 503 },
    );
  }
  if (body.plan === 'credits' && !creditsPriceId) {
    return NextResponse.json(
      {
        error:
          'STRIPE_CREDIT_PACK_PRICE_ID is not configured. Provision a one-shot Stripe Price and add the id to environment.',
      },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const isSubscription = body.plan === 'subscription';
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: isSubscription ? proPriceId! : creditsPriceId!,
          quantity: isSubscription ? 1 : clampQuantity(body.quantity),
        },
      ],
      locale: lang === 'zh' ? 'zh' : 'en',
      success_url: `${request.nextUrl.origin}/?billing=success&plan=${body.plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?billing=cancelled&plan=${body.plan}`,
      metadata: {
        product: isSubscription ? 'pro_monthly' : 'report_credits',
        address,
        spi,
        lang,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe call failed.';
    console.warn('[billing/checkout] Stripe error', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
