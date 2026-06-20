/**
 * Spatial Query Utilities - PostGIS Integration
 *
 * High-performance spatial queries for reverse property search.
 * Leverages PostGIS for advanced geometric operations.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PropertySearchFilters {
  /** Bounding box: [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number];

  /** Minimum lot area in square meters */
  minArea?: number;

  /** Maximum lot area in square meters */
  maxArea?: number;

  /** Zone codes to include (e.g., ["GRZ", "NRZ"]) */
  zoneTypes?: string[];

  /** Overlays to exclude (e.g., ["HO", "BMO"]) */
  excludeOverlays?: string[];

  /** Only show SSD-eligible properties */
  ssdEligibleOnly?: boolean;

  /** Suburbs to filter by */
  suburbs?: string[];

  /** Maximum number of results */
  limit?: number;
}

export interface PropertyParcelResult {
  pfi: string;
  geometry: any; // GeoJSON geometry
  lotArea: number;
  address: string;
  suburb: string;
  postcode: string;
  zoneCode: string;
  overlays: string[];
  ssdEligible: boolean;
  centroidX: number;
  centroidY: number;
}

/**
 * Search for properties using PostGIS spatial queries
 *
 * @param filters - Search criteria
 * @returns GeoJSON FeatureCollection of matching properties
 */
export async function searchPropertiesPostGIS(
  filters: PropertySearchFilters
): Promise<GeoJSON.FeatureCollection> {
  const {
    bbox,
    minArea = 0,
    maxArea = 999999,
    zoneTypes = [],
    excludeOverlays = [],
    ssdEligibleOnly = false,
    suburbs = [],
    limit = 100,
  } = filters;

  // Build WHERE clause components
  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Bounding box filter (PostGIS ST_MakeEnvelope)
  if (bbox && bbox.length === 4) {
    whereConditions.push(
      `ST_Intersects(geometry, ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326))`
    );
    params.push(bbox[0], bbox[1], bbox[2], bbox[3]);
    paramIndex += 4;
  }

  // Lot area filter
  whereConditions.push(`lot_area >= $${paramIndex}`);
  params.push(minArea);
  paramIndex++;

  whereConditions.push(`lot_area <= $${paramIndex}`);
  params.push(maxArea);
  paramIndex++;

  // Zone filter (if specified)
  if (zoneTypes.length > 0) {
    // Match any zone that starts with one of the specified types
    const zoneConditions = zoneTypes
      .map((_, idx) => `zone_code LIKE $${paramIndex + idx}`)
      .join(' OR ');
    whereConditions.push(`(${zoneConditions})`);
    params.push(...zoneTypes.map((z) => `${z}%`));
    paramIndex += zoneTypes.length;
  }

  // Exclude overlays
  if (excludeOverlays.length > 0) {
    for (const overlay of excludeOverlays) {
      if (overlay === 'HO') {
        whereConditions.push('has_heritage = false');
      } else if (overlay === 'BMO') {
        whereConditions.push('has_bushfire = false');
      } else if (overlay.includes('LSIO') || overlay.includes('FO')) {
        whereConditions.push('has_flood = false');
      }
    }
  }

  // SSD eligibility filter
  if (ssdEligibleOnly) {
    whereConditions.push('ssd_eligible = true');
  }

  // Suburb filter (if specified)
  if (suburbs.length > 0) {
    const suburbConditions = suburbs
      .map((_, idx) => `suburb = $${paramIndex + idx}`)
      .join(' OR ');
    whereConditions.push(`(${suburbConditions})`);
    params.push(...suburbs);
    paramIndex += suburbs.length;
  }

  // Construct final query
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT
      pfi,
      ST_AsGeoJSON(geometry) as geometry,
      lot_area,
      address,
      suburb,
      postcode,
      zone_code,
      overlays,
      ssd_eligible,
      centroid_x,
      centroid_y
    FROM property_parcels
    ${whereClause}
    ORDER BY lot_area DESC
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  console.log('[spatialQuery] Executing PostGIS query:', {
    filters,
    paramCount: params.length,
  });

  try {
    const results = await prisma.$queryRawUnsafe<PropertyParcelResult[]>(query, ...params);

    console.log(`[spatialQuery] Found ${results.length} matching parcels`);

    // Convert to GeoJSON FeatureCollection
    const features: GeoJSON.Feature[] = results.map((parcel) => ({
      type: 'Feature',
      geometry: JSON.parse(parcel.geometry as any),
      properties: {
        pfi: parcel.pfi,
        lotArea: parcel.lotArea,
        address: parcel.address,
        suburb: parcel.suburb,
        postcode: parcel.postcode,
        zoneCode: parcel.zoneCode,
        overlays: parcel.overlays,
        ssdEligible: parcel.ssdEligible,
        centroidX: parcel.centroidX,
        centroidY: parcel.centroidY,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  } catch (error) {
    console.error('[spatialQuery] PostGIS query failed:', error);
    throw error;
  }
}

/**
 * Get property count for given filters (for UI statistics)
 */
export async function countPropertiesPostGIS(
  filters: PropertySearchFilters
): Promise<number> {
  const {
    bbox,
    minArea = 0,
    maxArea = 999999,
    zoneTypes = [],
    excludeOverlays = [],
    ssdEligibleOnly = false,
    suburbs = [],
  } = filters;

  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Bounding box filter
  if (bbox && bbox.length === 4) {
    whereConditions.push(
      `ST_Intersects(geometry, ST_MakeEnvelope($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 4326))`
    );
    params.push(bbox[0], bbox[1], bbox[2], bbox[3]);
    paramIndex += 4;
  }

  // Lot area filter
  whereConditions.push(`lot_area >= $${paramIndex}`);
  params.push(minArea);
  paramIndex++;

  whereConditions.push(`lot_area <= $${paramIndex}`);
  params.push(maxArea);
  paramIndex++;

  // Zone filter
  if (zoneTypes.length > 0) {
    const zoneConditions = zoneTypes
      .map((_, idx) => `zone_code LIKE $${paramIndex + idx}`)
      .join(' OR ');
    whereConditions.push(`(${zoneConditions})`);
    params.push(...zoneTypes.map((z) => `${z}%`));
    paramIndex += zoneTypes.length;
  }

  // Exclude overlays
  if (excludeOverlays.length > 0) {
    for (const overlay of excludeOverlays) {
      if (overlay === 'HO') {
        whereConditions.push('has_heritage = false');
      } else if (overlay === 'BMO') {
        whereConditions.push('has_bushfire = false');
      } else if (overlay.includes('LSIO') || overlay.includes('FO')) {
        whereConditions.push('has_flood = false');
      }
    }
  }

  // SSD eligibility
  if (ssdEligibleOnly) {
    whereConditions.push('ssd_eligible = true');
  }

  // Suburb filter
  if (suburbs.length > 0) {
    const suburbConditions = suburbs
      .map((_, idx) => `suburb = $${paramIndex + idx}`)
      .join(' OR ');
    whereConditions.push(`(${suburbConditions})`);
    params.push(...suburbs);
    paramIndex += suburbs.length;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT COUNT(*) as count
    FROM property_parcels
    ${whereClause}
  `;

  try {
    const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(query, ...params);
    return Number(result[0].count);
  } catch (error) {
    console.error('[spatialQuery] Count query failed:', error);
    return 0;
  }
}

/**
 * Check if PostGIS extension is installed
 */
export async function checkPostGISInstalled(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<[{ version: string }]>`
      SELECT PostGIS_version() as version
    `;
    console.log('[spatialQuery] PostGIS version:', result[0].version);
    return true;
  } catch (error) {
    console.error('[spatialQuery] PostGIS not installed:', error);
    return false;
  }
}
