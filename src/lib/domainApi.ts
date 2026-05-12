/**
 * Domain API integration for property enrichment data.
 *
 * Fetches lot size and rental estimates for Victorian properties.
 * Requires NEXT_PUBLIC_DOMAIN_API_KEY in .env.local
 *
 * API Docs: https://developer.domain.com.au/docs/apis/pkg_properties_locations/references/propertyenrichment_get
 */

import axios from 'axios';

const DOMAIN_API_BASE = 'https://api.domain.com.au';
const API_KEY = process.env.NEXT_PUBLIC_DOMAIN_API_KEY;

export type DomainPropertyData = {
  lotSize: number | null; // in m²
  rentalEstimateWeekly: number | null; // in AUD per week
  confidence: 'high' | 'medium' | 'low' | null;
};

type DomainEnrichmentResponse = {
  propertyDetails?: {
    area?: {
      value?: number;
      unit?: string;
    };
  };
  rentalEstimate?: {
    lower?: number;
    upper?: number;
    midpoint?: number;
  };
};

/**
 * Fetch property enrichment data from Domain API.
 * Returns null if API key is missing or request fails.
 */
export async function fetchDomainPropertyData(
  address: string,
  lat: number,
  lon: number,
): Promise<DomainPropertyData | null> {
  if (!API_KEY) {
    console.warn('[domainApi] NEXT_PUBLIC_DOMAIN_API_KEY not configured');
    return null;
  }

  try {
    // Domain Property Enrichment API endpoint
    const { data } = await axios.get<DomainEnrichmentResponse>(
      `${DOMAIN_API_BASE}/v1/properties/enrichment`,
      {
        params: {
          address,
          latitude: lat,
          longitude: lon,
        },
        headers: {
          'X-Api-Key': API_KEY,
        },
        timeout: 15000,
      },
    );

    const lotSize = data.propertyDetails?.area?.value ?? null;
    const rentalMidpoint = data.rentalEstimate?.midpoint ?? null;

    // Determine confidence based on data completeness
    let confidence: 'high' | 'medium' | 'low' | null = null;
    if (lotSize && rentalMidpoint) {
      confidence = 'high';
    } else if (lotSize || rentalMidpoint) {
      confidence = 'medium';
    }

    return {
      lotSize,
      rentalEstimateWeekly: rentalMidpoint,
      confidence,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn('[domainApi] Request failed:', error.response?.status, error.message);
    } else {
      console.warn('[domainApi] Unexpected error:', error);
    }
    return null;
  }
}
