/**
 * Measurement Utilities using Turf.js
 *
 * Calculates distances, areas, and other spatial metrics for drawn geometries.
 */

import * as turf from '@turf/turf';
import type { Feature, LineString, Polygon } from 'geojson';

/**
 * Calculate the length of a line in meters
 */
export function calculateLineDistance(feature: Feature<LineString>): number {
  const length = turf.length(feature, { units: 'meters' });
  return length;
}

/**
 * Calculate the area of a polygon in square meters
 */
export function calculatePolygonArea(feature: Feature<Polygon>): number {
  const area = turf.area(feature);
  return area;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  } else if (meters < 1000) {
    return `${meters.toFixed(2)} m`;
  } else {
    return `${(meters / 1000).toFixed(2)} km`;
  }
}

/**
 * Format area for display
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters < 1) {
    return `${Math.round(sqMeters * 10000)} cm²`;
  } else if (sqMeters < 10000) {
    return `${sqMeters.toFixed(2)} m²`;
  } else {
    return `${(sqMeters / 10000).toFixed(2)} ha`;
  }
}

/**
 * Get centroid of a feature for tooltip placement
 */
export function getFeatureCentroid(feature: Feature): [number, number] {
  const centroid = turf.centroid(feature);
  return centroid.geometry.coordinates as [number, number];
}
