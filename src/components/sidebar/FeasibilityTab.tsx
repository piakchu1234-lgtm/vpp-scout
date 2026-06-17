'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, DollarSign, Hammer, Percent, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import type { YieldData } from '@/lib/yieldEngine';

type AIAnalystData = {
  investmentThesis: string;
  highestBestUse: string;
  keyConstraints: string[];
  estimatedROI: string;
};

type Props = {
  yieldData?: YieldData | null;
  zones?: string[];
  overlays?: string[];
  landSize?: number | null;
  suburb?: string;
  council?: string;
};

export default function FeasibilityTab({ yieldData, zones, overlays, landSize, suburb, council }: Props = {}) {
  // --- 1. State: Editable Acquisition & Development Inputs ---
  const [purchasePrice, setPurchasePrice] = useState<number>(710000);
  const [dwellings, setDwellings] = useState<number>(1);
  const [buildCost, setBuildCost] = useState<number>(350000);
  const [salePrice, setSalePrice] = useState<number>(850000);

  // --- AI Analyst State ---
  const [aiAnalyst, setAiAnalyst] = useState<AIAnalystData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // --- AI Analyst Effect: Trigger when property data resolves ---
  useEffect(() => {
    // Only trigger if we have all required data
    if (!zones || zones.length === 0 || !landSize || !suburb) {
      setAiAnalyst(null);
      setIsLoadingAI(false);
      setAiError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingAI(true);
    setAiError(null);
    setAiAnalyst(null);

    fetch('/api/ai-analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zones,
        overlays: overlays || [],
        landSize,
        suburb,
        council,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (!cancelled) {
          if (response.error) {
            setAiError(response.error);
          } else if (response.data) {
            setAiAnalyst(response.data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[FeasibilityTab] AI analyst fetch failed', err);
          setAiError('Failed to generate AI analysis');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAI(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [zones, overlays, landSize, suburb, council]);

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
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300 pb-10">

      {/* --- AI SITE ANALYST CARD --- */}
      <div className="relative bg-gradient-to-br from-[#E9E778]/10 via-[#E9E778]/5 to-transparent border border-[#E9E778]/30 p-6 rounded-2xl backdrop-blur-md overflow-hidden">
        {/* Animated background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#E9E778]/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-[#E9E778]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">✨ AI Site Analyst</h2>
              <p className="text-xs text-zinc-400">Powered by Claude Sonnet 4</p>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingAI && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-[#E9E778] animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm text-zinc-300 font-medium">Scraping VPP guidelines...</p>
                <p className="text-xs text-zinc-500">Synthesizing architectural yield...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {aiError && !isLoadingAI && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{aiError}</p>
            </div>
          )}

          {/* Success State */}
          {aiAnalyst && !isLoadingAI && (
            <div className="space-y-4">
              {/* Investment Thesis - Serif font for executive report feel */}
              <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E9E778] mb-3">Investment Thesis</h3>
                <p className="text-sm leading-relaxed text-zinc-200 font-serif">
                  {aiAnalyst.investmentThesis}
                </p>
              </div>

              {/* Highest & Best Use */}
              <div className="bg-[#E9E778]/10 border border-[#E9E778]/30 rounded-lg p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E9E778] mb-2">Highest & Best Use</h3>
                <p className="text-base font-bold text-white">
                  {aiAnalyst.highestBestUse}
                </p>
              </div>

              {/* Key Constraints */}
              {aiAnalyst.keyConstraints && aiAnalyst.keyConstraints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Critical Constraints</h3>
                  <ul className="space-y-2">
                    {aiAnalyst.keyConstraints.map((constraint, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estimated ROI Badge */}
              <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg p-3">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Est. Developer Margin</span>
                <span className="text-lg font-black text-[#E9E778]">{aiAnalyst.estimatedROI}</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingAI && !aiAnalyst && !aiError && (
            <div className="text-center py-6">
              <p className="text-sm text-zinc-400">Select a property to analyze</p>
            </div>
          )}
        </div>
      </div>

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
