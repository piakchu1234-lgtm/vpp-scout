/**
 * BOTTOM PANEL - Floating Context Cards
 *
 * Victorian property intelligence: Three floating cards at bottom-left showing
 * Site Identity, Market Intel, and Lifestyle data.
 */

'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

type BottomPanelProps = {
  // Physical Traits
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  lotSize?: string;
  frontage?: string;
  orientation?: string;

  // Market Context
  estimatedValue?: string;
  lastSaleDate?: string;
  lastSalePrice?: string;

  // Neighborhood Context (PRO Features)
  schoolZones?: Array<{ schoolName: string; type: 'primary' | 'secondary' }>;
  crimeStats?: { incidents: number; ratePer100k: number } | null;

  // System
  language: 'en' | 'zh';
};

// Data point component for consistent styling
function DataPoint({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-sm font-semibold mt-0.5 ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export default function BottomPanel({
  bedrooms,
  bathrooms,
  carSpaces,
  lotSize,
  frontage,
  orientation,
  estimatedValue,
  lastSaleDate,
  lastSalePrice,
  schoolZones = [],
  crimeStats,
  language,
}: BottomPanelProps) {
  const { has, isLoaded } = useAuth();
  const isPro = isLoaded && (has?.({ plan: 'pro' }) ?? false);

  // Show Site Identity card if we have any site data
  const hasSiteData = lotSize || frontage || orientation || bedrooms !== undefined || bathrooms !== undefined || carSpaces !== undefined;

  // Show Market Intel card if we have any market data
  const hasMarketData = estimatedValue || lastSalePrice || lastSaleDate;

  // Show Lifestyle card if we have any lifestyle data
  const hasLifestyleData = schoolZones.length > 0 || crimeStats;

  return (
    // Container - pointer-events-none so map remains clickable through empty space
    <div className="fixed bottom-12 left-8 z-50 flex items-end gap-4 pointer-events-none max-w-[calc(100vw-440px)]">

      {/* Card 1: Site Identity */}
      {hasSiteData && (
        <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-5 py-4 pointer-events-auto min-w-[240px]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-white text-xs font-bold uppercase tracking-wide">
              {language === 'en' ? 'Site Identity' : '场地信息'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Bed/Bath/Car */}
            {bedrooms !== undefined && (
              <DataPoint
                label={language === 'en' ? 'BED' : '卧室'}
                value={bedrooms.toString()}
              />
            )}
            {bathrooms !== undefined && (
              <DataPoint
                label={language === 'en' ? 'BATH' : '浴室'}
                value={bathrooms.toString()}
              />
            )}
            {carSpaces !== undefined && (
              <DataPoint
                label={language === 'en' ? 'CAR' : '车位'}
                value={carSpaces.toString()}
              />
            )}

            {/* Lot Size & Frontage */}
            {lotSize && (
              <DataPoint
                label={language === 'en' ? 'LOT SIZE' : '地块'}
                value={lotSize}
              />
            )}
            {frontage && (
              <DataPoint
                label={language === 'en' ? 'FRONTAGE' : '临街'}
                value={frontage}
              />
            )}
            {orientation && (
              <DataPoint
                label={language === 'en' ? 'ORIENTATION' : '朝向'}
                value={orientation}
              />
            )}
          </div>
        </div>
      )}

      {/* Card 2: Market Intel */}
      {hasMarketData && (
        <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-5 py-4 pointer-events-auto min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-white text-xs font-bold uppercase tracking-wide">
              {language === 'en' ? 'Market Intel' : '市场情报'}
            </h3>
          </div>

          <div className="space-y-3">
            {estimatedValue && (
              <DataPoint
                label={language === 'en' ? 'EST. VALUE' : '估价'}
                value={estimatedValue}
                highlight
              />
            )}
            {lastSalePrice && (
              <DataPoint
                label={language === 'en' ? 'LAST SALE' : '上次售价'}
                value={lastSalePrice}
              />
            )}
            {lastSaleDate && (
              <DataPoint
                label={language === 'en' ? 'SALE DATE' : '日期'}
                value={lastSaleDate}
              />
            )}
          </div>
        </div>
      )}

      {/* Card 3: Lifestyle (PRO) */}
      {hasLifestyleData && (
        <div className="relative bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-5 py-4 pointer-events-auto min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-white text-xs font-bold uppercase tracking-wide">
              {language === 'en' ? 'Lifestyle' : '生活方式'}
            </h3>
            {!isPro && <Lock className="w-3 h-3 text-emerald-400 ml-1" />}
          </div>

          <div className={`space-y-3 ${!isPro ? 'blur-sm' : ''}`}>
            {schoolZones.length > 0 && (
              <DataPoint
                label={language === 'en' ? 'SCHOOLS' : '学校'}
                value={`${schoolZones.length} nearby`}
              />
            )}
            {crimeStats && (
              <DataPoint
                label={language === 'en' ? 'SAFETY' : '安全'}
                value={`${crimeStats.ratePer100k.toFixed(0)} /100k`}
              />
            )}
          </div>

          {/* Pro upgrade prompt */}
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm rounded-2xl">
              <button
                onClick={() => window.location.href = '/pricing'}
                className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
              >
                {language === 'en' ? 'Upgrade to Pro' : '升级至专业版'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
