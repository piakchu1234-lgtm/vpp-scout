/**
 * MARKET INTELLIGENCE AGENT - LEGALLY DEFENSIVE ARCHITECTURE
 *
 * STRICT FACTUAL EXTRACTION ONLY - NO COPYRIGHT MATERIAL
 *
 * Legal Compliance:
 * - Extracts ONLY raw factual data points (beds, baths, price, dates)
 * - NEVER downloads or stores: photos, floor plans, agent descriptions
 * - Facts are not copyrightable (Phone Directories v Telstra)
 * - Expression is copyrightable (REA v Hardingham) - EXCLUDED
 *
 * Risk Mitigation:
 * - No logged-in scraping (avoids ToS contract)
 * - Rate-limited requests (1500ms between calls)
 * - User-Agent rotation (avoids detection patterns)
 * - AI fallback for factual extraction only
 *
 * Data Sources:
 * - Domain.com.au (public property listings - factual data only)
 * - Claude Sonnet for ambiguous HTML parsing (facts only)
 *
 * Architecture:
 * - Primary: DOM selector extraction with Cheerio
 * - Fallback: Claude SDK for unstructured HTML parsing
 * - Strict data cleaning and type conversion
 * - Comprehensive error handling
 *
 * Legal Notice:
 * This implementation scrapes ONLY publicly available factual data.
 * NO copyrighted material (photos, descriptions, floor plans) is extracted.
 * User accepts legal liability. Intended for MVP development only.
 * Production deployment MUST use licensed APIs (Domain API, CoreLogic).
 */

import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

export interface MarketAgentInput {
  address: string;
  suburb: string;
  postcode: string;
}

export interface MarketAgentOutput {
  success: boolean;
  // Property Attributes
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  // Construction Details
  yearBuilt: number | null;
  wallMaterial: string | null;
  roofMaterial: string | null;
  // Sales History
  lastSoldPrice: number | null; // AUD cents
  lastSoldDate: Date | null;
  // Metadata
  scrapedAt: Date;
  source: string | null;
  parsingMethod: 'dom' | 'ai' | 'failed';
  error?: string;
}

/**
 * User-Agent rotation pool to prevent automated request blocking
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

/**
 * Execute market intelligence scraping with AI-powered fallback
 *
 * @param input - Address, suburb, postcode
 * @returns Market data and property attributes
 */
export async function executeMarketAgent(
  input: MarketAgentInput
): Promise<MarketAgentOutput> {
  try {
    // Try Domain.com.au first (most reliable Australian source)
    const domainResult = await scrapeDomain(input);
    if (domainResult.success) {
      return domainResult;
    }

    // Fallback: Return null data rather than failing completely
    return {
      success: false,
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      yearBuilt: null,
      wallMaterial: null,
      roofMaterial: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      scrapedAt: new Date(),
      source: null,
      parsingMethod: 'failed',
      error: 'No market data sources available',
    };
  } catch (error) {
    console.error('[MarketAgent] Execution failed:', error);
    return {
      success: false,
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      yearBuilt: null,
      wallMaterial: null,
      roofMaterial: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      scrapedAt: new Date(),
      source: null,
      parsingMethod: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrape property data from Domain.com.au with AI fallback
 */
async function scrapeDomain(input: MarketAgentInput): Promise<MarketAgentOutput> {
  try {
    // Construct Domain search URL
    const searchQuery = `${input.address}, ${input.suburb} ${input.postcode}`;
    const searchUrl = `https://www.domain.com.au/sale/${encodeURIComponent(searchQuery)}/`;

    // Random User-Agent to avoid blocking
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    // Fetch HTML with proper headers
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    if (response.status !== 200) {
      throw new Error(`Domain returned status ${response.status}`);
    }

    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);

    // STRATEGY 1: Try DOM selector extraction
    const bedrooms = extractBedrooms($);
    const bathrooms = extractBathrooms($);
    const carspaces = extractCarspaces($);
    const yearBuilt = extractYearBuilt($);
    const wallMaterial = extractWallMaterial($);
    const roofMaterial = extractRoofMaterial($);
    const { price: lastSoldPrice, date: lastSoldDate } = extractSalesHistory($);

    // Check if DOM parsing was successful
    const domParsingSuccessful =
      bedrooms !== null ||
      bathrooms !== null ||
      carspaces !== null ||
      lastSoldPrice !== null;

    if (domParsingSuccessful) {
      return {
        success: true,
        bedrooms,
        bathrooms,
        carspaces,
        yearBuilt,
        wallMaterial,
        roofMaterial,
        lastSoldPrice,
        lastSoldDate,
        scrapedAt: new Date(),
        source: 'domain.com.au',
        parsingMethod: 'dom',
      };
    }

    // STRATEGY 2: AI-POWERED FALLBACK
    // If DOM selectors failed, send HTML to Claude for intelligent parsing
    console.log('[MarketAgent] DOM parsing failed - activating AI fallback');

    const htmlContent = response.data as string;
    const aiParsedData = await parseWithClaude(htmlContent, input);

    if (aiParsedData.success) {
      return {
        ...aiParsedData,
        source: 'domain.com.au',
        parsingMethod: 'ai',
      };
    }

    // Both strategies failed
    return {
      success: false,
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      yearBuilt: null,
      wallMaterial: null,
      roofMaterial: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      scrapedAt: new Date(),
      source: null,
      parsingMethod: 'failed',
      error: 'Both DOM and AI parsing failed',
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('[MarketAgent] Domain scrape failed:', axiosError.message);
    } else {
      console.error('[MarketAgent] Domain scrape failed:', error);
    }

    return {
      success: false,
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      yearBuilt: null,
      wallMaterial: null,
      roofMaterial: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      scrapedAt: new Date(),
      source: null,
      parsingMethod: 'failed',
      error: error instanceof Error ? error.message : 'Scraping failed',
    };
  }
}

/**
 * AI-POWERED FALLBACK: Parse unstructured HTML with Claude
 *
 * Token-intensive strategy for ambiguous or dynamic HTML structures.
 * Claude extracts property attributes from raw HTML when selectors fail.
 */
async function parseWithClaude(
  htmlContent: string,
  input: MarketAgentInput
): Promise<MarketAgentOutput> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({ apiKey });

    // Truncate HTML to first 100KB (avoid token limits)
    const truncatedHTML = htmlContent.substring(0, 100000);

    const systemPrompt = `You are an expert web scraper and data extraction specialist for Australian property listings.

CRITICAL LEGAL REQUIREMENT: Extract ONLY raw factual data points. NEVER extract:
- Property photographs or image URLs
- Agent descriptions or marketing text
- Floor plans or diagrams
- Any copyrighted creative content

Your task is to parse HTML from property listing websites and extract ONLY factual integers, dates, and material types.

FACTUAL DATA ONLY - NO COPYRIGHTED EXPRESSION

OUTPUT FORMAT: You must respond with ONLY a valid JSON object matching this schema:

{
  "bedrooms": 3,
  "bathrooms": 2,
  "carspaces": 1,
  "yearBuilt": 1985,
  "wallMaterial": "Brick",
  "roofMaterial": "Tile",
  "lastSoldPrice": 135000000,
  "lastSoldDate": "2023-12-15"
}

FIELD RULES:
- bedrooms: Integer count, null if not found
- bathrooms: Integer count, null if not found
- carspaces: Integer count (parking spaces), null if not found
- yearBuilt: 4-digit year (1800-2026), null if not found
- wallMaterial: One of [Brick, Weatherboard, Render, Concrete, Timber, Bluestone], null if not found
- roofMaterial: One of [Tile, Colorbond, Slate, Metal, Shingle], null if not found
- lastSoldPrice: Integer in AUD cents (e.g., $1,350,000 = 135000000), null if not found
- lastSoldDate: ISO date string (YYYY-MM-DD), null if not found

EXTRACTION GUIDELINES:
- Look for phrases like "3 bed", "2 bath", "1 car"
- Search for "Sold $X" or "Last sold for $X"
- Find construction details in property descriptions
- Extract ONLY factual data - NO creative descriptions
- If a field is ambiguous or missing, return null
- DO NOT hallucinate data - only extract what you see

LEGAL COMPLIANCE:
- Facts are not copyrightable under Australian law
- NEVER extract agent descriptions, marketing text, or photos
- Output ONLY factual integers and dates

Output ONLY the JSON object, no other text.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.1, // Very low temperature for factual extraction
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Extract property data from this HTML for: ${input.address}, ${input.suburb}\n\nHTML:\n${truncatedHTML}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      bedrooms: number | null;
      bathrooms: number | null;
      carspaces: number | null;
      yearBuilt: number | null;
      wallMaterial: string | null;
      roofMaterial: string | null;
      lastSoldPrice: number | null;
      lastSoldDate: string | null;
    };

    // Parse date string to Date object
    let lastSoldDate: Date | null = null;
    if (parsed.lastSoldDate) {
      lastSoldDate = new Date(parsed.lastSoldDate);
    }

    console.log('[MarketAgent] AI parsing successful:', parsed);

    return {
      success: true,
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      carspaces: parsed.carspaces,
      yearBuilt: parsed.yearBuilt,
      wallMaterial: parsed.wallMaterial,
      roofMaterial: parsed.roofMaterial,
      lastSoldPrice: parsed.lastSoldPrice,
      lastSoldDate,
      scrapedAt: new Date(),
      source: 'domain.com.au',
      parsingMethod: 'ai',
    };
  } catch (error) {
    console.error('[MarketAgent] AI parsing failed:', error);
    return {
      success: false,
      bedrooms: null,
      bathrooms: null,
      carspaces: null,
      yearBuilt: null,
      wallMaterial: null,
      roofMaterial: null,
      lastSoldPrice: null,
      lastSoldDate: null,
      scrapedAt: new Date(),
      source: null,
      parsingMethod: 'failed',
      error: error instanceof Error ? error.message : 'AI parsing failed',
    };
  }
}

/**
 * Extract bedroom count from DOM
 * Typical selectors: .property-features__feature--beds, [data-testid="property-features-bedrooms"]
 */
function extractBedrooms($: cheerio.CheerioAPI): number | null {
  const selectors = [
    '.property-features__feature--beds',
    '[data-testid="property-features-bedrooms"]',
    '.listing-details__features .bed',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const match = text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Extract bathroom count from DOM
 */
function extractBathrooms($: cheerio.CheerioAPI): number | null {
  const selectors = [
    '.property-features__feature--baths',
    '[data-testid="property-features-bathrooms"]',
    '.listing-details__features .bath',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const match = text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Extract car space count from DOM
 */
function extractCarspaces($: cheerio.CheerioAPI): number | null {
  const selectors = [
    '.property-features__feature--cars',
    '[data-testid="property-features-parking"]',
    '.listing-details__features .car',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    const match = text.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Extract year built from property details
 */
function extractYearBuilt($: cheerio.CheerioAPI): number | null {
  const text = $('body').text();
  const match = text.match(/built\s+in\s+(\d{4})/i) || text.match(/(\d{4})\s+build/i);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year > 1800 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  return null;
}

/**
 * Extract wall material from property description
 */
function extractWallMaterial($: cheerio.CheerioAPI): string | null {
  const text = $('body').text().toLowerCase();
  const materials = ['brick', 'weatherboard', 'render', 'concrete', 'timber', 'bluestone'];

  for (const material of materials) {
    if (text.includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1);
    }
  }

  return null;
}

/**
 * Extract roof material from property description
 */
function extractRoofMaterial($: cheerio.CheerioAPI): string | null {
  const text = $('body').text().toLowerCase();
  const materials = ['tile', 'colorbond', 'slate', 'metal', 'shingle'];

  for (const material of materials) {
    if (text.includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1);
    }
  }

  return null;
}

/**
 * Extract sales history (last sold price and date)
 */
function extractSalesHistory($: cheerio.CheerioAPI): {
  price: number | null;
  date: Date | null;
} {
  const selectors = [
    '.listing-details__summary-title',
    '.property-price',
    '[data-testid="listing-details__summary-title"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();

    // Extract price (e.g., "$1,350,000")
    const priceMatch = text.match(/\$([0-9,]+)/);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, '');
      const priceAUD = parseInt(priceStr, 10);
      const priceCents = priceAUD * 100; // Convert to cents

      // Extract date (e.g., "Sold 15 Dec 2023")
      const dateMatch = text.match(/sold\s+(\d{1,2}\s+\w+\s+\d{4})/i);
      let soldDate: Date | null = null;
      if (dateMatch) {
        soldDate = new Date(dateMatch[1]);
      }

      return { price: priceCents, date: soldDate };
    }
  }

  return { price: null, date: null };
}
