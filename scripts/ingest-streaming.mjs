/**
 * VICMAP PROPERTY INGESTION - STREAMING JSON PARSER
 *
 * Properly handles large FeatureCollection GeoJSON files
 */

import { createReadStream } from 'fs';
import pg from 'pg';
import { config } from 'dotenv';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const INPUT_FILE = './data/Vicmap Property - Property Polygon with Property and Address Detail/Vicmap Property - Property Polygon with Property and Address Detail.geojson';
const BATCH_SIZE = 100;
const LOG_INTERVAL = 500;

const stats = {
  processed: 0,
  inserted: 0,
  errors: 0,
  startTime: Date.now(),
};

let client = null;
let batch = [];

function parseOverlayCodes(overlayRaw) {
  const codes = [];
  for (const raw of overlayRaw) {
    const match = raw.match(/^([A-Z]+)/);
    if (match) codes.push(match[1]);
  }
  return [...new Set(codes)];
}

function isSSDEligible(lotArea, zoneCode, overlays) {
  if (lotArea < 300) return false;
  const zonePrefix = zoneCode?.match(/^([A-Z]+)/)?.[1];
  if (!zonePrefix || !['GRZ', 'NRZ', 'RGZ'].includes(zonePrefix)) return false;
  const disqualifying = ['HO', 'ESO', 'VPO', 'SLO', 'BMO'];
  return !overlays.some(o => disqualifying.includes(o));
}

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

function createFeatureParser() {
  let buffer = '';
  let inFeatures = false;
  let depth = 0;
  let featureBuffer = '';

  return new Transform({
    objectMode: false,
    transform(chunk, encoding, callback) {
      buffer += chunk.toString();

      // Look for features array start
      if (!inFeatures && buffer.includes('"features"')) {
        inFeatures = true;
        // Remove everything before features array
        const featuresIndex = buffer.indexOf('"features"');
        buffer = buffer.substring(featuresIndex);
        // Find the opening bracket
        const bracketIndex = buffer.indexOf('[');
        if (bracketIndex !== -1) {
          buffer = buffer.substring(bracketIndex + 1);
        }
      }

      if (!inFeatures) {
        callback();
        return;
      }

      // Parse features one by one
      while (buffer.length > 0) {
        const char = buffer[0];

        if (char === '{') {
          depth++;
          featureBuffer += char;
        } else if (char === '}') {
          depth--;
          featureBuffer += char;

          if (depth === 0 && featureBuffer.length > 0) {
            // Complete feature found
            try {
              const feature = JSON.parse(featureBuffer);
              this.push(feature);
            } catch (err) {
              // Parsing error, skip this feature
              stats.errors++;
            }
            featureBuffer = '';
          }
        } else if (depth > 0) {
          featureBuffer += char;
        }

        buffer = buffer.substring(1);

        // Break if buffer is getting too small
        if (buffer.length < 1000 && depth > 0) {
          break;
        }
      }

      callback();
    },
  });
}

function createFeatureProcessor() {
  return new Transform({
    objectMode: true,
    async transform(feature, encoding, callback) {
      try {
        const props = feature.properties || {};
        const geom = feature.geometry;

        if (!geom || !props.PROP_PFI) {
          stats.errors++;
          callback();
          return;
        }

        // Extract first coordinate for centroid
        let coords;
        if (geom.type === 'MultiPolygon') {
          coords = geom.coordinates[0][0][0];
        } else if (geom.type === 'Polygon') {
          coords = geom.coordinates[0][0];
        } else {
          coords = [0, 0];
        }

        const [lng, lat] = coords;

        // Get overlay data - check various field names
        const overlayField = props.OVERLAY || props.overlays || '';
        const overlayRaw = overlayField ? overlayField.split(',').map(s => s.trim()) : [];
        const overlayCodes = parseOverlayCodes(overlayRaw);

        // Calculate lot area from geometry if not provided
        const lotArea = props.SHAPE_Area || props.shape_area || 0;

        // Get zone code - check various field names
        const zoneCode = props.ZONE_CODE || props.zone_code || props.ZONE || 'UNKNOWN';

        const record = {
          pfi: props.PROP_PFI,
          geometry: JSON.stringify(geom),
          lotArea,
          frontageEstimate: null,
          address: props.EZI_ADD || props.ADDRESS || 'Unknown',
          suburb: props.LOCALITY || props.locality || '',
          postcode: props.POSTCODE || props.postcode || '',
          lga: props.LGA_NAME || props.lga || null,
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

        if (batch.length >= BATCH_SIZE) {
          await insertBatch(batch);
          batch = [];
        }

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

        callback();
      } catch (err) {
        stats.errors++;
        callback();
      }
    },
  });
}

async function ingest() {
  console.log('='.repeat(70));
  console.log('VICMAP PROPERTY PARCEL INGESTION');
  console.log('='.repeat(70));
  console.log(`Input: ${INPUT_FILE}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('='.repeat(70));
  console.log('');

  client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fileStream = createReadStream(INPUT_FILE, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    const parser = createFeatureParser();
    const processor = createFeatureProcessor();

    await pipeline(fileStream, parser, processor);

    // Insert remaining batch
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

    console.log('\nVerifying spatial index...');
    const result = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'property_parcels' AND indexname LIKE '%geometry%'
    `);

    if (result.rows.length === 0) {
      console.log('Creating spatial index...');
      await client.query('CREATE INDEX property_parcels_geometry_idx ON property_parcels USING GIST (geometry)');
      console.log('✓ Spatial index created');
    } else {
      console.log('✓ Spatial index exists');
    }

    console.log('\nRunning ANALYZE...');
    await client.query('ANALYZE property_parcels');
    console.log('✓ Complete!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ INGESTION FAILED:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

ingest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
