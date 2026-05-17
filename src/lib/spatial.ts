/**
 * Spatial helpers for the "Spatial Dynamic" map layer — derive a proposed
 * building footprint sized to GFA, plus a split-line for the dual-occupancy
 * simulation. All geometry stays in EPSG:4326; metres are reconstructed via
 * the local-tangent approximation (1° lat ≈ 111 320 m, longitude scaled by
 * cos(lat)). Adequate at parcel scale where the planar error is sub-metre.
 */

import type { ParcelPolygon } from './vicPlanApi';
import { polygonCentroid } from './vicPlanApi';
import { area as turfArea } from '@turf/area';

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

// ---------- Built-form metrics ----------
// Site coverage and setback derivations operate on the parcel outer ring
// plus the Vicmap building footprints returned by `fetchVicBuildingsForArea`.
// Buildings outside the parcel are filtered out via a centroid point-in-polygon
// test; that's adequate for cadastral building data, which rarely straddles
// lot lines. Distances are reconstructed in the local tangent plane around
// the parcel centroid using `metresPerDegree(lat)` — sub-metre error at
// parcel scale.

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function filterBuildingsInParcel(
  parcel: ParcelPolygon,
  buildings: ParcelPolygon[],
): ParcelPolygon[] {
  const ring = parcel.coordinates[0];
  if (!ring || ring.length < 3) return [];
  return buildings.filter((b) => {
    const bRing = b.coordinates[0];
    if (!bRing || bRing.length < 3) return false;
    const [cLon, cLat] = polygonCentroid(bRing);
    return pointInRing(cLon, cLat, ring);
  });
}

export type SiteCoverage = {
  coveredM2: number;
  lotM2: number;
  pct: number;
};

export function computeSiteCoverage(
  parcel: ParcelPolygon,
  buildings: ParcelPolygon[],
): SiteCoverage | null {
  const ring = parcel.coordinates[0];
  if (!ring || ring.length < 3) return null;
  const lotM2 = turfArea({ type: 'Polygon', coordinates: parcel.coordinates });
  if (lotM2 <= 0) return null;
  const onLot = filterBuildingsInParcel(parcel, buildings);
  let coveredM2 = 0;
  for (const b of onLot) {
    coveredM2 += turfArea({ type: 'Polygon', coordinates: b.coordinates });
  }
  return {
    coveredM2: Math.round(coveredM2),
    lotM2: Math.round(lotM2),
    pct: Math.min(100, (coveredM2 / lotM2) * 100),
  };
}

// Project a lon/lat point into the local tangent plane (metres) anchored
// at `origin`. Distances and dot products in this plane are accurate to
// sub-metre at parcel scale.
function toLocalMetres(
  origin: LonLat,
  point: LonLat,
): { x: number; y: number } {
  const m = metresPerDegree(origin[1]);
  return {
    x: (point[0] - origin[0]) * m.lon,
    y: (point[1] - origin[1]) * m.lat,
  };
}

function pointToSegmentDistanceM(
  origin: LonLat,
  p: LonLat,
  a: LonLat,
  b: LonLat,
): number {
  const pm = toLocalMetres(origin, p);
  const am = toLocalMetres(origin, a);
  const bm = toLocalMetres(origin, b);
  const dx = bm.x - am.x;
  const dy = bm.y - am.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = pm.x - am.x;
    const ey = pm.y - am.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((pm.x - am.x) * dx + (pm.y - am.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = am.x + t * dx;
  const cy = am.y + t * dy;
  const ex = pm.x - cx;
  const ey = pm.y - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

function segmentLengthM(origin: LonLat, a: LonLat, b: LonLat): number {
  const am = toLocalMetres(origin, a);
  const bm = toLocalMetres(origin, b);
  const dx = bm.x - am.x;
  const dy = bm.y - am.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export type Setbacks = {
  frontM: number;
  rearM: number;
  sideMinM: number;
};

/**
 * Derive minimum front / rear / side setbacks by measuring the gap between
 * each cadastral edge and the nearest corner of any on-lot building.
 *
 * Convention: the longest edge of the parcel ring is treated as the street
 * frontage (matches `detectOrientation` in propertyGeometry.ts). The edge
 * with the largest centroid-to-centroid offset perpendicular to the front
 * is the rear; the remaining two edges are sides, and we surface the
 * smaller of the two as the binding side setback.
 *
 * Returns `null` when there are no on-lot buildings — an empty lot has
 * no setbacks to report.
 */
export function computeSetbacks(
  parcel: ParcelPolygon,
  buildings: ParcelPolygon[],
): Setbacks | null {
  const ring = parcel.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const onLot = filterBuildingsInParcel(parcel, buildings);
  if (onLot.length === 0) return null;

  // Closed ring may repeat the first vertex; iterate the open version.
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const verts = closed ? ring.slice(0, -1) : ring;
  if (verts.length < 3) return null;

  const origin: LonLat = polygonCentroid(ring);

  type Edge = {
    a: LonLat;
    b: LonLat;
    mid: LonLat;
    lengthM: number;
  };
  const edges: Edge[] = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i] as LonLat;
    const b = verts[(i + 1) % verts.length] as LonLat;
    edges.push({
      a,
      b,
      mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      lengthM: segmentLengthM(origin, a, b),
    });
  }

  // Front = longest edge.
  let frontIdx = 0;
  for (let i = 1; i < edges.length; i++) {
    if (edges[i].lengthM > edges[frontIdx].lengthM) frontIdx = i;
  }
  const front = edges[frontIdx];

  // Rear = edge whose midpoint is farthest from the front midpoint.
  let rearIdx = frontIdx;
  let bestRearDist = -Infinity;
  for (let i = 0; i < edges.length; i++) {
    if (i === frontIdx) continue;
    const d = segmentLengthM(origin, front.mid, edges[i].mid);
    if (d > bestRearDist) {
      bestRearDist = d;
      rearIdx = i;
    }
  }
  const rear = edges[rearIdx];

  // Sides = the remaining edges.
  const sides = edges.filter((_, i) => i !== frontIdx && i !== rearIdx);

  // Building corner cloud (all on-lot building vertices).
  const corners: LonLat[] = [];
  for (const b of onLot) {
    for (const p of b.coordinates[0]) corners.push(p as LonLat);
  }
  if (corners.length === 0) return null;

  const minDistToEdge = (edge: Edge): number => {
    let best = Infinity;
    for (const c of corners) {
      const d = pointToSegmentDistanceM(origin, c, edge.a, edge.b);
      if (d < best) best = d;
    }
    return best;
  };

  const frontM = minDistToEdge(front);
  const rearM = minDistToEdge(rear);
  const sideMinM = sides.length
    ? Math.min(...sides.map(minDistToEdge))
    : Math.min(frontM, rearM);

  return {
    frontM: Math.round(frontM * 10) / 10,
    rearM: Math.round(rearM * 10) / 10,
    sideMinM: Math.round(sideMinM * 10) / 10,
  };
}
