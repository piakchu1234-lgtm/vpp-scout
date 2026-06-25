# Layout Fix: Zone Filter Panel Positioning

## Issue

Classic frontend layout collision - the Zone Filter panel and the bottom property metrics ribbon were fighting for the same absolute positioning space at the bottom of the viewport.

**Problem:**
- Zone Filter: `bottom-4` (16px from bottom)
- Metrics Ribbon: `bottom-6` (24px from bottom)
- When Zone Filter expanded, it extended downward and got cut off behind the metrics ribbon's z-index

## Root Cause

```tsx
// BEFORE - Collision
<div className="absolute bottom-4 left-4 z-20 w-80">  {/* Zone Filter */}
  <ZoneFilterPanel />
</div>

<div className="absolute bottom-6 left-6 z-30 ...">  {/* Metrics Ribbon - Higher z-index */}
  {/* Property summary data */}
</div>
```

The Zone Filter (z-20) was behind the Metrics Ribbon (z-30), causing content to be cut off when expanded.

## Solution

Applied three CSS fixes:

### 1. Increased Bottom Spacing
```tsx
bottom-28  // 112px from bottom - clears the metrics ribbon
```

### 2. Maximum Height Constraint
```tsx
max-h-[calc(100vh-14rem)]  // Prevents stretching off top on small screens
```

### 3. Internal Scrolling
```tsx
overflow-y-auto  // Adds scrollbar inside filter panel if content is too tall
```

## Final Implementation

```tsx
// AFTER - Fixed
<div className="absolute bottom-28 left-4 z-20 w-80 max-h-[calc(100vh-14rem)] overflow-y-auto">
  <ZoneFilterPanel
    activeZones={activeZoneFilter}
    onZonesChange={setActiveZoneFilter}
  />
</div>
```

## CSS Breakdown

| Class | Purpose | Value |
|-------|---------|-------|
| `absolute` | Absolute positioning | - |
| `bottom-28` | Distance from bottom | 112px (clears 80-100px ribbon) |
| `left-4` | Distance from left | 16px |
| `z-20` | Stack order | Below metrics ribbon (z-30) |
| `w-80` | Fixed width | 320px |
| `max-h-[calc(100vh-14rem)]` | Maximum height | viewport height - 224px |
| `overflow-y-auto` | Vertical scroll | Enabled when content overflows |

## Calculation Breakdown

### Bottom Spacing
```
Metrics Ribbon Position: bottom-6 = 24px
Metrics Ribbon Padding: py-4 = 32px (16px top + 16px bottom)
Metrics Ribbon Content: ~40px
Total Ribbon Height: ~96px

Zone Filter Position: bottom-28 = 112px
Clearance: 112px - 96px = 16px gap ✓
```

### Maximum Height
```
Viewport height: 100vh
Top reserved: 8rem (128px) for header/controls
Bottom reserved: 6rem (96px) for metrics ribbon
Available: 100vh - 14rem (224px)
```

## Responsive Behavior

### Large Screens (>1080p)
- ✅ Zone Filter has plenty of vertical space
- ✅ All categories visible without scrolling
- ✅ Clean gap between filter and ribbon

### Medium Screens (1080p)
- ✅ Zone Filter fits comfortably
- ✅ Minor scrolling when all categories expanded
- ✅ Smooth scrolling experience

### Small Screens (720p)
- ✅ Zone Filter constrained by max-height
- ✅ Internal scrollbar appears automatically
- ✅ Content accessible via scroll
- ✅ No overlap with ribbon

## Testing

```bash
npm run dev
```

**Test scenarios:**

1. **Expand Zone Filter on large screen**
   - ✅ All categories visible
   - ✅ Clear gap above metrics ribbon
   - ✅ No overlap

2. **Expand Zone Filter on small screen (zoom to 67%)**
   - ✅ Scrollbar appears inside panel
   - ✅ Content scrollable
   - ✅ No content cut off

3. **Toggle between expanded/collapsed**
   - ✅ Smooth transition
   - ✅ No layout shift
   - ✅ Metrics ribbon unaffected

## Visual Layout

```
┌──────────────────────────────────────┐
│  Top Header/Controls (8rem)          │
├──────────────────────────────────────┤
│                                       │
│                                       │
│        Map Canvas                     │
│                                       │
│                                       │
├─────────────┬────────────────────────┤
│ Zone Filter │                        │ ← max-h constrains height
│ ┌─────────┐ │                        │
│ │ GRZ ✓   │ │                        │
│ │ NRZ ✓   │ │   Available Space     │
│ │ C1Z ✓   │ │                        │
│ │ ...     │ │                        │
│ │ [scroll]│ │                        │
│ └─────────┘ │                        │
├─────────────┴────────────────────────┤
│ ↑ 16px gap                            │
├───────────────────────────────────────┤
│ Metrics Ribbon (bottom-6, z-30)      │ ← Higher z-index
│ Zoning | Lot Size | Frontage | ...   │
└───────────────────────────────────────┘
```

## Alternative Solutions Considered

### Option 1: Move Filter to Top-Left
❌ Rejected - conflicts with search bar and controls

### Option 2: Move Filter to Right Side
❌ Rejected - conflicts with property side panel

### Option 3: Make Filter a Slide-In Drawer
❌ Rejected - requires additional animation complexity

### Option 4: Adjust Spacing + Scrolling ✅
✅ **Selected** - Minimal changes, clean solution, responsive

## Files Modified

- **`src/app/app/page.tsx`** (line 1691-1697)
  - Updated Zone Filter wrapper classes
  - Added `bottom-28`, `max-h-[calc(100vh-14rem)]`, `overflow-y-auto`

## CSS Pattern for Future Panels

When adding new floating panels near the bottom:

```tsx
<div className="absolute bottom-28 left-4 z-20 w-80 max-h-[calc(100vh-14rem)] overflow-y-auto">
  {/* Panel content */}
</div>
```

**Adjust if:**
- Metrics ribbon height changes → adjust `bottom-28`
- Top controls height changes → adjust `max-h` calculation
- Panel needs higher priority → adjust z-index

---

**Result:** Zone Filter and Metrics Ribbon now coexist without collision, with proper scrolling on small screens. ✅
