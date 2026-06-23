/**
 * SCHOOL ZONE DETECTION
 *
 * Spatial intersection logic using Turf.js to detect which Victorian
 * government school catchment zone a property falls within.
 *
 * Uses DataVic 2027 school zone boundaries for:
 * - Primary (Prep to Year 6)
 * - Secondary (Year 7 entry point)
 */

import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

export type SchoolZoneType = 'primary' | 'secondary';

export interface SchoolZoneFeature extends Feature<Polygon | MultiPolygon> {
  properties: {
    School_Name?: string;
    SCHOOL_NAM?: string;
    School_Type?: string;
    Zone_Code?: string;
    [key: string]: any;
  };
}

export interface SchoolZoneMatch {
  schoolName: string;
  type: SchoolZoneType;
  zoneCode?: string;
}

// Cache for loaded GeoJSON data
let primaryZonesCache: FeatureCollection | null = null;
let secondaryZonesCache: FeatureCollection | null = null;

/**
 * Load school zone GeoJSON from public directory
 */
async function loadSchoolZones(type: SchoolZoneType): Promise<FeatureCollection> {
  const url = type === 'primary'
    ? '/data/schools/Primary_Integrated_2027.geojson'
    : '/data/schools/Secondary_Integrated_Year7_2027.geojson';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} school zones: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[SchoolZoneDetection] Error loading ${type} zones:`, error);
    throw error;
  }
}

/**
 * Detect which school zone(s) a property point falls within
 *
 * @param lng - Longitude of property center
 * @param lat - Latitude of property center
 * @returns Array of matched school zones (typically one per type)
 */
export async function detectSchoolZones(
  lng: number,
  lat: number
): Promise<SchoolZoneMatch[]> {
  const matches: SchoolZoneMatch[] = [];
  const propertyPoint = point([lng, lat]);

  try {
    // Load primary zones (with caching)
    if (!primaryZonesCache) {
      primaryZonesCache = await loadSchoolZones('primary');
      console.log(`[SchoolZoneDetection] Primary zones loaded: ${primaryZonesCache.features.length} schools`);
    }

    // Check primary zone intersection
    for (const feature of primaryZonesCache.features) {
      const schoolFeature = feature as SchoolZoneFeature;

      if (booleanPointInPolygon(propertyPoint, schoolFeature)) {
        const schoolName = schoolFeature.properties.School_Name
          || schoolFeature.properties.SCHOOL_NAM
          || 'Unknown Primary School';

        matches.push({
          schoolName,
          type: 'primary',
          zoneCode: schoolFeature.properties.Zone_Code,
        });
        break; // Each property is only in one primary zone
      }
    }

    // Load secondary zones (with caching)
    if (!secondaryZonesCache) {
      secondaryZonesCache = await loadSchoolZones('secondary');
      console.log(`[SchoolZoneDetection] Secondary zones loaded: ${secondaryZonesCache.features.length} schools`);
    }

    // Check secondary zone intersection
    for (const feature of secondaryZonesCache.features) {
      const schoolFeature = feature as SchoolZoneFeature;

      if (booleanPointInPolygon(propertyPoint, schoolFeature)) {
        const schoolName = schoolFeature.properties.School_Name
          || schoolFeature.properties.SCHOOL_NAM
          || 'Unknown Secondary School';

        matches.push({
          schoolName,
          type: 'secondary',
          zoneCode: schoolFeature.properties.Zone_Code,
        });
        break; // Each property is only in one secondary zone
      }
    }

    console.log(`[SchoolZoneDetection] Found ${matches.length} zone(s) for [${lng}, ${lat}]`);
    return matches;

  } catch (error) {
    console.error('[SchoolZoneDetection] Detection failed:', error);
    return [];
  }
}

/**
 * Clear cached school zone data (useful for testing or memory management)
 */
export function clearSchoolZoneCache(): void {
  primaryZonesCache = null;
  secondaryZonesCache = null;
  console.log('[SchoolZoneDetection] Cache cleared');
}
