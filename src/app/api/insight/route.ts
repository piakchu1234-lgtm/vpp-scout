import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optimized for Cloudflare

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json({ error: 'No address provided' }, { status: 400 });
    }

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

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate insight' }, { status: 500 });
  }
}