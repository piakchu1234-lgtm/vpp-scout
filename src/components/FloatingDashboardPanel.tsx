'use client';

import React, { useMemo } from 'react';
import {
  Home,
  Bed,
  Bath,
  Car,
  Compass,
  TrendingUp,
  Calendar,
  Lock,
  School,
  ShoppingCart,
  Heart,
  Navigation,
} from 'lucide-react';

type Lang = 'en' | 'zh';

type PropertyData = {
  address?: string;
  landSizeM2?: number;
  frontageM?: number;
  bedrooms?: number;
  bathrooms?: number;
  carspaces?: number;
  orientation?: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' | null;
  estimatedValue?: number;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  salesHistory?: Array<{
    date: string;
    price: number;
  }>;
  schoolZones?: Array<{ schoolName: string; type: 'primary' | 'secondary' }>;
  crimeStats?: { incidents: number; ratePer100k: number } | null;
};

type FloatingDashboardPanelProps = {
  lang: Lang;
  propertyData?: PropertyData;
  isPro: boolean;
  onUpgrade?: () => void;
  isSidebarOpen?: boolean;
};

const LABELS = {
  siteIdentity: { en: 'Site Identity', zh: '场地信息' },
  landSize: { en: 'Land Size', zh: '地块面积' },
  frontage: { en: 'Frontage', zh: '临街面宽' },
  bedrooms: { en: 'Bedrooms', zh: '卧室' },
  bathrooms: { en: 'Bathrooms', zh: '浴室' },
  carSpaces: { en: 'Car Spaces', zh: '车位' },
  orientation: { en: 'Orientation', zh: '朝向' },
  marketValue: { en: 'Market Intelligence', zh: '市场情报' },
  estimatedValue: { en: 'Estimated Value', zh: '估值' },
  lastSold: { en: 'Last Sold', zh: '最近成交' },
  salesHistory: { en: 'Sales Timeline', zh: '交易历史' },
  community: { en: 'Community & Lifestyle', zh: '社区与生活' },
  upgradePrompt: { en: 'Unlock premium insights', zh: '解锁高级功能' },
  upgradeCTA: { en: 'Upgrade to Pro', zh: '升级至专业版' },
  north: { en: 'North', zh: '北' },
  south: { en: 'South', zh: '南' },
  east: { en: 'East', zh: '东' },
  west: { en: 'West', zh: '西' },
  northeast: { en: 'Northeast', zh: '东北' },
  northwest: { en: 'Northwest', zh: '西北' },
  southeast: { en: 'Southeast', zh: '东南' },
  southwest: { en: 'Southwest', zh: '西南' },
};

export default function FloatingDashboardPanel({
  lang,
  propertyData,
  isPro,
  onUpgrade,
  isSidebarOpen = true,
}: FloatingDashboardPanelProps) {
  const formatPrice = (price: number) => {
    if (price >= 1_000_000) {
      return `$${(price / 1_000_000).toFixed(2)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getOrientationLabel = (orientation: PropertyData['orientation']) => {
    if (!orientation) return '—';
    return LABELS[orientation][lang];
  };

  // Dynamic compass rotation based on orientation
  const compassRotation = useMemo(() => {
    const rotationMap: Record<string, number> = {
      north: 0,
      northeast: 45,
      east: 90,
      southeast: 135,
      south: 180,
      southwest: 225,
      west: 270,
      northwest: 315,
    };
    return propertyData?.orientation ? rotationMap[propertyData.orientation] ?? 0 : 0;
  }, [propertyData?.orientation]);

  return (
    <div
      className={`absolute bottom-6 left-6 z-40 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'right-[450px]' : 'right-6'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: Site Identity & Physical Dimensions */}
        <div className="bg-charcoal/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl min-w-[250px] flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-lime" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              {LABELS.siteIdentity[lang]}
            </h3>
          </div>

          <div className="space-y-3">
            {/* Land Size */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{LABELS.landSize[lang]}</span>
              <span className="text-sm font-bold text-white">
                {propertyData?.landSizeM2
                  ? `${propertyData.landSizeM2.toLocaleString()} m²`
                  : '—'}
              </span>
            </div>

            {/* Frontage */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{LABELS.frontage[lang]}</span>
              <span className="text-sm font-bold text-white">
                {propertyData?.frontageM ? `${propertyData.frontageM.toFixed(1)} m` : '—'}
              </span>
            </div>

            {/* Property Attributes */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4 text-lime" />
                  <span className="text-sm font-semibold text-white">
                    {propertyData?.bedrooms ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4 text-lime" />
                  <span className="text-sm font-semibold text-white">
                    {propertyData?.bathrooms ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Car className="w-4 h-4 text-lime" />
                  <span className="text-sm font-semibold text-white">
                    {propertyData?.carspaces ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Orientation Compass */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-zinc-400">{LABELS.orientation[lang]}</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Compass className="w-4 h-4 text-zinc-600" />
                  <Navigation
                    className="w-4 h-4 text-lime absolute top-0 left-0 transition-transform duration-500"
                    style={{ transform: `rotate(${compassRotation}deg)` }}
                  />
                </div>
                <span className="text-sm font-bold text-lime">
                  {getOrientationLabel(propertyData?.orientation)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Market Intelligence & Sales History */}
        <div className="bg-charcoal/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl min-w-[250px] flex-1">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-lime" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              {LABELS.marketValue[lang]}
            </h3>
          </div>

          <div className="space-y-3">
            {/* Estimated Value */}
            <div>
              <span className="text-xs text-zinc-400 block mb-1">
                {LABELS.estimatedValue[lang]}
              </span>
              <span className="text-2xl font-bold text-white">
                {propertyData?.estimatedValue
                  ? formatPrice(propertyData.estimatedValue)
                  : '—'}
              </span>
            </div>

            {/* Last Sold */}
            {propertyData?.lastSoldPrice && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">{LABELS.lastSold[lang]}</span>
                  <Calendar className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {formatPrice(propertyData.lastSoldPrice)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {propertyData.lastSoldDate ?? '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Sales Timeline */}
            {propertyData?.salesHistory && propertyData.salesHistory.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <span className="text-xs text-zinc-400 block mb-3">
                  {LABELS.salesHistory[lang]}
                </span>
                <div className="relative">
                  {/* Vertical timeline connector */}
                  <div className="absolute left-1 top-0 bottom-0 w-px bg-lime/30" />

                  <div className="space-y-3">
                    {propertyData.salesHistory.slice(0, 3).map((sale, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-lime flex-shrink-0 relative z-10 ring-2 ring-charcoal" />
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-xs font-semibold text-white">
                            {formatPrice(sale.price)}
                          </span>
                          <span className="text-xs text-zinc-500">{sale.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Community, Lifestyle & Safety (Tier-Locked State) */}
        <div
          className={`relative rounded-xl p-5 shadow-2xl transition-all min-w-[250px] flex-1 ${
            isPro
              ? 'bg-charcoal/85 backdrop-blur-md border border-white/10'
              : 'bg-charcoal/95 backdrop-blur-lg border border-neutral-800'
          }`}
        >
          {!isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <Lock className="w-8 h-8 text-lime" />
              <p className="text-sm text-zinc-400 text-center px-4">
                {LABELS.upgradePrompt[lang]}
              </p>
              <button
                type="button"
                onClick={onUpgrade}
                className="px-6 py-2.5 bg-lime text-charcoal rounded-lg font-semibold text-sm hover:bg-lime/90 transition-colors shadow-lg"
              >
                {LABELS.upgradeCTA[lang]}
              </button>
            </div>
          )}

          <div className={`${!isPro ? 'opacity-20 blur-sm' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-lime" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {LABELS.community[lang]}
              </h3>
            </div>

            <div className="space-y-3">
              {/* Schools */}
              {propertyData?.schoolZones && propertyData.schoolZones.length > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-lime" />
                    <span className="text-xs text-zinc-400">
                      {lang === 'en' ? 'Schools in Catchment' : '学区学校'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {propertyData.schoolZones.length} nearby
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-zinc-600" />
                    <span className="text-xs text-zinc-500">
                      {lang === 'en' ? 'Schools in Catchment' : '学区学校'}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600">—</span>
                </div>
              )}

              {/* Safety Score from Crime Stats */}
              {propertyData?.crimeStats ? (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-zinc-400">
                    {lang === 'en' ? 'Safety Score' : '安全评分'}
                  </span>
                  <span className="text-sm font-bold text-lime">
                    {((1 - (propertyData.crimeStats.ratePer100k / 10000)) * 10).toFixed(1)}/10
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-zinc-500">
                    {lang === 'en' ? 'Safety Score' : '安全评分'}
                  </span>
                  <span className="text-sm text-zinc-600">—</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
