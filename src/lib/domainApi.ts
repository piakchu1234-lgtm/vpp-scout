/**
 * Domain API integration for property enrichment data.
 *
 * Uses live Domain API when a key is available (env var or localStorage),
 * otherwise returns deterministic demo data so the Market Context card and
 * downstream Feasibility Scenario stay populated for sales/UX demos.
 *
 * API Docs: https://developer.domain.com.au/docs/apis/pkg_properties_locations/references/propertyenrichment_get
 */

import axios from 'axios';

const DOMAIN_API_BASE = 'https://api.domain.com.au';
const ENV_API_KEY = process.env.NEXT_PUBLIC_DOMAIN_API_KEY;
const LOCAL_STORAGE_KEY = 'simplysite.domain_api_key';

export type ComparableSale = {
  address: string;
  price: number;
  saleDate: string;
  distanceM: number;
  bedrooms?: number;
  landArea?: number;
};

export type DomainPropertyType =
  | 'House'
  | 'Townhouse'
  | 'Villa'
  | 'ApartmentUnitFlat'
  | 'VacantLand'
  | 'Unknown';

export type DomainPropertyData = {
  lotSize: number | null;
  rentalEstimateWeekly: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  yearBuilt: number | null;
  wallMaterial: string | null;
  roofMaterial: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  floorAreaM2: number | null;
  comparableSales: ComparableSale[];
  propertyType: DomainPropertyType;
  isDemoData: boolean;
};

type DomainEnrichmentResponse = {
  propertyDetails?: {
    area?: { value?: number; unit?: string };
    buildingArea?: { value?: number; unit?: string };
    floorArea?: { value?: number; unit?: string };
    lastSale?: { price?: number; date?: string };
    propertyType?: string;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    carspaces?: number;
    construction?: {
      wallMaterial?: string;
      roofMaterial?: string;
    };
  };
  rentalEstimate?: { lower?: number; upper?: number; midpoint?: number };
};

function getApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  }
  return ENV_API_KEY;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Map Domain API's free-form propertyType strings to our closed enum. The
 * Domain v1 enrichment endpoint emits a single PascalCase token (e.g.
 * "House", "Townhouse", "ApartmentUnitFlat") — anything outside the known
 * residential set falls back to "Unknown" so the gatekeeper can warn rather
 * than silently mis-classify (e.g. retail, industrial, or commercial lots).
 */
function normalizeDomainPropertyType(raw: string): DomainPropertyType {
  const norm = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (norm === 'house' || norm === 'detachedhouse' || norm === 'newhouseland') return 'House';
  if (norm === 'townhouse' || norm === 'semidetached') return 'Townhouse';
  if (norm === 'villa' || norm === 'duplex') return 'Villa';
  if (norm === 'apartmentunitflat' || norm === 'apartment' || norm === 'unit' || norm === 'flat' || norm === 'studio') return 'ApartmentUnitFlat';
  if (norm === 'vacantland' || norm === 'land' || norm === 'newland' || norm === 'block') return 'VacantLand';
  return 'Unknown';
}

const STREETS = [
  'Lygon St', 'Brunswick St', 'High St', 'Smith St', 'Chapel St',
  'Glenferrie Rd', 'Burke Rd', 'Bell St', 'Sydney Rd', 'Toorak Rd',
];

function buildMockComparables(
  address: string,
  lat: number,
  lon: number,
): ComparableSale[] {
  const rand = seeded(hash(address + lat.toFixed(3) + lon.toFixed(3)));
  const out: ComparableSale[] = [];
  for (let i = 0; i < 3; i++) {
    const number = 4 + Math.floor(rand() * 195);
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const price = 820_000 + Math.floor(rand() * 800_000);
    const monthsAgo = 2 + Math.floor(rand() * 22);
    const saleDate = new Date();
    saleDate.setMonth(saleDate.getMonth() - monthsAgo);
    out.push({
      address: `${number} ${street}`,
      price: Math.round(price / 5000) * 5000,
      saleDate: saleDate.toISOString().slice(0, 10),
      distanceM: 80 + Math.floor(rand() * 320),
      bedrooms: 2 + Math.floor(rand() * 3),
      landArea: 380 + Math.floor(rand() * 380),
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

function buildDemoData(
  address: string,
  lat: number,
  lon: number,
): DomainPropertyData {
  const rand = seeded(hash(address));
  // Lot size is deliberately null on the demo path. The cadastral lot
  // size must come from Vicmap (Vicmap_Parcel polygon → @turf/area) or
  // an agent-verified record — never a seeded guess. propertyData.ts
  // enforces this in the area waterfall; nulling the seed here closes
  // the same leak at the source.
  const lotSize: number | null = null;
  const rentalEstimateWeekly = 480 + Math.floor(rand() * 420);
  // Last-sold price/date are sale-record claims about a real transaction.
  // They must come from Domain's enrichment endpoint or stay null —
  // a fabricated sale price could mislead buyers and is not a placeholder
  // we're willing to ship.
  const lastSoldPrice: number | null = null;
  const lastSoldDate: string | null = null;
  // Demo property-type distribution: weighted toward House so the SSD path
  // shows up as eligible for most demo searches. The categorizer downstream
  // still gates by zone code and dwelling count, so a mismatch in the demo
  // doesn't silently mask the gatekeeping logic.
  const t = rand();
  const propertyType: DomainPropertyType =
    t < 0.6
      ? 'House'
      : t < 0.78
        ? 'Townhouse'
        : t < 0.88
          ? 'Villa'
          : t < 0.97
            ? 'ApartmentUnitFlat'
            : 'VacantLand';

  const wallOptions = ['Brick Veneer', 'Weatherboard', 'Double Brick', 'Render'];
  const roofOptions = ['Concrete Tile', 'Terracotta Tile', 'Colorbond Steel', 'Slate'];
  const yearBuilt = propertyType === 'VacantLand' ? null : 1920 + Math.floor(rand() * 100);
  const wallMaterial =
    propertyType === 'VacantLand'
      ? null
      : rand() < 0.25
        ? null
        : wallOptions[Math.floor(rand() * wallOptions.length)];
  const roofMaterial =
    propertyType === 'VacantLand'
      ? null
      : rand() < 0.3
        ? null
        : roofOptions[Math.floor(rand() * roofOptions.length)];

  // Demo dwelling attributes — deterministic per-address. VacantLand carries
  // null counts so the UI doesn't claim bedrooms for an empty block.
  const bedrooms =
    propertyType === 'VacantLand' ? null : 2 + Math.floor(rand() * 4);
  const bathrooms =
    propertyType === 'VacantLand' ? null : 1 + Math.floor(rand() * 3);
  const carSpaces =
    propertyType === 'VacantLand' ? null : Math.floor(rand() * 3);
  const floorAreaM2 =
    propertyType === 'VacantLand'
      ? null
      : 80 + Math.floor(rand() * 220);

  return {
    lotSize,
    rentalEstimateWeekly,
    confidence: 'low',
    lastSoldPrice,
    lastSoldDate,
    yearBuilt,
    wallMaterial,
    roofMaterial,
    bedrooms,
    bathrooms,
    carSpaces,
    floorAreaM2,
    comparableSales: buildMockComparables(address, lat, lon),
    propertyType,
    isDemoData: true,
  };
}

export async function fetchDomainPropertyData(
  address: string,
  lat: number,
  lon: number,
): Promise<DomainPropertyData | null> {
  const apiKey = getApiKey();
  if (!apiKey) return buildDemoData(address, lat, lon);

  try {
    const { data } = await axios.get<DomainEnrichmentResponse>(
      `${DOMAIN_API_BASE}/v1/properties/enrichment`,
      {
        params: { address, latitude: lat, longitude: lon },
        headers: { 'X-Api-Key': apiKey },
        timeout: 15000,
      },
    );

    const lotSize = data.propertyDetails?.area?.value ?? null;
    const rentalMidpoint = data.rentalEstimate?.midpoint ?? null;
    const rawType = data.propertyDetails?.propertyType ?? '';
    const propertyType: DomainPropertyType = normalizeDomainPropertyType(rawType);
    let confidence: 'high' | 'medium' | 'low' | null = null;
    if (lotSize && rentalMidpoint) confidence = 'high';
    else if (lotSize || rentalMidpoint) confidence = 'medium';

    // Domain's enrichment endpoint surfaces dwelling attributes alongside the
    // sale record. `floorArea` is the indoor habitable footprint; we fall
    // through to `buildingArea` (older response shape) when absent.
    const floorAreaM2 =
      data.propertyDetails?.floorArea?.value ??
      data.propertyDetails?.buildingArea?.value ??
      null;

    return {
      lotSize,
      rentalEstimateWeekly: rentalMidpoint,
      confidence,
      lastSoldPrice: data.propertyDetails?.lastSale?.price ?? null,
      lastSoldDate: data.propertyDetails?.lastSale?.date ?? null,
      yearBuilt: data.propertyDetails?.yearBuilt ?? null,
      wallMaterial: data.propertyDetails?.construction?.wallMaterial ?? null,
      roofMaterial: data.propertyDetails?.construction?.roofMaterial ?? null,
      bedrooms: data.propertyDetails?.bedrooms ?? null,
      bathrooms: data.propertyDetails?.bathrooms ?? null,
      carSpaces: data.propertyDetails?.carspaces ?? null,
      floorAreaM2,
      comparableSales: [],
      propertyType,
      isDemoData: false,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn('[domainApi] live request failed, falling back to demo:', error.response?.status);
    }
    return buildDemoData(address, lat, lon);
  }
}
