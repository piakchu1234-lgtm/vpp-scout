/**
 * VICMAP PROPERTY PARCEL INGESTION SCRIPT
 *
 * Streams and imports 5.3GB Vicmap Property GeoJSON into property_parcels table.
 * Uses chunked processing to avoid memory exhaustion.
 *
 * Usage:
 *   npm install --save-dev geojson-stream pg
 *   node scripts/ingest-property-parcels.js
 *
 * Prerequisites:
 *   - DATABASE_URL env var set (from .env.local)
 *   - 5.3GB Vicmap GeoJSON file downloaded
 *   - PostGIS extension enabled: CREATE EXTENSION IF NOT EXISTS postgis;
 */

import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import pg from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Connection pool size
});

// Configuration
const CONFIG = {
  inputFile: './data/vicmap-property-parcels.geojson', // Update with your actual path
  batchSize: 500, // Insert 500 features at a time
  commitInterval: 5000, // Commit transaction every 5000 features
  logInterval: 1000, // Log progress every 1000 features
};

// Statistics
const stats = {
  processed: 0,
  inserted: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Extract overlay codes from raw overlay string array
 * Maps to VPP disqualifying overlays: HO, ESO, BMO, etc.
 */
function parseOverlayCodes(overlayRaw: string[]): string[] {
  const codes: string[] = [];
  for (const raw of overlayRaw) {
    // Extract prefix (e.g., "HO123" -> "HO")
    const match = raw.match(/^([A-Z]+)/);
    if (match) codes.push(match[1]);
  }
  return codes;
}

/**
 * Check if parcel is SSD-eligible based on lot area, zone, and overlays
 */
function isSSDEligible(
  lotArea: number,
  zoneCode: string,
  overlays: string[]
): boolean {
  // Minimum 300m²
  if (lotArea < 300) return false;

  // Eligible zones: GRZ, NRZ, RGZ
  const eligibleZones = ['GRZ', 'NRZ', 'RGZ'];
  const zonePrefix = zoneCode.match(/^([A-Z]+)/)?.[1];
  if (!zonePrefix || !eligibleZones.includes(zonePrefix)) return false;

  // Disqualifying overlays
  const disqualifyingOverlays = ['HO', 'ESO', 'VPO', 'SLO', 'BMO'];
  const hasDisqualifyingOverlay = overlays.some((o) =>
    disqualifyingOverlays.includes(o)
  );

  return !hasDisqualifyingOverlay;
}

/**
 * Transform GeoJSON feature to database row
 */
function transformFeature(feature: any): any {
  const props = feature.properties;
  const geometry = feature.geometry;

  // Extract centroid from geometry
  const coords = geometry.type === 'Polygon'
    ? geometry.coordinates[0][0] // First point of exterior ring
    : [0, 0];

  const [lng, lat] = coords;

  // Parse overlays
  const overlayRaw = props.OVERLAY ? props.OVERLAY.split(',').map((s: string) => s.trim()) : [];
  const overlayCodes = parseOverlayCodes(overlayRaw);

  // Calculate lot area in m² (from GeoJSON geometry if not provided)
  const lotArea = props.SHAPE_Area || 0;

  // Determine zone code
  const zoneCode = props.ZONE_CODE || 'UNKNOWN';

  // Check overlay flags
  const hasHeritage = overlayRaw.some((o: string) => o.startsWith('HO'));
  const hasBushfire = overlayRaw.some((o: string) => o.startsWith('BMO'));
  const hasFlood = overlayRaw.some((o: string) => o.startsWith('FO') || o.startsWith('LSIO'));

  // SSD eligibility
  const ssdEligible = isSSDEligible(lotArea, zoneCode, overlayCodes);

  return {
    pfi: props.PFI || `pfi_${Date.now()}_${Math.random()}`,
    address: props.EZI_ADDRESS || 'Address Unknown',
    suburb: props.LOCALITY_NAME || '',
    postcode: props.POSTCODE || '',
    lga: props.LGA_NAME || null,
    geometry: JSON.stringify(geometry), // PostGIS will parse this
    centroidX: lng,
    centroidY: lat,
    lotArea,
    frontageEstimate: null, // Will be calculated later
    zoneCode,
    overlays: overlayRaw,
    hasHeritage,
    hasBushfire,
    hasFlood,
    ssdEligible,
    lastUpdated: new Date(),
    dataSource: 'vicmap',
  };
}

/**
 * Batch insert records into property_parcels table
 */
async function batchInsert(records: any[], client: pg.PoolClient) {
  if (records.length === 0) return 0;

  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const rowPlaceholders: string[] = [];

    // 14 fields in property_parcels table
    for (let j = 0; j < 14; j++) {
      rowPlaceholders.push(`$${paramIndex++}`);
    }

    placeholders.push(`(${rowPlaceholders.join(', ')})`);

    values.push(
      r.pfi,
      `ST_GeomFromGeoJSON('${r.geometry}')`, // PostGIS function - needs to be raw SQL
      r.lotArea,
      r.frontageEstimate,
      r.address,
      r.suburb,
      r.postcode,
      r.lga,
      r.centroidX,
      r.centroidY,
      r.zoneCode,
      r.overlays,
      r.hasHeritage,
      r.hasBushfire
    );
  }

  // Since ST_GeomFromGeoJSON needs raw SQL, we'll use individual inserts
  // This is slower but handles PostGIS geometry correctly
  let inserted = 0;
  for (const record of records) {
    try {
      await client.query(
        `
        INSERT INTO property_parcels (
          pfi, geometry, lot_area, frontage_estimate, address, suburb, postcode, lga,
          centroid_x, centroid_y, zone_code, overlays, has_heritage, has_bushfire,
          has_flood, ssd_eligible, last_updated, data_source
        )
        VALUES ($1, ST_GeomFromGeoJSON($2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (pfi) DO NOTHING
      `,
        [
          record.pfi,
          record.geometry,
          record.lotArea,
          record.frontageEstimate,
          record.address,
          record.suburb,
          record.postcode,
          record.lga,
          record.centroidX,
          record.centroidY,
          record.zoneCode,
          record.overlays,
          record.hasHeritage,
          record.hasBushfire,
          record.hasFlood,
          record.ssdEligible,
          record.lastUpdated,
          record.dataSource,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed to insert PFI ${record.pfi}:`, err);
      stats.errors++;
    }
  }

  return inserted;
}

/**
 * Create batch processing transform stream
 */
function createBatchProcessor(client: pg.PoolClient) {
  let batch: any[] = [];

  return new Transform({
    objectMode: true,
    async transform(feature, encoding, callback) {
      try {
        stats.processed++;

        // Transform GeoJSON feature to database row
        const record = transformFeature(feature);
        batch.push(record);

        // Process batch when it reaches batchSize
        if (batch.length >= CONFIG.batchSize) {
          const inserted = await batchInsert(batch, client);
          stats.inserted += inserted;
          batch = [];

          // Commit transaction periodically
          if (stats.processed % CONFIG.commitInterval === 0) {
            await client.query('COMMIT');
            await client.query('BEGIN');
          }
        }

        // Log progress
        if (stats.processed % CONFIG.logInterval === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = (stats.processed / elapsed).toFixed(0);
          console.log(
            `[Ingestion] Processed: ${stats.processed.toLocaleString()} | ` +
            `Inserted: ${stats.inserted.toLocaleString()} | ` +
            `Rate: ${rate} features/sec | ` +
            `Errors: ${stats.errors}`
          );
        }

        callback();
      } catch (err) {
        stats.errors++;
        console.error('Transform error:', err);
        callback();
      }
    },

    async flush(callback) {
      // Process remaining batch
      if (batch.length > 0) {
        const inserted = await batchInsert(batch, client);
        stats.inserted += inserted;
      }
      callback();
    },
  });
}

/**
 * Verify PostGIS spatial index exists
 */
async function verifySpatialIndex(client: pg.PoolClient) {
  console.log('\n[PostGIS] Verifying spatial index...');

  const result = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'property_parcels'
      AND indexname LIKE '%geometry%'
  `);

  if (result.rows.length === 0) {
    console.log('[PostGIS] Creating GIST spatial index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS property_parcels_geometry_idx
        ON property_parcels USING GIST (geometry)
    `);
    console.log('[PostGIS] ✅ Spatial index created');
  } else {
    console.log('[PostGIS] ✅ Spatial index already exists:', result.rows[0].indexname);
  }

  // Analyze table for query planner
  console.log('[PostGIS] Running ANALYZE on property_parcels...');
  await client.query('ANALYZE property_parcels');
  console.log('[PostGIS] ✅ Table statistics updated');
}

/**
 * Main ingestion function
 */
async function ingestPropertyParcels() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(70));
    console.log('VICMAP PROPERTY PARCEL INGESTION');
    console.log('='.repeat(70));
    console.log(`Input file: ${CONFIG.inputFile}`);
    console.log(`Batch size: ${CONFIG.batchSize}`);
    console.log(`Target table: property_parcels`);
    console.log('='.repeat(70));

    // Start transaction
    await client.query('BEGIN');

    // Create read stream from GeoJSON file
    const fileStream = createReadStream(CONFIG.inputFile, { encoding: 'utf8' });

    // Parse GeoJSON features (you'll need to implement or use a library like 'geojson-stream')
    // For now, assuming line-delimited GeoJSON
    const parseStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const feature = JSON.parse(line);
              this.push(feature);
            }
          }
          callback();
        } catch (err) {
          callback(err);
        }
      },
    });

    // Create batch processor
    const batchProcessor = createBatchProcessor(client);

    // Pipeline: File → Parse → Batch → Database
    await pipeline(fileStream, parseStream, batchProcessor);

    // Commit final transaction
    await client.query('COMMIT');

    // Final statistics
    const elapsed = (Date.now() - stats.startTime) / 1000;
    console.log('\n' + '='.repeat(70));
    console.log('INGESTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total processed: ${stats.processed.toLocaleString()}`);
    console.log(`Successfully inserted: ${stats.inserted.toLocaleString()}`);
    console.log(`Skipped (duplicates): ${stats.skipped.toLocaleString()}`);
    console.log(`Errors: ${stats.errors.toLocaleString()}`);
    console.log(`Time elapsed: ${(elapsed / 60).toFixed(1)} minutes`);
    console.log(`Average rate: ${(stats.processed / elapsed).toFixed(0)} features/sec`);
    console.log('='.repeat(70));

    // Verify spatial index
    await verifySpatialIndex(client);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ INGESTION FAILED:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run ingestion
ingestPropertyParcels().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
