import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Node runtime: required because `pg` (used by the Prisma driver adapter)
// reaches into node:net / node:tls / node:util/types. Next.js's edge runtime
// sandbox refuses those at build-time page-data collection, even though
// Cloudflare Workers allow them via the `nodejs_compat` flag set in
// wrangler.jsonc. With @opennextjs/cloudflare both runtimes deploy to the
// same Worker, so there is no $0-tier cost difference.
export const runtime = 'nodejs';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Normalised key for the cache lookup. Trim handles trailing whitespace
// from the geocoder; lowercase collapses casing differences between
// "62 Chandler Road" and "62 chandler road" so they share one cache row.
function normaliseAddress(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'No address provided' }, { status: 400 });
    }

    const cacheKey = normaliseAddress(address);
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

    console.log(`[insight] CACHE MISS 🤖 (Calling Gemini) "${cacheKey}"`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    // Agentic workflow: Gemini with Google Search Grounding
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      tools: [{ googleSearch: {} } as any],
    });

    const prompt = `Act as a Senior Victorian Architect AND an expert Australian real estate analyst — a professional with deep, on-the-ground knowledge of Melbourne suburbs, planning controls, listing markets, and school catchments. You are operating as a Context Engine: every field you return must be traceable to a verifiable source you found via web search, and you must reason about the specific property at "${address}" rather than describing the suburb generically.

You MUST use Google Search to look up, in priority order:
- realestate.com.au, domain.com.au — current/historical listing for **exact** bedroom, bathroom, and car-space counts; property description; design features (e.g. "open-plan living", "timber-look floorboards", "north-facing rear", "solar")
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
- bedrooms / bathrooms / carspaces must come from a verifiable live or recent listing — extract the **exact** integer counts. If no listing is findable, return 0 for each and call this out in insightSummary.
- estimatedLastSoldPrice: string formatted with leading "$" and thousands separators (e.g. "$680,000"). estimatedContractDate: string formatted "DD MMM YYYY" (e.g. "11 May 2024"). Both must be sourced from a verifiable sale record (realestate.com.au "Sold", domain.com.au sold listings, pricefinder, CoreLogic). If no sale record can be located after exhaustive search, return empty string "" for the missing field(s) and explicitly note the gap in insightSummary — DO NOT fabricate prices or dates.
- propertyOverview: EXACTLY 3 sentences, professional and concise, written in a senior architect's voice. Must describe the specific dwelling on the specific lot — its built form, orientation, and notable site characteristics — NOT the suburb in general. No marketing language, no asterisks, no markdown.
- designFeatures: 4–5 short noun-phrases extracted from the listing or visible from imagery (e.g. "Open-plan living", "Timber-look floorboards", "North-facing rear"). Title-case-ish, 1–4 words each, no trailing punctuation. If fewer than 4 are verifiable, return only what is verifiable rather than padding.
- nearbySchools: array of up to 2 verified schools, each with { "name": "<official school name>", "distance": "<short distance string e.g. '650 m' or '1.2 km'>" }. Order by proximity (closest first). Return [] if none can be verified.
- zoningDescription / overlay.description: 1 sentence each, plain English, professional planner's voice.
- hazards: only list hazards that are actually present per official mapping. Empty array if none.
- If a value cannot be confirmed via search, provide a best-effort estimate based on neighbourhood context and clearly note uncertainty in insightSummary.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip markdown fences if the model returned any (grounded responses sometimes wrap JSON)
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned);

    // Defensive coercion: nearbySchools is a new field; older cached prompts
    // or partial model output may omit it. Normalise to a clean array of
    // { name, distance } strings so downstream UI never has to defend itself.
    if (!Array.isArray(data.nearbySchools)) {
      data.nearbySchools = [];
    } else {
      data.nearbySchools = data.nearbySchools
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any) => ({
          name: typeof s.name === 'string' ? s.name.trim() : '',
          distance: typeof s.distance === 'string' ? s.distance.trim() : '',
        }))
        .filter((s: { name: string }) => s.name.length > 0)
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
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate insight' }, { status: 500 });
  }
}