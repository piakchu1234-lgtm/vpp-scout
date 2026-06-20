/**
 * Neighborhood Amenities Utilities
 *
 * Finds nearby schools, transit, and amenities using Turf.js distance calculations.
 * Provides Domain/REA neighborhood intelligence parity.
 */

import * as turf from '@turf/turf';
import type { Position } from 'geojson';

export interface NearbyAmenity {
  type: 'school' | 'train' | 'tram' | 'bus' | 'park' | 'shopping';
  name: string;
  distance: number; // meters
  coordinates: Position;
  icon: string; // emoji or icon identifier
}

/**
 * Calculate distance from property to amenity
 */
export function calculateDistanceToAmenity(
  propertyCoords: Position,
  amenityCoords: Position
): number {
  const from = turf.point(propertyCoords);
  const to = turf.point(amenityCoords);
  return turf.distance(from, to, { units: 'meters' });
}

/**
 * Find nearest amenity of a specific type
 */
export function findNearestAmenity(
  propertyCoords: Position,
  amenities: NearbyAmenity[]
): NearbyAmenity | null {
  if (amenities.length === 0) return null;

  let nearest = amenities[0];
  let minDistance = nearest.distance;

  for (const amenity of amenities) {
    if (amenity.distance < minDistance) {
      minDistance = amenity.distance;
      nearest = amenity;
    }
  }

  return nearest;
}

/**
 * Format distance for display
 */
export function formatAmenityDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Calculate walkability score based on amenity distances
 * 0-100 scale (higher = more walkable)
 */
export function calculateWalkabilityScore(amenities: {
  nearestSchool?: number;
  nearestTransit?: number;
  nearestPark?: number;
  nearestShopping?: number;
}): number {
  let score = 0;
  let count = 0;

  // Score schools (0-25 points)
  if (amenities.nearestSchool !== undefined) {
    if (amenities.nearestSchool < 500) score += 25;
    else if (amenities.nearestSchool < 1000) score += 20;
    else if (amenities.nearestSchool < 2000) score += 10;
    count++;
  }

  // Score transit (0-25 points)
  if (amenities.nearestTransit !== undefined) {
    if (amenities.nearestTransit < 400) score += 25;
    else if (amenities.nearestTransit < 800) score += 20;
    else if (amenities.nearestTransit < 1500) score += 10;
    count++;
  }

  // Score parks (0-25 points)
  if (amenities.nearestPark !== undefined) {
    if (amenities.nearestPark < 300) score += 25;
    else if (amenities.nearestPark < 600) score += 20;
    else if (amenities.nearestPark < 1200) score += 10;
    count++;
  }

  // Score shopping (0-25 points)
  if (amenities.nearestShopping !== undefined) {
    if (amenities.nearestShopping < 500) score += 25;
    else if (amenities.nearestShopping < 1000) score += 20;
    else if (amenities.nearestShopping < 2000) score += 10;
    count++;
  }

  // Normalize to 0-100 scale
  return count > 0 ? Math.round(score) : 0;
}

/**
 * Get walkability rating text
 */
export function getWalkabilityRating(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return {
      label: 'Excellent',
      color: 'text-green-500',
      description: 'Very walkable - most errands can be accomplished on foot',
    };
  } else if (score >= 60) {
    return {
      label: 'Good',
      color: 'text-blue-500',
      description: 'Somewhat walkable - some amenities within walking distance',
    };
  } else if (score >= 40) {
    return {
      label: 'Fair',
      color: 'text-amber-500',
      description: 'Car-dependent - most errands require a car',
    };
  } else {
    return {
      label: 'Limited',
      color: 'text-red-500',
      description: 'Very car-dependent - minimal walkable amenities',
    };
  }
}

/**
 * Mock amenities data for Melbourne suburbs
 * In production, this would query Mapbox POI or OpenStreetMap
 */
export function getMockAmenitiesForSuburb(
  propertyCoords: Position,
  suburb: string
): NearbyAmenity[] {
  // Generate mock amenities with realistic distances
  const [lng, lat] = propertyCoords;

  // Add some variation based on coordinates
  const seed = Math.abs(Math.floor(lng * 1000 + lat * 1000)) % 100;

  return [
    {
      type: 'school',
      name: `${suburb} Primary School`,
      distance: 400 + (seed * 10),
      coordinates: [lng + 0.003, lat + 0.002],
      icon: '🏫',
    },
    {
      type: 'train',
      name: `${suburb} Station`,
      distance: 650 + (seed * 8),
      coordinates: [lng - 0.004, lat + 0.003],
      icon: '🚆',
    },
    {
      type: 'bus',
      name: 'Bus Stop - Route 813',
      distance: 180 + (seed * 3),
      coordinates: [lng + 0.001, lat - 0.001],
      icon: '🚌',
    },
    {
      type: 'park',
      name: `${suburb} Park`,
      distance: 320 + (seed * 5),
      coordinates: [lng - 0.002, lat - 0.002],
      icon: '🌳',
    },
    {
      type: 'shopping',
      name: `${suburb} Shopping Centre`,
      distance: 850 + (seed * 12),
      coordinates: [lng + 0.005, lat - 0.003],
      icon: '🛒',
    },
  ];
}
