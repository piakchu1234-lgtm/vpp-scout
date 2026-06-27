# Property Parcels Database Ingestion Guide

## Overview

This guide covers importing 5.3GB of Victorian property cadastral data into your PostGIS database. We provide two methods:

1. **OGR2OGR Method** (Recommended) - Fast, battle-tested, handles large files
2. **Node.js Method** - Custom TypeScript script with transform logic

## Prerequisites

### Common Requirements

- ✅ PostgreSQL database with PostGIS extension
- ✅ `DATABASE_URL` environment variable configured
- ✅ Downloaded Vicmap Property GeoJSON file (~5.3GB)

### PostGIS Setup

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS version
SELECT PostGIS_version();
```

### Download Vicmap Data

```bash
# Option 1: Official Data Vic portal
# https://discover.data.vic.gov.au/dataset/vicmap-property-simplified-1

# Option 2: Direct API query (requires API key)
# https://services.land.vic.gov.au/catalogue/publicproxy/guest/dv_geoserver/...

# Place the downloaded file at:
mkdir -p data/
# Move your file to: ./data/vicmap-property-parcels.geojson
```

---

## Method 1: OGR2OGR (Recommended)

**Pros:**
- ⚡ Fastest method (uses GDAL's optimized C++ engine)
- 🔥 Handles 5.3GB+ files without memory issues
- 🛡️ Battle-tested by GIS professionals worldwide
- 📊 Built-in progress reporting
- 🎯 Automatic spatial index creation

**Cons:**
- Requires GDAL installation
- Less control over field transformations

### Installation

**Windows:**
```powershell
# Option 1: OSGeo4W (Recommended)
# Download: https://trac.osgeo.org/osgeo4w/
# Install with GDAL package selected

# Option 2: Conda
conda install -c conda-forge gdal

# Verify installation
ogr2ogr --version
```

**Mac:**
```bash
brew install gdal
ogr2ogr --version
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install gdal-bin
ogr2ogr --version
```

### Usage

```bash
# 1. Make script executable (Mac/Linux)
chmod +x scripts/ingest-property-parcels.sh

# 2. Run ingestion
./scripts/ingest-property-parcels.sh

# Windows users: Use Git Bash or WSL, or run commands manually
```

### Manual OGR2OGR Command

If the script doesn't work, run the command directly:

```bash
ogr2ogr \
  -f "PostgreSQL" \
  "PG:$DATABASE_URL" \
  "./data/vicmap-property-parcels.geojson" \
  -nln property_parcels \
  -lco GEOMETRY_NAME=geometry \
  -lco SPATIAL_INDEX=GIST \
  -gt 10000 \
  -progress \
  --config PG_USE_COPY YES
```

### Expected Output

```
====================================================================
VICMAP PROPERTY PARCEL INGESTION (OGR2OGR)
====================================================================
✓ ogr2ogr found: GDAL 3.7.0
✓ Input file found: ./data/vicmap-property-parcels.geojson
  Size: 5.3G
✓ DATABASE_URL configured

====================================================================
STARTING IMPORT
====================================================================
Target table: property_parcels
Batch size: 10000 features per transaction

0...10...20...30...40...50...60...70...80...90...100 - done.

====================================================================
IMPORT COMPLETE
====================================================================
Verifying import...
 total_parcels
---------------
      2847392
(1 row)

Verifying spatial index...
              indexname              |                   indexdef
-------------------------------------+----------------------------------------------
 property_parcels_geometry_idx      | CREATE INDEX property_parcels_geometry_idx ...

✓ Import successful!
```

---

## Method 2: Node.js Streaming Script

**Pros:**
- 💻 Pure TypeScript - no external dependencies
- 🎨 Full control over field transformations
- 🧪 Custom validation logic (SSD eligibility, overlay parsing)
- 📝 Detailed logging and error handling

**Cons:**
- Slower than OGR2OGR
- Requires Node.js 18+
- More complex setup

### Installation

```bash
# Install required packages
npm install --save-dev pg @types/pg geojson-stream
```

### Field Mapping

The script automatically maps GeoJSON properties to Prisma schema:

| GeoJSON Field | Database Column | Transform |
|---------------|-----------------|-----------|
| `PFI` | `pfi` | Direct |
| `EZI_ADDRESS` | `address` | Direct |
| `LOCALITY_NAME` | `suburb` | Direct |
| `POSTCODE` | `postcode` | Direct |
| `LGA_NAME` | `lga` | Direct |
| `geometry` | `geometry` | PostGIS `ST_GeomFromGeoJSON()` |
| First coordinate | `centroid_x`, `centroid_y` | Extract lng/lat |
| `SHAPE_Area` | `lot_area` | Direct |
| `ZONE_CODE` | `zone_code` | Direct |
| `OVERLAY` | `overlays` | Split by comma |
| Calculated | `has_heritage` | Check for HO prefix |
| Calculated | `has_bushfire` | Check for BMO prefix |
| Calculated | `has_flood` | Check for FO/LSIO prefix |
| Calculated | `ssd_eligible` | Area ≥300m² + eligible zone + no disqualifying overlays |

### Usage

```bash
# Run ingestion script
npm run ingest-parcels

# Or directly with tsx
npx tsx scripts/ingest-property-parcels.ts
```

### Expected Output

```
======================================================================
VICMAP PROPERTY PARCEL INGESTION
======================================================================
Input file: ./data/vicmap-property-parcels.geojson
Batch size: 500
Target table: property_parcels
======================================================================

[Ingestion] Processed: 1,000 | Inserted: 998 | Rate: 250 features/sec | Errors: 2
[Ingestion] Processed: 2,000 | Inserted: 1,997 | Rate: 245 features/sec | Errors: 3
[Ingestion] Processed: 10,000 | Inserted: 9,987 | Rate: 248 features/sec | Errors: 13
...
[Ingestion] Processed: 2,847,392 | Inserted: 2,845,120 | Rate: 242 features/sec | Errors: 2,272

======================================================================
INGESTION COMPLETE
======================================================================
Total processed: 2,847,392
Successfully inserted: 2,845,120
Skipped (duplicates): 0
Errors: 2,272
Time elapsed: 195.3 minutes
Average rate: 242 features/sec
======================================================================

[PostGIS] Verifying spatial index...
[PostGIS] ✅ Spatial index already exists: property_parcels_geometry_idx
[PostGIS] Running ANALYZE on property_parcels...
[PostGIS] ✅ Table statistics updated
```

---

## Post-Import Verification

### 1. Check Record Count

```sql
SELECT COUNT(*) FROM property_parcels;
-- Expected: 2.8M+ records
```

### 2. Verify Spatial Index

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_parcels'
  AND indexname LIKE '%geometry%';
```

Should return:
```
 indexname                    | indexdef
------------------------------+-------------------------------------------
 property_parcels_geometry_idx | CREATE INDEX property_parcels_geometry_idx
                               | ON property_parcels USING GIST (geometry)
```

### 3. Test Spatial Query Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM property_parcels
WHERE ST_Contains(
  geometry,
  ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326)
);
```

Expected execution time: **< 20ms** (with spatial index)

### 4. Sample Data Query

```sql
SELECT
  pfi,
  address,
  zone_code,
  lot_area,
  ssd_eligible,
  array_length(overlays, 1) as overlay_count
FROM property_parcels
LIMIT 10;
```

### 5. SSD Eligibility Statistics

```sql
SELECT
  ssd_eligible,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM property_parcels
GROUP BY ssd_eligible;
```

Expected output:
```
 ssd_eligible |  count  | percentage
--------------+---------+------------
 t            | 425,000 |      14.93
 f            | 2,422,392 |      85.07
```

---

## Performance Tuning

### If Import is Slow

1. **Increase Batch Size**
   ```bash
   # OGR2OGR: Change -gt parameter
   -gt 50000  # Default is 10000
   
   # Node.js: Edit CONFIG.batchSize
   batchSize: 1000  # Default is 500
   ```

2. **Disable Indexes During Import** (then rebuild)
   ```sql
   DROP INDEX IF EXISTS property_parcels_geometry_idx;
   -- Run import
   CREATE INDEX property_parcels_geometry_idx ON property_parcels USING GIST (geometry);
   ```

3. **Increase PostgreSQL Work Memory**
   ```sql
   SET work_mem = '256MB';  -- Default is 4MB
   ```

### If Spatial Queries are Slow

```sql
-- Rebuild spatial index
REINDEX INDEX property_parcels_geometry_idx;

-- Update table statistics
VACUUM ANALYZE property_parcels;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'property_parcels';
```

---

## Troubleshooting

### Error: "PostGIS extension not found"

```sql
-- Enable PostGIS in your database
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Error: "Out of memory"

**OGR2OGR:** Reduce batch size with `-gt 5000`

**Node.js:** Reduce `CONFIG.batchSize` to 100-200

### Error: "Duplicate key violation"

The script uses `ON CONFLICT (pfi) DO NOTHING` to skip duplicates. If you need to update existing records, change to:

```sql
ON CONFLICT (pfi) DO UPDATE SET
  lot_area = EXCLUDED.lot_area,
  zone_code = EXCLUDED.zone_code,
  last_updated = EXCLUDED.last_updated
```

### Error: "Invalid geometry"

Some parcels may have malformed geometries. The Node.js script will skip them and log errors. To identify:

```sql
SELECT pfi, address, ST_IsValid(geometry) as is_valid
FROM property_parcels
WHERE NOT ST_IsValid(geometry);
```

---

## Next Steps

Once import completes successfully:

1. **Test the API**
   ```bash
   curl "http://localhost:3000/api/properties/analyze?lat=-37.8136&lng=144.9631"
   ```

2. **Check Response Time**
   - Should be **< 50ms** for spatial lookup
   - Check browser Network tab

3. **Test Map Click Integration**
   ```bash
   npm run dev
   # Click on property parcels in map
   # Check console for "[PropertyAnalysis] Fast spatial lookup succeeded"
   ```

4. **Monitor Database Performance**
   ```sql
   SELECT
     schemaname,
     tablename,
     seq_scan,
     idx_scan,
     n_tup_ins,
     n_tup_upd
   FROM pg_stat_user_tables
   WHERE tablename = 'property_parcels';
   ```

---

## Estimated Import Times

| Method | Hardware | Time |
|--------|----------|------|
| **OGR2OGR** | M1 Mac / Modern PC | 30-45 min |
| **OGR2OGR** | Older hardware | 60-90 min |
| **Node.js** | M1 Mac / Modern PC | 120-180 min |
| **Node.js** | Older hardware | 180-240 min |

**Recommendation:** Use OGR2OGR for production, Node.js for development/testing with custom transforms.
