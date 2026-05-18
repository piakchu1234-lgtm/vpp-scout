'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import PropertyDetailsTab from '@/components/sidebar/PropertyDetailsTab';
import DevelopmentPotentialTab from '@/components/sidebar/DevelopmentPotentialTab';

type TabId = 'property' | 'potential' | 'feasibility';

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: 'property', label: 'Property' },
  { id: 'potential', label: 'Potential' },
  { id: 'feasibility', label: 'Feasibility', disabled: true },
];

function AppCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const address = params.get('address');
  const lat = params.get('lat');
  const lon = params.get('lon');
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
        <section className="relative border-r border-white/10 bg-[#1a1517] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(233,231,120,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(233,231,120,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
          <div className="relative text-center px-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#E9E778]/10 border border-[#E9E778]/30 mb-4">
              <MapIcon className="w-6 h-6 text-[#E9E778]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Interactive Map</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              The parcel, building envelope, easements and overlays will render here.
            </p>
            {lat && lon && (
              <p className="mt-4 text-xs font-mono text-zinc-500">
                {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}
              </p>
            )}
          </div>
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
                  {tab.disabled && (
                    <span className="ml-1.5 text-[9px] text-zinc-600 font-medium">SOON</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'property' && <PropertyDetailsTab />}
            {activeTab === 'potential' && <DevelopmentPotentialTab />}
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
