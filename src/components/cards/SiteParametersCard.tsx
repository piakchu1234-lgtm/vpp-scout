/**
 * Site Parameters Card
 *
 * Displays detailed site geometry, orientation, and boundary dimensions
 * for achieving Landchecker data parity.
 */

'use client';

import React from 'react';
import { Maximize2, Compass, Ruler, Square } from 'lucide-react';
import {
  calculateSiteOrientation,
  calculateBoundaryDimensions,
  calculatePerimeter,
  analyzeLotRegularity,
  calculateAspectRatio,
  type SiteOrientation,
  type BoundarySegment,
} from '@/lib/map/measurementUtils';
import type { Position } from 'geojson';

interface SiteParametersCardProps {
  polygon: Position[];
  lotArea: number; // m²
}

export default function SiteParametersCard({ polygon, lotArea }: SiteParametersCardProps) {
  // Calculate all site metrics
  const orientation = calculateSiteOrientation(polygon);
  const segments = calculateBoundaryDimensions(polygon);
  const perimeter = calculatePerimeter(polygon);
  const regularity = analyzeLotRegularity(polygon);
  const aspectRatio = calculateAspectRatio(polygon);

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Square className="w-5 h-5 text-[#E9E778]" />
        <h3 className="text-lg font-bold text-white">Site Parameters</h3>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-3">
        {/* Lot Area */}
        <MetricRow
          icon={<Maximize2 className="w-4 h-4" />}
          label="Lot Area"
          value={`${lotArea.toFixed(1)} m²`}
          subvalue={`${(lotArea / 10000).toFixed(4)} hectares`}
        />

        {/* Perimeter */}
        <MetricRow
          icon={<Ruler className="w-4 h-4" />}
          label="Perimeter"
          value={`${perimeter.toFixed(1)} m`}
        />

        {/* Orientation */}
        <MetricRow
          icon={<Compass className="w-4 h-4" />}
          label="Orientation"
          value={`${orientation.rearFacing}-facing rear`}
          subvalue={`Street frontage: ${orientation.primaryFacing}`}
        />

        {/* Lot Regularity */}
        <MetricRow
          label="Lot Shape"
          value={regularity.analysis}
          valueColor={
            regularity.isRegular
              ? 'text-green-500'
              : regularity.irregularityScore > 0.5
              ? 'text-amber-500'
              : 'text-zinc-300'
          }
        />

        {/* Aspect Ratio (if rectangular) */}
        {aspectRatio && (
          <MetricRow
            label="Aspect Ratio"
            value={`${aspectRatio.toFixed(2)}:1`}
            subvalue={aspectRatio > 2 ? 'Deep lot' : aspectRatio < 1.5 ? 'Wide lot' : 'Balanced'}
          />
        )}
      </div>

      {/* Boundary Dimensions */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-400 mb-2">Boundary Dimensions</h4>
        <div className="space-y-2">
          {segments.map((seg, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-zinc-500">
                {getBoundarySide(index, segments.length)}
              </span>
              <span className="font-mono text-white">{seg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Dimensions */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-zinc-800/50 rounded">
            <div className="text-xs text-zinc-500 mb-1">Frontage</div>
            <div className="text-sm font-bold text-[#E9E778]">
              {orientation.shortestSide.label}
            </div>
          </div>
          <div className="text-center p-2 bg-zinc-800/50 rounded">
            <div className="text-xs text-zinc-500 mb-1">Depth</div>
            <div className="text-sm font-bold text-[#E9E778]">
              {orientation.longestSide.label}
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
        <strong>Note:</strong> Dimensions calculated from cadastral boundaries.
        Professional survey recommended for construction planning.
      </div>
    </div>
  );
}

interface MetricRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  subvalue?: string;
  valueColor?: string;
}

function MetricRow({ icon, label, value, subvalue, valueColor = 'text-white' }: MetricRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon && <div className="text-zinc-500">{icon}</div>}
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${valueColor}`}>{value}</div>
        {subvalue && <div className="text-xs text-zinc-500 mt-0.5">{subvalue}</div>}
      </div>
    </div>
  );
}

function getBoundarySide(index: number, total: number): string {
  if (total === 4) {
    // Rectangular lot
    return ['Front', 'Right', 'Rear', 'Left'][index];
  }
  // Irregular lot
  return `Side ${index + 1}`;
}
