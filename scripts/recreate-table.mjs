/**
 * Recreate table with correct geometry type
 */

import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function recreateTable() {
  const client = await pool.connect();

  try {
    console.log('Dropping existing table...');
    await client.query('DROP TABLE IF EXISTS property_parcels CASCADE');
    console.log('✓ Table dropped');

    console.log('Creating table with MultiPolygon support...');
    await client.query(`
      CREATE TABLE property_parcels (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        pfi TEXT UNIQUE NOT NULL,
        geometry geometry(Geometry, 4326),
        lot_area FLOAT NOT NULL,
        frontage_estimate FLOAT,
        address TEXT NOT NULL,
        suburb TEXT NOT NULL,
        postcode TEXT NOT NULL,
        lga TEXT,
        centroid_x DECIMAL(10,7),
        centroid_y DECIMAL(10,7),
        zone_code TEXT NOT NULL,
        overlays TEXT[],
        has_heritage BOOLEAN DEFAULT FALSE,
        has_bushfire BOOLEAN DEFAULT FALSE,
        has_flood BOOLEAN DEFAULT FALSE,
        ssd_eligible BOOLEAN DEFAULT FALSE,
        last_updated TIMESTAMP DEFAULT NOW(),
        data_source TEXT
      )
    `);
    console.log('✓ Table created');

    console.log('Creating indexes...');
    await client.query('CREATE INDEX idx_property_parcels_zone ON property_parcels(zone_code)');
    await client.query('CREATE INDEX idx_property_parcels_suburb ON property_parcels(suburb, postcode)');
    await client.query('CREATE INDEX idx_property_parcels_ssd ON property_parcels(ssd_eligible)');
    console.log('✓ Indexes created');

    console.log('\n✅ Table ready for ingestion!');

  } catch (err) {
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

recreateTable().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
