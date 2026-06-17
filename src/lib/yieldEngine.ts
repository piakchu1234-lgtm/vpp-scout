export type YieldLandUse = {
  type: string;
  estimate: number;
  max: number;
  feasible: boolean;
};

export type YieldScorecard = {
  overall: 'HIGH' | 'MEDIUM' | 'LOW';
  precedents: number;
  slope: number;
  complexity: number;
  riskFactors: number;
};

export type YieldConstraints = {
  maxHeight: string;
  maxFootprint: string;
  minPermeability: string;
};

export type YieldPermit = {
  required: boolean;
  reason: string;
};

// Multi-Archetype Scenario Data Structures
export type TownhouseArchetype = {
  archetype: 'Townhouse';
  maxYield: number; // dwelling count
  lotAreaRequired: number; // m² per dwelling
  setbackFront: number; // meters
  setbackSide: number; // meters
  setbackRear: number; // meters
  minLandscaping: number; // percentage
  maxFootprintRatio: number; // percentage
  feasible: boolean;
};

export type ApartmentArchetype = {
  archetype: 'Apartment Multi-Storey';
  maxYield: number; // dwelling count
  floorSpaceRatio: number; // FSR multiplier
  maxGFA: number; // m² Gross Floor Area
  maxHeight: number; // meters
  storeys: number;
  setbackFront: number;
  setbackSide: number;
  setbackRear: number;
  minLandscaping: number; // percentage
  feasible: boolean;
  parkingReduction?: ParkingReduction; // VC311/VC277 modifier
};

export type CommercialMixedUseArchetype = {
  archetype: 'Commercial / Mixed-Use';
  maxYield: number; // residential units
  retailFloorSpace: number; // m² active retail
  residentialAirRights: number; // m² residential GFA
  floorSpaceRatio: number;
  maxGFA: number;
  maxHeight: number;
  storeys: number;
  minLandscaping: number; // percentage
  feasible: boolean;
  parkingReduction?: ParkingReduction; // VC311/VC277 modifier
};

// Transit-Oriented Development Parking Reduction (VC311 / VC277)
export type ParkingReduction = {
  applies: boolean;
  trigger: 'PPTN' | 'Precinct1PO' | 'None';
  reductionPercentage: number; // 0-100
  baseRequirement: number; // spaces per dwelling
  reducedRequirement: number; // spaces per dwelling after reduction
  additionalYield: number; // extra dwellings enabled by reduced parking footprint
};

export type ArchetypeScenario = TownhouseArchetype | ApartmentArchetype | CommercialMixedUseArchetype;

export type YieldData = {
  resolved: boolean;
  isFeasible: boolean;
  summary: string;
  scorecard: YieldScorecard;
  landUse: YieldLandUse[];
  constraints: YieldConstraints;
  permit: YieldPermit;
  // Multi-archetype scenario analysis
  scenarios?: {
    townhouse: TownhouseArchetype;
    apartment: ApartmentArchetype;
    commercial: CommercialMixedUseArchetype;
  };
};

const APARTMENT_FRIENDLY_ZONES = new Set(['RGZ', 'C1Z']);

// Zone-based FSR and height mappings for multi-storey development
const ZONE_FSR_MAP: Record<string, number> = {
  'RGZ': 2.0,     // Residential Growth Zone
  'C1Z': 3.0,     // Commercial 1 Zone
  'C2Z': 2.5,     // Commercial 2 Zone
  'MUZ': 2.5,     // Mixed Use Zone
  'CCZ': 4.0,     // Capital City Zone
  'LDRZ': 0.5,    // Low Density Residential Zone
  'GRZ': 1.0,     // General Residential Zone
  'NRZ': 0.6,     // Neighbourhood Residential Zone
};

const ZONE_HEIGHT_MAP: Record<string, number> = {
  'RGZ': 15,      // 15m (4-5 storeys)
  'C1Z': 20,      // 20m (6-7 storeys)
  'C2Z': 18,      // 18m (5-6 storeys)
  'MUZ': 18,      // 18m (5-6 storeys)
  'CCZ': 30,      // 30m (8-10 storeys)
  'LDRZ': 9,      // 9m (2 storeys)
  'GRZ': 11,      // 11m (3 storeys)
  'NRZ': 9,       // 9m (2 storeys)
};

function formatM2(value: number): string {
  return `${Math.round(value)}m²`;
}

/**
 * Calculate parking reduction modifier (VC311 / VC277)
 *
 * Principal Public Transport Network (PPTN) catchments and Precinct 1 Parking Overlay
 * zones allow reduced car parking minimums, freeing up site area for additional dwellings.
 *
 * VC311: PPTN catchments (within 400m of train station, 600m of tram)
 * VC277: Precinct 1 Parking Overlay (inner-city areas)
 *
 * @param overlays - Array of overlay codes from planning data
 * @param zoneCode - Planning zone code
 * @returns ParkingReduction modifier
 */
function calculateParkingReduction(
  overlays: string[],
  zoneCode: string,
): ParkingReduction {
  // Check for Parking Overlay triggers
  const hasParkingOverlay = overlays.some(o => /PO\d+/i.test(o) || /parking/i.test(o));

  // PPTN zones: High-frequency public transport corridors
  // Approximation: RGZ, C1Z, MUZ, CCZ are typically within PPTN catchments
  const pptnZones = ['RGZ', 'C1Z', 'MUZ', 'CCZ', 'C2Z'];
  const isInPPTN = pptnZones.includes(zoneCode.trim().toUpperCase());

  // Precinct 1: Inner-city parking overlay (assumed if parking overlay present)
  const isPrecinct1 = hasParkingOverlay;

  let trigger: ParkingReduction['trigger'] = 'None';
  let reductionPercentage = 0;

  if (isPrecinct1) {
    // Precinct 1: Up to 50% parking reduction
    trigger = 'Precinct1PO';
    reductionPercentage = 50;
  } else if (isInPPTN) {
    // PPTN catchment: Up to 30% parking reduction
    trigger = 'PPTN';
    reductionPercentage = 30;
  }

  const applies = reductionPercentage > 0;

  // Base requirement: 1 space per dwelling (ResCode Clause 52.06)
  const baseRequirement = 1.0;
  const reducedRequirement = applies
    ? baseRequirement * (1 - reductionPercentage / 100)
    : baseRequirement;

  // Calculate additional yield enabled by reduced parking footprint
  // Assumption: Each parking space requires 25m² (12.5m² bay + circulation)
  // Reduced parking frees up space for additional dwelling area
  const parkingAreaSavedPerDwelling = (baseRequirement - reducedRequirement) * 25;

  // Rough estimate: Freed parking area can support ~10% additional yield
  const additionalYieldMultiplier = applies ? 0.1 : 0;

  return {
    applies,
    trigger,
    reductionPercentage,
    baseRequirement,
    reducedRequirement,
    additionalYield: 0, // Will be calculated per-archetype based on actual yield
  };
}

/**
 * Calculate Townhouse archetype scenario
 * Minimum lot baseline: 250m² per dwelling
 * Generous setbacks: 5m front, 2m side, 6m rear
 * High landscaping minimum: 30%
 */
function calculateTownhouseScenario(landSizeM2: number): TownhouseArchetype {
  const lotAreaPerDwelling = 250; // m²
  const maxYield = Math.floor(landSizeM2 / lotAreaPerDwelling);
  const feasible = maxYield >= 2 && landSizeM2 >= 500;

  return {
    archetype: 'Townhouse',
    maxYield: feasible ? maxYield : 0,
    lotAreaRequired: lotAreaPerDwelling,
    setbackFront: 5.0,
    setbackSide: 2.0,
    setbackRear: 6.0,
    minLandscaping: 30, // percentage
    maxFootprintRatio: 60, // percentage
    feasible,
  };
}

/**
 * Calculate Apartment Multi-Storey archetype scenario
 * Max GFA = Lot Area × FSR
 * Variable height ceiling based on zone tier
 * Assumes 80m² per dwelling (1-2 bed apartments)
 * Applies parking reduction modifier if in PPTN/Precinct 1
 */
function calculateApartmentScenario(
  landSizeM2: number,
  zoneCode: string,
  overlays: string[] = [],
): ApartmentArchetype {
  const zone = zoneCode.trim().toUpperCase();
  const fsr = ZONE_FSR_MAP[zone] ?? 1.0; // default FSR if zone unknown
  const maxHeight = ZONE_HEIGHT_MAP[zone] ?? 11; // default 11m (3 storeys)
  const maxGFA = landSizeM2 * fsr;

  // Estimate storey count (3.5m per storey + 0.5m ceiling/structure)
  const storeys = Math.floor(maxHeight / 3.5);

  // Average apartment size: 80m² (1-2 bed units)
  const dwellingAreaM2 = 80;
  let maxYield = Math.floor(maxGFA / dwellingAreaM2);

  const feasible = landSizeM2 >= 1000 && fsr >= 1.0;

  // Apply parking reduction modifier
  const parkingReduction = calculateParkingReduction(overlays, zone);
  if (parkingReduction.applies && feasible) {
    // Parking reduction frees up ~10-15% additional site capacity
    const additionalYield = Math.floor(maxYield * 0.12); // 12% boost
    parkingReduction.additionalYield = additionalYield;
    maxYield += additionalYield;
  }

  return {
    archetype: 'Apartment Multi-Storey',
    maxYield: feasible ? maxYield : 0,
    floorSpaceRatio: fsr,
    maxGFA,
    maxHeight,
    storeys,
    setbackFront: 6.0,
    setbackSide: 3.0,
    setbackRear: 6.0,
    minLandscaping: 20, // percentage
    feasible,
    parkingReduction,
  };
}

/**
 * Calculate Commercial / Mixed-Use archetype scenario
 * Tracks active retail floor space + residential air rights
 * Ground floor retail assumption: 150m² minimum
 * Upper floors residential: remaining GFA
 * Applies parking reduction modifier if in PPTN/Precinct 1
 */
function calculateCommercialMixedUseScenario(
  landSizeM2: number,
  zoneCode: string,
  overlays: string[] = [],
): CommercialMixedUseArchetype {
  const zone = zoneCode.trim().toUpperCase();
  const fsr = ZONE_FSR_MAP[zone] ?? 2.0;
  const maxHeight = ZONE_HEIGHT_MAP[zone] ?? 18;
  const maxGFA = landSizeM2 * fsr;
  const storeys = Math.floor(maxHeight / 3.5);

  // Ground floor retail allocation (assume 70% of lot area for retail)
  const retailFloorSpace = Math.min(landSizeM2 * 0.7, 500); // cap at 500m²

  // Remaining GFA allocated to residential air rights
  const residentialAirRights = maxGFA - retailFloorSpace;

  // Residential units (assuming 75m² per unit for mixed-use)
  const dwellingAreaM2 = 75;
  let maxYield = Math.floor(residentialAirRights / dwellingAreaM2);

  // Feasible if in commercial/mixed-use zone and sufficient site area
  const commercialZones = ['C1Z', 'C2Z', 'MUZ', 'CCZ'];
  const feasible = commercialZones.includes(zone) && landSizeM2 >= 800;

  // Apply parking reduction modifier
  const parkingReduction = calculateParkingReduction(overlays, zone);
  if (parkingReduction.applies && feasible) {
    // Parking reduction frees up ~15% additional site capacity for mixed-use
    const additionalYield = Math.floor(maxYield * 0.15); // 15% boost
    parkingReduction.additionalYield = additionalYield;
    maxYield += additionalYield;
  }

  return {
    archetype: 'Commercial / Mixed-Use',
    maxYield: feasible ? maxYield : 0,
    retailFloorSpace: feasible ? retailFloorSpace : 0,
    residentialAirRights: feasible ? residentialAirRights : 0,
    floorSpaceRatio: fsr,
    maxGFA,
    maxHeight,
    storeys,
    minLandscaping: 15, // percentage (lower for commercial)
    feasible,
    parkingReduction,
  };
}

export function emptyYield(reason = 'Awaiting parcel geometry…'): YieldData {
  return {
    resolved: false,
    isFeasible: false,
    summary: reason,
    scorecard: {
      overall: 'LOW',
      precedents: 0,
      slope: 0,
      complexity: 0,
      riskFactors: 0,
    },
    landUse: [
      { type: 'House', estimate: 0, max: 1, feasible: false },
      { type: 'Small Second Dwelling', estimate: 0, max: 1, feasible: false },
      { type: 'Duplex', estimate: 0, max: 2, feasible: false },
      { type: 'Townhouse', estimate: 0, max: 0, feasible: false },
      { type: 'Apartment', estimate: 0, max: 0, feasible: false },
    ],
    constraints: {
      maxHeight: '—',
      maxFootprint: '—',
      minPermeability: '—',
    },
    permit: {
      required: false,
      reason: 'Awaiting parcel geometry to evaluate ResCode triggers.',
    },
  };
}

export function calculateYield(
  landSizeM2: number,
  zoneCode: string,
  overlays: string[] = [],
): YieldData {
  if (!Number.isFinite(landSizeM2) || landSizeM2 <= 0) {
    return emptyYield();
  }

  const zone = (zoneCode ?? '').trim().toUpperCase();

  const ssdFeasible = landSizeM2 >= 300;
  const duplexFeasible = landSizeM2 >= 500;
  const townhouseMax = Math.floor(landSizeM2 / 250);
  const townhouseFeasible = townhouseMax >= 2;
  const apartmentFeasible =
    landSizeM2 >= 1000 || APARTMENT_FRIENDLY_ZONES.has(zone);
  const apartmentMax = apartmentFeasible
    ? Math.max(2, Math.floor(landSizeM2 / 150))
    : 0;

  const landUse: YieldLandUse[] = [
    { type: 'House', estimate: 1, max: 1, feasible: true },
    {
      type: 'Small Second Dwelling',
      estimate: ssdFeasible ? 1 : 0,
      max: 1,
      feasible: ssdFeasible,
    },
    {
      type: 'Duplex',
      estimate: duplexFeasible ? 2 : 0,
      max: 2,
      feasible: duplexFeasible,
    },
    {
      type: 'Townhouse',
      estimate: townhouseFeasible ? townhouseMax : 0,
      max: townhouseFeasible ? townhouseMax : 0,
      feasible: townhouseFeasible,
    },
    {
      type: 'Apartment',
      estimate: apartmentFeasible ? apartmentMax : 0,
      max: apartmentMax,
      feasible: apartmentFeasible,
    },
  ];

  const feasibleCount = landUse.filter((r) => r.feasible).length;
  const overall: YieldScorecard['overall'] =
    feasibleCount >= 4 ? 'HIGH' : feasibleCount >= 2 ? 'MEDIUM' : 'LOW';

  const maxFootprintM2 = landSizeM2 * 0.6;
  const minPermeabilityM2 = landSizeM2 * 0.2;

  const triggersClause55 =
    duplexFeasible || townhouseFeasible || apartmentFeasible;
  const permit: YieldPermit = triggersClause55
    ? {
        required: true,
        reason:
          'Clause 55 (ResCode) triggered: Multi-dwelling development >= 2 units.',
      }
    : {
        required: false,
        reason:
          'Single-dwelling pathway available under ResCode Clause 54; no planning permit required for a single house on this lot.',
      };

  const zoneFragment = zone ? ` zone (${zone}),` : '';
  const yieldFragment = townhouseFeasible
    ? `up to ${townhouseMax} townhouses are commercially viable`
    : duplexFeasible
      ? 'a duplex pathway is the strongest yield play'
      : ssdFeasible
        ? 'a primary dwelling plus a Small Second Dwelling (2026 SSD reforms) is feasible'
        : 'this lot supports a single dwelling under ResCode Clause 54';
  const summary = `Based on your${zoneFragment} lot size of ${Math.round(landSizeM2)}m², we predict ${yieldFragment}.`;

  // Calculate multi-archetype scenarios
  const scenarios = {
    townhouse: calculateTownhouseScenario(landSizeM2),
    apartment: calculateApartmentScenario(landSizeM2, zone, overlays),
    commercial: calculateCommercialMixedUseScenario(landSizeM2, zone, overlays),
  };

  return {
    resolved: true,
    isFeasible: feasibleCount >= 2,
    summary,
    scorecard: {
      overall,
      precedents: overall === 'HIGH' ? 85 : overall === 'MEDIUM' ? 60 : 35,
      slope: 90,
      complexity: townhouseFeasible ? 65 : 50,
      riskFactors: apartmentFeasible ? 70 : 80,
    },
    landUse,
    constraints: {
      maxHeight: '9m (2 Storeys)',
      maxFootprint: `${formatM2(maxFootprintM2)} (60%)`,
      minPermeability: `${formatM2(minPermeabilityM2)} (20%)`,
    },
    permit,
    scenarios,
  };
}
