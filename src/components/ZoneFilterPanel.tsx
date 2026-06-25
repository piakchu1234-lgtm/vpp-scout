/**
 * ZONE FILTER PANEL
 *
 * Professional zoning interface that allows users to dynamically filter
 * which zone types are visible on the map. Uses Mapbox setFilter for
 * instant visual updates without reloading data.
 *
 * Integrates with MapPreview's activeZoneFilter prop.
 */

'use client';

import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

// Victorian Planning Scheme Zone Categories
// Updated to match Mapbox layer configuration with 3-character prefixes
// Includes legacy VPP codes (R1Z, R2Z, R3Z, B1Z, etc.) and all schedule variants
export type ZoneCategory = {
  label: string;
  codes: string[];
  color: string;
  description: string;
};

export const ZONE_CATEGORIES: ZoneCategory[] = [
  {
    label: 'Residential',
    codes: ['GRZ', 'R1Z', 'R2Z', 'R3Z', 'NRZ', 'RGZ', 'LDR', 'RLZ'],
    color: '#ffccd5', // Pink - matches GRZ in layer
    description: 'General, Neighbourhood, Growth, Low Density, Rural Living zones',
  },
  {
    label: 'Commercial & Business',
    codes: ['C1Z', 'C2Z', 'C3Z', 'B1Z', 'B2Z', 'B3Z', 'B4Z', 'B5Z', 'CCZ', 'ACZ'],
    color: '#b3e5fc', // Light blue - matches C1Z in layer
    description: 'Commercial, Business, Capital City, Activity Centre zones',
  },
  {
    label: 'Industrial',
    codes: ['IN1', 'IN2', 'IN3'],
    color: '#e0e0e0', // Grey - matches IN1 in layer
    description: 'Industrial 1, 2, 3 zones',
  },
  {
    label: 'Mixed Use & Urban',
    codes: ['MUZ', 'UGZ', 'CDZ', 'PDZ', 'HCT', 'DZ', 'DZ1', 'DZ2', 'DZ3', 'DZ4', 'DZ5', 'DZ6', 'DZ7'],
    color: '#ffe0b2', // Orange - matches MUZ in layer
    description: 'Mixed use, urban growth, comprehensive development, housing choice, docklands zones',
  },
  {
    label: 'Rural & Farming',
    codes: ['FZ', 'FZ1', 'FZ2', 'FZ3', 'FZ4', 'FZ5', 'FZ6', 'RAZ', 'RCZ'],
    color: '#e8f5e9', // Light green - matches FZ in layer
    description: 'Farming, rural activity, rural conservation zones',
  },
  {
    label: 'Special Use & Public',
    codes: ['SUZ', 'PUZ', 'PPR', 'PCR', 'TRZ', 'TZ', 'TZ1', 'TZ2', 'TZ3', 'TZ4', 'TZ5', 'GWZ', 'GWA', 'UFZ', 'PZ', 'PZ1', 'PZ2', 'PZ3', 'PZ4', 'PZ5'],
    color: '#fff59d', // Yellow - matches SUZ in layer
    description: 'Special use, public land, transport, township, green wedge, urban floodway, port zones',
  },
];

type Props = {
  activeZones: string[];
  onZonesChange: (zones: string[]) => void;
  className?: string;
};

export default function ZoneFilterPanel({ activeZones, onZonesChange, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if a category is fully selected
  const isCategoryActive = (category: ZoneCategory) => {
    return category.codes.every(code => activeZones.includes(code));
  };

  // Check if a category is partially selected
  const isCategoryPartial = (category: ZoneCategory) => {
    const activeCount = category.codes.filter(code => activeZones.includes(code)).length;
    return activeCount > 0 && activeCount < category.codes.length;
  };

  // Toggle entire category
  const toggleCategory = (category: ZoneCategory) => {
    const isActive = isCategoryActive(category);

    if (isActive) {
      // Remove all codes from this category
      onZonesChange(activeZones.filter(code => !category.codes.includes(code)));
    } else {
      // Add all codes from this category
      const newZones = [...new Set([...activeZones, ...category.codes])];
      onZonesChange(newZones);
    }
  };

  // Select all zones
  const selectAll = () => {
    const allCodes = ZONE_CATEGORIES.flatMap(cat => cat.codes);
    onZonesChange([...new Set(allCodes)]);
  };

  // Clear all zones
  const clearAll = () => {
    onZonesChange([]);
  };

  const activeCount = activeZones.length;
  const totalCount = ZONE_CATEGORIES.reduce((sum, cat) => sum + cat.codes.length, 0);

  return (
    <div className={`rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Zone Filter
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {activeCount} / {totalCount}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          {/* Quick Actions */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={selectAll}
              className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Clear All
            </button>
          </div>

          {/* Category Toggles */}
          <div className="space-y-2">
            {ZONE_CATEGORIES.map((category) => {
              const isActive = isCategoryActive(category);
              const isPartial = isCategoryPartial(category);

              return (
                <button
                  key={category.label}
                  onClick={() => toggleCategory(category)}
                  className="group flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white p-2 text-left transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="flex items-center gap-2">
                    {/* Color indicator */}
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: category.color }}
                    />

                    {/* Category info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {category.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {category.codes.join(', ')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox indicator */}
                  <div className="flex items-center gap-1">
                    {isActive && (
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-[#E9E778]">
                        <svg
                          className="h-3 w-3 text-zinc-900"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                    {isPartial && (
                      <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-zinc-300 dark:border-zinc-600">
                        <div className="h-2 w-2 rounded-sm bg-zinc-400" />
                      </div>
                    )}
                    {!isActive && !isPartial && (
                      <div className="h-5 w-5 rounded border-2 border-zinc-300 dark:border-zinc-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Filter Summary */}
          {activeCount > 0 && activeCount < totalCount && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <strong>{activeCount}</strong> of <strong>{totalCount}</strong> zone types visible
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
