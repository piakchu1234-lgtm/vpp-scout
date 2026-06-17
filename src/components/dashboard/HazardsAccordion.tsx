'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, Flame, Droplet } from 'lucide-react';
import { getOverlayDefinition } from '@/lib/overlayDictionary';

type Lang = 'en' | 'zh';

type HazardsAccordionProps = {
  overlays: string[];
  lang: Lang;
};

const LABELS = {
  hazardAssessment: { en: 'Environmental Hazard Assessment', zh: '环境风险评估' },
  overlandInundation: { en: 'Overland Inundation', zh: '地表淹水' },
  bushfireProne: { en: 'Bushfire Prone Area', zh: '山火易发区' },
  floodAffected: { en: 'Flood Affected', zh: '洪水影响' },
  bushfireRisk: { en: 'Bushfire Risk Zone', zh: '山火风险区' },
  clear: { en: 'Clear / No Hazards', zh: '无风险' },
  sboActive: { en: 'SBO (Special Building Overlay) Active', zh: 'SBO (特殊建筑覆盖区) 生效' },
  lsioActive: { en: 'LSIO (Land Subject to Inundation) Active', zh: 'LSIO (淹水覆盖区) 生效' },
  foActive: { en: 'FO (Floodway Overlay) Active', zh: 'FO (洪水覆盖区) 生效' },
  bmoActive: { en: 'BMO (Bushfire Management Overlay) Active', zh: 'BMO (山火管理覆盖区) 生效' },
  unaffected: {
    en: 'Unaffected by local riverine or overland drainage flood models.',
    zh: '不受本地河流或地表排水洪水模型影响。',
  },
  outsideBushfire: {
    en: 'Lot outside designated high-risk bushfire prone area buffers.',
    zh: '地块位于指定高风险山火易发区缓冲区之外。',
  },
  subcatchmentRule: {
    en: 'Stormwater Overland Flow Catchment',
    zh: '雨水地表流集水区',
  },
};

export default function HazardsAccordion({ overlays, lang }: HazardsAccordionProps) {
  // Scan for flood-related overlays (SBO, LSIO, FO)
  const floodOverlays = overlays.filter((code) => {
    const normalized = code.trim().toUpperCase();
    return normalized.startsWith('SBO') || normalized.startsWith('LSIO') || normalized.startsWith('FO');
  });

  // Scan for bushfire overlay (BMO)
  const bushfireOverlays = overlays.filter((code) => {
    const normalized = code.trim().toUpperCase();
    return normalized.startsWith('BMO');
  });

  const hasFloodRisk = floodOverlays.length > 0;
  const hasBushfireRisk = bushfireOverlays.length > 0;
  const hasAnyHazard = hasFloodRisk || hasBushfireRisk;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
        {LABELS.hazardAssessment[lang]}
      </h3>

      {/* Overland Inundation Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplet className={`w-5 h-5 ${hasFloodRisk ? 'text-red-400' : 'text-zinc-500'}`} />
          <h4 className="text-sm font-bold text-zinc-200">
            {LABELS.overlandInundation[lang]}
          </h4>
        </div>

        {hasFloodRisk ? (
          <div className="space-y-3">
            {/* Dark Red Warning Tag */}
            <div className="flex items-center gap-2 rounded-md border border-red-700 bg-red-900/40 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-200">
                {LABELS.floodAffected[lang]}
              </span>
            </div>

            {/* List specific flood overlays with sub-catchment rules */}
            {floodOverlays.map((code) => {
              const normalized = code.trim().toUpperCase();
              let label = '';
              let subcatchment = '';

              if (normalized.startsWith('SBO')) {
                label = LABELS.sboActive[lang];
                subcatchment = `${normalized} ${LABELS.subcatchmentRule[lang]}`;
              } else if (normalized.startsWith('LSIO')) {
                label = LABELS.lsioActive[lang];
                subcatchment = `${normalized} ${LABELS.subcatchmentRule[lang]}`;
              } else if (normalized.startsWith('FO')) {
                label = LABELS.foActive[lang];
                subcatchment = `${normalized} Floodway Zone`;
              }

              const overlayDef = getOverlayDefinition(normalized);

              return (
                <div key={code} className="rounded-md border border-red-600/30 bg-red-900/20 px-3 py-2">
                  <div className="text-xs font-bold text-red-300 mb-1">{label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-red-400/70 mb-2">
                    {subcatchment}
                  </div>
                  {overlayDef && (
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {overlayDef.purpose}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-green-700 bg-green-900/20 px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-200">
              {LABELS.unaffected[lang]}
            </span>
          </div>
        )}
      </div>

      {/* Bushfire Prone Area Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className={`w-5 h-5 ${hasBushfireRisk ? 'text-amber-400' : 'text-zinc-500'}`} />
          <h4 className="text-sm font-bold text-zinc-200">
            {LABELS.bushfireProne[lang]}
          </h4>
        </div>

        {hasBushfireRisk ? (
          <div className="space-y-3">
            {/* Amber Warning Tag */}
            <div className="flex items-center gap-2 rounded-md border border-amber-700 bg-amber-900/40 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-200">
                {LABELS.bushfireRisk[lang]}
              </span>
            </div>

            {/* List specific bushfire overlays */}
            {bushfireOverlays.map((code) => {
              const normalized = code.trim().toUpperCase();
              const overlayDef = getOverlayDefinition(normalized);

              return (
                <div key={code} className="rounded-md border border-amber-600/30 bg-amber-900/20 px-3 py-2">
                  <div className="text-xs font-bold text-amber-300 mb-1">
                    {LABELS.bmoActive[lang]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-400/70 mb-2">
                    {normalized} - Bushfire Attack Level (BAL) Assessment Required
                  </div>
                  {overlayDef && (
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {overlayDef.purpose}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-green-700 bg-green-900/20 px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-200">
              {LABELS.outsideBushfire[lang]}
            </span>
          </div>
        )}
      </div>

      {/* Summary Status */}
      {!hasAnyHazard && (
        <div className="flex items-center gap-2 rounded-lg border border-green-700 bg-green-900/30 px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold text-green-200">
            {LABELS.clear[lang]}
          </span>
        </div>
      )}
    </div>
  );
}
