import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { AIMarketResponse, AgentSearchRequest, AgentSearchResponse } from '@/types/property';
import { getCachedAgentMarketData, setCachedAgentMarketData } from '@/lib/agentMarketCache';

// Node runtime required for Anthropic SDK
export const runtime = 'nodejs';

/**
 * Live Web Search Tool - Tavily API Integration
 *
 * Searches the web using Tavily API for real property market data.
 * Falls back to mock data if Tavily API key is not configured.
 */
async function liveSearchPropertyWeb(address: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;

  // Fallback to mock data if Tavily API key not configured
  if (!apiKey) {
    console.warn('[agent-search] TAVILY_API_KEY not configured, using mock data');
    return mockSearchPropertyWeb(address);
  }

  try {
    console.log(`[agent-search] Executing live Tavily search for: "${address}"`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: `property history, bedrooms, bathrooms, and estimated price for ${address}`,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[agent-search] Tavily API failed: ${response.status} ${errorText}`);
      throw new Error(`Tavily API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract search results - combine answer + top results
    let searchResults = '';

    // Include the AI-generated answer if available
    if (data.answer) {
      searchResults += `AI Summary:\n${data.answer}\n\n`;
    }

    // Include top search results
    if (data.results && Array.isArray(data.results)) {
      searchResults += 'Top Search Results:\n\n';
      data.results.forEach((result: any, index: number) => {
        searchResults += `${index + 1}. ${result.title || 'Untitled'}\n`;
        searchResults += `   URL: ${result.url || 'N/A'}\n`;
        searchResults += `   ${result.content || 'No content available'}\n\n`;
      });
    }

    if (!searchResults.trim()) {
      console.warn('[agent-search] Tavily returned empty results, using mock data');
      return mockSearchPropertyWeb(address);
    }

    console.log(`[agent-search] Tavily search successful, ${data.results?.length || 0} results`);
    return searchResults;
  } catch (error) {
    console.error('[agent-search] Tavily search failed, falling back to mock:', error);
    return mockSearchPropertyWeb(address);
  }
}

/**
 * Mock Web Search Tool (Fallback)
 *
 * Simulates returning search results for a property address.
 * Used when Tavily API is not available or fails.
 */
function mockSearchPropertyWeb(address: string): string {
  // Simulate realistic search results with some variation based on address
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = hash % 100;

  const bedrooms = 2 + (seed % 4); // 2-5 bedrooms
  const bathrooms = 1 + Math.floor(seed / 25); // 1-4 bathrooms
  const estimatedValue = 500000 + (seed * 10000); // $500k-$1.49M

  return `
Search Results for "${address}":

1. realestate.com.au - ${address}
   ${bedrooms} bed, ${bathrooms} bath home located in Melbourne suburb.
   Recent sales data shows properties in this area selling for around $${estimatedValue.toLocaleString()}.

2. Domain.com.au - Property Report
   Address: ${address}
   Bedrooms: ${bedrooms}
   Bathrooms: ${bathrooms}
   Estimated Value: $${estimatedValue.toLocaleString()}

3. CoreLogic - Market Analysis
   ${address} is a ${bedrooms} bedroom property with ${bathrooms} bathroom(s).
   Market estimate based on recent comparable sales: $${estimatedValue.toLocaleString()}

4. Property Value Australia
   ${address} - ${bedrooms}BR/${bathrooms}BA
   Current market valuation: approximately $${estimatedValue.toLocaleString()}
`;
}

/**
 * Tool Definition for Anthropic
 */
const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_property_web',
  description:
    'Searches the web for property information including bedrooms, bathrooms, and estimated market value for a given address. Returns text snippets from real estate websites.',
  input_schema: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'The property address to search for',
      },
    },
    required: ['address'],
  },
};

/**
 * System Prompt for Data Extraction Agent
 */
const SYSTEM_PROMPT = `You are a data extraction agent specializing in Australian property information.

Your task:
1. Use the search_property_web tool to find information about the provided address
2. Extract ONLY the following fields from the search results:
   - bedrooms (number of bedrooms)
   - bathrooms (number of bathrooms)
   - estimated_value (estimated market value in AUD, as a number without dollar signs or commas)

3. Return ONLY a valid JSON object matching this exact structure:
{
  "bedrooms": <number | null>,
  "bathrooms": <number | null>,
  "estimated_value": <number | null>
}

Rules:
- If a field cannot be found in the search results, set it to null
- Do NOT hallucinate or invent data
- Do NOT include any text outside the JSON object
- Convert price strings like "$850,000" to numbers like 850000
- Be conservative: if you're unsure, return null for that field`;

export async function POST(req: Request) {
  try {
    const body: AgentSearchRequest = await req.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json<AgentSearchResponse>(
        { success: false, error: 'No address provided' },
        { status: 400 }
      );
    }

    console.log(`[agent-search] Starting agentic search for: "${address}"`);

    // CACHE-FIRST ARCHITECTURE: Check PostgreSQL cache before calling Tavily/Anthropic
    const cachedData = await getCachedAgentMarketData(address);

    if (cachedData) {
      // CACHE HIT ✅ - Return cached data instantly (sub-100ms response)
      return NextResponse.json<AgentSearchResponse>({
        success: true,
        data: {
          bedrooms: cachedData.bedrooms,
          bathrooms: cachedData.bathrooms,
          estimated_value: cachedData.estimated_value,
        },
        metadata: {
          toolCalls: cachedData.toolCalls,
          searchExecuted: false,
          cacheHit: true,
          cachedAt: cachedData.cachedAt.toISOString(),
        },
      });
    }

    // CACHE MISS ❌ - Proceed with agentic web search
    console.log('[agent-search] Cache miss, executing live search...');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

    if (!apiKey) {
      return NextResponse.json<AgentSearchResponse>(
        { success: false, error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
      baseURL: baseUrl,
    });

    // Start the tool-calling loop
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Find property information for: ${address}`,
      },
    ];

    let toolCallCount = 0;
    let searchExecuted = false;
    let finalResponse: AIMarketResponse | null = null;

    // Tool-calling loop (max 5 iterations to prevent infinite loops)
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
        tools: [SEARCH_TOOL],
      });

      console.log(`[agent-search] Iteration ${iteration + 1}, stop_reason: ${response.stop_reason}`);

      // Add assistant's response to message history
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        // Agent finished - extract JSON from text response
        const textContent = response.content.find((block) => block.type === 'text');
        if (textContent && textContent.type === 'text') {
          try {
            // Extract JSON from the response (handle potential markdown code blocks)
            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              finalResponse = JSON.parse(jsonMatch[0]) as AIMarketResponse;
            } else {
              throw new Error('No JSON object found in response');
            }
          } catch (parseError) {
            console.error('[agent-search] Failed to parse JSON:', parseError);
            return NextResponse.json<AgentSearchResponse>(
              {
                success: false,
                error: 'Agent returned invalid JSON',
                metadata: {
                  toolCalls: toolCallCount,
                  searchExecuted,
                  cacheHit: false,
                },
              },
              { status: 500 }
            );
          }
        }
        break;
      }

      if (response.stop_reason === 'tool_use') {
        // Process tool calls
        const toolResults: Anthropic.MessageParam = {
          role: 'user',
          content: [],
        };

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            toolCallCount++;
            console.log(`[agent-search] Tool call: ${block.name}`, block.input);

            if (block.name === 'search_property_web') {
              searchExecuted = true;
              const toolInput = block.input as { address: string };
              const searchResult = await liveSearchPropertyWeb(toolInput.address);

              (toolResults.content as Anthropic.ToolResultBlockParam[]).push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: searchResult,
              });
            }
          }
        }

        messages.push(toolResults);
      } else {
        // Unexpected stop reason
        console.warn(`[agent-search] Unexpected stop_reason: ${response.stop_reason}`);
        break;
      }
    }

    if (!finalResponse) {
      return NextResponse.json<AgentSearchResponse>(
        {
          success: false,
          error: 'Agent did not return a valid response',
          metadata: {
            toolCalls: toolCallCount,
            searchExecuted,
            cacheHit: false,
          },
        },
        { status: 500 }
      );
    }

    console.log(`[agent-search] Success! Tool calls: ${toolCallCount}, Result:`, finalResponse);

    // CACHE WRITE: Save fresh data to PostgreSQL for future requests
    await setCachedAgentMarketData(address, {
      bedrooms: finalResponse.bedrooms,
      bathrooms: finalResponse.bathrooms,
      estimated_value: finalResponse.estimated_value,
      source: 'agent',
      toolCalls: toolCallCount,
    });

    return NextResponse.json<AgentSearchResponse>({
      success: true,
      data: finalResponse,
      metadata: {
        toolCalls: toolCallCount,
        searchExecuted,
        cacheHit: false,
      },
    });
  } catch (error) {
    console.error('[agent-search] Error:', error);
    return NextResponse.json<AgentSearchResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
