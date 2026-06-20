/**
 * 3D Massing Layer Component
 *
 * Renders generated building envelopes as 3D fill-extrusion layers.
 * Provides visual representation of maximum buildable area.
 */

'use client';

import React from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { MassingResult } from '@/lib/massingEngine';

interface MassingLayerProps {
  /** Generated massing result */
  massing: MassingResult | null;

  /** Whether to show the layer */
  visible: boolean;

  /** Layer opacity (0-1) */
  opacity?: number;

  /** Building color */
  color?: string;
}

export default function MassingLayer({
  massing,
  visible,
  opacity = 0.7,
  color = '#3B82F6', // Blue
}: MassingLayerProps) {
  if (!visible || !massing) {
    return null;
  }

  // Convert envelope to GeoJSON
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        ...massing.envelope,
        properties: {
          ...massing.envelope.properties,
          height: massing.height,
          floorArea: massing.floorArea,
          wasScaled: massing.wasScaled,
        },
      },
    ],
  };

  return (
    <Source id="building-massing" type="geojson" data={geojson}>
      {/* 3D Extrusion Layer */}
      <Layer
        id="massing-3d"
        type="fill-extrusion"
        paint={{
          'fill-extrusion-color': color,
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity,
        }}
      />

      {/* 2D Fill Layer (visible when 3D disabled) */}
      <Layer
        id="massing-2d-fill"
        type="fill"
        paint={{
          'fill-color': color,
          'fill-opacity': opacity * 0.3,
        }}
      />

      {/* Outline */}
      <Layer
        id="massing-outline"
        type="line"
        paint={{
          'line-color': color,
          'line-width': 2,
          'line-opacity': opacity,
        }}
      />
    </Source>
  );
}
