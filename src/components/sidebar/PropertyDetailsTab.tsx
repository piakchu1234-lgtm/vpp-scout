'use client';
import React from 'react';
import { BedDouble, Bath, Car, Maximize, Ruler, Mountain, Compass, Building2, MapPin, School } from 'lucide-react';
import SSDFeasibilityWidget from './SSDFeasibilityWidget';

type Lang = 'en' | 'zh';
type Bi = { en: string; zh: string };

const MOCK_DOMAIN_DATA: {
  address: Bi;
  lotPlan: string;
  beds: number;
  baths: number;
  cars: number;
  dimensions: {
    landSize: string;
    floorArea: string;
    frontage: string;
    slope: Bi;
    orientation: Bi;
  };
  market: {
    lastSoldPrice: string;
    lastSoldDate: Bi;
    estimateRange: string;
    confidence: Bi;
  };
  context: {
    council: Bi;
    schools: Bi;
  };
} = {
  address: {
    en: '62 Chandler Road, Noble Park, VIC 3174',
    zh: '维多利亚州 Noble Park 3174 Chandler Road 62 号',
  },
  lotPlan: 'Lot 2 PS143510',
  beds: 3,
  baths: 1,
  cars: 2,
  dimensions: {
    landSize: '711m²',
    floorArea: '145m²',
    frontage: '19.36m',
    slope: { en: '3m across land', zh: '场地落差 3 m' },
    orientation: { en: 'North-West', zh: '西北' },
  },
  market: {
    lastSoldPrice: '$710,000',
    lastSoldDate: { en: '11 May 2024', zh: '2024 年 5 月 11 日' },
    estimateRange: '$700,000 – $780,000',
    confidence: { en: 'High Confidence', zh: '高置信度' },
  },
  context: {
    council: {
      en: 'Greater Dandenong City Council',
      zh: 'Greater Dandenong 市议会',
    },
    schools: {
      en: 'Noble Park Primary (0.8 km), Keysborough Secondary (1.2 km)',
      zh: 'Noble Park Primary 小学(0.8 公里),Keysborough Secondary 中学(1.2 公里)',
    },
  },
};

const COPY: Record<Lang, {
  lotPlanLabel: string;
  siteDimensions: string;
  landSize: string;
  floorArea: string;
  frontage: string;
  elevation: string;
  orientation: string;
  marketInsight: string;
  estimatedValue: string;
  lastSold: string;
  contractDate: string;
  localContext: string;
  councilAuthority: string;
  nearbySchools: string;
  streetView: string;
  streetViewPending: string;
  tbc: string;
}> = {
  en: {
    lotPlanLabel: 'Lot / Plan',
    siteDimensions: 'Site Dimensions',
    landSize: 'Land Size',
    floorArea: 'Floor Area',
    frontage: 'Frontage',
    elevation: 'Elevation',
    orientation: 'Orientation',
    marketInsight: 'Market Insight',
    estimatedValue: 'Estimated Value',
    lastSold: 'Last Sold',
    contractDate: 'Contract Date',
    localContext: 'Local Context',
    councilAuthority: 'Council Authority',
    nearbySchools: 'Nearby Schools',
    streetView: 'Street View',
    streetViewPending: '[Street View pending API key]',
    tbc: 'TBC',
  },
  zh: {
    lotPlanLabel: '地块 / 规划号',
    siteDimensions: '场地尺寸',
    landSize: '地块面积',
    floorArea: '建筑面积',
    frontage: '临街宽度',
    elevation: '高差',
    orientation: '朝向',
    marketInsight: '市场洞察',
    estimatedValue: '估值区间',
    lastSold: '上次成交',
    contractDate: '合同日期',
    localContext: '周边信息',
    councilAuthority: '地方议会',
    nearbySchools: '周边学校',
    streetView: '街景视图',
    streetViewPending: '[街景视图待 API 密钥配置]',
    tbc: 'TBC',
  },
};

type Props = {
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  landSizeM2?: number | null;
  lotPlan?: string | null;
  lang?: Lang;
};

export default function PropertyDetailsTab({
  address,
  lat: latProp,
  lon: lonProp,
  landSizeM2,
  lotPlan,
  lang = 'en',
}: Props = {}) {
  const t = COPY[lang];
  const data = MOCK_DOMAIN_DATA;
  const googleMapsKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '').trim().replace(/[\"']/g, '');
  const displayAddress = address?.trim() || data.address[lang];
  const displayLotPlan = lotPlan?.trim() || data.lotPlan;
  const displayLandSize =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0
      ? `${Math.round(landSizeM2)}m²`
      : t.tbc;
  const lat = typeof latProp === 'number' && Number.isFinite(latProp) ? latProp : -37.9622;
  const lon = typeof lonProp === 'number' && Number.isFinite(lonProp) ? lonProp : 145.1764;

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300">

      {/* 0. SSD Feasibility */}
      <SSDFeasibilityWidget landSizeM2={landSizeM2 ?? null} lang={lang} />

      {/* 1. Header & Dwelling Composition */}
      <div className="flex flex-col gap-4 bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white mb-1 leading-snug break-words">
            {displayAddress}
          </h2>
          <p className="text-sm text-zinc-400 font-mono break-all">
            {t.lotPlanLabel}: {displayLotPlan}
          </p>
        </div>

        <div className="flex items-center gap-6 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-zinc-400" />
            <span className="font-semibold text-lg">{data.beds}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bath className="w-5 h-5 text-zinc-400" />
            <span className="font-semibold text-lg">{data.baths}</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-zinc-400" />
            <span className="font-semibold text-lg">{data.cars}</span>
          </div>
        </div>
      </div>

      {/* 2. Physical Attributes */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
          {t.siteDimensions}
        </h3>
        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Maximize className="w-4 h-4 text-[#E9E778] flex-none" />
              <span className="text-xs uppercase tracking-wide truncate">{t.landSize}</span>
            </div>
            <p className="font-semibold text-lg">{displayLandSize}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Building2 className="w-4 h-4 text-[#E9E778] flex-none" />
              <span className="text-xs uppercase tracking-wide truncate">{t.floorArea}</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.floorArea}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Ruler className="w-4 h-4 text-[#E9E778] flex-none" />
              <span className="text-xs uppercase tracking-wide truncate">{t.frontage}</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.frontage}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Mountain className="w-4 h-4 text-[#E9E778] flex-none" />
              <span className="text-xs uppercase tracking-wide truncate">{t.elevation}</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.slope[lang]}</p>
          </div>
          <div className="col-span-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Compass className="w-4 h-4 text-[#E9E778] flex-none" />
                <span className="text-xs uppercase tracking-wide">{t.orientation}</span>
              </div>
              <p className="font-medium text-sm">{data.dimensions.orientation[lang]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Market Data */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
          {t.marketInsight}
        </h3>
        <div className="mb-6">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{t.estimatedValue}</p>
          <div className="flex items-end justify-between mb-2">
            <p className="text-xl font-bold text-white tabular-nums">{data.market.estimateRange}</p>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#E9E778] w-[85%] rounded-full"></div>
          </div>
          <p className="text-xs text-[#E9E778]">{data.market.confidence[lang]}</p>
        </div>
        <div className="pt-4 border-t border-white/10 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{t.lastSold}</p>
            <p className="font-semibold text-lg tabular-nums">{data.market.lastSoldPrice}</p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{t.contractDate}</p>
            <p className="text-sm font-medium">{data.market.lastSoldDate[lang]}</p>
          </div>
        </div>
      </div>

      {/* 4. Local Context */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
          {t.localContext}
        </h3>
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E9E778] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{t.councilAuthority}</p>
              <p className="text-xs text-zinc-400 break-words">{data.context.council[lang]}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <School className="w-5 h-5 text-[#E9E778] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{t.nearbySchools}</p>
              <p className="text-xs text-zinc-400 leading-relaxed break-words">
                {data.context.schools[lang]}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full h-48 rounded-lg overflow-hidden border border-white/10 bg-black relative group">
          {googleMapsKey ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/streetview?key=${googleMapsKey}&location=${lat},${lon}&heading=210&pitch=10&fov=90`}
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-zinc-500">
              {t.streetViewPending}
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] uppercase tracking-wider border border-white/10 font-medium text-white">
            {t.streetView}
          </div>
        </div>
      </div>
    </div>
  );
}
