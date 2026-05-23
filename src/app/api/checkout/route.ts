import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';

export const runtime = 'edge';

type ProductType = 'ai-report' | 'title-search';

type CheckoutBody = {
  type?: ProductType;
  lat?: number;
  lon?: number;
};

const PRODUCTS: Record<ProductType, { name: string; amount: number; currency: string }> = {
  'ai-report': {
    name: 'Comprehensive Site Analysis',
    amount: 4900,
    currency: 'aud',
  },
  'title-search': {
    name: 'Copy of Title (Register Search)',
    amount: 1550,
    currency: 'aud',
  },
};

function isProductType(v: unknown): v is ProductType {
  return v === 'ai-report' || v === 'title-search';
}

export async function POST(request: NextRequest) {
  // Admin bypass check
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  const isAdmin = email === process.env.ADMIN_EMAIL;

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

  if (!isProductType(body.type)) {
    return NextResponse.json(
      { error: 'Body must include `type: "ai-report" | "title-search"`.' },
      { status: 400 },
    );
  }

  // If admin, bypass Stripe and return success immediately
  if (isAdmin) {
    const origin = request.nextUrl.origin;
    const lat = Number.isFinite(body.lat) ? body.lat : undefined;
    const lon = Number.isFinite(body.lon) ? body.lon : undefined;
    const coordSuffix =
      lat !== undefined && lon !== undefined ? `&lat=${lat}&lon=${lon}` : '';

    // Return a mock success URL that mimics Stripe's success flow
    const adminSuccessUrl = `${origin}/app?payment=success&session_id=admin_bypass&type=${body.type}${coordSuffix}`;
    return NextResponse.json({ url: adminSuccessUrl });
  }

  const product = PRODUCTS[body.type];
  const origin = request.nextUrl.origin;
  const lat = Number.isFinite(body.lat) ? body.lat : undefined;
  const lon = Number.isFinite(body.lon) ? body.lon : undefined;
  const coordSuffix =
    lat !== undefined && lon !== undefined ? `&lat=${lat}&lon=${lon}` : '';

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
            currency: product.currency,
            unit_amount: product.amount,
            product_data: { name: product.name },
          },
        },
      ],
      success_url: `${origin}/app?payment=success&session_id={CHECKOUT_SESSION_ID}&type=${body.type}${coordSuffix}`,
      cancel_url: `${origin}/app?canceled=true${coordSuffix}`,
      metadata: { product: body.type },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Stripe error';
    console.error('[checkout] Stripe session creation failed', err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
