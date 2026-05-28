'use client';
import React, { forwardRef } from 'react';
import type { AIInsightData } from '@/app/app/page';
import type { VicPlanData } from '@/lib/vicPlanApi';
import { describeOverlayCode } from '@/components/sidebar/PlanningConstraintsTab';

// ResCode / NCC 2026 screening constants — duplicated from
// SSDFeasibilityWidget. Keep in sync until extracted to src/lib/ssd.ts.
const SSD_MIN_LOT_SIZE_M2 = 300;
const SITE_COVERAGE_FRACTION = 0.6;
const PERMEABILITY_FRACTION = 0.2;

export interface ComprehensiveReportProps {
  address: string | null;
  lat: number;
  lon: number;
  landSizeM2: number | null;
  lotPlan: string | null;
  planData: VicPlanData | null;
  aiInsight: AIInsightData | null;
  /** Authoritative LGA name from Vicmap_Admin. Preferred over the AI
   * Auditor's localCouncil so the PDF carries deterministic council
   * data even when Gemini fails. */
  liveCouncil?: string | null;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

const formatM2 = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString('en-AU')} m²`
    : '—';

const ComprehensiveReport = forwardRef<HTMLDivElement, ComprehensiveReportProps>(
  function ComprehensiveReport(
    { address, lat, lon, landSizeM2, lotPlan, planData, aiInsight, liveCouncil },
    ref,
  ) {
    // Mapbox Static Images API — print-safe high-resolution map
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const staticMapUrl = lat && lon && mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l-star+18181b(${lon},${lat})/${lon},${lat},17.5,0/1000x400@2x?access_token=${mapboxToken}`
      : null;

    // Zone: live Vicmap → AI Auditor → unavailable.
    const liveZone = planData?.zoneCode?.trim();
    const aiZone = aiInsight?.zoning?.trim();
    const zoneCode = liveZone || aiZone || null;
    const zoneDescription = liveZone
      ? planData?.zoneDescription?.trim() || null
      : aiInsight?.zoningDescription?.trim() || null;

    // Overlays: prefer AI when present (carries descriptions),
    // else fall back to live Vicmap codes with static dictionary names.
    const liveOverlayCodes = (planData?.overlayRaw ?? []).map((c) => c.toUpperCase());
    const aiOverlays = aiInsight?.overlays ?? [];
    type ReportOverlay = { code: string; description: string };
    const overlays: ReportOverlay[] =
      aiOverlays.length > 0
        ? aiOverlays.map((o) => ({
            code: o.code,
            description: o.description?.trim() || describeOverlayCode(o.code),
          }))
        : liveOverlayCodes.map((code) => ({
            code,
            description: describeOverlayCode(code),
          }));

    const hazards = (aiInsight?.hazards ?? []).filter((h) => h && h.trim().length > 0);

    const beds = typeof aiInsight?.bedrooms === 'number' ? aiInsight.bedrooms : null;
    const baths = typeof aiInsight?.bathrooms === 'number' ? aiInsight.bathrooms : null;
    const cars = typeof aiInsight?.carspaces === 'number' ? aiInsight.carspaces : null;

    const frontage = aiInsight?.estimatedFrontage?.trim() || '—';
    const marketEstimate = aiInsight?.marketEstimate?.trim() || '—';
    const council =
      liveCouncil?.trim() || aiInsight?.localCouncil?.trim() || '—';
    const displayLotPlan = lotPlan?.trim() || aiInsight?.lotPlanNumber?.trim() || '—';

    const overview = aiInsight?.propertyOverview?.trim() || '';
    const features = (aiInsight?.designFeatures ?? []).filter((s) => s && s.trim().length > 0);
    const executiveSummary = aiInsight?.executiveSummary?.trim() || '';

    // Deterministic constraints detection — strict overlay parsing
    const hasHeritage = overlays.some((o) => o.code.includes('HO'));
    const hasBushfire = overlays.some((o) => o.code.includes('BMO') || o.code.includes('BPA'));
    const hasFlood = overlays.some((o) => o.code.includes('SBO') || o.code.includes('LSIO') || o.code.includes('FO'));
    const hasLandslide = overlays.some((o) => o.code.includes('EMO'));

    // Statutory yield calculations — safe number parsing
    const size = Number(landSizeM2) || 0;
    const hasLand = size > 0;

    // SSD Eligibility: prefer AI-driven ssdFeasibility when available, fall back to deterministic rule
    const ssdEligible = aiInsight?.ssdFeasibility?.isEligible ?? (hasLand && size > SSD_MIN_LOT_SIZE_M2);
    const ssdReasoning = aiInsight?.ssdFeasibility?.reasoning?.trim() || '';

    const ssdCoverageM2 = hasLand ? (size * SITE_COVERAGE_FRACTION).toFixed(1) : null;
    const ssdPermeabilityM2 = hasLand ? (size * PERMEABILITY_FRACTION).toFixed(1) : null;

    // Financial metrics — last sale history and market estimate
    const lastSoldPrice = aiInsight?.estimatedLastSoldPrice?.trim() || '';
    const contractDate = aiInsight?.estimatedContractDate?.trim() || '';

    return (
      <div
        ref={ref}
        // A4 page. Explicit light colors so dashboard dark-mode classes can
        // never bleed in via the cloned print iframe.
        className="w-[210mm] min-h-[297mm] bg-white text-black p-10 print:p-0 font-sans"
        style={{ colorScheme: 'light' }}
      >
        {/* Header */}
        <header className="border-b-2 border-black pb-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center">
                <span className="text-white text-xl font-black">S</span>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-black leading-none">
                  SimplySite
                </div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-gray-600 mt-1">
                  Senior Victorian Architect · Auditor
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-[0.25em] text-gray-600">Generated</div>
              <div className="text-sm font-bold text-black">{formatDate(new Date())}</div>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black leading-tight">
            Comprehensive Feasibility Report
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Lot-level audit against the 2026 Small Second Dwelling reforms and NCC 2026.
          </p>
        </header>

        {/* Subject Property */}
        <section className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-bold mb-1.5">
            Subject Property
          </div>
          <div className="text-xl font-bold text-black leading-tight break-words">
            {address ?? 'Address not provided'}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 mt-2 font-mono">
            <span>
              Lot/Plan: <span className="text-black font-bold">{displayLotPlan}</span>
            </span>
            <span>
              Coordinates: {lat.toFixed(5)}, {lon.toFixed(5)}
            </span>
            <span>
              Council: <span className="text-black font-bold">{council}</span>
            </span>
          </div>
        </section>

        {/* 1. Site Dimensions */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            1. Site Dimensions
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <Cell label="Land Size" value={formatM2(landSizeM2)} />
            <Cell label="Frontage" value={frontage} />
            <Cell
              label="Bed / Bath / Car"
              value={`${beds ?? '—'} / ${baths ?? '—'} / ${cars ?? '—'}`}
            />
            <Cell label="Market Estimate" value={marketEstimate} />
          </div>

          {/* Print-safe static Mapbox image */}
          {staticMapUrl && (
            <div className="w-full h-[200px] my-6 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 relative">
              <img
                src={staticMapUrl}
                alt="Site Map"
                className="w-full h-full object-cover grayscale-[20%]"
                crossOrigin="anonymous"
              />
            </div>
          )}
        </section>

        {/* 2. Executive Summary */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            2. Executive Summary
          </h2>
          {executiveSummary ? (
            <p className="text-sm leading-relaxed text-black font-medium">
              {executiveSummary}
            </p>
          ) : (
            <p className="text-xs italic text-gray-500">
              Executive summary unavailable from the Auditor for this address.
            </p>
          )}
        </section>

        {/* 3. Property Overview */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            3. Property Overview
          </h2>
          {overview ? (
            <p className="text-sm leading-relaxed text-black mb-4 whitespace-pre-line">
              {overview}
            </p>
          ) : (
            <p className="text-xs italic text-gray-500 mb-4">
              Property overview unavailable from the Auditor for this address.
            </p>
          )}
          {features.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-bold mb-2">
                Design Features
              </div>
              <div className="flex flex-wrap gap-1.5">
                {features.map((f, i) => (
                  <span
                    key={`${f}-${i}`}
                    className="text-[11px] px-2 py-0.5 border border-gray-400 text-black rounded"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. Deterministic Constraints Checklist */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            4. Constraints Checklist
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 border-b border-zinc-200">
              <span className="font-semibold text-zinc-800 text-sm">Heritage Overlay</span>
              {hasHeritage ? (
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-xs">
                  Detected
                </span>
              ) : (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs">
                  Clear
                </span>
              )}
            </div>
            <div className="flex justify-between items-center p-3 border-b border-zinc-200">
              <span className="font-semibold text-zinc-800 text-sm">Bushfire Risk</span>
              {hasBushfire ? (
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-xs">
                  Detected
                </span>
              ) : (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs">
                  Clear
                </span>
              )}
            </div>
            <div className="flex justify-between items-center p-3 border-b border-zinc-200">
              <span className="font-semibold text-zinc-800 text-sm">Flood / Inundation</span>
              {hasFlood ? (
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-xs">
                  Detected
                </span>
              ) : (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs">
                  Clear
                </span>
              )}
            </div>
            <div className="flex justify-between items-center p-3 border-b border-zinc-200">
              <span className="font-semibold text-zinc-800 text-sm">Landslide / Erosion</span>
              {hasLandslide ? (
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-xs">
                  Detected
                </span>
              ) : (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs">
                  Clear
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 5. Statutory Yield Cards · ResCode & NCC 2026 */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            5. Statutory Yield · ResCode · NCC 2026
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Card 1: SSD Eligibility */}
            <div
              className={`rounded p-4 ${
                ssdEligible ? 'bg-black text-white' : 'bg-red-600 text-white'
              }`}
            >
              <div className="text-[9px] uppercase tracking-widest font-bold mb-1 opacity-80">
                SSD Eligibility
              </div>
              <div className="text-2xl font-black mb-2">
                {ssdEligible ? 'Eligible' : 'Ineligible'}
              </div>
              {ssdReasoning && (
                <div className="text-[10px] leading-tight opacity-90">{ssdReasoning}</div>
              )}
            </div>

            {/* Card 2: Max Site Coverage */}
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">
                Max Site Coverage
              </div>
              <div className="text-2xl font-black text-black tabular-nums">
                {ssdCoverageM2 !== null ? `${ssdCoverageM2} m²` : '—'}
              </div>
              <div className="text-[9px] text-gray-600 mt-1 font-mono leading-tight">
                {Math.round(SITE_COVERAGE_FRACTION * 100)}% · GRZ / NRZ · Standard B8
              </div>
            </div>

            {/* Card 3: Min Permeability */}
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">
                Min Permeability
              </div>
              <div className="text-2xl font-black text-black tabular-nums">
                {ssdPermeabilityM2 !== null ? `${ssdPermeabilityM2} m²` : '—'}
              </div>
              <div className="text-[9px] text-gray-600 mt-1 font-mono leading-tight">
                {Math.round(PERMEABILITY_FRACTION * 100)}% · ResCode · Standard B9
              </div>
            </div>
          </div>
        </section>

        {/* 6. Planning Context */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            6. Planning Context
          </h2>

          {/* Zoning */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-bold mb-2">
              Principal Zoning
            </div>
            <div className="flex items-start gap-3 border border-gray-300 rounded p-3 bg-gray-50">
              <div className="px-2.5 py-1 bg-black text-white font-bold text-sm rounded uppercase tracking-wider shrink-0">
                {zoneCode ?? '—'}
              </div>
              <div className="min-w-0 flex-1">
                {zoneDescription ? (
                  <p className="text-xs text-black leading-relaxed">{zoneDescription}</p>
                ) : (
                  <p className="text-xs italic text-gray-500">
                    Zone description unavailable for this parcel.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Overlays */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-bold mb-2">
              Planning Overlays ({overlays.length})
            </div>
            {overlays.length > 0 ? (
              <div className="flex flex-col gap-2">
                {overlays.map((o, i) => (
                  <div
                    key={`${o.code}-${i}`}
                    className="border border-gray-300 rounded p-2.5 bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-900 text-white shrink-0">
                        {o.code}
                      </span>
                      <p className="text-xs text-black leading-relaxed">{o.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-gray-500">No disqualifying overlays detected.</p>
            )}
          </div>

          {/* Hazards */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-600 font-bold mb-2">
              Hazards &amp; Risks
            </div>
            {hazards.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {hazards.map((h, i) => (
                  <div
                    key={`${h}-${i}`}
                    className="flex items-start gap-2 border border-amber-400 bg-amber-50 rounded p-2.5"
                  >
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black shrink-0">
                      !
                    </span>
                    <p className="text-xs text-black leading-relaxed">{h}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-black">No natural hazards mapped for this parcel.</p>
            )}
          </div>
        </section>

        {/* 7. Market & Financial Context */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gray-600 font-bold mb-3 border-b border-gray-300 pb-1.5">
            7. Market &amp; Financial Context
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1: Estimated Value Range */}
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">
                Estimated Value Range
              </div>
              <div className="text-xl font-black text-black tabular-nums break-words">
                {marketEstimate}
              </div>
              <div className="text-[9px] text-gray-600 mt-1 font-mono leading-tight">
                Based on comparable sales &amp; market analysis
              </div>
            </div>

            {/* Card 2: Last Sale History */}
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">
                Last Sale History
              </div>
              {lastSoldPrice && contractDate ? (
                <>
                  <div className="text-xl font-black text-black tabular-nums">
                    {lastSoldPrice}
                  </div>
                  <div className="text-[9px] text-gray-600 mt-1 font-mono leading-tight">
                    Contract Date: {contractDate}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No recent sale record available
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-300 pt-3 mt-2 text-[9px] text-gray-600 leading-relaxed">
          Planning-stage screening tool synthesised by the SimplySite Senior Victorian Architect
          Auditor. Inputs are drawn from Vicmap (parcel + zone + overlays) and verified live
          listing / planning sources via Google Search grounding. Confirm all figures with a
          registered building surveyor and town planner before acquisition.
        </footer>
      </div>
    );
  },
);

export default ComprehensiveReport;

function Cell({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="border border-gray-300 rounded p-3 bg-gray-50">
      <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">
        {label}
      </div>
      <div className="text-lg font-black text-black tabular-nums break-words">{value}</div>
      {caption && (
        <div className="text-[9px] text-gray-600 mt-0.5 font-mono leading-tight">{caption}</div>
      )}
    </div>
  );
}
