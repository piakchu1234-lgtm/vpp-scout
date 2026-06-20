/**
 * Agent Source - Agentic AI Web Scraping
 *
 * Uses an AI agent with tool calling to autonomously search the web
 * and extract property market data from search results.
 *
 * This replaces traditional web scraping or paid API calls with an
 * intelligent agent that can reason about search results and extract
 * structured data.
 */

import type { AIMarketResponse, AgentSearchRequest, AgentSearchResponse } from '@/types/property';

/**
 * Fetch property market data using the agentic AI pipeline
 *
 * @param address - Full property address to search for
 * @returns Structured market data (bedrooms, bathrooms, estimated value)
 * @throws Error if the API call fails or returns an error
 */
export async function fetchAgentMarketData(address: string): Promise<AIMarketResponse> {
  console.log(`[AgentSource] Fetching market data for: "${address}"`);

  const requestBody: AgentSearchRequest = { address };

  const response = await fetch('/api/agent-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agent search API failed: ${response.status} ${errorText}`);
  }

  const result: AgentSearchResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Agent search returned no data');
  }

  console.log(
    `[AgentSource] Success! ${result.metadata?.cacheHit ? '⚡ CACHE HIT' : '🔍 LIVE SEARCH'} - Tool calls: ${result.metadata?.toolCalls || 0}, Search executed: ${result.metadata?.searchExecuted || false}`,
    result.data
  );

  return result.data;
}

/**
 * Fetch market data with fallback handling
 *
 * Wraps fetchAgentMarketData with error handling and returns null fields
 * on failure instead of throwing.
 */
export async function fetchAgentMarketDataSafe(address: string): Promise<AIMarketResponse> {
  try {
    return await fetchAgentMarketData(address);
  } catch (error) {
    console.error('[AgentSource] Error fetching market data:', error);
    return {
      bedrooms: null,
      bathrooms: null,
      estimated_value: null,
    };
  }
}
