/**
 * Development Parameters Calculator
 *
 * Calculates basic Victorian ResCode metrics for display in the Development tab.
 * Based on zone code and lot size, returns statutory limits for:
 * - Maximum Building Height
 * - Mandatory Garden Area
 * - Site Coverage
 * - Permeability
 * - Setbacks
 */

export type DevelopmentParameters = {
  maxBuildingHeight: string | null; // e.g., "11.0m" or "Two storeys"
  mandatoryGardenArea: string | null; // e.g., "35%" or "Not applicable"
  siteCoverage: string | null; // e.g., "60%" or "65%"
  permeability: string | null; // e.g., "20%"
  frontSetback: string | null; // e.g., "6.0m" or "As per Rescode"
  sideRearSetback: string | null; // e.g., "1.0m minimum"
  floorSpaceRatio: string | null; // For commercial zones only
};

/**
 * Calculate development parameters based on zone code
 */
export function calculateDevelopmentParameters(
  zoneCode: string | null,
  lotSizeM2: number | null
): DevelopmentParameters {
  if (!zoneCode) {
    return {
      maxBuildingHeight: null,
      mandatoryGardenArea: null,
      siteCoverage: null,
      permeability: null,
      frontSetback: null,
      sideRearSetback: null,
      floorSpaceRatio: null,
    };
  }

  // Extract first 3 characters for zone type (GRZ, NRZ, C1Z, etc.)
  const zoneType = zoneCode.slice(0, 3).toUpperCase();

  // Residential Zones (GRZ, NRZ, RGZ, MUZ)
  if (['GRZ', 'NRZ', 'RGZ', 'MUZ'].includes(zoneType)) {
    return {
      maxBuildingHeight: zoneType === 'GRZ' ? '11.0m' : '9.0m',
      mandatoryGardenArea: calculateGardenArea(lotSizeM2),
      siteCoverage: zoneType === 'GRZ' ? '65%' : '60%',
      permeability: '20%',
      frontSetback: '6.0m',
      sideRearSetback: '1.0m minimum',
      floorSpaceRatio: null,
    };
  }

  // Commercial Zones (C1Z, C2Z, CCZ)
  if (['C1Z', 'C2Z', 'CCZ'].includes(zoneType)) {
    return {
      maxBuildingHeight: 'As per schedule',
      mandatoryGardenArea: 'Not applicable',
      siteCoverage: 'As per schedule',
      permeability: 'Not applicable',
      frontSetback: 'As per schedule',
      sideRearSetback: 'As per schedule',
      floorSpaceRatio: calculateFSR(zoneType),
    };
  }

  // Industrial Zones (IN1Z, IN2Z, IN3Z)
  if (['IN1', 'IN2', 'IN3'].includes(zoneType)) {
    return {
      maxBuildingHeight: 'As per schedule',
      mandatoryGardenArea: 'Not applicable',
      siteCoverage: '80%',
      permeability: '10%',
      frontSetback: '3.0m',
      sideRearSetback: 'As per schedule',
      floorSpaceRatio: null,
    };
  }

  // Low Density Residential Zone (LDRZ)
  if (zoneType === 'LDR') {
    return {
      maxBuildingHeight: '9.0m',
      mandatoryGardenArea: '35%',
      siteCoverage: '50%',
      permeability: '30%',
      frontSetback: '9.0m',
      sideRearSetback: '2.0m minimum',
      floorSpaceRatio: null,
    };
  }

  // Default fallback
  return {
    maxBuildingHeight: 'As per schedule',
    mandatoryGardenArea: 'As per schedule',
    siteCoverage: 'As per schedule',
    permeability: 'As per schedule',
    frontSetback: 'As per schedule',
    sideRearSetback: 'As per schedule',
    floorSpaceRatio: null,
  };
}

/**
 * Calculate mandatory garden area based on lot size (Clause 55.05)
 */
function calculateGardenArea(lotSizeM2: number | null): string {
  if (!lotSizeM2 || lotSizeM2 <= 0) return '—';

  if (lotSizeM2 < 300) return '20%';
  if (lotSizeM2 < 400) return '25%';
  if (lotSizeM2 < 500) return '30%';
  return '35%';
}

/**
 * Calculate Floor Space Ratio for commercial zones
 */
function calculateFSR(zoneType: string): string {
  switch (zoneType) {
    case 'C1Z':
      return '2.0:1';
    case 'C2Z':
      return '3.0:1';
    case 'CCZ':
      return '4.0:1';
    default:
      return 'As per schedule';
  }
}
