/**
 * Childcare / kindergarten proximity helper.
 *
 * Live mode queries OpenStreetMap's Overpass API (free, no key, no quota
 * fee within fair-use) for `amenity=childcare` and `amenity=kindergarten`
 * nodes within ~2 km of the supplied point. Returns the five closest by
 * straight-line distance.
 *
 * Honest caveats:
 *   • OSM coverage of Victorian childcare is community-curated. Brand-new
 *     centres may be missing; demolished sites occasionally linger. The
 *     authoritative source is the ACECQA National Quality Framework
 *     register, which lacks a free public point-query endpoint — bulk
 *     download only. A future upgrade can swap this fetcher for an ACECQA
 *     sync without changing the UI contract.
 *   • Google Places `nearbySearch` (type: child_care) would give richer
 *     results — ratings, opening hours, photos — but Google Cloud bills
 *     per query, breaking the $0 Cloudflare Pages constraint. The return
 *     shape here matches Google Places' minimum surface so a future
 *     migration is a one-function swap.
 */

import axios from 'axios';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_M = 2000;
const MAX_RESULTS = 5;

export type ChildcareKind = 'childcare' | 'kindergarten';

export type Childcare = {
  name: string;
  kind: ChildcareKind;
  distanceM: number;
  /** Operator tag from OSM where present — typically "Government" /
   *  "Council" / private brand name. Free-form, not a closed enum. */
  operator: string | null;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export async function fetchNearestChildcare(
  lat: number,
  lon: number,
): Promise<Childcare[]> {
  // Overpass QL: combine childcare + kindergarten amenities (nodes, ways,
  // and relations) within the search radius. `out center` returns the
  // centroid for ways/relations so we can compute distance without
  // fetching geometry.
  const query = `[out:json][timeout:15];
(
  node["amenity"="childcare"](around:${SEARCH_RADIUS_M},${lat},${lon});
  way["amenity"="childcare"](around:${SEARCH_RADIUS_M},${lat},${lon});
  node["amenity"="kindergarten"](around:${SEARCH_RADIUS_M},${lat},${lon});
  way["amenity"="kindergarten"](around:${SEARCH_RADIUS_M},${lat},${lon});
);
out center tags;`;

  try {
    const { data } = await axios.post<OverpassResponse>(
      OVERPASS_URL,
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 18000,
      },
    );
    const elements = data.elements ?? [];

    const out: Childcare[] = [];
    for (const el of elements) {
      const tags = el.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue;
      const latP = el.lat ?? el.center?.lat;
      const lonP = el.lon ?? el.center?.lon;
      if (typeof latP !== 'number' || typeof lonP !== 'number') continue;
      const kind: ChildcareKind =
        tags.amenity === 'kindergarten' ? 'kindergarten' : 'childcare';
      out.push({
        name,
        kind,
        distanceM: haversineM(lat, lon, latP, lonP),
        operator: tags.operator?.trim() || null,
      });
    }

    return out.sort((a, b) => a.distanceM - b.distanceM).slice(0, MAX_RESULTS);
  } catch (error) {
    console.warn('[childcareApi] Overpass fetch failed:', error);
    return [];
  }
}
