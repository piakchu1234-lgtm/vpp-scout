/**
 * Topography Contours Layer
 *
 * Adds Mapbox terrain and contour lines to visualize site topography.
 * Provides elevation data for slope analysis and drainage planning.
 */

import { useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';

export interface TopographyLayerProps {
  map: MapboxMap | null;
  visible: boolean;
}

const CONTOURS_SOURCE = 'mapbox-terrain';
const CONTOURS_LAYER = 'contour-lines';
const CONTOURS_LABELS_LAYER = 'contour-labels';
const HILLSHADE_LAYER = 'hillshade';

export function useTopographyLayer({ map, visible }: TopographyLayerProps) {
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Add Mapbox Terrain v2 source (if not exists)
    if (!map.getSource(CONTOURS_SOURCE)) {
      map.addSource(CONTOURS_SOURCE, {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      });
    }

    // Add hillshade layer for 3D terrain visualization (if not exists)
    if (!map.getLayer(HILLSHADE_LAYER)) {
      map.addLayer({
        id: HILLSHADE_LAYER,
        type: 'hillshade',
        source: CONTOURS_SOURCE,
        'source-layer': 'hillshade',
        paint: {
          'hillshade-exaggeration': 0.3,
          'hillshade-shadow-color': '#000000',
          'hillshade-accent-color': '#E9E778',
          'hillshade-highlight-color': '#FFFFFF',
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
        },
      });
    }

    // Add contour lines layer (if not exists)
    if (!map.getLayer(CONTOURS_LAYER)) {
      map.addLayer({
        id: CONTOURS_LAYER,
        type: 'line',
        source: CONTOURS_SOURCE,
        'source-layer': 'contour',
        paint: {
          'line-color': '#E9E778',
          'line-width': [
            'case',
            ['==', ['%', ['get', 'ele'], 10], 0], // Every 10m
            2,
            1, // Every 5m
          ],
          'line-opacity': 0.6,
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }

    // Add contour elevation labels (if not exists)
    if (!map.getLayer(CONTOURS_LABELS_LAYER)) {
      map.addLayer({
        id: CONTOURS_LABELS_LAYER,
        type: 'symbol',
        source: CONTOURS_SOURCE,
        'source-layer': 'contour',
        filter: ['==', ['%', ['get', 'ele'], 10], 0], // Label every 10m
        layout: {
          'text-field': [
            'concat',
            ['to-string', ['get', 'ele']],
            'm',
          ],
          'text-size': 10,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'symbol-placement': 'line',
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          visibility: visible ? 'visible' : 'none',
        },
        paint: {
          'text-color': '#E9E778',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
          'text-halo-blur': 0.5,
        },
      });
    }

    // Update visibility based on prop
    if (map.getLayer(HILLSHADE_LAYER)) {
      map.setLayoutProperty(
        HILLSHADE_LAYER,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    if (map.getLayer(CONTOURS_LAYER)) {
      map.setLayoutProperty(
        CONTOURS_LAYER,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    if (map.getLayer(CONTOURS_LABELS_LAYER)) {
      map.setLayoutProperty(
        CONTOURS_LABELS_LAYER,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    // Cleanup on unmount
    return () => {
      if (map.getLayer(CONTOURS_LABELS_LAYER)) {
        map.removeLayer(CONTOURS_LABELS_LAYER);
      }
      if (map.getLayer(CONTOURS_LAYER)) {
        map.removeLayer(CONTOURS_LAYER);
      }
      if (map.getLayer(HILLSHADE_LAYER)) {
        map.removeLayer(HILLSHADE_LAYER);
      }
      // Keep source as it might be used by other layers
    };
  }, [map, visible]);
}

/**
 * Query elevation at a specific point
 */
export function queryElevation(
  map: MapboxMap,
  longitude: number,
  latitude: number
): number | null {
  if (!map.isStyleLoaded()) return null;

  const features = map.querySourceFeatures(CONTOURS_SOURCE, {
    sourceLayer: 'contour',
  });

  if (!features || features.length === 0) return null;

  // Find closest contour line
  const point = [longitude, latitude];
  let closestElevation = null;
  let minDistance = Infinity;

  for (const feature of features) {
    if (feature.properties && typeof feature.properties.ele === 'number') {
      // Simple distance approximation (in reality, would calculate to line)
      const distance = Math.abs(
        (feature.geometry as any).coordinates[0][0] - longitude
      ) + Math.abs(
        (feature.geometry as any).coordinates[0][1] - latitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestElevation = feature.properties.ele;
      }
    }
  }

  return closestElevation;
}

/**
 * Calculate average slope across a polygon
 */
export function calculateAverageSlope(
  map: MapboxMap,
  polygon: [number, number][]
): number | null {
  const elevations: number[] = [];

  for (const [lng, lat] of polygon) {
    const elevation = queryElevation(map, lng, lat);
    if (elevation !== null) {
      elevations.push(elevation);
    }
  }

  if (elevations.length < 2) return null;

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationChange = maxElevation - minElevation;

  // Calculate approximate horizontal distance (simplified)
  const avgDistance = 50; // meters (rough approximation)

  // Slope as percentage: (rise / run) * 100
  const slope = (elevationChange / avgDistance) * 100;

  return slope;
}
