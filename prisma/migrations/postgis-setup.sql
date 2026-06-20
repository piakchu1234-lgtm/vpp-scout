-- SimplySite PostGIS Setup Script
-- Enables PostGIS extension and creates spatial indexes

-- ============================================================================
-- STEP 1: Enable PostGIS Extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_version();

-- ============================================================================
-- STEP 2: Create Spatial Index on property_parcels
-- ============================================================================
-- Run this AFTER running `npx prisma migrate dev`
-- This creates a GIST index for fast spatial queries

CREATE INDEX IF NOT EXISTS property_parcels_geometry_idx
ON property_parcels
USING GIST (geometry);

-- ============================================================================
-- STEP 3: Create Additional Performance Indexes
-- ============================================================================

-- Zone code index (for reverse search)
CREATE INDEX IF NOT EXISTS property_parcels_zone_code_idx
ON property_parcels (zone_code);

-- Lot area index (for range queries)
CREATE INDEX IF NOT EXISTS property_parcels_lot_area_idx
ON property_parcels (lot_area);

-- SSD eligibility index (for quick filtering)
CREATE INDEX IF NOT EXISTS property_parcels_ssd_eligible_idx
ON property_parcels (ssd_eligible);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS property_parcels_composite_idx
ON property_parcels (zone_code, lot_area, ssd_eligible);

-- Suburb/postcode index (for location filtering)
CREATE INDEX IF NOT EXISTS property_parcels_location_idx
ON property_parcels (suburb, postcode);

-- ============================================================================
-- STEP 4: Test Spatial Query Performance
-- ============================================================================

-- Example: Find all GRZ1 properties > 600sqm without Heritage Overlay
-- in Armadale bounding box
EXPLAIN ANALYZE
SELECT
    pfi,
    lot_area,
    address,
    zone_code
FROM property_parcels
WHERE ST_Intersects(
    geometry,
    ST_MakeEnvelope(145.0, -37.9, 145.1, -37.8, 4326)
)
AND lot_area >= 600
AND zone_code LIKE 'GRZ%'
AND has_heritage = false
LIMIT 100;

-- ============================================================================
-- STEP 5: Verify Index Usage
-- ============================================================================

-- Check if indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'property_parcels';

-- Check index size
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'property_parcels'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. GIST Index: Essential for ST_Intersects performance (spatial queries)
-- 2. Expected query time: < 50ms for bbox + filters on 100k parcels
-- 3. Index maintenance: Automatic via PostgreSQL
-- 4. Disk usage: ~10-20% of table size per GIST index
