# Classic React + MapLibre Bug Fixes

**Date:** 2026-06-26  
**Status:** ✅ BOTH BUGS FIXED

---

## Bug #1: The "Dead" Search Bar Click ✅

### Problem
When you select "62 Chandler Road" from the search dropdown, then pan away and click the same address again, **nothing happens**. The map doesn't fly back.

### Root Cause
React's state management optimization. When you click the same address:
1. React checks: "Is `selectedAddress` already '62 Chandler Road'?"
2. Answer: "Yes, nothing changed"
3. React aborts the render
4. The `useEffect` that watches `selectedAddress` never fires
5. `map.flyTo()` never executes

### The Fix
**Move `flyTo()` from `useEffect` to the click handler** - Fire imperatively, don't rely on state changes.

**File Modified:** `src/app/app/page.tsx`

**Changes:**
```typescript
const handleSelectAddress = (feature: any) => {
  const [lng, lat] = feature.center;
  const selectedAddress = feature.place_name;

  // ✅ FIX: ALWAYS fly to location FIRST (before state updates)
  // This ensures the flyTo fires even if address is the same
  if (mapPreviewRef.current?.getMap) {
    const mapInstance = mapPreviewRef.current.getMap();

    mapInstance.flyTo({
      center: [lng, lat],
      zoom: 19,
      pitch: 60,
      bearing: 0,
      duration: 2500,
      essential: true,
    });

    // Trigger parcel extraction after animation completes
    mapInstance.once('moveend', () => {
      const centerPoint = mapInstance.project([lng, lat]);
      if (mapPreviewRef.current?.handleClick) {
        mapPreviewRef.current.handleClick({
          lngLat: { lng, lat },
          point: centerPoint,
        });
      }
    });
  }

  // State updates happen AFTER flyTo is triggered
  router.push(`/app?address=${encodeURIComponent(selectedAddress)}`);
  setSearchQuery(selectedAddress);
  setSearchResults([]);
};
```

**Key Insight:**
- **Before:** `router.push()` → state change → useEffect → flyTo (skipped if same)
- **After:** flyTo → state change (order matters!)

---

## Bug #2: The Broken Recenter (Crosshair) Button ✅

### Problem
The crosshair button should fly back to "44 Hammond Road" (the active property), but it does nothing or tries to use browser geolocation (which fails on localhost).

### Root Cause
Missing handler or trying to use `navigator.geolocation` instead of flying to the **currently analyzed property's coordinates**.

### The Fix
Create a `handleRecenter` function that flies to the active property's `lat/lon` coordinates.

**Files Modified:**
1. `src/components/MapControlsToolbar.tsx` - Add crosshair button
2. `src/app/app/page.tsx` - Add recenter handler

### Changes:

#### 1. MapControlsToolbar.tsx
```typescript
// Add Crosshair import
import { Crosshair } from 'lucide-react';

// Add onRecenter prop
type MapControlsToolbarProps = {
  // ... existing props
  onRecenter?: () => void;
};

// Add label
const LABELS = {
  // ... existing labels
  recenter: { en: 'Recenter on Property', zh: '重新定位到房产' },
};

// Add button after Reset Bearing
<button
  type="button"
  onClick={onRecenter}
  className="flex-1 h-10 flex items-center justify-center rounded-md bg-charcoal text-lime hover:bg-lime hover:text-charcoal transition-colors"
  title={LABELS.recenter[lang]}
>
  <Crosshair className="w-4 h-4" />
</button>
```

#### 2. page.tsx - Add Handler
```typescript
const handleRecenter = () => {
  const map = mapPreviewRef.current?.getMap?.();

  // Check if we have a map instance and active property coordinates
  if (!map || !lat || !lon) {
    console.warn('[Recenter] No active property to recenter on, or map not loaded.');
    return;
  }

  // Fly back to the currently analyzed property
  map.flyTo({
    center: [lon, lat],
    zoom: 19,
    pitch: is3D ? 60 : 0,
    bearing: 0,
    speed: 1.5, // Snappy fly-back animation
    essential: true,
  });

  console.log('[Recenter] ✅ Recentered on property:', { lat, lon });
};

// Wire to MapControlsToolbar
<MapControlsToolbar
  // ... other props
  onRecenter={handleRecenter}
/>
```

**Key Insight:**
- Uses the existing `lat` and `lon` state (already tracking the active property)
- No geolocation API needed
- Flies to property centroid, not user's current location

---

## Visual Improvements

### Recenter Button Styling
- **Base:** `bg-charcoal text-lime` (lime icon on dark background)
- **Hover:** `bg-lime text-charcoal` (inverted - lime background, dark icon)
- **Position:** 4th button in zoom controls row (after compass)

---

## Testing Checklist

### Bug #1: Search Bar
- [x] Select "62 Chandler Road" from dropdown
- [x] Pan map away from property
- [x] Click "62 Chandler Road" in search bar again
- [x] ✅ Map flies back to property

### Bug #2: Recenter Button
- [x] Select a property (e.g., "44 Hammond Road")
- [x] Pan/zoom away from property
- [x] Click crosshair button in toolbar
- [x] ✅ Map flies back to property centroid

---

## Why These Bugs Are Common

### Every Spatial Developer Hits These:
1. **State-Driven Camera Movement** - Intuitive but breaks on duplicate selections
2. **Geolocation vs Property Location** - Two different concepts often confused

### The Core Problem:
React wants declarative code (`useEffect` watching state), but MapLibre camera control is **imperative** (you tell it to move NOW). Mixing paradigms causes bugs.

### The Solution Pattern:
**Imperative camera control + declarative state updates**
- Camera moves → State updates (not the reverse)
- Click handlers fire `flyTo()` directly
- State tracks "what property" not "should I fly"

---

## Pro Tips

### For PostGIS-Backed Apps:
If you're fetching property data from PostGIS, add the centroid to your response:

```sql
SELECT 
  pfi,
  address,
  ST_AsGeoJSON(geom) as geometry,
  ST_AsGeoJSON(ST_Centroid(geom)) as center_point -- ← Add this!
FROM properties
WHERE pfi = $1;
```

Then store it in your active property state:
```typescript
const [activeProperty, setActiveProperty] = useState<{
  pfi: string;
  address: string;
  centerCoordinates: [number, number]; // [lng, lat]
}>(...);
```

### For Search Results:
Use the search result's own coordinates, not the parcel centroid:
- **Search result:** `feature.center` (from Mapbox/Nominatim)
- **Parcel centroid:** `ST_Centroid(geom)` (from your DB)

Both work, but search coordinates are what the user clicked.

---

## Impact

### User Experience:
✅ Search bar works reliably (no dead clicks)  
✅ Crosshair button flies back to property  
✅ Intuitive spatial navigation  
✅ No confusion about "why didn't it move?"  

### Developer Experience:
✅ Clear pattern for camera control  
✅ Imperative flyTo, declarative state  
✅ Easy to debug (console logs show what fired)  

### Code Quality:
✅ No race conditions  
✅ No useEffect dependencies on camera state  
✅ Clean separation of concerns  

---

## Files Modified

1. **`src/app/app/page.tsx`**
   - Reordered `handleSelectAddress` (flyTo first, state after)
   - Added `handleRecenter` function
   - Wired `onRecenter` to MapControlsToolbar

2. **`src/components/MapControlsToolbar.tsx`**
   - Added `Crosshair` icon import
   - Added `onRecenter` prop type
   - Added recenter label (bilingual)
   - Added crosshair button with lime styling

---

## Related Issues Prevented

These fixes also prevent:
- ❌ Stale camera position after navigation
- ❌ Animation interrupts from duplicate clicks
- ❌ Race conditions between flyTo and state updates
- ❌ Broken "back to property" workflows

---

**Status:** ✅ **PRODUCTION READY**  
**Complexity:** Classic React spatial bugs  
**Fix Time:** 30 minutes  
**Impact:** High (core navigation reliability)

---

**Last Updated:** 2026-06-26  
**Verified:** Both bugs fixed and tested
