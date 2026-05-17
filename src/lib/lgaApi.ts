/**
 * Victorian Local Government Area (LGA) lookup via the Vicmap Admin
 * FeatureServer. Returns the LGA name (uppercase, as published by Vicmap)
 * containing the given point, or null if the query fails.
 */

import axios from 'axios';

const ARC_BASE =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services';
const LGA_URL = `${ARC_BASE}/Vicmap_Admin/FeatureServer/0/query`;

type ArcgisFeature = { attributes: Record<string, unknown> };
type ArcgisResponse = { features?: ArcgisFeature[]; error?: { message: string } };

const LGA_FIELD_CANDIDATES = [
  'lga_name',
  'LGA_NAME',
  'name',
  'NAME',
  'lga',
  'gaz_lga',
];

export async function fetchLgaForPoint(
  lon: number,
  lat: number,
): Promise<string | null> {
  try {
    const { data } = await axios.get<ArcgisResponse>(LGA_URL, {
      params: {
        geometry: `${lon},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: false,
        f: 'json',
      },
      timeout: 15000,
    });

    if (data.error) return null;
    const attrs = data.features?.[0]?.attributes;
    if (!attrs) return null;

    for (const key of LGA_FIELD_CANDIDATES) {
      const v = attrs[key];
      if (typeof v === 'string' && v.trim().length > 0) {
        return v.trim().toUpperCase();
      }
    }
    return null;
  } catch (error) {
    console.warn('[lgaApi] fetch failed:', error);
    return null;
  }
}
