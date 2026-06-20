/**
 * SSD Feasibility Calculator
 *
 * Implements Victorian Planning Provisions (VPP) Small Second Dwelling eligibility logic.
 * Based on ResCode standards (Clause 55) and General Residential Zone provisions.
 *
 * Key References:
 * - ResCode Standard 55.03-5: Site coverage
 * - ResCode Standard 55.03-8: Permeability and landscaping
 * - ResCode Standard 55.07-1: Private open space and landscaped area
 * - VPP Clause 32.08: General Residential Zone
 */

export type ZoneCode = 'GRZ' | 'NRZ' | 'RGZ' | 'MUZ' | 'TZ' | 'OTHER';

export interface SSDCalculatorInput {
  /** Total lot area in square meters */
  totalLotArea: number;

  /** Planning zone code (e.g., GRZ1, NRZ2) */
  zoningCode: string;

  /** Existing building footprint in square meters (if known) */
  existingFootprint?: number;

  /** Effective buildable area after easements, setbacks (if known) */
  effectiveLandSize?: number;

  /** Planning overlays that may restrict development */
  overlays?: string[];
}

export interface SSDFeasibilityResult {
  /** Whether the site is eligible for SSD under VPP */
  isEligible: boolean;

  /** Maximum allowable SSD footprint in sqm (capped at 60sqm per VPP) */
  maxSsdSize: number;

  /** Minimum required garden area in sqm per ResCode */
  requiredGardenArea: number;

  /** Current site coverage percentage (if existing footprint known) */
  currentSiteCoverage?: number;

  /** Maximum allowable site coverage percentage for this zone */
  maxSiteCoverage: number;

  /** Minimum required permeable area percentage for this zone */
  minPermeability: number;

  /** Detailed eligibility flags and warnings */
  flags: string[];

  /** Breakdown of calculation for transparency */
  calculation: {
    /** Lot size eligibility (must be ≥300sqm) */
    meetsMinimumLotSize: boolean;

    /** Zone eligibility (must be residential zone) */
    meetsZoneRequirement: boolean;

    /** No restrictive overlays present */
    meetsOverlayRequirement: boolean;

    /** Sufficient garden area available */
    meetsSufficientGarden: boolean;

    /** Site coverage within limits */
    meetsSiteCoverageLimit: boolean;
  };
}

/**
 * ResCode Standards per Clause 55
 */
const RESCODE_STANDARDS = {
  /** Maximum site coverage as fraction of lot area */
  MAX_SITE_COVERAGE: 0.6, // 60%

  /** Minimum permeable area as fraction of lot area */
  MIN_PERMEABILITY: 0.2, // 20%

  /** VPP Small Second Dwelling maximum footprint */
  SSD_MAX_FOOTPRINT: 60, // sqm

  /** Minimum lot size for SSD eligibility */
  SSD_MIN_LOT_SIZE: 300, // sqm

  /** Garden area thresholds per ResCode 55.07-1 */
  GARDEN_AREA: {
    /** Lots under 400sqm require 25% garden area */
    SMALL_LOT_THRESHOLD: 400,
    SMALL_LOT_PERCENTAGE: 0.25,

    /** Lots 400sqm+ require 35% garden area */
    LARGE_LOT_PERCENTAGE: 0.35,
  },
};

/**
 * Restrictive overlays that typically prohibit SSD development
 */
const RESTRICTIVE_OVERLAYS = [
  'HO', // Heritage Overlay
  'BMO', // Bushfire Management Overlay
  'LSIO', // Land Subject to Inundation Overlay
  'SBO', // Salinity Management Overlay
  'BFO', // Biosite Overlay
  'VPO', // Vegetation Protection Overlay
];

/**
 * Eligible residential zones for SSD
 */
const ELIGIBLE_ZONES: ZoneCode[] = ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'];

/**
 * Normalize zone code to standard format
 */
function normalizeZoneCode(zoneCode: string): ZoneCode {
  const normalized = zoneCode.toUpperCase().replace(/\d+/g, ''); // Remove numbers (e.g., GRZ1 → GRZ)

  if (normalized.startsWith('GRZ')) return 'GRZ';
  if (normalized.startsWith('NRZ')) return 'NRZ';
  if (normalized.startsWith('RGZ')) return 'RGZ';
  if (normalized.startsWith('MUZ')) return 'MUZ';
  if (normalized.startsWith('TZ')) return 'TZ';

  return 'OTHER';
}

/**
 * Check if any restrictive overlays are present
 */
function hasRestrictiveOverlays(overlays?: string[]): boolean {
  if (!overlays || overlays.length === 0) return false;

  return overlays.some((overlay) =>
    RESTRICTIVE_OVERLAYS.some((restrictive) =>
      overlay.toUpperCase().startsWith(restrictive)
    )
  );
}

/**
 * Calculate required garden area based on lot size per ResCode 55.07-1
 */
function calculateRequiredGardenArea(lotSize: number): number {
  if (lotSize < RESCODE_STANDARDS.GARDEN_AREA.SMALL_LOT_THRESHOLD) {
    return lotSize * RESCODE_STANDARDS.GARDEN_AREA.SMALL_LOT_PERCENTAGE;
  }
  return lotSize * RESCODE_STANDARDS.GARDEN_AREA.LARGE_LOT_PERCENTAGE;
}

/**
 * Calculate SSD feasibility based on Victorian Planning Provisions
 *
 * @param input Site geometry and zoning data
 * @returns Detailed feasibility analysis with eligibility status
 */
export function calculateSSDFeasibility(
  input: SSDCalculatorInput
): SSDFeasibilityResult {
  const flags: string[] = [];
  const zone = normalizeZoneCode(input.zoningCode);

  // ============================================================================
  // ELIGIBILITY CHECKS
  // ============================================================================

  // Check 1: Minimum lot size (300sqm)
  const meetsMinimumLotSize = input.totalLotArea >= RESCODE_STANDARDS.SSD_MIN_LOT_SIZE;
  if (!meetsMinimumLotSize) {
    flags.push(
      `Lot size ${Math.round(input.totalLotArea)}m² below 300m² minimum requirement`
    );
  }

  // Check 2: Zone eligibility
  const meetsZoneRequirement = ELIGIBLE_ZONES.includes(zone);
  if (!meetsZoneRequirement) {
    flags.push(`Zone ${input.zoningCode} not eligible for SSD (requires GRZ/NRZ/RGZ/MUZ/TZ)`);
  }

  // Check 3: Restrictive overlays
  const meetsOverlayRequirement = !hasRestrictiveOverlays(input.overlays);
  if (!meetsOverlayRequirement) {
    const restrictive = input.overlays?.filter((o) =>
      RESTRICTIVE_OVERLAYS.some((r) => o.toUpperCase().startsWith(r))
    );
    flags.push(`Restrictive overlay(s) present: ${restrictive?.join(', ')}`);
  }

  // ============================================================================
  // GARDEN AREA & SITE COVERAGE CALCULATIONS
  // ============================================================================

  const requiredGardenArea = calculateRequiredGardenArea(input.totalLotArea);
  const maxSiteCoverage = RESCODE_STANDARDS.MAX_SITE_COVERAGE;
  const minPermeability = RESCODE_STANDARDS.MIN_PERMEABILITY;

  // Maximum buildable area under 60% site coverage rule
  const maxBuildableArea = input.totalLotArea * maxSiteCoverage;

  // Available footprint for SSD after existing building (if known)
  let availableFootprintForSSD = maxBuildableArea;
  let currentSiteCoverage: number | undefined;

  if (input.existingFootprint && input.existingFootprint > 0) {
    currentSiteCoverage = input.existingFootprint / input.totalLotArea;
    availableFootprintForSSD = Math.max(0, maxBuildableArea - input.existingFootprint);

    if (currentSiteCoverage >= maxSiteCoverage) {
      flags.push(
        `Existing building already at ${Math.round(currentSiteCoverage * 100)}% site coverage (max ${Math.round(maxSiteCoverage * 100)}%)`
      );
    }
  }

  // Check 4: Sufficient garden area available
  const availableGardenArea = input.totalLotArea - (input.existingFootprint || 0);
  const meetsSufficientGarden = availableGardenArea >= requiredGardenArea;

  if (!meetsSufficientGarden) {
    flags.push(
      `Insufficient garden area: ${Math.round(availableGardenArea)}m² available, ${Math.round(requiredGardenArea)}m² required`
    );
  }

  // Check 5: Site coverage within limits
  const meetsSiteCoverageLimit = availableFootprintForSSD > 0;

  if (!meetsSiteCoverageLimit) {
    flags.push('No additional building footprint available under 60% site coverage limit');
  }

  // ============================================================================
  // CALCULATE MAXIMUM SSD SIZE
  // ============================================================================

  // Maximum SSD size is the LESSER of:
  // 1. VPP cap: 60sqm
  // 2. Available footprint under 60% site coverage
  // 3. Area that maintains required garden area

  const maxSsdByVPP = RESCODE_STANDARDS.SSD_MAX_FOOTPRINT;
  const maxSsdBySiteCoverage = availableFootprintForSSD;
  const maxSsdByGardenArea = Math.max(
    0,
    input.totalLotArea - requiredGardenArea - (input.existingFootprint || 0)
  );

  const maxSsdSize = Math.min(maxSsdByVPP, maxSsdBySiteCoverage, maxSsdByGardenArea);

  // ============================================================================
  // FINAL ELIGIBILITY DETERMINATION
  // ============================================================================

  const isEligible =
    meetsMinimumLotSize &&
    meetsZoneRequirement &&
    meetsOverlayRequirement &&
    meetsSufficientGarden &&
    meetsSiteCoverageLimit &&
    maxSsdSize > 0;

  // Add positive flags if eligible
  if (isEligible) {
    flags.unshift(`✓ Eligible for SSD up to ${Math.round(maxSsdSize)}m²`);

    if (maxSsdSize >= maxSsdByVPP) {
      flags.push(`Maximum VPP size (60m²) achievable`);
    } else {
      flags.push(
        `SSD size limited to ${Math.round(maxSsdSize)}m² by ${
          maxSsdSize === maxSsdBySiteCoverage ? 'site coverage' : 'garden area requirements'
        }`
      );
    }
  }

  return {
    isEligible,
    maxSsdSize: Math.round(maxSsdSize),
    requiredGardenArea: Math.round(requiredGardenArea),
    currentSiteCoverage,
    maxSiteCoverage,
    minPermeability,
    flags,
    calculation: {
      meetsMinimumLotSize,
      meetsZoneRequirement,
      meetsOverlayRequirement,
      meetsSufficientGarden,
      meetsSiteCoverageLimit,
    },
  };
}
