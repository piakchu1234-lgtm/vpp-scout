# Automated Deemed-to-Comply Checklist Engine

**Date:** 2026-06-10  
**Status:** Approved  
**Sprint:** Sprint 2

## Overview

Add an automated compliance status indicator to the dashboard sidebar that evaluates whether a property qualifies for the Victoria Planning Provisions (VPP) VC282 Small Second Dwelling (SSD) fast-track pathway based on zone, lot size, and planning overlays.

## Problem

Users currently need to manually cross-reference zone codes, lot sizes, and overlay restrictions to determine if a property qualifies for the permit-exempt SSD pathway. This requires understanding VPP VC282 regulations and ResCode requirements, creating friction in the feasibility assessment workflow.

## Solution

A persistent compliance status card mounted above the sidebar tab navigation that automatically evaluates fast-track eligibility and displays the result with clear visual states:
- **Fast-Track Eligible:** Green banner with lime badge indicating permit-exempt status
- **Permit Required:** Amber banner listing specific overlay triggers
- **Insufficient Data:** Neutral loading state

## Architecture

### Component Structure

```
src/lib/complianceRules.ts
  ↓ provides evaluateFastTrack()
src/components/dashboard/ComplianceStatus.tsx
  ↓ mounted in
src/app/app/page.tsx (above tab navigation)
```

### Data Flow

```
page.tsx state (planData, landSizeM2)
  ↓
evaluateFastTrack(zoneCode, lotSize, overlays)
  ↓
{ isFastTrackable, hasRestrictiveOverlays, ssdEligible, restrictiveOverlays }
  ↓
ComplianceStatus renders appropriate visual state
```

## Implementation Details

### 1. Compliance Rules Utility (`src/lib/complianceRules.ts`)

**Exported Types:**
```typescript
export type ComplianceResult = {
  ssdEligible: boolean;
  hasRestrictiveOverlays: boolean;
  isFastTrackable: boolean;
  restrictiveOverlays: string[];
};
```

**Function Signature:**
```typescript
export function evaluateFastTrack(
  zoneCode: string | null,
  lotSizeM2: number | null,
  overlays: string[]
): ComplianceResult
```

**Logic:**

1. **Zone Eligibility Check:**
   - Extract base zone code from string (handles schedules like "GRZ1" → "GRZ")
   - Match against: `GRZ`, `NRZ`, `RGZ`, `MUZ`, `TZ` (case-insensitive)
   - Result: `zoneQualifies: boolean`

2. **Lot Size Check:**
   - Lot size must be ≥ 300m² (SSD_MIN_LOT_SIZE_M2 constant from feasibility.ts)
   - Handle null/undefined/zero as false
   - Result: `lotSizeQualifies: boolean`

3. **SSD Eligibility:**
   - `ssdEligible = zoneQualifies && lotSizeQualifies`

4. **Restrictive Overlay Detection:**
   - Check overlay array for: `HO`, `BMO`, `LSIO`, `SBO`
   - Match against uppercase overlay code prefixes (handles "HO123" → "HO")
   - Collect matching codes in `restrictiveOverlays: string[]`
   - `hasRestrictiveOverlays = restrictiveOverlays.length > 0`

5. **Fast-Track Determination:**
   - `isFastTrackable = ssdEligible && !hasRestrictiveOverlays`

**Edge Cases:**
- Null zone → `ssdEligible = false`
- Null lot size → `ssdEligible = false`
- Empty overlays array → `hasRestrictiveOverlays = false`
- Commercial zones (C1Z, C2Z) → `ssdEligible = false` (not residential)

### 2. ComplianceStatus Component (`src/components/dashboard/ComplianceStatus.tsx`)

**Props Interface:**
```typescript
type Props = {
  zoneCode: string | null;
  lotSizeM2: number | null;
  overlays: string[];
  lang?: 'en' | 'zh';
};
```

**Component Logic:**
```typescript
const result = evaluateFastTrack(zoneCode, lotSizeM2, overlays);
const hasData = zoneCode !== null && lotSizeM2 !== null;
```

**Visual States:**

**State 1: Fast-Track Eligible** (when `result.isFastTrackable === true`)
- **Container:** `bg-emerald-950/40 border border-emerald-800/30 rounded-lg p-4`
- **Icon:** `CheckCircle` from lucide-react, color `text-[#E9E778]`
- **Heading:** "Deemed-to-Comply Eligible" (bilingual)
- **Subtext:** "VPP VC282 Fast-Track Pathway" (bilingual)
- **Badge:** Pill shape, `border border-[#E9E778] text-[#E9E778] bg-[#E9E778]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider`
- **Badge Text:** "As-of-Right / No Planning Permit" (bilingual)

**State 2: Permit Required** (when `result.hasRestrictiveOverlays === true`)
- **Container:** `bg-amber-950/30 border border-amber-800/40 rounded-lg p-4`
- **Icon:** `AlertTriangle` from lucide-react, color `text-amber-400`
- **Heading:** "Planning Permit Required" (bilingual)
- **Trigger List:** 
  - Render each code in `result.restrictiveOverlays`
  - Format: "Trigger: Heritage Overlay (HO)" using OVERLAY_NAMES map
  - Stack vertically with `space-y-1`
  - Text: `text-xs text-amber-200/80`

**State 3: Insufficient Data** (when `!hasData`)
- **Container:** `bg-zinc-900/50 border border-zinc-800 rounded-lg p-4`
- **Icon:** `Loader2` spinning, color `text-zinc-500`
- **Message:** "Awaiting parcel data..." (bilingual)

**Overlay Name Mapping:**
```typescript
const OVERLAY_NAMES: Record<string, { en: string; zh: string }> = {
  HO: { en: 'Heritage Overlay', zh: '遗产覆盖区' },
  BMO: { en: 'Bushfire Management Overlay', zh: '山火管理覆盖区' },
  LSIO: { en: 'Land Subject to Inundation Overlay', zh: '淹水覆盖区' },
  SBO: { en: 'Special Building Overlay', zh: '特殊建筑覆盖区' },
};
```

**Bilingual Copy:**
```typescript
const COPY: Record<Lang, {
  eligibleHeading: string;
  eligibleSubtext: string;
  eligibleBadge: string;
  permitHeading: string;
  triggerPrefix: string;
  awaitingData: string;
}> = {
  en: {
    eligibleHeading: 'Deemed-to-Comply Eligible',
    eligibleSubtext: 'VPP VC282 Fast-Track Pathway',
    eligibleBadge: 'As-of-Right / No Planning Permit',
    permitHeading: 'Planning Permit Required',
    triggerPrefix: 'Trigger:',
    awaitingData: 'Awaiting parcel data...',
  },
  zh: {
    eligibleHeading: '符合豁免条件',
    eligibleSubtext: 'VPP VC282 快速通道',
    eligibleBadge: '无需规划许可',
    permitHeading: '需申请规划许可',
    triggerPrefix: '触发条件:',
    awaitingData: '正在等待地块数据...',
  },
};
```

### 3. Page Integration (`src/app/app/page.tsx`)

**Mount Location:**
Insert ComplianceStatus immediately **before** the `<nav>` element containing tab buttons (around line 454 in current code).

**Props Passed:**
```typescript
<ComplianceStatus
  zoneCode={planData?.zoneCode ?? null}
  lotSizeM2={landSizeM2}
  overlays={planData?.overlayRaw ?? []}
  lang={language}
/>
```

**Spacing:**
- Add `mb-4` to ComplianceStatus wrapper for spacing before tabs
- Tab navigation already has `pt-6` so total gap will be ~1.5rem

## Type Safety

All types derive from existing project types:
- Zone codes: string format matching `feasibility.ts` ZONES
- Overlay codes: string[] matching `VicPlanData.overlayRaw`
- Lot size: number matching `landSizeM2` from Turf area calculation

TypeScript strict mode compliance verified via `npx tsc --noEmit`.

## Testing Strategy

**Manual Testing Scenarios:**
1. **Fast-Track Eligible:** GRZ zone, 650m² lot, no overlays → Green banner + lime badge
2. **Heritage Trigger:** GRZ zone, 650m² lot, HO overlay → Amber banner listing HO
3. **Multiple Triggers:** NRZ zone, 500m² lot, HO + BMO → Amber banner listing both
4. **Lot Too Small:** GRZ zone, 250m² lot, no overlays → Amber banner (not eligible)
5. **Commercial Zone:** C1Z zone, 800m² lot, no overlays → Not eligible (SSD N/A)
6. **Awaiting Data:** Before Vicmap returns parcel → Neutral loading state

## Success Criteria

- ✅ Component renders above tab navigation in sidebar
- ✅ Correct visual state for all test scenarios
- ✅ Bilingual copy switches cleanly with language toggle
- ✅ No TypeScript errors (`npx tsc --noEmit` passes)
- ✅ Zero layout shift (fixed height or smooth transition)
- ✅ Consistent with SimplySite dark theme aesthetic

## Out of Scope

- ResCode Clause 54/55 detailed checks (frontage, slope, garden area) — covered by existing feasibility.ts logic
- Interactive "Why?" explanation modal — future enhancement
- PDF report integration — handled separately by report generation endpoint
- Animation/transition effects beyond basic opacity fade

## Dependencies

- Existing types: `VicPlanData`, `ParcelPolygon` from `vicPlanApi.ts`
- Existing constants: `SSD_MIN_LOT_SIZE_M2` from `feasibility.ts`
- UI library: `lucide-react` for icons
- Styling: Tailwind CSS v4

## Commit Message

```
feat: implement automated Deemed-to-Comply status block in dashboard sidebar

- Add complianceRules.ts utility with evaluateFastTrack() logic
- Create ComplianceStatus component with hybrid color treatment
  (emerald bg for eligible, lime badge, amber for permit triggers)
- Mount above sidebar tabs for persistent visibility
- Support bilingual copy (EN/中文) with statutory term preservation
- Evaluate VC282 SSD fast-track eligibility based on zone, lot size, overlays
```
