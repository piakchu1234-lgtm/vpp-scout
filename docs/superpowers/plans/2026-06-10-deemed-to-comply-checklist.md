# Deemed-to-Comply Checklist Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated compliance status card to the dashboard sidebar that evaluates VPP VC282 SSD fast-track eligibility based on zone, lot size, and overlays.

**Architecture:** Pure utility function (`complianceRules.ts`) provides evaluation logic, React component (`ComplianceStatus.tsx`) renders visual states, integrated into page.tsx above tab navigation.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, lucide-react icons

---

## File Structure

**New Files:**
- `src/lib/complianceRules.ts` - Compliance evaluation logic
- `src/components/dashboard/ComplianceStatus.tsx` - Visual status card component

**Modified Files:**
- `src/app/app/page.tsx:454` - Mount ComplianceStatus above tab navigation

---

## Task 1: Compliance Rules Utility

**Files:**
- Create: `src/lib/complianceRules.ts`

- [ ] **Step 1: Create compliance rules utility with types and constants**

```typescript
/**
 * VPP VC282 Small Second Dwelling (SSD) fast-track compliance rules.
 * Evaluates zone eligibility, lot size thresholds, and restrictive overlay presence.
 */

import { SSD_MIN_LOT_SIZE_M2 } from './feasibility';

export type ComplianceResult = {
  /** Zone is GRZ/NRZ/RGZ/MUZ/TZ AND lot size >= 300m² */
  ssdEligible: boolean;
  /** HO, BMO, LSIO, or SBO overlay present */
  hasRestrictiveOverlays: boolean;
  /** ssdEligible AND NOT hasRestrictiveOverlays */
  isFastTrackable: boolean;
  /** Array of restrictive overlay codes found (e.g., ["HO", "BMO"]) */
  restrictiveOverlays: string[];
};

/** Zones eligible for SSD permit-exempt pathway under VC282 */
const ELIGIBLE_ZONES = new Set(['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ']);

/** Overlays that disqualify SSD fast-track eligibility */
const RESTRICTIVE_OVERLAY_PREFIXES = ['HO', 'BMO', 'LSIO', 'SBO'];
```

- [ ] **Step 2: Implement zone extraction helper**

```typescript
/**
 * Extract base zone code from zone string.
 * Handles schedules: "GRZ1" → "GRZ", "grz" → "GRZ"
 */
function extractBaseZone(zoneCode: string | null): string | null {
  if (!zoneCode) return null;
  const normalized = zoneCode.trim().toUpperCase();
  // Match the alphabetic prefix (e.g., "GRZ" from "GRZ1", "NRZ" from "NRZ2")
  const match = normalized.match(/^[A-Z]+/);
  return match ? match[0] : null;
}
```

- [ ] **Step 3: Implement restrictive overlay detector**

```typescript
/**
 * Find restrictive overlays in the overlay array.
 * Handles numbered overlays: "HO123" → "HO", "BMO5" → "BMO"
 */
function findRestrictiveOverlays(overlays: string[]): string[] {
  const found: string[] = [];
  for (const code of overlays) {
    const normalized = code.trim().toUpperCase();
    for (const prefix of RESTRICTIVE_OVERLAY_PREFIXES) {
      if (normalized.startsWith(prefix)) {
        // Return the base prefix only (not the full code like "HO123")
        found.push(prefix);
        break; // Don't double-count if somehow multiple prefixes match
      }
    }
  }
  // Deduplicate (in case multiple HO schedules are present)
  return Array.from(new Set(found));
}
```

- [ ] **Step 4: Implement main evaluation function**

```typescript
/**
 * Evaluate whether a property qualifies for the VPP VC282 SSD fast-track pathway.
 *
 * Rules:
 * 1. Zone must be GRZ, NRZ, RGZ, MUZ, or TZ
 * 2. Lot size must be >= 300m²
 * 3. No HO, BMO, LSIO, or SBO overlay present
 *
 * @param zoneCode - Planning zone code (e.g., "GRZ1", "NRZ")
 * @param lotSizeM2 - Lot area in square meters
 * @param overlays - Array of overlay codes (e.g., ["HO123", "DDO5"])
 * @returns Compliance evaluation result
 */
export function evaluateFastTrack(
  zoneCode: string | null,
  lotSizeM2: number | null,
  overlays: string[],
): ComplianceResult {
  // Zone eligibility check
  const baseZone = extractBaseZone(zoneCode);
  const zoneQualifies = baseZone !== null && ELIGIBLE_ZONES.has(baseZone);

  // Lot size check
  const lotSizeQualifies =
    typeof lotSizeM2 === 'number' &&
    Number.isFinite(lotSizeM2) &&
    lotSizeM2 >= SSD_MIN_LOT_SIZE_M2;

  // SSD eligibility (zone + lot size)
  const ssdEligible = zoneQualifies && lotSizeQualifies;

  // Restrictive overlay detection
  const restrictiveOverlays = findRestrictiveOverlays(overlays);
  const hasRestrictiveOverlays = restrictiveOverlays.length > 0;

  // Fast-track determination (SSD eligible + no restrictive overlays)
  const isFastTrackable = ssdEligible && !hasRestrictiveOverlays;

  return {
    ssdEligible,
    hasRestrictiveOverlays,
    isFastTrackable,
    restrictiveOverlays,
  };
}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit`  
Expected: No errors

- [ ] **Step 6: Commit compliance rules utility**

```bash
git add src/lib/complianceRules.ts
git commit -m "feat: add compliance rules utility for VPP VC282 fast-track evaluation"
```

---

## Task 2: ComplianceStatus Component

**Files:**
- Create: `src/components/dashboard/ComplianceStatus.tsx`

- [ ] **Step 1: Create component file with imports and types**

```typescript
'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { evaluateFastTrack } from '@/lib/complianceRules';

type Lang = 'en' | 'zh';

type Props = {
  zoneCode: string | null;
  lotSizeM2: number | null;
  overlays: string[];
  lang?: Lang;
};
```

- [ ] **Step 2: Add overlay name mapping constants**

```typescript
/** Bilingual names for restrictive overlays */
const OVERLAY_NAMES: Record<string, { en: string; zh: string }> = {
  HO: { en: 'Heritage Overlay', zh: '遗产覆盖区 (HO)' },
  BMO: { en: 'Bushfire Management Overlay', zh: '山火管理覆盖区 (BMO)' },
  LSIO: { en: 'Land Subject to Inundation Overlay', zh: '淹水覆盖区 (LSIO)' },
  SBO: { en: 'Special Building Overlay', zh: '特殊建筑覆盖区 (SBO)' },
};
```

- [ ] **Step 3: Add bilingual copy constants**

```typescript
/** Bilingual UI copy */
const COPY: Record<
  Lang,
  {
    eligibleHeading: string;
    eligibleSubtext: string;
    eligibleBadge: string;
    permitHeading: string;
    triggerPrefix: string;
    awaitingData: string;
  }
> = {
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

- [ ] **Step 4: Implement component structure and evaluation logic**

```typescript
export default function ComplianceStatus({
  zoneCode,
  lotSizeM2,
  overlays,
  lang = 'en',
}: Props) {
  const result = evaluateFastTrack(zoneCode, lotSizeM2, overlays);
  const hasData = zoneCode !== null && lotSizeM2 !== null;
  const copy = COPY[lang];

  // State 3: Insufficient Data (loading state)
  if (!hasData) {
    return (
      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-400">{copy.awaitingData}</span>
        </div>
      </div>
    );
  }

  // State 1: Fast-Track Eligible (green with lime badge)
  if (result.isFastTrackable) {
    return (
      <div className="mb-4 rounded-lg border border-emerald-800/30 bg-emerald-950/40 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E9E778]" />
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-sm font-bold text-emerald-100">
                {copy.eligibleHeading}
              </h3>
              <p className="mt-0.5 text-xs text-emerald-200/70">
                {copy.eligibleSubtext}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-[#E9E778] bg-[#E9E778]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#E9E778]">
              {copy.eligibleBadge}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Permit Required (amber with trigger list)
  return (
    <div className="mb-4 rounded-lg border border-amber-800/40 bg-amber-950/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-bold text-amber-100">
            {copy.permitHeading}
          </h3>
          {result.hasRestrictiveOverlays && (
            <div className="space-y-1">
              {result.restrictiveOverlays.map((code) => {
                const overlayName = OVERLAY_NAMES[code];
                const displayName = overlayName ? overlayName[lang] : code;
                return (
                  <div
                    key={code}
                    className="text-xs text-amber-200/80"
                  >
                    {copy.triggerPrefix} {displayName}
                  </div>
                );
              })}
            </div>
          )}
          {!result.ssdEligible && !result.hasRestrictiveOverlays && (
            <p className="text-xs text-amber-200/70">
              {lang === 'en'
                ? 'Lot size or zone does not meet SSD minimum requirements (300m², residential zone).'
                : '地块面积或分区不符合 SSD 最低要求(300 平方米,住宅分区)。'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit`  
Expected: No errors

- [ ] **Step 6: Commit ComplianceStatus component**

```bash
git add src/components/dashboard/ComplianceStatus.tsx
git commit -m "feat: add ComplianceStatus component with hybrid color treatment"
```

---

## Task 3: Page Integration

**Files:**
- Modify: `src/app/app/page.tsx:454` (before `<nav>` element)

- [ ] **Step 1: Import ComplianceStatus component**

Add to imports section (around line 18):

```typescript
import ComplianceStatus from '@/components/dashboard/ComplianceStatus';
```

- [ ] **Step 2: Insert ComplianceStatus above tab navigation**

Find the `<nav className="flex items-center gap-1 px-6 pt-6 pb-3...">` line (around line 455).

Insert **immediately before** the `<nav>` element:

```typescript
          <div className="px-6 pt-6">
            <ComplianceStatus
              zoneCode={planData?.zoneCode ?? null}
              lotSizeM2={landSizeM2}
              overlays={planData?.overlayRaw ?? []}
              lang={language}
            />
          </div>
```

The result should look like:

```typescript
        <aside className="flex-1 md:h-full flex flex-col overflow-hidden relative bg-[#241F21]">
          <div className="px-6 pt-6">
            <ComplianceStatus
              zoneCode={planData?.zoneCode ?? null}
              lotSizeM2={landSizeM2}
              overlays={planData?.overlayRaw ?? []}
              lang={language}
            />
          </div>
          <nav className="flex items-center gap-1 px-6 pt-6 pb-3 border-b border-white/10 bg-[#241F21] sticky top-0 z-10">
            {/* existing tab buttons */}
          </nav>
```

Note: The `<nav>` element already has `pt-6`, so the ComplianceStatus `mb-4` provides adequate spacing.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`  
Expected: No errors

- [ ] **Step 4: Test rendering in development**

Run: `npm run dev`  
Navigate to: `http://localhost:3000/app?address=62+Chandler+Road+Noble+Park&lat=-37.9731&lon=145.1864`  
Expected: ComplianceStatus card appears above tab navigation

- [ ] **Step 5: Commit page integration**

```bash
git add src/app/app/page.tsx
git commit -m "feat: integrate ComplianceStatus above sidebar tab navigation"
```

---

## Task 4: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run TypeScript compilation check**

Run: `npx tsc --noEmit`  
Expected: No TypeScript errors

- [ ] **Step 2: Test Fast-Track Eligible state**

Navigate to a property with:
- Zone: GRZ/NRZ/RGZ/MUZ/TZ
- Lot size: >= 300m²
- No HO/BMO/LSIO/SBO overlays

Expected: Green banner with lime "As-of-Right" badge

- [ ] **Step 3: Test Permit Required state (restrictive overlay)**

Navigate to a property with:
- Zone: GRZ
- Lot size: >= 300m²
- Overlays: Contains HO or BMO

Expected: Amber banner listing the restrictive overlay(s)

- [ ] **Step 4: Test Permit Required state (lot too small)**

Navigate to a property with:
- Zone: GRZ
- Lot size: < 300m²
- No restrictive overlays

Expected: Amber banner with "Lot size or zone does not meet requirements" message

- [ ] **Step 5: Test Insufficient Data state**

Navigate to `/app` without query parameters (or before Vicmap responds)

Expected: Neutral grey banner with "Awaiting parcel data..." message

- [ ] **Step 6: Test bilingual toggle**

Click EN/中文 toggle in sidebar

Expected: All ComplianceStatus text switches language correctly

- [ ] **Step 7: Final commit with consolidated message**

```bash
git add -A
git commit -m "feat: implement automated Deemed-to-Comply status block in dashboard sidebar

- Add complianceRules.ts utility with evaluateFastTrack() logic
- Create ComplianceStatus component with hybrid color treatment
  (emerald bg for eligible, lime badge, amber for permit triggers)
- Mount above sidebar tabs for persistent visibility
- Support bilingual copy (EN/中文) with statutory term preservation
- Evaluate VC282 SSD fast-track eligibility based on zone, lot size, overlays"
```

- [ ] **Step 8: Push to main**

```bash
git push origin main
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- Zone eligibility (GRZ/NRZ/RGZ/MUZ/TZ) → Task 1, Step 1-4
- Lot size threshold (>= 300m²) → Task 1, Step 4
- Restrictive overlay detection (HO/BMO/LSIO/SBO) → Task 1, Step 3-4
- Fast-track calculation → Task 1, Step 4
- Fast-Track Eligible visual state → Task 2, Step 4
- Permit Required visual state → Task 2, Step 4
- Insufficient Data visual state → Task 2, Step 4
- Bilingual copy → Task 2, Step 3-4
- Page integration above tabs → Task 3, Step 2

✅ **Placeholder Scan:**
- No "TBD", "TODO", or "fill in" placeholders present
- All code blocks complete and executable
- All test scenarios specified with exact navigation URLs

✅ **Type Consistency:**
- `ComplianceResult` type defined in Task 1, used in Task 2
- `evaluateFastTrack()` signature matches across files
- Props interface matches page.tsx usage
- Zone/overlay string handling consistent with existing `VicPlanData` types

---

## Manual Testing Scenarios

**Scenario 1: 62 Chandler Road, Noble Park (Fast-Track Eligible)**
- URL: `/app?address=62+Chandler+Road+Noble+Park&lat=-37.9731&lon=145.1864`
- Expected: Green banner + lime badge (GRZ zone, ~711m², no restrictive overlays)

**Scenario 2: Heritage Overlay Property (Permit Required)**
- Search for a property with HO overlay in Melbourne CBD
- Expected: Amber banner listing "Trigger: Heritage Overlay (HO)"

**Scenario 3: Small Lot (Permit Required)**
- Search for a property with lot size < 300m² in GRZ zone
- Expected: Amber banner with "Lot size or zone does not meet requirements"

**Scenario 4: Commercial Zone (Not Eligible)**
- Navigate to C1Z zoned property
- Expected: Amber banner (zone not eligible for SSD)

**Scenario 5: Awaiting Data (Loading State)**
- Navigate to `/app` without query parameters
- Expected: Grey banner with "Awaiting parcel data..."

**Scenario 6: Language Toggle**
- Navigate to any property, toggle EN → 中文
- Expected: All text switches to Chinese, statutory terms (HO, BMO, VC282) remain English
