'use client';

import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, Bed, Bath, Car, Calendar, Home, Save, FileText } from 'lucide-react';
import type { AIInsightData } from '@/app/app/page';

type Lang = 'en' | 'zh';

type PropertyInspectorProps = {
  aiInsight: AIInsightData | null;
  isLoadingAI: boolean;
  lang: Lang;
  onSaveToProject?: () => void;
  onPurchaseTitleSearch?: () => void;
};

const LABELS = {
  propertyDetails: { en: 'Property Details', zh: '物业详情' },
  planningHazards: { en: 'Planning & Hazards', zh: '规划与风险' },
  actions: { en: 'Actions', zh: '操作' },
  bedrooms: { en: 'Bedrooms', zh: '卧室' },
  bathrooms: { en: 'Bathrooms', zh: '浴室' },
  carspaces: { en: 'Carspaces', zh: '车位' },
  lastSold: { en: 'Last Sold', zh: '最后成交价' },
  yearBuilt: { en: 'Year Built', zh: '建成年份' },
  floorArea: { en: 'Floor Area', zh: '建筑面积' },
  overlays: { en: 'Overlays', zh: '规划覆盖区' },
  hazards: { en: 'Hazards', zh: '风险' },
  saveToProject: { en: 'Save to Project', zh: '保存至项目' },
  purchaseTitle: { en: 'Purchase Title & Easement Search', zh: '购买产权与地役权搜索' },
  noData: { en: 'No data available', zh: '暂无数据' },
  premium: { en: 'Premium', zh: '高级功能' },
};

export default function PropertyInspector({
  aiInsight,
  isLoadingAI,
  lang,
  onSaveToProject,
  onPurchaseTitleSearch,
}: PropertyInspectorProps) {
  if (isLoadingAI || !aiInsight) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="text-xs text-zinc-500">
          {isLoadingAI ? 'Loading property data…' : 'No property data available'}
        </div>
      </div>
    );
  }

  return (
    <Accordion.Root
      type="multiple"
      defaultValue={['property-details', 'planning-hazards', 'actions']}
      className="space-y-3"
    >
      {/* Section 1: Property Details */}
      <Accordion.Item
        value="property-details"
        className="rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden"
      >
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-700/30">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
              {LABELS.propertyDetails[lang]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Bedrooms */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
              <Bed className="w-4 h-4 text-zinc-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.bedrooms[lang]}
                </div>
                <div className="text-sm font-bold text-white">
                  {aiInsight.bedrooms ?? '—'}
                </div>
              </div>
            </div>

            {/* Bathrooms */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
              <Bath className="w-4 h-4 text-zinc-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.bathrooms[lang]}
                </div>
                <div className="text-sm font-bold text-white">
                  {aiInsight.bathrooms ?? '—'}
                </div>
              </div>
            </div>

            {/* Carspaces */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
              <Car className="w-4 h-4 text-zinc-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.carspaces[lang]}
                </div>
                <div className="text-sm font-bold text-white">
                  {aiInsight.carspaces ?? '—'}
                </div>
              </div>
            </div>

            {/* Last Sold */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.lastSold[lang]}
                </div>
                <div className="text-sm font-bold text-white">
                  {aiInsight.estimatedLastSoldPrice ?? '—'}
                </div>
              </div>
            </div>

            {/* Year Built - Premium placeholder */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-600/20 px-3 py-2">
              <Home className="w-4 h-4 text-zinc-500" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.yearBuilt[lang]}
                </div>
                <div className="text-xs font-medium text-zinc-500">
                  {LABELS.premium[lang]}
                </div>
              </div>
            </div>

            {/* Floor Area - Premium placeholder */}
            <div className="flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-600/20 px-3 py-2">
              <Home className="w-4 h-4 text-zinc-500" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {LABELS.floorArea[lang]}
                </div>
                <div className="text-xs font-medium text-zinc-500">
                  {LABELS.premium[lang]}
                </div>
              </div>
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>

      {/* Section 2: Planning & Hazards */}
      <Accordion.Item
        value="planning-hazards"
        className="rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden"
      >
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-700/30">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
              {LABELS.planningHazards[lang]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
          <div className="space-y-3 pt-2">
            {/* Overlays */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                {LABELS.overlays[lang]}
              </div>
              {aiInsight.overlays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {aiInsight.overlays.map((overlay, idx) => {
                    const code = overlay.code.toUpperCase();
                    let badgeStyle = 'bg-blue-900/40 border-blue-700 text-blue-200';

                    if (code.includes('HO')) {
                      badgeStyle = 'bg-amber-900/40 border-amber-700 text-amber-200';
                    } else if (code.includes('BMO')) {
                      badgeStyle = 'bg-orange-900/40 border-orange-700 text-orange-200';
                    } else if (code.includes('FO') || code.includes('LSIO') || code.includes('SBO')) {
                      badgeStyle = 'bg-blue-900/40 border-blue-700 text-blue-200';
                    }

                    return (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${badgeStyle}`}
                      >
                        <span className="text-xs font-bold">{code}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">{LABELS.noData[lang]}</div>
              )}
            </div>

            {/* Hazards */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                {LABELS.hazards[lang]}
              </div>
              {aiInsight.hazards.length > 0 ? (
                <ul className="space-y-1">
                  {aiInsight.hazards.map((hazard, idx) => (
                    <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{hazard}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-zinc-500">{LABELS.noData[lang]}</div>
              )}
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>

      {/* Section 3: SaaS Actions */}
      <Accordion.Item
        value="actions"
        className="rounded-lg border border-zinc-700 bg-zinc-800/50 overflow-hidden"
      >
        <Accordion.Header>
          <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-700/30">
            <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">
              {LABELS.actions[lang]}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="px-4 pb-4 data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
          <div className="space-y-2 pt-2">
            {/* Save to Project */}
            <button
              onClick={onSaveToProject}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#E9E778] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262]"
            >
              <Save className="w-4 h-4" />
              {LABELS.saveToProject[lang]}
            </button>

            {/* Purchase Title & Easement Search */}
            <button
              onClick={onPurchaseTitleSearch}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-[#E9E778] bg-transparent px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#E9E778] transition-colors hover:bg-[#E9E778]/10"
            >
              <FileText className="w-4 h-4" />
              {LABELS.purchaseTitle[lang]}
            </button>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
