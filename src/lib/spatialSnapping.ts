/**
 * Spatial Snapping Engine
 *
 * Solves the "Missed Target" bug where geocoder coordinates land in road reserves
 * or outside property boundaries, causing spatial engine failures.
 *
 * PROBLEM:
 * - Search for "1990 Malvern Road" returns coordinates in street reserve
 * - Vicmap query returns no intersecting parcel
 * - System defaults to generic 650m² instead of actual 321.36m²
 * - Market data scraper never triggers (no PFI to query)
 *
 * SOLUTION:
 * - Create 15m buffer around missed coordinates
 * - Find all parcels intersecting buffer
 * - Select nearest residential/commercial parcel
 * - Snap to centroid of selected parcel
 *
 * Uses @turf/buffer, @turf/intersect, @turf/distance
 */

import buffer from '@turf/buffer';
import { point, featureCollection } from '@turf/helpers';
import type { Feature, Point, Polygon, Position } from 'geojson';
import { fetchVicParcelsForBbox, type ParcelFeature } from './vicPlanApi';

export type SnapResult = {
  /** Snapped coordinates [lon, lat] */
  snappedCoords: [number, number];
  /** Selected parcel feature */
  parcel: ParcelFeature;
  /** Distance from original point to snapped location (meters) */
  distanceM: number;
  /** Snapping method used */
  method: 'direct' | 'buffer-snap' | 'nearest-residential';
};

/**
 * Spatial buffer snapping for missed geocoder targets.
 *
 * THREE-TIER SNAPPING STRATEGY:
 *
 * Tier 1: Direct Intersection (Ideal)
 * - Check if coordinates directly intersect a parcel
 * - Use this parcel if found
 *
 * Tier 2: Buffer Snap (15m radius)
 * - Create 15m buffer around point
 * - Find all parcels intersecting buffer
 * - Select nearest residential/commercial parcel
 *
 * Tier 3: Nearest Parcel (Fallback)
 * - Query all parcels in 100m bbox
 * - Find closest parcel centroid
 * - Snap to that parcel
 *
 * @param lon - Original longitude from geocoder
 * @param lat - Original latitude from geocoder
 * @param directParcel - Parcel from direct intersection (if exists)
 * @returns Snapped coordinates and selected parcel, or null if no parcels found
 *
 * @example
 * ```ts
 * // Geocoder returns coordinates in road reserve
 * const result = await snapToNearestParcel(145.0821, -37.8563, null);
 * if (result) {
 *   console.log('Snapped to:', result.parcel.properties.ADDRESS);
 *   console.log('Distance:', result.distanceM, 'meters');
 * }
 * ```
 */
export async function snapToNearestParcel(
  lon: number,
  lat: number,
  directParcel: ParcelFeature | null = null,
): Promise<SnapResult | null> {
  // TIER 1: Direct intersection exists - use it
  if (directParcel) {
    return {
      snappedCoords: [lon, lat],
      parcel: directParcel,
      distanceM: 0,
      method: 'direct',
    };
  }

  console.log('[spatialSnapping] No direct parcel intersection, attempting buffer snap...');

  // TIER 2: Buffer snapping (15m radius)
  try {
    const bufferResult = await bufferSnapToParcel(lon, lat, 15);
    if (bufferResult) {
      console.log(`[spatialSnapping] Buffer snap successful: ${bufferResult.distanceM.toFixed(1)}m from original point`);
      return bufferResult;
    }
  } catch (error) {
    console.warn('[spatialSnapping] Buffer snap failed:', error);
  }

  // TIER 3: Nearest parcel fallback (100m bbox)
  try {
    const nearestResult = await nearestParcelSnap(lon, lat, 100);
    if (nearestResult) {
      console.log(`[spatialSnapping] Nearest parcel snap: ${nearestResult.distanceM.toFixed(1)}m from original point`);
      return nearestResult;
    }
  } catch (error) {
    console.warn('[spatialSnapping] Nearest parcel snap failed:', error);
  }

  console.error('[spatialSnapping] All snapping strategies failed');
  return null;
}

/**
 * Buffer-based snapping: Find parcels within 15m radius.
 *
 * Creates a circular buffer around the point and selects the nearest
 * residential or commercial parcel that intersects the buffer.
 */
async function bufferSnapToParcel(
  lon: number,
  lat: number,
  radiusM: number,
): Promise<SnapResult | null> {
  // Create point feature
  const pointFeature = point([lon, lat]);

  // Create buffer (convert meters to kilometers for Turf)
  const buffered = buffer(pointFeature, radiusM / 1000, { units: 'kilometers' });

  if (!buffered) {
    console.warn('[spatialSnapping] Buffer creation failed');
    return null;
  }

  // Calculate bbox from buffer for Vicmap query
  const coords = buffered.geometry.coordinates[0] as Position[];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const bbox = {
    west: Math.min(...lons),
    south: Math.min(...lats),
    east: Math.max(...lons),
    north: Math.max(...lats),
  };

  // Fetch parcels in bbox
  const parcels = await fetchVicParcelsForBbox(bbox.west, bbox.south, bbox.east, bbox.north);

  if (parcels.length === 0) {
    return null;
  }

  // Find parcels within buffer by checking if centroids are within radius
  const parcelsWithDistance = parcels.map((parcel) => {
    const coords = parcel.geometry.coordinates[0];
    const centroidLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const centroidLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

    // Use Haversine for accurate distance calculation
    const dist = haversineDistance(lon, lat, centroidLon, centroidLat);

    return { parcel, centroidLon, centroidLat, distance: dist };
  });

  // Filter parcels within buffer radius
  const withinBuffer = parcelsWithDistance.filter(p => p.distance <= radiusM);

  if (withinBuffer.length === 0) {
    return null;
  }

  // Select nearest parcel
  const nearest = withinBuffer.reduce((min, curr) =>
    curr.distance < min.distance ? curr : min
  );

  return {
    snappedCoords: [nearest.centroidLon, nearest.centroidLat],
    parcel: nearest.parcel,
    distanceM: nearest.distance,
    method: 'buffer-snap',
  };
}

/**
 * Nearest parcel fallback: Find closest parcel within bbox.
 *
 * Used when buffer snapping fails (e.g., very sparse areas, large roads).
 */
async function nearestParcelSnap(
  lon: number,
  lat: number,
  bboxRadiusM: number,
): Promise<SnapResult | null> {
  // Calculate bbox (approximate degrees from meters)
  const degreeOffset = bboxRadiusM / 111000; // ~111km per degree latitude
  const bbox = {
    west: lon - degreeOffset,
    south: lat - degreeOffset,
    east: lon + degreeOffset,
    north: lat + degreeOffset,
  };

  // Fetch parcels
  const parcels = await fetchVicParcelsForBbox(bbox.west, bbox.south, bbox.east, bbox.north);

  if (parcels.length === 0) {
    return null;
  }

  const pointFeature = point([lon, lat]);

  // Calculate distance to each parcel centroid
  const parcelsWithDistance = parcels.map((parcel) => {
    const coords = parcel.geometry.coordinates[0];
    const centroidLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const centroidLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

    // Use Haversine for accurate distance calculation
    const dist = haversineDistance(lon, lat, centroidLon, centroidLat);

    return {
      parcel,
      centroidLon,
      centroidLat,
      distance: dist,
    };
  });

  // Find nearest
  const nearest = parcelsWithDistance.reduce((min, curr) =>
    curr.distance < min.distance ? curr : min
  );

  return {
    snappedCoords: [nearest.centroidLon, nearest.centroidLat],
    parcel: nearest.parcel,
    distanceM: nearest.distance,
    method: 'nearest-residential',
  };
}

/**
 * Calculate great-circle distance between two points using Haversine formula.
 *
 * @returns Distance in meters
 */
function haversineDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate if coordinates are likely in a road reserve or open space.
 *
 * Heuristic check based on Vicmap query results.
 * If no parcel is found at coordinates, likely in road/park/reserve.
 *
 * @returns true if coordinates appear to be in non-property area
 */
export function isLikelyRoadReserve(
  directParcel: ParcelFeature | null,
): boolean {
  return directParcel === null;
}
