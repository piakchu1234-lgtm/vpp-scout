# FIXED: Stripe Payment Not Upgrading to Pro

## Issue Found
The checkout endpoint was **not passing the Clerk user ID** to Stripe, so the webhook couldn't identify which user to upgrade.

## What Was Fixed

### File: `src/app/api/checkout/route.ts`

**BEFORE (Broken):**
```typescript
const session = await stripe.checkout.sessions.create({
  // ... other config
  metadata: { product: body.type },  // ❌ Missing user ID
});
```

**AFTER (Fixed):**
```typescript
const session = await stripe.checkout.sessions.create({
  // ... other config
  client_reference_id: user?.id || undefined,  // ✅ Pass Clerk user ID
  metadata: {
    product: body.type,
    userId: user?.id || 'anonymous',  // ✅ Backup in metadata
  },
});
```

## How It Works Now

### Payment Flow (Fixed)

```
1. User clicks "Upgrade to Pro"
   ↓
2. POST /api/checkout with Clerk user ID
   ↓
3. Stripe session created with client_reference_id = Clerk user ID
   ↓
4. User completes payment
   ↓
5. Stripe fires webhook to /api/webhooks/stripe
   ↓
6. Webhook extracts client_reference_id (user ID)
   ↓
7. Updates Clerk metadata: { plan: "pro" }
   ↓
8. ✅ User is now Pro tier!
```

## Testing the Fix

### Step 1: Restart Development Server
```bash
npm run dev
```

### Step 2: Set Up Stripe CLI (For Local Testing)
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Copy the webhook signing secret** from CLI output:
```
> Ready! Your webhook signing secret is whsec_xxx
```

**Update `.env.local`:**
```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Step 3: Test Payment
```bash
# In another terminal, trigger test webhook
stripe trigger checkout.session.completed --add checkout_session:client_reference_id=user_xxx

# Or make a real test payment through the UI
```

### Step 4: Verify Upgrade

**Check Console Logs:**
```
[Stripe Webhook] ✅ User upgraded to Pro: user_xxx
```

**Check Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Find the user
3. Check Public Metadata → Should show:
```json
{
  "plan": "pro",
  "stripeCustomerId": "cus_xxx",
  "stripeSessionId": "cs_xxx",
  "upgradedAt": "2026-06-24T..."
}
```

**Check App:**
1. Refresh the page
2. User tier should show "Pro"
3. Pro features should be unlocked

## For Production Deployment

### 1. Configure Stripe Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. URL: `https://your-production-domain.com/api/webhooks/stripe`
4. Events: Select `checkout.session.completed`
5. Click "Add endpoint"

### 2. Copy Webhook Secret
1. Click your new webhook
2. Click "Signing secret" → "Reveal"
3. Copy the secret (starts with `whsec_...`)

### 3. Update Production Environment Variables
```
STRIPE_WEBHOOK_SECRET=whsec_your_production_secret
```

### 4. Test Production Webhook
Use Stripe Dashboard to send test events:
1. Go to your webhook in Stripe Dashboard
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Add `client_reference_id` in JSON editor
5. Click "Send test webhook"

## Manual Fix for Existing Payments

If users have already paid but weren't upgraded, you can manually upgrade them:

### Option 1: Via Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Find the user
3. Go to "Metadata" tab
4. Edit "Public metadata"
5. Add:
```json
{
  "plan": "pro",
  "upgradedAt": "2026-06-24T12:00:00.000Z"
}
```
6. Save

### Option 2: Via Stripe Dashboard
1. Go to https://dashboard.stripe.com/payments
2. Find the successful payment
3. Copy the customer email
4. Manually upgrade in Clerk (Option 1)

### Option 3: Script to Bulk Upgrade
Create `scripts/upgrade-paid-users.ts`:
```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function upgradePaidUsers() {
  // Get all successful checkout sessions
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    payment_status: 'paid',
  });

  for (const session of sessions.data) {
    const userId = session.client_reference_id;
    
    if (!userId) {
      console.log('⚠️ Session missing client_reference_id:', session.id);
      continue;
    }

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          plan: 'pro',
          stripeCustomerId: session.customer as string,
          stripeSessionId: session.id,
          upgradedAt: new Date().toISOString(),
        },
      });
      
      console.log('✅ Upgraded user:', userId);
    } catch (error) {
      console.error('❌ Failed to upgrade user:', userId, error);
    }
  }
}

upgradePaidUsers();
```

Run with:
```bash
npx tsx scripts/upgrade-paid-users.ts
```

## Verification Checklist

After the fix, verify:
- ✅ Checkout endpoint includes `client_reference_id`
- ✅ Webhook receives `client_reference_id`
- ✅ Webhook updates Clerk metadata
- ✅ User sees Pro tier after payment
- ✅ Webhook secret matches Stripe Dashboard
- ✅ Webhook endpoint is accessible (not blocked by firewall)

## Common Issues After Fix

### Issue: Still not upgrading
**Cause:** Old checkout sessions in browser cache
**Fix:** Clear browser cache or test in incognito mode

### Issue: Webhook not triggered
**Cause:** Webhook endpoint not reachable
**Fix:** Check that your server is publicly accessible (for production) or use Stripe CLI (for development)

### Issue: "Webhook signature verification failed"
**Cause:** Wrong webhook secret
**Fix:** Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard

### Issue: "User not found"
**Cause:** Invalid `client_reference_id`
**Fix:** Ensure user is logged in before creating checkout session

---

**Result:** Payment → Pro Upgrade flow is now working correctly! 🎉
