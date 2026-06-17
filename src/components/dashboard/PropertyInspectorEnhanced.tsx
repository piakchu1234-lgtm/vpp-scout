'use client';

import React, { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, Lock, Save, FileText, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AIInsightData } from '@/app/app/page';
import type { MarketDataResult } from '@/lib/marketData';
import { useUserPlan } from '@/contexts/UserPlanContext';

type Lang = 'en' | 'zh';

type PropertyInspectorProps = {
  aiInsight: AIInsightData | null;
  isLoadingAI: boolean;
  marketData: MarketDataResult | null;
  isLoadingMarket: boolean;
  lang: Lang;
  address: string | null;
  landSizeM2: number | null;
  zoneCode: string | null;
  frontageM: number | null;
  orientation: string | null;
  overlays: string[];
  onSaveToProject: () => void;
  onViewReport: () => void;
  onConsolidateSites: () => void;
};

const LABELS = {
  saveToProject: { en: 'SAVE TO PROJECT', zh: '保存至项目' },
  viewReport: { en: 'VIEW REPORT', zh: '查看报告' },
  consolidateSites: { en: 'CONSOLIDATE SITES', zh: '合并地块' },
  propertyDetails: { en: 'Property Details', zh: '物业详情' },
  attributesHistory: { en: 'Attributes & History', zh: '属性与历史' },
  hazardsPermits: { en: 'Hazards & Nearby Permits', zh: '风险与许可' },
  landSize: { en: 'Land Size', zh: '地块面积' },
  planningZone: { en: 'Planning Zone', zh: '规划分区' },
  frontage: { en: 'Frontage', zh: '临街面宽' },
  orientation: { en: 'Orientation', zh: '朝向' },
  bedrooms: { en: 'Beds', zh: '卧室' },
  bathrooms: { en: 'Baths', zh: '浴室' },
  carspaces: { en: 'Cars', zh: '车位' },
  lastSold: { en: 'Last Sold', zh: '最后成交价' },
  premiumOnly: { en: '🔒 Premium report only', zh: '🔒 仅限高级报告' },
  unlockPremium: { en: '🔒 Unlock with Premium Report', zh: '🔒 解锁高级报告' },
  floodAffected: { en: 'Flood Affected', zh: '洪水影响区' },
  bushfireRisk: { en: 'Bushfire Risk Zone', zh: '山火风险区' },
  clearNoHazards: { en: 'Clear / No Hazards', zh: '无风险' },
  nearbyPermits: { en: 'Nearby Planning Permits', zh: '附近规划许可' },
  noData: { en: 'No data available', zh: '暂无数据' },
  status: { en: 'Status', zh: '状态' },
  applicationCode: { en: 'Application', zh: '申请编号' },
  description: { en: 'Description', zh: '描述' },
  approved: { en: 'APPROVED', zh: '已批准' },
  pending: { en: 'PENDING', zh: '待审批' },
};

export default function PropertyInspector({
  aiInsight,
  isLoadingAI,
  marketData,
  isLoadingMarket,
  lang,
  address,
  landSizeM2,
  zoneCode,
  frontageM,
  orientation,
  overlays,
  onSaveToProject,
  onViewReport,
  onConsolidateSites,
}: PropertyInspectorProps) {
  const { plan } = useUserPlan();
  const isPremium = plan === 'premium';

  // Mock planning permits data
  const mockPermits = [
    { status: 'APPROVED', code: 'PA2024-001234', description: 'Two storey dwelling with basement' },
    { status: 'PENDING', code: 'PA2024-005678', description: 'Subdivision into 2 lots' },
  ];

  // Detect hazards from overlays
  const hasFloodRisk = overlays.some(o => /FO|LSIO|SBO/i.test(o));
  const hasBushfireRisk = overlays.some(o => /BMO/i.test(o));
  const hasHazards = hasFloodRisk || hasBushfireRisk;

  const formatLandSize = (m2: number | null) => {
    if (!m2 || !Number.isFinite(m2) || m2 <= 0) return '—';
    return `${Math.round(m2)} m²`;
  };

  const formatFrontage = (m: number | null) => {
    if (!m || !Number.isFinite(m) || m <= 0) return '—';
    return `${m.toFixed(1)} m`;
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSaveToProject}
          className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[#E9E778] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E9E778] transition-colors hover:bg-[#E9E778]/10"
        >
          <Save className="w-4 h-4" />
          {LABELS.saveToProject[lang]}
        </button>
        <button
          onClick={onViewReport}
          className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[#E9E778] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E9E778] transition-colors hover:bg-[#E9E778]/10"
        >
          <FileText className="w-4 h-4" />
          {LABELS.viewReport[lang]}
        </button>
        <button
          onClick={onConsolidateSites}
          className="flex-1 flex items-center justify-center gap-2 rounded-md border border-[#E9E778] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E9E778] transition-colors hover:bg-[#E9E778]/10"
        >
          <Users className="w-4 h-4" />
          {LABELS.consolidateSites[lang]}
        </button>
      </div>

      {/* Radix Accordion */}
      <Accordion.Root
        type="multiple"
        defaultValue={['property-details', 'attributes-history', 'hazards-permits']}
        className="space-y-3"
      >
        {/* Accordion 1: Property Details */}
        <Accordion.Item
          value="property-details"
          className="rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-700/30">
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
                {LABELS.propertyDetails[lang]}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
            <div className="pt-2">
              {/* Property details grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Land Size - MASKED for free tier */}
                <div className="relative rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                  {!isPremium && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 backdrop-blur-md rounded-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                        <Lock className="w-3.5 h-3.5 text-[#E9E778]" />
                        <span className="whitespace-nowrap">{LABELS.unlockPremium[lang]}</span>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {LABELS.landSize[lang]}
                  </div>
                  <div className={`text-sm font-bold text-white mt-1 ${!isPremium ? 'blur-sm' : ''}`}>
                    {formatLandSize(landSizeM2)}
                  </div>
                </div>

                {/* Planning Zone - ALWAYS VISIBLE (not masked) */}
                <div className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {LABELS.planningZone[lang]}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {zoneCode || '—'}
                  </div>
                </div>

                {/* Frontage - MASKED for free tier */}
                <div className="relative rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                  {!isPremium && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 backdrop-blur-md rounded-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                        <Lock className="w-3.5 h-3.5 text-[#E9E778]" />
                        <span className="whitespace-nowrap">{LABELS.unlockPremium[lang]}</span>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {LABELS.frontage[lang]}
                  </div>
                  <div className={`text-sm font-bold text-white mt-1 ${!isPremium ? 'blur-sm' : ''}`}>
                    {formatFrontage(frontageM)}
                  </div>
                </div>

                {/* Orientation - MASKED for free tier */}
                <div className="relative rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                  {!isPremium && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 backdrop-blur-md rounded-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                        <Lock className="w-3.5 h-3.5 text-[#E9E778]" />
                        <span className="whitespace-nowrap">{LABELS.unlockPremium[lang]}</span>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {LABELS.orientation[lang]}
                  </div>
                  <div className={`text-sm font-bold text-white mt-1 ${!isPremium ? 'blur-sm' : ''}`}>
                    {orientation || '—'}
                  </div>
                </div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Accordion 2: Attributes & History */}
        <Accordion.Item
          value="attributes-history"
          className="rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-700/30">
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
                {LABELS.attributesHistory[lang]}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.bedrooms[lang]}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {marketData?.bedrooms ?? aiInsight?.bedrooms ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.bathrooms[lang]}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {marketData?.bathrooms ?? aiInsight?.bathrooms ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.carspaces[lang]}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {marketData?.carspaces ?? aiInsight?.carspaces ?? '—'}
                </div>
              </div>

              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.lastSold[lang]}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {marketData?.lastSoldPrice ?? aiInsight?.estimatedLastSoldPrice ?? '—'}
                </div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Accordion 3: Hazards & Nearby Permits */}
        <Accordion.Item
          value="hazards-permits"
          className="rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-700/30">
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
                {LABELS.hazardsPermits[lang]}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
            <div className="space-y-4 pt-2">
              {/* Hazards Section */}
              <div>
                {hasFloodRisk && (
                  <div className="flex items-center gap-2 rounded-md border border-red-700 bg-red-900/30 px-3 py-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold text-red-200">{LABELS.floodAffected[lang]}</span>
                  </div>
                )}
                {hasBushfireRisk && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-700 bg-amber-900/30 px-3 py-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-200">{LABELS.bushfireRisk[lang]}</span>
                  </div>
                )}
                {!hasHazards && (
                  <div className="flex items-center gap-2 rounded-md border border-green-700 bg-green-900/30 px-3 py-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-200">{LABELS.clearNoHazards[lang]}</span>
                  </div>
                )}
              </div>

              {/* Planning Permits Table */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                  {LABELS.nearbyPermits[lang]}
                </div>
                <div className="space-y-2">
                  {mockPermits.map((permit, idx) => (
                    <div key={idx} className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          permit.status === 'APPROVED' ? 'text-green-400' : 'text-amber-400'
                        }`}>
                          {permit.status === 'APPROVED' ? LABELS.approved[lang] : LABELS.pending[lang]}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{permit.code}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {permit.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
