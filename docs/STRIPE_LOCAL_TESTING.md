# Testing Stripe Payments on Localhost - Setup Guide

## Problem

When testing on `http://localhost:3000`, Stripe webhooks don't work because:
- Stripe servers can't reach `localhost` from the internet
- Webhooks need a publicly accessible URL to deliver events
- No webhook = No Pro upgrade after payment

## Solution: Use Stripe CLI

Stripe CLI forwards webhook events from Stripe to your local development server.

## Step-by-Step Setup

### 1. Install Stripe CLI

**Windows:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Or use Scoop:
scoop install stripe

# Or use Chocolatey:
choco install stripe-cli
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Connect to your Stripe account

**Output:**
```
Your pairing code is: word-word-word
This pairing code verifies your authentication with Stripe.
Press Enter to open the browser or visit https://dashboard.stripe.com/...
```

### 3. Start Webhook Forwarding

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_abc123xyz... (^C to quit)
```

**IMPORTANT:** Copy the webhook signing secret (`whsec_...`)

### 4. Update .env.local with CLI Secret

Open `C:\Users\yap_s\projects\vpp-scout\.env.local` and update:

```bash
# Replace the production webhook secret with the CLI secret
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...  # ← Paste CLI secret here
```

### 5. Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
# Start fresh with new webhook secret
npm run dev
```

### 6. Keep Stripe CLI Running

**CRITICAL:** The Stripe CLI must stay running in a separate terminal while testing.

```
Terminal 1:                    Terminal 2:
┌──────────────────────┐      ┌──────────────────────┐
│ stripe listen ...    │      │ npm run dev          │
│ > Ready!             │      │ > Local: :3000       │
│ [listening...]       │      │                      │
└──────────────────────┘      └──────────────────────┘
```

## Testing Payment Flow

### Test 1: Make a Test Payment

1. Go to `http://localhost:3000`
2. Sign in with Clerk
3. Click "Upgrade to Pro"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future expiry date (e.g., `12/34`)
6. Any CVV (e.g., `123`)
7. Complete payment

### Test 2: Verify Webhook Received

**Check Stripe CLI terminal:**
```
> Ready! Your webhook signing secret is whsec_...

2026-06-24 12:34:56  --> checkout.session.completed [evt_abc123]
2026-06-24 12:34:56  <-- [200] POST http://localhost:3000/api/webhooks/stripe [evt_abc123]
```

**Check your dev server console:**
```
[Stripe Webhook] ✅ User upgraded to Pro: user_2abc123xyz
```

### Test 3: Verify User Upgraded

1. Refresh the page
2. Check user profile → Should show "Pro" tier
3. Pro features should be unlocked

## Troubleshooting

### Issue: "Webhook signature verification failed"

**Cause:** `.env.local` has wrong webhook secret

**Fix:**
1. Check Stripe CLI output for `whsec_...` secret
2. Copy the EXACT secret (including `whsec_` prefix)
3. Update `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Restart dev server: `npm run dev`

### Issue: No webhook events in Stripe CLI

**Cause:** Payment not completing or CLI not listening

**Fix:**
1. Verify Stripe CLI shows "Ready!" message
2. Use correct test card: `4242 4242 4242 4242`
3. Check CLI is forwarding to correct URL: `/api/webhooks/stripe`

### Issue: "User not found" in webhook

**Cause:** Missing `client_reference_id` in checkout session

**Fix:** This should already be fixed in the code. If still failing:
1. Check browser console for checkout creation errors
2. Verify you're signed in with Clerk before clicking "Upgrade"

### Issue: Stripe CLI not installed

**Fix:**
```bash
# Windows - use Scoop or download manually
scoop install stripe

# Mac
brew install stripe/stripe-cli/stripe

# Or download from:
https://github.com/stripe/stripe-cli/releases/latest
```

### Issue: Multiple terminal confusion

**Setup:**
```
Terminal 1 (Stripe CLI):
cd C:\Users\yap_s\projects\vpp-scout
stripe listen --forward-to localhost:3000/api/webhooks/stripe
[Keep running - don't close]

Terminal 2 (Dev Server):
cd C:\Users\yap_s\projects\vpp-scout
npm run dev
[Keep running - don't close]
```

## Alternative: Manual Testing

If Stripe CLI doesn't work, manually upgrade users via Clerk Dashboard:

1. Go to https://dashboard.clerk.com
2. Find your user
3. Click "Metadata" tab
4. Edit "Public metadata"
5. Add:
```json
{
  "plan": "pro",
  "upgradedAt": "2026-06-24T12:00:00Z"
}
```
6. Save

## For Production Deployment

Once you deploy to production (e.g., Vercel, Cloudflare Pages):

1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Events: Select `checkout.session.completed`
5. Copy the production webhook secret
6. Update production environment variable:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_production_secret
   ```

## Current Setup Checklist

For localhost testing to work:

- ✅ Stripe CLI installed
- ✅ `stripe login` completed
- ✅ `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running
- ✅ CLI webhook secret copied to `.env.local`
- ✅ Dev server restarted with new secret
- ✅ Both terminals kept open during testing

## Quick Reference Commands

```bash
# Terminal 1: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 2: Start dev server
npm run dev

# Test webhook (Terminal 3):
stripe trigger checkout.session.completed --add checkout_session:client_reference_id=user_xxx
```

## Visual Workflow

```
1. User clicks "Upgrade"
   ↓
2. Stripe Checkout opens (test mode)
   ↓
3. User enters test card 4242...
   ↓
4. Payment succeeds
   ↓
5. Stripe fires webhook
   ↓
6. Stripe CLI forwards to localhost:3000/api/webhooks/stripe
   ↓
7. Webhook handler extracts user ID
   ↓
8. Updates Clerk metadata: plan = "pro"
   ↓
9. User refreshes page → Pro tier! ✅
```

---

**Remember:** Stripe CLI must be running whenever you test payments locally!
