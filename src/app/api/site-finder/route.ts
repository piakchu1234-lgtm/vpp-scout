/**
 * Site Finder API Route
 *
 * Reverse property search using PostGIS spatial queries.
 * Allows users to search by zone, area, overlays instead of address.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchPropertiesPostGIS,
  countPropertiesPostGIS,
  checkPostGISInstalled,
  type PropertySearchFilters,
} from '@/lib/spatialQuery';

export interface SiteFinderRequest {
  /** Bounding box: [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number];

  /** Minimum lot area in sqm */
  minArea?: number;

  /** Maximum lot area in sqm */
  maxArea?: number;

  /** Zone types (e.g., ["GRZ", "NRZ"]) */
  zoneTypes?: string[];

  /** Overlays to exclude (e.g., ["HO", "BMO"]) */
  excludeOverlays?: string[];

  /** Only SSD-eligible properties */
  ssdEligibleOnly?: boolean;

  /** Suburbs to filter by */
  suburbs?: string[];

  /** Maximum results */
  limit?: number;
}

export interface SiteFinderResponse {
  success: boolean;
  geojson?: GeoJSON.FeatureCollection;
  count?: number;
  totalMatching?: number;
  error?: string;
  metadata?: {
    filters: PropertySearchFilters;
    executionTime: number;
    postgisAvailable: boolean;
  };
}

/**
 * GET /api/site-finder
 *
 * Search for properties using spatial filters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  // Check if PostGIS is available
  const postgisAvailable = await checkPostGISInstalled();

  if (!postgisAvailable) {
    return NextResponse.json<SiteFinderResponse>(
      {
        success: false,
        error:
          'PostGIS extension not installed. Run: CREATE EXTENSION IF NOT EXISTS postgis;',
      },
      { status: 503 }
    );
  }

  // Parse filters from query params
  const filters: PropertySearchFilters = {};

  // Bounding box (comma-separated: minLng,minLat,maxLng,maxLat)
  const bboxParam = searchParams.get('bbox');
  if (bboxParam) {
    const bboxValues = bboxParam.split(',').map(Number);
    if (bboxValues.length === 4 && bboxValues.every((v) => !isNaN(v))) {
      filters.bbox = bboxValues as [number, number, number, number];
    }
  }

  // Lot area range
  const minArea = searchParams.get('minArea');
  if (minArea) filters.minArea = parseInt(minArea);

  const maxArea = searchParams.get('maxArea');
  if (maxArea) filters.maxArea = parseInt(maxArea);

  // Zone types (comma-separated)
  const zoneTypes = searchParams.get('zoneTypes');
  if (zoneTypes) {
    filters.zoneTypes = zoneTypes.split(',').map((z) => z.trim().toUpperCase());
  }

  // Exclude overlays (comma-separated)
  const excludeOverlays = searchParams.get('excludeOverlays');
  if (excludeOverlays) {
    filters.excludeOverlays = excludeOverlays.split(',').map((o) => o.trim().toUpperCase());
  }

  // SSD eligibility
  const ssdEligibleOnly = searchParams.get('ssdEligibleOnly');
  if (ssdEligibleOnly === 'true') filters.ssdEligibleOnly = true;

  // Suburbs (comma-separated)
  const suburbs = searchParams.get('suburbs');
  if (suburbs) {
    filters.suburbs = suburbs.split(',').map((s) => s.trim());
  }

  // Limit
  const limit = searchParams.get('limit');
  if (limit) filters.limit = parseInt(limit);

  console.log('[site-finder] Search request:', filters);

  try {
    // Execute spatial query
    const geojson = await searchPropertiesPostGIS(filters);
    const totalMatching = await countPropertiesPostGIS(filters);

    const executionTime = Date.now() - startTime;

    console.log(
      `[site-finder] Found ${geojson.features.length} parcels (${totalMatching} total) in ${executionTime}ms`
    );

    return NextResponse.json<SiteFinderResponse>({
      success: true,
      geojson,
      count: geojson.features.length,
      totalMatching,
      metadata: {
        filters,
        executionTime,
        postgisAvailable: true,
      },
    });
  } catch (error) {
    console.error('[site-finder] Query failed:', error);

    return NextResponse.json<SiteFinderResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          filters,
          executionTime: Date.now() - startTime,
          postgisAvailable: true,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/site-finder
 *
 * Same as GET but with request body (for complex filters)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check if PostGIS is available
  const postgisAvailable = await checkPostGISInstalled();

  if (!postgisAvailable) {
    return NextResponse.json<SiteFinderResponse>(
      {
        success: false,
        error:
          'PostGIS extension not installed. Run: CREATE EXTENSION IF NOT EXISTS postgis;',
      },
      { status: 503 }
    );
  }

  try {
    const body: SiteFinderRequest = await request.json();

    const filters: PropertySearchFilters = {
      bbox: body.bbox,
      minArea: body.minArea,
      maxArea: body.maxArea,
      zoneTypes: body.zoneTypes,
      excludeOverlays: body.excludeOverlays,
      ssdEligibleOnly: body.ssdEligibleOnly,
      suburbs: body.suburbs,
      limit: body.limit,
    };

    console.log('[site-finder] POST search request:', filters);

    // Execute spatial query
    const geojson = await searchPropertiesPostGIS(filters);
    const totalMatching = await countPropertiesPostGIS(filters);

    const executionTime = Date.now() - startTime;

    console.log(
      `[site-finder] Found ${geojson.features.length} parcels (${totalMatching} total) in ${executionTime}ms`
    );

    return NextResponse.json<SiteFinderResponse>({
      success: true,
      geojson,
      count: geojson.features.length,
      totalMatching,
      metadata: {
        filters,
        executionTime,
        postgisAvailable: true,
      },
    });
  } catch (error) {
    console.error('[site-finder] POST query failed:', error);

    return NextResponse.json<SiteFinderResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          filters: {},
          executionTime: Date.now() - startTime,
          postgisAvailable: true,
        },
      },
      { status: 500 }
    );
  }
}
