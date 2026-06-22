# SimplySite Custom Minimal Basemap Guide

## Why We Need This

Archistar and professional surveyor tools don't use default Mapbox styles. They use **aggressively muted** custom vector styles where:
- ✅ POI icons are hidden (no coffee shops, restaurants)
- ✅ Transit layers are hidden (no bus stops, train stations)
- ✅ Roads are subtle grey lines (not colorful hierarchy)
- ✅ Parks/water are very faint (minimal contrast)
- ✅ Building footprints are barely visible
- ✅ Labels are sparse and small

This allows the **teal parcel fill and pink boundary to be the absolute hero**.

---

## Step-by-Step: Create Custom Style in Mapbox Studio

### 1. Open Mapbox Studio
- Go to https://studio.mapbox.com/
- Log in with your account (pikachu12345)

### 2. Create New Style
- Click **"New style"**
- Choose **"Monochrome - Light"** as template
- Name it: `simplysite-minimal-light`

### 3. Strip POI Noise
In the left sidebar layers panel:
- Find layer group: **"POI labels"** → Click eye icon to **hide**
- Find layer: **"poi-label"** → **Delete** or hide
- Find layer: **"transit-label"** → **Delete** or hide
- Find layer: **"airport-label"** → **Delete** or hide

### 4. Mute Roads
Find road layers and adjust colors:
- **"road-motorway"** → Change color to `#e8e8e8` (very light grey)
- **"road-trunk"** → Change color to `#e8e8e8`
- **"road-primary"** → Change color to `#eeeeee`
- **"road-secondary"** → Change color to `#f2f2f2`
- **"road-street"** → Change color to `#f5f5f5`

Set all road widths to **thinner** values (reduce by 30-50%)

### 5. Mute Water & Parks
- **"water"** → Change color to `#f0f8ff` (very faint blue)
- **"landuse-park"** → Change color to `#f5f9f5` (barely visible green)
- **"landcover-grass"** → Reduce opacity to 0.3

### 6. Mute Buildings
- **"building"** → Change color to `#f8f8f8`
- **"building"** → Reduce opacity to 0.5

### 7. Simplify Labels
- **"place-city-label"** → Reduce text-size to 12px
- **"place-town-label"** → Reduce text-size to 10px
- All labels → Change text-color to `#999999` (light grey)
- All labels → Reduce text-halo-width to 1px

### 8. Remove Unnecessary Layers
Delete or hide:
- **"National parks"**
- **"Aeroway labels"**
- **"Marine labels"**
- **"State labels"**

### 9. Publish Style
- Click **"Publish"** in top right
- Copy the **Style URL** (looks like `mapbox://styles/pikachu12345/clxxxxx`)

---

## Integrate Into SimplySite Code

Once you have the custom style URL, update `MapPreview.tsx`:

```typescript
// OLD (Default Mapbox style)
return theme === 'dark'
  ? 'mapbox://styles/mapbox/dark-v11'
  : 'mapbox://styles/mapbox/light-v11';

// NEW (Custom minimal style)
return theme === 'dark'
  ? 'mapbox://styles/mapbox/dark-v11'
  : 'mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID'; // Replace with your custom style URL
```

Example:
```typescript
: 'mapbox://styles/pikachu12345/clxxx123456789';
```

---

## Option 2: Alternative Minimal Styles (Temporary)

If you can't create a custom style immediately, use these better alternatives:

### A. Mapbox Streets V12 (Cleaner)
```typescript
'mapbox://styles/mapbox/streets-v12'
```
**Pros:** Cleaner than light-v11  
**Cons:** Still has some POI noise

### B. Mapbox Outdoors V12 (Subtle)
```typescript
'mapbox://styles/mapbox/outdoors-v12'
```
**Pros:** More muted colors  
**Cons:** Emphasis on topography (not ideal for urban)

### C. Mapbox Navigation Day V1 (Minimal Roads)
```typescript
'mapbox://styles/mapbox/navigation-day-v1'
```
**Pros:** Very clean, minimal POIs  
**Cons:** Designed for turn-by-turn (may look odd for static views)

---

## Recommended Immediate Action

**For VSBA presentation readiness:**

1. **Quick fix (5 minutes):** Switch to `navigation-day-v1` temporarily
2. **Proper fix (30 minutes):** Create custom style in Mapbox Studio
3. **Production:** Use custom minimal style permanently

---

## Visual Comparison

### Default light-v11 (Current - NOISY):
```
🏪 ☕ 🍔 🚌 🚂  ← POI icons everywhere
━━━━━━━━━━━━  ← Heavy road hierarchy
🟩 Parks colored
🔵 Water bright blue
   Property boundary gets lost in noise
```

### Custom Minimal (Target - CLEAN):
```
                ← No POI icons
────────────────  ← Subtle grey roads
   Parks barely visible
   Water very faint
   🟦 Teal parcel POPS
   💗 Pink boundary HERO
```

---

## Color Specifications for Custom Style

### Background:
- Land: `#fafafa` (Off-white)
- Water: `#f0f8ff` (Very faint blue)
- Parks: `#f5f9f5` (Barely visible green)

### Roads:
- Motorway: `#e8e8e8` (Light grey)
- Major roads: `#eeeeee` (Lighter grey)
- Minor roads: `#f5f5f5` (Almost white)
- Road casing: `#dddddd` (Subtle outline)

### Buildings:
- Fill: `#f8f8f8` (Almost white)
- Opacity: 0.5 (Very subtle)

### Labels:
- Text color: `#999999` (Light grey)
- Text size: Reduced 30%
- Text halo: `#ffffff` @ 1px

---

## Testing Your Custom Style

After integrating:

1. Search any property in SimplySite
2. Select parcel
3. **Check:**
   - ✅ Teal fill (#6bc4c5) is the dominant color
   - ✅ Pink boundary (#ec4899) pops dramatically
   - ✅ No POI icons visible
   - ✅ Roads are subtle grey lines
   - ✅ Map feels clean and minimal
   - ✅ Labels don't compete with property data

---

## VSBA Presentation Impact

**Before (light-v11):**
> "Our map uses a minimal basemap..."
> *Panel sees POI icons and heavy roads* 😐

**After (custom minimal):**
> "Our map uses a custom minimal basemap..."
> *Panel sees clean, professional surveyor aesthetic* ✨

**Talking Point:**
"We designed a custom Mapbox basemap that strips all visual noise—POIs, transit icons, heavy road hierarchies—so property boundaries and compliance data are the absolute hero. This cartographic discipline is what separates professional surveyor tools from consumer mapping applications."

---

## Next Steps

1. **You:** Create custom style in Mapbox Studio (30 min)
2. **Copy:** Style URL from Mapbox Studio
3. **Me:** I'll update MapPreview.tsx with the URL
4. **Deploy:** Vercel auto-deploys
5. **Test:** Verify teal/pink pop beautifully on minimal basemap
6. **Present:** VSBA panel sees true Archistar-parity visual quality

---

## Support

If you need help creating the style, share your Mapbox username and I'll provide detailed layer-by-layer instructions.

The cartographic refinement is the final 10% that makes SimplySite look like a \$10k/year professional tool. ✨
