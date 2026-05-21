'use client';
import React from 'react';
import { BedDouble, Bath, Car, Maximize, Ruler, Mountain, Compass, Building2, MapPin, School } from 'lucide-react';
import SSDFeasibilityWidget from './SSDFeasibilityWidget';

const MOCK_DOMAIN_DATA = {
  address: "62 Chandler Road, Noble Park, VIC 3174",
  lotPlan: "Lot 2 PS143510",
  beds: 3,
  baths: 1,
  cars: 2,
  dimensions: {
    landSize: "711m²",
    floorArea: "145m²",
    frontage: "19.36m",
    slope: "3m across land",
    orientation: "North-West",
  },
  market: {
    lastSoldPrice: "$710,000",
    lastSoldDate: "11 May 2024",
    estimateRange: "$700,000 - $780,000",
    confidence: "High Confidence",
  },
  context: {
    council: "Greater Dandenong City Council",
    schools: "Noble Park Primary (0.8km), Keysborough Secondary (1.2km)",
  }
};

type Props = {
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  landSizeM2?: number | null;
  lotPlan?: string | null;
  lang?: 'en' | 'zh';
};

export default function PropertyDetailsTab({
  address,
  lat: latProp,
  lon: lonProp,
  landSizeM2,
  lotPlan,
  lang = 'en',
}: Props = {}) {
  const data = MOCK_DOMAIN_DATA;
  const googleMapsKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '').trim().replace(/[\"']/g, '');
  const displayAddress = address?.trim() || data.address;
  const displayLotPlan = lotPlan?.trim() || data.lotPlan;
  const displayLandSize =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0
      ? `${Math.round(landSizeM2)}m²`
      : 'TBC';
  const lat = typeof latProp === 'number' && Number.isFinite(latProp) ? latProp : -37.9622;
  const lon = typeof lonProp === 'number' && Number.isFinite(lonProp) ? lonProp : 145.1764;

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300">

      {/* 0. SSD Feasibility — first thing users see; reads landSizeM2 from
          the Vicmap pipeline and renders eligibility + envelope metrics. */}
      <SSDFeasibilityWidget landSizeM2={landSizeM2 ?? null} lang={lang} />

      {/* 1. Header & Dwelling Composition */}
      <div className="flex flex-col gap-4 bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">{displayAddress}</h2>
          <p className="text-sm text-zinc-400 font-mono">Lot/Plan: {displayLotPlan}</p>
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
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Site Dimensions</h3>
        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Maximize className="w-4 h-4 text-[#E9E778]" />
              <span className="text-xs uppercase tracking-wide">Land Size</span>
            </div>
            <p className="font-semibold text-lg">{displayLandSize}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Building2 className="w-4 h-4 text-[#E9E778]" />
              <span className="text-xs uppercase tracking-wide">Floor Area</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.floorArea}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Ruler className="w-4 h-4 text-[#E9E778]" />
              <span className="text-xs uppercase tracking-wide">Frontage</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.frontage}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Mountain className="w-4 h-4 text-[#E9E778]" />
              <span className="text-xs uppercase tracking-wide">Elevation</span>
            </div>
            <p className="font-semibold text-lg">{data.dimensions.slope}</p>
          </div>
          <div className="col-span-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <Compass className="w-4 h-4 text-[#E9E778]" />
                <span className="text-xs uppercase tracking-wide">Orientation</span>
              </div>
              <p className="font-medium text-sm">{data.dimensions.orientation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Market Data */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Market Insight</h3>
        <div className="mb-6">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Estimated Value</p>
          <div className="flex items-end justify-between mb-2">
            <p className="text-xl font-bold text-white">{data.market.estimateRange}</p>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#E9E778] w-[85%] rounded-full"></div>
          </div>
          <p className="text-xs text-[#E9E778]">{data.market.confidence}</p>
        </div>
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Last Sold</p>
            <p className="font-semibold text-lg">{data.market.lastSoldPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Contract Date</p>
            <p className="text-sm font-medium">{data.market.lastSoldDate}</p>
          </div>
        </div>
      </div>

      {/* 4. Local Context */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Local Context</h3>
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E9E778] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Council Authority</p>
              <p className="text-xs text-zinc-400">{data.context.council}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <School className="w-5 h-5 text-[#E9E778] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Nearby Schools</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{data.context.schools}</p>
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
              [Street View pending API Key]
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] uppercase tracking-wider border border-white/10 font-medium text-white">
            Street View
          </div>
        </div>
      </div>
    </div>
  );
}
