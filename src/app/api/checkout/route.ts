import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { BETA_FREE } from '@/lib/betaConfig';

export const runtime = 'edge';

const PREMIUM_REPORT_PRICE_AUD = 49;

type CheckoutBody = {
  address?: string | null;
  spi?: string | null;
  lang?: 'en' | 'zh';
};

function isLang(v: unknown): v is 'en' | 'zh' {
  return v === 'en' || v === 'zh';
}

export async function POST(request: NextRequest) {
  if (BETA_FREE) {
    return NextResponse.json(
      {
        error:
          'Beta launch active — premium reports are free. Use the Reports tab to generate the brief.',
      },
      { status: 410 },
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured on the server' },
      { status: 500 },
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lang = isLang(body.lang) ? body.lang : 'en';
  const address = (body.address ?? '').trim().slice(0, 240);
  const spi = (body.spi ?? '').trim().slice(0, 64);

  const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: PREMIUM_REPORT_PRICE_AUD * 100,
            product_data: {
              name: 'SimplySite — Premium Property Report',
              description:
                '2026 SSD feasibility A4 report · language-isolated PDF · live satellite frontage · SPI-anchored',
            },
          },
        },
      ],
      locale: lang === 'zh' ? 'zh' : 'en',
      success_url: `${request.nextUrl.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?payment=cancelled`,
      metadata: {
        product: 'premium_property_report',
        address,
        spi,
        lang,
      },
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Stripe error';
    console.error('[checkout] Stripe session creation failed', err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
