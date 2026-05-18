'use client';
import React from 'react';
import { TrendingUp, Home, Building2, LayoutGrid, AlertTriangle, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { calculateYield, emptyYield } from '@/lib/yieldEngine';

type Props = {
  landSize?: number | null;
  zoneCode?: string | null;
};

export default function DevelopmentPotentialTab({ landSize, zoneCode }: Props = {}) {
  const hasLandSize =
    typeof landSize === 'number' && Number.isFinite(landSize) && landSize > 0;
  const data = hasLandSize
    ? calculateYield(landSize as number, zoneCode ?? '')
    : emptyYield('Awaiting Vicmap parcel geometry — yield model will populate once the lot resolves.');

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-300">

      {/* 1. Potential Scorecard */}
      <div className="flex flex-col gap-5 bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#E9E778]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-[#E9E778] shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-[#E9E778] mb-2">
              {data.isFeasible
                ? 'You have found a site with POTENTIAL!'
                : hasLandSize
                  ? 'Single-dwelling site — limited yield uplift'
                  : 'Awaiting parcel data'}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{data.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10 items-center">
          <div className="col-span-1 flex flex-col items-center justify-center bg-black/20 rounded-lg p-3 border border-white/5">
            <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Potential</span>
            <span className="text-2xl font-black text-white">{data.scorecard.overall}</span>
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            <ScoreBar label="Precedents" value={data.scorecard.precedents} />
            <ScoreBar label="Slope" value={data.scorecard.slope} />
            <ScoreBar label="Complexity" value={data.scorecard.complexity} />
            <ScoreBar label="Risk Factors" value={data.scorecard.riskFactors} />
          </div>
        </div>
      </div>

      {/* 2. Suggested Land Use (Yield Matrix) */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Suggested Land Use</h3>
        <p className="text-xs text-zinc-400 mb-5">Estimated dwelling capacity based on standard ResCode density allowances for GRZ1.</p>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-12 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 px-2">
            <div className="col-span-5">Property Type</div>
            <div className="col-span-7">Estimated Dwellings</div>
          </div>

          {data.landUse.map((use, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center px-2 py-1 group cursor-pointer">
              <div className="col-span-5 flex items-center gap-2 text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                {use.type}
              </div>
              <div className="col-span-6 flex gap-1 h-3">
                {use.feasible ? (
                  Array.from({ length: use.max }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 rounded-sm ${i < use.estimate ? 'bg-[#E9E778]' : 'bg-white/10'}`}
                    />
                  ))
                ) : (
                  <span className="text-xs text-zinc-600 font-medium italic">Not Permitted</span>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                 <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#E9E778] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Form Factor Constraints & Permit Sentinels */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2">Statutory Constraints</h3>

        <div className="flex items-start gap-3 p-3 bg-[#E9E778]/10 border border-[#E9E778]/20 rounded-lg">
          {data.permit.required ? (
            <AlertTriangle className="w-5 h-5 text-[#E9E778] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-bold text-white mb-1">
              {data.permit.required ? 'Planning Permit Required' : 'Permit Exempt (Building Permit Only)'}
            </p>
            <p className="text-xs text-zinc-400">{data.permit.reason}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-white/5 mt-2 border border-white/5 rounded-lg bg-black/20">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm text-zinc-400">Max Building Height</span>
            <span className="text-sm font-medium text-white">{data.constraints.maxHeight}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-zinc-400">Max Site Coverage</span>
              <Info className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <span className="text-sm font-medium text-white">{data.constraints.maxFootprint}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-zinc-400">Min Permeability</span>
              <Info className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <span className="text-sm font-medium text-white">{data.constraints.minPermeability}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

// Helper component for the scorecard bars
function ScoreBar({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-400 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-zinc-300 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
