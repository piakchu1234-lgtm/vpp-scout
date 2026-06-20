/**
 * Boundary Dimension Labels Component
 *
 * Renders boundary measurements as text labels on the map
 * using Mapbox GL JS layers.
 */

import { useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { BoundarySegment } from '@/lib/map/measurementUtils';

export interface BoundaryLabelsProps {
  map: MapboxMap | null;
  segments: BoundarySegment[];
  visible: boolean;
}

const BOUNDARY_LABELS_SOURCE = 'boundary-labels';
const BOUNDARY_LABELS_LAYER = 'boundary-labels-layer';
const BOUNDARY_LINES_LAYER = 'boundary-lines-layer';

export function useBoundaryLabels({ map, segments, visible }: BoundaryLabelsProps) {
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Create GeoJSON for labels (points at midpoints)
    const labelFeatures = segments.map((seg, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: seg.midpoint,
      },
      properties: {
        label: seg.label,
        bearing: seg.bearing,
        length: seg.length,
        index,
      },
    }));

    // Create GeoJSON for dimension lines (emphasize boundaries)
    const lineFeatures = segments.map((seg, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [seg.start, seg.end],
      },
      properties: {
        length: seg.length,
        bearing: seg.bearing,
        index,
      },
    }));

    const geojson = {
      type: 'FeatureCollection' as const,
      features: labelFeatures,
    };

    const lineGeojson = {
      type: 'FeatureCollection' as const,
      features: lineFeatures,
    };

    // Add or update source
    if (map.getSource(BOUNDARY_LABELS_SOURCE)) {
      const source = map.getSource(BOUNDARY_LABELS_SOURCE) as mapboxgl.GeoJSONSource;
      source.setData(geojson);
    } else {
      map.addSource(BOUNDARY_LABELS_SOURCE, {
        type: 'geojson',
        data: geojson,
      });
    }

    // Add or update line source
    const lineSourceId = `${BOUNDARY_LABELS_SOURCE}-lines`;
    if (map.getSource(lineSourceId)) {
      const source = map.getSource(lineSourceId) as mapboxgl.GeoJSONSource;
      source.setData(lineGeojson);
    } else {
      map.addSource(lineSourceId, {
        type: 'geojson',
        data: lineGeojson,
      });
    }

    // Add dimension lines layer (if not exists)
    if (!map.getLayer(BOUNDARY_LINES_LAYER)) {
      map.addLayer({
        id: BOUNDARY_LINES_LAYER,
        type: 'line',
        source: lineSourceId,
        paint: {
          'line-color': '#E9E778',
          'line-width': 3,
          'line-opacity': 0.8,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }

    // Add labels layer (if not exists)
    if (!map.getLayer(BOUNDARY_LABELS_LAYER)) {
      map.addLayer({
        id: BOUNDARY_LABELS_LAYER,
        type: 'symbol',
        source: BOUNDARY_LABELS_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 14,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        },
      });
    }

    // Update visibility
    map.setLayoutProperty(
      BOUNDARY_LABELS_LAYER,
      'visibility',
      visible ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      BOUNDARY_LINES_LAYER,
      'visibility',
      visible ? 'visible' : 'none'
    );

    return () => {
      // Cleanup on unmount
      if (map.getLayer(BOUNDARY_LABELS_LAYER)) {
        map.removeLayer(BOUNDARY_LABELS_LAYER);
      }
      if (map.getLayer(BOUNDARY_LINES_LAYER)) {
        map.removeLayer(BOUNDARY_LINES_LAYER);
      }
      if (map.getSource(BOUNDARY_LABELS_SOURCE)) {
        map.removeSource(BOUNDARY_LABELS_SOURCE);
      }
      if (map.getSource(`${BOUNDARY_LABELS_SOURCE}-lines`)) {
        map.removeSource(`${BOUNDARY_LABELS_SOURCE}-lines`);
      }
    };
  }, [map, segments, visible]);
}
