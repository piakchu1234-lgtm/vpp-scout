# Mapbox Controls Position Fix

## Issue

Mapbox drawing controls (NavigationControl, MapboxDraw) were positioned at `top-right`, causing collision with the Property Analysis sidebar on the right side of the screen.

## Root Cause

```
Top-Right Layout Collision:
┌────────────────────────────────────┐
│                    [Draw Controls] │ ← Mapbox controls
│                    [Property Panel]│ ← Sidebar
│                          ↓          │
│                    Overlapping!    │
└────────────────────────────────────┘
```

Mapbox controls use absolute positioning with `right` property. The Property Analysis sidebar also uses `right` positioning, causing both to fight for the same pixel space.

## Solution

### 1. Move MapboxDraw Control to Top-Left

**File:** `src/components/MapPreview.tsx` (line 449)

```javascript
// BEFORE - Collision with right sidebar
map.addControl(draw, 'top-right');

// AFTER - Clear space on left
map.addControl(draw, 'top-left');
```

### 2. Add Custom CSS Positioning

**File:** `src/app/globals.css` (lines 107-126)

```css
/* Mapbox Controls Positioning - Move to top-left to avoid collision */
.mapboxgl-ctrl-top-left {
  top: 80px;  /* Clear the top header/search bar */
  left: 16px; /* Consistent with other left-aligned panels */
}

/* Ensure Mapbox Draw controls are styled consistently */
.mapboxgl-ctrl-top-left .mapboxgl-ctrl {
  margin: 0 0 10px 0;
}

/* Dark theme styling for controls */
.mapboxgl-ctrl-group button {
  background-color: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(12px);
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.mapboxgl-ctrl-group button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}
```

## Layout After Fix

```
Top-Left Position (No Collision):
┌────────────────────────────────────┐
│ [Header/Search]                    │ ← 80px height
│ [Draw Controls]                    │ ← Mapbox controls at top-left
│                    [Property Panel]│ ← Sidebar on right (no collision)
│                                    │
│          Map Canvas                │
│                                    │
└────────────────────────────────────┘
```

## Positioning Details

| Element | Position | Offset | Purpose |
|---------|----------|--------|---------|
| Mapbox Controls | `top-left` | `top: 80px, left: 16px` | Drawing tools, navigation |
| Property Sidebar | `top-0 right-0` | - | Property analysis panel |
| Zone Filter | `bottom-28 left-4` | - | Zone filtering |
| Map Controls Toolbar | `bottom-28 right-4` | - | 3D/zoom controls |
| Metrics Ribbon | `bottom-6` | - | Property metrics |

## Why Top-Left?

**Advantages:**
- ✅ Clears right sidebar completely
- ✅ Aligns with left-side UI elements (Zone Filter)
- ✅ Consistent with professional GIS tools
- ✅ No collision with any existing panels

**Alternative Positions Rejected:**
- ❌ `top-right` - Collides with sidebar
- ❌ `bottom-left` - Collides with Zone Filter
- ❌ `bottom-right` - Collides with Map Controls Toolbar

## CSS Customization

### Adjust Top Offset

If the controls hit your search bar or header:

```css
.mapboxgl-ctrl-top-left {
  top: 100px; /* Increase to push down further */
  left: 16px;
}
```

### Adjust Left Offset

To align with other panels:

```css
.mapboxgl-ctrl-top-left {
  top: 80px;
  left: 24px; /* Match Zone Filter positioning */
}
```

### Custom Button Styling

Match your theme colors:

```css
.mapboxgl-ctrl-group button {
  background-color: #241F21 !important; /* Your dark background */
  border-color: #E9E778 !important;     /* Your accent color */
}

.mapboxgl-ctrl-group button:hover {
  background-color: #E9E778 !important;
  color: #241F21 !important;
}
```

## Testing

```bash
npm run dev
```

### Verify Position
1. Navigate to any property
2. Click drawing tools in MapControlsToolbar
3. **Verify:** Mapbox Draw controls appear in **top-left** corner
4. **Verify:** Controls sit below header (≈80px from top)
5. **Verify:** No overlap with right sidebar

### Verify Styling
1. Check control buttons have dark theme styling
2. Hover over buttons - should have subtle highlight
3. **Verify:** Controls match app's dark commercial theme

### Test Drawing
1. Click polygon/line drawing tool
2. Draw on map
3. **Verify:** Controls remain accessible while drawing
4. **Verify:** No UI interference

## Migration Notes

If you have other Mapbox controls (e.g., GeolocateControl, ScaleControl), update them similarly:

```javascript
// Navigation Control
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

// Geolocate Control
map.addControl(new mapboxgl.GeolocateControl(), 'top-left');

// Scale Control
map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
```

## Files Modified

1. **`src/components/MapPreview.tsx`**
   - Changed: `map.addControl(draw, 'top-right')` → `map.addControl(draw, 'top-left')`

2. **`src/app/globals.css`**
   - Added: `.mapboxgl-ctrl-top-left` positioning rules
   - Added: Dark theme button styling

## Related Issues Fixed

This fix complements earlier layout fixes:
- ✅ Zone Filter positioned bottom-left (no collision)
- ✅ Map Controls positioned bottom-right (no collision)
- ✅ Mapbox Draw positioned top-left (no collision)
- ✅ Property Sidebar on right (clear space)

All panels now have dedicated, non-overlapping screen space.

## Pro Tip: Responsive Positioning

For mobile/tablet views, you can adjust positioning:

```css
@media (max-width: 768px) {
  .mapboxgl-ctrl-top-left {
    top: 60px;  /* Reduced header height on mobile */
    left: 8px;  /* Tighter margin */
  }
}
```

---

**Result:** Mapbox drawing controls now positioned at top-left, no collision with right sidebar! ✅
