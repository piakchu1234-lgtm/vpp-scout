'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import PropertyDetailsTab from '@/components/sidebar/PropertyDetailsTab';
import DevelopmentPotentialTab from '@/components/sidebar/DevelopmentPotentialTab';
import FeasibilityTab from '@/components/sidebar/FeasibilityTab';
import { MapPreview } from '@/components/MapPreview';
import { getMockParcelPolygon } from '@/lib/vicmap';

const MELBOURNE_FALLBACK = { lat: -37.8136, lon: 144.9631 };

type TabId = 'property' | 'potential' | 'feasibility';

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: 'property', label: 'Property' },
  { id: 'potential', label: 'Potential' },
  { id: 'feasibility', label: 'Feasibility' },
];

function AppCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const address = params.get('address');
  const latParam = params.get('lat');
  const lonParam = params.get('lon');
  const lat = latParam ? Number(latParam) : MELBOURNE_FALLBACK.lat;
  const lon = lonParam ? Number(lonParam) : MELBOURNE_FALLBACK.lon;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  const parcel = useMemo(
    () => (hasCoords ? getMockParcelPolygon(lat, lon) : null),
    [hasCoords, lat, lon],
  );
  const [activeTab, setActiveTab] = useState<TabId>('property');

  return (
    <div className="relative min-h-screen w-full bg-[#241F21] text-white font-sans selection:bg-[#E9E778] selection:text-[#241F21]">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#241F21]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-zinc-300 hover:text-[#E9E778] hover:bg-white/5 transition-colors"
            aria-label="Back to search"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#E9E778] rounded-sm flex items-center justify-center">
              <MapIcon className="text-[#241F21] w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight">SimplySite</span>
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-mono truncate max-w-[40ch]">
          {address ?? 'No address selected'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] min-h-[calc(100vh-65px)]">
        <section className="relative border-r border-white/10 bg-[#241F21] overflow-hidden">
          {hasCoords ? (
            <MapPreview
              lat={lat}
              lon={lon}
              polygon={parcel?.geometry ?? null}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
              Invalid coordinates
            </div>
          )}
        </section>

        <aside className="bg-[#241F21] flex flex-col overflow-hidden">
          <nav className="flex items-center gap-1 px-6 pt-6 pb-3 border-b border-white/10 bg-[#241F21] sticky top-0 z-10">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  aria-pressed={active}
                  className={`relative px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                    tab.disabled
                      ? 'text-zinc-600 cursor-not-allowed'
                      : active
                        ? 'text-[#E9E778]'
                        : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[13px] h-0.5 bg-[#E9E778] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'property' && <PropertyDetailsTab />}
            {activeTab === 'potential' && <DevelopmentPotentialTab />}
            {activeTab === 'feasibility' && <FeasibilityTab />}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AppRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#241F21]" />}>
      <AppCanvas />
    </Suspense>
  );
}
