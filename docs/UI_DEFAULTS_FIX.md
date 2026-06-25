# UI Defaults Fix: Zone Filter & Map View

## Issues Fixed

### 1. Zone Filter - All Zones Visible by Default

**Problem:**
Zone filter was initialized with all 64 zone codes enabled, making the map cluttered on first load.

**Solution:**
Changed default state to empty array (all zones hidden).

**File:** `src/app/app/page.tsx` (line 199)

```typescript
// BEFORE - All zones visible
const [activeZoneFilter, setActiveZoneFilter] = useState<string[]>(() => {
  return ZONE_CATEGORIES.flatMap(cat => cat.codes);
});

// AFTER - All zones hidden by default
const [activeZoneFilter, setActiveZoneFilter] = useState<string[]>([]);
```

**User Experience:**
- ✅ Clean map on initial load (no zone overlay clutter)
- ✅ User must manually enable zones via filter panel
- ✅ Panel is collapsed by default (already was)
- ✅ User clicks "Select All" or toggles categories to show zones

**Workflow:**
```
1. User opens app → Map loads with no zone overlays
2. User clicks "Zone Filter" panel → Expands
3. User clicks category (e.g., "Residential") → GRZ/NRZ/RGZ zones appear
4. User toggles more categories as needed
```

### 2. Map Defaulting to Isometric View

**Problem:**
When searching an address, map appeared in isometric/3D view instead of flat plan view.

**Solution:**
Explicitly set `pitch: 0` and `bearing: 0` in `initialViewState`.

**File:** `src/components/MapPreview.tsx` (line 1405)

```typescript
// BEFORE - No explicit pitch/bearing (may inherit defaults)
initialViewState={{ latitude: lat, longitude: lon, zoom: 19 }}

// AFTER - Explicit plan view
initialViewState={{ latitude: lat, longitude: lon, zoom: 19, pitch: 0, bearing: 0 }}
```

**User Experience:**
- ✅ Map loads in flat plan view (top-down, no tilt)
- ✅ User can manually toggle 3D mode if desired
- ✅ Consistent view on every address search
- ✅ No unexpected isometric perspective

## State Defaults Summary

| State | Default Value | Purpose |
|-------|---------------|---------|
| `activeZoneFilter` | `[]` | All zones hidden - user enables manually |
| `viewMode` | `'plan'` | Plan view (not satellite/hybrid) |
| `is3D` | `false` | 2D top-down (not 3D isometric) |
| `pitch` | `0` | Flat view (no camera tilt) |
| `bearing` | `0` | North-up orientation |
| Zone Filter Panel | Collapsed | User expands to access controls |

## Testing

```bash
npm run dev
```

### Test 1: Zone Filter Default
1. Navigate to any property
2. **Verify:** Map shows no zone overlays (clean view)
3. Click "Zone Filter" in bottom-left
4. **Verify:** Panel expands, all checkboxes unchecked
5. Click "Select All"
6. **Verify:** All zone overlays appear on map

### Test 2: Map View Default
1. Go to homepage
2. Search for an address (e.g., "123 Collins St Melbourne")
3. **Verify:** Map loads in flat plan view (no tilt)
4. **Verify:** `pitch: 0`, `bearing: 0` (north-up, top-down)
5. Click "3D" button in map controls
6. **Verify:** Map tilts to isometric view (pitch: 60)
7. Click "3D" again
8. **Verify:** Returns to flat plan view

## User Benefits

### Clean Initial Experience
- **Before:** Map covered in colorful zone overlays, visually cluttered
- **After:** Clean map showing only parcels and key features

### Predictable Behavior
- **Before:** Sometimes loaded in isometric view (pitch 45)
- **After:** Always loads in flat plan view (pitch 0)

### User Control
- **Before:** Zones visible by default, user had to turn off unwanted ones
- **After:** Zones hidden by default, user enables only what they need

### Professional Workflow
```
Search Address → Clean Plan View → Enable Relevant Zones → Analyze Property
```

## Configuration Options

If you want to change defaults in the future:

### Show All Zones by Default
```typescript
// src/app/app/page.tsx
const [activeZoneFilter, setActiveZoneFilter] = useState<string[]>(() => {
  return ZONE_CATEGORIES.flatMap(cat => cat.codes);
});
```

### Show Only Residential by Default
```typescript
const [activeZoneFilter, setActiveZoneFilter] = useState<string[]>(() => {
  return ZONE_CATEGORIES
    .find(cat => cat.label === 'Residential')?.codes || [];
});
```

### Default to 3D View
```typescript
// src/app/app/page.tsx
const [is3D, setIs3D] = useState(true);

// src/components/MapPreview.tsx
initialViewState={{ latitude: lat, longitude: lon, zoom: 19, pitch: 60, bearing: 0 }}
```

## Files Modified

1. **`src/app/app/page.tsx`**
   - Changed `activeZoneFilter` default from all zones to empty array

2. **`src/components/MapPreview.tsx`**
   - Added explicit `pitch: 0, bearing: 0` to `initialViewState`

## Related Settings

These defaults complement existing UI states:
- ✅ Zone Filter Panel: Collapsed by default
- ✅ View Mode: Plan (not satellite)
- ✅ 3D Mode: Disabled by default
- ✅ Draw Mode: Null (pan mode active)

All UI controls default to their least intrusive state, giving users a clean starting point.

---

**Result:** Clean, professional default UI - zones hidden, flat plan view! ✅
