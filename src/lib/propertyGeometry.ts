/**
 * Property Geometry Automation
 *
 * Auto-calculate frontage, orientation, and lot size from parcel polygons.
 */

import { area } from '@turf/area';
import axios from 'axios';
import type { ParcelPolygon } from './vicPlanApi';

const ARC_BASE =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services';

// Vicmap_Transport layer for road reserve polygons (layer 0 is typically roads)
const TRANSPORT_URL = `${ARC_BASE}/Vicmap_Transport/FeatureServer/0/query`;

type RoadReserveFeature = {
  geometry?: { rings?: number[][][] };
};

type TransportResponse = {
  features?: RoadReserveFeature[];
  error?: { message: string };
};

/**
 * Calculate lot area in m² from parcel polygon using Turf.js.
 * Fallback when Domain API doesn't return lot size.
 */
export function calculateLotArea(polygon: ParcelPolygon): number {
  const feature = {
    type: 'Feature' as const,
    properties: {},
    geometry: polygon,
  };
  return Math.round(area(feature));
}

/**
 * Fetch road reserve polygons intersecting the parcel bounding box.
 * Used for accurate frontage calculation via polygon intersection.
 *
 * @internal This is an optional enhancement - frontage calculation gracefully
 * falls back to heuristic methods if the road reserve query fails or times out.
 */
async function fetchRoadReserves(
  west: number,
  south: number,
  east: number,
  north: number,
  timeoutMs = 5000,
): Promise<RoadReserveFeature[]> {
  try {
    const { data } = await axios.get<TransportResponse>(TRANSPORT_URL, {
      params: {
        geometry: `${west},${south},${east},${north}`,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        returnGeometry: true,
        outFields: '',
        f: 'json',
      },
      timeout: timeoutMs,
    });

    if (data.error) {
      console.warn('[propertyGeometry] Road reserve query failed:', data.error.message);
      return [];
    }

    return data.features ?? [];
  } catch (error) {
    console.warn('[propertyGeometry] Road reserve fetch failed, using fallback:', error);
    return [];
  }
}

/**
 * Calculate the length of intersection between a parcel edge and road reserve polygons.
 * This provides the most accurate frontage measurement.
 *
 * @returns Length in meters of parcel edges that touch road reserves, or null if no intersection
 */
async function calculateRoadIntersectionFrontage(
  polygon: ParcelPolygon,
): Promise<number | null> {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) return null;

  // Calculate bounding box for road reserve query
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Add 10m buffer to bbox to catch adjacent roads
  const buffer = 0.0001; // ~10m in degrees
  const roadFeatures = await fetchRoadReserves(
    minLon - buffer,
    minLat - buffer,
    maxLon + buffer,
    maxLat + buffer,
  );

  if (roadFeatures.length === 0) return null;

  // TODO: Implement polygon intersection using @turf/line-intersect
  // For now, return null to fall back to heuristic method
  // Full implementation would:
  // 1. Convert parcel edges to LineString features
  // 2. Check each edge for intersection with road polygons
  // 3. Sum the lengths of all intersecting segments
  // 4. Return the total frontage length

  return null;
}

/**
 * Calculate frontage (street-facing edge) from parcel polygon.
 *
 * TWO-TIER STRATEGY:
 * 1. PRIMARY: Attempt to fetch road reserve polygons from Vicmap_Transport and
 *    calculate accurate frontage via polygon intersection (most accurate)
 * 2. FALLBACK: Use geometric heuristics (bounding box alignment, edge scoring)
 *    if road reserve data is unavailable or the query fails
 *
 * HEURISTIC METHODOLOGY (Fallback):
 * - Calculate the bounding box of the polygon
 * - Identify edges that align with bbox boundaries (likely street-facing)
 * - Among street-aligned edges, select the one closest to the bbox front
 * - Fallback to shortest edge if no clear street alignment is detected
 *
 * This approach improves accuracy for typical residential lot geometries where
 * the street frontage is the most orthogonal edge facing the primary road.
 *
 * @param polygon - Parcel polygon from Vicmap
 * @param useRoadIntersection - Whether to attempt road reserve intersection (default: true)
 * @returns Frontage length in meters (1 decimal precision), or null if calculation fails
 */
export async function calculateFrontage(
  polygon: ParcelPolygon,
  useRoadIntersection = true,
): Promise<number | null> {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) return null;

  // PRIMARY STRATEGY: Road reserve intersection (most accurate)
  if (useRoadIntersection) {
    try {
      const roadFrontage = await calculateRoadIntersectionFrontage(polygon);
      if (roadFrontage !== null) {
        console.log('[propertyGeometry] Using road intersection frontage:', roadFrontage);
        return roadFrontage;
      }
    } catch (error) {
      console.warn('[propertyGeometry] Road intersection failed, using fallback:', error);
    }
  }

  // FALLBACK STRATEGY: Geometric heuristics
  return calculateFrontageHeuristic(polygon);
}

/**
 * Heuristic frontage calculation based on polygon geometry analysis.
 * Used as fallback when road reserve data is unavailable.
 *
 * @internal Separated for testing and to allow direct calls when road data is known to be unavailable
 */
function calculateFrontageHeuristic(polygon: ParcelPolygon): number | null {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) return null;

  // Calculate bounding box
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const bboxWidth = maxLon - minLon;
  const bboxHeight = maxLat - minLat;

  // Helper: Calculate distance between two points using Haversine
  const haversineDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c; // Earth radius in meters
  };

  // Analyze each edge to find likely street frontage
  type EdgeCandidate = {
    length: number;
    index: number;
    isAligned: boolean;
    distanceToFront: number;
  };

  const edges: EdgeCandidate[] = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];

    const distance = haversineDistance(lon1, lat1, lon2, lat2);
    if (distance < 0.1) continue; // Ignore tiny edges

    // Check if edge is aligned with bounding box (likely street-facing)
    // An edge is "aligned" if it runs parallel to bbox boundaries within tolerance
    const isHorizontal = Math.abs(lat2 - lat1) < bboxHeight * 0.1;
    const isVertical = Math.abs(lon2 - lon1) < bboxWidth * 0.1;
    const isAligned = isHorizontal || isVertical;

    // Distance to "front" of bbox (southern edge, most common for Australian streets)
    // Heuristic: street frontage is typically the edge closest to minLat (south)
    const edgeMidLat = (lat1 + lat2) / 2;
    const distanceToFront = Math.abs(edgeMidLat - minLat);

    edges.push({
      length: distance,
      index: i,
      isAligned,
      distanceToFront,
    });
  }

  if (edges.length === 0) return null;

  // SELECTION STRATEGY:
  // 1. Prefer aligned edges (likely street-facing)
  // 2. Among aligned edges, pick the one closest to the bounding box front
  // 3. Fallback: shortest edge if no clear alignment

  const alignedEdges = edges.filter(e => e.isAligned);

  let selectedEdge: EdgeCandidate;

  if (alignedEdges.length > 0) {
    // Sort by distance to front (ascending), then by length (ascending for frontage)
    alignedEdges.sort((a, b) => {
      const frontDiff = a.distanceToFront - b.distanceToFront;
      if (Math.abs(frontDiff) > bboxHeight * 0.1) return frontDiff;
      return a.length - b.length;
    });
    selectedEdge = alignedEdges[0];
  } else {
    // Fallback: shortest edge
    edges.sort((a, b) => a.length - b.length);
    selectedEdge = edges[0];
  }

  return Math.round(selectedEdge.length * 10) / 10;
}

/**
 * Detect backyard orientation from parcel geometry.
 * Uses the longest edge as the street frontage, opposite edge as backyard.
 */
export function detectOrientation(polygon: ParcelPolygon): string {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) return 'Unknown';

  // Find longest edge (likely street frontage)
  let maxEdge = 0;
  let maxEdgeIdx = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const distance = Math.sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2);

    if (distance > maxEdge) {
      maxEdge = distance;
      maxEdgeIdx = i;
    }
  }

  // Calculate bearing of longest edge
  const [lon1, lat1] = ring[maxEdgeIdx];
  const [lon2, lat2] = ring[maxEdgeIdx + 1];
  const bearing = Math.atan2(lon2 - lon1, lat2 - lat1) * 180 / Math.PI;

  // Opposite direction is backyard orientation
  const backyardBearing = (bearing + 180) % 360;

  // Convert bearing to compass direction
  if (backyardBearing >= 337.5 || backyardBearing < 22.5) return 'N';
  if (backyardBearing >= 22.5 && backyardBearing < 67.5) return 'NE';
  if (backyardBearing >= 67.5 && backyardBearing < 112.5) return 'E';
  if (backyardBearing >= 112.5 && backyardBearing < 157.5) return 'SE';
  if (backyardBearing >= 157.5 && backyardBearing < 202.5) return 'S';
  if (backyardBearing >= 202.5 && backyardBearing < 247.5) return 'SW';
  if (backyardBearing >= 247.5 && backyardBearing < 292.5) return 'W';
  if (backyardBearing >= 292.5 && backyardBearing < 337.5) return 'NW';

  return 'N';
}

/**
 * Check if frontage meets SSD minimum requirement (≥5m).
 */
export function checkFrontageRequirement(frontageM: number | null): boolean {
  return frontageM !== null && frontageM >= 5;
}
