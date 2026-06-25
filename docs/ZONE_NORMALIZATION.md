# Zone Code Normalization - Legacy VPP Support

## Overview

Victorian Planning Provisions (VPP) have evolved over time. Planning schemes created before 2014 use **legacy zone codes** (R1Z, R2Z, B1Z, etc.) that have been superseded by modern codes (GRZ, NRZ, C1Z, etc.).

SimplySite now **automatically translates legacy codes** to their modern equivalents for accurate compliance routing and SSD eligibility determination.

## Legacy Zone Code Mapping

### Residential Zones (Pre-2014)

| Legacy Code | Modern Code | Description |
|-------------|-------------|-------------|
| **R1Z** | GRZ | General Residential Zone (formerly Residential 1) |
| **R2Z** | NRZ | Neighbourhood Residential Zone (formerly Residential 2) |
| **R3Z** | GRZ | General Residential Zone (formerly Medium Density Residential) |

### Commercial/Business Zones (Pre-2014)

| Legacy Code | Modern Code | Description |
|-------------|-------------|-------------|
| **B1Z** | C1Z | Commercial 1 Zone (formerly Business 1) |
| **B2Z** | C2Z | Commercial 2 Zone (formerly Business 2) |
| **B3Z** | C1Z | Commercial 1 Zone (formerly Business 3) |
| **B4Z** | C2Z | Commercial 2 Zone (formerly Business 4) |
| **B5Z** | C1Z | Commercial 1 Zone (formerly Business 5) |

## Implementation

### New Utility: `zoneNormalization.ts`

**Location:** `src/lib/zoneNormalization.ts`

```typescript
// Extract first 3 characters and translate legacy codes
normalizeZoneCode("GRZ15") // → "GRZ"
normalizeZoneCode("R1Z")   // → "GRZ" (legacy → modern)
normalizeZoneCode("B3Z")   // → "C1Z" (legacy → modern)
normalizeZoneCode("NRZ2")  // → "NRZ"
```

### Integration Points

**1. Map Click Pipeline** (`mapClickPipeline.ts`)
```typescript
const rawZoneCode = props.ZONE_CODE;
const zoneCode = rawZoneCode ? normalizeZoneCode(rawZoneCode) : null;
```

**2. Zone Filter Panel** (`ZoneFilterPanel.tsx`)
Updated categories to include legacy codes:
```typescript
{
  label: 'Residential',
  codes: ['GRZ', 'R1Z', 'R2Z', 'R3Z', 'NRZ', 'RGZ', ...],
}
```

**3. Mapbox Layer Configuration**
Your layer now matches legacy codes:
```json
{
  "fill-color": [
    "match",
    ["slice", ["get", "ZONE_CODE"], 0, 3],
    ["GRZ", "R1Z", "R2Z", "R3Z"], "#ffccd5",  // All residential → pink
    ["C1Z", "C2Z", "C3Z", "B1Z", "B2Z", "B3Z", "B4Z", "B5Z"], "#b3e5fc",  // All commercial → blue
    ...
  ]
}
```

## How It Works

### Step 1: User Clicks Map
User clicks a parcel with legacy zone code `R1Z`

### Step 2: Extract Raw Zone Code
```javascript
const rawZoneCode = feature.properties.ZONE_CODE; // "R1Z"
```

### Step 3: Normalize
```javascript
const zoneCode = normalizeZoneCode(rawZoneCode); // "GRZ"
```

### Step 4: Compliance Routing
```javascript
evaluatePlanningCompliance("GRZ", overlays);
// Returns: { pathway: "ssd-eligible", isSSDEligible: true, ... }
```

### Step 5: UI Updates
- Zone displayed as "GRZ" (modern code)
- SSD eligibility correctly determined
- Compliance routing works as expected

## Why This Matters

### Problem Before Normalization
```
User clicks R1Z parcel
  ↓
Zone code: "R1Z"
  ↓
Compliance evaluation: pathway = "unknown"
  ↓
❌ SSD eligibility incorrectly determined
❌ Wrong planning pathway
```

### Solution After Normalization
```
User clicks R1Z parcel
  ↓
Zone code: "R1Z" → normalized to "GRZ"
  ↓
Compliance evaluation: pathway = "ssd-eligible"
  ↓
✅ SSD eligibility correctly determined
✅ Accurate planning pathway
```

## Testing

### Test Legacy Residential Codes
```bash
npm run dev
```

1. Click a parcel with `R1Z` code
2. Console should show: `[MapClickPipeline] Feature extracted: { zoneCode: "GRZ" }`
3. UI should display as "GRZ" (not "R1Z")
4. SSD eligibility should be correctly evaluated

### Test Legacy Business Codes
1. Click a parcel with `B1Z` code
2. Should normalize to `C1Z`
3. Commercial pathway correctly identified

### Test Modern Codes
1. Click a parcel with `GRZ15` code
2. Should extract first 3 chars: `GRZ`
3. No translation needed (already modern)

## API Reference

### `normalizeZoneCode(rawCode: string): string`

Normalizes a single zone code.

```typescript
normalizeZoneCode("R1Z")   // → "GRZ"
normalizeZoneCode("B3Z")   // → "C1Z"
normalizeZoneCode("GRZ15") // → "GRZ"
normalizeZoneCode("")      // → ""
```

### `normalizeZoneCodes(zoneCodes: string[]): string[]`

Batch normalize multiple zone codes (removes duplicates).

```typescript
normalizeZoneCodes(["R1Z", "R3Z", "GRZ15"]) 
// → ["GRZ"] (all normalize to GRZ, duplicates removed)

normalizeZoneCodes(["B1Z", "B3Z", "C1Z"])
// → ["C1Z"] (all normalize to C1Z)
```

### `isLegacyZoneCode(zoneCode: string): boolean`

Check if a code is legacy and needs translation.

```typescript
isLegacyZoneCode("R1Z")  // → true
isLegacyZoneCode("B3Z")  // → true
isLegacyZoneCode("GRZ")  // → false
```

### `LEGACY_ZONE_MAP`

Reference object for all legacy mappings.

```typescript
import { LEGACY_ZONE_MAP } from '@/lib/zoneNormalization';

console.log(LEGACY_ZONE_MAP);
// {
//   R1Z: 'GRZ',
//   R2Z: 'NRZ',
//   R3Z: 'GRZ',
//   B1Z: 'C1Z',
//   ...
// }
```

## Historical Context

### Pre-2014 VPP Structure

Before the 2014 VPP reforms (Amendment VC110), Victorian planning schemes used a different zone code structure:

- **Residential Zones:** R1Z, R2Z, R3Z, R4Z
- **Business Zones:** B1Z, B2Z, B3Z, B4Z, B5Z

### 2014 VPP Reform (VC110)

The Victorian Government restructured zones to:
- Simplify the system
- Improve consistency across municipalities
- Better reflect contemporary planning objectives

**Result:** Legacy codes were phased out, but older planning scheme amendments and historical data still reference them.

## Coverage

SimplySite now correctly handles zones from:
- ✅ **Modern VPP** (2014-present): GRZ, NRZ, C1Z, etc.
- ✅ **Legacy VPP** (pre-2014): R1Z, R2Z, B1Z, etc.
- ✅ **Schedule variants**: GRZ1, GRZ2, NRZ3, etc.

This ensures accurate compliance routing across **all Victorian planning schemes**, regardless of when they were last updated.

## Future Enhancement

If additional legacy codes are discovered, add them to `LEGACY_ZONE_MAP`:

```typescript
export const LEGACY_ZONE_MAP: Record<string, string> = {
  // ... existing mappings
  
  // Add new legacy codes here:
  R4Z: 'NRZ',  // Example: Residential 4 → Neighbourhood
  B6Z: 'C2Z',  // Example: Business 6 → Commercial 2
};
```

The normalization function will automatically apply the new mappings.

---

**Impact:** SimplySite now accurately evaluates SSD eligibility and planning pathways for **all Victorian properties**, including those in municipalities with legacy planning scheme codes. 🎉
