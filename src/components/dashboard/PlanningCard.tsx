'use client';
import React, { useState } from 'react';
import { ShieldAlert, BookOpen, AlertCircle, AlertTriangle, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import SSDFeasibilityWidget from '../sidebar/SSDFeasibilityWidget';
import { OverlayInterpretation } from './OverlayInterpretation';
import { VPPAgentDefinition } from './VPPAgentDefinition';
import type { AIInsightData } from '@/app/app/page';
import { getZoneDefinitionWithLanguage } from '@/lib/zoningDictionary';

type Lang = 'en' | 'zh';

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
  hazardsTitle: string;
  noOverlays: string;
  noHazards: string;
  hazardsPending: string;
  tbc: string;
  estimatedTooltip: string;
  zoneDescriptionUnavailable: string;
  zoneDescriptionLive: string;
  legalDefinition: string;
  legalDefinitionPending: string;
  expandHint: string;
}> = {
  en: {
    principalZoning: 'Principal Zoning',
    planningOverlays: 'Planning Overlays',
    hazardsTitle: 'Hazards & Risks',
    noOverlays: 'No overlays affecting this site.',
    noHazards: 'No natural hazards mapped for this parcel.',
    hazardsPending: 'Awaiting Auditor — hazard mapping resolves with the AI insight.',
    tbc: 'TBC',
    estimatedTooltip:
      'Estimated placeholder data. Confirm legal boundaries and zoning before lodgement.',
    zoneDescriptionLive: 'Live data sourced from Vicmap planning scheme.',
    zoneDescriptionUnavailable: 'Zone description unavailable from Vicmap for this parcel.',
    legalDefinition: 'Legal definition',
    legalDefinitionPending:
      'Legal definition pending — VPP clause text will be injected here once the planning-scheme reference dataset is wired in.',
    expandHint: 'Click for legal definition',
  },
  zh: {
    principalZoning: '主要分区',
    planningOverlays: '规划覆盖区',
    hazardsTitle: '灾害与风险',
    noOverlays: '此地块无适用覆盖区。',
    noHazards: '此地块未映射自然灾害。',
    hazardsPending: '正在等待审计员 — 灾害映射将在 AI 洞察解析后填充。',
    tbc: 'TBC',
    estimatedTooltip: '估算占位数据。递交前请确认所有法律边界和分区信息。',
    zoneDescriptionLive: '数据来源:Vicmap 规划方案。',
    zoneDescriptionUnavailable: '此地块的分区描述在 Vicmap 中不可用。',
    legalDefinition: '法律定义',
    legalDefinitionPending:
      '法律定义待补充 — 接入规划方案参考数据后,此处将注入 VPP 条款原文。',
    expandHint: '点击查看法律定义',
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

export default function PlanningCard({
  zoneCode,
  zoneDescription,
  overlays,
  aiInsight,
  effectiveLandSizeM2,
  address,
  lang = 'en',
}: Props = {}) {
  const t = COPY[lang];

  const [zoneExpanded, setZoneExpanded] = useState(false);
  const [expandedOverlays, setExpandedOverlays] = useState<Record<number, boolean>>({});
  const toggleOverlay = (idx: number) =>
    setExpandedOverlays((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const liveZoneCode = zoneCode?.trim();
  const aiZoneCode = aiInsight?.zoning?.trim();
  const aiZoneDescription = aiInsight?.zoningDescription?.trim();

  // Resolution order: live Vicmap → agentic AI → TBC placeholder.
  const zone = liveZoneCode
    ? {
        code: liveZoneCode,
        name: zoneDescription?.trim() || liveZoneCode,
        description: zoneDescription?.trim()
          ? t.zoneDescriptionLive
          : t.zoneDescriptionUnavailable,
        isAI: false,
        tooltip: '',
      }
    : aiZoneCode
    ? {
        code: aiZoneCode,
        name: aiZoneCode,
        description: aiZoneDescription || '',
        isAI: true,
        tooltip: aiZoneDescription || t.estimatedTooltip,
      }
    : {
        code: t.tbc,
        name: t.tbc,
        description: '',
        isAI: false,
        tooltip: '',
      };

  type ResolvedOverlay = { code: string; name: string; description?: string };
  const hasLiveOverlays = !!overlays && overlays.length > 0;
  const resolvedOverlays: ResolvedOverlay[] = hasLiveOverlays
    ? overlays!.map((o) => ({ code: o.code, name: o.name }))
    : (aiInsight?.overlays ?? []).map((o) => ({
        code: o.code,
        name: describeOverlayCode(o.code),
        description: o.description?.trim() || undefined,
      }));
  const overlaysAreAI = !hasLiveOverlays && resolvedOverlays.length > 0;

  // Hazards have no Vicmap fallback yet — strictly AI-sourced.
  const hazards = aiInsight?.hazards ?? [];
  const hazardsState: 'pending' | 'none' | 'present' = !aiInsight
    ? 'pending'
    : hazards.length > 0
    ? 'present'
    : 'none';

  return (
    <div className="space-y-4">

      {/* 0. SSD Feasibility */}
      <SSDFeasibilityWidget
        landSizeM2={effectiveLandSizeM2 ?? null}
        address={address ?? null}
        lang={lang}
        aiInsightSummary={aiInsight?.insightSummary}
      />

      {/* 1. Zoning Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setZoneExpanded((v) => !v)}
          aria-expanded={zoneExpanded}
          className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors"
        >
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> {t.principalZoning}
            {zone.isAI && (
              <span title={zone.tooltip} className="inline-flex cursor-help">
                <AlertCircle className="w-3 h-3 text-zinc-500" aria-label={zone.tooltip} />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 ml-auto text-zinc-500 transition-transform ${
                zoneExpanded ? 'rotate-180' : ''
              }`}
            />
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
              {!zoneExpanded && (
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-2">
                  {t.expandHint}
                </p>
              )}
            </div>
          </div>
        </button>
        {zoneExpanded && (
          <div className="px-5 pb-5 pt-1 border-t border-white/5">
            <p className="text-[10px] font-bold tracking-widest text-[#E9E778] uppercase mb-2">
              {t.legalDefinition}
            </p>
            {(() => {
              const zoneDefinition = getZoneDefinitionWithLanguage(zone.code, lang);
              return zoneDefinition ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">{zoneDefinition.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{zoneDefinition.purpose}</p>
                </div>
              ) : (
                <VPPAgentDefinition code={zone.code} language={lang} trigger="immediate" />
              );
            })()}
          </div>
        )}
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
            {resolvedOverlays.map((overlay, idx) => {
              const isOpen = !!expandedOverlays[idx];
              return (
                <div
                  key={`${overlay.code}-${idx}`}
                  className="flex flex-col bg-black/20 border border-white/5 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleOverlay(idx)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded shrink-0">
                      {overlay.code}
                    </span>
                    <span className="text-sm text-zinc-300 min-w-0 flex-1">{overlay.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/5">
                      {overlay.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                          {overlay.description}
                        </p>
                      )}
                      <p className="text-[10px] font-bold tracking-widest text-[#E9E778] uppercase mb-2">
                        {t.legalDefinition}
                      </p>
                      <OverlayInterpretation code={overlay.code} language={lang} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">{t.noOverlays}</p>
        )}
      </div>

      {/* 3. Hazards & Risks */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {t.hazardsTitle}
          {hazardsState === 'present' && (
            <span title={t.estimatedTooltip} className="inline-flex cursor-help">
              <AlertCircle className="w-3 h-3 text-zinc-500" aria-label={t.estimatedTooltip} />
            </span>
          )}
        </h3>
        {hazardsState === 'pending' ? (
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg">
            <Loader2 className="w-4 h-4 text-[#E9E778] animate-spin flex-none" />
            <p className="text-xs text-zinc-400 italic">{t.hazardsPending}</p>
          </div>
        ) : hazardsState === 'present' ? (
          <div className="grid grid-cols-1 divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden bg-amber-500/[0.04]">
            {hazards.map((hazard, idx) => (
              <div key={`${hazard}-${idx}`} className="p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-200 leading-relaxed">{hazard}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300/80">{t.noHazards}</p>
          </div>
        )}
      </div>

    </div>
  );
}
