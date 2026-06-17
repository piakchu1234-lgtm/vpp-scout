import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.ANTHROPIC_API_KEY || '');

type VPPAgentResult = {
  code: string;
  definition: {
    en: string;
    zh: string;
  };
  source: 'scraped' | 'ai-generated' | 'fallback';
};

const SYSTEM_PROMPT = `You are a Senior Victorian Statutory Planner with expertise in the Victoria Planning Provisions (VPP).

Your task is to read scraped content from Victorian planning scheme documents and extract the core legal definition of a planning zone or overlay code.

Summarize the definition in 2 concise sentences explaining what it means for a property developer.

Provide both English and Chinese translations in JSON format:
{
  "en": "English definition (2 sentences)",
  "zh": "简体中文定义 (2 sentences)"
}`;

async function scrapeVicPlanningScheme(code: string): Promise<string | null> {
  try {
    // Attempt to scrape from Victoria Planning Provisions official site
    const searchUrl = `https://www.planning.vic.gov.au/guides-and-resources/search?q=${encodeURIComponent(code)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract text content (basic parsing without cheerio)
    // Look for common VPP content patterns
    const textMatch = html.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (textMatch && textMatch.length > 0) {
      // Combine first few paragraphs and strip HTML tags
      const combinedText = textMatch
        .slice(0, 5)
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();

      if (combinedText.length > 50) {
        return combinedText;
      }
    }

    return null;
  } catch (error) {
    console.error('[vpp-agent] Scraping failed:', error);
    return null;
  }
}

async function generateDefinitionWithAI(
  code: string,
  scrapedContent: string | null
): Promise<{ en: string; zh: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction: SYSTEM_PROMPT,
  });

  const userPrompt = scrapedContent
    ? `Based on this scraped content from Victorian planning documents about "${code}":\n\n${scrapedContent}\n\nProvide a 2-sentence summary for property developers in both English and Chinese.`
    : `Provide a 2-sentence definition of Victorian planning code "${code}" for property developers in both English and Chinese. If you don't have specific information, state that clearly.`;

  try {
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as { en: string; zh: string };
    return parsed;
  } catch (error) {
    console.error('[vpp-agent] AI generation failed:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Invalid request. Expected: code (string)' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Step 1: Attempt to scrape live content
    const scrapedContent = await scrapeVicPlanningScheme(cleanCode);

    // Step 2: Generate AI definition (using scraped content if available)
    try {
      const definition = await generateDefinitionWithAI(cleanCode, scrapedContent);

      const result: VPPAgentResult = {
        code: cleanCode,
        definition,
        source: scrapedContent ? 'scraped' : 'ai-generated',
      };

      return NextResponse.json(result, { status: 200 });
    } catch (aiError) {
      // Fallback to generic message if AI fails
      const fallbackResult: VPPAgentResult = {
        code: cleanCode,
        definition: {
          en: `${cleanCode} is a Victorian planning provision. For detailed information, consult the official planning scheme or a qualified planner.`,
          zh: `${cleanCode} 是维多利亚州规划条款。详细信息请查阅官方规划方案或咨询合格规划师。`,
        },
        source: 'fallback',
      };

      return NextResponse.json(fallbackResult, { status: 200 });
    }
  } catch (error) {
    console.error('[vpp-agent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during VPP agent processing' },
      { status: 500 }
    );
  }
}
