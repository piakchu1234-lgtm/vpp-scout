'use client';

import React, { useState } from 'react';
import { Bed, Bath, Car, MapPin, Loader2, Landmark } from 'lucide-react';
import ComplianceStatus from '@/components/dashboard/ComplianceStatus';
import PlanningCard from '@/components/dashboard/PlanningCard';
import YieldCard from '@/components/dashboard/YieldCard';
import FeasibilityCard from '@/components/dashboard/FeasibilityCard';
import DocumentStorefront from '@/components/dashboard/DocumentStorefront';
import type { AIInsightData } from '@/app/app/page';
import type { MarketDataResult } from '@/lib/marketData';
import type { VicPlanData } from '@/lib/vicPlanApi';
import type { YieldData } from '@/lib/yieldEngine';
import type { PlanningOverlay } from '@/components/dashboard/PlanningCard';

type Lang = 'en' | 'zh';

type InsightPanelProps = {
  address: string | null;
  language: Lang;
  setLanguage: (lang: Lang) => void;
  landSizeM2: number | null;
  lotPlan: string | null;
  liveCouncil: string | null;
  lat: number;
  lon: number;
  aiInsight: AIInsightData | null;
  isLoadingAI: boolean;
  marketData: MarketDataResult | null;
  isLoadingMarket: boolean;
  planData: VicPlanData | null;
  overlays: PlanningOverlay[] | null;
  yieldData: YieldData;
  effectiveLandSizeM2: number | null;
};

const LABELS = {
  noAddress: { en: 'No address selected', zh: '未选择地址' },
  quickStats: { en: 'Quick Stats', zh: '快速统计' },
  aiIntelligence: { en: 'AI Intelligence', zh: 'AI 洞察' },
  loadingAI: { en: 'Loading AI analysis...', zh: '正在加载 AI 分析...' },
  vacantLand: { en: 'Vacant Land', zh: '空置土地' },
  property: { en: 'Property', zh: '物业' },
  planning: { en: 'Planning', zh: '规划' },
  feasibility: { en: 'Feasibility', zh: '可行性' },
};

type TabId = 'property' | 'planning' | 'feasibility';

export default function InsightPanel({
  address,
  language,
  setLanguage,
  landSizeM2,
  lotPlan,
  liveCouncil,
  lat,
  lon,
  aiInsight,
  isLoadingAI,
  marketData,
  isLoadingMarket,
  planData,
  overlays,
  yieldData,
  effectiveLandSizeM2,
}: InsightPanelProps) {
  // Tab state for advanced analysis sections
  const [activeTab, setActiveTab] = useState<TabId>('property');

  // Prioritize market data over AI insight for property attributes
  const bedrooms = marketData?.bedrooms ?? aiInsight?.bedrooms ?? null;
  const bathrooms = marketData?.bathrooms ?? aiInsight?.bathrooms ?? null;
  const carspaces = marketData?.carspaces ?? aiInsight?.carspaces ?? null;

  // Detect vacant land: explicit flag from AI OR all property metrics are 0/null
  const isVacantLand = aiInsight?.isVacantLand || (bedrooms === 0 && bathrooms === 0 && carspaces === 0);

  const formatLandSize = (m2: number | null) => {
    if (!m2 || !Number.isFinite(m2) || m2 <= 0) return '—';
    return `${Math.round(m2)} m²`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. HEADER: Address + Language Toggle */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-bold text-white leading-tight flex-1 min-w-0 break-words">
          {address || LABELS.noAddress[language]}
        </h2>
        <div
          role="group"
          aria-label="Language toggle"
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest shrink-0"
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={
              language === 'en'
                ? 'text-[#E9E778]'
                : 'text-zinc-500 hover:text-zinc-200 transition-colors'
            }
          >
            EN
          </button>
          <span className="text-zinc-700">|</span>
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            aria-pressed={language === 'zh'}
            className={
              language === 'zh'
                ? 'text-[#E9E778]'
                : 'text-zinc-500 hover:text-zinc-200 transition-colors'
            }
          >
            中文
          </button>
        </div>
      </div>

      {/* 2. QUICK STATS: Horizontal pill row */}
      <div className="flex flex-wrap items-center gap-3">
        {isVacantLand ? (
          /* Single "Vacant Land" badge when property has no improvements */
          <div className="flex items-center gap-2 rounded-full border border-amber-600 bg-amber-900/30 px-4 py-1.5">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-200">
              {LABELS.vacantLand[language]}
            </span>
          </div>
        ) : (
          /* Individual property metrics for improved sites */
          <>
            {/* Bedrooms */}
            <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5">
              <Bed className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold text-white">
                {bedrooms && bedrooms > 0 ? bedrooms : '—'}
              </span>
            </div>

            {/* Bathrooms */}
            <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5">
              <Bath className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold text-white">
                {bathrooms && bathrooms > 0 ? bathrooms : '—'}
              </span>
            </div>

            {/* Carspaces */}
            <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5">
              <Car className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold text-white">
                {carspaces && carspaces > 0 ? carspaces : '—'}
              </span>
            </div>
          </>
        )}

        {/* Land Size - CRITICAL: Use effectiveLandSizeM2 for multi-parcel consolidation */}
        <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5">
          <MapPin className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-white">
            {formatLandSize(effectiveLandSizeM2)}
          </span>
        </div>
      </div>

      {/* 3. COMPLIANCE CARD */}
      <ComplianceStatus
        landSizeM2={landSizeM2}
        zoneCode={planData?.zoneCode ?? null}
        overlays={overlays?.map((o) => o.code) ?? []}
        frontageM={
          aiInsight?.estimatedFrontage
            ? parseFloat(aiInsight.estimatedFrontage.replace(/[^\d.]/g, '')) || null
            : null
        }
        isVacantLand={aiInsight?.isVacantLand ?? false}
        isLoadingData={isLoadingAI}
        lang={language}
      />

      {/* 4. AI INTELLIGENCE */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
          <span>🤖</span>
          {LABELS.aiIntelligence[language]}
        </h3>
        {isLoadingAI ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[#E9E778] animate-spin" />
            <p className="text-sm text-zinc-400">{LABELS.loadingAI[language]}</p>
          </div>
        ) : aiInsight?.insightSummary ? (
          <p className="text-sm text-zinc-300 leading-relaxed">
            {aiInsight.insightSummary}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 italic">
            {language === 'en'
              ? 'AI analysis will appear once address data loads.'
              : 'AI 分析将在地址数据加载完成后显示。'}
          </p>
        )}
      </div>

      {/* 5. ADVANCED ANALYSIS TABS */}
      <div className="border-t border-white/10 pt-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'property'}
            aria-controls="tab-panel-property"
            onClick={() => setActiveTab('property')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'property'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.property[language]}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'planning'}
            aria-controls="tab-panel-planning"
            onClick={() => setActiveTab('planning')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'planning'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.planning[language]}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'feasibility'}
            aria-controls="tab-panel-feasibility"
            onClick={() => setActiveTab('feasibility')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
              ${
                activeTab === 'feasibility'
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700'
              }
            `}
          >
            {LABELS.feasibility[language]}
          </button>
        </div>

        {/* Tab Panels */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-5">
          {activeTab === 'property' && (
            <div role="tabpanel" id="tab-panel-property" aria-labelledby="tab-property">
              <PlanningCard
                zoneCode={planData?.zoneCode}
                zoneDescription={planData?.zoneDescription}
                overlays={overlays}
                aiInsight={aiInsight}
                effectiveLandSizeM2={effectiveLandSizeM2}
                address={address}
                lang={language}
              />
            </div>
          )}
          {activeTab === 'planning' && (
            <div role="tabpanel" id="tab-panel-planning" aria-labelledby="tab-planning">
              <YieldCard yieldData={yieldData} />
            </div>
          )}
          {activeTab === 'feasibility' && (
            <div role="tabpanel" id="tab-panel-feasibility" aria-labelledby="tab-feasibility">
              <FeasibilityCard yieldData={yieldData} />
            </div>
          )}
        </div>
      </div>

      {/* 6. DOCUMENT STOREFRONT - Landata Intelligence & Monetization */}
      <div className="border-t border-white/10 pt-6">
        <DocumentStorefront lotPlan={lotPlan} lang={language} />
      </div>
    </div>
  );
}
