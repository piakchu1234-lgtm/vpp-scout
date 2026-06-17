import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Node runtime required for web scraping
export const runtime = 'nodejs';

// Scraper timeout to prevent hanging requests
const SCRAPER_TIMEOUT_MS = 8000;

export type MarketDataResponse = {
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  lastSoldPrice: string | null;
  lastSoldDate: string | null;
  yearBuilt: number | null;
  roofMaterial: string | null;
  wallMaterial: string | null;
  source: 'domain' | 'realestate' | 'fallback' | null;
};

type ScraperResult = {
  bedrooms?: number;
  bathrooms?: number;
  carspaces?: number;
  lastSoldPrice?: string;
  lastSoldDate?: string;
  yearBuilt?: number;
  roofMaterial?: string;
  wallMaterial?: string;
};

/**
 * Scrape Domain.com.au property page for market attributes.
 * Domain publishes property data in structured HTML that can be parsed without authentication.
 *
 * LEGAL BASIS: Public web scraping of publicly accessible data for non-commercial research.
 * Domain's robots.txt does not explicitly disallow property page access.
 */
async function scrapeDomain(address: string): Promise<ScraperResult | null> {
  try {
    // Domain search URL pattern
    const searchUrl = `https://www.domain.com.au/sale/?suburb=${encodeURIComponent(address)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[market-data] Domain returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Domain uses specific CSS selectors for property attributes
    // These are subject to change if Domain updates their HTML structure
    const result: ScraperResult = {};

    // Extract bedrooms (look for bed icon + number)
    const bedsText = $('[data-testid="property-features-text-container"]')
      .filter((_, el) => $(el).text().toLowerCase().includes('bed'))
      .first()
      .text();
    const bedsMatch = bedsText.match(/(\d+)\s*bed/i);
    if (bedsMatch) result.bedrooms = parseInt(bedsMatch[1], 10);

    // Extract bathrooms
    const bathsText = $('[data-testid="property-features-text-container"]')
      .filter((_, el) => $(el).text().toLowerCase().includes('bath'))
      .first()
      .text();
    const bathsMatch = bathsText.match(/(\d+)\s*bath/i);
    if (bathsMatch) result.bathrooms = parseInt(bathsMatch[1], 10);

    // Extract car spaces
    const carsText = $('[data-testid="property-features-text-container"]')
      .filter((_, el) => $(el).text().toLowerCase().includes('car'))
      .first()
      .text();
    const carsMatch = carsText.match(/(\d+)\s*car/i);
    if (carsMatch) result.carspaces = parseInt(carsMatch[1], 10);

    // Extract sold price from listing history
    const soldPriceText = $('.sold-details__price, [data-testid="listing-details__price"]')
      .first()
      .text();
    if (soldPriceText && soldPriceText.includes('$')) {
      result.lastSoldPrice = soldPriceText.trim();
    }

    // Extract sold date
    const soldDateText = $('.sold-details__date, [data-testid="listing-details__sale-date"]')
      .first()
      .text();
    if (soldDateText) {
      result.lastSoldDate = soldDateText.trim();
    }

    console.log('[market-data] Domain scrape result:', result);
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.warn('[market-data] Domain scrape failed:', error);
    return null;
  }
}

/**
 * Scrape RealEstate.com.au property page for market attributes.
 * Fallback scraper when Domain fails or returns incomplete data.
 */
async function scrapeRealEstate(address: string): Promise<ScraperResult | null> {
  try {
    // RealEstate.com.au search pattern
    const searchUrl = `https://www.realestate.com.au/property/${encodeURIComponent(
      address.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    )}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[market-data] RealEstate returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const result: ScraperResult = {};

    // RealEstate.com.au typically uses class-based selectors
    const featuresText = $('.property-features, .property-info__features').text();

    // Extract numeric features
    const bedsMatch = featuresText.match(/(\d+)\s*bed/i);
    if (bedsMatch) result.bedrooms = parseInt(bedsMatch[1], 10);

    const bathsMatch = featuresText.match(/(\d+)\s*bath/i);
    if (bathsMatch) result.bathrooms = parseInt(bathsMatch[1], 10);

    const carsMatch = featuresText.match(/(\d+)\s*car/i);
    if (carsMatch) result.carspaces = parseInt(carsMatch[1], 10);

    // Extract sold details
    const soldPrice = $('.property-price__price, .sold-price').first().text().trim();
    if (soldPrice.includes('$')) {
      result.lastSoldPrice = soldPrice;
    }

    const soldDate = $('.property-price__date, .sold-date').first().text().trim();
    if (soldDate) {
      result.lastSoldDate = soldDate;
    }

    // Extract year built from property details
    const yearBuiltText = $('.property-details__year-built, .property-info__year').text();
    const yearMatch = yearBuiltText.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      result.yearBuilt = parseInt(yearMatch[1], 10);
    }

    console.log('[market-data] RealEstate scrape result:', result);
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.warn('[market-data] RealEstate scrape failed:', error);
    return null;
  }
}

/**
 * Google Search fallback scraper - extracts property data from search result snippets.
 * Used when direct property site scraping fails.
 */
async function scrapeGoogleSearch(address: string): Promise<ScraperResult | null> {
  try {
    const query = `${address} bedrooms bathrooms sold price site:domain.com.au OR site:realestate.com.au`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(SCRAPER_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const result: ScraperResult = {};
    let foundAny = false;

    // Extract data from Google search snippets
    $('.VwiC3b, .s, .st').each((_, el) => {
      const text = $(el).text();

      // Look for bedroom/bathroom patterns in snippets
      const bedsMatch = text.match(/(\d+)\s*(?:bed|bedroom)/i);
      if (bedsMatch && !result.bedrooms) {
        result.bedrooms = parseInt(bedsMatch[1], 10);
        foundAny = true;
      }

      const bathsMatch = text.match(/(\d+)\s*(?:bath|bathroom)/i);
      if (bathsMatch && !result.bathrooms) {
        result.bathrooms = parseInt(bathsMatch[1], 10);
        foundAny = true;
      }

      const carsMatch = text.match(/(\d+)\s*(?:car|parking)/i);
      if (carsMatch && !result.carspaces) {
        result.carspaces = parseInt(carsMatch[1], 10);
        foundAny = true;
      }

      // Look for sold price in snippets
      const priceMatch = text.match(/\$[\d,]+(?:,\d{3})*(?:\.\d{2})?/);
      if (priceMatch && !result.lastSoldPrice) {
        result.lastSoldPrice = priceMatch[0];
        foundAny = true;
      }
    });

    console.log('[market-data] Google search scrape result:', result);
    return foundAny ? result : null;
  } catch (error) {
    console.warn('[market-data] Google search scrape failed:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log(`[market-data] Scraping market data for: ${address}`);

    // Initialize response with null values (graceful fallback)
    const response: MarketDataResponse = {
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      yearBuilt: null,
      roofMaterial: null,
      wallMaterial: null,
      source: null,
    };

    // THREE-TIER SCRAPING STRATEGY:
    // 1. Domain.com.au (most reliable, structured data)
    // 2. RealEstate.com.au (fallback)
    // 3. Google Search snippets (last resort)

    let result: ScraperResult | null = null;

    // Tier 1: Domain
    result = await scrapeDomain(address);
    if (result && Object.keys(result).length > 0) {
      response.source = 'domain';
      console.log('[market-data] Using Domain data');
    }

    // Tier 2: RealEstate (if Domain failed or incomplete)
    if (!result || Object.keys(result).length < 3) {
      const reResult = await scrapeRealEstate(address);
      if (reResult && Object.keys(reResult).length > 0) {
        result = { ...result, ...reResult }; // Merge results
        response.source = 'realestate';
        console.log('[market-data] Using RealEstate data');
      }
    }

    // Tier 3: Google Search fallback
    if (!result || Object.keys(result).length < 2) {
      const googleResult = await scrapeGoogleSearch(address);
      if (googleResult && Object.keys(googleResult).length > 0) {
        result = { ...result, ...googleResult }; // Merge results
        response.source = response.source || 'fallback';
        console.log('[market-data] Using Google search fallback');
      }
    }

    // Map scraped data to response (preserve null values for missing data)
    if (result) {
      response.bedrooms = result.bedrooms ?? null;
      response.bathrooms = result.bathrooms ?? null;
      response.carspaces = result.carspaces ?? null;
      response.lastSoldPrice = result.lastSoldPrice ?? null;
      response.lastSoldDate = result.lastSoldDate ?? null;
      response.yearBuilt = result.yearBuilt ?? null;
      response.roofMaterial = result.roofMaterial ?? null;
      response.wallMaterial = result.wallMaterial ?? null;
    }

    console.log('[market-data] Final response:', response);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[market-data] Fatal error:', error);

    // GRACEFUL DEGRADATION: Return null values instead of crashing
    return NextResponse.json({
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      yearBuilt: null,
      roofMaterial: null,
      wallMaterial: null,
      source: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
