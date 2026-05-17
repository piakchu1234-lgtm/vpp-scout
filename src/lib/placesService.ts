/**
 * Google Places (New) v1 — Nearby Search for the Neighbourhood
 * Intelligence layer.
 *
 * Endpoint: https://places.googleapis.com/v1/places:searchNearby
 *
 * ⚠ Hosting / cost deviation:
 *   This module breaks the $0 Cloudflare Pages constraint set out in
 *   CLAUDE.md. The Places API (New) Nearby Search is $32 / 1 000 calls
 *   beyond the $200/mo Google Cloud free credit, and the GCP project
 *   must have billing enabled even to mint the key. The user accepted
 *   this tradeoff explicitly. If the Domain enrichment endpoint comes
 *   online with school / childcare data, prefer that and demote this
 *   module back to a fallback.
 *
 * The key is `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — public-prefixed so
 * the browser bundle can call Google directly (matching the existing
 * NEXT_PUBLIC_MAPBOX_TOKEN pattern). Production deployments should
 * restrict the key to (a) HTTP referrer = the Pages domain and
 * (b) Places API only.
 */

import axios from 'axios';

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const ENV_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const DEFAULT_RADIUS_M = 2000;
const MAX_RESULTS = 10;

/** The Places (New) `includedTypes` strings we support. The two values
 *  align with the user-facing Schools / Childcare sub-tabs. */
export type PlaceKind = 'school' | 'child_care';

export type Place = {
  name: string;
  /** Most specific Place type Google returned, narrowed to the
   *  taxonomy we care about. Used as the user-visible "Type" column. */
  type: PlaceKind;
  /** Free-form sub-classification surfaced from Google's `types[]`,
   *  e.g. "primary_school", "secondary_school", "preschool". Null when
   *  no finer label exists. */
  subtype: string | null;
  distanceM: number;
  lat: number;
  lon: number;
  /** True when the result came from the seeded fallback (no API key
   *  configured or request failed). The UI surfaces a Verification
   *  Pending pill for these. */
  isDemoData: boolean;
};

type PlacesNearbyResponse = {
  places?: Array<{
    displayName?: { text?: string };
    location?: { latitude: number; longitude: number };
    types?: string[];
  }>;
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

/** Pull the most specific Places `types[]` entry that the UI cares
 *  about. Google returns mixed taxonomy (e.g. ["primary_school",
 *  "school", "point_of_interest"]); we want the leaf. */
function narrowSubtype(types: string[] | undefined, kind: PlaceKind): string | null {
  if (!types) return null;
  if (kind === 'school') {
    const order = ['primary_school', 'secondary_school', 'university', 'school'];
    for (const t of order) if (types.includes(t)) return t === 'school' ? null : t;
  } else {
    const order = ['preschool', 'child_care_agency', 'child_care'];
    for (const t of order) if (types.includes(t)) return t === 'child_care' ? null : t;
  }
  return null;
}

function buildDemoData(
  lat: number,
  lon: number,
  kind: PlaceKind,
): Place[] {
  // Deterministic seeded fallback so the UI stays populated when no
  // key is configured — same approach the prior schoolApi used.
  const seed = Math.floor((lat * 10000) + (lon * 10000));
  let s = seed || 1;
  const rand = () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
  const pool =
    kind === 'school'
      ? [
          { name: 'Noble Park Primary School', subtype: 'primary_school' },
          { name: 'Lyndale Secondary College', subtype: 'secondary_school' },
          { name: 'Keysborough Secondary College', subtype: 'secondary_school' },
          { name: 'Wallarano Primary School', subtype: 'primary_school' },
          { name: 'Springvale Rise Primary School', subtype: 'primary_school' },
        ]
      : [
          { name: 'Goodstart Early Learning', subtype: 'child_care_agency' },
          { name: 'Little Scholars Kindergarten', subtype: 'preschool' },
          { name: 'Guardian Childcare', subtype: 'child_care_agency' },
          { name: 'Only About Children', subtype: 'child_care_agency' },
        ];
  return pool.map((p, i) => ({
    name: p.name,
    type: kind,
    subtype: p.subtype,
    distanceM: Math.round(280 + i * 240 + rand() * 180),
    lat,
    lon,
    isDemoData: true,
  })).sort((a, b) => a.distanceM - b.distanceM);
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  kind: PlaceKind,
  radiusM: number = DEFAULT_RADIUS_M,
): Promise<Place[]> {
  const apiKey = ENV_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY') {
    // Surface the misconfiguration loudly — Schools/Childcare will silently
    // fall back to the Noble Park seed data otherwise, and the user will see
    // "Verification Pending" with no hint about why.
    console.warn(
      `[placesService] NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is ${
        !apiKey || apiKey.trim() === '' ? 'missing' : 'still the placeholder'
      }. Falling back to seeded demo data for ${kind} near (${lat.toFixed(4)}, ${lon.toFixed(4)}). ` +
        `Set the key in .env.local and restart \`next dev\` to enable live Google Places.`,
    );
    return buildDemoData(lat, lon, kind);
  }

  try {
    const { data } = await axios.post<PlacesNearbyResponse>(
      PLACES_NEARBY_URL,
      {
        includedTypes: [kind],
        maxResultCount: MAX_RESULTS,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: radiusM,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.location,places.types',
        },
        timeout: 15000,
      },
    );

    const places = data.places ?? [];
    const out: Place[] = [];
    for (const p of places) {
      const name = p.displayName?.text?.trim();
      const loc = p.location;
      if (!name || !loc) continue;
      out.push({
        name,
        type: kind,
        subtype: narrowSubtype(p.types, kind),
        distanceM: haversineM(lat, lon, loc.latitude, loc.longitude),
        lat: loc.latitude,
        lon: loc.longitude,
        isDemoData: false,
      });
    }
    return out.sort((a, b) => a.distanceM - b.distanceM);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data;
      // 400/403 typically means the key is malformed, referrer-restricted to
      // a different domain, or Places API isn't enabled on the GCP project.
      // 429 means quota exhausted. Print enough context to debug from the
      // browser devtools without leaking the key itself.
      console.warn(
        `[placesService] Google Places request failed for ${kind} (HTTP ${status ?? '—'}). ` +
          `Common causes: invalid key, HTTP-referrer restriction mismatch, Places API (New) not enabled, or quota exceeded. ` +
          `Falling back to seeded demo data.`,
        body ?? error.message,
      );
    } else {
      console.warn('[placesService] Unexpected error, falling back to demo data:', error);
    }
    return buildDemoData(lat, lon, kind);
  }
}

/** Friendly label for the Type column. Used by the Schools and
 *  Childcare sub-tabs so the UI carries the same vocabulary as the
 *  Places taxonomy. */
export function placeTypeLabel(p: Pick<Place, 'type' | 'subtype'>, lang: 'en' | 'zh'): string {
  if (p.type === 'school') {
    if (p.subtype === 'primary_school') return lang === 'en' ? 'Primary' : '小学';
    if (p.subtype === 'secondary_school') return lang === 'en' ? 'Secondary' : '中学';
    if (p.subtype === 'university') return lang === 'en' ? 'University' : '大学';
    return lang === 'en' ? 'School' : '学校';
  }
  if (p.subtype === 'preschool') return lang === 'en' ? 'Kindergarten' : '幼儿园';
  if (p.subtype === 'child_care_agency') return lang === 'en' ? 'Childcare' : '托儿所';
  return lang === 'en' ? 'Childcare' : '托儿所';
}
