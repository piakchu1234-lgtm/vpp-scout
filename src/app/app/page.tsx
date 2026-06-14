'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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
import SuccessModal from '@/components/sidebar/SuccessModal';
import ComprehensiveReport from '@/components/report/ComprehensiveReport';
import ComplianceStatus from '@/components/dashboard/ComplianceStatus';
import PropertyInspector from '@/components/dashboard/PropertyInspector';
import { MapPreview } from '@/components/MapPreview';
import MapControlsToolbar from '@/components/MapControlsToolbar';
import {
  fetchVicParcelForPoint,
  fetchVicPlanForPoint,
  type ParcelPolygon,
  type VicPlanData,
} from '@/lib/vicPlanApi';
import { fetchLgaForPoint } from '@/lib/lgaApi';
import { reverseGeocodeNearest } from '@/lib/geocoding';
import { calculateYield, emptyYield, type YieldData } from '@/lib/yieldEngine';

const MELBOURNE_FALLBACK = { lat: -37.8136, lon: 144.9631 };
const VICMAP_TIMEOUT_MS = 15000;

export type AIOverlay = { code: string; description: string };

export type AINearbySchool = { name: string; distance: string };

export type AIInsightData = {
  insightSummary: string;
  executiveSummary: string;
  ssdFeasibility: {
    isEligible: boolean;
    reasoning: string;
  };
  isVacantLand: boolean;
  estimatedLandSizeM2: number;
  estimatedFrontage: string;
  marketEstimate: string;
  localCouncil: string;
  lotPlanNumber: string;
  zoning: string;
  zoningDescription: string;
  overlays: AIOverlay[];
  hazards: string[];
  bedrooms: number;
  bathrooms: number;
  carspaces: number;
  propertyOverview: string;
  designFeatures: string[];
  nearbySchools: AINearbySchool[];
  estimatedLastSoldPrice?: string;
  estimatedContractDate?: string;
};

type Lang = 'en' | 'zh';
type TabId = 'property' | 'planning' | 'potential' | 'feasibility';

const TAB_LABELS: Record<TabId, Record<Lang, string>> = {
  property: { en: 'Property', zh: '详情' },
  planning: { en: 'Planning', zh: '规划' },
  potential: { en: 'Potential', zh: '潜力' },
  feasibility: { en: 'Feasibility', zh: '可行性' },
};

const STOREFRONT_CTA: Record<Lang, string> = {
  en: 'Download Reports & Title',
  zh: '下载报告与产权文件',
};

const TABS: { id: TabId; disabled?: boolean }[] = [
  { id: 'property' },
  { id: 'planning' },
  { id: 'potential' },
  { id: 'feasibility' },
];

function AppCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const addressParam = params.get('address');
  const latParam = params.get('lat');
  const lonParam = params.get('lon');
  const lat = latParam ? Number(latParam) : MELBOURNE_FALLBACK.lat;
  const lon = lonParam ? Number(lonParam) : MELBOURNE_FALLBACK.lon;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  // Address recovery state — when the checkout pipeline drops the address
  // parameter but preserves lat/lon, we reverse-geocode to recover the
  // authoritative Vicmap address string so the AI insight fetch can proceed.
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  // Derived address state - clears recoveredAddress when addressParam is present
  const address = addressParam || recoveredAddress;
  const shouldRecoverAddress = !addressParam && hasCoords;

  const [polygon, setPolygon] = useState<ParcelPolygon | null>(null);
  const [spi, setSpi] = useState<string | null>(null);
  const [parcelLoading, setParcelLoading] = useState(false);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);
  const [planData, setPlanData] = useState<VicPlanData | null>(null);
  const [liveCouncil, setLiveCouncil] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('property');
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);
  const [language, setLanguage] = useState<Lang>('en');
  const [isNavigating, setIsNavigating] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsightData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  // Tracks whether the AI insight fetch has *settled at least once* for the
  // current address (success, failure, or cancellation). The post-checkout
  // auto-print path gates on this so the print can't fire before the
  // Auditor has had a chance to populate the report — `isLoadingAI`
  // alone is insufficient because it initialises false, opening a race
  // window on first render where the timer could fire with a null insight.
  const [hasAttemptedAI, setHasAttemptedAI] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportLanguage, setReportLanguage] = useState<'English' | 'Chinese'>('English');

  // Multi-parcel selection state for MapControlsToolbar
  const [selectedParcels, setSelectedParcels] = useState<ParcelPolygon[]>([]);

  const paymentParam = params.get('payment');
  const typeParam = params.get('type');
  const successType: 'ai-report' | 'title-search' | null =
    typeParam === 'ai-report' || typeParam === 'title-search' ? typeParam : null;
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(
    paymentParam === 'success',
  );

  useEffect(() => {
    if (paymentParam !== 'success') return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('session_id');
    url.searchParams.delete('type');
    window.history.replaceState({}, '', url.toString());
  }, [paymentParam]);

  // Address recovery — when the checkout pipeline drops the address parameter
  // but preserves lat/lon (payment success redirect), reverse-geocode to
  // recover the authoritative Vicmap address string so the AI insight fetch
  // can proceed. React 19: clear stale state via dependency-gated early return.
  useEffect(() => {
    if (addressParam) {
      // Address param present - clear recovery state asynchronously
      setRecoveredAddress(null);
      return;
    }
    if (!hasCoords) return;
    let cancelled = false;

    reverseGeocodeNearest(lon, lat)
      .then((hit) => {
        if (cancelled) return;
        if (hit?.result.displayName) {
          console.log('[AppCanvas] Recovered address from Vicmap:', hit.result.displayName);
          setRecoveredAddress(hit.result.displayName);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[AppCanvas] Address recovery failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [addressParam, hasCoords, lat, lon]);

  // Geospatial data fetch keyed to coordinates
  const coordKey = useMemo(() => `${lat},${lon}`, [lat, lon]);
  const prevCoordKeyRef = useRef<string>('');

  useEffect(() => {
    if (!hasCoords) return;

    // React 19 pattern: detect coordinate change via ref comparison instead of synchronous setState
    const coordChanged = prevCoordKeyRef.current !== coordKey;
    prevCoordKeyRef.current = coordKey;

    if (coordChanged) {
      setParcelLoading(true);
      setParcelMessage(null);
      setPolygon(null);
      setSpi(null);
      setPlanData(null);
      setLiveCouncil(null);
    }

    let stale = false;

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

    // Deterministic LGA lookup — Vicmap_Admin layer 0. Authoritative,
    // free, and doesn't depend on the AI Auditor returning successfully.
    // Council display in the sidebar prefers this over aiInsight.localCouncil.
    fetchLgaForPoint(lon, lat)
      .then((name) => {
        if (stale) return;
        setLiveCouncil(name);
      })
      .catch((err: unknown) => {
        if (stale) return;
        console.warn('[AppCanvas] LGA fetch failed', err);
        setLiveCouncil(null);
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

  const hasPrimaryLandSize =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0;

  // Single source of truth: fetch agentic insight at the page level for
  // every address (Vicmap parcel data covers geometry only — beds/baths/
  // overview/hazards/etc. always come from the AI Auditor). Phase-3 plan
  // wires this through a PostgreSQL cache to bound API spend.
  // State clearing is handled by the dependency change triggering a new fetch.
  const aiStateKeyRef = useRef(0);
  useEffect(() => {
    // Increment the key when dependencies change to invalidate stale state
    aiStateKeyRef.current += 1;
    const currentKey = aiStateKeyRef.current;

    if (!address) {
      setAiInsight(null);
      setHasAttemptedAI(false);
      setIsLoadingAI(false);
      return;
    }

    let cancelled = false;
    setIsLoadingAI(true);
    setAiInsight(null);
    setHasAttemptedAI(false);

    fetch('/api/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, language: reportLanguage }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (!cancelled && currentKey === aiStateKeyRef.current && response?.data) {
          setAiInsight(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled && currentKey === aiStateKeyRef.current) {
          console.error('[AppCanvas] AI insight fetch failed', err);
        }
      })
      .finally(() => {
        if (!cancelled && currentKey === aiStateKeyRef.current) {
          setIsLoadingAI(false);
          setHasAttemptedAI(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address, reportLanguage]);

  const effectiveLandSizeM2 = hasPrimaryLandSize
    ? landSizeM2
    : aiInsight?.estimatedLandSizeM2 ?? null;

  // Report preview handler — opens full-screen preview instead of directly printing
  const reportRef = useRef<HTMLDivElement>(null);
  const handleOpenPreview = () => {
    setShowReportPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Capture the print intent at mount so the existing URL-cleanup effect
  // (which strips ?payment=success via replaceState) can't race with us.
  const [shouldAutoOpenPreview, setShouldAutoOpenPreview] = useState(paymentParam === 'success');

  // Hold the preview until the AI Auditor settles. We require both
  // `hasAttemptedAI` (the fetch has been kicked off and finished — success
  // OR failure) and `!isLoadingAI` (no in-flight request right now). On
  // initial mount, isLoadingAI is false before the AI effect runs, so
  // gating on it alone opens a race window where the timer could fire
  // with aiInsight=null. hasAttemptedAI closes that window.
  useEffect(() => {
    if (!shouldAutoOpenPreview) return;
    if (!hasAttemptedAI) return;
    if (isLoadingAI) return;
    const id = window.setTimeout(() => {
      handleOpenPreview();
      setShouldAutoOpenPreview(false);
    }, 400);
    return () => window.clearTimeout(id);
  }, [shouldAutoOpenPreview, hasAttemptedAI, isLoadingAI]);

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

  const yieldData: YieldData = useMemo(() => {
    if (typeof landSizeM2 !== 'number' || !Number.isFinite(landSizeM2) || landSizeM2 <= 0) {
      return emptyYield(
        'Awaiting Vicmap parcel geometry — yield model will populate once the lot resolves.',
      );
    }
    return calculateYield(landSizeM2, planData?.zoneCode ?? '');
  }, [landSizeM2, planData?.zoneCode]);

  // Click-to-Fetch — when the user clicks a neighbouring cadastral parcel
  // in pan mode, reverse-geocode the point and push it into the URL.
  // The lat/lon-driven useEffect above then re-runs the parcel + planning
  // fetches automatically, so no extra state plumbing is needed.
  async function handleMapParcelClick(lonLat: [number, number]) {
    const [clickedLon, clickedLat] = lonLat;
    if (!Number.isFinite(clickedLon) || !Number.isFinite(clickedLat)) return;
    setIsNavigating(true);
    try {
      const hit = await reverseGeocodeNearest(clickedLon, clickedLat);
      const nextAddress = hit?.result.displayName
        ?? `${clickedLat.toFixed(6)}, ${clickedLon.toFixed(6)}`;
      const nextLat = hit?.result.lat ?? clickedLat;
      const nextLon = hit?.result.lon ?? clickedLon;
      const qs = new URLSearchParams({
        address: nextAddress,
        lat: String(nextLat),
        lon: String(nextLon),
      });
      router.push(`/app?${qs.toString()}`);
    } finally {
      setIsNavigating(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#241F21] text-white font-sans selection:bg-[#E9E778] selection:text-[#241F21]">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#241F21]/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
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
          <div className="h-5 w-px bg-white/10" />
          <div className="text-xs text-zinc-400 font-mono truncate max-w-[60ch]">
            {address ?? 'No address selected'}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:grid md:grid-cols-[1fr_500px] h-[100dvh] overflow-hidden">
        <section className="h-[40vh] md:h-full relative bg-[#241F21] overflow-hidden">
          {hasCoords ? (
            <>
              <MapPreview
                lat={lat}
                lon={lon}
                polygon={polygon}
                selectedParcels={selectedParcels}
                onParcelClick={handleMapParcelClick}
                className="h-full w-full"
              />
              <MapControlsToolbar
                selectedParcels={selectedParcels}
                onClearSelection={() => setSelectedParcels([])}
                lang={language}
              />
              {(parcelLoading || parcelMessage || isNavigating) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-xs font-medium tracking-wide pointer-events-none">
                  {isNavigating && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#E9E778] animate-spin" />
                      <span className="text-zinc-200">Resolving address…</span>
                    </>
                  )}
                  {!isNavigating && parcelLoading && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#E9E778] animate-spin" />
                      <span className="text-zinc-200">Resolving parcel…</span>
                    </>
                  )}
                  {!isNavigating && !parcelLoading && parcelMessage && (
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
                  {TAB_LABELS[tab.id][language]}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[13px] h-0.5 bg-[#E9E778] rounded-full" />
                  )}
                </button>
              );
            })}

            <div
              role="group"
              aria-label="Language toggle"
              className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={
                  language === 'en'
                    ? 'text-[#E9E778]'
                    : 'text-zinc-500 hover:text-zinc-200 transition-colors'
                }
              >
                EN
              </button>
              <span className="text-zinc-700">|</span>
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                aria-pressed={language === 'zh'}
                className={
                  language === 'zh'
                    ? 'text-[#E9E778]'
                    : 'text-zinc-500 hover:text-zinc-200 transition-colors'
                }
              >
                中文
              </button>
            </div>
          </nav>
          <div className="p-6 overflow-y-auto flex-1">
            {/* Deemed-to-Comply Status Block */}
            <ComplianceStatus
              landSizeM2={landSizeM2}
              zoneCode={planData?.zoneCode ?? null}
              overlays={overlays?.map((o) => o.code) ?? []}
              frontageM={
                aiInsight?.estimatedFrontage
                  ? parseFloat(aiInsight.estimatedFrontage.replace(/[^\d.]/g, '')) || null
                  : null
              }
              isVacantLand={aiInsight?.isVacantLand ?? false}
              isLoadingData={isLoadingAI || parcelLoading}
              lang={language}
            />

            {/* Property Inspector Accordion */}
            <PropertyInspector
              aiInsight={aiInsight}
              isLoadingAI={isLoadingAI}
              lang={language}
            />

            {/* Report Language Toggle */}
            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                Report Language
              </div>
              <div className="flex bg-zinc-800 p-1 rounded-md w-fit border border-zinc-700">
                <button
                  onClick={() => setReportLanguage('English')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    reportLanguage === 'English'
                      ? 'bg-zinc-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setReportLanguage('Chinese')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    reportLanguage === 'Chinese'
                      ? 'bg-zinc-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  中文
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'property' && (
                  <PropertyDetailsTab
                    address={address}
                    lat={lat}
                    lon={lon}
                    landSizeM2={landSizeM2}
                    lotPlan={spi}
                    lang={language}
                    aiInsight={aiInsight}
                    liveCouncil={liveCouncil}
                  />
                )}
                {activeTab === 'planning' && (
                  <PlanningConstraintsTab
                    zoneCode={planData?.zoneCode ?? null}
                    zoneDescription={planData?.zoneDescription ?? null}
                    overlays={overlays}
                    aiInsight={aiInsight}
                    effectiveLandSizeM2={effectiveLandSizeM2}
                    address={address}
                    lang={language}
                  />
                )}
                {activeTab === 'potential' && (
                  <DevelopmentPotentialTab yieldData={yieldData} />
                )}
                {activeTab === 'feasibility' && (
                  <FeasibilityTab yieldData={yieldData} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t border-white/10 bg-[#241F21] p-4">
            <button
              onClick={() => setIsStorefrontOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E9E778] py-3 text-sm font-bold uppercase tracking-wider text-[#241F21] transition-colors hover:bg-[#d4d262]"
            >
              <Download className="h-4 w-4" />
              {STOREFRONT_CTA[language]}
            </button>
          </div>

          <StorefrontDrawer
            isOpen={isStorefrontOpen}
            onClose={() => setIsStorefrontOpen(false)}
            address={address}
            spi={spi}
            lat={lat}
            lon={lon}
          />
        </aside>
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        type={successType}
        onClose={() => setIsSuccessModalOpen(false)}
        address={address}
        onDownload={handleOpenPreview}
        isLoadingData={isLoadingAI}
      />

      {/* Report Preview Mode — Full-screen scrollable preview with action bar */}
      {showReportPreview ? (
        <div className="fixed inset-0 z-[99999] min-h-screen bg-zinc-200 overflow-y-auto">
          {/* Floating Action Bar — Hidden during print */}
          <div className="sticky top-0 z-50 bg-white border-b border-zinc-300 shadow-sm print:hidden">
            <div className="max-w-[210mm] mx-auto px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowReportPreview(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Map
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#E9E778] text-[#241F21] text-sm font-bold uppercase tracking-wider hover:bg-[#d4d262] transition-colors"
              >
                <Download className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Report Container */}
          <div className="py-12 flex justify-center">
            <ComprehensiveReport
              ref={reportRef}
              address={address}
              lat={lat}
              lon={lon}
              landSizeM2={landSizeM2}
              lotPlan={spi}
              planData={planData}
              aiInsight={aiInsight}
              liveCouncil={liveCouncil}
            />
          </div>
        </div>
      ) : null}
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
