/**
 * Agent Market Data Integration
 *
 * Merges agentic AI web scraping results with existing property intelligence.
 * Provides fallback chains and data source tracking for UI display.
 * Includes suburb-level market trends for Domain/REA data parity.
 */

import type { AIMarketResponse } from '@/types/property';

export type DataSource = 'agent' | 'domain' | 'mock' | 'none';

export type SuburbMarketTrends = {
  suburbMedianPrice: number | null;
  suburbGrowthRate: number | null; // percentage (e.g., 12.5 = 12.5%)
  averageDaysOnMarket: number | null;
};

export type MergedMarketData = {
  bedrooms: number | null;
  bathrooms: number | null;
  estimatedValue: number | null;
  source: DataSource;
  suburbTrends?: SuburbMarketTrends;
};

/**
 * Merge agent market data with existing property data
 *
 * Priority chain:
 * 1. Agent data (from Tavily web search + Claude analysis)
 * 2. Domain API data (if available)
 * 3. Null (no data available)
 */
export function mergeAgentMarketData(
  agentData: AIMarketResponse | null,
  domainBedrooms?: number | null,
  domainBathrooms?: number | null
): MergedMarketData {
  // If agent data is available and has at least one field, use it
  if (agentData && (agentData.bedrooms !== null || agentData.bathrooms !== null || agentData.estimated_value !== null)) {
    return {
      bedrooms: agentData.bedrooms,
      bathrooms: agentData.bathrooms,
      estimatedValue: agentData.estimated_value,
      source: 'agent',
      suburbTrends: agentData.suburbTrends || undefined,
    };
  }

  // Fallback to Domain API if available
  if (domainBedrooms !== null || domainBathrooms !== null) {
    return {
      bedrooms: domainBedrooms ?? null,
      bathrooms: domainBathrooms ?? null,
      estimatedValue: null, // Domain API doesn't provide value estimate
      source: 'domain',
    };
  }

  // No data available
  return {
    bedrooms: null,
    bathrooms: null,
    estimatedValue: null,
    source: 'none',
  };
}

/**
 * Format data source for display
 */
export function formatDataSource(source: DataSource, language: 'en' | 'zh'): string {
  const labels: Record<DataSource, { en: string; zh: string }> = {
    agent: {
      en: 'Live Web Search',
      zh: '实时网络搜索',
    },
    domain: {
      en: 'Domain API',
      zh: 'Domain API',
    },
    mock: {
      en: 'Sample Data',
      zh: '示例数据',
    },
    none: {
      en: 'No Data',
      zh: '无数据',
    },
  };

  return labels[source][language];
}

/**
 * Get source confidence level for UI styling
 */
export function getSourceConfidence(source: DataSource): 'high' | 'medium' | 'low' {
  switch (source) {
    case 'agent':
    case 'domain':
      return 'high';
    case 'mock':
      return 'medium';
    case 'none':
      return 'low';
  }
}
