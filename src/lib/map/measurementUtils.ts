/**
 * Measurement Utilities - Site Geometry Analysis
 *
 * Turf.js-powered boundary dimension calculations and orientation analysis
 * for achieving Landchecker data parity.
 */

import * as turf from '@turf/turf';
import { Position } from 'geojson';

export interface BoundarySegment {
  start: Position;
  end: Position;
  length: number; // meters
  bearing: number; // degrees (0-360)
  label: string; // formatted with unit (e.g., "15.4m")
  midpoint: Position; // for label placement
}

export interface SiteOrientation {
  primaryFacing: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Northwest' | 'Southeast' | 'Southwest';
  rearFacing: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Northwest' | 'Southeast' | 'Southwest';
  streetBearing: number; // degrees
  rearBearing: number; // degrees
  longestSide: BoundarySegment;
  shortestSide: BoundarySegment;
}

/**
 * Calculate dimensions of all boundary segments
 */
export function calculateBoundaryDimensions(
  polygon: Position[]
): BoundarySegment[] {
  const segments: BoundarySegment[] = [];

  // Iterate through polygon coordinates (skip last as it equals first)
  for (let i = 0; i < polygon.length - 1; i++) {
    const start = polygon[i];
    const end = polygon[i + 1];

    // Calculate distance in meters
    const from = turf.point(start);
    const to = turf.point(end);
    const length = turf.distance(from, to, { units: 'meters' });

    // Calculate bearing (0-360 degrees, 0 = North)
    const bearing = turf.bearing(from, to);
    const normalizedBearing = bearing < 0 ? bearing + 360 : bearing;

    // Calculate midpoint for label placement
    const midpoint = turf.midpoint(from, to).geometry.coordinates;

    segments.push({
      start,
      end,
      length,
      bearing: normalizedBearing,
      label: `${length.toFixed(1)}m`,
      midpoint,
    });
  }

  return segments;
}

/**
 * Determine site orientation based on boundary bearings
 */
export function calculateSiteOrientation(
  polygon: Position[]
): SiteOrientation {
  const segments = calculateBoundaryDimensions(polygon);

  // Find longest and shortest sides
  const sortedByLength = [...segments].sort((a, b) => b.length - a.length);
  const longestSide = sortedByLength[0];
  const shortestSide = sortedByLength[sortedByLength.length - 1];

  // Determine primary street frontage (usually shortest side)
  // In Australian suburban lots, street frontage is typically narrower
  const streetBearing = shortestSide.bearing;

  // Rear boundary is opposite to street frontage (±180 degrees)
  const rearBearing = (streetBearing + 180) % 360;

  return {
    primaryFacing: bearingToDirection(streetBearing),
    rearFacing: bearingToDirection(rearBearing),
    streetBearing,
    rearBearing,
    longestSide,
    shortestSide,
  };
}

/**
 * Convert bearing (0-360) to cardinal/intercardinal direction
 */
export function bearingToDirection(
  bearing: number
): 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Northwest' | 'Southeast' | 'Southwest' {
  const normalized = ((bearing % 360) + 360) % 360;

  // 8-direction compass rose
  if (normalized >= 337.5 || normalized < 22.5) return 'North';
  if (normalized >= 22.5 && normalized < 67.5) return 'Northeast';
  if (normalized >= 67.5 && normalized < 112.5) return 'East';
  if (normalized >= 112.5 && normalized < 157.5) return 'Southeast';
  if (normalized >= 157.5 && normalized < 202.5) return 'South';
  if (normalized >= 202.5 && normalized < 247.5) return 'Southwest';
  if (normalized >= 247.5 && normalized < 292.5) return 'West';
  return 'Northwest';
}

/**
 * Calculate centroid of polygon for reference point
 */
export function calculateCentroid(polygon: Position[]): Position {
  const turfPolygon = turf.polygon([polygon]);
  const centroid = turf.centroid(turfPolygon);
  return centroid.geometry.coordinates;
}

/**
 * Format bearing for display with cardinal direction
 */
export function formatBearing(bearing: number): string {
  const direction = bearingToDirection(bearing);
  return `${bearing.toFixed(1)}° (${direction})`;
}

/**
 * Calculate perimeter of polygon
 */
export function calculatePerimeter(polygon: Position[]): number {
  const segments = calculateBoundaryDimensions(polygon);
  return segments.reduce((sum, seg) => sum + seg.length, 0);
}

/**
 * Determine if lot is regular (rectangular) or irregular
 */
export function analyzeLotRegularity(polygon: Position[]): {
  isRegular: boolean;
  irregularityScore: number; // 0 = perfect rectangle, 1 = highly irregular
  analysis: string;
} {
  const segments = calculateBoundaryDimensions(polygon);

  if (segments.length !== 4) {
    return {
      isRegular: false,
      irregularityScore: 1,
      analysis: `Irregular lot with ${segments.length} sides`,
    };
  }

  // Check if opposite sides are roughly equal (rectangular)
  const lengths = segments.map(s => s.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Calculate variance
  const variance = lengths.reduce((sum, len) => {
    return sum + Math.pow(len - avgLength, 2);
  }, 0) / lengths.length;

  const irregularityScore = Math.min(variance / 100, 1); // Normalize to 0-1

  if (irregularityScore < 0.1) {
    return {
      isRegular: true,
      irregularityScore,
      analysis: 'Regular rectangular lot',
    };
  } else if (irregularityScore < 0.3) {
    return {
      isRegular: false,
      irregularityScore,
      analysis: 'Slightly irregular lot',
    };
  } else {
    return {
      isRegular: false,
      irregularityScore,
      analysis: 'Highly irregular lot',
    };
  }
}

/**
 * Calculate aspect ratio (length/width) for rectangular lots
 */
export function calculateAspectRatio(polygon: Position[]): number | null {
  const segments = calculateBoundaryDimensions(polygon);

  if (segments.length !== 4) return null;

  const lengths = segments.map(s => s.length).sort((a, b) => b - a);
  const length = (lengths[0] + lengths[1]) / 2; // Average of two longest sides
  const width = (lengths[2] + lengths[3]) / 2; // Average of two shortest sides

  return length / width;
}

/**
 * Calculate distance between two points (for compatibility)
 */
export function calculateLineDistance(feature: any): number {
  if (feature.geometry.type === 'LineString') {
    const coordinates = feature.geometry.coordinates;
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += turf.distance(
        turf.point(coordinates[i]),
        turf.point(coordinates[i + 1]),
        { units: 'meters' }
      );
    }
    return totalDistance;
  }
  return 0;
}

/**
 * Calculate area of a polygon (for compatibility)
 */
export function calculatePolygonArea(feature: any): number {
  if (feature.geometry.type === 'Polygon') {
    const turfPolygon = turf.polygon(feature.geometry.coordinates);
    return turf.area(turfPolygon);
  }
  return 0;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${(meters * 100).toFixed(0)}cm`;
  } else if (meters < 1000) {
    return `${meters.toFixed(1)}m`;
  } else {
    return `${(meters / 1000).toFixed(2)}km`;
  }
}

/**
 * Format area for display
 */
export function formatArea(squareMeters: number): string {
  if (squareMeters < 10000) {
    return `${squareMeters.toFixed(1)} m²`;
  } else {
    return `${(squareMeters / 10000).toFixed(2)} hectares`;
  }
}

