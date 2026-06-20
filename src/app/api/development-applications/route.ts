/**
 * Development Applications API Route
 *
 * Fetches local council DAs within a radius of a given point.
 * Data sources:
 * 1. PlanningAlerts API (Australia-wide open data)
 * 2. Council scrapers (fallback for councils not on PlanningAlerts)
 * 3. Mock data (development/testing)
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  DASearchRequest,
  DASearchResponse,
  DevelopmentApplication,
  DAStatus,
} from '@/types/developmentApplication';
import { calculateDistance, getCouncilName } from '@/lib/da/daUtils';

const PLANNINGALERTS_API = 'https://api.planningalerts.org.au/applications.json';

/**
 * Fetch DAs from PlanningAlerts API
 */
async function fetchFromPlanningAlerts(
  lat: number,
  lng: number,
  radius: number
): Promise<DevelopmentApplication[]> {
  try {
    // PlanningAlerts API parameters
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: (radius / 1000).toString(), // Convert meters to km
    });

    const response = await fetch(`${PLANNINGALERTS_API}?${params}`, {
      headers: {
        'User-Agent': 'SimplySite/1.0 (planning.simplysite.com.au)',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error(`PlanningAlerts API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform PlanningAlerts format to our format
    const applications: DevelopmentApplication[] = (data.applications || []).map(
      (app: any) => {
        const status: DAStatus = normalizeStatus(app.status);

        return {
          id: app.id.toString(),
          daNumber: app.council_reference || app.id.toString(),
          address: app.address,
          latitude: parseFloat(app.lat),
          longitude: parseFloat(app.lng),
          councilName: app.authority?.full_name || 'Unknown Council',
          status,
          description: app.description || 'No description available',
          lodgedDate: app.date_received || app.date_scraped,
          decidedDate: app.date_decided || undefined,
          applicantName: undefined, // Not provided by PlanningAlerts
          distanceFromSubject: calculateDistance(lat, lng, parseFloat(app.lat), parseFloat(app.lng)),
          url: app.info_url,
        };
      }
    );

    return applications;
  } catch (error) {
    console.error('[DA API] PlanningAlerts fetch failed:', error);
    return [];
  }
}

/**
 * Normalize status from various formats
 */
function normalizeStatus(status: string | undefined): DAStatus {
  if (!status) return 'unknown';

  const normalized = status.toLowerCase();

  if (normalized.includes('approv') || normalized.includes('permit')) return 'approved';
  if (normalized.includes('pending') || normalized.includes('submitted')) return 'pending';
  if (normalized.includes('refus') || normalized.includes('reject')) return 'refused';
  if (normalized.includes('withdrawn') || normalized.includes('lapsed')) return 'withdrawn';

  return 'unknown';
}

/**
 * Generate mock DA data for development/testing
 */
function generateMockDAs(lat: number, lng: number, radius: number): DevelopmentApplication[] {
  const mockDAs: DevelopmentApplication[] = [];
  const councilName = getCouncilName(lat, lng);

  // Generate 5-10 mock DAs around the center point
  const count = Math.floor(Math.random() * 6) + 5;

  for (let i = 0; i < count; i++) {
    // Random point within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const deltaLat = (distance / 111320) * Math.cos(angle);
    const deltaLng = (distance / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

    const daLat = lat + deltaLat;
    const daLng = lng + deltaLng;

    const statuses: DAStatus[] = ['approved', 'pending', 'refused'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const descriptions = [
      'Construction of two multi-dwelling units',
      'Single dwelling extension and renovation',
      'Construction of a rear addition and second storey',
      'Subdivision into two lots',
      'Construction of a swimming pool and deck',
      'Demolition and construction of new dwelling',
      'Addition of a carport and garage',
      'Rear extension and internal alterations',
    ];

    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    // Random date within last 12 months
    const daysAgo = Math.floor(Math.random() * 365);
    const lodgedDate = new Date();
    lodgedDate.setDate(lodgedDate.getDate() - daysAgo);

    mockDAs.push({
      id: `MOCK-${i + 1}`,
      daNumber: `DA-${Math.floor(Math.random() * 9000) + 1000}`,
      address: `${Math.floor(Math.random() * 200) + 1} Mock Street, Suburb VIC 3000`,
      latitude: daLat,
      longitude: daLng,
      councilName,
      status,
      description,
      lodgedDate: lodgedDate.toISOString(),
      decidedDate:
        status !== 'pending'
          ? new Date(lodgedDate.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      distanceFromSubject: calculateDistance(lat, lng, daLat, daLng),
    });
  }

  // Sort by distance
  return mockDAs.sort((a, b) => (a.distanceFromSubject || 0) - (b.distanceFromSubject || 0));
}

/**
 * GET /api/development-applications
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseInt(searchParams.get('radius') || '1000');

  // Validate inputs
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json<DASearchResponse>(
      {
        success: false,
        error: 'Invalid coordinates. Required: lat and lng query parameters.',
      },
      { status: 400 }
    );
  }

  if (radius < 100 || radius > 5000) {
    return NextResponse.json<DASearchResponse>(
      {
        success: false,
        error: 'Invalid radius. Must be between 100m and 5000m.',
      },
      { status: 400 }
    );
  }

  console.log(`[DA API] Fetching DAs for: ${lat}, ${lng} (radius: ${radius}m)`);

  try {
    // Try PlanningAlerts first
    let applications = await fetchFromPlanningAlerts(lat, lng, radius);

    // Fallback to mock data if no results (for development)
    if (applications.length === 0) {
      console.log('[DA API] No PlanningAlerts data, using mock data');
      applications = generateMockDAs(lat, lng, radius);
    }

    console.log(`[DA API] Found ${applications.length} DAs`);

    return NextResponse.json<DASearchResponse>({
      success: true,
      applications,
      count: applications.length,
      metadata: {
        centerPoint: [lng, lat],
        radius,
        source: applications[0]?.id.startsWith('MOCK') ? 'mock' : 'planningalerts',
      },
    });
  } catch (error) {
    console.error('[DA API] Error:', error);

    return NextResponse.json<DASearchResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
