/**
 * Measurement Tooltip
 *
 * Floating tooltip that displays measurement results (distance/area)
 * for drawn geometries on the map.
 */

'use client';

import React from 'react';
import { Ruler, Maximize2 } from 'lucide-react';

interface MeasurementTooltipProps {
  measurement: {
    type: 'distance' | 'area';
    value: string;
    position: [number, number]; // [lng, lat]
  } | null;
}

export default function MeasurementTooltip({ measurement }: MeasurementTooltipProps) {
  if (!measurement) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="bg-zinc-900/95 backdrop-blur-md border border-[#E9E778] rounded-lg px-3 py-2 shadow-2xl">
        <div className="flex items-center gap-2 text-white">
          {measurement.type === 'distance' ? (
            <Ruler className="w-4 h-4 text-[#E9E778]" />
          ) : (
            <Maximize2 className="w-4 h-4 text-[#E9E778]" />
          )}
          <span className="text-sm font-semibold">{measurement.value}</span>
        </div>
      </div>
    </div>
  );
}
