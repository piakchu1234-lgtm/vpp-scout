/**
 * PROPERTY DATA HOOK
 *
 * React hook for fetching property intelligence from the orchestrator API.
 * Supports both traditional fetch and progressive SSE streaming.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, progress, error } = usePropertyData(pfi, lng, lat);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

export type ProgressStage = 'idle' | 'spatial' | 'market' | 'planning' | 'complete';

export interface PropertyDataProgress {
  stage: ProgressStage;
  progress: number; // 0-100
  message: string;
}

export interface PropertyData {
  id: string;
  pfi: string;
  spi: string | null;
  address: string;
  suburb: string;
  postcode: string;
  lga: string | null;
  longitude: number;
  latitude: number;
  geometry: any;
  landSize: number;
  lotPlan: string | null;
  zoning: string[];
  overlays: string[];
  lastSoldPrice: number | null;
  lastSoldDate: Date | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  yearBuilt: number | null;
  wallMaterial: string | null;
  roofMaterial: string | null;
  fastTrackEligible: boolean;
  vppTier: string | null;
  highestBestUse: string | null;
  riskFactors: string[];
  estimatedYield: number | null;
  complianceScorecard: any;
  lastScrapedAt: Date;
  scrapedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsePropertyDataReturn {
  data: Partial<PropertyData> | null;
  isLoading: boolean;
  progress: PropertyDataProgress;
  error: string | null;
  cached: boolean;
  refetch: () => void;
}

export function usePropertyData(
  pfi: string | null,
  longitude: number | null,
  latitude: number | null,
  enabled: boolean = true,
  useStreaming: boolean = true
): UsePropertyDataReturn {
  const [data, setData] = useState<Partial<PropertyData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState<PropertyDataProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });

  const fetchProperty = useCallback(async () => {
    if (!enabled || longitude === null || latitude === null) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);
    setProgress({ stage: 'idle', progress: 0, message: 'Initializing...' });

    try {
      const propertyId = pfi || 'search';
      const url = `/api/property/${propertyId}?lng=${longitude}&lat=${latitude}${useStreaming ? '&stream=true' : ''}`;

      if (useStreaming) {
        const eventSource = new EventSource(url);

        eventSource.addEventListener('spatial', (e) => {
          const payload = JSON.parse(e.data);
          setProgress({
            stage: 'spatial',
            progress: payload.progress || 33,
            message: 'Loaded parcel geometry',
          });
          setData((prev) => ({ ...prev, ...payload.data }));
        });

        eventSource.addEventListener('market', (e) => {
          const payload = JSON.parse(e.data);
          setProgress({
            stage: 'market',
            progress: payload.progress || 66,
            message: 'Loaded market data',
          });
          setData((prev) => ({ ...prev, ...payload.data }));
        });

        eventSource.addEventListener('complete', (e) => {
          const payload = JSON.parse(e.data);
          setProgress({
            stage: 'complete',
            progress: 100,
            message: 'Analysis complete',
          });
          setData((prev) => ({ ...prev, ...payload.data }));
          setIsLoading(false);
          eventSource.close();
        });

        eventSource.addEventListener('error', () => {
          setError('Failed to fetch property data');
          setIsLoading(false);
          eventSource.close();
        });

        eventSource.onerror = () => {
          setError('Connection to server lost');
          setIsLoading(false);
          eventSource.close();
        };
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        setData(result.data);
        setCached(result.cached);
        setProgress({ stage: 'complete', progress: 100, message: 'Complete' });
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[usePropertyData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch property data');
      setData(null);
      setIsLoading(false);
    }
  }, [pfi, longitude, latitude, enabled, useStreaming]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  return {
    data,
    isLoading,
    progress,
    error,
    cached,
    refetch: fetchProperty,
  };
}
