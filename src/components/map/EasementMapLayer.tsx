/**
 * Easement Map Layer Component
 *
 * Renders Vicmap easements as dashed lines on the map.
 * Color-coded by type: Red (utility/sewer), Blue (drainage)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import { fetchEasementsForPoint, type EasementData } from '@/lib/easementApi';

interface EasementMapLayerProps {
  /** Property coordinates */
  lat: number;
  lng: number;

  /** Whether to show easement layer */
  visible: boolean;

  /** Callback when easements are loaded */
  onEasementsLoaded?: (easements: EasementData[]) => void;
}

export default function EasementMapLayer({
  lat,
  lng,
  visible,
  onEasementsLoaded,
}: EasementMapLayerProps) {
  const [easements, setEasements] = useState<EasementData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchEasements = async () => {
      setIsLoading(true);

      try {
        const data = await fetchEasementsForPoint(lat, lng);
        setEasements(data);
        onEasementsLoaded?.(data);
        console.log(`[EasementMapLayer] Loaded ${data.length} easements`);
      } catch (error) {
        console.error('[EasementMapLayer] Fetch error:', error);
        setEasements([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEasements();
  }, [lat, lng, visible, onEasementsLoaded]);

  if (!visible || easements.length === 0) {
    return null;
  }

  // Convert easements to GeoJSON
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: easements.map((easement, index) => ({
      type: 'Feature',
      geometry: easement.polygon,
      properties: {
        id: `easement-${index}`,
        type: easement.type,
        // Color based on type
        color: getEasementColor(easement.type),
      },
    })),
  };

  return (
    <Source id="easements" type="geojson" data={geojson}>
      {/* Easement fill (semi-transparent) */}
      <Layer
        id="easement-fill"
        type="fill"
        paint={{
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.1,
        }}
      />

      {/* Easement outline (dashed lines) */}
      <Layer
        id="easement-line"
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-dasharray': [4, 4],
        }}
      />

      {/* Hover effect */}
      <Layer
        id="easement-line-hover"
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-dasharray': [4, 4],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0,
          ],
        }}
      />
    </Source>
  );
}

/**
 * Get color for easement type
 */
function getEasementColor(type: string): string {
  const typeUpper = type.toUpperCase();

  // Drainage: Blue
  if (typeUpper.includes('DRAIN') || typeUpper.includes('WATER')) {
    return '#3B82F6';
  }

  // Sewer/Utility: Red
  if (
    typeUpper.includes('SEWER') ||
    typeUpper.includes('UTILITY') ||
    typeUpper.includes('GAS') ||
    typeUpper.includes('ELECTRIC')
  ) {
    return '#EF4444';
  }

  // Right of way: Orange
  if (typeUpper.includes('WAY') || typeUpper.includes('ACCESS')) {
    return '#F97316';
  }

  // Default: Gray
  return '#6B7280';
}
