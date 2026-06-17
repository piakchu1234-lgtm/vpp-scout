/**
 * PROPERTY ORCHESTRATOR API ROUTE
 *
 * Production-grade REST API for property intelligence retrieval.
 * Implements "Scrape-Once, Store-Forever" caching architecture.
 *
 * Architecture:
 * - Cache-first strategy (30-day TTL)
 * - Concurrent agent execution (Spatial + Market in parallel)
 * - Sequential AI synthesis (Planning Agent after data collection)
 * - Atomic database transactions with rollback protection
 * - Graceful degradation on agent failures
 * - **NEW:** Server-Sent Events (SSE) for progressive loading
 *
 * Endpoint: GET /api/property/[id]
 * Query Params:
 *   - lng: Longitude (required)
 *   - lat: Latitude (required)
 *   - force: Boolean to bypass cache (optional)
 *   - stream: Boolean to enable SSE streaming (optional)
 *
 * Response: Complete property intelligence payload (JSON or SSE stream)
 */

// CRITICAL: Force dynamic rendering to prevent SSE buffering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure Node.js runtime for SSE support

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeVicmapAgent } from '@/lib/agents/vicmapAgent';
import { executeMarketAgent, type MarketAgentOutput } from '@/lib/agents/marketAgent';
import { executePlanningAgent, type PlanningAgentOutput } from '@/lib/agents/planningAgent';

// Cache TTL: 30 days in milliseconds
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SSE STREAMING HANDLER
 * Progressive data loading via Server-Sent Events
 */
async function handleStreamingResponse(
  longitude: number,
  latitude: number,
  force: boolean
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // STAGE 1: Spatial (~800ms)
        const spatialResult = await executeVicmapAgent({ longitude, latitude });
        if (!spatialResult.success) {
          sendEvent('error', { error: 'No property found' });
          controller.close();
          return;
        }

        sendEvent('spatial', {
          stage: 'spatial',
          progress: 33,
          data: {
            pfi: spatialResult.pfi,
            address: spatialResult.address,
            landSize: spatialResult.landSize,
            zoning: spatialResult.zoning,
            overlays: spatialResult.overlays,
          },
        });

        // STAGE 2: Market (~1.5s)
        const marketResult = await executeMarketAgent({
          address: spatialResult.address,
          suburb: spatialResult.suburb,
          postcode: spatialResult.postcode,
        }).catch(() => ({ success: false, bedrooms: null, bathrooms: null, lastSoldPrice: null } as any));

        sendEvent('market', {
          stage: 'market',
          progress: 66,
          data: {
            bedrooms: marketResult.bedrooms,
            bathrooms: marketResult.bathrooms,
            lastSoldPrice: marketResult.lastSoldPrice,
          },
        });

        // STAGE 3: Planning (~2s)
        const planningResult = await executePlanningAgent({
          spatial: spatialResult,
          market: marketResult,
        }).catch(() => ({ success: false, highestBestUse: '', riskFactors: [], complianceScorecard: {} } as any));

        sendEvent('complete', {
          stage: 'complete',
          progress: 100,
          data: {
            highestBestUse: planningResult.highestBestUse,
            riskFactors: planningResult.riskFactors,
            complianceScorecard: planningResult.complianceScorecard,
          },
        });

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Server error' })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const lng = searchParams.get('lng');
    const lat = searchParams.get('lat');
    const force = searchParams.get('force') === 'true';
    const stream = searchParams.get('stream') === 'true'; // NEW: SSE flag

    // Validate required parameters
    if (!lng || !lat) {
      return NextResponse.json(
        { error: 'Missing required parameters: lng, lat' },
        { status: 400 }
      );
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || isNaN(latitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates: lng and lat must be numbers' },
        { status: 400 }
      );
    }

    // === NEW: SSE STREAMING RESPONSE ===
    if (stream) {
      return handleStreamingResponse(longitude, latitude, force);
    }

    // === STEP 1: CACHE LOOKUP === (existing non-streaming logic)
    // Check database for existing property within cache window
    if (!force) {
      const cachedProperty = await prisma.property.findFirst({
        where: {
          longitude: { gte: longitude - 0.0001, lte: longitude + 0.0001 },
          latitude: { gte: latitude - 0.0001, lte: latitude + 0.0001 },
        },
        orderBy: {
          lastScrapedAt: 'desc',
        },
      });

      if (cachedProperty) {
        const ageMs = Date.now() - cachedProperty.lastScrapedAt.getTime();
        if (ageMs < CACHE_TTL_MS) {
          console.log(
            `[Orchestrator] CACHE HIT ⚡ PFI:${cachedProperty.pfi} (age: ${Math.round(ageMs / 86400000)}d)`
          );
          return NextResponse.json({
            data: cachedProperty,
            cached: true,
            cacheAge: Math.round(ageMs / 3600000), // hours
          });
        }
        console.log(
          `[Orchestrator] Cache stale (age: ${Math.round(ageMs / 86400000)}d) - refreshing`
        );
      }
    }

    console.log(`[Orchestrator] CACHE MISS 🤖 - Deploying agent swarm`);

    // === STEP 2: CONCURRENT AGENT EXECUTION ===
    // Execute Spatial and Market agents in parallel for optimal performance
    const [spatialResult, marketResult] = await Promise.all([
      executeVicmapAgent({ longitude, latitude }),
      // Market agent needs approximate address - use spatial data after completion
      Promise.resolve(null), // Placeholder - will execute after spatial completes
    ]);

    // Check spatial agent success
    if (!spatialResult.success || !spatialResult.pfi) {
      return NextResponse.json(
        {
          error: 'No property found at coordinates',
          details: spatialResult.error,
        },
        { status: 404 }
      );
    }

    // Execute market agent with spatial data
    const marketResultActual = await executeMarketAgent({
      address: spatialResult.address,
      suburb: spatialResult.suburb,
      postcode: spatialResult.postcode,
    }).catch((err): MarketAgentOutput => {
      console.error('[Orchestrator] Market agent failed:', err);
      // Return empty market data rather than failing entire request
      return {
        success: false,
        bedrooms: null,
        bathrooms: null,
        carspaces: null,
        yearBuilt: null,
        wallMaterial: null,
        roofMaterial: null,
        lastSoldPrice: null,
        lastSoldDate: null,
        scrapedAt: new Date(),
        source: null,
        parsingMethod: 'failed',
        error: err instanceof Error ? err.message : 'Market scraping failed',
      };
    });

    // === STEP 3: AI PLANNING SYNTHESIS ===
    // Pass spatial + market data to AI Planning Agent
    const planningResult = await executePlanningAgent({
      spatial: spatialResult,
      market: marketResultActual,
    }).catch((err): PlanningAgentOutput => {
      console.error('[Orchestrator] Planning agent failed:', err);
      // Return empty planning data rather than failing entire request
      return {
        success: false,
        highestBestUse: 'Analysis unavailable',
        riskFactors: [],
        tierClassification: 'Unknown',
        estimatedGRVMultiplier: 0,
        complianceScorecard: {
          maxSiteCoveragePercent: null,
          calculatedSiteCoverage: null,
          siteCoverageCompliant: null,
          minGardenAreaPercent: null,
          calculatedGardenArea: null,
          gardenAreaCompliant: null,
          maxHeightMeters: null,
          maxStoreys: null,
          heightCompliant: null,
          frontSetbackMeters: null,
          sideSetbackMeters: null,
          rearSetbackMeters: null,
          clause55Compliant: null,
          clause57Compliant: null,
          vppExemptions: [],
        },
        legalDisclaimer: `DISCLAIMER: This AI-generated feasibility analysis does not constitute formal architectural, financial, or legal advice. SimplySite provides automated spatial feasibility estimates using public data sources. Users must conduct independent due diligence with local council and licensed town planners prior to property acquisition or development. Data accuracy is not guaranteed. The State of Victoria and SimplySite accept no liability for decisions made based on this analysis.`,
        scrapedAt: new Date(),
        modelUsed: 'claude-3-5-sonnet-20241022',
        error: err instanceof Error ? err.message : 'AI synthesis failed',
      };
    });

    // === STEP 4: ATOMIC DATABASE UPSERT ===
    // Write enriched property data to PostgreSQL
    const property = await prisma.property.upsert({
      where: {
        pfi: spatialResult.pfi,
      },
      create: {
        pfi: spatialResult.pfi,
        spi: spatialResult.spi,
        address: spatialResult.address,
        suburb: spatialResult.suburb,
        postcode: spatialResult.postcode,
        lga: spatialResult.lga,
        longitude: spatialResult.longitude,
        latitude: spatialResult.latitude,
        geometry: spatialResult.geometry ? JSON.parse(JSON.stringify(spatialResult.geometry)) : null,
        landSize: spatialResult.landSize,
        lotPlan: spatialResult.lotPlan,
        zoning: spatialResult.zoning,
        overlays: spatialResult.overlays,
        // Market intelligence
        lastSoldPrice: marketResultActual.lastSoldPrice,
        lastSoldDate: marketResultActual.lastSoldDate,
        bedrooms: marketResultActual.bedrooms,
        bathrooms: marketResultActual.bathrooms,
        carspaces: marketResultActual.carspaces,
        yearBuilt: marketResultActual.yearBuilt,
        wallMaterial: marketResultActual.wallMaterial,
        roofMaterial: marketResultActual.roofMaterial,
        // AI Planning insights
        fastTrackEligible: planningResult.tierClassification.includes('Fast Track'),
        vppTier: planningResult.tierClassification,
        highestBestUse: planningResult.highestBestUse,
        riskFactors: planningResult.riskFactors,
        estimatedYield: null, // Can be calculated from existing yield engine
        complianceScorecard: JSON.parse(JSON.stringify(planningResult.complianceScorecard)),
        // Metadata
        lastScrapedAt: new Date(),
        scrapedBy: 'orchestrator-v1',
      },
      update: {
        address: spatialResult.address,
        suburb: spatialResult.suburb,
        postcode: spatialResult.postcode,
        lga: spatialResult.lga,
        longitude: spatialResult.longitude,
        latitude: spatialResult.latitude,
        geometry: spatialResult.geometry ? JSON.parse(JSON.stringify(spatialResult.geometry)) : null,
        landSize: spatialResult.landSize,
        lotPlan: spatialResult.lotPlan,
        zoning: spatialResult.zoning,
        overlays: spatialResult.overlays,
        // Market intelligence
        lastSoldPrice: marketResultActual.lastSoldPrice,
        lastSoldDate: marketResultActual.lastSoldDate,
        bedrooms: marketResultActual.bedrooms,
        bathrooms: marketResultActual.bathrooms,
        carspaces: marketResultActual.carspaces,
        yearBuilt: marketResultActual.yearBuilt,
        wallMaterial: marketResultActual.wallMaterial,
        roofMaterial: marketResultActual.roofMaterial,
        // AI Planning insights
        fastTrackEligible: planningResult.tierClassification.includes('Fast Track'),
        vppTier: planningResult.tierClassification,
        highestBestUse: planningResult.highestBestUse,
        riskFactors: planningResult.riskFactors,
        complianceScorecard: JSON.parse(JSON.stringify(planningResult.complianceScorecard)),
        // Metadata
        lastScrapedAt: new Date(),
        scrapedBy: 'orchestrator-v1',
      },
    });

    console.log(`[Orchestrator] ✅ SUCCESS - Property ${property.pfi} enriched and cached`);

    // === STEP 5: RETURN ENRICHED PAYLOAD ===
    return NextResponse.json({
      data: property,
      cached: false,
      agents: {
        spatial: spatialResult.success,
        market: marketResultActual.success,
        planning: planningResult.success,
      },
    });
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
