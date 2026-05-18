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

export type YieldData = {
  resolved: boolean;
  isFeasible: boolean;
  summary: string;
  scorecard: YieldScorecard;
  landUse: YieldLandUse[];
  constraints: YieldConstraints;
  permit: YieldPermit;
};

const APARTMENT_FRIENDLY_ZONES = new Set(['RGZ', 'C1Z']);

function formatM2(value: number): string {
  return `${Math.round(value)}m²`;
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

export function calculateYield(landSizeM2: number, zoneCode: string): YieldData {
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
  };
}
