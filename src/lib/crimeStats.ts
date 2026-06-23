/**
 * LGA CRIME STATISTICS FETCHER
 *
 * Loads pre-processed LGA crime data from public JSON file.
 * Data source: Victorian Crime Statistics Agency (Year Ending March 2026)
 */

export interface CrimeStats {
  incidents: number;
  ratePer100k: number;
  year: string;
}

export interface CrimeStatsData {
  [lgaName: string]: CrimeStats;
}

// Cache for loaded crime data
let crimeStatsCache: CrimeStatsData | null = null;

/**
 * Load crime statistics from public JSON file
 */
async function loadCrimeStats(): Promise<CrimeStatsData> {
  try {
    const response = await fetch('/data/crime_stats.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch crime stats: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[CrimeStats] Error loading crime data:', error);
    throw error;
  }
}

/**
 * Get crime statistics for a specific LGA
 *
 * @param lgaName - Local Government Area name (e.g., "Glen Eira", "Port Phillip")
 * @returns Crime statistics or null if not found
 */
export async function getCrimeStatsForLGA(lgaName: string): Promise<CrimeStats | null> {
  try {
    // Load and cache data on first call
    if (!crimeStatsCache) {
      crimeStatsCache = await loadCrimeStats();
      console.log(`[CrimeStats] Loaded data for ${Object.keys(crimeStatsCache).length} LGAs`);
    }

    // Normalize LGA name for matching (trim whitespace, handle case variations)
    const normalizedInput = lgaName.trim();

    // Try exact match first
    if (crimeStatsCache[normalizedInput]) {
      return crimeStatsCache[normalizedInput];
    }

    // Try case-insensitive match
    const matchingKey = Object.keys(crimeStatsCache).find(
      key => key.toLowerCase() === normalizedInput.toLowerCase()
    );

    if (matchingKey) {
      return crimeStatsCache[matchingKey];
    }

    console.warn(`[CrimeStats] No data found for LGA: "${lgaName}"`);
    return null;

  } catch (error) {
    console.error('[CrimeStats] Failed to get crime stats:', error);
    return null;
  }
}

/**
 * Clear cached crime data
 */
export function clearCrimeStatsCache(): void {
  crimeStatsCache = null;
  console.log('[CrimeStats] Cache cleared');
}

/**
 * Get all available LGA names
 */
export async function getAvailableLGAs(): Promise<string[]> {
  try {
    if (!crimeStatsCache) {
      crimeStatsCache = await loadCrimeStats();
    }
    return Object.keys(crimeStatsCache).sort();
  } catch (error) {
    console.error('[CrimeStats] Failed to get LGA list:', error);
    return [];
  }
}
