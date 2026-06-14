'use client';

import React from 'react';
import { Layers, Trash2, Mountain } from 'lucide-react';
import type { ParcelPolygon } from '@/lib/vicPlanApi';

type Lang = 'en' | 'zh';

type MapControlsToolbarProps = {
  selectedParcels: ParcelPolygon[];
  onClearSelection: () => void;
  onTogglePitch?: () => void;
  isPitched?: boolean;
  lang: Lang;
};

const LABELS = {
  clearSelection: { en: 'Clear', zh: '清除' },
  selectedCount: { en: 'Selected', zh: '已选' },
  togglePitch: { en: 'Toggle Pitch', zh: '切换俯仰' },
};

export default function MapControlsToolbar({
  selectedParcels,
  onClearSelection,
  onTogglePitch,
  isPitched = false,
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

      {/* Pitch Toggle Button */}
      {onTogglePitch && (
        <button
          type="button"
          onClick={onTogglePitch}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all ${
            isPitched
              ? 'border-[#E9E778]/50 bg-[#E9E778]/20 text-[#E9E778]'
              : 'border-white/10 bg-black/40 text-white hover:bg-black/50'
          }`}
          aria-label={LABELS.togglePitch[lang]}
          aria-pressed={isPitched}
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>{isPitched ? '60°' : '0°'}</span>
        </button>
      )}
    </div>
  );
}
