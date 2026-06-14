/**
 * Market Data Integration Service
 *
 * Fetches property attributes (beds, baths, cars, year built, floor area,
 * last sold price) from Domain API or fallback providers.
 *
 * Current implementation uses mock data. Replace `fetchMarketDataMock`
 * with `fetchMarketDataLive` once Domain API credentials are configured.
 */

export type MarketDataResult = {
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  yearBuilt: number | null;
  floorAreaM2: number | null;
  lastSoldPrice: string | null;
  lastSoldDate: string | null;
  propertyType: string | null; // "House", "Unit", "Townhouse", etc.
  source: 'domain' | 'mock' | 'cache';
};

/**
 * Mock implementation - returns plausible data for Victorian properties.
 * Replace with `fetchMarketDataLive` when Domain credentials are active.
 */
async function fetchMarketDataMock(address: string): Promise<MarketDataResult> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Deterministic seeded response based on address hash
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = hash % 100;

  return {
    bedrooms: 2 + (seed % 4), // 2-5 bedrooms
    bathrooms: 1 + Math.floor(seed / 25), // 1-4 bathrooms
    carspaces: seed % 3, // 0-2 carspaces
    yearBuilt: 1960 + (seed % 64), // 1960-2024
    floorAreaM2: 100 + (seed * 10), // 100-1090 m²
    lastSoldPrice: seed > 50 ? `$${(500 + seed * 10) * 1000}` : null,
    lastSoldDate: seed > 50 ? `${2020 + (seed % 5)}-${String(1 + (seed % 12)).padStart(2, '0')}-15` : null,
    propertyType: seed % 3 === 0 ? 'House' : seed % 3 === 1 ? 'Unit' : 'Townhouse',
    source: 'mock',
  };
}

/**
 * Live implementation - calls Domain Property Enrichment API.
 * Requires DOMAIN_CLIENT_ID and DOMAIN_CLIENT_SECRET in environment.
 *
 * @see https://developer.domain.com.au/docs/latest/apis/pkg_properties_locations/references/properties_v2
 */
async function fetchMarketDataLive(address: string): Promise<MarketDataResult> {
  const clientId = process.env.DOMAIN_CLIENT_ID;
  const clientSecret = process.env.DOMAIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('[marketData] Domain credentials not configured, falling back to mock');
    return fetchMarketDataMock(address);
  }

  try {
    // Step 1: Get OAuth2 token
    const tokenRes = await fetch('https://auth.domain.com.au/v1/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'api_properties_read',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Domain auth failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Step 2: Search for property by address
    const searchRes = await fetch(
      `https://api.domain.com.au/v2/properties/_suggest?terms=${encodeURIComponent(address)}&pageSize=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Api-Key': clientId,
        },
      }
    );

    if (!searchRes.ok) {
      throw new Error(`Domain search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    if (!searchData.data || searchData.data.length === 0) {
      console.warn('[marketData] No Domain property found for address:', address);
      return fetchMarketDataMock(address);
    }

    const propertyId = searchData.data[0].id;

    // Step 3: Fetch property details
    const detailsRes = await fetch(
      `https://api.domain.com.au/v2/properties/${propertyId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Api-Key': clientId,
        },
      }
    );

    if (!detailsRes.ok) {
      throw new Error(`Domain details fetch failed: ${detailsRes.status}`);
    }

    const details = await detailsRes.json();

    return {
      bedrooms: details.bedrooms ?? null,
      bathrooms: details.bathrooms ?? null,
      carspaces: details.carspaces ?? null,
      yearBuilt: details.yearBuilt ?? null,
      floorAreaM2: details.buildingArea ?? null,
      lastSoldPrice: details.lastSoldPrice
        ? `$${details.lastSoldPrice.toLocaleString('en-AU')}`
        : null,
      lastSoldDate: details.lastSoldDate ?? null,
      propertyType: details.propertyType ?? null,
      source: 'domain',
    };
  } catch (error) {
    console.error('[marketData] Domain API error, falling back to mock:', error);
    return fetchMarketDataMock(address);
  }
}

/**
 * Main export - switch between mock and live by changing this line.
 * Set to `fetchMarketDataLive` once Domain credentials are configured.
 */
export const fetchMarketData = fetchMarketDataMock;
