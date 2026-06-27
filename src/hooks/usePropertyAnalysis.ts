/**
 * usePropertyAnalysis Hook
 *
 * React hook for fetching property analysis from the unified spatial API.
 * Handles coordinate-based and ID-based lookups with automatic error handling.
 *
 * Usage:
 *   const { data, loading, error, analyze } = usePropertyAnalysis();
 *
 *   // On map click
 *   await analyze({ lat: -37.8136, lng: 144.9631 });
 *
 *   // Direct property lookup
 *   await analyze({ propId: 'clx123abc456' });
 */

import { useState, useCallback } from 'react';

export interface PropertyDimensions {
  lotSizeSqm: number;
  frontageMeters: number | null;
  orientationAspect: string | null;
}

export interface PropertySpecifications {
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  yearBuilt: number | null;
  wallMaterial: string | null;
  roofMaterial: string | null;
}

export interface PropertyMarket {
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
}

export interface PropertyStatutory {
  zoneCode: string;
  overlays: string[];
  hasHeritage: boolean;
  hasBushfire: boolean;
  hasFlood: boolean;
}

export interface PropertyFeasibility {
  ssdEligible: boolean;
  fastTrackEligible: boolean;
  vppTier: string | null;
  highestBestUse: string | null;
  riskFactors: string[];
  complianceScorecard: any | null;
}

export interface PropertyAnalysisData {
  id: string;
  pfi: string;
  address: string;
  lga: string | null;
  center: {
    lng: number;
    lat: number;
  };
  dimensions: PropertyDimensions;
  specifications: PropertySpecifications;
  market: PropertyMarket;
  statutory: PropertyStatutory;
  feasibility: PropertyFeasibility;
}

export interface PropertyAnalysisResponse {
  success: boolean;
  data: PropertyAnalysisData;
}

export interface PropertyAnalysisError {
  error: string;
  details?: string;
  code?: string;
}

export interface UsePropertyAnalysisOptions {
  onSuccess?: (data: PropertyAnalysisData) => void;
  onError?: (error: PropertyAnalysisError) => void;
}

export interface AnalyzeParams {
  lat?: number;
  lng?: number;
  propId?: string;
}

export function usePropertyAnalysis(options?: UsePropertyAnalysisOptions) {
  const [data, setData] = useState<PropertyAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PropertyAnalysisError | null>(null);

  const analyze = useCallback(
    async (params: AnalyzeParams) => {
      setLoading(true);
      setError(null);

      try {
        // Build query string
        const queryParams = new URLSearchParams();
        if (params.propId) {
          queryParams.set('propId', params.propId);
        } else if (params.lat !== undefined && params.lng !== undefined) {
          queryParams.set('lat', params.lat.toString());
          queryParams.set('lng', params.lng.toString());
        } else {
          throw new Error('Either propId or both lat and lng are required');
        }

        // Execute API request
        const response = await fetch(`/api/properties/analyze?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData: PropertyAnalysisError = await response.json();
          setError(errorData);
          options?.onError?.(errorData);
          return null;
        }

        const result: PropertyAnalysisResponse = await response.json();
        setData(result.data);
        options?.onSuccess?.(result.data);
        return result.data;
      } catch (err) {
        const errorObj: PropertyAnalysisError = {
          error: 'Network error',
          details: err instanceof Error ? err.message : 'Unknown error occurred',
        };
        setError(errorObj);
        options?.onError?.(errorObj);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    analyze,
    reset,
  };
}
