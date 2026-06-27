/**
 * BOTTOM DASHBOARD COMPONENT
 *
 * Glassmorphic cards anchored to bottom of viewport.
 * Displays key property metrics with premium SaaS styling.
 * Dynamically adjusts right margin when sidebar is open.
 */

'use client';

import React from 'react';
import { Home, DollarSign, Ruler, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyAnalysisData } from '@/hooks/usePropertyAnalysis';

type BottomDashboardProps = {
  /** Property analysis data from unified API */
  propertyData: PropertyAnalysisData | null;

  /** Is loading state */
  isLoading?: boolean;

  /** Is right sidebar expanded */
  isSidebarOpen?: boolean;

  /** Language preference */
  lang?: 'en' | 'zh';
};

export default function BottomDashboard({
  propertyData,
  isLoading = false,
  isSidebarOpen = false,
  lang = 'en',
}: BottomDashboardProps) {

  // Calculate dynamic right margin when sidebar is open
  const rightMargin = isSidebarOpen ? 'mr-[400px]' : 'mr-4';

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (!value) return lang === 'en' ? 'N/A' : '暂无';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format area
  const formatArea = (value: number | null) => {
    if (!value) return lang === 'en' ? 'N/A' : '暂无';
    return `${value.toFixed(0)} m²`;
  };

  // Cards data
  const cards = [
    {
      id: 'site-identity',
      icon: Home,
      title: lang === 'en' ? 'Site Identity' : '地块信息',
      value: propertyData?.address || (lang === 'en' ? 'Select a property' : '选择房产'),
      subtitle: propertyData?.lga ? `${propertyData.lga}` : null,
      color: 'brand-lime',
    },
    {
      id: 'market-value',
      icon: DollarSign,
      title: lang === 'en' ? 'Market Value' : '市场价值',
      value: formatCurrency(propertyData?.market.lastSoldPrice || null),
      subtitle: propertyData?.market.lastSoldDate
        ? `Sold ${new Date(propertyData.market.lastSoldDate).toLocaleDateString('en-AU')}`
        : null,
      color: 'brand-lime',
    },
    {
      id: 'lot-size',
      icon: Ruler,
      title: lang === 'en' ? 'Lot Size' : '地块面积',
      value: formatArea(propertyData?.dimensions.lotSizeSqm || null),
      subtitle: propertyData?.dimensions.frontageMeters
        ? `${propertyData.dimensions.frontageMeters.toFixed(1)}m frontage`
        : null,
      color: 'brand-lime',
    },
    {
      id: 'ssd-feasibility',
      icon: Zap,
      title: lang === 'en' ? 'SSD Feasibility' : 'SSD可行性',
      value: propertyData?.feasibility.ssdEligible
        ? (lang === 'en' ? 'Eligible' : '符合条件')
        : propertyData
          ? (lang === 'en' ? 'Not Eligible' : '不符合')
          : (lang === 'en' ? 'N/A' : '暂无'),
      subtitle: propertyData?.feasibility.highestBestUse || null,
      color: propertyData?.feasibility.ssdEligible ? 'brand-lime' : 'red-500',
    },
  ];

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-30 transition-all duration-300',
        rightMargin
      )}
    >
      <div className="flex gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.id}
              className={cn(
                'group relative',
                'w-64 p-4',
                'bg-brand-dark/80 backdrop-blur-xl',
                'border border-white/10',
                'rounded-xl shadow-2xl',
                'hover:border-brand-lime/30 hover:shadow-brand-lime/5',
                'transition-all duration-300',
                isLoading && 'animate-pulse'
              )}
            >
              {/* Top accent line */}
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 h-[2px]',
                  'bg-gradient-to-r from-transparent via-brand-lime to-transparent',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}
              />

              {/* Icon */}
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  'bg-brand-lime/10 border border-brand-lime/20'
                )}>
                  <Icon className="w-4 h-4 text-brand-lime" />
                </div>
              </div>

              {/* Title */}
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                {card.title}
              </div>

              {/* Value */}
              <div className={cn(
                'text-lg font-bold mb-1',
                propertyData ? 'text-white' : 'text-zinc-500'
              )}>
                {card.value}
              </div>

              {/* Subtitle */}
              {card.subtitle && (
                <div className="text-xs text-zinc-400 truncate">
                  {card.subtitle}
                </div>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand-lime/30 border-t-brand-lime rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
