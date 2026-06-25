# URGENT: Stripe & Layout Issues - Debugging Guide

## Issue 1: Stripe Payment Still Not Upgrading

### Debug Steps

**Step 1: Verify Stripe CLI is Running**

Open a new terminal and run:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Expected output:**
```
> Ready! Your webhook signing secret is whsec_...
```

**Keep this terminal open!**

**Step 2: Update Webhook Secret**

1. Copy the `whsec_...` secret from Stripe CLI output
2. Open `.env.local`
3. Replace line 51:
```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_CLI_SECRET_HERE
```

**Step 3: Restart Dev Server**

In a **different terminal**:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Step 4: Test Payment with Logging**

1. Open browser console (F12)
2. Go to `http://localhost:3000`
3. Sign in with Clerk
4. Note your user ID from console or Clerk Dashboard
5. Click "Upgrade to Pro"
6. Use test card: `4242 4242 4242 4242`
7. Complete payment

**Step 5: Check All Logs**

**Terminal 1 (Stripe CLI) should show:**
```
--> checkout.session.completed [evt_abc123]
<-- [200] POST http://localhost:3000/api/webhooks/stripe
```

**Terminal 2 (Dev Server) should show:**
```
[Stripe Webhook] Received event: checkout.session.completed
[Stripe Webhook] Client reference ID: user_xxx
[Stripe Webhook] ✅ User upgraded to Pro: user_xxx
```

**Browser Console Network tab:**
- Check for POST to `/api/checkout` - should return `{ url: "checkout.stripe.com/..." }`
- After payment, check for webhook being received

### Common Failures & Fixes

**Failure 1: No output in Stripe CLI**
```
Cause: Payment not completing or CLI not listening
Fix:
  1. Verify Stripe CLI shows "Ready!"
  2. Check you're in TEST mode (not live mode)
  3. Use correct test card: 4242 4242 4242 4242
```

**Failure 2: Webhook returns 401/500**
```
Cause: Webhook secret mismatch
Fix:
  1. Get NEW secret from CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
  2. Update .env.local with NEW secret
  3. MUST restart dev server (npm run dev)
  4. Try payment again
```

**Failure 3: "User not found" in webhook**
```
Cause: client_reference_id is null/undefined
Fix:
  1. Verify you're SIGNED IN before clicking Upgrade
  2. Check browser console for checkout API errors
  3. Add logging to checkout route (see below)
```

**Failure 4: Webhook signature verification failed**
```
Cause: Wrong webhook secret in .env.local
Fix:
  1. Must use CLI secret (whsec_...) not Dashboard secret
  2. Copy EXACT secret including whsec_ prefix
  3. Restart server after updating
```

### Add Debug Logging

**In `src/app/api/checkout/route.ts`** (line 82):
```typescript
try {
  console.log('[Checkout] Creating session for user:', user?.id);
  console.log('[Checkout] User email:', user?.primaryEmailAddress?.emailAddress);
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [...],
    success_url: `${origin}/app?payment=success&session_id={CHECKOUT_SESSION_ID}&type=${body.type}${coordSuffix}`,
    cancel_url: `${origin}/app?canceled=true${coordSuffix}`,
    client_reference_id: user?.id || undefined,
    metadata: {
      product: body.type,
      userId: user?.id || 'anonymous',
    },
  });
  
  console.log('[Checkout] Session created:', session.id);
  console.log('[Checkout] Client reference ID:', session.client_reference_id);
  
  return NextResponse.json({ url: session.url });
```

**In `src/app/api/webhooks/stripe/route.ts`** (after line 50):
```typescript
console.log('[Stripe Webhook] Received event:', event.type);
console.log('[Stripe Webhook] Session ID:', session.id);
console.log('[Stripe Webhook] Client reference ID:', session.client_reference_id);
console.log('[Stripe Webhook] Payment status:', session.payment_status);
```

### Manual Upgrade (If Webhooks Still Fail)

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
6. Save and refresh your app

---

## Issue 2: Controls Clashing with Right Sidebar

The MapboxDraw control is set to `top-left` but might not be applying. Let me check what's visible.

### Debug Step 1: Inspect Element

1. Open your app at `http://localhost:3000/app`
2. Right-click on the drawing controls
3. Click "Inspect Element"
4. Look for class: `mapboxgl-ctrl-top-right` or `mapboxgl-ctrl-top-left`

**If it shows `top-right`:**
- The change didn't take effect
- Try hard refresh: Ctrl+Shift+R
- Clear browser cache

**If it shows `top-left` but still looks wrong:**
- CSS positioning needs adjustment
- Continue to Step 2

### Debug Step 2: Force Refresh

```bash
# Stop dev server
Ctrl+C

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Debug Step 3: Verify CSS Loaded

1. Open browser DevTools
2. Go to Elements tab
3. Search for `.mapboxgl-ctrl-top-left`
4. Should show:
```css
.mapboxgl-ctrl-top-left {
  top: 80px;
  left: 16px;
}
```

**If CSS not found:**
- The globals.css changes didn't load
- Check if `globals.css` is imported in layout
- Hard refresh: Ctrl+Shift+R

### Debug Step 4: Check for Conflicting Controls

Open browser console and run:
```javascript
// Check all Mapbox controls
document.querySelectorAll('.mapboxgl-ctrl').forEach(ctrl => {
  console.log(ctrl.className, ctrl.parentElement.className);
});
```

**Look for:**
- `mapboxgl-ctrl-top-right` - Should NOT exist
- `mapboxgl-ctrl-top-left` - Should exist with draw controls
- `mapboxgl-ctrl-bottom-left` - Scale control (OK)

### Quick CSS Override Test

If controls still in wrong place, test with inline override:

Open browser console and run:
```javascript
document.querySelector('.mapboxgl-ctrl-top-right')?.parentElement.className = 'mapboxgl-ctrl-top-left';
```

**If this fixes it:**
- The addControl position isn't being applied
- Need to verify the code actually runs

### Verify Code is Running

Add console.log to verify:

**In `src/components/MapPreview.tsx`** (line 449):
```typescript
console.log('[MapPreview] Adding draw control to top-left');
map.addControl(draw, 'top-left');
console.log('[MapPreview] Draw control added');
```

**Check browser console for these logs when map loads**

---

## Quick Test Checklist

### Stripe Payment Test:
- [ ] Stripe CLI installed
- [ ] `stripe listen` running in Terminal 1
- [ ] CLI webhook secret copied to `.env.local`
- [ ] Dev server restarted (Terminal 2)
- [ ] Signed in to app
- [ ] Payment completed with test card
- [ ] Stripe CLI shows webhook event
- [ ] Dev console shows upgrade log
- [ ] User refreshed page
- [ ] Pro tier shows in UI

### Layout Test:
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Drawing controls visible in top-left
- [ ] No overlap with right sidebar
- [ ] CSS applied (inspect element)
- [ ] Console logs show control added

---

## Nuclear Option: Full Reset

If nothing works:

```bash
# Stop all processes
# Close all terminals

# Clear everything
rm -rf .next
rm -rf node_modules
npm install

# Restart Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy new webhook secret to .env.local

# Restart dev server
npm run dev

# Hard refresh browser
Ctrl+Shift+R
```

---

## Get Help

If still not working, send me:

1. **Stripe CLI output** (full text)
2. **Dev server console** (any errors?)
3. **Browser console** (any errors?)
4. **Screenshot** showing control positions
5. **Clerk user ID** for manual upgrade

I'll debug further with this information!
