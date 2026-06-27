/**
 * Create property_parcels table
 */

import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  const client = await pool.connect();

  try {
    console.log('Creating property_parcels table...');

    // Enable PostGIS extension
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    console.log('✓ PostGIS extension enabled');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_parcels (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        pfi TEXT UNIQUE NOT NULL,
        geometry geometry(Polygon, 4326),
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
    console.log('✓ property_parcels table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_parcels_zone ON property_parcels(zone_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_parcels_suburb ON property_parcels(suburb, postcode)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_parcels_ssd ON property_parcels(ssd_eligible)');
    console.log('✓ Indexes created');

    console.log('\n✅ Setup complete! Ready for ingestion.');

  } catch (err) {
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createTable().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
