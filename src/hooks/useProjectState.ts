'use client';

import { useEffect, useState } from 'react';
import type { ParcelFeature } from '@/lib/vicPlanApi';
import type { AIInsightData } from '@/app/app/page';

const STORAGE_KEY = 'vpp-scout-project-state';

export type ProjectState = {
  selectedParcels: ParcelFeature[];
  aiInsight: AIInsightData | null;
  timestamp: number;
};

/**
 * Custom hook for localStorage-backed session persistence.
 * Syncs multi-parcel selection and AI insight data to browser storage
 * so users don't lose feasibility work on page refresh.
 *
 * React 19 + Next.js App Router pattern: initial load happens in useEffect
 * to avoid hydration mismatches between server and client.
 */
export function useProjectState() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedState, setSavedState] = useState<ProjectState | null>(null);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectState;
        console.log('[useProjectState] Restored state from localStorage:', {
          parcelCount: parsed.selectedParcels?.length ?? 0,
          hasAIInsight: !!parsed.aiInsight,
          timestamp: new Date(parsed.timestamp).toISOString(),
        });
        setSavedState(parsed);
      }
    } catch (err) {
      console.warn('[useProjectState] Failed to load from localStorage', err);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveState = (parcels: ParcelFeature[], insight: AIInsightData | null) => {
    if (typeof window === 'undefined') return;

    const state: ProjectState = {
      selectedParcels: parcels,
      aiInsight: insight,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSavedState(state);
      console.log('[useProjectState] Saved to localStorage:', {
        parcelCount: parcels.length,
        hasAIInsight: !!insight,
      });
    } catch (err) {
      console.error('[useProjectState] Failed to save to localStorage', err);
    }
  };

  const clearState = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(STORAGE_KEY);
    setSavedState(null);
    console.log('[useProjectState] Cleared localStorage');
  };

  return {
    isLoaded,
    savedState,
    saveState,
    clearState,
  };
}
