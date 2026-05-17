/**
 * 维多利亚州规划方案 (Victoria Planning Scheme) live data — point queries
 * against the authoritative Vicmap Planning FeatureServer published by the
 * Victorian Government on ArcGIS Online.
 *
 * Service: services-ap1.arcgis.com/P744lA0wf4LlBZ84/.../Vicmap_Planning
 *   - Layer 3: PLAN_ZONE    (Planning scheme zones)
 *   - Layer 2: PLAN_OVERLAY (Planning scheme overlay)
 *
 * Verified field names (both layers, lowercase): scheme_code, zone_code,
 * zone_description. `scheme_code` on the overlay layer carries the overlay
 * type code (e.g. "HO", "BMO", "LSIO" — with numeric suffixes for schedules).
 */

import axios from 'axios';

import type { OverlayCode } from './feasibility';

const ARC_BASE =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services';

const ZONES_URL = `${ARC_BASE}/Vicmap_Planning/FeatureServer/3/query`;
const OVERLAYS_URL = `${ARC_BASE}/Vicmap_Planning/FeatureServer/2/query`;

type ArcgisFeature = { attributes: Record<string, unknown> };
type ArcgisResponse = { features?: ArcgisFeature[]; error?: { message: string } };

export type VicPlanData = {
  zoneCode: string | null;
  zoneDescription: string | null;
  /** Disqualifying overlay codes recognised by the SSD engine. */
  overlayCodes: OverlayCode[];
  /** Raw scheme codes returned by ArcGIS (e.g. "HO123", "BMO", "LSIO"). */
  overlayRaw: string[];
};

async function pointQuery(
  url: string,
  lon: number,
  lat: number,
): Promise<ArcgisFeature[]> {
  const params = {
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: 4326,
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: false,
    f: 'json',
  };
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  console.debug('[vicPlanApi] GET', `${url}?${qs}`);

  const { data } = await axios.get<ArcgisResponse>(url, {
    params,
    timeout: 20000,
  });

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }
  return data.features ?? [];
}

function readString(
  attrs: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = attrs[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function classifyOverlay(raw: string): OverlayCode | null {
  const upper = raw.toUpperCase();
  // LSIO is Land Subject to Inundation Overlay → maps to FO category.
  if (upper.startsWith('LSIO') || upper.startsWith('FO')) return 'FO';
  if (upper.startsWith('BMO')) return 'BMO';
  if (upper.startsWith('SBO')) return 'SBO';
  if (upper.startsWith('HO')) return 'HO';
  if (upper.startsWith('PO')) return 'PO';
  if (upper.startsWith('DDO')) return 'DDO';
  if (upper.startsWith('DCPO')) return 'DCPO';
  return null;
}

export async function fetchVicPlanForPoint(
  lon: number,
  lat: number,
): Promise<VicPlanData> {
  const [zoneFeatures, overlayFeatures] = await Promise.all([
    pointQuery(ZONES_URL, lon, lat),
    pointQuery(OVERLAYS_URL, lon, lat),
  ]);

  const zoneAttrs = zoneFeatures[0]?.attributes;
  const zoneCode = zoneAttrs ? readString(zoneAttrs, 'zone_code') : null;
  const zoneDescription = zoneAttrs
    ? readString(zoneAttrs, 'zone_description')
    : null;

  const overlayRaw: string[] = [];
  const overlaySet = new Set<OverlayCode>();

  for (const f of overlayFeatures) {
    const raw = readString(f.attributes, 'scheme_code') ?? '';
    if (raw.length === 0) continue;
    overlayRaw.push(raw);
    const cls = classifyOverlay(raw);
    if (cls) overlaySet.add(cls);
  }

  return {
    zoneCode,
    zoneDescription,
    overlayCodes: Array.from(overlaySet),
    overlayRaw,
  };
}

const PARCEL_URL = `${ARC_BASE}/Vicmap_Parcel/FeatureServer/0/query`;

export type ParcelPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

type ArcgisPolygonFeature = {
  geometry?: { rings?: number[][][] };
};

type ArcgisPolygonResponse = {
  features?: ArcgisPolygonFeature[];
  error?: { message: string };
};

/**
 * The SPI (Standard Parcel Identifier) is the statewide-unique cadastral
 * key Vicmap publishes on every parcel — typically formatted as
 * `<lot>\<plan>` (e.g. `1\TP123456`). It is the field the Surveyor-General
 * and the Land Use Victoria title workflow both quote, so we surface it on
 * the parcel point query for downstream report consumers.
 */
type ArcgisAttributedParcelFeature = {
  attributes?: { SPI?: string | null };
  geometry?: { rings?: number[][][] };
};

type ArcgisAttributedParcelResponse = {
  features?: ArcgisAttributedParcelFeature[];
  error?: { message: string };
};

export type ParcelPointResult = {
  polygon: ParcelPolygon;
  spi: string | null;
};

/**
 * Fetch the cadastral parcel polygon (PARCEL_MP) containing the given point.
 * Returns null if no parcel intersects (e.g. road reserve, unsubdivided land).
 * ArcGIS polygon `rings` map 1:1 onto GeoJSON Polygon `coordinates` — same
 * outer-ring-first ordering, same nesting depth. SPI is read from
 * the parcel attributes when present; null when the field is empty
 * (some Crown / unsurveyed lots carry no SPI).
 */
export async function fetchVicParcelForPoint(
  lon: number,
  lat: number,
): Promise<ParcelPointResult | null> {
  const params = {
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: 4326,
    outSR: 4326,
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: true,
    outFields: 'SPI',
    f: 'json',
  };

  const { data } = await axios.get<ArcgisAttributedParcelResponse>(PARCEL_URL, {
    params,
    timeout: 20000,
  });

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  const feature = data.features?.[0];
  const rings = feature?.geometry?.rings;
  if (!rings || rings.length === 0) return null;

  const rawSpi = feature?.attributes?.SPI;
  const spi =
    typeof rawSpi === 'string' && rawSpi.trim().length > 0 ? rawSpi.trim() : null;

  return {
    polygon: { type: 'Polygon', coordinates: rings },
    spi,
  };
}

/**
 * Area-weighted centroid of a polygon's outer ring (Green's theorem),
 * computed in lon/lat space. Accurate enough for cadastral-scale parcels
 * where the planar approximation introduces sub-metre error.
 */
export function polygonCentroid(ring: number[][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];

  let cx = 0;
  let cy = 0;
  let area = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const [x0, y0] = closed[i];
    const [x1, y1] = closed[i + 1];
    const cross = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
    area += cross;
  }
  area /= 2;
  if (area === 0) return [closed[0][0], closed[0][1]];
  return [cx / (6 * area), cy / (6 * area)];
}

// Vicmap building footprints live on layer 7 (BUILDING_POLYGON) of the
// Vicmap_Features_of_Interest service — confirmed via the ArcGIS Online
// listing under owner Vicmap_Prod. The earlier `Vicmap_Building` path was a
// guess that the service does not publish.
const BUILDING_URL = `${ARC_BASE}/Vicmap_Features_of_Interest/FeatureServer/7/query`;

// ---------- Planning Overlay polygons (Phase A & B vector layers) ----------

/**
 * Category buckets the map UI exposes as toggleable layers. Each bucket
 * groups every Vicmap `scheme_code` whose prefix maps to it via
 * `OVERLAY_CATEGORY_PREFIXES` — e.g. "HO" matches "HO123", "BMO"
 * matches "BMO1", "FO" matches "FO", the legacy "LSIO" (Land Subject
 * to Inundation Overlay), and "SBO" (Special Building Overlay —
 * stormwater flow path; bundled into the unified water-hazard layer
 * because architects assess all three under the same flood-resilience
 * brief).
 */
export type OverlayLayerCategory = 'HO' | 'BMO' | 'FO';

const OVERLAY_CATEGORY_PREFIXES: Record<OverlayLayerCategory, string[]> = {
  HO: ['HO'],
  BMO: ['BMO'],
  FO: ['FO', 'LSIO', 'SBO'],
};

export type OverlayPolygonFeature = {
  type: 'Feature';
  properties: {
    category: OverlayLayerCategory;
    /** Raw scheme_code as published by Vicmap (e.g. "HO123"). */
    schemeCode: string;
  };
  geometry: ParcelPolygon;
};

type ArcgisOverlayFeature = {
  attributes?: { scheme_code?: string | null };
  geometry?: { rings?: number[][][] };
};

type ArcgisOverlayResponse = {
  features?: ArcgisOverlayFeature[];
  error?: { message: string };
};

/**
 * Fetch planning overlay polygons intersecting the supplied bbox, filtered
 * to the requested categories. The Vicmap PLAN_OVERLAY layer publishes
 * `scheme_code` per feature — we build a single LIKE-disjunction WHERE
 * clause so one HTTP call covers every requested category, then tag each
 * returned feature with its bucket so the MapPreview can sort it into
 * the correct GeoJSON source.
 *
 * Returns an empty array on any failure (service unreachable, no
 * matching features, or unexpected geometry shape) — the map renders
 * cleanly without overlays rather than throwing.
 */
export async function fetchOverlayPolygonsForBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  categories: OverlayLayerCategory[],
  signal?: AbortSignal,
): Promise<OverlayPolygonFeature[]> {
  if (categories.length === 0) return [];

  const prefixes = Array.from(
    new Set(categories.flatMap((c) => OVERLAY_CATEGORY_PREFIXES[c])),
  );
  const where = prefixes
    .map((p) => `scheme_code LIKE '${p}%'`)
    .join(' OR ');

  try {
    const { data } = await axios.get<ArcgisOverlayResponse>(OVERLAYS_URL, {
      params: {
        where,
        geometry: `${west},${south},${east},${north}`,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        returnGeometry: true,
        outFields: 'scheme_code',
        resultRecordCount: 1500,
        f: 'json',
      },
      timeout: 20000,
      signal,
    });

    if (data.error) return [];
    const features = data.features ?? [];
    const out: OverlayPolygonFeature[] = [];
    for (const f of features) {
      const rings = f.geometry?.rings;
      if (!rings || rings.length === 0) continue;
      const raw = f.attributes?.scheme_code;
      if (typeof raw !== 'string' || raw.length === 0) continue;
      const upper = raw.toUpperCase();
      const category = classifyOverlayCategory(upper);
      if (!category || !categories.includes(category)) continue;
      out.push({
        type: 'Feature',
        properties: { category, schemeCode: raw },
        geometry: { type: 'Polygon', coordinates: rings },
      });
    }
    return out;
  } catch (error) {
    if (axios.isCancel(error)) return [];
    console.warn('[vicOverlayPolygons] fetch failed:', error);
    return [];
  }
}

function classifyOverlayCategory(upper: string): OverlayLayerCategory | null {
  if (upper.startsWith('HO')) return 'HO';
  if (upper.startsWith('BMO')) return 'BMO';
  if (
    upper.startsWith('FO') ||
    upper.startsWith('LSIO') ||
    upper.startsWith('SBO')
  ) {
    return 'FO';
  }
  return null;
}

export type ParcelFeature = {
  type: 'Feature';
  properties: {
    LOT_NUMBER: string | null;
    PLAN_NUMBER: string | null;
    PARCEL_PFI: string | null;
  };
  geometry: ParcelPolygon;
};

type ArcgisAttributedPolygonFeature = {
  attributes?: {
    LOT_NUMBER?: string | number | null;
    PLAN_NUMBER?: string | null;
    PARCEL_PFI?: string | null;
  };
  geometry?: { rings?: number[][][] };
};

type ArcgisAttributedPolygonResponse = {
  features?: ArcgisAttributedPolygonFeature[];
  error?: { message: string };
};

/**
 * Fetch every cadastral parcel intersecting the supplied bbox.
 * The MapPreview re-issues this on `moveend` once zoom >= 16, so it
 * stays cheap at city zooms (no call) and bounded at parcel zoom.
 * Returns an empty array on any failure.
 */
export async function fetchVicParcelsForBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  signal?: AbortSignal,
): Promise<ParcelFeature[]> {
  const bbox = `${west},${south},${east},${north}`;
  try {
    const { data } = await axios.get<ArcgisAttributedPolygonResponse>(PARCEL_URL, {
      params: {
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        returnGeometry: true,
        outFields: 'LOT_NUMBER,PLAN_NUMBER,PARCEL_PFI',
        resultRecordCount: 1500,
        f: 'json',
      },
      timeout: 20000,
      signal,
    });
    if (data.error) return [];
    const features = data.features ?? [];
    const out: ParcelFeature[] = [];
    for (const f of features) {
      const rings = f.geometry?.rings;
      if (!rings || rings.length === 0) continue;
      const a = f.attributes ?? {};
      const lotRaw = a.LOT_NUMBER;
      const lot =
        lotRaw === null || lotRaw === undefined || lotRaw === ''
          ? null
          : String(lotRaw);
      out.push({
        type: 'Feature',
        properties: {
          LOT_NUMBER: lot,
          PLAN_NUMBER: a.PLAN_NUMBER ?? null,
          PARCEL_PFI: a.PARCEL_PFI ?? null,
        },
        geometry: { type: 'Polygon', coordinates: rings },
      });
    }
    return out;
  } catch (error) {
    if (axios.isCancel(error)) return [];
    console.warn('[vicParcelsBbox] fetch failed:', error);
    return [];
  }
}

/**
 * Fetch Vicmap building footprints intersecting a small bounding box around
 * the given point (~150 m radius). Returns an empty array if the service is
 * unreachable, returns no features, or returns geometry in an unexpected
 * shape — the map renders cleanly without buildings rather than throwing.
 *
 * Note: the endpoint URL is the conventional Vicmap_Building service path.
 * If the service has been renamed by DELWP, this returns an empty array and
 * the map falls back to the built-in Mapbox buildings (which we hide via
 * paint overrides) — so the user sees the parcel boundary only.
 */
export async function fetchVicBuildingsForArea(
  lon: number,
  lat: number,
  radiusM = 150,
): Promise<ParcelPolygon[]> {
  // 1° latitude ≈ 111,320 m; longitude ≈ cos(lat) × 111,320 m.
  const dLat = radiusM / 111320;
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`;

  try {
    const { data } = await axios.get<ArcgisPolygonResponse>(BUILDING_URL, {
      params: {
        geometry: bbox,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        returnGeometry: true,
        outFields: '',
        f: 'json',
      },
      timeout: 15000,
    });

    if (data.error) return [];
    const features = data.features ?? [];
    const out: ParcelPolygon[] = [];
    for (const f of features) {
      const rings = f.geometry?.rings;
      if (rings && rings.length > 0) {
        out.push({ type: 'Polygon', coordinates: rings });
      }
    }
    return out;
  } catch (error) {
    console.warn('[vicBuildings] fetch failed:', error);
    return [];
  }
}
