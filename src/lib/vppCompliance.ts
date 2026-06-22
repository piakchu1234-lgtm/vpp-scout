/**
 * VPP Compliance Engine — Victorian Planning Provisions enforcement layer.
 *
 * Automates Minimum Garden Area validation (ResCode Clause 54.03-5 / 55.03-9)
 * and Clause 52.06 car parking deductions for multi-dwelling developments.
 *
 * This module bridges the gap between cadastral data (lot size, zone) and
 * construction-ready feasibility by automatically enforcing mandatory setbacks
 * that competitors like Landchecker leave to manual architect calculation.
 */

import { getGardenRequirement } from './feasibility';

export type GardenAreaStatus = 'compliant' | 'violation' | 'exempt' | 'unknown';

export type GardenAreaCheck = {
  status: GardenAreaStatus;
  /** Required garden area in m² (null if exempt or unknown). */
  requiredM2: number | null;
  /** Available garden area in m² after proposed development. */
  availableM2: number | null;
  /** Percentage of lot that must remain as garden (e.g., 0.25 = 25%). */
  requiredPercentage: number | null;
  /** User-facing bracket label (e.g., "501–650 m²"). */
  bracketLabel: string | null;
  /** Bilingual explanation. */
  message: {
    en: string;
    zh: string;
  };
};

export type DwellingCount = 1 | 2 | 3 | 4 | 5 | 6;

export type ParkingDeduction = {
  /** Number of dwellings proposed. */
  dwellingCount: DwellingCount;
  /** Required car spaces under Clause 52.06 (1 per 1-2 bed, 2 per 3+ bed). */
  requiredSpaces: number;
  /** Site area deducted for parking, driveways, and turnarounds (m²). */
  deductedM2: number;
  /** Bilingual explanation. */
  message: {
    en: string;
    zh: string;
  };
};

/**
 * Evaluate Minimum Garden Area compliance for a given lot and proposed footprint.
 *
 * @param lotSizeM2 - Total lot area in m²
 * @param existingCoverageM2 - Existing building + hardstand coverage in m²
 * @param proposedFootprintM2 - Proposed new building footprint in m²
 * @returns Garden area compliance check
 */
export function checkGardenArea(
  lotSizeM2: number,
  existingCoverageM2: number,
  proposedFootprintM2: number,
): GardenAreaCheck {
  if (!Number.isFinite(lotSizeM2) || lotSizeM2 <= 0) {
    return {
      status: 'unknown',
      requiredM2: null,
      availableM2: null,
      requiredPercentage: null,
      bracketLabel: null,
      message: {
        en: 'Lot size unavailable — garden area cannot be computed.',
        zh: '地块面积不可用 — 无法计算花园面积。',
      },
    };
  }

  const gardenReq = getGardenRequirement(lotSizeM2);

  // Lots under 400 m² are exempt from Minimum Garden Area requirements
  if (!gardenReq) {
    return {
      status: 'exempt',
      requiredM2: null,
      availableM2: null,
      requiredPercentage: null,
      bracketLabel: null,
      message: {
        en: `Lot under 400 m² — exempt from Minimum Garden Area requirement.`,
        zh: `地块小于 400 平方米 — 豁免花园面积要求。`,
      },
    };
  }

  const requiredM2 = lotSizeM2 * gardenReq.fraction;
  const totalCoverageM2 = existingCoverageM2 + proposedFootprintM2;
  const availableM2 = Math.max(0, lotSizeM2 - totalCoverageM2);

  const status: GardenAreaStatus = availableM2 >= requiredM2 ? 'compliant' : 'violation';
  const requiredPct = Math.round(gardenReq.fraction * 100);

  return {
    status,
    requiredM2,
    availableM2,
    requiredPercentage: gardenReq.fraction,
    bracketLabel: gardenReq.bracketLabel,
    message: {
      en:
        status === 'compliant'
          ? `Garden area compliant: ${availableM2.toFixed(1)} m² available vs ${requiredM2.toFixed(1)} m² required (${requiredPct}% of ${gardenReq.bracketLabel} lot).`
          : `VPP Violation: ${requiredPct}% garden area required (${requiredM2.toFixed(1)} m²), but only ${availableM2.toFixed(1)} m² remains. Reduce building footprint by ${(requiredM2 - availableM2).toFixed(1)} m².`,
      zh:
        status === 'compliant'
          ? `花园面积合规:可用 ${availableM2.toFixed(1)} 平方米,要求 ${requiredM2.toFixed(1)} 平方米(${gardenReq.bracketLabel} 地块的 ${requiredPct}%)。`
          : `VPP 违规:需保留 ${requiredPct}% 花园面积(${requiredM2.toFixed(1)} 平方米),但仅剩 ${availableM2.toFixed(1)} 平方米。需减少建筑面积 ${(requiredM2 - availableM2).toFixed(1)} 平方米。`,
    },
  };
}

/**
 * Calculate parking deduction under Clause 52.06 for multi-dwelling development.
 *
 * Victorian standard car parking requirement:
 * - 1-2 bedroom dwelling: 1 car space
 * - 3+ bedroom dwelling: 2 car spaces
 *
 * Site area allocation per space (including circulation and turnaround):
 * - Single garage: 20 m² (3.0 m × 6.0 m + access)
 * - Double garage: 40 m² (6.0 m × 6.0 m + access)
 * - Shared driveway turnaround: +10 m² per additional dwelling
 *
 * @param dwellingCount - Number of proposed dwellings (1-6)
 * @param bedroomsPerDwelling - Average bedrooms per dwelling (default: 3)
 * @returns Parking deduction calculation
 */
export function calculateParkingDeduction(
  dwellingCount: DwellingCount,
  bedroomsPerDwelling: number = 3,
): ParkingDeduction {
  // Clause 52.06 parking rates
  const spacesPerDwelling = bedroomsPerDwelling >= 3 ? 2 : 1;
  const requiredSpaces = dwellingCount * spacesPerDwelling;

  // Site area allocation (m²)
  // Assumption: Each space requires 20 m² (single garage) or 40 m² (double garage)
  // Plus shared driveway circulation: 10 m² per additional dwelling
  const garageAreaM2 = spacesPerDwelling === 2 ? 40 : 20;
  const totalGarageM2 = garageAreaM2 * dwellingCount;
  const sharedCirculationM2 = Math.max(0, (dwellingCount - 1) * 10);
  const deductedM2 = totalGarageM2 + sharedCirculationM2;

  return {
    dwellingCount,
    requiredSpaces,
    deductedM2,
    message: {
      en: `Clause 52.06: ${dwellingCount} ${dwellingCount === 1 ? 'dwelling' : 'dwellings'} × ${spacesPerDwelling} ${spacesPerDwelling === 1 ? 'space' : 'spaces'} = ${requiredSpaces} car ${requiredSpaces === 1 ? 'space' : 'spaces'}. Deducted ${deductedM2.toFixed(0)} m² for garages and driveways.`,
      zh: `Clause 52.06:${dwellingCount} 套住宅 × ${spacesPerDwelling} 个车位 = ${requiredSpaces} 个车位。扣除 ${deductedM2.toFixed(0)} 平方米用于车库和车道。`,
    },
  };
}

/**
 * Calculate realistic buildable area after parking deduction.
 *
 * @param grossLotSizeM2 - Total lot area
 * @param dwellingCount - Number of proposed dwellings
 * @param bedroomsPerDwelling - Average bedrooms per dwelling
 * @returns Net buildable area after parking deduction
 */
export function calculateNetBuildableArea(
  grossLotSizeM2: number,
  dwellingCount: DwellingCount,
  bedroomsPerDwelling: number = 3,
): {
  grossLotSizeM2: number;
  parkingDeductedM2: number;
  netBuildableM2: number;
  parking: ParkingDeduction;
} {
  const parking = calculateParkingDeduction(dwellingCount, bedroomsPerDwelling);

  return {
    grossLotSizeM2,
    parkingDeductedM2: parking.deductedM2,
    netBuildableM2: Math.max(0, grossLotSizeM2 - parking.deductedM2),
    parking,
  };
}

/**
 * Calculate maximum permissible building footprint under garden area constraints.
 *
 * @param lotSizeM2 - Total lot area
 * @param existingCoverageM2 - Existing building + hardstand coverage
 * @returns Maximum new footprint allowed under ResCode garden area rules
 */
export function calculateMaxBuildingFootprint(
  lotSizeM2: number,
  existingCoverageM2: number,
): {
  maxNewFootprintM2: number;
  requiredGardenM2: number | null;
  requiredPercentage: number | null;
  isExempt: boolean;
} {
  const gardenReq = getGardenRequirement(lotSizeM2);

  if (!gardenReq) {
    // Exempt — assume 60% site coverage cap (ResCode Standard A5)
    const maxTotalCoverage = lotSizeM2 * 0.6;
    return {
      maxNewFootprintM2: Math.max(0, maxTotalCoverage - existingCoverageM2),
      requiredGardenM2: null,
      requiredPercentage: null,
      isExempt: true,
    };
  }

  const requiredGardenM2 = lotSizeM2 * gardenReq.fraction;
  const maxTotalCoverage = lotSizeM2 - requiredGardenM2;
  const maxNewFootprintM2 = Math.max(0, maxTotalCoverage - existingCoverageM2);

  return {
    maxNewFootprintM2,
    requiredGardenM2,
    requiredPercentage: gardenReq.fraction,
    isExempt: false,
  };
}
