/**
 * Agentic AI Market Response
 *
 * Structured output from the AI agent's web search and extraction.
 * All fields are nullable to handle cases where data cannot be found.
 */
export type AIMarketResponse = {
  bedrooms: number | null;
  bathrooms: number | null;
  estimated_value: number | null;
};

/**
 * Agent Search Request
 * Sent from frontend to /api/agent-search
 */
export type AgentSearchRequest = {
  address: string;
};

/**
 * Agent Search Response
 * Returned from /api/agent-search
 */
export type AgentSearchResponse = {
  success: boolean;
  data?: AIMarketResponse;
  error?: string;
  metadata?: {
    toolCalls: number; // How many tool calls were made
    searchExecuted: boolean; // Whether the search tool was actually invoked
    cacheHit: boolean; // Whether data was served from PostgreSQL cache
    cachedAt?: string; // ISO timestamp of when data was cached (only on cache hit)
  };
};
