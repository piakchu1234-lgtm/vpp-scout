/**
 * Vicmap Easement API Integration
 *
 * Fetches registered easements from Vicmap Property FeatureServer.
 * Easements include drainage, sewer, access, and utility rights-of-way.
 */

import axios from 'axios';
import type { ParcelPolygon } from './vicPlanApi';

const ARC_BASE =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services';

// Vicmap Property layer containing easement geometries
const EASEMENT_URL = `${ARC_BASE}/Vicmap_Property/FeatureServer/1/query`;

type ArcgisEasementFeature = {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
};

type ArcgisEasementResponse = {
  features?: ArcgisEasementFeature[];
  error?: { message: string };
};

export type EasementData = {
  type: string; // e.g., "Drainage", "Sewer", "Access"
  polygon: ParcelPolygon;
};

/**
 * Fetch easements intersecting a given point.
 * Returns array of easement polygons with their types.
 */
export async function fetchEasementsForPoint(
  lon: number,
  lat: number,
): Promise<EasementData[]> {
  const params = {
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: 4326,
    outSR: 4326,
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: true,
    outFields: 'EASEMENT_TYPE,DESCRIPTION',
    f: 'json',
  };

  try {
    const { data } = await axios.get<ArcgisEasementResponse>(EASEMENT_URL, {
      params,
      timeout: 20000,
    });

    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message}`);
    }

    const easements: EasementData[] = [];

    for (const feature of data.features ?? []) {
      const rings = feature.geometry?.rings;
      if (!rings || rings.length === 0) continue;

      const type = String(feature.attributes.EASEMENT_TYPE || 'Unknown');

      easements.push({
        type,
        polygon: { type: 'Polygon', coordinates: rings },
      });
    }

    return easements;
  } catch (error) {
    console.warn('[easementApi] Fetch failed:', error);
    return [];
  }
}
