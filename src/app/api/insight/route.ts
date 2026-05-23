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
    
    // Force Gemini into JSON Mode
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `Act as a Victorian real estate data API. For the address ${address}, generate realistic estimates for the site parameters to be used as UI placeholders.
    Return ONLY a valid JSON object matching this exact schema:
    {
      "insightSummary": "3 short bullet points covering neighborhood context and development potential.",
      "estimatedLandSizeM2": 650,
      "estimatedFrontage": "15.5m",
      "marketEstimate": "$700,000 - $780,000",
      "localCouncil": "City of Greater Dandenong"
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate insight' }, { status: 500 });
  }
}