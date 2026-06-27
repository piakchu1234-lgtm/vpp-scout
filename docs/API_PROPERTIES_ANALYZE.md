# Unified Property Analysis API

## Overview

The `/api/properties/analyze` endpoint provides high-performance spatial property analysis using native PostGIS queries. It executes single-pass spatial intersections across property boundaries, zoning, and overlays.

## Architecture

### Key Features

- **Direct PostGIS Queries**: Uses `prisma.$queryRaw` for native spatial operations
- **Single Database Round-Trip**: All geospatial data retrieved in one query
- **Spatial Index Optimization**: Leverages GIST indexes on geometry columns (sub-10ms lookups)
- **Map Click → Dashboard Flow**: Optimized for interactive map-driven property selection

### Comparison with `/api/property/[id]`

| Feature | `/api/properties/analyze` | `/api/property/[id]` |
|---------|---------------------------|----------------------|
| **Purpose** | Fast spatial lookup for map clicks | Full property enrichment pipeline |
| **Query Type** | Single PostGIS raw SQL | Multi-source agent orchestration |
| **Data Source** | `PropertyParcel` model (cached cadastral) | Vicmap API + Domain API + AI agents |
| **Response Time** | ~10-50ms (spatial index) | ~3-5s (real-time enrichment) |
| **Caching** | Pre-computed in database | 30-day cache after first fetch |
| **Use Case** | Initial map interaction | Deep property intelligence |

## Endpoint

```
GET /api/properties/analyze
```

## Query Parameters

### Option 1: Coordinate-Based Lookup

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes* | Latitude (WGS84) |
| `lng` | number | Yes* | Longitude (WGS84) |

### Option 2: Direct Property Lookup

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propId` | string | Yes* | Property ID from `property_parcels` table |

*Either `propId` OR both `lat`+`lng` must be provided.

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "id": "clx123abc...",
    "pfi": "123456789",
    "address": "12 Collins Street, Melbourne VIC 3000",
    "lga": "Melbourne",
    "center": {
      "lng": 144.9631,
      "lat": -37.8136
    },
    "dimensions": {
      "lotSizeSqm": 450.5,
      "frontageMeters": 15.2,
      "orientationAspect": null
    },
    "specifications": {
      "bedrooms": 3,
      "bathrooms": 2,
      "carSpaces": 1,
      "yearBuilt": 1985,
      "wallMaterial": "Brick Veneer",
      "roofMaterial": "Concrete Tile"
    },
    "market": {
      "lastSoldPrice": 1350000,
      "lastSoldDate": "2024-03-15"
    },
    "statutory": {
      "zoneCode": "GRZ1",
      "overlays": ["HO123", "SBO"],
      "hasHeritage": true,
      "hasBushfire": false,
      "hasFlood": false
    },
    "feasibility": {
      "ssdEligible": true,
      "fastTrackEligible": false,
      "vppTier": "Standard Permit Required",
      "highestBestUse": "2-dwelling subdivision with SSD",
      "riskFactors": ["Heritage overlay", "Front setback constraint"],
      "complianceScorecard": {
        "maxSiteCoveragePercent": 60,
        "calculatedSiteCoverage": 55.2,
        "siteCoverageCompliant": true,
        "minGardenAreaPercent": 35,
        "calculatedGardenArea": 38.5,
        "gardenAreaCompliant": true
      }
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Parameters
```json
{
  "error": "Missing required parameters",
  "details": "Provide either propId or both lat and lng coordinates"
}
```

#### 400 Bad Request - Invalid Coordinates
```json
{
  "error": "Invalid coordinates",
  "details": "lat and lng must be valid numbers"
}
```

#### 404 Not Found - Property Not Found
```json
{
  "error": "Property not found",
  "details": "No property found at specified coordinates within Victorian cadastral boundaries"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error processing spatial analysis",
  "details": "Error message here"
}
```

## Usage Examples

### Example 1: Map Click (Coordinates)

```typescript
// User clicks map at coordinates
const response = await fetch(
  '/api/properties/analyze?lat=-37.8136&lng=144.9631'
);
const { data } = await response.json();

// Update dashboard panels
updateLeftPanel(data.specifications, data.market);
updateRightPanel(data.statutory);
updateBottomPanel(data.feasibility);
```

### Example 2: Direct Property Lookup

```typescript
// User selects property from search results
const response = await fetch(
  '/api/properties/analyze?propId=clx123abc456'
);
const { data } = await response.json();
```

### Example 3: Error Handling

```typescript
try {
  const response = await fetch(
    `/api/properties/analyze?lat=${lat}&lng=${lng}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 404) {
      // Property not in database - trigger full enrichment
      const enriched = await fetch(`/api/property/analyze?lat=${lat}&lng=${lng}`);
    } else {
      console.error('Analysis failed:', error);
    }
    return;
  }
  
  const { data } = await response.json();
  // Handle success
} catch (error) {
  console.error('Network error:', error);
}
```

## Database Schema

### Primary Table: `property_parcels`

```sql
CREATE TABLE property_parcels (
  id TEXT PRIMARY KEY,
  pfi TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  lga TEXT,
  geometry geometry(Polygon, 4326) NOT NULL,
  centroid_x DECIMAL(10,7) NOT NULL,
  centroid_y DECIMAL(10,7) NOT NULL,
  lot_area FLOAT NOT NULL,
  frontage_estimate FLOAT,
  zone_code TEXT NOT NULL,
  overlays TEXT[] NOT NULL,
  has_heritage BOOLEAN DEFAULT FALSE,
  has_bushfire BOOLEAN DEFAULT FALSE,
  has_flood BOOLEAN DEFAULT FALSE,
  ssd_eligible BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Critical spatial index for point-in-polygon performance
CREATE INDEX property_parcels_geometry_idx 
  ON property_parcels USING GIST (geometry);
```

## PostGIS Query Optimization

### Spatial Index Performance

The endpoint relies on a GIST spatial index for fast point-in-polygon queries:

```sql
-- Verify spatial index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'property_parcels' 
  AND indexname LIKE '%geometry%';
```

### Query Execution Plan

```sql
-- Check query plan (should show "Index Scan using property_parcels_geometry_idx")
EXPLAIN ANALYZE
SELECT * FROM property_parcels
WHERE ST_Contains(
  geometry,
  ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326)
);
```

Expected performance:
- **With GIST index**: 5-15ms
- **Without index**: 500-2000ms (table scan)

## Integration with Existing Flow

### Recommended Usage Pattern

1. **Map Click → Fast Lookup** (`/api/properties/analyze`)
   - User clicks map
   - Return cached cadastral + planning data instantly
   - Display basic property info in panels

2. **Background Enrichment** (`/api/property/[id]`)
   - If property exists in `property_parcels` but not in `properties`
   - Trigger full enrichment pipeline in background
   - Update panels when enrichment completes

3. **Fallback to Full Pipeline**
   - If property not found in `property_parcels`
   - Directly call `/api/property/[id]` with coordinates
   - This triggers Vicmap API fetch + full agent orchestration

### Example Integration

```typescript
async function handleMapClick(lat: number, lng: number) {
  // Step 1: Fast spatial lookup
  const quickLookup = await fetch(
    `/api/properties/analyze?lat=${lat}&lng=${lng}`
  );

  if (quickLookup.ok) {
    const { data } = await quickLookup.json();
    updateDashboard(data);

    // Step 2: Check if full enrichment exists
    const enriched = await fetch(
      `/api/property/${data.id}?lng=${lng}&lat=${lat}`
    );
    
    if (enriched.ok) {
      const { data: fullData, cached } = await enriched.json();
      if (!cached) {
        // Fresh enrichment completed - update with full data
        updateDashboard(fullData);
      }
    }
  } else {
    // Step 3: Fallback to full pipeline (property not in parcels table)
    const fullPipeline = await fetch(
      `/api/property/analyze?lng=${lng}&lat=${lat}`
    );
    const { data } = await fullPipeline.json();
    updateDashboard(data);
  }
}
```

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Spatial lookup (indexed) | 5-15ms | ST_Contains with GIST index |
| Property record fetch | 2-5ms | Simple Prisma findFirst |
| Total response time | 10-50ms | Includes JSON serialization |

## Future Enhancements

1. **School Catchment Zones**
   - Add PostGIS intersection with `vicmap_primary_schools` and `vicmap_secondary_schools` tables
   - Return school zone data in response

2. **Orientation Calculation**
   - Calculate property orientation from geometry using `ST_Azimuth`
   - Add to `dimensions.orientationAspect`

3. **Neighboring Properties**
   - Use `ST_Buffer` and `ST_Intersects` to find adjacent parcels
   - Support "click neighboring parcel" feature

4. **Response Caching**
   - Add Redis layer for frequently accessed properties
   - Cache key: `property_analyze:${pfi}`
   - TTL: 5 minutes (balance freshness vs performance)

## Troubleshooting

### Issue: Slow Queries (>100ms)

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM property_parcels
WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326));
```

**Solutions:**
1. Ensure GIST index exists: `CREATE INDEX property_parcels_geometry_idx ON property_parcels USING GIST (geometry);`
2. Run `VACUUM ANALYZE property_parcels;` to update statistics
3. Check index bloat: `SELECT pg_size_pretty(pg_relation_size('property_parcels_geometry_idx'));`

### Issue: Property Not Found (404)

**Causes:**
1. Property not in `property_parcels` table (requires crawler/import)
2. Coordinates outside Victorian boundary
3. Coordinates on road/park (not cadastral parcel)

**Solution:**
- Fallback to `/api/property/[id]` which queries Vicmap API directly

### Issue: Missing Enriched Data (specifications, market, feasibility null)

**Cause:**
- Property exists in `property_parcels` but not in `properties` table
- No enrichment has been performed yet

**Solution:**
- Trigger background enrichment via `/api/property/[id]`
- Or display message: "Full analysis loading..."
