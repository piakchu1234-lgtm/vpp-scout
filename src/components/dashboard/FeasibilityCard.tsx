'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, DollarSign, Hammer, Percent, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { YieldData } from '@/lib/yieldEngine';

type Props = {
  yieldData?: YieldData | null;
};

export default function FeasibilityCard({ yieldData }: Props = {}) {
  // --- 1. State: Editable Acquisition & Development Inputs ---
  const [purchasePrice, setPurchasePrice] = useState<number>(710000);
  const [dwellings, setDwellings] = useState<number>(1);
  const [buildCost, setBuildCost] = useState<number>(350000);
  const [salePrice, setSalePrice] = useState<number>(850000);

  // Sync the slider to the AI's highest feasible yield whenever a new
  // parcel resolves. Deps are intentionally just `yieldData` — never
  // `dwellings` — to prevent a feedback loop when the user nudges the
  // slider manually.
  useEffect(() => {
    if (!yieldData || !yieldData.resolved) return;
    const maxFeasible = yieldData.landUse
      .filter((r) => r.feasible)
      .reduce((acc, r) => Math.max(acc, r.estimate), 0);
    setDwellings(maxFeasible > 0 ? maxFeasible : 1);
  }, [yieldData]);

  // --- 2. Engine: Automated Pro-Forma Calculations ---
  const metrics = useMemo(() => {
    // Hard costs
    const stampDuty = purchasePrice * 0.055; // ~5.5% Vic Stamp Duty
    const totalBuild = dwellings * buildCost;
    const contingency = totalBuild * 0.05; // 5% Standard Contingency

    // Total Outlay
    const tdc = purchasePrice + stampDuty + totalBuild + contingency;

    // Realisation & Soft Costs
    const grv = dwellings * salePrice;
    const sellingFees = grv * 0.02; // 2% Agent/Marketing Fee

    // Performance
    const netProfit = grv - tdc - sellingFees;
    const roi = (netProfit / tdc) * 100;

    return { stampDuty, totalBuild, contingency, tdc, grv, sellingFees, netProfit, roi };
  }, [purchasePrice, dwellings, buildCost, salePrice]);

  // Helper
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4">

      {/* --- HEADER --- */}
      <div className="flex items-center gap-3 bg-[#E9E778]/10 border border-[#E9E778]/20 p-4 rounded-xl">
        <Calculator className="w-5 h-5 text-[#E9E778]" />
        <div>
          <h2 className="text-sm font-bold text-white">Live Feasibility Engine</h2>
          <p className="text-xs text-zinc-400">Adjust parameters to recalculate yield viability.</p>
        </div>
      </div>

      {/* --- CARD 1: INPUTS --- */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm flex flex-col gap-5">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">1. Project Inputs</h3>

        <div className="flex flex-col gap-4">
          {/* Site Purchase */}
          <div>
            <label className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              <span>Site Purchase Price</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-md py-2 pl-9 pr-3 text-white focus:border-[#E9E778] focus:ring-1 focus:ring-[#E9E778] outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Dwellings Slider */}
          <div>
            <label className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              <span>Target Yield (Dwellings)</span>
              <span className="font-bold text-[#E9E778] text-sm">{dwellings}</span>
            </label>
            <input
              type="range"
              min="1" max="10" step="1"
              value={dwellings}
              onChange={(e) => setDwellings(Number(e.target.value))}
              className="w-full accent-[#E9E778] h-2 bg-black/40 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Build Cost */}
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 uppercase tracking-wide">Build Cost (Per Unit)</label>
              <div className="relative">
                <Hammer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="number"
                  value={buildCost}
                  onChange={(e) => setBuildCost(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-8 pr-2 text-sm text-white focus:border-[#E9E778] outline-none font-mono"
                />
              </div>
            </div>
            {/* Sale Price */}
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 uppercase tracking-wide">Sale Price (Per Unit)</label>
              <div className="relative">
                <TrendingUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-8 pr-2 text-sm text-white focus:border-[#E9E778] outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARD 2: COST STACK --- */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">2. Cost Stack</h3>

        <div className="flex flex-col gap-3 font-mono text-sm">
          <div className="flex justify-between items-center text-zinc-400">
            <span>Site Purchase</span>
            <span>{formatMoney(purchasePrice)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Stamp Duty (~5.5%)</span>
            <span>{formatMoney(metrics.stampDuty)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Construction ({dwellings}x)</span>
            <span>{formatMoney(metrics.totalBuild)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Contingency (5%)</span>
            <span>{formatMoney(metrics.contingency)}</span>
          </div>

          <div className="my-1 border-t border-white/10 border-dashed" />

          <div className="flex justify-between items-center font-bold text-white">
            <span className="font-sans uppercase tracking-wider text-xs">Total Dev Cost (TDC)</span>
            <span>{formatMoney(metrics.tdc)}</span>
          </div>
        </div>
      </div>

      {/* --- CARD 3: PERFORMANCE --- */}
      <div className={`p-5 rounded-xl backdrop-blur-sm border transition-colors duration-500 ${
        metrics.roi >= 15 ? 'bg-[#E9E778]/10 border-[#E9E778]/30' :
        metrics.roi < 0 ? 'bg-red-500/10 border-red-500/30' :
        'bg-amber-500/10 border-amber-500/30'
      }`}>
        <h3 className="text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-between">
          <span className={metrics.roi >= 15 ? 'text-[#E9E778]' : metrics.roi < 0 ? 'text-red-400' : 'text-amber-400'}>
            3. Project Performance
          </span>
          {metrics.roi >= 15 && <CheckCircle2 className="w-4 h-4 text-[#E9E778]" />}
          {metrics.roi < 0 && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {metrics.roi >= 0 && metrics.roi < 15 && <AlertCircle className="w-4 h-4 text-amber-400" />}
        </h3>

        <div className="flex flex-col gap-3 font-mono text-sm mb-4">
          <div className="flex justify-between items-center text-zinc-300">
            <span>Gross Realisation (GRV)</span>
            <span className="font-medium text-white">{formatMoney(metrics.grv)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Selling & Mktg (2%)</span>
            <span>-{formatMoney(metrics.sellingFees)}</span>
          </div>

          <div className="my-1 border-t border-white/10 border-dashed" />

          <div className="flex justify-between items-center font-bold">
            <span className="font-sans uppercase tracking-wider text-xs text-white">Net Profit</span>
            <span className={metrics.netProfit >= 0 ? 'text-white' : 'text-red-400'}>
              {formatMoney(metrics.netProfit)}
            </span>
          </div>
        </div>

        {/* ROI Banner */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          metrics.roi >= 15 ? 'bg-[#E9E778] text-[#241F21]' :
          metrics.roi < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
          'bg-amber-500/15 text-amber-400 border border-amber-500/40'
        }`}>
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
            <Percent className="w-4 h-4" />
            <span>Project ROI</span>
          </div>
          <span className="text-xl font-black">{metrics.roi.toFixed(1)}%</span>
        </div>

      </div>
    </div>
  );
}
