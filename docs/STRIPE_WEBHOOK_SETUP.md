# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks for local development and production deployment.

## The Problem

When testing payments locally, Stripe cannot send webhook events to `localhost:3000` because:
1. Your local machine is behind a firewall/NAT
2. Stripe's servers can't reach private networks
3. The webhook URL must be publicly accessible

**Solution**: Use the Stripe CLI to forward webhook events from Stripe to your local development server.

---

## Local Development Setup

### 1. Install Stripe CLI

**macOS (Homebrew)**:
```bash
brew install stripe/stripe-cli/stripe
```

**Windows**:
Download from [Stripe CLI Releases](https://github.com/stripe/stripe-cli/releases)

**Linux**:
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.0/stripe_1.19.0_linux_x86_64.tar.gz
tar -xvf stripe_1.19.0_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This opens your browser to authenticate. Select your Stripe account when prompted.

### 3. Start Webhook Forwarding

In a separate terminal window (keep this running while developing):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Expected output**:
```
> Ready! You are using Stripe API Version [2026-05-27]. Your webhook signing secret is whsec_abc123... (^C to quit)
```

### 4. Copy Webhook Secret to .env.local

Copy the `whsec_...` secret from the CLI output and add it to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

### 5. Start Your Development Server

In another terminal:

```bash
npm run dev
```

### 6. Test the Payment Flow

1. Sign in to your app
2. Click the "Upgrade" button
3. Use Stripe test card: `4242 4242 4242 4242`
4. Fill in any expiry date (future), any CVC, any zip code
5. Complete payment

**In the Stripe CLI terminal**, you should see:
```
2026-06-24 10:30:15   --> checkout.session.completed [evt_abc123]
2026-06-24 10:30:15   <-- [200] POST http://localhost:3000/api/webhooks/stripe [evt_abc123]
```

**In your Next.js terminal**, you should see:
```
[Stripe Webhook] ✅ Signature verified, event type: checkout.session.completed
[Stripe Webhook] 💰 Payment successful for user: user_abc123
[Stripe Webhook] ✅ User upgraded to Pro: user_abc123
[Stripe Webhook] 🎉 Metadata updated successfully
```

---

## Production Setup

### 1. Configure Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your production URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen to:
   - `checkout.session.completed` (required)
   - Optionally: `customer.subscription.created`, `customer.subscription.deleted`
5. Click **"Add endpoint"**

### 2. Copy Webhook Signing Secret

After creating the endpoint:
1. Click on the newly created endpoint
2. Click **"Reveal"** next to "Signing secret"
3. Copy the `whsec_...` value

### 3. Set Environment Variable in Production

Add the webhook secret to your production environment (e.g., Vercel, Cloudflare Pages):

```env
STRIPE_WEBHOOK_SECRET=whsec_prod_abc123...
```

### 4. Verify Production Webhook

1. Complete a real payment in production
2. Check Stripe Dashboard → Webhooks → [Your endpoint]
3. Verify the event was delivered successfully (200 OK)
4. Check Clerk Dashboard → Users → [User] → Metadata
5. Verify `publicMetadata.plan` is set to `"pro"`

---

## Troubleshooting

### Webhook Secret Not Set
**Error**: `Webhook signature verification failed`

**Solution**: Ensure `STRIPE_WEBHOOK_SECRET` is set in `.env.local` (local) or environment variables (production).

### Stripe CLI Not Forwarding
**Error**: No events appear in Stripe CLI terminal

**Solution**:
1. Restart Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Ensure dev server is running on port 3000
3. Check if another process is using port 3000: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)

### User Not Upgrading to Pro
**Error**: Payment succeeds but user tier doesn't update

**Checklist**:
1. ✅ Stripe CLI shows `checkout.session.completed` event
2. ✅ Next.js console shows `[Stripe Webhook] ✅ User upgraded to Pro`
3. ✅ User ID is passed in checkout: Check `client_reference_id` in Stripe Dashboard → Payments
4. ✅ Clerk user exists: Check Clerk Dashboard → Users
5. ✅ Call `user.reload()` on frontend after payment success

**Debug**: Check Next.js server logs for detailed webhook errors.

### Clerk Metadata Not Updating
**Error**: `Failed to update Clerk metadata`

**Solution**:
1. Verify `CLERK_SECRET_KEY` is set in environment
2. Ensure user ID from Stripe matches Clerk user ID exactly
3. Check Clerk Dashboard for API rate limits or errors

---

## Testing Webhook Events Manually

You can trigger test events without completing a payment:

```bash
stripe trigger checkout.session.completed
```

This sends a test event to your local webhook endpoint.

---

## Environment Variables Checklist

### Required for Payments
- ✅ `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_test_` or `sk_live_`)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_test_` or `pk_live_`)

### Required for Webhooks
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_`)

### Required for User Management
- ✅ `CLERK_SECRET_KEY` - Clerk secret key (starts with `sk_test_` or `sk_live_`)
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (starts with `pk_test_` or `pk_live_`)

---

## Next Steps

After webhook setup is complete:
1. Test the full payment flow end-to-end
2. Verify tier badge updates immediately after payment
3. Test PDF export and other Pro features
4. Set up production webhooks before deploying

---

## Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Clerk Metadata Documentation](https://clerk.com/docs/users/metadata)
