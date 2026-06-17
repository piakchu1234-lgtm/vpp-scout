import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

// Node runtime required for Anthropic SDK
export const runtime = 'nodejs';

// High-fidelity fallback definitions for common Victorian Planning Provisions codes
const VPP_FALLBACK_DEFINITIONS: Record<string, string> = {
  // Zones
  GRZ1: 'General Residential Zone Schedule 1 — Encourages a diversity of housing types and moderate residential growth in areas with good access to services and transport.',
  GRZ2: 'General Residential Zone Schedule 2 — Similar to GRZ1 but may have different schedule provisions for building height or setbacks.',
  GRZ3: 'General Residential Zone Schedule 3 — Similar to GRZ1 but may have specific local character provisions.',
  NRZ1: 'Neighbourhood Residential Zone Schedule 1 — Manages change to respect existing neighbourhood character, limited housing diversity.',
  NRZ2: 'Neighbourhood Residential Zone Schedule 2 — Similar to NRZ1 with specific local character requirements.',
  RGZ1: 'Residential Growth Zone Schedule 1 — Facilitates housing growth in areas close to activity centres and transport with minimal heritage constraints.',
  RGZ2: 'Residential Growth Zone Schedule 2 — Similar to RGZ1, designed for substantial residential intensification.',
  MUZ: 'Mixed Use Zone — Provides for a range of residential, commercial, and industrial uses which complement each other.',
  C1Z: 'Commercial 1 Zone — Encourages commercial centres for retailing and other complementary commercial, entertainment and community uses.',
  C2Z: 'Commercial 2 Zone — Encourages commercial areas for offices, appropriate manufacturing, industries and associated commercial and industrial uses.',
  IN1Z: 'Industrial 1 Zone — Provides for manufacturing industry and associated uses.',
  IN3Z: 'Industrial 3 Zone — Provides for industries and associated uses which do not cause significant impact on nearby non-industrial uses.',
  PPRZ: 'Public Park and Recreation Zone — Recognises public land for park and recreation purposes.',

  // Overlays
  HO: 'Heritage Overlay — Protects places and precincts of heritage significance. Planning permit typically required for external alterations, extensions, or new buildings.',
  DDO: 'Design and Development Overlay — Specifies design objectives and built-form outcomes for buildings and works, often controlling height, setbacks, and architectural expression.',
  SBO: 'Significant Botanical Overlay — Protects specific vegetation of botanical significance. Permit required to remove, destroy, or lop specified vegetation.',
  VPO: 'Vegetation Protection Overlay — Protects areas of significant vegetation. Permit may be required to remove, destroy, or lop vegetation.',
  BMO: 'Bushfire Management Overlay — Ensures bushfire risk is addressed in planning decisions. Requires compliance with defendable space, construction standards, and evacuation planning.',
  LSIO: 'Land Subject to Inundation Overlay — Identifies flood-prone land. May require floor levels to be raised, mandatory referral to Melbourne Water or council drainage authority.',
  FO: 'Floodway Overlay — Identifies active floodway corridors. Strict restrictions on new development due to high flood hazard.',
  DCPO: 'Development Contributions Plan Overlay — Requires developers to contribute to infrastructure costs (e.g., roads, drainage, open space) when subdividing or developing land.',
  PAO: 'Public Acquisition Overlay — Identifies land designated for future public acquisition (e.g., roads, parkland). Severely restricts development potential.',
  ESO: 'Environmental Significance Overlay — Protects environmental values such as waterways, native vegetation, or habitat. Permit triggers for vegetation removal or buildings near waterways.',
};

/**
 * Scrapes VPP definitions from planning.vic.gov.au or council planning scheme pages.
 * Falls back to hardcoded definitions if scraping fails.
 */
async function fetchVPPDefinitions(codes: string[]): Promise<Record<string, string>> {
  const definitions: Record<string, string> = {};

  for (const code of codes) {
    // Try fallback first for speed (most codes are in our dictionary)
    if (VPP_FALLBACK_DEFINITIONS[code]) {
      definitions[code] = VPP_FALLBACK_DEFINITIONS[code];
      continue;
    }

    // Attempt web scrape (basic example - planning.vic.gov.au has complex structure)
    try {
      const searchUrl = `https://www.google.com/search?q=site:planning.vic.gov.au+"${encodeURIComponent(code)}"`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract first snippet (basic scraping - could be enhanced)
        const snippet = $('.VwiC3b').first().text().trim();
        if (snippet && snippet.length > 20) {
          definitions[code] = snippet.substring(0, 300); // Limit length
          continue;
        }
      }
    } catch (error) {
      console.warn(`[ai-analyst] Failed to scrape definition for ${code}:`, error);
    }

    // Final fallback: generic description
    definitions[code] = `${code} — Victorian Planning Provision code. Refer to planning.vic.gov.au for detailed requirements.`;
  }

  return definitions;
}

type AIAnalystRequest = {
  zones: string[];
  overlays: string[];
  landSize: number;
  suburb: string;
  council?: string;
};

type AIAnalystResponse = {
  investmentThesis: string;
  highestBestUse: string;
  keyConstraints: string[];
  estimatedROI: string;
  cached?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AIAnalystRequest;
    const { zones, overlays, landSize, suburb, council } = body;

    // Validation
    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json({ error: 'zones array is required' }, { status: 400 });
    }
    if (!landSize || typeof landSize !== 'number' || landSize <= 0) {
      return NextResponse.json({ error: 'landSize must be a positive number' }, { status: 400 });
    }
    if (!suburb || typeof suburb !== 'string') {
      return NextResponse.json({ error: 'suburb string is required' }, { status: 400 });
    }

    console.log(`[ai-analyst] Analyzing property: ${suburb}, ${landSize}m², Zones: ${zones.join(', ')}`);

    // Step 1: Scrape VPP definitions
    const allCodes = [...zones, ...(overlays || [])];
    const vppDefinitions = await fetchVPPDefinitions(allCodes);

    // Step 2: Initialize Anthropic SDK
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const anthropic = new Anthropic({
      apiKey,
      baseURL: baseUrl,
    });

    // Step 3: Construct expert system prompt
    const systemPrompt = `You are a Senior Victorian Town Planner and Commercial Property Developer with 25+ years of experience in Melbourne's property market.

Your specialty is translating Victorian Planning Provisions (VPP) into concrete, profitable development strategies.

CRITICAL MANDATE:
- Do NOT simply list the rules or explain what each zone/overlay means.
- SYNTHESIZE the data into a 3-sentence 'Highest and Best Use' investment thesis.
- Tell the developer EXACTLY what building typology (e.g., townhouses, mixed-use retail, mid-rise apartments) will yield the highest ROI.
- Base your recommendation STRICTLY on the specific constraints provided.
- Be brutally honest about deal-breakers (e.g., undersized lot, heritage restrictions).
- Think like a commercial developer: what maximizes profit margin and exit velocity?

OUTPUT FORMAT (JSON):
{
  "investmentThesis": "3-sentence executive summary explaining the optimal development strategy and why it maximizes ROI given the specific site constraints.",
  "highestBestUse": "Single phrase describing the optimal building typology (e.g., '2-lot subdivision with dual townhouses', 'Mixed-use retail + 8 apartments', 'Single dwelling with SSD rental income').",
  "keyConstraints": ["Array of 2-4 critical constraints that limit or enable development (e.g., 'Lot size enables SSD under 2026 reforms', 'Heritage overlay adds $100K+ to approval timeline')"],
  "estimatedROI": "Realistic gross margin range as percentage (e.g., '25-35%', '15-20%', 'Negative — avoid')"
}

IMPORTANT:
- Be specific: name dwelling types, unit counts, and realistic price points for ${suburb}.
- If the site is undersized (<300m²) or has severe overlays (PAO, FO), say so bluntly.
- If the site is ideal for SSD, quantify the rental income opportunity.
- If subdivision is possible, calculate the lot yield and target market.
- Output ONLY valid JSON with no markdown fences, no prose before or after.`;

    // Step 4: Construct user prompt with property data
    const vppSummary = Object.entries(vppDefinitions)
      .map(([code, def]) => `- ${code}: ${def}`)
      .join('\n');

    const userPrompt = `Analyze this property and provide your investment thesis:

PROPERTY DETAILS:
- Suburb: ${suburb}
- Council: ${council || 'Unknown'}
- Lot Size: ${landSize} m²
- Zoning: ${zones.join(', ')}
- Overlays: ${overlays && overlays.length > 0 ? overlays.join(', ') : 'None'}

VPP DEFINITIONS:
${vppSummary}

Provide your 3-sentence investment thesis as JSON.`;

    console.log('[ai-analyst] Calling Anthropic Sonnet 4...');

    // Step 5: Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Step 6: Parse response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    console.log('[ai-analyst] Raw response:', responseText.substring(0, 200));

    // Strip markdown fences if present
    const cleaned = responseText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned) as AIAnalystResponse;

    console.log('[ai-analyst] ✅ Successfully generated investment thesis');

    return NextResponse.json({ data, cached: false });
  } catch (error: unknown) {
    console.error('[ai-analyst] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate AI analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
