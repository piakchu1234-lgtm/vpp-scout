/**
 * Vicmap Parcel Data Ingestion Utility
 *
 * Bulk loads Vicmap parcel data into PostgreSQL with PostGIS.
 * Processes geometry, planning zones, and pre-calculates SSD eligibility.
 */

import { PrismaClient } from '@prisma/client';
import type { ParcelFeature } from '@/lib/vicPlanApi';

const prisma = new PrismaClient();

export interface ParcelIngestionStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duration: number;
}

/**
 * Convert GeoJSON geometry to PostGIS WKT format
 */
function geometryToWKT(geometry: any): string {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates
      .map((ring: number[][]) => {
        const points = ring.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
        return `(${points})`;
      })
      .join(', ');
    return `POLYGON(${rings})`;
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates
      .map((polygon: number[][][]) => {
        const rings = polygon
          .map((ring: number[][]) => {
            const points = ring.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
            return `(${points})`;
          })
          .join(', ');
        return `(${rings})`;
      })
      .join(', ');
    return `MULTIPOLYGON(${polygons})`;
  }

  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(geometry: any): [number, number] {
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0];
    const sumX = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
    const sumY = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
    return [sumX / ring.length, sumY / ring.length];
  }

  // Fallback for MultiPolygon (use first polygon)
  if (geometry.type === 'MultiPolygon') {
    const ring = geometry.coordinates[0][0];
    const sumX = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
    const sumY = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
    return [sumX / ring.length, sumY / ring.length];
  }

  return [0, 0];
}

/**
 * Check if parcel is SSD eligible based on criteria
 */
function isSSDEligible(
  lotArea: number,
  zoneCode: string,
  overlays: string[]
): boolean {
  // Minimum lot size: 300sqm
  if (lotArea < 300) return false;

  // Eligible zones
  const eligibleZones = ['GRZ', 'NRZ', 'RGZ', 'MUZ', 'TZ'];
  const zonePrefix = zoneCode.replace(/\d+/g, '');
  if (!eligibleZones.includes(zonePrefix)) return false;

  // Restrictive overlays
  const restrictiveOverlays = ['HO', 'BMO', 'LSIO', 'SBO', 'BFO', 'VPO'];
  const hasRestrictiveOverlay = overlays.some((overlay) =>
    restrictiveOverlays.some((restrictive) => overlay.startsWith(restrictive))
  );

  if (hasRestrictiveOverlay) return false;

  return true;
}

/**
 * Ingest a single parcel into the database
 */
export async function ingestParcel(
  pfi: string,
  geometry: any,
  lotArea: number,
  address: string,
  suburb: string,
  postcode: string,
  lga: string | null,
  zoneCode: string,
  overlays: string[]
): Promise<void> {
  const wkt = geometryToWKT(geometry);
  const [centroidX, centroidY] = calculateCentroid(geometry);
  const ssdEligible = isSSDEligible(lotArea, zoneCode, overlays);

  // Check for specific overlays
  const hasHeritage = overlays.some((o) => o.startsWith('HO'));
  const hasBushfire = overlays.some((o) => o.startsWith('BMO'));
  const hasFlood = overlays.some((o) => o.includes('LSIO') || o.includes('FO'));

  const query = `
    INSERT INTO property_parcels (
      id,
      pfi,
      geometry,
      lot_area,
      address,
      suburb,
      postcode,
      lga,
      centroid_x,
      centroid_y,
      zone_code,
      overlays,
      has_heritage,
      has_bushfire,
      has_flood,
      ssd_eligible,
      last_updated,
      data_source,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      $1,
      ST_GeomFromText($2, 4326),
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      NOW(),
      'vicmap',
      NOW(),
      NOW()
    )
    ON CONFLICT (pfi) DO UPDATE SET
      geometry = ST_GeomFromText($2, 4326),
      lot_area = $3,
      address = $4,
      suburb = $5,
      postcode = $6,
      lga = $7,
      centroid_x = $8,
      centroid_y = $9,
      zone_code = $10,
      overlays = $11,
      has_heritage = $12,
      has_bushfire = $13,
      has_flood = $14,
      ssd_eligible = $15,
      last_updated = NOW(),
      updated_at = NOW()
  `;

  await prisma.$executeRawUnsafe(
    query,
    pfi,
    wkt,
    lotArea,
    address,
    suburb,
    postcode,
    lga,
    centroidX,
    centroidY,
    zoneCode,
    overlays,
    hasHeritage,
    hasBushfire,
    hasFlood,
    ssdEligible
  );
}

/**
 * Bulk ingest parcels from Vicmap API
 */
export async function bulkIngestParcels(
  parcels: ParcelFeature[]
): Promise<ParcelIngestionStats> {
  const startTime = Date.now();
  const stats: ParcelIngestionStats = {
    total: parcels.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
  };

  console.log(`[parcelIngestion] Starting bulk ingest of ${parcels.length} parcels...`);

  for (const parcel of parcels) {
    try {
      const pfi = parcel.properties.PARCEL_PFI || '';
      if (!pfi) {
        stats.skipped++;
        continue;
      }

      // For now, use placeholder values - these would come from enriched Vicmap data
      const lotArea = 0; // TODO: Calculate from geometry using Turf.js area()
      const address = 'Unknown';
      const suburb = 'Unknown';
      const postcode = '0000';
      const lga = null;
      const zoneCode = parcel.properties.ZONE_CODE || 'UNKNOWN';
      const overlays: string[] = []; // TODO: Fetch from VicPlan API

      await ingestParcel(
        pfi,
        parcel.geometry,
        lotArea,
        address,
        suburb,
        postcode,
        lga,
        zoneCode,
        overlays
      );

      stats.inserted++;

      if (stats.inserted % 100 === 0) {
        console.log(`[parcelIngestion] Progress: ${stats.inserted}/${stats.total}`);
      }
    } catch (error) {
      stats.errors++;
      console.error('[parcelIngestion] Error ingesting parcel:', error);
    }
  }

  stats.duration = Date.now() - startTime;

  console.log(`[parcelIngestion] Complete!`, {
    total: stats.total,
    inserted: stats.inserted,
    errors: stats.errors,
    duration: `${stats.duration}ms`,
    rate: `${Math.round((stats.total / stats.duration) * 1000)} parcels/sec`,
  });

  return stats;
}

/**
 * Example: Ingest parcels for a specific suburb
 */
export async function ingestSuburb(suburb: string): Promise<ParcelIngestionStats> {
  // TODO: Fetch parcels from Vicmap API for the suburb
  // This would require a Vicmap WFS query by suburb name

  console.log(`[parcelIngestion] Ingesting parcels for suburb: ${suburb}`);

  // Placeholder - implement actual Vicmap fetch
  return {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
  };
}
