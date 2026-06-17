/**
 * MARKET PROCESSOR - DATA AGGREGATION ENGINE
 *
 * AUTOMATED DESKTOP ASSESSMENT TOOL (NOT PROFESSIONAL ADVICE)
 *
 * Aggregates spatial and market data to generate property intelligence reports.
 * Combines data from multiple sources and applies compliance business logic.
 *
 * Professional Standards:
 * - Desktop Assessment only (no physical site inspection)
 * - Data aggregation model (combines authoritative sources)
 * - Preliminary screening tool (not binding professional advice)
 *
 * Legal Compliance:
 * - NOT a substitute for licensed town planners or architects
 * - NOT formal legal, financial, or professional valuation advice
 * - Users MUST conduct independent due diligence with local council
 *
 * Architecture: Data Aggregator (not AI-based)
 * - Combines VicmapSource spatial data with DomainSource market data
 * - Applies VPP compliance rules and calculations
 * - Structured output with validation
 * - Contextual processing for Australian property development
 *
 * @module MarketProcessor
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SpatialDataOutput } from '../sources/VicmapSource';
import type { MarketDataOutput } from '../sources/DomainSource';

export interface PropertyDataInput {
  spatial: SpatialDataOutput;
  market: MarketDataOutput;
}

export interface ComplianceScorecard {
  // Site Coverage Requirements
  maxSiteCoveragePercent: number | null; // e.g., 60 for GRZ
  calculatedSiteCoverage: number | null; // Current/proposed coverage
  siteCoverageCompliant: boolean | null;

  // Garden Area Requirements
  minGardenAreaPercent: number | null; // e.g., 25 for GRZ
  calculatedGardenArea: number | null; // m²
  gardenAreaCompliant: boolean | null;

  // Height Restrictions
  maxHeightMeters: number | null; // e.g., 9m for GRZ, 11m for GRZ Schedule
  maxStoreys: number | null; // e.g., 3 for most residential zones
  heightCompliant: boolean | null;

  // Setback Requirements
  frontSetbackMeters: number | null;
  sideSetbackMeters: number | null;
  rearSetbackMeters: number | null;

  // Fast-Track Specific
  clause55Compliant: boolean | null; // Single dwelling on lot < 500m²
  clause57Compliant: boolean | null; // Multi-dwelling < 10 dwellings
  vppExemptions: string[]; // e.g., ["No third-party notice", "Code assessment only"]
}

export interface PropertyDataOutput {
  success: boolean;
  // Strategic Analysis
  highestBestUse: string; // 2-sentence development strategy
  riskFactors: string[]; // Array of planning constraints
  tierClassification: string; // Fast-track tier (e.g., "10-Day Fast Track")
  estimatedGRVMultiplier: number; // Yield factor (e.g., 2.5 = 2.5x land value)

  // DEEP VPP COMPLIANCE SCORECARD
  complianceScorecard: ComplianceScorecard;

  // LEGAL DISCLAIMER (Australian Consumer Law)
  legalDisclaimer: string; // Mandatory disclaimer for all outputs

  // Metadata
  scrapedAt: Date;
  modelUsed: string;
  error?: string;
}

/**
 * Execute AI Planning Agent synthesis with deep VPP audit
 *
 * @param input - Combined spatial and market data
 * @returns Structured planning insights with compliance scorecard
 */
export async function processPropertyData(
  input: PropertyDataInput
): Promise<PropertyDataOutput> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({ apiKey });

    // Construct system prompt with Victorian planning expertise
    const systemPrompt = buildDeepVPPSystemPrompt();

    // Construct user prompt with property data
    const userPrompt = buildUserPrompt(input);

    // Call Claude 3.5 Sonnet with extended token budget
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000, // INCREASED: Deep compliance analysis requires more tokens
      temperature: 0.2, // Very low temperature for regulatory compliance
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      highestBestUse: string;
      riskFactors: string[];
      tierClassification: string;
      estimatedGRVMultiplier: number;
      complianceScorecard: ComplianceScorecard;
    };

    // Validate response structure
    if (
      !parsed.highestBestUse ||
      !Array.isArray(parsed.riskFactors) ||
      !parsed.tierClassification ||
      typeof parsed.estimatedGRVMultiplier !== 'number' ||
      !parsed.complianceScorecard
    ) {
      throw new Error('Invalid response structure from Claude');
    }

    // MANDATORY LEGAL DISCLAIMER (Australian Consumer Law + Professional Standards)
    const legalDisclaimer = `AUTOMATED DESKTOP ASSESSMENT DISCLAIMER: The feasibility and yield metrics presented are statistically derived estimates generated via an automated computational model processing public spatial data. This constitutes a desktop assessment only; no physical site inspection has been conducted. This analysis does not account for unrecorded physical constraints, hidden site defects, topography limits, or dynamic market conditions. This report must not be construed as professional valuation, formal architectural advice, registered survey, or binding town planning guidance. SimplySite provides indicative feasibility vectors for preliminary screening purposes only. Independent due diligence with local council and licensed professionals is strictly required prior to property acquisition or development. To the full extent permitted by law, SimplySite excludes all warranties and accepts no liability (including in negligence) for financial loss arising from reliance on this automated spatial synthesis. Spatial data © State of Victoria.`;

    return {
      success: true,
      highestBestUse: parsed.highestBestUse,
      riskFactors: parsed.riskFactors,
      tierClassification: parsed.tierClassification,
      estimatedGRVMultiplier: parsed.estimatedGRVMultiplier,
      complianceScorecard: parsed.complianceScorecard,
      legalDisclaimer, // Injected into every response
      scrapedAt: new Date(),
      modelUsed: 'claude-3-5-sonnet-20241022',
    };
  } catch (error) {
    console.error('[PlanningAgent] Execution failed:', error);
    return {
      success: false,
      highestBestUse: '',
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
      legalDisclaimer: `AUTOMATED DESKTOP ASSESSMENT DISCLAIMER: The feasibility and yield metrics presented are statistically derived estimates generated via an automated computational model processing public spatial data. This constitutes a desktop assessment only; no physical site inspection has been conducted. This analysis does not account for unrecorded physical constraints, hidden site defects, topography limits, or dynamic market conditions. This report must not be construed as professional valuation, formal architectural advice, registered survey, or binding town planning guidance. SimplySite provides indicative feasibility vectors for preliminary screening purposes only. Independent due diligence with local council and licensed professionals is strictly required prior to property acquisition or development. To the full extent permitted by law, SimplySite excludes all warranties and accepts no liability (including in negligence) for financial loss arising from reliance on this automated spatial synthesis. Spatial data © State of Victoria.`,
      scrapedAt: new Date(),
      modelUsed: 'claude-3-5-sonnet-20241022',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build deep VPP system prompt with granular compliance requirements
 */
function buildDeepVPPSystemPrompt(): string {
  return `You are a Senior Victorian Town Planner and Property Development Strategist with deep expertise in:

1. **Victoria Planning Provisions (VPP) 2026 reforms**
2. **Fast-track code assessment pathways (Clause 55/57)**
3. **Residential zoning (GRZ, NRZ, RGZ, C1Z, MUZ) with schedule variations**
4. **Planning overlays and their development impacts**
5. **Australian property development economics**
6. **Itemized VPP compliance requirements (site coverage, garden area, height limits, setbacks)**

Your role is to analyze property data and provide a comprehensive compliance audit with actionable insights for developers and investors.

---

## OUTPUT FORMAT

You must respond with ONLY a valid JSON object matching this exact schema:

\`\`\`json
{
  "highestBestUse": "A clear 2-sentence development strategy optimized for ROI. State the primary development type (e.g., townhouses, multi-dwelling, subdivision) and key value drivers.",

  "riskFactors": [
    "Array of specific planning constraints with overlay codes",
    "Each item should be concrete, not generic"
  ],

  "tierClassification": "Fast-track eligibility tier (e.g., '10-Day Fast Track', '30-Day Code Assessment', 'Standard Discretionary Review')",

  "estimatedGRVMultiplier": 2.5,

  "complianceScorecard": {
    "maxSiteCoveragePercent": 60,
    "calculatedSiteCoverage": null,
    "siteCoverageCompliant": null,
    "minGardenAreaPercent": 25,
    "calculatedGardenArea": null,
    "gardenAreaCompliant": null,
    "maxHeightMeters": 9,
    "maxStoreys": 2,
    "heightCompliant": null,
    "frontSetbackMeters": 9,
    "sideSetbackMeters": 1,
    "rearSetbackMeters": 6,
    "clause55Compliant": true,
    "clause57Compliant": false,
    "vppExemptions": ["No third-party notice required", "Code assessment only"]
  }
}
\`\`\`

---

## COMPLIANCE SCORECARD RULES

### Zone-Specific Requirements:

**GRZ (General Residential Zone)**
- Max site coverage: 60%
- Min garden area: 25% of site
- Max height: 9m (2 storeys) OR 11m (3 storeys) with Schedule
- Front setback: 9m or to match streetscape
- Side setback: 1m (ground), 2m (upper)
- Rear setback: 6m

**NRZ (Neighbourhood Residential Zone)**
- Max site coverage: 50%
- Min garden area: 35% of site
- Max height: 9m (2 storeys)
- Front setback: 9m or to match streetscape
- Side setback: 1m (ground), 2m (upper)
- Rear setback: 6m

**RGZ (Residential Growth Zone)**
- Max site coverage: 60%
- Min garden area: 20% of site
- Max height: 13.5m (4 storeys) with Schedule
- Setbacks: Varies by schedule

**C1Z (Commercial 1 Zone)**
- No mandatory site coverage (commercial discretion)
- Max height: Varies by schedule (typically 11m-16m)
- Setbacks: Streetscape-based

### Fast-Track Pathways:

**Clause 55 (Single Dwelling):**
- Lot < 500m²
- Single dwelling
- No third-party notice
- 10-day code assessment

**Clause 57 (Multi-Dwelling):**
- < 10 dwellings
- Complies with site coverage, garden area, height
- No third-party notice if < 6 dwellings
- 30-day code assessment

### Overlay Impacts:

- **HO (Heritage Overlay)**: Design approval required, may reduce heights
- **SBO (Special Building Overlay - Flooding)**: Construction standards, may prohibit basements
- **ESO (Environmental Significance Overlay)**: Vegetation protection, setback increases
- **VPO (Vegetation Protection Overlay)**: Tree retention, canopy coverage requirements
- **DDO (Design and Development Overlay)**: Custom height/setback requirements

---

## EXTRACTION GUIDELINES

- Be factual and grounded in VPP 2026 regulations
- Cross-reference zone code with schedule variations
- Flag overlay constraints explicitly with impact analysis
- Calculate compliance percentages based on site area
- If insufficient data for calculation, set to null but provide regulatory limit
- Estimate GRV multiplier based on zone and development potential (typical range: 1.5-4.0x)
- NO placeholder text or generic statements
- Output ONLY the JSON object, no other text

---

## EXAMPLE OUTPUT

For a 450m² GRZ1 lot with no overlays:

\`\`\`json
{
  "highestBestUse": "Optimal for dual-occupancy townhouse development (2 x 3-bed units) under Clause 57 fast-track code assessment. Site dimensions support compliant garden area (25%+) and 9m height limit for 2-storey construction.",
  "riskFactors": [
    "Front setback must match streetscape (verify adjoining properties)",
    "Side boundary window requirements may restrict design flexibility"
  ],
  "tierClassification": "30-Day Fast Track (Clause 57)",
  "estimatedGRVMultiplier": 2.8,
  "complianceScorecard": {
    "maxSiteCoveragePercent": 60,
    "calculatedSiteCoverage": null,
    "siteCoverageCompliant": true,
    "minGardenAreaPercent": 25,
    "calculatedGardenArea": 112.5,
    "gardenAreaCompliant": true,
    "maxHeightMeters": 9,
    "maxStoreys": 2,
    "heightCompliant": true,
    "frontSetbackMeters": 9,
    "sideSetbackMeters": 1,
    "rearSetbackMeters": 6,
    "clause55Compliant": false,
    "clause57Compliant": true,
    "vppExemptions": ["No third-party notice (< 6 dwellings)", "Code assessment only"]
  }
}
\`\`\``;
}

/**
 * Build user prompt with property intelligence
 */
function buildUserPrompt(input: PropertyDataInput): string {
  const { spatial, market } = input;

  return `Analyze this Victorian property and provide a comprehensive VPP compliance audit with development insights:

---

## PROPERTY LOCATION
- **Address**: ${spatial.address}
- **Suburb**: ${spatial.suburb}
- **Postcode**: ${spatial.postcode}
- **LGA**: ${spatial.lga || 'Unknown'}

---

## CADASTRAL DATA
- **Land Size**: ${spatial.landSize.toFixed(2)} m²
- **Lot/Plan**: ${spatial.lotPlan || 'Unknown'}
- **PFI**: ${spatial.pfi}

---

## PLANNING FRAMEWORK
- **Primary Zone**: ${spatial.zoning.join(', ') || 'Unknown'}
- **Overlays**: ${spatial.overlays.length > 0 ? spatial.overlays.join(', ') : 'None'}

---

## MARKET INTELLIGENCE
${market.success ? `
- **Bedrooms**: ${market.bedrooms || 'Unknown'}
- **Bathrooms**: ${market.bathrooms || 'Unknown'}
- **Car Spaces**: ${market.carspaces || 'Unknown'}
- **Year Built**: ${market.yearBuilt || 'Unknown'}
- **Construction**: ${market.wallMaterial || 'Unknown'} walls, ${market.roofMaterial || 'Unknown'} roof
- **Last Sold**: ${market.lastSoldPrice ? `$${(market.lastSoldPrice / 100).toLocaleString()}` : 'Unknown'}
- **Sale Date**: ${market.lastSoldDate ? market.lastSoldDate.toLocaleDateString() : 'Unknown'}
` : '- Market data unavailable'}

---

Based on this data, provide your expert VPP compliance analysis as a JSON object with the complete compliance scorecard.`;
}

