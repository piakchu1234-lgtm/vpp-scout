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

    const prompt = `Act as a Senior Victorian Architect and property data Auditor. Search the internet for the specific property at "${address}" and return verifiable data.

You MUST use Google Search to look up, in priority order:
- realestate.com.au, domain.com.au — current/historical listing for **exact** bedroom, bathroom, and car-space counts; property description; design features (e.g. "open-plan living", "north-facing rear", "solar")
- Vicmap, LANDATA, council records — Lot/Plan Number (e.g. "Lot 2 PS143510"), land size (m²), frontage
- realestate.com.au, domain.com.au, pricefinder — recent sale price OR current market estimate range
- planning.vic.gov.au / VicPlan / council online planning maps — Planning Zone code + full title and a 1-sentence plain-English description of what the zone permits
- Same sources — Planning Overlays applying to the parcel; for each overlay write a 1-sentence description of what it controls (e.g. "Restricts development to protect heritage character")
- VicPlan hazard layers, council bushfire/flood mapping — natural hazards affecting the parcel (e.g. "Bushfire Prone Area (BPA)", "Flood Risk — Melbourne Water referral required")

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
  "propertyOverview": "A single-storey weatherboard dwelling on a regular rectangular lot with rear lane access. Modest renovation in 2018 added a north-facing kitchen and open-plan living area. Established garden with mature trees along the eastern boundary.",
  "designFeatures": ["Open-plan living", "North-facing rear", "Established mature trees", "Rear lane access", "Solar hot water"]
}

Rules:
- bedrooms / bathrooms / carspaces must come from a verifiable live or recent listing — extract the **exact** integer counts. If no listing is findable, return 0 for each and call this out in insightSummary.
- propertyOverview: 2–3 sentences max, professional and concise; no marketing language.
- zoningDescription / overlay.description: 1 sentence each, plain English, professional planner's voice.
- hazards: only list hazards that are actually present per official mapping. Empty array if none.
- If a value cannot be confirmed via search, provide a best-effort estimate based on neighbourhood context and clearly note uncertainty in insightSummary.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip markdown fences if the model returned any (grounded responses sometimes wrap JSON)
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned);

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