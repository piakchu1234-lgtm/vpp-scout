'use client';

import React from 'react';
import { Layers, Trash2, Satellite, Globe, Box } from 'lucide-react';
import type { ParcelFeature } from '@/lib/vicPlanApi';

type Lang = 'en' | 'zh';
type ViewMode = 'plan' | 'satellite' | 'hybrid';

type MapControlsToolbarProps = {
  selectedParcels: ParcelFeature[];
  onClearSelection: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  is3D: boolean;
  setIs3D: (is3D: boolean) => void;
  lang: Lang;
};

const LABELS = {
  clearSelection: { en: 'Clear', zh: '清除' },
  selectedCount: { en: 'Selected', zh: '已选' },
  darkPlan: { en: 'Dark Plan', zh: '平面图' },
  satellite: { en: 'Satellite', zh: '卫星图' },
  hybrid: { en: 'Hybrid', zh: '混合图' },
  view2D: { en: '2D View', zh: '2D 视图' },
  view3D: { en: '3D View', zh: '3D 视图' },
};

export default function MapControlsToolbar({
  selectedParcels,
  onClearSelection,
  viewMode,
  setViewMode,
  is3D,
  setIs3D,
  lang,
}: MapControlsToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
      {/* Multi-Parcel Selection Display */}
      {selectedParcels.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 backdrop-blur-md px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <Layers className="w-3.5 h-3.5 text-[#E9E778]" />
            <span>
              {selectedParcels.length} {LABELS.selectedCount[lang]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
            aria-label={LABELS.clearSelection[lang]}
          >
            <Trash2 className="w-3 h-3" />
            <span>{LABELS.clearSelection[lang]}</span>
          </button>
        </div>
      )}

      {/* View Mode Group + Camera Control */}
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/80 backdrop-blur-md p-1.5 shadow-xl">
        {/* View Mode Group */}
        <div className="flex items-center gap-1">
          {/* Dark Plan Button */}
          <button
            type="button"
            onClick={() => setViewMode('plan')}
            className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${
              viewMode === 'plan'
                ? 'bg-[#E9E778] text-[#241F21] border-transparent shadow-md'
                : 'text-zinc-300 border-transparent hover:bg-white/10 hover:border-white/20'
            }`}
            aria-label={LABELS.darkPlan[lang]}
            aria-pressed={viewMode === 'plan'}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Satellite Button */}
          <button
            type="button"
            onClick={() => setViewMode('satellite')}
            className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${
              viewMode === 'satellite'
                ? 'bg-[#E9E778] text-[#241F21] border-transparent shadow-md'
                : 'text-zinc-300 border-transparent hover:bg-white/10 hover:border-white/20'
            }`}
            aria-label={LABELS.satellite[lang]}
            aria-pressed={viewMode === 'satellite'}
          >
            <Satellite className="w-4 h-4" />
          </button>

          {/* Hybrid Button */}
          <button
            type="button"
            onClick={() => setViewMode('hybrid')}
            className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${
              viewMode === 'hybrid'
                ? 'bg-[#E9E778] text-[#241F21] border-transparent shadow-md'
                : 'text-zinc-300 border-transparent hover:bg-white/10 hover:border-white/20'
            }`}
            aria-label={LABELS.hybrid[lang]}
            aria-pressed={viewMode === 'hybrid'}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/10 mx-1" />

        {/* 2D/3D Camera Toggle */}
        <button
          type="button"
          onClick={() => setIs3D(!is3D)}
          className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${
            is3D
              ? 'bg-[#E9E778] text-[#241F21] border-transparent shadow-md'
              : 'text-zinc-300 border-transparent hover:bg-white/10 hover:border-white/20'
          }`}
          aria-label={is3D ? LABELS.view3D[lang] : LABELS.view2D[lang]}
          aria-pressed={is3D}
          title={is3D ? LABELS.view3D[lang] : LABELS.view2D[lang]}
        >
          <Box
            className={`w-4 h-4 transition-transform ${is3D ? 'rotate-12' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
