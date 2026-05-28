/**
 * 地理编码 (Geocoding) — resilient two-tier strategy.
 *
 * Primary:  Vicmap Address point layer (authoritative Victorian dataset,
 *           unit-level precision, published on ArcGIS Online).
 * Fallback: OpenStreetMap Nominatim (global coverage, survives when Vicmap
 *           is slow or unreachable — common on corporate / constrained
 *           networks where ArcGIS Online takes longer than a user will wait).
 *
 * Callers get back `{ result|items, source }` so the UI can surface which
 * dataset answered the query — useful when Vicmap degrades and we want to
 * warn the user that unit-level precision may be lost.
 */

import axios, { AxiosError } from 'axios';

const VICMAP_ADDRESS_URL =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Address/FeatureServer/0/query';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** Hard cap on Vicmap calls — we prefer a fast fallback over a slow answer. */
const VICMAP_TIMEOUT_MS = 3000;
const NOMINATIM_TIMEOUT_MS = 8000;

export type GeocodeSource = 'vicmap' | 'nominatim';

export type GeocodeResult = {
  lat: number;
  lon: number;
  displayName: string;
};

export type GeocodeSuggestion = GeocodeResult & {
  placeId: number;
};

export type GeocodeHit = {
  result: GeocodeResult;
  source: GeocodeSource;
};

export type SuggestionResult = {
  items: GeocodeSuggestion[];
  /** `null` when both providers returned empty or the query was too short. */
  source: GeocodeSource | null;
};

// ---------- Vicmap ----------

type VicmapAttrs = {
  OBJECTID?: number;
  ezi_address?: string;
  blg_unit_id_1?: number | string | null;
  blg_unit_prefix_1?: string | null;
  blg_unit_suffix_1?: string | null;
  house_number_1?: number | string | null;
  road_name?: string | null;
  road_type?: string | null;
  locality_name?: string | null;
  postcode?: string | null;
};

type VicmapFeature = {
  attributes: VicmapAttrs;
  geometry?: { x: number; y: number };
};

type VicmapResponse = {
  features?: VicmapFeature[];
  error?: { message: string };
};

function buildWhere(query: string): string {
  const escaped = query.replace(/'/g, "''").toUpperCase();
  // Tolerate whitespace variants around the unit slash so "1/34 EDWIN ST"
  // also matches Vicmap rows stored as "1 / 34 EDWIN ST" or "1 /34 EDWIN ST".
  // Vicmap's `ezi_address` formatting has historically not been consistent
  // across LGAs and the literal LIKE was dropping unit-prefixed queries.
  const unitMatch = escaped.match(/^([0-9A-Z]+)\s*\/\s*(.+)$/);
  if (unitMatch) {
    const [, unit, rest] = unitMatch;
    // Esri SQL LIKE uses single-character `_` wildcards; we cover the three
    // observed Vicmap spellings (`U/L`, `U /L`, `U/ L`, `U / L`) by OR-ing
    // explicit patterns rather than relying on undocumented regex support.
    const variants = [
      `${unit}/${rest}`,
      `${unit} /${rest}`,
      `${unit}/ ${rest}`,
      `${unit} / ${rest}`,
    ];
    return variants
      .map((v) => `UPPER(ezi_address) LIKE '${v}%'`)
      .join(' OR ');
  }
  return `UPPER(ezi_address) LIKE '${escaped}%'`;
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());
}

async function queryVicmap(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<VicmapFeature[]> {
  const params = {
    where: buildWhere(query),
    outFields:
      'OBJECTID,ezi_address,blg_unit_id_1,blg_unit_prefix_1,blg_unit_suffix_1,house_number_1,road_name,road_type,locality_name,postcode',
    returnGeometry: true,
    outSR: 4326,
    f: 'json',
    resultRecordCount: limit,
    orderByFields: 'ezi_address ASC',
  };
  const { data } = await axios.get<VicmapResponse>(VICMAP_ADDRESS_URL, {
    params,
    timeout: VICMAP_TIMEOUT_MS,
    signal,
  });
  if (data.error) throw new Error(`Vicmap error: ${data.error.message}`);
  return data.features ?? [];
}

/**
 * Build the canonical "3/12 Collins Street Mentone 3194" string from a
 * Vicmap feature. We prefer `ezi_address` (already formatted by Vicmap),
 * but synthesise from the component fields if it is missing or — defensively —
 * if it has lost the unit prefix that the unit-id field still carries.
 */
function vicmapDisplayName(attrs: VicmapAttrs): string | null {
  const ezi =
    typeof attrs.ezi_address === 'string' && attrs.ezi_address.trim().length > 0
      ? attrs.ezi_address.trim()
      : null;

  const unitParts = [
    attrs.blg_unit_prefix_1,
    attrs.blg_unit_id_1 != null ? String(attrs.blg_unit_id_1) : null,
    attrs.blg_unit_suffix_1,
  ]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join('');
  const unit = unitParts.length > 0 ? unitParts : null;

  if (ezi) {
    // Defensive: re-attach the unit prefix if Vicmap gave it back to us
    // separately but stripped it from `ezi_address` (rare, but cheap to guard).
    if (unit && !ezi.startsWith(`${unit}/`)) {
      return `${unit}/${ezi}`;
    }
    return ezi;
  }

  // Synthesise from components when ezi_address is empty.
  const house =
    attrs.house_number_1 != null ? String(attrs.house_number_1) : null;
  const road = [attrs.road_name, attrs.road_type]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(' ');
  const locality =
    typeof attrs.locality_name === 'string' ? attrs.locality_name.trim() : '';
  const postcode =
    typeof attrs.postcode === 'string' ? attrs.postcode.trim() : '';

  // House synthesis: keep the unit prefix even when `house_number_1` is
  // missing (rare Vicmap rows where the unit row only carries unit fields).
  // Without this guard, `unit && house` collapses to `''` and the unit is
  // silently dropped — surfacing as "1/" in the UI when downstream callers
  // re-prepend the user-typed unit prefix.
  const housePart = unit && house
    ? `${unit}/${house}`
    : house ?? unit ?? '';
  const composed = [housePart, road, locality, postcode]
    .filter((s) => s.length > 0)
    .join(' ');
  // Reject results that only have a unit fragment with no road/locality —
  // they would surface to the user as "1/" or "1/MENTONE" and confuse the
  // selection flow more than dropping the row entirely.
  if (composed.length === 0) return null;
  if (road.length === 0 && !house) return null;
  return composed;
}

function vicmapFeatureToResult(f: VicmapFeature): GeocodeResult | null {
  const lat = f.geometry?.y;
  const lon = f.geometry?.x;
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }
  const raw = vicmapDisplayName(f.attributes);
  if (!raw) return null;
  return { lat, lon, displayName: toTitleCase(raw) };
}

// ---------- Nominatim ----------

type NominatimItem = {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  };
};

async function queryNominatim(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<NominatimItem[]> {
  const { data } = await axios.get<NominatimItem[]>(NOMINATIM_URL, {
    params: {
      q: query,
      format: 'json',
      countrycodes: 'au',
      limit,
      addressdetails: 1, // Enable address component extraction
      // Fence to Victoria so the fallback does not surface NSW / SA noise
      // when the user meant a Victorian address that Vicmap failed to serve.
      viewbox: '140.96,-39.16,150.0,-33.98',
      bounded: 1,
    },
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
    timeout: NOMINATIM_TIMEOUT_MS,
    signal,
  });
  return Array.isArray(data) ? data : [];
}

function nominatimItemToResult(i: NominatimItem): GeocodeResult | null {
  const lat = parseFloat(i.lat);
  const lon = parseFloat(i.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  // Construct full address from components to ensure house number is included
  if (i.address) {
    const houseNumber = i.address.house_number || '';
    const road = i.address.road || '';
    const suburb = i.address.suburb || i.address.city || i.address.town || '';
    const postcode = i.address.postcode || '';

    // Build full address: "60 Chandler Road, Noble Park 3174"
    const parts = [
      houseNumber && road ? `${houseNumber} ${road}` : road || houseNumber,
      suburb,
      postcode,
    ].filter((s) => s.length > 0);

    if (parts.length > 0) {
      const fullAddress = parts.join(', ');
      return { lat, lon, displayName: fullAddress };
    }
  }

  // Fallback to display_name if address components are missing
  return { lat, lon, displayName: i.display_name };
}

// ---------- Error classification ----------

/**
 * True when an error is a user-initiated abort rather than a network failure.
 * Aborted requests should not trigger the fallback — the caller has moved on.
 */
function isAbort(e: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (axios.isCancel(e)) return true;
  if (e instanceof AxiosError && e.code === 'ERR_CANCELED') return true;
  return false;
}

// ---------- Public API ----------

/**
 * Returns the leading unit prefix (e.g. `"3"` from `"3/12 Collins Street"`)
 * if the user typed one, else `null`. Used to re-attach unit context that
 * downstream fallbacks (lot-only retry, Nominatim) would otherwise strip.
 */
function extractUnitPrefix(query: string): string | null {
  const m = query.trim().match(/^([0-9A-Za-z]+)\s*\//);
  return m ? m[1] : null;
}

function withUnitPrefix(result: GeocodeResult, unit: string): GeocodeResult {
  if (result.displayName.startsWith(`${unit}/`)) return result;
  return { ...result, displayName: `${unit}/${result.displayName}` };
}

export async function geocodeAddress(
  query: string,
): Promise<GeocodeHit | null> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;
  const userUnit = extractUnitPrefix(trimmed);

  // Primary: Vicmap, as typed (preserves "3/12 ..." unit prefix).
  try {
    const features = await queryVicmap(trimmed, 1);
    for (const f of features) {
      const r = vicmapFeatureToResult(f);
      if (r) return { result: r, source: 'vicmap' };
    }

    // Vicmap-internal fallback: drop the unit prefix and retry the parent lot,
    // then re-attach the user's typed unit prefix so the display name stays
    // accurate to what they entered.
    if (userUnit) {
      const slashIdx = trimmed.indexOf('/');
      const lotOnly = trimmed.slice(slashIdx + 1).trim();
      if (lotOnly.length > 0) {
        const retried = await queryVicmap(lotOnly, 1);
        for (const f of retried) {
          const r = vicmapFeatureToResult(f);
          if (r) {
            return { result: withUnitPrefix(r, userUnit), source: 'vicmap' };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[geocodeAddress] Vicmap failed, falling back to Nominatim', e);
  }

  // Cross-provider fallback: Nominatim (also re-attach the unit prefix).
  try {
    const items = await queryNominatim(trimmed, 1);
    for (const i of items) {
      const r = nominatimItemToResult(i);
      if (r) {
        const final = userUnit ? withUnitPrefix(r, userUnit) : r;
        return { result: final, source: 'nominatim' };
      }
    }
  } catch (e) {
    console.warn('[geocodeAddress] Nominatim fallback failed', e);
  }

  return null;
}

export async function geocodeSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<SuggestionResult> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return { items: [], source: null };
  const userUnit = extractUnitPrefix(trimmed);

  // Primary: Vicmap.
  try {
    const features = await queryVicmap(trimmed, 6, signal);
    const items: GeocodeSuggestion[] = [];
    for (let i = 0; i < features.length; i++) {
      const r = vicmapFeatureToResult(features[i]);
      if (!r) continue;
      const oid = features[i].attributes.OBJECTID;
      items.push({
        ...r,
        placeId: typeof oid === 'number' ? oid : i,
      });
    }
    if (items.length > 0) return { items, source: 'vicmap' };

    // Vicmap-internal fallback for unit queries: drop the unit prefix and
    // retry the parent lot, then re-attach the user-typed unit to each
    // suggestion's display name. Mirrors the lot-only retry in
    // `geocodeAddress` so the dropdown doesn't silently fall back to
    // Nominatim when Vicmap can resolve the lot but not the unit row.
    if (userUnit) {
      const slashIdx = trimmed.indexOf('/');
      const lotOnly = trimmed.slice(slashIdx + 1).trim();
      if (lotOnly.length > 0) {
        const retried = await queryVicmap(lotOnly, 6, signal);
        const retryItems: GeocodeSuggestion[] = [];
        for (let i = 0; i < retried.length; i++) {
          const r = vicmapFeatureToResult(retried[i]);
          if (!r) continue;
          const oid = retried[i].attributes.OBJECTID;
          retryItems.push({
            ...withUnitPrefix(r, userUnit),
            placeId: typeof oid === 'number' ? oid : i,
          });
        }
        if (retryItems.length > 0) return { items: retryItems, source: 'vicmap' };
      }
    }
    // Zero results is treated as "Vicmap worked but knows nothing" — still
    // try Nominatim so the user sees something rather than a dead dropdown.
  } catch (e) {
    if (isAbort(e, signal)) return { items: [], source: null };
    console.warn('[geocodeSuggestions] Vicmap failed, falling back', e);
  }

  // Cross-provider fallback: Nominatim. Re-attach the user's typed unit
  // prefix so the dropdown items don't silently drop "3/" when Vicmap missed.
  try {
    const raw = await queryNominatim(trimmed, 5, signal);
    const items: GeocodeSuggestion[] = [];
    for (let i = 0; i < raw.length; i++) {
      const r = nominatimItemToResult(raw[i]);
      if (!r) continue;
      const final = userUnit ? withUnitPrefix(r, userUnit) : r;
      const pid = raw[i].place_id;
      items.push({
        ...final,
        placeId: typeof pid === 'number' ? pid : i,
      });
    }
    return { items, source: items.length > 0 ? 'nominatim' : null };
  } catch (e) {
    if (isAbort(e, signal)) return { items: [], source: null };
    console.warn('[geocodeSuggestions] Nominatim fallback failed', e);
    return { items: [], source: null };
  }
}

export async function reverseGeocodeNearest(
  lon: number,
  lat: number,
  searchRadiusMetres = 80,
): Promise<GeocodeHit | null> {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  // Primary: Vicmap point-buffer search.
  try {
    const params = {
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: 4326,
      spatialRel: 'esriSpatialRelIntersects',
      distance: searchRadiusMetres,
      units: 'esriSRUnit_Meter',
      outFields: 'OBJECTID,ezi_address',
      returnGeometry: true,
      outSR: 4326,
      f: 'json',
      resultRecordCount: 1,
    };
    const { data } = await axios.get<VicmapResponse>(VICMAP_ADDRESS_URL, {
      params,
      timeout: VICMAP_TIMEOUT_MS,
    });
    if (data.error) throw new Error(`Vicmap error: ${data.error.message}`);
    const feature = data.features?.[0];
    const r = feature ? vicmapFeatureToResult(feature) : null;
    if (r) return { result: r, source: 'vicmap' };
  } catch (e) {
    console.warn('[reverseGeocodeNearest] Vicmap failed, falling back', e);
  }

  // Cross-provider fallback: Nominatim reverse.
  try {
    const { data } = await axios.get<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        state?: string;
        postcode?: string;
      };
    }>('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon, format: 'json', addressdetails: 1 },
      headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      timeout: NOMINATIM_TIMEOUT_MS,
    });
    if (
      typeof data.lat === 'string' &&
      typeof data.lon === 'string' &&
      typeof data.display_name === 'string'
    ) {
      const rLat = parseFloat(data.lat);
      const rLon = parseFloat(data.lon);
      if (Number.isFinite(rLat) && Number.isFinite(rLon)) {
        // Construct full address from components to ensure house number is included
        let displayName = data.display_name;
        if (data.address) {
          const houseNumber = data.address.house_number || '';
          const road = data.address.road || '';
          const suburb = data.address.suburb || data.address.city || data.address.town || '';
          const postcode = data.address.postcode || '';

          // Build full address: "60 Chandler Road, Noble Park 3174"
          const parts = [
            houseNumber && road ? `${houseNumber} ${road}` : road || houseNumber,
            suburb,
            postcode,
          ].filter((s) => s.length > 0);

          if (parts.length > 0) {
            displayName = parts.join(', ');
          }
        }

        return {
          result: { lat: rLat, lon: rLon, displayName },
          source: 'nominatim',
        };
      }
    }
  } catch (e) {
    console.warn('[reverseGeocodeNearest] Nominatim fallback failed', e);
  }

  return null;
}
