'use client';
import React from 'react';
import { ShieldAlert, BookOpen, AlertCircle, FileText } from 'lucide-react';
import SSDFeasibilityWidget from './SSDFeasibilityWidget';
import type { AIInsightData } from '@/app/app/page';

type Lang = 'en' | 'zh';

const MOCK_PERMITS = [
  { id: 'PLN-23-0142', status: 'Approved', description: 'Construction of 3 double-storey townhouses.', date: '12 Oct 2023' },
  { id: 'PLN-19-0881', status: 'Lapsed', description: 'Subdivision of land into two lots.', date: '04 May 2019' },
];

const OVERLAY_CATEGORY_NAMES: Record<string, string> = {
  HO: 'Heritage Overlay',
  BMO: 'Bushfire Management Overlay',
  FO: 'Flood Overlay',
  LSIO: 'Land Subject to Inundation Overlay',
  SBO: 'Special Building Overlay',
  DDO: 'Design and Development Overlay',
  PO: 'Parking Overlay',
  DCPO: 'Development Contributions Plan Overlay',
};

function describeOverlayCode(raw: string): string {
  const upper = raw.toUpperCase();
  for (const prefix of Object.keys(OVERLAY_CATEGORY_NAMES)) {
    if (upper.startsWith(prefix)) return OVERLAY_CATEGORY_NAMES[prefix];
  }
  return 'Planning Overlay';
}

export { describeOverlayCode };

export type PlanningOverlay = { code: string; name: string };

const COPY: Record<Lang, {
  principalZoning: string;
  planningOverlays: string;
  permitHistory: string;
  noOverlays: string;
  tbc: string;
  estimatedTooltip: string;
  zoneDescriptionUnavailable: string;
  zoneDescriptionLive: string;
}> = {
  en: {
    principalZoning: 'Principal Zoning',
    planningOverlays: 'Planning Overlays',
    permitHistory: 'Recent Permit History',
    noOverlays: 'No overlays affecting this site.',
    tbc: 'TBC',
    estimatedTooltip:
      'Estimated placeholder data. Confirm legal boundaries and zoning before lodgement.',
    zoneDescriptionLive: 'Live data sourced from Vicmap planning scheme.',
    zoneDescriptionUnavailable: 'Zone description unavailable from Vicmap for this parcel.',
  },
  zh: {
    principalZoning: '主要分区',
    planningOverlays: '规划覆盖区',
    permitHistory: '近期许可历史',
    noOverlays: '此地块无适用覆盖区。',
    tbc: 'TBC',
    estimatedTooltip: '估算占位数据。递交前请确认所有法律边界和分区信息。',
    zoneDescriptionLive: '数据来源:Vicmap 规划方案。',
    zoneDescriptionUnavailable: '此地块的分区描述在 Vicmap 中不可用。',
  },
};

type Props = {
  zoneCode?: string | null;
  zoneDescription?: string | null;
  overlays?: PlanningOverlay[] | null;
  aiInsight?: AIInsightData | null;
  effectiveLandSizeM2?: number | null;
  address?: string | null;
  lang?: Lang;
};

export default function PlanningConstraintsTab({
  zoneCode,
  zoneDescription,
  overlays,
  aiInsight,
  effectiveLandSizeM2,
  address,
  lang = 'en',
}: Props = {}) {
  const t = COPY[lang];

  const liveZoneCode = zoneCode?.trim();
  const aiZoneCode = aiInsight?.zoning?.trim();

  // Resolution order: live Vicmap → agentic AI → TBC placeholder.
  const zone = liveZoneCode
    ? {
        code: liveZoneCode,
        name: zoneDescription?.trim() || liveZoneCode,
        description: zoneDescription?.trim()
          ? t.zoneDescriptionLive
          : t.zoneDescriptionUnavailable,
        isAI: false,
      }
    : aiZoneCode
    ? {
        code: aiZoneCode,
        name: aiZoneCode,
        description: '',
        isAI: true,
      }
    : {
        code: t.tbc,
        name: t.tbc,
        description: '',
        isAI: false,
      };

  const hasLiveOverlays = !!overlays && overlays.length > 0;
  const resolvedOverlays: PlanningOverlay[] = hasLiveOverlays
    ? overlays!
    : (aiInsight?.overlays ?? []).map((code) => ({
        code,
        name: describeOverlayCode(code),
      }));
  const overlaysAreAI = !hasLiveOverlays && resolvedOverlays.length > 0;

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300 pb-10">

      {/* 0. SSD Feasibility */}
      <SSDFeasibilityWidget
        landSizeM2={effectiveLandSizeM2 ?? null}
        address={address ?? null}
        lang={lang}
        aiInsightSummary={aiInsight?.insightSummary}
      />

      {/* 1. Zoning Information */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> {t.principalZoning}
          {zone.isAI && (
            <span title={t.estimatedTooltip} className="inline-flex cursor-help">
              <AlertCircle className="w-3 h-3 text-zinc-500" aria-label={t.estimatedTooltip} />
            </span>
          )}
        </h3>
        <div className="flex items-start gap-4">
          <div className="px-3 py-1.5 bg-[#E9E778] text-[#241F21] rounded-md font-bold text-lg uppercase tracking-wider shrink-0">
            {zone.code}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white mb-1 break-words">{zone.name}</p>
            {zone.description && (
              <p className="text-xs text-zinc-400 leading-relaxed">{zone.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Overlays */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> {t.planningOverlays}
          {overlaysAreAI && (
            <span title={t.estimatedTooltip} className="inline-flex cursor-help">
              <AlertCircle className="w-3 h-3 text-zinc-500" aria-label={t.estimatedTooltip} />
            </span>
          )}
        </h3>
        {resolvedOverlays.length > 0 ? (
          <div className="flex flex-col gap-3">
            {resolvedOverlays.map((overlay, idx) => (
              <div key={`${overlay.code}-${idx}`} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-lg">
                <span className="px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded">
                  {overlay.code}
                </span>
                <span className="text-sm text-zinc-300">{overlay.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">{t.noOverlays}</p>
        )}
      </div>

      {/* 3. Permit History */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> {t.permitHistory}
        </h3>
        <div className="flex flex-col gap-4">
          {MOCK_PERMITS.map((permit, idx) => (
            <div key={idx} className="relative pl-4 border-l-2 border-white/10">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#E9E778]" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{permit.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                  permit.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {permit.status}
                </span>
              </div>
              <p className="text-sm text-zinc-300 mb-1">{permit.description}</p>
              <p className="text-xs text-zinc-500">{permit.date}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
