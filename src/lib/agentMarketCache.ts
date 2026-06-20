/**
 * Agent Market Cache Utilities
 *
 * PostgreSQL-backed caching layer for agentic web scraping results.
 * Implements 7-day TTL and address normalization for cache key stability.
 */

import { PrismaClient } from '@prisma/client';

// Lazy initialization - only create client if DATABASE_URL is configured
let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient | null {
  if (prisma) return prisma;

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.warn('[agentMarketCache] DATABASE_URL not configured - caching disabled');
    return null;
  }

  try {
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    console.error('[agentMarketCache] Failed to initialize Prisma client:', error);
    return null;
  }
}

// 7-day TTL in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Normalize address for cache key stability
 *
 * Ensures minor formatting variations don't cause false cache misses.
 * Example: "62 Chandler Road, Noble Park, 3174" → "62 chandler road noble park 3174"
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[,\.]/g, '') // Remove commas and periods
    .replace(/\s+(vic|victoria|nsw|qld|sa|wa|tas|nt|act)\s+/gi, ' '); // Remove state names
}

/**
 * Check if cached data is still valid (within 7-day TTL)
 */
export function isCacheValid(updatedAt: Date): boolean {
  const now = Date.now();
  const cacheAge = now - updatedAt.getTime();
  return cacheAge < CACHE_TTL_MS;
}

/**
 * Get cached agent market data
 *
 * Returns cached data if:
 * 1. Address exists in database
 * 2. updatedAt is within 7-day TTL
 *
 * Otherwise returns null (cache miss).
 */
export async function getCachedAgentMarketData(address: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log('[agentMarketCache] Cache disabled - DATABASE_URL not configured');
    return null;
  }

  const normalizedAddress = normalizeAddress(address);

  try {
    const cached = await prisma.agentMarketCache.findUnique({
      where: { address: normalizedAddress },
    });

    if (!cached) {
      console.log('[agentMarketCache] CACHE MISS - Address not found:', normalizedAddress);
      return null;
    }

    // Check TTL
    if (!isCacheValid(cached.updatedAt)) {
      console.log('[agentMarketCache] CACHE EXPIRED - Data older than 7 days:', {
        address: normalizedAddress,
        age: Math.floor((Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      });
      return null;
    }

    console.log('[agentMarketCache] CACHE HIT ✅', {
      address: normalizedAddress,
      bedrooms: cached.bedrooms,
      bathrooms: cached.bathrooms,
      estimatedValue: cached.estimatedValue,
      age: Math.floor((Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60)),
    });

    return {
      bedrooms: cached.bedrooms,
      bathrooms: cached.bathrooms,
      estimated_value: cached.estimatedValue,
      source: cached.source,
      toolCalls: cached.toolCalls,
      cacheHit: true,
      cachedAt: cached.updatedAt,
    };
  } catch (error) {
    console.error('[agentMarketCache] Database error:', error);
    return null;
  }
}

/**
 * Save or update agent market data in cache
 *
 * Uses Prisma upsert to handle both create and update cases.
 */
export async function setCachedAgentMarketData(
  address: string,
  data: {
    bedrooms: number | null;
    bathrooms: number | null;
    estimated_value: number | null;
    source: string;
    toolCalls: number;
  }
) {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log('[agentMarketCache] Cache disabled - skipping write');
    return;
  }

  const normalizedAddress = normalizeAddress(address);

  try {
    await prisma.agentMarketCache.upsert({
      where: { address: normalizedAddress },
      create: {
        address: normalizedAddress,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        estimatedValue: data.estimated_value,
        source: data.source,
        toolCalls: data.toolCalls,
      },
      update: {
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        estimatedValue: data.estimated_value,
        source: data.source,
        toolCalls: data.toolCalls,
        updatedAt: new Date(),
      },
    });

    console.log('[agentMarketCache] CACHE WRITE ✅', {
      address: normalizedAddress,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      estimatedValue: data.estimated_value,
    });
  } catch (error) {
    console.error('[agentMarketCache] Failed to write cache:', error);
    // Don't throw - caching is non-critical
  }
}

/**
 * Invalidate (delete) cached data for an address
 *
 * Useful for manual cache busting or admin tools.
 */
export async function invalidateCachedAgentMarketData(address: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log('[agentMarketCache] Cache disabled - skipping invalidation');
    return;
  }

  const normalizedAddress = normalizeAddress(address);

  try {
    await prisma.agentMarketCache.delete({
      where: { address: normalizedAddress },
    });
    console.log('[agentMarketCache] CACHE INVALIDATED:', normalizedAddress);
  } catch (error) {
    console.error('[agentMarketCache] Failed to invalidate cache:', error);
  }
}

/**
 * Get cache statistics
 *
 * Returns total entries, expired entries, and cache hit rate analytics.
 */
export async function getCacheStats() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log('[agentMarketCache] Cache disabled - no stats available');
    return null;
  }

  try {
    const total = await prisma.agentMarketCache.count();
    const sevenDaysAgo = new Date(Date.now() - CACHE_TTL_MS);
    const valid = await prisma.agentMarketCache.count({
      where: {
        updatedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    return {
      total,
      valid,
      expired: total - valid,
      validPercentage: total > 0 ? Math.round((valid / total) * 100) : 0,
    };
  } catch (error) {
    console.error('[agentMarketCache] Failed to get stats:', error);
    return null;
  }
}
