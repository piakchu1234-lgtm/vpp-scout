import type { Polygon } from 'geojson';
import area from '@turf/area';
import length from '@turf/length';
import { lineString } from '@turf/helpers';

export type SpatialMetrics = {
  areaM2: number;
  perimeterM: number;
  frontageM: number;
  frontageEdgeIndex: number;
  isIrregular: boolean;
  irregularityReason: string | null;
};

/**
 * Calculate exact site area in square meters from a Vicmap polygon.
 * Uses Turf.js geodesic area calculation for precision.
 */
export function calculateSiteArea(polygon: Polygon): number {
  const m2 = area({ type: 'Feature', properties: {}, geometry: polygon });
  return Number.isFinite(m2) && m2 > 0 ? m2 : 0;
}

/**
 * Calculate the length of each edge in a polygon and identify the longest
 * edge as the primary street frontage (fallback heuristic until road
 * casement data is integrated).
 */
export function calculateFrontage(polygon: Polygon): {
  frontageM: number;
  frontageEdgeIndex: number;
  allEdgeLengths: number[];
} {
  const coords = polygon.coordinates[0]; // exterior ring
  if (!coords || coords.length < 4) {
    return { frontageM: 0, frontageEdgeIndex: -1, allEdgeLengths: [] };
  }

  const edgeLengths: number[] = [];
  let maxLength = 0;
  let maxIndex = 0;

  // Calculate length of each edge (point i to point i+1)
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];

    // Create a line segment and calculate geodesic length in kilometers
    const line = lineString([p1, p2]);
    const lengthKm = length(line, { units: 'kilometers' });
    const lengthM = lengthKm * 1000;

    edgeLengths.push(lengthM);

    if (lengthM > maxLength) {
      maxLength = lengthM;
      maxIndex = i;
    }
  }

  return {
    frontageM: maxLength,
    frontageEdgeIndex: maxIndex,
    allEdgeLengths: edgeLengths,
  };
}

/**
 * Detect irregular lot shapes that require specialized setback rules.
 * Flags battle-axe blocks (narrow access corridor), L-shaped lots, and
 * parcels with extreme aspect ratios.
 */
export function detectIrregularShape(
  polygon: Polygon,
  areaM2: number,
  edgeLengths: number[]
): { isIrregular: boolean; reason: string | null } {
  if (edgeLengths.length < 4) {
    return { isIrregular: false, reason: null };
  }

  // Sort edges to find longest and shortest
  const sorted = [...edgeLengths].sort((a, b) => b - a);
  const longest = sorted[0];
  const shortest = sorted[sorted.length - 1];
  const secondLongest = sorted[1];

  // Flag 1: Battle-axe block heuristic
  // A very narrow edge (< 4m) suggests an access corridor
  if (shortest < 4) {
    return {
      isIrregular: true,
      reason: 'Potential battle-axe block detected (access corridor < 4m)',
    };
  }

  // Flag 2: Extreme aspect ratio
  // If longest edge is > 3x the shortest edge, flag as irregular
  if (longest > shortest * 3) {
    return {
      isIrregular: true,
      reason: `Extreme aspect ratio (${(longest / shortest).toFixed(1)}:1)`,
    };
  }

  // Flag 3: L-shaped or complex geometry
  // If the polygon has more than 6 vertices (excluding the closing point),
  // it's likely non-rectangular and may have complex setback requirements
  const coords = polygon.coordinates[0];
  if (coords.length > 7) {
    // 7 = 6 vertices + 1 closing point
    return {
      isIrregular: true,
      reason: 'Complex polygon geometry (non-rectangular)',
    };
  }

  // Flag 4: Very small frontage relative to area
  // A 600m² lot with only 10m frontage is likely irregular
  const estimatedDepth = areaM2 / longest;
  if (estimatedDepth > longest * 2) {
    return {
      isIrregular: true,
      reason: 'Depth significantly exceeds frontage (potential flag lot)',
    };
  }

  return { isIrregular: false, reason: null };
}

/**
 * Calculate total perimeter of the polygon.
 */
export function calculatePerimeter(edgeLengths: number[]): number {
  return edgeLengths.reduce((sum, len) => sum + len, 0);
}

/**
 * Master function: Analyze a Vicmap polygon and return all spatial metrics.
 */
export function analyzeSpatialMetrics(polygon: Polygon): SpatialMetrics {
  const areaM2 = calculateSiteArea(polygon);
  const { frontageM, frontageEdgeIndex, allEdgeLengths } = calculateFrontage(polygon);
  const perimeterM = calculatePerimeter(allEdgeLengths);
  const { isIrregular, reason } = detectIrregularShape(polygon, areaM2, allEdgeLengths);

  return {
    areaM2,
    perimeterM,
    frontageM,
    frontageEdgeIndex,
    isIrregular,
    irregularityReason: reason,
  };
}
