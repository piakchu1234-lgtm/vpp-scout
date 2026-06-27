/**
 * SIMPLIFIED VICMAP PROPERTY INGESTION SCRIPT
 *
 * Streams GeoJSON features and inserts them into property_parcels table.
 * Uses readline to process line-by-line to avoid memory issues.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import pg from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Configuration
const INPUT_FILE = './data/Vicmap Property - Property Polygon with Property and Address Detail/Vicmap Property - Property Polygon with Property and Address Detail.geojson';
const BATCH_SIZE = 100;
const LOG_INTERVAL = 500;

// Statistics
const stats = {
  processed: 0,
  inserted: 0,
  errors: 0,
  startTime: Date.now(),
};

let batch = [];
let client = null;

/**
 * Parse overlay codes
 */
function parseOverlayCodes(overlayRaw) {
  const codes = [];
  for (const raw of overlayRaw) {
    const match = raw.match(/^([A-Z]+)/);
    if (match) codes.push(match[1]);
  }
  return [...new Set(codes)];
}

/**
 * Check SSD eligibility
 */
function isSSDEligible(lotArea, zoneCode, overlays) {
  if (lotArea < 300) return false;

  const zonePrefix = zoneCode?.match(/^([A-Z]+)/)?.[1];
  if (!zonePrefix || !['GRZ', 'NRZ', 'RGZ'].includes(zonePrefix)) return false;

  const disqualifying = ['HO', 'ESO', 'VPO', 'SLO', 'BMO'];
  return !overlays.some(o => disqualifying.includes(o));
}

/**
 * Insert a batch of records
 */
async function insertBatch(records) {
  if (records.length === 0) return;

  for (const r of records) {
    try {
      await client.query(`
        INSERT INTO property_parcels (
          pfi, geometry, lot_area, frontage_estimate, address, suburb, postcode, lga,
          centroid_x, centroid_y, zone_code, overlays, has_heritage, has_bushfire,
          has_flood, ssd_eligible, last_updated, data_source
        )
        VALUES ($1, ST_GeomFromGeoJSON($2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), 'vicmap')
        ON CONFLICT (pfi) DO NOTHING
      `, [
        r.pfi, r.geometry, r.lotArea, r.frontageEstimate, r.address, r.suburb,
        r.postcode, r.lga, r.centroidX, r.centroidY, r.zoneCode, r.overlays,
        r.hasHeritage, r.hasBushfire, r.hasFlood, r.ssdEligible
      ]);
      stats.inserted++;
    } catch (err) {
      stats.errors++;
      if (stats.errors <= 10) {
        console.error(`Error inserting PFI ${r.pfi}:`, err.message);
      }
    }
  }
}

/**
 * Process a single GeoJSON feature
 */
async function processFeature(feature) {
  try {
    const props = feature.properties || {};
    const geom = feature.geometry;

    if (!geom || !props.PFI) {
      stats.errors++;
      return;
    }

    // Extract coordinates for centroid
    const coords = geom.type === 'Polygon' ? geom.coordinates[0][0] : [0, 0];
    const [lng, lat] = coords;

    // Parse overlays
    const overlayRaw = props.OVERLAY ? props.OVERLAY.split(',').map(s => s.trim()) : [];
    const overlayCodes = parseOverlayCodes(overlayRaw);

    const lotArea = props.SHAPE_Area || 0;
    const zoneCode = props.ZONE_CODE || 'UNKNOWN';

    const record = {
      pfi: props.PFI,
      geometry: JSON.stringify(geom),
      lotArea,
      frontageEstimate: null,
      address: props.EZI_ADDRESS || 'Unknown',
      suburb: props.LOCALITY_NAME || '',
      postcode: props.POSTCODE || '',
      lga: props.LGA_NAME || null,
      centroidX: lng,
      centroidY: lat,
      zoneCode,
      overlays: overlayRaw,
      hasHeritage: overlayRaw.some(o => o.startsWith('HO')),
      hasBushfire: overlayRaw.some(o => o.startsWith('BMO')),
      hasFlood: overlayRaw.some(o => o.startsWith('FO') || o.startsWith('LSIO')),
      ssdEligible: isSSDEligible(lotArea, zoneCode, overlayCodes),
    };

    batch.push(record);
    stats.processed++;

    // Insert batch when full
    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      batch = [];
    }

    // Log progress
    if (stats.processed % LOG_INTERVAL === 0) {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = Math.round(stats.processed / elapsed);
      console.log(
        `[Ingestion] Processed: ${stats.processed.toLocaleString()} | ` +
        `Inserted: ${stats.inserted.toLocaleString()} | ` +
        `Rate: ${rate}/sec | ` +
        `Errors: ${stats.errors}`
      );
    }
  } catch (err) {
    stats.errors++;
  }
}

/**
 * Main ingestion function
 */
async function ingest() {
  console.log('='.repeat(70));
  console.log('VICMAP PROPERTY PARCEL INGESTION (Node.js)');
  console.log('='.repeat(70));
  console.log(`Input: ${INPUT_FILE}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('='.repeat(70));
  console.log('');

  client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fileStream = createReadStream(INPUT_FILE, { encoding: 'utf8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let featureCollection = '';
    let inFeatures = false;

    for await (const line of rl) {
      // Look for features array
      if (line.includes('"features"')) {
        inFeatures = true;
        continue;
      }

      if (!inFeatures) continue;

      // Try to parse feature from line
      const trimmed = line.trim();
      if (trimmed.startsWith('{') && trimmed.includes('"type"') && trimmed.includes('"Feature"')) {
        try {
          // Remove trailing comma if present
          const json = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
          const feature = JSON.parse(json);
          await processFeature(feature);
        } catch (err) {
          // Not a complete feature, accumulate
          featureCollection += line;

          // Try to parse accumulated
          if (featureCollection.includes('}')) {
            try {
              const json = featureCollection.trim();
              const cleaned = json.endsWith(',') ? json.slice(0, -1) : json;
              const feature = JSON.parse(cleaned);
              await processFeature(feature);
              featureCollection = '';
            } catch {}
          }
        }
      } else {
        featureCollection += line;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      await insertBatch(batch);
    }

    await client.query('COMMIT');

    const elapsed = (Date.now() - stats.startTime) / 1000;
    console.log('\n' + '='.repeat(70));
    console.log('INGESTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Processed: ${stats.processed.toLocaleString()}`);
    console.log(`Inserted: ${stats.inserted.toLocaleString()}`);
    console.log(`Errors: ${stats.errors.toLocaleString()}`);
    console.log(`Time: ${(elapsed / 60).toFixed(1)} minutes`);
    console.log(`Rate: ${Math.round(stats.processed / elapsed)}/sec`);
    console.log('='.repeat(70));

    // Verify spatial index
    console.log('\nVerifying spatial index...');
    const result = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'property_parcels'
      AND indexname LIKE '%geometry%'
    `);

    if (result.rows.length === 0) {
      console.log('Creating spatial index...');
      await client.query(`
        CREATE INDEX property_parcels_geometry_idx
        ON property_parcels USING GIST (geometry)
      `);
      console.log('✓ Spatial index created');
    } else {
      console.log('✓ Spatial index exists:', result.rows[0].indexname);
    }

    console.log('\nRunning ANALYZE...');
    await client.query('ANALYZE property_parcels');
    console.log('✓ Table statistics updated');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ INGESTION FAILED:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
ingest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
