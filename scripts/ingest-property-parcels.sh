#!/bin/bash

###############################################################################
# VICMAP PROPERTY PARCEL INGESTION - OGRE2OGR METHOD
#
# Fast GeoJSON → PostGIS import using GDAL/OGR tools.
# Handles 5.3GB files efficiently with streaming and chunking.
#
# Prerequisites:
#   - GDAL/OGR installed: https://gdal.org/download.html
#     Windows: OSGeo4W or Conda
#     Mac: brew install gdal
#     Linux: apt-get install gdal-bin
#   - PostGIS extension enabled in database
#   - DATABASE_URL environment variable set
#
# Usage:
#   chmod +x scripts/ingest-property-parcels.sh
#   ./scripts/ingest-property-parcels.sh
###############################################################################

set -e  # Exit on error

# Configuration
INPUT_FILE="./data/vicmap-property-parcels.geojson"
TABLE_NAME="property_parcels"
BATCH_SIZE=10000  # Features per transaction

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================================================"
echo "VICMAP PROPERTY PARCEL INGESTION (OGR2OGR)"
echo "======================================================================"

# Check if ogr2ogr is installed
if ! command -v ogr2ogr &> /dev/null; then
    echo -e "${RED}ERROR: ogr2ogr not found${NC}"
    echo "Please install GDAL/OGR:"
    echo "  - Windows: https://trac.osgeo.org/osgeo4w/"
    echo "  - Mac: brew install gdal"
    echo "  - Linux: apt-get install gdal-bin"
    exit 1
fi

echo -e "${GREEN}✓${NC} ogr2ogr found: $(ogr2ogr --version)"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}ERROR: Input file not found: $INPUT_FILE${NC}"
    echo "Please download Vicmap Property GeoJSON and place it at:"
    echo "  $INPUT_FILE"
    exit 1
fi

echo -e "${GREEN}✓${NC} Input file found: $INPUT_FILE"
echo "  Size: $(du -h "$INPUT_FILE" | cut -f1)"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL environment variable or add to .env.local"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL configured"

# Parse DATABASE_URL into PostgreSQL connection string
# Format: postgresql://user:pass@host:port/dbname
PG_CONNECTION=$(echo "$DATABASE_URL" | sed 's/postgresql:\/\//PG:/')

echo ""
echo "======================================================================"
echo "STARTING IMPORT"
echo "======================================================================"
echo "Target table: $TABLE_NAME"
echo "Batch size: $BATCH_SIZE features per transaction"
echo ""

# Run ogr2ogr import
# -f "PostgreSQL": Output format
# -nln: New layer name (table name)
# -lco: Layer creation options
# -gt: Group transactions (batch size)
# -progress: Show progress bar
# --config: Performance tuning
ogr2ogr \
  -f "PostgreSQL" \
  "$PG_CONNECTION" \
  "$INPUT_FILE" \
  -nln "$TABLE_NAME" \
  -lco GEOMETRY_NAME=geometry \
  -lco FID=id \
  -lco SPATIAL_INDEX=GIST \
  -lco PRECISION=NO \
  -gt "$BATCH_SIZE" \
  -progress \
  --config PG_USE_COPY YES \
  --config GDAL_CACHEMAX 512 \
  -nlt PROMOTE_TO_MULTI \
  -skipfailures

echo ""
echo "======================================================================"
echo "IMPORT COMPLETE"
echo "======================================================================"

# Verify table exists and count records
echo "Verifying import..."

PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
PGHOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p') \
PGPORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') \
PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p') \
PGUSER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p') \
psql -c "SELECT COUNT(*) as total_parcels FROM $TABLE_NAME;"

# Verify spatial index
echo ""
echo "Verifying spatial index..."
PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
PGHOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p') \
PGPORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') \
PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p') \
PGUSER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p') \
psql -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '$TABLE_NAME' AND indexname LIKE '%geometry%';"

echo ""
echo -e "${GREEN}✓ Import successful!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run ANALYZE to update table statistics:"
echo "     psql -c 'ANALYZE $TABLE_NAME;'"
echo ""
echo "  2. Test spatial query performance:"
echo "     psql -c 'EXPLAIN ANALYZE SELECT * FROM $TABLE_NAME WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326));'"
echo ""
echo "  3. Start your Next.js dev server and test map clicks:"
echo "     npm run dev"
echo ""
