'use client';
import React from 'react';
import type { YieldData } from '@/lib/yieldEngine';
import type { VicPlanData } from '@/lib/vicPlanApi';

interface FeasibilityReportTemplateProps {
  id?: string;
  address: string | null;
  lat: number;
  lon: number;
  yieldData: YieldData;
  planData: VicPlanData | null;
  landSizeM2: number | null;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

const formatM2 = (n: number | null) =>
  n !== null && Number.isFinite(n) ? `${Math.round(n).toLocaleString('en-AU')} m²` : '—';

export default function FeasibilityReportTemplate({
  id = 'pdf-report-template',
  address,
  lat,
  lon,
  yieldData,
  planData,
  landSizeM2,
}: FeasibilityReportTemplateProps) {
  const maxFeasibleDwellings = yieldData.landUse
    .filter((r) => r.feasible)
    .reduce((acc, r) => Math.max(acc, r.estimate), 0);
  const dwellings = maxFeasibleDwellings > 0 ? maxFeasibleDwellings : 1;

  const purchasePrice = 710000;
  const buildCost = 350000;
  const salePrice = 850000;
  const stampDuty = purchasePrice * 0.055;
  const totalBuild = dwellings * buildCost;
  const contingency = totalBuild * 0.05;
  const tdc = purchasePrice + stampDuty + totalBuild + contingency;
  const grv = dwellings * salePrice;
  const sellingFees = grv * 0.02;
  const netProfit = grv - tdc - sellingFees;
  const roi = (netProfit / tdc) * 100;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(val);

  const overlays = planData?.overlayRaw ?? [];

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]"
    >
      <div
        id={id}
        className="w-[210mm] min-h-[297mm] bg-white text-zinc-900 font-sans"
        style={{ padding: 0, boxSizing: 'border-box' }}
      >
        {/* Dark Header */}
        <div className="bg-[#241F21] text-white px-12 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#E9E778] rounded-sm flex items-center justify-center">
                <span className="text-[#241F21] text-lg font-black">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight">SimplySite</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              Feasibility Report
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#E9E778] mb-1.5">
              Subject Property
            </div>
            <div className="text-2xl font-bold leading-tight mb-3">
              {address ?? 'Address not provided'}
            </div>
            <div className="flex gap-6 text-xs text-zinc-400 font-mono">
              <span>
                Coordinates: {lat.toFixed(5)}, {lon.toFixed(5)}
              </span>
              <span>Generated: {formatDate(new Date())}</span>
            </div>
          </div>
        </div>

        <div className="px-12 py-8 flex flex-col gap-6">
          {/* Section 1: Planning Snapshot */}
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">
              1. Planning Snapshot
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">
                  Lot Size
                </div>
                <div className="text-xl font-bold text-zinc-900">
                  {formatM2(landSizeM2)}
                </div>
              </div>
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">
                  Zone
                </div>
                <div className="text-xl font-bold text-zinc-900">
                  {planData?.zoneCode ?? '—'}
                </div>
                {planData?.zoneDescription && (
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                    {planData.zoneDescription}
                  </div>
                )}
              </div>
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">
                  Permit
                </div>
                <div className="text-xl font-bold text-zinc-900">
                  {yieldData.permit.required ? 'Required' : 'Exempt'}
                </div>
              </div>
            </div>

            <div className="mt-3 border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">
                Overlays ({overlays.length})
              </div>
              {overlays.length === 0 ? (
                <div className="text-xs text-zinc-500">
                  No disqualifying overlays detected at this point.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {overlays.map((code) => (
                    <span
                      key={code}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Yield */}
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">
              2. Development Yield
            </h2>
            <div className="border border-[#241F21] rounded-lg overflow-hidden">
              <div className="bg-[#241F21] text-white px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#E9E778] font-bold">
                  Maximum Feasible Yield
                </span>
                <span className="text-2xl font-black text-[#E9E778]">
                  {dwellings} {dwellings === 1 ? 'Dwelling' : 'Dwellings'}
                </span>
              </div>
              <div className="divide-y divide-zinc-200">
                {yieldData.landUse.map((row) => (
                  <div
                    key={row.type}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <span className="font-medium text-zinc-700">{row.type}</span>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-zinc-500">
                        Estimate: <span className="text-zinc-900 font-bold">{row.estimate}</span>
                      </span>
                      <span className="text-zinc-500">
                        Max: <span className="text-zinc-900 font-bold">{row.max}</span>
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded ${
                          row.feasible
                            ? 'bg-[#E9E778] text-[#241F21] font-bold'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {row.feasible ? 'Feasible' : 'Not Feasible'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Pro-Forma */}
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">
              3. Indicative Pro-Forma
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">
                  Cost Stack
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Site Purchase</span>
                    <span className="text-zinc-900">{formatMoney(purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Stamp Duty (~5.5%)</span>
                    <span className="text-zinc-900">{formatMoney(stampDuty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">
                      Construction ({dwellings}×)
                    </span>
                    <span className="text-zinc-900">{formatMoney(totalBuild)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Contingency (5%)</span>
                    <span className="text-zinc-900">{formatMoney(contingency)}</span>
                  </div>
                  <div className="border-t border-zinc-300 pt-1.5 mt-0.5 flex justify-between font-bold">
                    <span className="text-zinc-900">Total Dev Cost</span>
                    <span className="text-zinc-900">{formatMoney(tdc)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">
                  Realisation
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Gross Realisation</span>
                    <span className="text-zinc-900">{formatMoney(grv)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Selling & Mktg (2%)</span>
                    <span className="text-zinc-900">-{formatMoney(sellingFees)}</span>
                  </div>
                  <div className="border-t border-zinc-300 pt-1.5 mt-0.5 flex justify-between font-bold">
                    <span className="text-zinc-900">Net Profit</span>
                    <span className={netProfit >= 0 ? 'text-zinc-900' : 'text-red-600'}>
                      {formatMoney(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg px-5 py-4 flex items-center justify-between ${
                roi >= 15
                  ? 'bg-[#E9E778] text-[#241F21]'
                  : roi < 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Project ROI
              </span>
              <span className="text-3xl font-black">{roi.toFixed(1)}%</span>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-zinc-200 pt-4 mt-2 text-[9px] text-zinc-500 leading-relaxed">
            Indicative feasibility against the 2026 Small Second Dwelling reforms and
            NCC 2026. Inputs sourced from Vicmap (parcel) and the Victoria Planning
            Provisions (zone & overlays). This document is a planning-stage screening
            tool — confirm all figures with a registered building surveyor and town
            planner before acquisition.
          </div>
        </div>
      </div>
    </div>
  );
}
