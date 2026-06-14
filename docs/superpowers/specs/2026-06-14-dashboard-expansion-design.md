# Dashboard Expansion Design Specification

**Date:** 2026-06-14  
**Project:** SimplySite - Victorian Property Feasibility Platform  
**Scope:** Phase 1 UI Feature Parity with Enterprise Platforms (Landchecker-class)

---

## Executive Summary

This specification defines three coordinated dashboard enhancements that advance SimplySite to enterprise-grade UI/UX parity:

1. **Map Controls Toolbar** — Replace legacy thumbnail system with unified glassmorphism icon toolbar supporting Dark Plan / Satellite / Hybrid view modes and 2D/3D camera controls
2. **Property Inspector Accordion** — Deep data accordion with three collapsible sections surfacing property attributes, planning constraints, and premium SaaS actions
3. **Multi-Parcel Selection** — Foundation state architecture supporting click-to-select cadastral parcels with lime highlight rendering

All features preserve existing compliance engine logic, maintain the bilingual UI pattern (EN/ZH), and integrate seamlessly with current Mapbox rendering pipeline.

---

## 1. Map Controls Toolbar

### 1.1 Component Architecture

**File:** `src/components/map/MapControlsToolbar.tsx` (new file)

**Purpose:** Single-source map interaction controls consolidating view mode switching and camera pitch/bearing adjustments.

**Visual Design:**
- Floating vertical toolbar positioned `top-right` below existing `NavigationControl`
- Glassmorphism aesthetic: `bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-lg shadow-xl p-1.5`
- Two logical sections separated by horizontal divider (`h-px bg-white/10 my-1`):
  - **View Mode Group** (3 icon buttons)
  - **Camera Group** (1 toggle button)

**State Integration:**
- Accepts `viewMode` and `setViewMode` props from parent `MapPreview`
- Accepts `is3D` and `setIs3D` props from parent `MapPreview`
- No internal state — fully controlled component

### 1.2 View Mode Controls

**Three Mutually-Exclusive Buttons:**

| Mode       | Icon          | Mapbox Style                              | Label (EN/ZH)          |
|------------|---------------|-------------------------------------------|------------------------|
| `plan`     | Layers icon   | `mapbox://styles/mapbox/dark-v11`        | Dark Plan / 平面图     |
| `satellite`| Satellite icon| `mapbox://styles/mapbox/satellite-streets-v12` | Satellite / 卫星图 |
| `hybrid`   | LayersIcon + Globe | `mapbox://styles/mapbox/satellite-streets-v12` | Hybrid / 混合图 |

**Button Styling:**
- Base: `w-10 h-10 flex items-center justify-center rounded-md border border-transparent transition-all`
- Active: `bg-[#E9E778] text-[#241F21] shadow-md`
- Inactive: `text-zinc-300 hover:bg-white/10 hover:border-white/20`

**Behavior:**
- Clicking a button calls `setViewMode(newMode)`
- Parent `MapPreview` reacts to `viewMode` change via existing `mapStyle={STYLE_BY_VIEW[viewMode]}` prop
- Monochrome paint overrides (`applyMonochrome()`) fire only when `viewMode === 'plan'`

### 1.3 Camera Controls (2D/3D Toggle)

**Single Toggle Button:**
- Icon: `Cube` (lucide-react) with rotation transform when active
- Label on hover: "2D View" / "3D View"
- Styling matches view mode buttons (lime when active)

**Camera Animation Behavior:**

```typescript
// When is3D becomes true:
map.easeTo({
  pitch: 60,
  bearing: 0,
  duration: 800,
  easing: (t) => t * (2 - t),
});

// When is3D becomes false:
map.easeTo({
  pitch: 0,
  bearing: 0,
  duration: 800,
  easing: (t) => t * (2 - t),
});
```

**Integration with Existing Code:**
- The `useEffect` in `MapPreview` that manages `fitBounds` / `flyTo` on coordinate changes preserves pitch value based on `is3D` state
- No terrain/extrusion layers added in Phase 1 (Mapbox 3D buildings layer remains hidden per existing `applyMonochrome` logic)

### 1.4 Removal of Legacy Components

**Delete from `MapPreview.tsx`:**
- `ViewThumb` component definition (lines 1264-1306)
- View mode thumbnail JSX block (lines 1102-1160)
- `proGateOpen` state and associated modal (lines 1222-1258)
- Planning overlay toggle panel remains unchanged (lines 1162-1220)

**Replace with:**
```tsx
<MapControlsToolbar
  viewMode={viewMode}
  setViewMode={setViewMode}
  is3D={is3D}
  setIs3D={setIs3D}
  lang={lang}
/>
```

---

## 2. Property Inspector Accordion

### 2.1 Component Architecture

**File:** `src/components/dashboard/PropertyInspector.tsx` (new file)

**Purpose:** Collapsible deep-data panel surfacing property attributes, planning constraints, and SaaS action CTAs below the compliance status card.

**Integration Point:** `src/app/app/page.tsx` line ~527, immediately after `<ComplianceStatus />` component.

**Props Interface:**
```typescript
type PropertyInspectorProps = {
  aiInsight: AIInsightData | null;
  landSizeM2: number | null;
  overlays: PlanningOverlay[] | null;
  lang: 'en' | 'zh';
  isLoadingData: boolean;
};
```

**Accordion Implementation:**
- Use Radix UI `@radix-ui/react-accordion` primitive
- Type: `"multiple"` (allows multiple sections open simultaneously)
- Default open: `["property-details"]` (first section expanded on mount)

### 2.2 Section 1: Property Details

**Header:** "Property Details" / "物业详情"

**Content Grid Layout:**
```
┌──────────────────────────────────────┐
│ Bedrooms          3                  │
│ Bathrooms         2                  │
│ Car Spaces        2                  │
│ Last Sold         $1,250,000         │
│                   05 Mar 2023        │
│ Year Built        [Data Unavailable] │
│ Floor Area (m²)   [Data Unavailable] │
└──────────────────────────────────────┘
```

**Data Bindings:**
- `Bedrooms`: `aiInsight?.bedrooms ?? "—"`
- `Bathrooms`: `aiInsight?.bathrooms ?? "—"`
- `Car Spaces`: `aiInsight?.carspaces ?? "—"`
- `Last Sold`: `aiInsight?.estimatedLastSoldPrice ?? "—"`  
  Secondary line: `aiInsight?.estimatedContractDate ?? ""`
- `Year Built`: Badge component `<UnavailableBadge />`
- `Floor Area`: Badge component `<UnavailableBadge />`

**UnavailableBadge Component:**
```tsx
<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400">
  <Lock className="w-3 h-3" />
  Data Unavailable
</span>
```

**Loading State:**
- When `isLoadingData === true` and `aiInsight === null`, show skeleton loaders (pulsing zinc-700 bars)

### 2.3 Section 2: Planning & Hazards

**Header:** "Planning & Hazards" / "规划与风险"

**Content Structure:**

**Sub-section A: Overlays**
- Label: "Planning Overlays" / "规划覆盖区"
- Render `overlays[]` array as colored tag badges
- Color mapping:

| Overlay Code Pattern | Badge Color | Label (EN/ZH)                    |
|----------------------|-------------|----------------------------------|
| `HO*`                | `bg-amber-950/40 border-amber-700 text-amber-300` | Heritage Overlay / 遗产覆盖区 (HO) |
| `BMO*`               | `bg-orange-950/40 border-orange-700 text-orange-300` | Bushfire Overlay / 山火管理覆盖区 (BMO) |
| `FO*`, `LSIO*`, `SBO*` | `bg-blue-950/40 border-blue-700 text-blue-300` | Flood Overlay / 淹水覆盖区 (FO) |
| Other                | `bg-zinc-800 border-zinc-600 text-zinc-300` | [Code] |

**Badge Component:**
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium">
  <AlertTriangle className="w-3.5 h-3.5" />
  {label}
</span>
```

**Sub-section B: Hazards**
- Label: "Identified Hazards" / "识别风险"
- Render `aiInsight?.hazards[]` as red warning badges
- Badge: `bg-red-950/40 border-red-700 text-red-300`

**Empty State:**
- When both arrays empty: `"No constraints detected" / "未检测到限制条件"` in `text-zinc-500 text-sm`

### 2.4 Section 3: SaaS Actions

**Header:** "Actions" / "操作"

**Content: Two Stacked Buttons**

**Button 1: Save to Project**
```tsx
<button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-zinc-700 bg-transparent text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors">
  <BookmarkPlus className="w-4 h-4" />
  {lang === 'en' ? 'Save to Project' : '保存至项目'}
</button>
```

**Button 2: Purchase Title & Easement Search**
```tsx
<button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#E9E778] text-[#241F21] text-sm font-bold uppercase tracking-wider hover:bg-[#d4d262] transition-colors">
  <FileText className="w-4 h-4" />
  {lang === 'en' ? 'Purchase Title & Easement Search' : '购买产权与地役权报告'}
</button>
```

**Behavior (Phase 1):**
- Both buttons are non-functional placeholders
- `onClick` handlers log to console or show toast notification: "Feature coming soon"

### 2.5 Accordion Visual Specifications

**Container:**
```tsx
className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/30 overflow-hidden"
```

**Accordion Item:**
```tsx
<Accordion.Item value="property-details" className="border-b border-zinc-700 last:border-b-0">
```

**Accordion Trigger (Header):**
```tsx
<Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold uppercase tracking-widest text-zinc-300 hover:bg-white/5 transition-colors group">
  <span>{title}</span>
  <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform group-data-[state=open]:rotate-180" />
</Accordion.Trigger>
```

**Accordion Content:**
```tsx
<Accordion.Content className="px-4 py-4 space-y-3 text-sm text-zinc-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
  {/* Section content */}
</Accordion.Content>
```

---

## 3. Multi-Parcel Selection State

### 3.1 State Architecture

**Location:** `src/app/app/page.tsx` within `AppCanvas` component

**New State:**
```typescript
const [selectedParcels, setSelectedParcels] = useState<ParcelFeature[]>([]);
```

**Type Definition (already exists in `MapPreview.tsx`):**
```typescript
export type ParcelFeature = {
  type: 'Feature';
  properties: {
    PARCEL_PFI: string;
    LOT_NUMBER?: string;
    PLAN_NUMBER?: string;
  };
  geometry: ParcelPolygon;
};
```

### 3.2 Click Behavior Logic

**Modified `handleMapParcelClick` in `AppCanvas`:**

```typescript
async function handleMapParcelClick(
  lonLat: [number, number],
  clickedParcel: ParcelFeature | null
) {
  // If no parcel was clicked (empty space), clear selection array
  if (!clickedParcel) {
    setSelectedParcels([]);
    return;
  }

  // If a parcel was clicked, toggle its presence in the array
  setSelectedParcels((prev) => {
    const pfi = clickedParcel.properties.PARCEL_PFI;
    const exists = prev.some((p) => p.properties.PARCEL_PFI === pfi);
    
    if (exists) {
      // Remove from array
      return prev.filter((p) => p.properties.PARCEL_PFI !== pfi);
    } else {
      // Add to array
      return [...prev, clickedParcel];
    }
  });

  // Original navigation logic (reverse geocode + router.push) removed
  // Multi-parcel mode does not navigate away from current view
}
```

**MapPreview Signature Update:**
```typescript
onParcelClick?: (lonLat: LonLat, parcel: ParcelFeature | null) => void;
```

### 3.3 Rendering Selected Parcels

**Implementation in `MapPreview.tsx`:**

Accept new prop:
```typescript
selectedParcels?: ParcelFeature[];
```

Render loop after primary property boundary:
```tsx
{selectedParcels && selectedParcels.map((parcel, idx) => (
  <Source
    key={`multi-parcel-${idx}`}
    id={`multi-parcel-${idx}`}
    type="geojson"
    data={parcel}
  >
    <Layer
      id={`multi-parcel-fill-${idx}`}
      type="fill"
      paint={{
        'fill-color': '#E9E778',
        'fill-opacity': 0.2,
      }}
    />
    <Layer
      id={`multi-parcel-line-${idx}`}
      type="line"
      paint={{
        'line-color': '#E9E778',
        'line-width': 2,
        'line-opacity': 1,
      }}
    />
  </Source>
))}
```

**Visual Treatment:**
- Same lime accent (`#E9E778`) as primary parcel boundary
- Lower opacity (0.2 fill vs 0.0 for primary) to distinguish secondary selections
- Line width 2px vs 3px for primary boundary

### 3.4 Future Integration Points

**Phase 2 Scope (Deferred):**
- Consolidated feasibility analysis across multiple parcels
- Geometry union/intersection calculations using Turf.js
- Aggregate land area and zone compatibility checks
- UI panel showing "3 parcels selected — 2,450 m² total"

**Phase 1 Scope:**
- Visual selection and highlight rendering only
- No consolidated data processing
- State foundation for future features

---

## 4. Implementation Sequence

### 4.1 File Creation Order

1. `src/components/map/MapControlsToolbar.tsx` — New floating toolbar component
2. `src/components/dashboard/PropertyInspector.tsx` — New accordion component
3. Modify `src/components/MapPreview.tsx`:
   - Add `is3D` state and camera animation effect
   - Remove `ViewThumb` component and legacy thumbnail JSX
   - Add `MapControlsToolbar` import and render
   - Add `selectedParcels` prop and rendering logic
   - Update `onParcelClick` signature to pass clicked parcel data
4. Modify `src/app/app/page.tsx`:
   - Add `selectedParcels` state
   - Update `handleMapParcelClick` logic for multi-select
   - Add `PropertyInspector` import and render below `ComplianceStatus`
   - Pass `selectedParcels` to `MapPreview`

### 4.2 Type Safety Verification

Run after all edits:
```bash
npx tsc --noEmit
```

Expected output: `0 errors`

### 4.3 Git Commit Structure

**Single atomic commit:**
```bash
git add src/components/map/MapControlsToolbar.tsx
git add src/components/dashboard/PropertyInspector.tsx
git add src/components/MapPreview.tsx
git add src/app/app/page.tsx
git commit -m "feat: deploy glass map controls, property inspector accordion, and multi-parcel selection matrix

- Replace legacy thumbnail system with unified glassmorphism toolbar
- Add 2D/3D camera pitch controls with 60-degree transition
- Implement three-section property inspector accordion (details/planning/actions)
- Foundation state for multi-parcel selection with lime highlight rendering
- Preserve all existing compliance engine logic and bilingual UI patterns"
git push origin main
```

---

## 5. Design Principles & Constraints

### 5.1 Visual Consistency

**Theme Adherence:**
- All new components use existing dark theme palette (`#241F21` bg, `#E9E778` accent)
- Glassmorphism effects: `backdrop-blur-md` + `bg-zinc-900/80` for floating panels
- Icon set: lucide-react (consistent with existing `Loader2`, `AlertTriangle`, etc.)

**Typography:**
- Headers: `text-[10px] uppercase tracking-widest font-bold text-zinc-400`
- Body: `text-sm text-zinc-300`
- Badges: `text-xs font-medium`

### 5.2 Accessibility

**Keyboard Navigation:**
- All toolbar buttons: `tabindex="0"`, `aria-pressed` for toggle states
- Accordion: Radix UI handles `aria-expanded`, `aria-controls` automatically

**Screen Readers:**
- Button labels use `aria-label` where icon-only
- Accordion sections have semantic heading structure

### 5.3 Performance

**Rendering Optimization:**
- `selectedParcels` array uses stable keys (`PARCEL_PFI`) to prevent unnecessary re-renders
- Camera animations use `easeTo` (GPU-accelerated) not `flyTo`
- Accordion content uses CSS animations (`data-[state]` attributes) not JS

**Memory Bounds:**
- Multi-parcel selection capped at ~50 parcels (future UI warning if exceeded)
- No retention of full geometry history (only current selection array)

### 5.4 Bilingual Support

**All User-Facing Strings:**
- Toolbar tooltips: EN/ZH object keys
- Accordion section headers: EN/ZH object keys
- Badge labels: EN/ZH with statutory term override (HO, BMO, FO remain English per CLAUDE.md)

**Example:**
```typescript
const LABELS = {
  propertyDetails: { en: 'Property Details', zh: '物业详情' },
  planningHazards: { en: 'Planning & Hazards', zh: '规划与风险' },
  actions: { en: 'Actions', zh: '操作' },
};
```

---

## 6. Testing & Verification Checklist

### 6.1 Map Controls Toolbar

- [ ] Toolbar renders in top-right position below NavigationControl
- [ ] Dark Plan button switches to `dark-v11` style
- [ ] Satellite button switches to `satellite-streets-v12` style
- [ ] Hybrid button switches to `satellite-streets-v12` style
- [ ] Active button shows lime background
- [ ] 2D/3D toggle animates camera pitch smoothly (60° / 0°)
- [ ] Monochrome paint overrides only apply in Plan mode
- [ ] Legacy thumbnail system completely removed
- [ ] Planning overlay toggles remain functional below toolbar

### 6.2 Property Inspector Accordion

- [ ] Component renders below ComplianceStatus card
- [ ] Section 1 (Property Details) expands by default
- [ ] Bedrooms/Bathrooms/Cars display AI data or "—"
- [ ] Last Sold shows price + date or "—"
- [ ] Year Built and Floor Area show "Data Unavailable" badge
- [ ] Section 2 (Planning & Hazards) renders overlay badges with correct colors
- [ ] HO badges are amber, BMO orange, FO/LSIO/SBO blue
- [ ] Hazards array renders as red warning badges
- [ ] Empty state shows "No constraints detected"
- [ ] Section 3 (SaaS Actions) renders two stacked buttons
- [ ] Buttons have correct styling (secondary border, primary lime)
- [ ] Chevron icons rotate 180° when sections expand
- [ ] Multiple sections can be open simultaneously
- [ ] Bilingual labels switch correctly with language toggle

### 6.3 Multi-Parcel Selection

- [ ] Clicking a cadastral parcel highlights it with lime overlay
- [ ] Clicking a second parcel adds it to selection (both remain highlighted)
- [ ] Clicking an already-selected parcel removes it from selection
- [ ] Clicking empty space clears all selections
- [ ] Selected parcels persist across 2D/3D camera transitions
- [ ] Selected parcels persist across view mode changes (Plan/Satellite/Hybrid)
- [ ] Each selected parcel has unique layer IDs (`multi-parcel-0`, `multi-parcel-1`, etc.)
- [ ] Primary property boundary (from URL params) remains distinct from multi-select highlights

### 6.4 Type Safety

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No `@ts-ignore` comments added
- [ ] All new props have explicit TypeScript interfaces
- [ ] Radix UI Accordion types installed (`@radix-ui/react-accordion`)

---

## 7. Future Enhancements (Out of Scope)

**Phase 2 Candidates:**
- Consolidated feasibility analysis across selected parcels
- Multi-parcel aggregate metrics panel (total area, zone distribution)
- Export selected parcels as GeoJSON
- "Save to Project" backend integration (requires auth + Prisma schema)
- "Purchase Title Search" Stripe checkout flow integration
- High-Res Nearmap layer unlocked via Pro tier gate

**Phase 3 Candidates:**
- 3D terrain and building extrusion layers
- Time-of-day sun shadow analysis
- Animated parcel highlight on selection (pulsing border)
- Keyboard shortcuts for map controls (2D/3D: "3", Plan/Satellite toggle: "M")

---

## 8. Dependencies

**No New npm Packages Required:**
- `@radix-ui/react-accordion` — Already installed (confirmed in package.json)
- `lucide-react` — Already installed
- `framer-motion` — Already installed
- `react-map-gl/mapbox` — Already installed

**Mapbox API:**
- No additional style purchases required (dark-v11, satellite-streets-v12 both included in free tier)

---

## 9. Rollback Plan

**If Critical Issues Found Post-Deployment:**

1. Revert commit: `git revert <commit-hash>`
2. Restore legacy thumbnail system from git history
3. Remove PropertyInspector import from `app/page.tsx`
4. Remove `selectedParcels` state and related logic

**Partial Rollback Options:**
- Map Controls only: Comment out `MapControlsToolbar`, restore thumbnails
- Accordion only: Comment out `PropertyInspector` render
- Multi-select only: Remove `selectedParcels` state, restore original `handleMapParcelClick`

---

## 10. Success Metrics

**Qualitative:**
- UI feels cohesive and professional (comparable to Landchecker/CoreLogic platforms)
- No visual regressions in existing compliance/feasibility logic
- Smooth camera animations enhance spatial understanding

**Quantitative:**
- No TypeScript errors after implementation
- No runtime console errors in dev or production
- No increase in bundle size >50KB (all components use existing dependencies)
- Lighthouse Performance score remains ≥90

**User Experience:**
- < 800ms perceived latency for 2D/3D camera transition
- < 300ms accordion expand/collapse animation
- Multi-parcel selection feels instant (no visible delay)

---

## Appendix A: Component File Structure

```
src/
├── components/
│   ├── map/
│   │   └── MapControlsToolbar.tsx       [NEW]
│   ├── dashboard/
│   │   ├── ComplianceStatus.tsx         [EXISTING - unchanged]
│   │   └── PropertyInspector.tsx        [NEW]
│   └── MapPreview.tsx                   [MODIFIED]
└── app/
    └── app/
        └── page.tsx                      [MODIFIED]
```

## Appendix B: Key Type Definitions

```typescript
// src/components/map/MapControlsToolbar.tsx
type ViewMode = 'plan' | 'satellite' | 'hybrid';

type MapControlsToolbarProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  is3D: boolean;
  setIs3D: (is3D: boolean) => void;
  lang: 'en' | 'zh';
};

// src/components/dashboard/PropertyInspector.tsx
type PropertyInspectorProps = {
  aiInsight: AIInsightData | null;
  landSizeM2: number | null;
  overlays: PlanningOverlay[] | null;
  lang: 'en' | 'zh';
  isLoadingData: boolean;
};

// src/components/MapPreview.tsx (additions)
type ParcelFeature = {
  type: 'Feature';
  properties: {
    PARCEL_PFI: string;
    LOT_NUMBER?: string;
    PLAN_NUMBER?: string;
  };
  geometry: ParcelPolygon;
};

type Props = {
  // ... existing props
  selectedParcels?: ParcelFeature[];
  onParcelClick?: (lonLat: LonLat, parcel: ParcelFeature | null) => void;
};
```

---

**End of Specification**
