import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Node runtime: required because `pg` (used by the Prisma driver adapter)
// reaches into node:net / node:tls / node:util/types. Next.js's edge runtime
// sandbox refuses those at build-time page-data collection, even though
// Cloudflare Workers allow them via the `nodejs_compat` flag set in
// wrangler.jsonc. With @opennextjs/cloudflare both runtimes deploy to the
// same Worker, so there is no $0-tier cost difference.
export const runtime = 'nodejs';

// Basic web search by scraping Google Search results (free, no API key).
// Fragile to HTML structure changes, but keeps costs at $0.
async function executeWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return `Search failed: ${response.status}`;
    }

    const html = await response.text();

    // Extract snippets from Google's search results (basic scraping)
    const snippetRegex = new RegExp('<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>(.*?)<\\/div>', 'gs');
    const titleRegex = new RegExp('<h3[^>]*>(.*?)<\\/h3>', 'gs');

    const snippets: string[] = [];
    const titles: string[] = [];

    let match;
    while ((match = titleRegex.exec(html)) !== null && titles.length < 5) {
      const cleaned = match[1].replace(/<[^>]*>/g, '').trim();
      if (cleaned && cleaned.length > 10) {
        titles.push(cleaned);
      }
    }

    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      const cleaned = match[1].replace(/<[^>]*>/g, '').trim();
      if (cleaned && cleaned.length > 20) {
        snippets.push(cleaned);
      }
    }

    if (titles.length === 0 && snippets.length === 0) {
      return `No results found for query: ${query}`;
    }

    // Format results
    let result = `Search results for "${query}":\n\n`;
    for (let i = 0; i < Math.max(titles.length, snippets.length); i++) {
      if (titles[i]) result += `${i + 1}. ${titles[i]}\n`;
      if (snippets[i]) result += `   ${snippets[i]}\n`;
      result += '\n';
    }

    return result;
  } catch (error) {
    return `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Normalised key for the cache lookup. Trim handles trailing whitespace
// from the geocoder; lowercase collapses casing differences between
// "62 Chandler Road" and "62 chandler road" so they share one cache row.
// Language is appended to ensure separate cache entries per language.
function normaliseAddress(raw: string, language: string): string {
  return `${raw.trim().toLowerCase()}::${language.toLowerCase()}`;
}

export async function POST(req: Request) {
  try {
    const { address, language = 'English', metrics } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'No address provided' }, { status: 400 });
    }

    // Extract consolidated metrics from frontend spatial analysis
    const lotAreaM2 = metrics?.lotAreaM2 ?? null;
    const overlayCodes = Array.isArray(metrics?.overlayCodes) ? metrics.overlayCodes : [];
    const parcelCount = typeof metrics?.parcelCount === 'number' ? metrics.parcelCount : 1;

    const cacheKey = normaliseAddress(address, language);
    if (!cacheKey) {
      return NextResponse.json({ error: 'Address is empty after normalisation' }, { status: 400 });
    }

    // Cache check — best-effort. A DB outage must not break the user-facing
    // request, so we swallow lookup errors and fall through to Gemini.
    const cache = await prisma.propertyCache
      .findUnique({ where: { address: cacheKey } })
      .catch((err) => {
        console.error('[insight] cache lookup failed', err);
        return null;
      });

    if (cache) {
      const ageMs = Date.now() - cache.updatedAt.getTime();
      if (ageMs < SEVEN_DAYS_MS) {
        console.log(`[insight] CACHE HIT ⚡ "${cacheKey}" (age ${Math.round(ageMs / 3600000)}h)`);
        return NextResponse.json({ data: cache.aiData, cached: true });
      }
      console.log(
        `[insight] cache stale (age ${Math.round(ageMs / 86400000)}d) — refreshing "${cacheKey}"`,
      );
    }

    console.log(`[insight] CACHE MISS 🤖 (Calling Claude Sonnet 4.6) "${cacheKey}" [Language: ${language}]`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

    console.log('[insight] DEBUG - API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('[insight] DEBUG - Base URL:', baseUrl);

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Inject consolidated metrics into the prompt context so the AI Auditor
    // knows the true site area and overlay constraints when multiple parcels
    // are selected. This enables accurate SSD feasibility assessment and yield
    // calculations for multi-lot acquisition scenarios.
    const metricsContext = lotAreaM2
      ? `\n\nCONSOLIDATED SITE METRICS (from frontend spatial analysis):
- Total lot area: ${lotAreaM2.toFixed(2)} m²
- Parcel count: ${parcelCount}
- Known overlays: ${overlayCodes.length > 0 ? overlayCodes.join(', ') : 'none detected'}

Use these verified measurements as ground truth. DO NOT search for or estimate lot size — this value is computed from authoritative Vicmap cadastral polygons.`
      : '';

    const systemPrompt = `You are a Senior Victorian Town Planner and Project Architect with deep, on-the-ground knowledge of Melbourne suburbs, planning controls, listing markets, and school catchments.

CRITICAL: You have been provided with PRE-CALCULATED, mathematically verified statutory yields from our deterministic ResCode engine. DO NOT recalculate site coverage, permeability, or SSD eligibility. Your job is to generate the professional executive summary and bilingual translation based strictly on the figures provided to you.${metricsContext}

CRITICAL TONE DIRECTIVE: NEVER write disclaimers like "No verifiable listing could be located", "Estimates below are based on...", "Certain values are estimated", or "Data may not reflect current market conditions". NEVER apologize for missing data. NEVER use phrases like "Please note", "It should be noted that", or "Disclaimer". NEVER hallucinate or substitute suburbs or councils. If a specific data point cannot be verified, simply omit it or return an empty string for that field. When market data is missing, evaluate the site's feasibility based PURELY on the provided Zone, Overlays, and Lot Size using your professional judgment. Write with absolute, cold statutory authority. Present findings as definitive assessments, not approximations.

CRITICAL LANGUAGE DIRECTIVE: You must generate the 'executiveSummary' and 'ssdFeasibility.reasoning' values entirely in the requested language: ${language}. However, you MUST keep the JSON keys strictly in English to prevent breaking the frontend schema. All other text fields (propertyOverview, insightSummary, zoningDescription, overlay descriptions, hazards) should also be in ${language}.

CRITICAL: You must detect if the property is currently vacant land (e.g., if the land size exists but floor area/building details are missing, 0, or flagged as vacant in the data). If it is a vacant lot, set 'isVacantLand' to true. If true, you MUST ignore any legacy building data (beds, baths, existing floor area) from demolished structures and treat them as null or 0.

You MUST use the web_search tool to look up, in priority order:
- realestate.com.au, domain.com.au — current/historical listing for **exact** bedroom, bathroom, and car-space counts; property description; design features (e.g. "open-plan living", "timber-look floorboards", "north-facing rear", "solar"). CHECK IF THE LISTING INDICATES VACANT LAND OR DEMOLISHED STRUCTURE.
- Vicmap, LANDATA, council records — Lot/Plan Number (e.g. "Lot 2 PS143510"), land size (m²), frontage
- realestate.com.au, domain.com.au, pricefinder — recent sale price OR current market estimate range
- realestate.com.au "Sold" history, domain.com.au sold listings, pricefinder, CoreLogic — the **most recent sale price** ("last sold price", formatted as a string e.g. "$680,000") AND the **contract date** of that sale ("contract date", formatted as "DD MMM YYYY" e.g. "11 May 2024"). These two fields are MANDATORY — search aggressively across multiple sources before falling back.
- planning.vic.gov.au / VicPlan / council online planning maps — Planning Zone code + full title and a 1-sentence plain-English description of what the zone permits
- Same sources — Planning Overlays applying to the parcel; for each overlay write a 1-sentence description of what it controls (e.g. "Restricts development to protect heritage character")
- VicPlan hazard layers, council bushfire/flood mapping — natural hazards affecting the parcel (e.g. "Bushfire Prone Area (BPA)", "Flood Risk — Melbourne Water referral required")
- findaschool.vic.gov.au, Google Maps, school websites, realestate.com.au school panel — the **two closest schools** to the property by walking/driving distance. Prefer one primary and one secondary where reasonable. Return each school's official name and approximate distance from the property as a short string (e.g. "1.2 km", "650 m"). Do NOT invent schools — if the search cannot confirm two, return as many as you can verify (1 or 0).

After searching, return ONLY a valid JSON object matching this exact schema (no markdown fences, no prose):
{
  "insightSummary": "3 short bullet points covering neighborhood context and development potential. No markdown, no asterisks.",
  "executiveSummary": "A highly analytical, 2-sentence executive summary of the site's development potential based on its zoning. Do not quote raw VPP legislation.",
  "ssdFeasibility": {
    "isEligible": true,
    "reasoning": "Lot size is 650 m² (exceeds 300 m² threshold) and zoning is GRZ1 (General Residential Zone), which permits Small Second Dwellings under the 2026 SSD reforms."
  },
  "isVacantLand": false,
  "estimatedLandSizeM2": 650,
  "estimatedFrontage": "15.5m",
  "marketEstimate": "$700,000 - $780,000",
  "localCouncil": "City of Greater Dandenong",
  "lotPlanNumber": "Lot 2 PS143510",
  "zoning": "GRZ1 — General Residential Zone Schedule 1",
  "zoningDescription": "Encourages a diversity of housing types and moderate housing growth in locations with good transport access.",
  "overlays": [
    { "code": "HO123", "description": "Heritage Overlay — protects buildings or precincts of identified heritage significance; permit required for most external works." },
    { "code": "DDO5", "description": "Design and Development Overlay — controls building height, setbacks and form to achieve a desired neighbourhood character." }
  ],
  "hazards": ["Bushfire Prone Area (BPA)", "Flood Risk — Melbourne Water referral required"],
  "bedrooms": 3,
  "bathrooms": 1,
  "carspaces": 2,
  "propertyOverview": "A single-storey weatherboard dwelling on a regular rectangular lot with rear lane access. A modest 2018 renovation added a north-facing kitchen and open-plan living area opening onto a paved courtyard. Established garden with mature trees along the eastern boundary provides afternoon shade and screening from the neighbouring property.",
  "designFeatures": ["Open-plan living", "Timber-look floorboards", "North-facing rear", "Established mature trees", "Rear lane access"],
  "nearbySchools": [
    { "name": "Noble Park Primary School", "distance": "650 m" },
    { "name": "Keysborough Secondary College", "distance": "1.8 km" }
  ],
  "estimatedLastSoldPrice": "$680,000",
  "estimatedContractDate": "11 May 2024"
}

Rules:
- isVacantLand: MANDATORY boolean. Set to true if the property is vacant land (no existing dwelling, demolished structure, or listings explicitly state "vacant land"). If true, set bedrooms/bathrooms/carspaces to 0 and propertyOverview to describe the vacant parcel characteristics (topography, vegetation, access).
- executiveSummary: EXACTLY 2 sentences, highly analytical, written in a senior architect's voice. Must assess the site's development potential based on its zoning. Do not quote raw VPP legislation.
- ssdFeasibility: Evaluate true/false based on the rule: "Lot size must be > 300 m², and Zoning must be GRZ, NRZ, MUZ, or TRZ3." Provide a 1-sentence reasoning string explaining the eligibility determination.
- bedrooms / bathrooms / carspaces must come from a verifiable live or recent listing — extract the **exact** integer counts. If no listing is findable OR isVacantLand is true, return 0 for each and call this out in insightSummary.
- estimatedLastSoldPrice: string formatted with leading "$" and thousands separators (e.g. "$680,000"). estimatedContractDate: string formatted "DD MMM YYYY" (e.g. "11 May 2024"). Both must be sourced from a verifiable sale record (realestate.com.au "Sold", domain.com.au sold listings, pricefinder, CoreLogic). If no sale record can be located after exhaustive search, return empty string "" for the missing field(s) and explicitly note the gap in insightSummary — DO NOT fabricate prices or dates.
- propertyOverview: EXACTLY 3 sentences, professional and concise, written in a senior architect's voice. If isVacantLand is true, describe the vacant parcel (topography, vegetation, access, orientation). If false, describe the specific dwelling on the specific lot — its built form, orientation, and notable site characteristics — NOT the suburb in general. No marketing language, no asterisks, no markdown.
- designFeatures: 4–5 short noun-phrases extracted from the listing or visible from imagery (e.g. "Open-plan living", "Timber-look floorboards", "North-facing rear"). Title-case-ish, 1–4 words each, no trailing punctuation. If isVacantLand is true OR fewer than 4 are verifiable, return only what is verifiable rather than padding.
- nearbySchools: array of up to 2 verified schools, each with { "name": "<official school name>", "distance": "<short distance string e.g. '650 m' or '1.2 km'>" }. Order by proximity (closest first). Return [] if none can be verified.
- zoningDescription / overlay.description: 1 sentence each, plain English, professional planner's voice.
- hazards: only list hazards that are actually present per official mapping. Empty array if none.
- If a value cannot be confirmed via search, provide a best-effort estimate based on neighbourhood context and clearly note uncertainty in insightSummary.`;

    // Multi-turn conversation with tool execution
    type AnthropicMessage = {
      role: 'user' | 'assistant';
      content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown; content?: string }>;
    };

    type AnthropicContentBlock =
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: { query: string } };

    type AnthropicResponse = {
      content: AnthropicContentBlock[];
      stop_reason: string;
    };

    type SchoolRecord = { name?: unknown; distance?: unknown };

    const endpoint = `${baseUrl}/v1/messages`;
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: `Analyze this property address and return the JSON object as instructed: ${address}`,
      },
    ];

    let finalText: string | null = null;
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    while (!finalText && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.log(`[insight] API call iteration ${iterationCount}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4.6',
          max_tokens: 16000,
          system: systemPrompt,
          tools: [{ type: 'web_search_20260209', name: 'web_search' }],
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as AnthropicResponse;
      console.log(`[insight] Stop reason: ${result.stop_reason}`);

      if (result.stop_reason === 'tool_use') {
        // Claude wants to use tools - execute them
        const toolUseBlocks = result.content.filter(
          (block): block is Extract<AnthropicContentBlock, { type: 'tool_use' }> =>
            block.type === 'tool_use'
        );

        console.log(`[insight] Executing ${toolUseBlocks.length} web searches...`);

        // Execute all tool requests
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (toolUse) => {
            if (toolUse.name === 'web_search') {
              const query = toolUse.input.query;
              console.log(`[insight]   Search: "${query}"`);

              try {
                const searchResults = await executeWebSearch(query);
                return {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: searchResults,
                };
              } catch (err) {
                console.error(`[insight]   Search failed:`, err);
                return {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                  is_error: true,
                };
              }
            }
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: 'Unsupported tool',
              is_error: true,
            };
          })
        );

        // Add assistant's tool_use message and user's tool_result message to conversation
        messages.push({
          role: 'assistant',
          content: result.content,
        });
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Loop continues to get Claude's response with tool results
      } else {
        // Claude returned final text response
        const textBlock = result.content.find((block): block is Extract<AnthropicContentBlock, { type: 'text' }> => block.type === 'text');

        if (!textBlock?.text) {
          console.error('[insight] ERROR - No text in final response:', result);
          throw new Error('No text content in Anthropic response');
        }

        finalText = textBlock.text;
      }
    }

    if (!finalText) {
      throw new Error(`Tool execution loop exceeded ${MAX_ITERATIONS} iterations`);
    }

    // Strip markdown fences if the model returned any
    const cleaned = finalText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned);

    // Defensive coercion: nearbySchools is a new field; older cached prompts
    // or partial model output may omit it. Normalise to a clean array of
    // { name, distance } strings so downstream UI never has to defend itself.
    if (!Array.isArray(data.nearbySchools)) {
      data.nearbySchools = [];
    } else {
      data.nearbySchools = data.nearbySchools
        .filter((s: unknown): s is SchoolRecord => typeof s === 'object' && s !== null)
        .map((s: SchoolRecord) => ({
          name: typeof s.name === 'string' ? s.name.trim() : '',
          distance: typeof s.distance === 'string' ? s.distance.trim() : '',
        }))
        .filter((s: { name: string; distance: string }) => s.name.length > 0)
        .slice(0, 2);
    }

    // Persist to cache. Best-effort: failure to write must not fail the
    // user-facing request — they already paid the latency cost of a cold
    // Gemini call, so we still return the data even if the upsert errors.
    await prisma.propertyCache
      .upsert({
        where: { address: cacheKey },
        create: { address: cacheKey, aiData: data },
        update: { aiData: data },
      })
      .catch((err) => {
        console.error('[insight] cache write failed', err);
      });

    return NextResponse.json({ data, cached: false });
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate insight';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}