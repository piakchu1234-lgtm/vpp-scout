/**
 * Property Side Panel - Streamlined Statutory Data Panel
 *
 * Left-anchored scrollable panel for address, search, and dense statutory data.
 * Charts moved to bottom dock for better visual hierarchy.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileDown, Loader2, Search, Save } from 'lucide-react';
import type { VicPlanData } from '@/lib/vicPlanApi';
import * as turf from '@turf/turf';

type PropertySidePanelProps = {
  address: string | null;
  language: 'en' | 'zh';
  zoneCode: string | null;
  zoneDescription: string | null;
  planData: VicPlanData | null;
  onExportPDF: () => void;
  isGeneratingPDF: boolean;
  onSaveProject?: () => void;
  isSavingProject?: boolean;
  onSearch?: (query: string) => void;
  onTestAgent?: () => void;
  isTestingAgent?: boolean;
  showEasements?: boolean;
  onToggleEasements?: (show: boolean) => void;
  showDAs?: boolean;
  onToggleDAs?: (show: boolean) => void;
  show3DMassing?: boolean;
  onToggle3DMassing?: (show: boolean) => void;
  showBoundaryLabels?: boolean;
  onToggleBoundaryLabels?: (show: boolean) => void;
  showContours?: boolean;
  onToggleContours?: (show: boolean) => void;
  daData?: any[]; // Array of fetched DAs
  propertyLat?: number;
  propertyLng?: number;
};

export default function PropertySidePanel({
  address,
  language,
  zoneCode,
  zoneDescription,
  planData,
  onExportPDF,
  isGeneratingPDF,
  onSaveProject,
  isSavingProject = false,
  onSearch,
  onTestAgent,
  isTestingAgent = false,
  showEasements = false,
  onToggleEasements,
  showDAs = false,
  onToggleDAs,
  show3DMassing = false,
  onToggle3DMassing,
  showBoundaryLabels = false,
  onToggleBoundaryLabels,
  showContours = false,
  onToggleContours,
  daData = [],
  propertyLat,
  propertyLng,
}: PropertySidePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [overlaysExpanded, setOverlaysExpanded] = useState(true);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  // Calculate DA statistics
  const daStats = React.useMemo(() => {
    if (!daData || daData.length === 0) {
      return null;
    }

    // Status breakdown
    const approved = daData.filter((da) => da.status === 'approved').length;
    const pending = daData.filter((da) => da.status === 'pending').length;
    const refused = daData.filter((da) => da.status === 'refused').length;

    // Proximity breakdown (if property coordinates available)
    let within500m = 0;
    let between500and1km = 0;

    if (propertyLat && propertyLng) {
      const propertyPoint = turf.point([propertyLng, propertyLat]);

      daData.forEach((da) => {
        if (da.lat && da.lng) {
          const daPoint = turf.point([da.lng, da.lat]);
          const distanceKm = turf.distance(propertyPoint, daPoint, { units: 'kilometers' });
          const distanceM = distanceKm * 1000;

          if (distanceM <= 500) {
            within500m++;
          } else if (distanceM <= 1000) {
            between500and1km++;
          }
        }
      });
    }

    return {
      total: daData.length,
      approved,
      pending,
      refused,
      within500m,
      between500and1km,
    };
  }, [daData, propertyLat, propertyLng]);

  return (
    <div className="fixed left-20 top-0 h-screen w-[380px] bg-[#0A0A0A] border-r border-zinc-800 overflow-y-auto z-40">
      {/* Header Section */}
      <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-zinc-800 p-6 z-10 space-y-4">
        {/* Address */}
        <div>
          <h1 className="text-lg font-bold text-white mb-2 line-clamp-2">
            {address || 'No address selected'}
          </h1>
          {zoneCode && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 bg-[#E9E778]/20 text-[#E9E778] text-xs font-mono font-bold rounded">
                {zoneCode}
              </span>
              {zoneDescription && (
                <span className="text-xs text-zinc-400 line-clamp-1">{zoneDescription}</span>
              )}
            </div>
          )}
        </div>

        {/* Search Property Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Search Property
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Enter address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 bg-[#241F21] border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E9E778] focus:border-transparent"
            />
          </div>
        </div>

        {/* Test Agent Button (Dev Mode) */}
        {onTestAgent && (
          <button
            onClick={onTestAgent}
            disabled={isTestingAgent}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:cursor-not-allowed text-zinc-300 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isTestingAgent ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing Agent...
              </>
            ) : (
              '🤖 TEST AGENT'
            )}
          </button>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Save Project Button */}
          {onSaveProject && (
            <button
              onClick={onSaveProject}
              disabled={isSavingProject || !address}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSavingProject ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          )}

          {/* Export PDF Button */}
          <button
            onClick={onExportPDF}
            disabled={isGeneratingPDF || !address}
            className={`${onSaveProject ? '' : 'col-span-2'} px-4 py-2.5 bg-[#E9E778] hover:bg-[#E9E778]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-[#05060E] font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2`}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statutory Data Section */}
      <div className="p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
          Statutory Planning Data
        </h2>

        {/* Planning Overlays Accordion */}
        <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setOverlaysExpanded(!overlaysExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Planning Overlays</span>
              {planData?.overlayRaw && planData.overlayRaw.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
                  {planData.overlayRaw.length}
                </span>
              )}
            </div>
            {overlaysExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          {overlaysExpanded && (
            <div className="px-4 pb-4">
              {planData?.overlayRaw && planData.overlayRaw.length > 0 ? (
                <div className="space-y-2">
                  {planData.overlayRaw.map((overlay, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded text-xs text-zinc-300"
                    >
                      <span className="font-mono font-bold text-[#E9E778]">{overlay}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-zinc-500">
                  No planning overlays detected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Layers Section */}
        <div className="bg-[#05060E]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-white">Map Layers</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Easements Toggle */}
            {onToggleEasements && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-500 rounded" style={{ borderTop: '2px dashed' }}></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Easements
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showEasements}
                  onChange={(e) => onToggleEasements(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Development Applications Toggle */}
            {onToggleDAs && (
              <>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                      Local DAs (1km)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDAs}
                    onChange={(e) => onToggleDAs(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                  />
                </label>

                {/* DA Statistics Panel */}
                {showDAs && daStats && (
                  <div className="ml-6 mt-2 p-3 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg">
                    {/* Status Breakdown */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-400">Total:</span>
                      <span className="font-semibold text-white">{daStats.total}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-zinc-400">{daStats.approved}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-zinc-400">{daStats.pending}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-zinc-400">{daStats.refused}</span>
                      </div>
                    </div>

                    {/* Proximity Breakdown */}
                    {propertyLat && propertyLng && (
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Within 500m:</span>
                          <span className="font-semibold text-blue-400">{daStats.within500m}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-400">500m–1km:</span>
                          <span className="font-semibold text-zinc-300">{daStats.between500and1km}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 3D Massing Toggle */}
            {onToggle3DMassing && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-blue-500/30 border border-blue-500 rounded-sm"></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    3D Building Envelope
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={show3DMassing}
                  onChange={(e) => onToggle3DMassing(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Boundary Dimensions Toggle */}
            {onToggleBoundaryLabels && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#E9E778] rounded"></div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Boundary Dimensions
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showBoundaryLabels}
                  onChange={(e) => onToggleBoundaryLabels(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}

            {/* Topography Contours Toggle */}
            {onToggleContours && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#E9E778]" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4 Q8 2 14 4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 8 Q8 6 14 8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 12 Q8 10 14 12" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Topography Contours
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => onToggleContours(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#E9E778] focus:ring-2 focus:ring-[#E9E778] focus:ring-offset-0"
                />
              </label>
            )}
          </div>
        </div>

        {/* Additional Statutory Data (Future: Constraints, etc.) */}
        <div className="text-xs text-zinc-500 italic">
          Additional statutory data sections will appear here.
        </div>
      </div>
    </div>
  );
}
