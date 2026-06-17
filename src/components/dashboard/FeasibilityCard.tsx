'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, DollarSign, Hammer, Percent, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Sparkles, Loader2, Edit2, ShieldCheck, Zap } from 'lucide-react';
import type { YieldData } from '@/lib/yieldEngine';
import {
  calculateFeasibility,
  formatMoney,
  formatMoneyMillion,
  formatPercent,
  parseLastSoldPrice,
  assessFeasibilityViability,
  type DevelopmentTypology,
} from '@/lib/financialEngine';
import {
  auditVPPCompliance,
  generateComplianceSummary,
  type AuditResult,
} from '@/lib/vppAuditor';

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
  lastSoldPrice?: string | null;
};

export default function FeasibilityCard({ yieldData, zones, overlays, landSize, suburb, council, lastSoldPrice }: Props = {}) {
  // --- 1. State: Editable Acquisition & Development Inputs ---
  const [purchasePrice, setPurchasePrice] = useState<number>(710000);
  const [dwellings, setDwellings] = useState<number>(1);
  const [buildCost, setBuildCost] = useState<number>(350000);
  const [salePrice, setSalePrice] = useState<number>(850000);

  // --- Financial Proforma State ---
  const [manualLandCost, setManualLandCost] = useState<number | null>(null);
  const [isEditingLandCost, setIsEditingLandCost] = useState(false);
  const [typology, setTypology] = useState<DevelopmentTypology>('Townhouse');

  // --- AI Analyst State ---
  const [aiAnalyst, setAiAnalyst] = useState<AIAnalystData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Parse lastSoldPrice from scraped data
  useEffect(() => {
    const parsed = parseLastSoldPrice(lastSoldPrice || null);
    if (parsed && !manualLandCost) {
      setManualLandCost(parsed);
    }
  }, [lastSoldPrice]);

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
          console.error('[FeasibilityCard] AI analyst fetch failed', err);
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

  // --- Financial Proforma Calculator ---
  const financialProforma = useMemo(() => {
    const landCost = manualLandCost || parseLastSoldPrice(lastSoldPrice || null) || 850000;
    const gfa = landSize ? landSize * 0.5 : 200; // Assume 50% site coverage for GFA estimate

    return calculateFeasibility(landCost, gfa, typology);
  }, [manualLandCost, lastSoldPrice, landSize, typology]);

  const viability = useMemo(
    () => assessFeasibilityViability(financialProforma.profitMarginPercent),
    [financialProforma]
  );

  // --- VPP Compliance Audit (2026 Reforms) ---
  const vppAudit = useMemo(() => {
    if (!landSize) return null;

    const zoneCode = zones && zones.length > 0 ? zones[0] : null;
    const frontage = null; // TODO: Calculate from polygon geometry

    return auditVPPCompliance(zoneCode, landSize, frontage, overlays || []);
  }, [zones, overlays, landSize]);

  const complianceSummary = useMemo(() => {
    if (!vppAudit) return null;
    return generateComplianceSummary(vppAudit);
  }, [vppAudit]);

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

      {/* --- FAST-TRACK COMPLIANCE AUDIT (2026 VPP REFORMS) --- */}
      {vppAudit && (
        <div className={`relative border-2 p-6 rounded-2xl ${
          vppAudit.isFastTrackEligible
            ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-[#00FF66]'
            : 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border-zinc-700'
        }`}>
          {/* Header with Fast-Track Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                vppAudit.isFastTrackEligible ? 'bg-[#00FF66]/20' : 'bg-zinc-700'
              }`}>
                {vppAudit.isFastTrackEligible ? (
                  <Zap className="w-5 h-5 text-[#00FF66]" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Fast-Track Compliance Audit</h2>
                <p className="text-xs text-zinc-400">2026 Victorian Planning Reforms</p>
              </div>
            </div>

            {/* NO THIRD-PARTY APPEALS Badge */}
            {vppAudit.noThirdPartyAppeals && (
              <div className="flex items-center gap-2 bg-[#00FF66]/20 border-2 border-[#00FF66] rounded-lg px-3 py-1.5">
                <Sparkles className="w-4 h-4 text-[#00FF66]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#00FF66]">
                  No Third-Party Appeals
                </span>
              </div>
            )}
          </div>

          {/* Tier Classification */}
          <div className={`rounded-lg p-4 mb-4 ${
            vppAudit.isFastTrackEligible
              ? 'bg-[#00FF66]/10 border border-[#00FF66]/50'
              : 'bg-zinc-800/50 border border-zinc-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  Approval Track
                </div>
                <div className={`text-xl font-black ${
                  vppAudit.isFastTrackEligible ? 'text-[#00FF66]' : 'text-zinc-400'
                }`}>
                  {vppAudit.tier}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  Max Dwellings
                </div>
                <div className="text-xl font-black text-white">
                  {vppAudit.maxDeemedDwellings}
                </div>
              </div>
            </div>
          </div>

          {/* Developer Summary */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Developer Summary
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {vppAudit.developerSummary}
            </p>
          </div>

          {/* Compliance Benefits/Requirements */}
          {complianceSummary && (
            <div className="space-y-3">
              {/* Benefits */}
              {complianceSummary.benefits.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#00FF66] mb-2">
                    Fast-Track Benefits
                  </div>
                  <ul className="space-y-1.5">
                    {complianceSummary.benefits.map((benefit, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66] mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements/Warnings */}
              {complianceSummary.requirements.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
                    Requirements
                  </div>
                  <ul className="space-y-1.5">
                    {complianceSummary.requirements.map((req, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Applicable Clause Badge */}
          <div className="mt-4 text-[10px] text-zinc-500 text-right">
            Applicable VPP: <span className="font-bold text-zinc-400">{vppAudit.applicableClause}</span>
          </div>
        </div>
      )}

      {/* --- FINANCIAL PROFORMA (ESTIMATES) --- */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-700 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Financial Proforma (Estimates)</h2>
              <p className="text-xs text-zinc-400">Real-time developer margin analysis</p>
            </div>
          </div>

          {/* Typology Selector */}
          <select
            value={typology}
            onChange={(e) => setTypology(e.target.value as DevelopmentTypology)}
            className="bg-zinc-800 border border-zinc-600 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E9E778]"
          >
            <option value="Townhouse">Townhouse</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Mixed-Use">Mixed-Use</option>
          </select>
        </div>

        {/* Land Cost Input */}
        <div className="mb-4 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Land Acquisition Cost</span>
            {!isEditingLandCost && (
              <button
                onClick={() => setIsEditingLandCost(true)}
                className="text-zinc-500 hover:text-[#E9E778] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isEditingLandCost ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={manualLandCost || ''}
                onChange={(e) => setManualLandCost(Number(e.target.value) || null)}
                placeholder="Enter land cost..."
                className="flex-1 bg-black/40 border border-zinc-600 rounded-md py-2 px-3 text-white font-mono focus:border-[#E9E778] focus:ring-1 focus:ring-[#E9E778] outline-none"
              />
              <button
                onClick={() => setIsEditingLandCost(false)}
                className="px-3 py-2 bg-[#E9E778] text-[#241F21] rounded-md text-xs font-bold hover:bg-[#E9E778]/90 transition-colors"
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-white font-mono">
                {formatMoney(manualLandCost || parseLastSoldPrice(lastSoldPrice || null) || 850000)}
              </span>
              {lastSoldPrice && (
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">From market data</span>
              )}
            </div>
          )}
        </div>

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* TDC */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Dev Cost (TDC)</div>
            <div className="text-xl font-black text-white font-mono">{formatMoneyMillion(financialProforma.tdc)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Land + Construction + Soft Costs</div>
          </div>

          {/* GRV */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Gross Realization (GRV)</div>
            <div className="text-xl font-black text-white font-mono">{formatMoneyMillion(financialProforma.grv)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Total Sale Proceeds</div>
          </div>

          {/* Profit */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Developer Profit</div>
            <div className={`text-xl font-black font-mono ${
              financialProforma.profit >= 0 ? 'text-[#E9E778]' : 'text-red-400'
            }`}>
              {formatMoneyMillion(financialProforma.profit)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">GRV - TDC - Selling Costs</div>
          </div>

          {/* Margin */}
          <div className={`border rounded-lg p-4 ${
            viability === 'exceptional' || viability === 'good'
              ? 'bg-[#E9E778]/20 border-[#E9E778]/50'
              : viability === 'acceptable'
              ? 'bg-amber-500/20 border-amber-500/50'
              : viability === 'marginal'
              ? 'bg-orange-500/20 border-orange-500/50'
              : 'bg-red-500/20 border-red-500/50'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Profit Margin</div>
            <div className={`text-3xl font-black font-mono ${
              viability === 'exceptional' || viability === 'good'
                ? 'text-[#E9E778]'
                : viability === 'acceptable'
                ? 'text-amber-400'
                : viability === 'marginal'
                ? 'text-orange-400'
                : 'text-red-400'
            }`}>
              {financialProforma.profitMarginPercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 font-bold uppercase">
              {viability === 'exceptional' && '⭐ Exceptional'}
              {viability === 'good' && '✓ Good Deal'}
              {viability === 'acceptable' && '~ Acceptable'}
              {viability === 'marginal' && '⚠ High Risk'}
              {viability === 'loss' && '✗ Loss-Making'}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2">
            <span>Cost Breakdown</span>
            <span className="text-[10px]">▼</span>
          </summary>
          <div className="mt-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Land Cost</span>
              <span>{formatMoney(financialProforma.landCost)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Stamp Duty (5.5%)</span>
              <span>{formatMoney(financialProforma.stampDuty)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Construction</span>
              <span>{formatMoney(financialProforma.constructionCost)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Soft Costs (15%)</span>
              <span>{formatMoney(financialProforma.softCosts)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Contingency (5%)</span>
              <span>{formatMoney(financialProforma.contingency)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Finance Costs (8%)</span>
              <span>{formatMoney(financialProforma.financeCosts)}</span>
            </div>
            <div className="border-t border-zinc-700 my-2" />
            <div className="flex justify-between text-white font-bold">
              <span>Total Development Cost</span>
              <span>{formatMoney(financialProforma.tdc)}</span>
            </div>
          </div>
        </details>
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
