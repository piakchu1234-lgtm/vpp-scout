/**
 * Easement Map Layer Component
 *
 * Renders Vicmap easements as dashed lines on the map.
 * Color-coded by type: Red (utility/sewer), Blue (drainage), Orange (right of way)
 * Interactive hover tooltips show easement type.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Source, Layer, Popup, useMap } from 'react-map-gl/mapbox';
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
  const { current: map } = useMap();
  const [easements, setEasements] = useState<EasementData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredEasement, setHoveredEasement] = useState<{
    type: string;
    lng: number;
    lat: number;
  } | null>(null);

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

  // Set up hover interaction
  useEffect(() => {
    if (!map || !visible || easements.length === 0) return;

    const handleMouseMove = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['easement-fill', 'easement-line'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const easementType = feature.properties?.type || 'Unknown Easement';

        // Get coordinates from geometry centroid
        let coordinates: [number, number];
        if (feature.geometry.type === 'Polygon') {
          // Use first coordinate of polygon
          coordinates = feature.geometry.coordinates[0][0] as [number, number];
        } else if (feature.geometry.type === 'Point') {
          coordinates = feature.geometry.coordinates as [number, number];
        } else {
          coordinates = [e.lngLat.lng, e.lngLat.lat];
        }

        setHoveredEasement({
          type: easementType,
          lng: coordinates[0],
          lat: coordinates[1],
        });

        // Change cursor
        map.getCanvas().style.cursor = 'pointer';
      } else {
        setHoveredEasement(null);
        map.getCanvas().style.cursor = '';
      }
    };

    const handleMouseLeave = () => {
      setHoveredEasement(null);
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', 'easement-fill', handleMouseLeave);
    map.on('mouseleave', 'easement-line', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', 'easement-fill', handleMouseLeave);
      map.off('mouseleave', 'easement-line', handleMouseLeave);
    };
  }, [map, visible, easements]);

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
    <>
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
      </Source>

      {/* Hover Tooltip */}
      {hoveredEasement && (
        <Popup
          longitude={hoveredEasement.lng}
          latitude={hoveredEasement.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={10}
          className="easement-tooltip"
        >
          <div className="bg-zinc-900/95 backdrop-blur-md border border-blue-500 rounded-lg px-3 py-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5"
                style={{
                  backgroundColor: getEasementColor(hoveredEasement.type),
                  borderTop: `2px dashed ${getEasementColor(hoveredEasement.type)}`,
                }}
              />
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                {hoveredEasement.type}
              </span>
            </div>
          </div>
        </Popup>
      )}
    </>
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
