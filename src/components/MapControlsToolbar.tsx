'use client';

import React, { useState } from 'react';
import {
  Layers,
  Trash2,
  Satellite,
  Globe,
  Box,
  Plus,
  Minus,
  Compass,
  Pentagon,
  Minus as LineIcon,
  Settings,
  ChevronUp,
  Crosshair,
} from 'lucide-react';
import type { ParcelFeature } from '@/lib/vicPlanApi';

type Lang = 'en' | 'zh';
type ViewMode = 'plan' | 'satellite' | 'hybrid';
type DrawMode = 'draw_polygon' | 'draw_line_string' | null;

type MapControlsToolbarProps = {
  selectedParcels: ParcelFeature[];
  onClearSelection: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  is3D: boolean;
  setIs3D: (is3D: boolean) => void;
  lang: Lang;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetBearing?: () => void;
  onRecenter?: () => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  onClearDrawing?: () => void;
  drawnArea?: number | null;
};

const LABELS = {
  clearSelection: { en: 'Clear', zh: '清除' },
  selectedCount: { en: 'selected', zh: '已选' },
  darkPlan: { en: 'Dark Plan', zh: '暗色平面' },
  aerialSatellite: { en: 'Aerial Satellite', zh: '卫星影像' },
  hybridGlobe: { en: 'Hybrid Globe', zh: '混合地球' },
  toggle3D: { en: 'Toggle 3D', zh: '切换3D' },
  zoomIn: { en: 'Zoom In', zh: '放大' },
  zoomOut: { en: 'Zoom Out', zh: '缩小' },
  resetBearing: { en: 'Reset North', zh: '重置方向' },
  recenter: { en: 'Recenter on Property', zh: '重新定位到房产' },
  drawPolygon: { en: 'Draw Polygon', zh: '绘制多边形' },
  measureDistance: { en: 'Measure Distance', zh: '测量距离' },
  clearDrawing: { en: 'Clear Drawing', zh: '清除绘图' },
};

export default function MapControlsToolbar({
  selectedParcels,
  onClearSelection,
  viewMode,
  setViewMode,
  is3D,
  setIs3D,
  lang,
  onZoomIn,
  onZoomOut,
  onResetBearing,
  onRecenter,
  drawMode,
  onDrawModeChange,
  onClearDrawing,
  drawnArea,
}: MapControlsToolbarProps) {
  // Waze-style expandable state
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-20 left-6 z-40 flex flex-col items-start gap-3">
      {/* Multi-Parcel Selection Badge */}
      {selectedParcels.length > 1 && (
        <div className="flex items-center gap-2 rounded-lg border border-lime/30 bg-charcoal/95 backdrop-blur-md px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-medium text-lime">
            <Layers className="w-3.5 h-3.5 text-lime" />
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

      {/* Stacked Map Control Suite */}
      <div className="flex flex-col items-start gap-2">
        {/* Expanded Controls */}
        {isExpanded && (
          <div className="flex flex-col gap-2 rounded-lg bg-charcoal shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* View Mode */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode('plan')}
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${
                  viewMode === 'plan'
                    ? 'bg-lime text-charcoal shadow-md'
                    : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
                }`}
                title={LABELS.darkPlan[lang]}
              >
                <Layers className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('satellite')}
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${
                  viewMode === 'satellite'
                    ? 'bg-lime text-charcoal shadow-md'
                    : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
                }`}
                title={LABELS.aerialSatellite[lang]}
              >
                <Satellite className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('hybrid')}
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${
                  viewMode === 'hybrid'
                    ? 'bg-lime text-charcoal shadow-md'
                    : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
                }`}
                title={LABELS.hybridGlobe[lang]}
              >
                <Globe className="w-4 h-4" />
              </button>
            </div>

            {/* 3D Toggle */}
            <button
              type="button"
              onClick={() => setIs3D(!is3D)}
              className={`w-full h-10 flex items-center justify-center gap-2 rounded-md transition-all ${
                is3D
                  ? 'bg-lime text-charcoal shadow-md'
                  : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
              }`}
              title={LABELS.toggle3D[lang]}
            >
              <Box className="w-4 h-4" />
              <span className="text-xs font-medium">3D</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onZoomIn}
                className="flex-1 h-10 flex items-center justify-center rounded-md bg-charcoal text-zinc-300 hover:bg-zinc-800"
                title={LABELS.zoomIn[lang]}
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onZoomOut}
                className="flex-1 h-10 flex items-center justify-center rounded-md bg-charcoal text-zinc-300 hover:bg-zinc-800"
                title={LABELS.zoomOut[lang]}
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onResetBearing}
                className="flex-1 h-10 flex items-center justify-center rounded-md bg-charcoal text-zinc-300 hover:bg-zinc-800"
                title={LABELS.resetBearing[lang]}
              >
                <Compass className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onRecenter}
                className="flex-1 h-10 flex items-center justify-center rounded-md bg-charcoal text-lime hover:bg-lime hover:text-charcoal transition-colors"
                title={LABELS.recenter[lang]}
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Drawing Tools */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() =>
                  onDrawModeChange(
                    drawMode === 'draw_polygon' ? null : 'draw_polygon'
                  )
                }
                className={`flex-1 h-10 flex items-center justify-center rounded-md transition-all ${
                  drawMode === 'draw_polygon'
                    ? 'bg-lime text-charcoal shadow-md'
                    : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
                }`}
                title={LABELS.drawPolygon[lang]}
              >
                <Pentagon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  onDrawModeChange(
                    drawMode === 'draw_line_string' ? null : 'draw_line_string'
                  )
                }
                className={`flex-1 h-10 flex items-center justify-center rounded-md transition-all ${
                  drawMode === 'draw_line_string'
                    ? 'bg-lime text-charcoal shadow-md'
                    : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
                }`}
                title={LABELS.measureDistance[lang]}
              >
                <LineIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Drawing */}
            {(drawMode || drawnArea) && onClearDrawing && (
              <button
                type="button"
                onClick={onClearDrawing}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-medium">{LABELS.clearDrawing[lang]}</span>
              </button>
            )}
          </div>
        )}

        {/* Main Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md shadow-xl transition-all ${
            isExpanded
              ? 'bg-lime text-charcoal'
              : 'bg-charcoal text-zinc-300 hover:bg-zinc-800'
          }`}
          aria-label="Map Settings"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <Settings className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
