/**
 * Spatial helpers for the "Spatial Dynamic" map layer — derive a proposed
 * building footprint sized to GFA, plus a split-line for the dual-occupancy
 * simulation. All geometry stays in EPSG:4326; metres are reconstructed via
 * the local-tangent approximation (1° lat ≈ 111 320 m, longitude scaled by
 * cos(lat)). Adequate at parcel scale where the planar error is sub-metre.
 */

import type { ParcelPolygon } from './vicPlanApi';

type LonLat = [number, number];

function bboxOfRing(ring: number[][]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [x, y] of ring) {
    if (x < minLon) minLon = x;
    if (y < minLat) minLat = y;
    if (x > maxLon) maxLon = x;
    if (y > maxLat) maxLat = y;
  }
  return { minLon, minLat, maxLon, maxLat };
}

function metresPerDegree(lat: number): { lon: number; lat: number } {
  const latRad = (lat * Math.PI) / 180;
  return {
    lat: 111320,
    lon: 111320 * Math.cos(latRad),
  };
}

/**
 * Build a rectangle of `targetGfaM2` area, centred at `centre`, in the
 * aspect ratio of the parcel bbox, expressed as a GeoJSON Polygon. The
 * rectangle is capped so it never exceeds `maxBboxFrac` of the parcel
 * bbox's shorter side — preventing visual overlap with the setback line
 * even before any envelope-clip step.
 */
export function computeProposedFootprint(
  parcel: ParcelPolygon | null,
  targetGfaM2: number,
  options?: {
    subdivided?: boolean;
    maxBboxFrac?: number;
  },
): ParcelPolygon | null {
  if (!parcel || parcel.coordinates.length === 0 || targetGfaM2 <= 0) return null;
  const subdivided = options?.subdivided ?? false;
  const maxFrac = options?.maxBboxFrac ?? 0.85;

  const outer = parcel.coordinates[0];
  const { minLon, minLat, maxLon, maxLat } = bboxOfRing(outer);
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const m = metresPerDegree(midLat);

  let bboxWm = (maxLon - minLon) * m.lon;
  let bboxHm = (maxLat - minLat) * m.lat;
  if (bboxWm <= 0 || bboxHm <= 0) return null;

  // For the subdivision simulation: halve along the longer axis. The proposed
  // footprint sits in the half offset toward positive longitude / latitude
  // (read as "rear half" — orientation-agnostic placeholder, the dual-occ
  // split itself is what matters for the geometry check, not which child lot
  // is chosen).
  let centreLon = midLon;
  let centreLat = midLat;
  if (subdivided) {
    if (bboxWm >= bboxHm) {
      bboxWm /= 2;
      centreLon = midLon + bboxWm / 2 / m.lon;
    } else {
      bboxHm /= 2;
      centreLat = midLat + bboxHm / 2 / m.lat;
    }
  }

  const aspect = bboxWm / bboxHm;
  let rectHm = Math.sqrt(targetGfaM2 / aspect);
  let rectWm = aspect * rectHm;

  // Cap so the rectangle fits comfortably inside the (sub-)parcel bbox.
  const maxWm = bboxWm * maxFrac;
  const maxHm = bboxHm * maxFrac;
  if (rectWm > maxWm) {
    const scale = maxWm / rectWm;
    rectWm = maxWm;
    rectHm *= scale;
  }
  if (rectHm > maxHm) {
    const scale = maxHm / rectHm;
    rectHm = maxHm;
    rectWm *= scale;
  }

  const halfW = rectWm / 2 / m.lon;
  const halfH = rectHm / 2 / m.lat;
  const ring: number[][] = [
    [centreLon - halfW, centreLat - halfH],
    [centreLon + halfW, centreLat - halfH],
    [centreLon + halfW, centreLat + halfH],
    [centreLon - halfW, centreLat + halfH],
    [centreLon - halfW, centreLat - halfH],
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

/**
 * A straight line through the parcel centroid, perpendicular to the longer
 * bbox axis, spanning the full bbox. Renders as the dashed dual-occupancy
 * subdivision line.
 */
export function computeSplitLine(
  parcel: ParcelPolygon | null,
): [LonLat, LonLat] | null {
  if (!parcel || parcel.coordinates.length === 0) return null;
  const outer = parcel.coordinates[0];
  const { minLon, minLat, maxLon, maxLat } = bboxOfRing(outer);
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const m = metresPerDegree(midLat);
  const bboxWm = (maxLon - minLon) * m.lon;
  const bboxHm = (maxLat - minLat) * m.lat;
  if (bboxWm >= bboxHm) {
    return [
      [midLon, minLat],
      [midLon, maxLat],
    ];
  }
  return [
    [minLon, midLat],
    [maxLon, midLat],
  ];
}
