/**
 * STRIPE WEBHOOK HANDLER
 *
 * Listens for Stripe checkout.session.completed events and automatically
 * upgrades users to Pro tier by updating their Clerk metadata.
 *
 * Flow:
 * 1. User clicks "Upgrade" → Stripe Checkout with client_reference_id (Clerk userId)
 * 2. Payment succeeds → Stripe fires webhook to this endpoint
 * 3. We verify the signature and extract the userId
 * 4. Update Clerk user metadata: { publicMetadata: { plan: "pro" } }
 * 5. User immediately sees Pro features unlocked
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // Read the raw body as text (required for signature verification)
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (!userId) {
        console.error('[Stripe Webhook] No client_reference_id found in session');
        return NextResponse.json(
          { error: 'No user ID found in checkout session' },
          { status: 400 }
        );
      }

      console.log('[Stripe Webhook] Payment successful for user:', userId);
      console.log('[Stripe Webhook] Session ID:', session.id);
      console.log('[Stripe Webhook] Amount paid:', session.amount_total, session.currency);

      // Update Clerk user metadata to Pro tier
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            plan: 'pro',
            stripeCustomerId: session.customer as string,
            stripeSessionId: session.id,
            upgradedAt: new Date().toISOString(),
          },
        });

        console.log('[Stripe Webhook] ✅ User upgraded to Pro:', userId);
      } catch (clerkError: any) {
        console.error('[Stripe Webhook] Failed to update Clerk metadata:', clerkError.message);
        return NextResponse.json(
          { error: 'Failed to upgrade user in Clerk' },
          { status: 500 }
        );
      }
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Stripe Webhook] Unexpected error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
