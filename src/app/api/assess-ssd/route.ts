import { NextResponse } from 'next/server';
import { evaluateSSDFeasibility } from '@/lib/compliance/ssdAssessor';
import type { SiteParameters } from '@/lib/compliance/types/ssd';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { lotSize, zones, overlays, hasExistingDwelling } = body;

    if (
      typeof lotSize !== 'number' ||
      !Array.isArray(zones) ||
      !Array.isArray(overlays) ||
      typeof hasExistingDwelling !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid request payload. Expected: lotSize (number), zones (string[]), overlays (string[]), hasExistingDwelling (boolean)' },
        { status: 400 }
      );
    }

    const siteParams: SiteParameters = {
      lotSize,
      zones,
      overlays,
      hasExistingDwelling,
    };

    const assessment = evaluateSSDFeasibility(siteParams);

    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    console.error('[assess-ssd] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during SSD assessment' },
      { status: 500 }
    );
  }
}
