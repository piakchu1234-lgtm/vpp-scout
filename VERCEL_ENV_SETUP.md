# Vercel Environment Variables Setup

## ⚠️ IMPORTANT: Add Custom Basemap Style to Vercel

Your custom minimal Mapbox style is now configured locally, but **Vercel needs the environment variable** for production deployment.

---

## Quick Setup (2 minutes)

### 1. Open Vercel Dashboard
- Go to https://vercel.com/
- Select your SimplySite project

### 2. Navigate to Environment Variables
- Click **"Settings"** tab
- Click **"Environment Variables"** in left sidebar

### 3. Add Custom Style Variable
- Click **"Add New"** button
- **Name:** `NEXT_PUBLIC_MAPBOX_STYLE_LIGHT`
- **Value:** `mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya`
- **Environments:** Check all (Production, Preview, Development)
- Click **"Save"**

### 4. Redeploy
- Go to **"Deployments"** tab
- Click **"..."** menu on latest deployment
- Click **"Redeploy"**
- Or just push a new commit and Vercel auto-deploys

---

## Verification

Once redeployed, test your production site:

```
1. Open https://your-simplysite.vercel.app/app
2. Search any property
3. Check map appearance:
   ✅ Minimal basemap (no POI icons)
   ✅ Subtle grey roads
   ✅ Teal parcel fill pops dramatically
   ✅ Pink boundary is the hero
   ✅ Clean, professional surveyor aesthetic
```

---

## Current Configuration

### Local Development (.env.local):
```bash
NEXT_PUBLIC_MAPBOX_STYLE_LIGHT=mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya
```
✅ **Status:** Configured

### Production (Vercel):
```bash
NEXT_PUBLIC_MAPBOX_STYLE_LIGHT=mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya
```
⏳ **Status:** Needs to be added manually

---

## What This Style Does

Your custom `simplysite-minimal-light` style:
- ✅ Hides all POI icons (coffee shops, restaurants, transit)
- ✅ Mutes roads to subtle greys (#e8e8e8, #eeeeee, #f5f5f5)
- ✅ Fades water to barely visible (#f0f8ff)
- ✅ Reduces park prominence (#f5f9f5)
- ✅ Simplifies labels (small, light grey)
- ✅ Lowers building opacity (50%)

**Result:** Property boundaries become the absolute hero on a clean, minimal canvas.

---

## Fallback Behavior

If the environment variable is **not set** in Vercel:
- Fallback to `streets-v12` (better than `light-v11`, but not minimal)
- Still functional, just more visual noise
- Not ideal for VSBA presentation

**Always add the custom style URL to production!**

---

## VSBA Presentation Ready

Once the custom style is deployed to Vercel:
✅ Map shows minimal basemap
✅ Teal/pink property colors dominate
✅ Professional surveyor aesthetic
✅ Archistar-parity visual quality

**You can confidently say:**
> "We designed a custom Mapbox basemap that strips all visual noise—POIs, transit icons, heavy road hierarchies—so property boundaries and compliance data are the absolute hero. This cartographic discipline is what separates professional surveyor tools from consumer mapping applications."

---

## Troubleshooting

### If map still looks noisy after deploying:
1. Check Vercel environment variable is saved correctly
2. Verify the style URL has no typos
3. Ensure you redeployed after adding the variable
4. Clear browser cache and hard reload (Ctrl+Shift+R)

### If map doesn't load at all:
1. Check Mapbox Studio - ensure style is published
2. Verify style URL format: `mapbox://styles/USERNAME/STYLE_ID`
3. Check browser console for errors
4. Fallback to streets-v12 should still work

---

## Summary

**Action Required:**
1. Add `NEXT_PUBLIC_MAPBOX_STYLE_LIGHT` to Vercel (2 minutes)
2. Redeploy
3. Test production site
4. Verify Archistar-parity visual quality

**Your custom style URL:**
```
mapbox://styles/pikachu12345/cmqp7w2jj004z01su4vy41nya
```

**Once complete, SimplySite achieves true professional surveyor-tool aesthetics! ✨**
