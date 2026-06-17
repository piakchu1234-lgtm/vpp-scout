/**
 * Amenity Engine - 15-Minute City AI Demographic Synthesizer
 *
 * Fetches local Points of Interest (POIs) based on site centroid
 * for AI-powered demographic analysis and target buyer profiling.
 */

export type AmenityType = 'transit' | 'school' | 'retail' | 'park' | 'healthcare' | 'childcare';

export type Amenity = {
  type: AmenityType;
  name: string;
  distanceM: number;
  lat: number;
  lon: number;
  icon: string;
};

export type AmenityData = {
  transit: Amenity[];
  schools: Amenity[];
  retail: Amenity[];
  parks: Amenity[];
  healthcare: Amenity[];
  childcare: Amenity[];
  summary: {
    closestTransit: number | null; // meters
    schoolsWithin1km: number;
    retailWithin500m: number;
    parksWithin1km: number;
  };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns Distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Mock amenity data generator
 * Production: Replace with Mapbox Places API, Google Places API, or OSM Overpass API
 */
function generateMockAmenities(lat: number, lon: number): AmenityData {
  // Mock transit stations (train/tram)
  const transit: Amenity[] = [
    {
      type: 'transit',
      name: 'Noble Park Station',
      distanceM: 420,
      lat: lat + 0.004,
      lon: lon + 0.002,
      icon: '🚆',
    },
    {
      type: 'transit',
      name: 'Yarraman Station',
      distanceM: 1200,
      lat: lat - 0.008,
      lon: lon - 0.003,
      icon: '🚆',
    },
  ];

  // Mock schools
  const schools: Amenity[] = [
    {
      type: 'school',
      name: 'Noble Park Primary School',
      distanceM: 850,
      lat: lat + 0.007,
      lon: lon + 0.001,
      icon: '🏫',
    },
    {
      type: 'school',
      name: 'Keysborough Secondary College',
      distanceM: 1800,
      lat: lat - 0.015,
      lon: lon + 0.005,
      icon: '🏫',
    },
  ];

  // Mock retail (cafes, shops)
  const retail: Amenity[] = [
    {
      type: 'retail',
      name: 'Local Cafe',
      distanceM: 220,
      lat: lat + 0.002,
      lon: lon + 0.001,
      icon: '☕',
    },
    {
      type: 'retail',
      name: 'Shopping Strip',
      distanceM: 380,
      lat: lat + 0.003,
      lon: lon - 0.001,
      icon: '🛒',
    },
  ];

  // Mock parks
  const parks: Amenity[] = [
    {
      type: 'park',
      name: 'Ross Reserve',
      distanceM: 650,
      lat: lat + 0.005,
      lon: lon + 0.003,
      icon: '🌳',
    },
  ];

  // Mock healthcare
  const healthcare: Amenity[] = [
    {
      type: 'healthcare',
      name: 'Medical Centre',
      distanceM: 950,
      lat: lat + 0.008,
      lon: lon - 0.002,
      icon: '🏥',
    },
  ];

  // Mock childcare
  const childcare: Amenity[] = [
    {
      type: 'childcare',
      name: 'Early Learning Centre',
      distanceM: 720,
      lat: lat + 0.006,
      lon: lon + 0.002,
      icon: '👶',
    },
  ];

  return {
    transit,
    schools,
    retail,
    parks,
    healthcare,
    childcare,
    summary: {
      closestTransit: transit[0]?.distanceM ?? null,
      schoolsWithin1km: schools.filter((s) => s.distanceM <= 1000).length,
      retailWithin500m: retail.filter((r) => r.distanceM <= 500).length,
      parksWithin1km: parks.filter((p) => p.distanceM <= 1000).length,
    },
  };
}

/**
 * Fetch amenities for a site centroid
 *
 * @param lat - Site latitude
 * @param lon - Site longitude
 * @returns AmenityData with POIs and summary statistics
 */
export async function fetchAmenities(lat: number, lon: number): Promise<AmenityData> {
  // Production: Integrate with real POI APIs
  // - Mapbox Places API: https://docs.mapbox.com/api/search/geocoding/
  // - Google Places API: https://developers.google.com/maps/documentation/places/web-service
  // - Overpass API (OSM): https://overpass-api.de/

  // For now, return mock data
  return generateMockAmenities(lat, lon);
}

/**
 * Format amenity data for AI context
 *
 * Generates concise summary string for AI prompt injection
 *
 * @param amenities - AmenityData from fetchAmenities
 * @returns Formatted string for AI context
 */
export function formatAmenitiesForAI(amenities: AmenityData): string {
  const { summary } = amenities;

  const parts: string[] = [];

  if (summary.closestTransit !== null) {
    parts.push(`Transit: ${Math.round(summary.closestTransit)}m to nearest station`);
  }

  if (summary.schoolsWithin1km > 0) {
    parts.push(`Schools: ${summary.schoolsWithin1km} within 1km`);
  }

  if (summary.retailWithin500m > 0) {
    parts.push(`Retail: ${summary.retailWithin500m} cafes/shops within 500m`);
  }

  if (summary.parksWithin1km > 0) {
    parts.push(`Parks: ${summary.parksWithin1km} within 1km`);
  }

  return parts.join(', ');
}

/**
 * Optional: Fetch 10-minute walking isochrone polygon
 *
 * Requires Mapbox Isochrone API access
 * https://docs.mapbox.com/api/navigation/isochrone/
 *
 * @param lat - Site latitude
 * @param lon - Site longitude
 * @returns GeoJSON Polygon or null if API unavailable
 */
export async function fetchWalkingIsochrone(
  lat: number,
  lon: number,
): Promise<GeoJSON.Polygon | null> {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not available for isochrone API');
    return null;
  }

  try {
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/walking/${lon},${lat}?contours_minutes=10&polygons=true&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Mapbox Isochrone API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.features?.[0]?.geometry ?? null;
  } catch (error) {
    console.warn('Failed to fetch walking isochrone:', error);
    return null;
  }
}
