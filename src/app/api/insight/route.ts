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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `Act as a Victorian Town Planner. For the address ${address}, provide a 3-paragraph preliminary site assessment covering:
    1. Neighborhood context and typical zoning.
    2. High-level development potential (e.g., density trends).
    3. Proximity to amenities.
    Include a clear disclaimer that this is an AI-generated preliminary report, not a statutory document. If uncertain about the specific parcel, speak only to the suburb/locality in general terms.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ insight: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
