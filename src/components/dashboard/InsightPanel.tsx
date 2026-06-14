'use client';

import React from 'react';
import { Bed, Bath, Car, MapPin, Loader2, ChevronDown } from 'lucide-react';
import ComplianceStatus from '@/components/dashboard/ComplianceStatus';
import PlanningCard from '@/components/dashboard/PlanningCard';
import YieldCard from '@/components/dashboard/YieldCard';
import FeasibilityCard from '@/components/dashboard/FeasibilityCard';
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
  planningConstraints: { en: 'Planning & Constraints', zh: '规划与限制' },
  developmentPotential: { en: 'Development Potential', zh: '开发潜力' },
  financialFeasibility: { en: 'Financial Feasibility', zh: '财务可行性' },
};

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
  // Prioritize market data over AI insight for property attributes
  const bedrooms = marketData?.bedrooms ?? aiInsight?.bedrooms ?? null;
  const bathrooms = marketData?.bathrooms ?? aiInsight?.bathrooms ?? null;
  const carspaces = marketData?.carspaces ?? aiInsight?.carspaces ?? null;

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

      {/* 5. ADVANCED ANALYSIS ACCORDIONS */}
      <div className="space-y-3 border-t border-white/10 pt-6">
        {/* Accordion 1: Planning & Constraints */}
        <details className="group rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-zinc-700/30 transition-colors">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200 flex items-center gap-2">
              <span>🗺️</span>
              {LABELS.planningConstraints[language]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 border-t border-zinc-700">
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
        </details>

        {/* Accordion 2: Development Potential */}
        <details className="group rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-zinc-700/30 transition-colors">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200 flex items-center gap-2">
              <span>🏗️</span>
              {LABELS.developmentPotential[language]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 border-t border-zinc-700">
            <YieldCard yieldData={yieldData} />
          </div>
        </details>

        {/* Accordion 3: Financial Feasibility */}
        <details className="group rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-zinc-700/30 transition-colors">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200 flex items-center gap-2">
              <span>📊</span>
              {LABELS.financialFeasibility[language]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 border-t border-zinc-700">
            <FeasibilityCard yieldData={yieldData} />
          </div>
        </details>
      </div>
    </div>
  );
}
