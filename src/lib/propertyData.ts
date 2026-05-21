/**
 * Property Data Orchestrator — waterfall fetch over Domain, Vicmap, and LGA.
 *
 * Returns a single shape where every load-bearing field (price, area,
 * council) carries its own provenance so the UI can render a "Source: X"
 * badge or fall through to the Acid Lime "Architectural Verification
 * Required" hint without re-deriving the rules.
 *
 * Honest caveats:
 *   • The Valuer-General fallback rung is reserved but not yet wired —
 *     VGV publishes sales statistics as CSV bulk extracts, not a realtime
 *     API. `source: 'vg'` is unreachable today; the union keeps the field
 *     stable so the UI does not change when a sync job lands.
 *   • Domain demo seed data (no API key configured) carries
 *     `domain.isDemoData === true` and is treated as TBC for price
 *     provenance — the seed values still populate the UI for sales demos,
 *     but the badge tells the truth.
 */

import {
  fetchVicPlanForPoint,
  fetchVicParcelForPoint,
  fetchVicBuildingsForArea,
  type VicPlanData,
  type ParcelPolygon,
} from './vicPlanApi';
import {
  fetchDomainPropertyData,
  type DomainPropertyData,
  type DomainPropertyType,
} from './domainApi';
import { fetchEasementsForPoint, type EasementData } from './easementApi';
import { fetchLgaForPoint } from './lgaApi';
import { findLgaContact, type LgaContact } from './lgaContacts';
import { calculateLotArea } from './propertyGeometry';

export type PriceSource = 'verified' | 'domain' | 'vg' | 'tbc';
export type AreaSource = 'verified' | 'vicmap' | 'tbc';
export type CouncilSource = 'vicmap-admin' | 'tbc';

export type PriceField = {
  valueAud: number | null;
  date: string | null;
  source: PriceSource;
};

export type AreaField = {
  valueM2: number | null;
  source: AreaSource;
};

export type CouncilField = {
  contact: LgaContact | null;
  source: CouncilSource;
};

export type PropertyData = {
  vicPlan: VicPlanData;
  parcel: ParcelPolygon | null;
  spi: string | null;
  domain: DomainPropertyData | null;
  easements: EasementData[];
  buildings: ParcelPolygon[];
  price: PriceField;
  area: AreaField;
  council: CouncilField;
  /**
   * Raw municipality name from Vicmap_Admin (e.g. "STONNINGTON CITY").
   * Preserved even when our curated contact directory misses the LGA so
   * the council card can still render the authoritative council name
   * instead of falling back to a placeholder.
   */
  councilName: string | null;
};

/**
 * Verified-record overrides — a small curated table of agent-confirmed
 * sales / dwelling classifications that disagree with the public Domain
 * record. Each entry sits at the top of the price / area / property-type
 * waterfall and is surfaced to the UI as `source: 'verified'` so the
 * architect-facing badge can read "Source: Verified Sale" rather than
 * silently rewriting Domain.
 *
 * Add new entries only when the override is documented (vendor advice,
 * agent contract note, council title plan). Each match is a
 * case-insensitive substring on the search address so unit-level and
 * street-level queries resolve to the same pin.
 */
type VerifiedRecord = {
  match: RegExp;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  lotSize?: number;
  propertyType?: DomainPropertyType;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  floorAreaM2?: number;
};

const VERIFIED_RECORDS: VerifiedRecord[] = [
  {
    match: /62\s+chandler\s+(rd|road)/i,
    lastSoldPrice: 710_000,
    lastSoldDate: '2024-05-11',
    lotSize: 715,
  },
  {
    // 2006 Malvern Road, Malvern East — verified Stonnington record:
    // Townhouse on a 209 m² lot, last sold $586,000 on 2021-02-20.
    // Domain's enrichment endpoint occasionally resolves this address
    // to the parent commercial block sale ($1.26M, no dwelling
    // attributes); the dwelling-level overrides below pin the response
    // to the residential townhouse so the Property Details grid
    // matches the actual built form.
    match: /2006\s+malvern\s+(rd|road)/i,
    lastSoldPrice: 586_000,
    lastSoldDate: '2021-02-20',
    lotSize: 209,
    propertyType: 'Townhouse',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 1,
    floorAreaM2: 142,
  },
];

function findVerifiedRecord(address: string): VerifiedRecord | null {
  for (const r of VERIFIED_RECORDS) {
    if (r.match.test(address)) return r;
  }
  return null;
}

export async function fetchPropertyData(
  displayName: string,
  lon: number,
  lat: number,
): Promise<PropertyData> {
  const parcelPromise = fetchVicParcelForPoint(lon, lat).catch((e) => {
    console.warn('[propertyData] parcel fetch failed', e);
    return null;
  });
  const domainPromise = fetchDomainPropertyData(displayName, lat, lon).catch((e) => {
    console.warn('[propertyData] domain fetch failed', e);
    return null;
  });
  const easementsPromise = fetchEasementsForPoint(lon, lat).catch((e) => {
    console.warn('[propertyData] easements fetch failed', e);
    return [] as EasementData[];
  });
  const lgaPromise = fetchLgaForPoint(lon, lat).catch((e) => {
    console.warn('[propertyData] lga fetch failed', e);
    return null;
  });
  const buildingsPromise = fetchVicBuildingsForArea(lon, lat).catch((e) => {
    console.warn('[propertyData] buildings fetch failed', e);
    return [] as ParcelPolygon[];
  });

  const [vicPlan, parcel, domain, easements, lgaName, buildings] = await Promise.all([
    fetchVicPlanForPoint(lon, lat),
    parcelPromise,
    domainPromise,
    easementsPromise,
    lgaPromise,
    buildingsPromise,
  ]);

  const verified = findVerifiedRecord(displayName);
  const effectiveDomain: DomainPropertyData | null = domain
    ? {
        ...domain,
        lastSoldPrice: verified?.lastSoldPrice ?? domain.lastSoldPrice,
        lastSoldDate: verified?.lastSoldDate ?? domain.lastSoldDate,
        lotSize: verified?.lotSize ?? domain.lotSize,
        propertyType: verified?.propertyType ?? domain.propertyType,
        bedrooms: verified?.bedrooms ?? domain.bedrooms,
        bathrooms: verified?.bathrooms ?? domain.bathrooms,
        carSpaces: verified?.carSpaces ?? domain.carSpaces,
        floorAreaM2: verified?.floorAreaM2 ?? domain.floorAreaM2,
      }
    : null;

  // Price waterfall: verified override → live Domain → TBC. Demo seeds
  // are demoted to TBC because they are deterministic-but-fictional.
  let price: PriceField;
  if (verified?.lastSoldPrice) {
    price = {
      valueAud: verified.lastSoldPrice,
      date: verified.lastSoldDate ?? null,
      source: 'verified',
    };
  } else if (effectiveDomain && !effectiveDomain.isDemoData && effectiveDomain.lastSoldPrice) {
    price = {
      valueAud: effectiveDomain.lastSoldPrice,
      date: effectiveDomain.lastSoldDate,
      source: 'domain',
    };
  } else {
    price = { valueAud: null, date: null, source: 'tbc' };
  }

  // Area waterfall: verified → cadastral polygon → TBC. Domain's lotSize
  // is intentionally excluded — the demo path is a deterministic seed
  // (not real survey data) and the live path is unverified enrichment,
  // so allowing it would leak a fake number under the "Source: Domain"
  // badge. If Vicmap can't intersect a parcel (road reserve, unsubdivided
  // land, service outage), the UI shows TBC instead.
  let area: AreaField;
  if (verified?.lotSize) {
    area = { valueM2: verified.lotSize, source: 'verified' };
  } else if (parcel) {
    area = { valueM2: calculateLotArea(parcel.polygon), source: 'vicmap' };
  } else {
    area = { valueM2: null, source: 'tbc' };
  }

  // Council: Vicmap_Admin already resolved the LGA via point-in-polygon
  // intersection. findLgaContact maps the uppercase Vicmap label onto our
  // curated phone / email / website directory — a missing entry collapses
  // to 'tbc' so the UI falls back to the public LGA portal hint.
  const lgaContact = findLgaContact(lgaName);
  const council: CouncilField = lgaContact
    ? { contact: lgaContact, source: 'vicmap-admin' }
    : { contact: null, source: 'tbc' };

  return {
    vicPlan,
    parcel: parcel?.polygon ?? null,
    spi: parcel?.spi ?? null,
    domain: effectiveDomain,
    easements,
    buildings,
    price,
    area,
    council,
    councilName: lgaName,
  };
}
