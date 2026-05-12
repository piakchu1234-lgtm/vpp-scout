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
  if (upper.startsWith('HO')) return 'HO';
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
 * Fetch the cadastral parcel polygon (PARCEL_MP) containing the given point.
 * Returns null if no parcel intersects (e.g. road reserve, unsubdivided land).
 * ArcGIS polygon `rings` map 1:1 onto GeoJSON Polygon `coordinates` — same
 * outer-ring-first ordering, same nesting depth.
 */
export async function fetchVicParcelForPoint(
  lon: number,
  lat: number,
): Promise<ParcelPolygon | null> {
  const params = {
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: 4326,
    outSR: 4326,
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: true,
    outFields: '',
    f: 'json',
  };

  const { data } = await axios.get<ArcgisPolygonResponse>(PARCEL_URL, {
    params,
    timeout: 20000,
  });

  if (data.error) {
    throw new Error(`ArcGIS error: ${data.error.message}`);
  }

  const rings = data.features?.[0]?.geometry?.rings;
  if (!rings || rings.length === 0) return null;

  return { type: 'Polygon', coordinates: rings };
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
