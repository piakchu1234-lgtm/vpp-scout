/**
 * DA Map Layer Component
 *
 * Renders Development Applications as clustered points on the map.
 * Color-coded by status: Green (approved), Amber (pending), Red (refused)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { DevelopmentApplication, DASearchResponse } from '@/types/developmentApplication';
import { getDAStatusColor } from '@/lib/da/daUtils';

interface DAMapLayerProps {
  /** Center point coordinates */
  lat: number;
  lng: number;

  /** Search radius in meters (default: 1000m = 1km) */
  radius?: number;

  /** Whether to show DA layer */
  visible: boolean;

  /** Callback when DA is clicked */
  onDAClick?: (da: DevelopmentApplication) => void;
}

export default function DAMapLayer({
  lat,
  lng,
  radius = 1000,
  visible,
  onDAClick,
}: DAMapLayerProps) {
  const [daData, setDaData] = useState<DevelopmentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchDAs = async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: radius.toString(),
        });

        const response = await fetch(`/api/development-applications?${params}`);
        const result: DASearchResponse = await response.json();

        if (result.success && result.applications) {
          setDaData(result.applications);
          console.log(`[DAMapLayer] Loaded ${result.applications.length} DAs`);
        } else {
          console.error('[DAMapLayer] Failed to load DAs:', result.error);
          setDaData([]);
        }
      } catch (error) {
        console.error('[DAMapLayer] Fetch error:', error);
        setDaData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDAs();
  }, [lat, lng, radius, visible]);

  if (!visible || daData.length === 0) {
    return null;
  }

  // Convert DAs to GeoJSON
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: daData.map((da) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [da.longitude, da.latitude],
      },
      properties: {
        id: da.id,
        daNumber: da.daNumber,
        address: da.address,
        status: da.status,
        description: da.description,
        lodgedDate: da.lodgedDate,
        decidedDate: da.decidedDate,
        councilName: da.councilName,
        distanceFromSubject: da.distanceFromSubject,
        color: getDAStatusColor(da.status),
      },
    })),
  };

  return (
    <Source id="development-applications" type="geojson" data={geojson} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
      {/* Cluster circles */}
      <Layer
        id="da-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#F59E0B', // Amber for small clusters
            10,
            '#EF4444', // Red for larger clusters
          ],
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 25],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />

      {/* Cluster count labels */}
      <Layer
        id="da-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        }}
        paint={{
          'text-color': '#ffffff',
        }}
      />

      {/* Unclustered points - color by status */}
      <Layer
        id="da-points"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': ['get', 'color'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        }}
      />

      {/* Hover effect */}
      <Layer
        id="da-points-hover"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': ['get', 'color'],
          'circle-radius': 10,
          'circle-opacity': 0,
          'circle-stroke-width': 3,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': [
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
