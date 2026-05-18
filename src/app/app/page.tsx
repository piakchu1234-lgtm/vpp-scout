'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Map as MapIcon } from 'lucide-react';
import area from '@turf/area';
import PropertyDetailsTab from '@/components/sidebar/PropertyDetailsTab';
import PlanningConstraintsTab, {
  describeOverlayCode,
  type PlanningOverlay,
} from '@/components/sidebar/PlanningConstraintsTab';
import DevelopmentPotentialTab from '@/components/sidebar/DevelopmentPotentialTab';
import FeasibilityTab from '@/components/sidebar/FeasibilityTab';
import StorefrontDrawer from '@/components/sidebar/StorefrontDrawer';
import { MapPreview } from '@/components/MapPreview';
import {
  fetchVicParcelForPoint,
  fetchVicPlanForPoint,
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';

const MELBOURNE_FALLBACK = { lat: -37.8136, lon: 144.9631 };
const VICMAP_TIMEOUT_MS = 5000;

type TabId = 'property' | 'planning' | 'potential' | 'feasibility';

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: 'property', label: 'Property' },
  { id: 'planning', label: 'Planning' },
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

  const [polygon, setPolygon] = useState<ParcelPolygon | null>(null);
  const [spi, setSpi] = useState<string | null>(null);
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);
  const [planData, setPlanData] = useState<VicPlanData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('property');
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);

  useEffect(() => {
    if (!hasCoords) return;
    let stale = false;
    setParcelLoading(true);
    setParcelMessage(null);
    setPolygon(null);
    setSpi(null);
    setPlanData(null);

    fetchVicParcelForPoint(lon, lat, VICMAP_TIMEOUT_MS)
      .then((result) => {
        if (stale) return;
        setPolygon(result?.polygon ?? null);
        setSpi(result?.spi ?? null);
        if (!result) setParcelMessage('No parcel found at this point');
      })
      .catch((err: unknown) => {
        if (stale) return;
        const isTimeout =
          err instanceof Error && /timeout|ECONNABORTED/i.test(err.message);
        console.warn('[AppCanvas] parcel fetch failed', err);
        setParcelMessage(
          isTimeout ? 'Vicmap timed out — no parcel rendered' : 'No parcel found at this point',
        );
      })
      .finally(() => {
        if (!stale) setParcelLoading(false);
      });

    fetchVicPlanForPoint(lon, lat, VICMAP_TIMEOUT_MS)
      .then((data) => {
        if (stale) return;
        setPlanData(data);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] plan fetch failed', err);
        setPlanData(null);
      });

    return () => {
      stale = true;
    };
  }, [hasCoords, lat, lon]);

  const landSizeM2 = useMemo(() => {
    if (!polygon) return null;
    try {
      const m2 = area({ type: 'Feature', properties: {}, geometry: polygon });
      return Number.isFinite(m2) && m2 > 0 ? m2 : null;
    } catch {
      return null;
    }
  }, [polygon]);

  const overlays: PlanningOverlay[] | null = useMemo(() => {
    if (!planData) return null;
    const seen = new Set<string>();
    const out: PlanningOverlay[] = [];
    for (const raw of planData.overlayRaw) {
      const code = raw.toUpperCase();
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({ code, name: describeOverlayCode(code) });
    }
    return out;
  }, [planData]);

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

      <div className="flex flex-col md:grid md:grid-cols-[1fr_420px] h-screen overflow-hidden">
        <section className="h-[40vh] md:h-full w-full shrink-0 relative bg-[#241F21] overflow-hidden">
          {hasCoords ? (
            <>
              <MapPreview
                lat={lat}
                lon={lon}
                polygon={polygon}
                className="h-full w-full"
              />
              {(parcelLoading || parcelMessage) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-xs font-medium tracking-wide pointer-events-none">
                  {parcelLoading && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#E9E778] animate-spin" />
                      <span className="text-zinc-200">Resolving parcel…</span>
                    </>
                  )}
                  {!parcelLoading && parcelMessage && (
                    <span className="text-zinc-400">{parcelMessage}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
              Invalid coordinates
            </div>
          )}
        </section>

        <aside className="flex-1 md:h-full flex flex-col overflow-hidden relative bg-[#241F21]">
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
            {activeTab === 'property' && (
              <PropertyDetailsTab
                address={address}
                lat={lat}
                lon={lon}
                landSizeM2={landSizeM2}
                lotPlan={spi}
              />
            )}
            {activeTab === 'planning' && (
              <PlanningConstraintsTab
                zoneCode={planData?.zoneCode ?? null}
                zoneDescription={planData?.zoneDescription ?? null}
                overlays={overlays}
              />
            )}
            {activeTab === 'potential' && <DevelopmentPotentialTab />}
            {activeTab === 'feasibility' && <FeasibilityTab />}
          </div>

          <div className="border-t border-white/10 bg-[#241F21] p-4">
            <button
              onClick={() => setIsStorefrontOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E9E778] py-3 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262]"
            >
              <Download className="h-4 w-4" />
              Download Reports & Title
            </button>
          </div>

          <StorefrontDrawer
            isOpen={isStorefrontOpen}
            onClose={() => setIsStorefrontOpen(false)}
            address={address}
            spi={spi}
          />
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
