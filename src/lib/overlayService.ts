/**
 * Vicmap Overlay Geometry Service — Spatial Polygon Fetching
 *
 * Extends the existing vicPlanApi.ts to fetch actual overlay polygon geometries
 * (not just attribute data) for spatial intersection analysis.
 *
 * This enables the Automated Risk Detection Engine to check if proposed building
 * footprints physically intersect with statutory overlay constraints (BMO, HO,
 * LSIO, SBO) that void permit exemptions.
 *
 * Data Source: Vicmap Planning FeatureServer Layer 2 (PLAN_OVERLAY)
 * - Returns GeoJSON Polygon geometries for overlay boundaries
 * - Used with Turf.js for spatial intersection detection
 */

import axios from 'axios';
import type { Polygon, Feature, FeatureCollection } from 'geojson';

const ARC_BASE = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services';
const OVERLAYS_URL = `${ARC_BASE}/Vicmap_Planning/FeatureServer/2/query`;

export type OverlayGeometry = {
  code: string; // e.g., "HO123", "BMO", "LSIO1"
  name: string; // e.g., "Heritage Overlay", "Bushfire Management Overlay"
  geometry: Polygon; // GeoJSON Polygon
  risk: 'high' | 'medium' | 'low'; // Risk classification
};

type ArcGISRing = number[][];
type ArcGISPolygon = {
  rings: ArcGISRing[];
};

type ArcGISFeature = {
  attributes: {
    scheme_code?: string;
    zone_description?: string;
    [key: string]: unknown;
  };
  geometry: ArcGISPolygon;
};

type ArcGISResponse = {
  features?: ArcGISFeature[];
  error?: { message: string };
};

/**
 * Convert ArcGIS Polygon (rings format) to GeoJSON Polygon.
 * ArcGIS uses clockwise winding for outer rings, counter-clockwise for holes.
 * GeoJSON uses counter-clockwise for outer rings, clockwise for holes.
 */
function arcgisToGeoJSON(arcgisPolygon: ArcGISPolygon): Polygon {
  const rings = arcgisPolygon.rings.map((ring) => {
    // ArcGIS format: [x, y] (longitude, latitude)
    // GeoJSON format: [longitude, latitude]
    return ring.map(([x, y]) => [x, y]);
  });

  return {
    type: 'Polygon',
    coordinates: rings,
  };
}

/**
 * Classify overlay risk level for UI rendering and prioritization.
 */
function classifyOverlayRisk(code: string): 'high' | 'medium' | 'low' {
  const upper = code.toUpperCase();

  // High risk: Voids permit exemptions, requires statutory approval
  if (
    upper.startsWith('BMO') || // Bushfire Management Overlay
    upper.startsWith('WMO') || // Wildfire Management Overlay
    upper.startsWith('LSIO') || // Land Subject to Inundation Overlay
    upper.startsWith('FO') || // Flood Overlay
    upper.startsWith('SBO') || // Special Building Overlay
    upper.startsWith('HO') // Heritage Overlay
  ) {
    return 'high';
  }

  // Medium risk: May require referral or additional assessment
  if (
    upper.startsWith('DDO') || // Design and Development Overlay
    upper.startsWith('EMO') || // Environmental Management Overlay
    upper.startsWith('VPO') || // Vegetation Protection Overlay
    upper.startsWith('ESO') // Environmental Significance Overlay
  ) {
    return 'medium';
  }

  // Low risk: Administrative overlays
  return 'low';
}

/**
 * Get friendly overlay name from code.
 */
function getOverlayName(code: string, description?: string): string {
  if (description && description.trim().length > 0) {
    return description;
  }

  const upper = code.toUpperCase();

  const nameMap: Record<string, string> = {
    BMO: 'Bushfire Management Overlay',
    WMO: 'Wildfire Management Overlay',
    LSIO: 'Land Subject to Inundation Overlay',
    FO: 'Flood Overlay',
    SBO: 'Special Building Overlay',
    HO: 'Heritage Overlay',
    DDO: 'Design and Development Overlay',
    EMO: 'Environmental Management Overlay',
    VPO: 'Vegetation Protection Overlay',
    ESO: 'Environmental Significance Overlay',
    PO: 'Parking Overlay',
    DCPO: 'Development Contributions Plan Overlay',
  };

  for (const [prefix, name] of Object.entries(nameMap)) {
    if (upper.startsWith(prefix)) {
      return name;
    }
  }

  return code; // Fallback to code if unknown
}

/**
 * Fetch overlay polygon geometries within a bounding box.
 *
 * @param minLon - Minimum longitude (west)
 * @param minLat - Minimum latitude (south)
 * @param maxLon - Maximum longitude (east)
 * @param maxLat - Maximum latitude (north)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Array of overlay geometries with metadata
 */
export async function fetchOverlayGeometries(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  timeoutMs = 20000,
): Promise<OverlayGeometry[]> {
  // Validate bounding box
  if (
    !Number.isFinite(minLon) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLon) ||
    !Number.isFinite(maxLat)
  ) {
    console.warn('[overlayService] Invalid bounding box coordinates');
    return [];
  }

  // Construct ArcGIS envelope geometry
  const envelope = {
    xmin: minLon,
    ymin: minLat,
    xmax: maxLon,
    ymax: maxLat,
    spatialReference: { wkid: 4326 },
  };

  const params = {
    geometry: JSON.stringify(envelope),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'scheme_code,zone_description',
    returnGeometry: 'true',
    f: 'json',
  };

  try {
    const { data } = await axios.get<ArcGISResponse>(OVERLAYS_URL, {
      params,
      timeout: timeoutMs,
    });

    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message}`);
    }

    const overlays: OverlayGeometry[] = [];

    for (const feature of data.features ?? []) {
      const code = feature.attributes.scheme_code;
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        continue;
      }

      const description =
        typeof feature.attributes.zone_description === 'string'
          ? feature.attributes.zone_description
          : undefined;

      try {
        const geometry = arcgisToGeoJSON(feature.geometry);
        overlays.push({
          code: code.trim(),
          name: getOverlayName(code, description),
          geometry,
          risk: classifyOverlayRisk(code),
        });
      } catch (err) {
        console.warn('[overlayService] Failed to parse geometry for overlay:', code, err);
        continue;
      }
    }

    console.log(`[overlayService] Fetched ${overlays.length} overlay geometries`);
    return overlays;
  } catch (error) {
    console.error('[overlayService] Failed to fetch overlay geometries:', error);
    return [];
  }
}

/**
 * Fetch overlay geometries for a specific point with buffer radius.
 *
 * @param lon - Longitude
 * @param lat - Latitude
 * @param bufferMeters - Buffer radius in meters (default: 100m)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Array of overlay geometries within buffer
 */
export async function fetchOverlaysNearPoint(
  lon: number,
  lat: number,
  bufferMeters = 100,
  timeoutMs = 20000,
): Promise<OverlayGeometry[]> {
  // Calculate approximate bounding box from buffer
  // 1 degree latitude ≈ 111km
  // 1 degree longitude ≈ 111km * cos(latitude)
  const latDelta = (bufferMeters / 111000);
  const lonDelta = (bufferMeters / (111000 * Math.cos((lat * Math.PI) / 180)));

  return fetchOverlayGeometries(
    lon - lonDelta,
    lat - latDelta,
    lon + lonDelta,
    lat + latDelta,
    timeoutMs,
  );
}

/**
 * Convert overlay geometries to GeoJSON FeatureCollection for Mapbox rendering.
 *
 * @param overlays - Array of overlay geometries
 * @returns GeoJSON FeatureCollection
 */
export function overlaysToGeoJSON(overlays: OverlayGeometry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: overlays.map((overlay) => ({
      type: 'Feature',
      properties: {
        code: overlay.code,
        name: overlay.name,
        risk: overlay.risk,
      },
      geometry: overlay.geometry,
    })),
  };
}
