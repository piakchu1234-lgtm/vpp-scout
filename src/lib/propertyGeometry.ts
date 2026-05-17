/**
 * Property Geometry Automation
 *
 * Auto-calculate frontage, orientation, and lot size from parcel polygons.
 */

import { area } from '@turf/area';
import type { ParcelPolygon } from './vicPlanApi';

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
 * Calculate frontage (shortest edge) from parcel polygon.
 * Assumes outer ring is the parcel boundary.
 */
export function calculateFrontage(polygon: ParcelPolygon): number | null {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) return null;

  let minEdge = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];

    // Haversine distance approximation for short distances
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371000 * c; // Earth radius in meters

    if (distance < minEdge && distance > 0.1) { // Ignore tiny edges
      minEdge = distance;
    }
  }

  return minEdge === Infinity ? null : Math.round(minEdge * 10) / 10;
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
