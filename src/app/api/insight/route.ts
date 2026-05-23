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

    const prompt = `Act as a Victorian property data Auditor. Your job is to actively search the internet for the specific property at "${address}" and return verifiable data.

You MUST use Google Search to look up:
- The property's Lot/Plan Number (e.g., "Lot 2 PS143510") from Vicmap, LANDATA, realestate.com.au, domain.com.au, or council records
- Accurate land size in square metres
- Frontage measurement
- Recent sale price OR current market estimate range (from realestate.com.au, domain.com.au, pricefinder, etc.)
- The local council authority

After searching, return ONLY a valid JSON object matching this exact schema (no markdown fences, no prose):
{
  "insightSummary": "3 short bullet points covering neighborhood context and development potential. No markdown, no asterisks.",
  "estimatedLandSizeM2": 650,
  "estimatedFrontage": "15.5m",
  "marketEstimate": "$700,000 - $780,000",
  "localCouncil": "City of Greater Dandenong",
  "lotPlanNumber": "Lot 2 PS143510"
}

If a value cannot be confirmed via search, provide a best-effort estimate based on neighbourhood context and clearly note uncertainty in the insightSummary.`;

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