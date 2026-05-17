/**
 * Property Gatekeeper — cross-references Domain API `propertyType`, VicPlan
 * zone code, and Vicmap building footprints to produce a single, conservative
 * eligibility verdict for the SSD pathway.
 *
 * Honest caveats baked into the logic (not silently dropped):
 *
 *   • Vicmap's free ArcGIS layers do NOT expose a parcel-level
 *     LAND_USE_CODE / LAND_USE_DESCRIPTION attribute. The Vicmap_Parcel
 *     layer is cadastral only; the Vicmap_Property layer carries an
 *     "Occupancy vs Graphic" metadata flag, not a dwelling-use code. The
 *     true land-use classification lives in Valuer-General + council
 *     datasets that are not redistributed through the free Vicmap API.
 *     We therefore use Domain `propertyType` as the primary signal.
 *
 *   • Building-footprint count from Vicmap_Features_of_Interest layer 7
 *     (BUILDING_POLYGON) catches all roofed structures, INCLUDING garages
 *     and large sheds. We surface the raw count alongside an "at-risk"
 *     threshold (≥2) but never claim it's the council's official dwelling
 *     count — verification with the title plan remains mandatory.
 *
 *   • Zone code is consulted only as a residential-context cross-check.
 *     A non-residential zone (e.g. C1Z, IN1Z) overrides any Domain
 *     "House" result because SSD applies in residential zones only.
 */

import type { ParcelPolygon } from './vicPlanApi';
import type { DomainPropertyType } from './domainApi';

export type PropertyCategory =
  | 'House'
  | 'Townhouse'
  | 'Villa'
  | 'Apartment'
  | 'Vacant'
  | 'Unknown';

export type PropertyGatekeeperInput = {
  domainPropertyType: DomainPropertyType | null;
  zoneCode: string | null;
  parcel: ParcelPolygon | null;
  buildings: ParcelPolygon[];
};

export type PropertyGatekeeperResult = {
  category: PropertyCategory;
  /** Best-effort count of building footprints whose centroid lies inside the parcel. */
  dwellingCountEstimate: number;
  /** True when the SSD permit-exempt pathway is still viable. */
  ssdEligible: boolean;
  /** Stable enum so the UI can switch on cause without parsing prose. */
  ineligibilityReason:
    | 'category'
    | 'multipleDwellings'
    | 'nonResidentialZone'
    | 'vacantLandNote'
    | null;
  /** Source attribution for the architect-facing badge. */
  source: 'domain' | 'derived' | 'unknown';
};

const RESIDENTIAL_ZONE_PREFIXES = ['NRZ', 'GRZ', 'RGZ', 'MUZ', 'TZ', 'LDRZ', 'RLZ', 'RGZ', 'GRZ1', 'NRZ1'];

function isResidentialZone(zoneCode: string | null): boolean {
  if (!zoneCode) return true; // Unknown zone — don't gate on missing info.
  const upper = zoneCode.toUpperCase();
  return RESIDENTIAL_ZONE_PREFIXES.some((p) => upper.startsWith(p));
}

function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ringCentroid(ring: number[][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  let cx = 0;
  let cy = 0;
  let signed = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const [x0, y0] = closed[i];
    const [x1, y1] = closed[i + 1];
    const cross = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
    signed += cross;
  }
  if (signed === 0) return [closed[0][0], closed[0][1]];
  return [cx / (3 * signed), cy / (3 * signed)];
}

function countBuildingsInParcel(
  parcel: ParcelPolygon | null,
  buildings: ParcelPolygon[],
): number {
  if (!parcel || parcel.coordinates.length === 0) return 0;
  const outer = parcel.coordinates[0];
  let count = 0;
  for (const b of buildings) {
    if (b.coordinates.length === 0) continue;
    const c = ringCentroid(b.coordinates[0]);
    if (pointInRing(c, outer)) count += 1;
  }
  return count;
}

function mapDomainType(
  d: DomainPropertyType | null,
): { category: PropertyCategory; source: 'domain' | 'unknown' } {
  switch (d) {
    case 'House':
      return { category: 'House', source: 'domain' };
    case 'Townhouse':
      return { category: 'Townhouse', source: 'domain' };
    case 'Villa':
      return { category: 'Villa', source: 'domain' };
    case 'ApartmentUnitFlat':
      return { category: 'Apartment', source: 'domain' };
    case 'VacantLand':
      return { category: 'Vacant', source: 'domain' };
    default:
      return { category: 'Unknown', source: 'unknown' };
  }
}

export function categorizeProperty(
  input: PropertyGatekeeperInput,
): PropertyGatekeeperResult {
  const { domainPropertyType, zoneCode, parcel, buildings } = input;

  const mapped = mapDomainType(domainPropertyType);
  let category: PropertyCategory = mapped.category;
  let source: 'domain' | 'derived' | 'unknown' = mapped.source;
  const dwellingCountEstimate = countBuildingsInParcel(parcel, buildings);

  // Heuristic fallback when Domain gives nothing useful:
  //   • zero buildings on the parcel → Vacant
  //   • 1 building → House
  //   • ≥2 buildings → Townhouse (likely a dual-occ or unit dev)
  // Marked source='derived' so the UI can flag low confidence.
  if (category === 'Unknown' && parcel) {
    source = 'derived';
    if (dwellingCountEstimate === 0) category = 'Vacant';
    else if (dwellingCountEstimate === 1) category = 'House';
    else category = 'Townhouse';
  }

  let ssdEligible = true;
  let ineligibilityReason: PropertyGatekeeperResult['ineligibilityReason'] = null;

  // The SSD permit-exempt pathway is reserved for single-dwelling House lots.
  // Townhouse, Villa, and Apartment classifications are excluded outright —
  // these are typically strata-titled or covenant-bound parcels where the
  // 2026 SSD reforms do not extend the as-of-right pathway. Vacant land is
  // flagged separately (see below) rather than blocked.
  if (
    category === 'Apartment' ||
    category === 'Villa' ||
    category === 'Townhouse'
  ) {
    ssdEligible = false;
    ineligibilityReason = 'category';
  } else if (category === 'Vacant') {
    // Not strictly ineligible — vacant land can pursue a primary dwelling +
    // SSD — but the architect should be aware that "second dwelling" implies
    // the existence of a first. Flag rather than block.
    ineligibilityReason = 'vacantLandNote';
  }

  // Independent guard: existing dwelling count > 1 disqualifies the lot
  // regardless of Domain's category claim.
  if (ssdEligible && dwellingCountEstimate > 1) {
    ssdEligible = false;
    ineligibilityReason = 'multipleDwellings';
  }

  if (ssdEligible && !isResidentialZone(zoneCode)) {
    ssdEligible = false;
    ineligibilityReason = 'nonResidentialZone';
  }

  return {
    category,
    dwellingCountEstimate,
    ssdEligible,
    ineligibilityReason,
    source,
  };
}

export const PROPERTY_CATEGORY_LABEL: Record<
  PropertyCategory,
  { en: string; zh: string }
> = {
  House: { en: 'House', zh: '独立屋' },
  Townhouse: { en: 'Townhouse', zh: '联排别墅' },
  Villa: { en: 'Villa', zh: '别墅' },
  Apartment: { en: 'Apartment / Unit', zh: '公寓 / 单元' },
  Vacant: { en: 'Vacant Land', zh: '空地' },
  Unknown: { en: 'Unclassified', zh: '未分类' },
};
