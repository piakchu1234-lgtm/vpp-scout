/**
 * Automated Clause 55 Feasibility Yield engine.
 *
 * Indicative-only — every figure surfaced here is a planner-side
 * sanity check, not a substitute for a ResCode (Clause 55) /
 * Clause 54 assessment. Statutory citations follow the VPP as
 * current at the 2026 reforms (post-VC282).
 *
 * Three scenarios are computed:
 *
 *   A) Single replacement luxury house — Clause 54.03-3 / Standard A5
 *      caps site coverage at 60%. Indicative buildable GFA = coverage
 *      × storeys.
 *
 *   B) Multi-dwelling townhouse yield — non-statutory rule-of-thumb
 *      divisors (220 m² / dwelling for GRZ, 300 m² for NRZ) labelled
 *      clearly as indicative. C1Z is *commercial* (Clause 34.01) and
 *      receives a qualitative mixed-use flag, not a dwelling count.
 *
 *   C) Mandatory garden area — per the Schedule to Clauses 32.08
 *      (GRZ) and 32.09 (NRZ), introduced by VC110 and refined since.
 *      Lots under 400 m² are exempt; thresholds step up at 400, 500,
 *      and 650 m².
 */

export type YieldZoneCode = 'GRZ' | 'GRZ1' | 'NRZ' | 'RGZ' | 'C1Z' | string;

export type LuxurySingleScenario = {
  /** Clause 54.03-3 / Standard A5 site-coverage cap (decimal). */
  siteCoverageCap: number;
  /** Indicative storeys assumed for the GFA estimate. */
  storeysAssumed: number;
  /** Indicative max GFA in m² = lotSize × coverage × storeys. */
  maxBuildableGfaM2: number;
  /** Indicative ground-floor footprint in m². */
  groundFootprintM2: number;
  citation: string;
};

export type TownhouseScenario = {
  /** Number of dwellings the lot can yield under the indicative divisor. */
  dwellings: number;
  /** Average dwelling GFA in m² (per the rule-of-thumb input). */
  averageDwellingGfaM2: number;
  /** Divisor used (m² of lot per dwelling). */
  divisorM2PerDwelling: number;
  /** Total indicative footprint (dwellings × avg GFA / 2 storeys). */
  totalFootprintM2: number;
  citation: string;
  /** True when zone is C1Z — qualitative mixed-use indicator only. */
  mixedUseFlag: boolean;
  mixedUseNote?: string;
};

export type GardenAreaScenario = {
  /** Percentage of lot area required as garden area (decimal). */
  requiredFraction: number;
  /** Required garden area in m² (rounded to nearest m²). */
  requiredAreaM2: number;
  /** True when the lot is exempt (< 400 m² for residential zones). */
  exempt: boolean;
  /** True when zone is not subject to garden area (e.g. C1Z). */
  notApplicable: boolean;
  citation: string;
};

export type YieldScenarios = {
  lotSize: number;
  zoneCode: YieldZoneCode;
  isResidential: boolean;
  luxurySingle: LuxurySingleScenario;
  townhouse: TownhouseScenario;
  gardenArea: GardenAreaScenario;
};

const STANDARD_A5_COVERAGE_CAP = 0.60;
const STANDARD_B8_COVERAGE_CAP = 0.60;
const SINGLE_STOREYS = 2;
const TOWNHOUSE_STOREYS = 2;

/**
 * Garden-area requirement per the Schedule to Clauses 32.08 / 32.09
 * (introduced by VC110, current under the 2026 reforms). Lots under
 * 400 m² have no minimum; the requirement steps up at 400, 500, and
 * 650 m².
 */
function gardenAreaFraction(lotSize: number): { fraction: number; exempt: boolean } {
  if (lotSize < 400) return { fraction: 0, exempt: true };
  if (lotSize <= 500) return { fraction: 0.25, exempt: false };
  if (lotSize <= 650) return { fraction: 0.30, exempt: false };
  return { fraction: 0.35, exempt: false };
}

function isResidentialZone(zoneCode: YieldZoneCode): boolean {
  const z = zoneCode.toUpperCase();
  return (
    z === 'GRZ' ||
    z.startsWith('GRZ') ||
    z === 'NRZ' ||
    z.startsWith('NRZ') ||
    z === 'RGZ' ||
    z.startsWith('RGZ') ||
    z === 'HCTZ' ||
    z.startsWith('HCTZ')
  );
}

function townhouseDivisorFor(zoneCode: YieldZoneCode): {
  divisor: number;
  avgGfa: number;
} | null {
  const z = zoneCode.toUpperCase();
  if (z === 'GRZ' || z.startsWith('GRZ')) {
    return { divisor: 220, avgGfa: 165 };
  }
  if (z === 'NRZ' || z.startsWith('NRZ')) {
    return { divisor: 300, avgGfa: 180 };
  }
  if (z === 'RGZ' || z.startsWith('RGZ')) {
    return { divisor: 200, avgGfa: 160 };
  }
  return null;
}

export function computeYieldScenarios(
  lotSize: number,
  zoneCode: YieldZoneCode,
): YieldScenarios {
  const z = (zoneCode || '').toUpperCase();
  const isC1Z = z === 'C1Z' || z.startsWith('C1Z');
  const residential = isResidentialZone(zoneCode);

  const luxuryFootprint = Math.round(lotSize * STANDARD_A5_COVERAGE_CAP);
  const luxurySingle: LuxurySingleScenario = {
    siteCoverageCap: STANDARD_A5_COVERAGE_CAP,
    storeysAssumed: SINGLE_STOREYS,
    maxBuildableGfaM2: luxuryFootprint * SINGLE_STOREYS,
    groundFootprintM2: luxuryFootprint,
    citation:
      'Indicative cap — Clause 54.03-3 / Standard A5 (60% site coverage). Setbacks, overlooking and overshadowing standards apply separately.',
  };

  let townhouse: TownhouseScenario;
  if (isC1Z) {
    townhouse = {
      dwellings: 0,
      averageDwellingGfaM2: 0,
      divisorM2PerDwelling: 0,
      totalFootprintM2: 0,
      mixedUseFlag: true,
      mixedUseNote:
        'Mixed-Use High-Yield Development Potential — refer Clause 34.01 and any applicable DDO / ACZ schedule. Yield is governed by height controls, plot ratio and local policy rather than a residential divisor.',
      citation: 'Clause 34.01 — Commercial 1 Zone',
    };
  } else {
    const div = townhouseDivisorFor(zoneCode);
    if (div) {
      const dwellings = Math.max(0, Math.floor(lotSize / div.divisor));
      townhouse = {
        dwellings,
        averageDwellingGfaM2: div.avgGfa,
        divisorM2PerDwelling: div.divisor,
        totalFootprintM2: Math.round((dwellings * div.avgGfa) / TOWNHOUSE_STOREYS),
        mixedUseFlag: false,
        citation:
          'Indicative yield — subject to ResCode (Clause 55) assessment, including setbacks, private open space (Standard B28) and overlooking (Standard B22). Site-coverage cap 60% under Standard B8 / Clause 55.03-3.',
      };
    } else {
      townhouse = {
        dwellings: 0,
        averageDwellingGfaM2: 0,
        divisorM2PerDwelling: 0,
        totalFootprintM2: 0,
        mixedUseFlag: false,
        citation:
          'Indicative yield unavailable for this zone — consult the relevant zone provisions in the planning scheme.',
      };
    }
  }

  let gardenArea: GardenAreaScenario;
  if (!residential || isC1Z) {
    gardenArea = {
      requiredFraction: 0,
      requiredAreaM2: 0,
      exempt: false,
      notApplicable: true,
      citation:
        'Mandatory garden area does not apply — Schedule to Clauses 32.08 / 32.09 covers GRZ / NRZ residential zones only.',
    };
  } else {
    const { fraction, exempt } = gardenAreaFraction(lotSize);
    gardenArea = {
      requiredFraction: fraction,
      requiredAreaM2: Math.round(lotSize * fraction),
      exempt,
      notApplicable: false,
      citation: exempt
        ? 'Lot under 400 m² — Schedule to Clauses 32.08 / 32.09 minimum garden area does not apply.'
        : 'Mandatory garden area — Schedule to Clauses 32.08 (GRZ) / 32.09 (NRZ). Bands: 400–500 m² = 25%; 501–650 m² = 30%; >650 m² = 35%.',
    };
  }

  return {
    lotSize,
    zoneCode,
    isResidential: residential,
    luxurySingle,
    townhouse,
    gardenArea,
  };
}
