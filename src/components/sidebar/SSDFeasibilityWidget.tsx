'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Layers, Droplets, Ruler } from 'lucide-react';

const SSD_MIN_LOT_SIZE_M2 = 300;
const SITE_COVERAGE_FRACTION = 0.6;
const PERMEABILITY_FRACTION = 0.2;

type Props = {
  landSizeM2?: number | null;
};

export default function SSDFeasibilityWidget({ landSizeM2 }: Props) {
  const hasArea =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0;

  if (!hasArea) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
        aria-busy="true"
      >
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            SSD Feasibility
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            ResCode · NCC 2026
          </span>
        </header>
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#E9E778]" />
          <p className="text-sm">Awaiting spatial data to run feasibility…</p>
        </div>
      </motion.section>
    );
  }

  const lot = landSizeM2 as number;
  const eligible = lot >= SSD_MIN_LOT_SIZE_M2;
  const siteCoverageM2 = Math.round(lot * SITE_COVERAGE_FRACTION);
  const permeabilityM2 = Math.round(lot * PERMEABILITY_FRACTION);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          SSD Feasibility
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          ResCode · NCC 2026
        </span>
      </header>

      <div
        className={[
          'mb-5 flex items-center gap-3 rounded-lg border px-4 py-3',
          eligible
            ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
            : 'border-rose-400/30 bg-rose-400/[0.06]',
        ].join(' ')}
        role="status"
      >
        {eligible ? (
          <CheckCircle2 className="h-5 w-5 flex-none text-emerald-400" aria-hidden />
        ) : (
          <XCircle className="h-5 w-5 flex-none text-rose-400" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={[
              'text-sm font-semibold',
              eligible ? 'text-emerald-300' : 'text-rose-300',
            ].join(' ')}
          >
            {eligible ? 'SSD Eligible' : `SSD Ineligible (Under ${SSD_MIN_LOT_SIZE_M2}m²)`}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Lot {Math.round(lot)} m² · Threshold {SSD_MIN_LOT_SIZE_M2} m²
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FeasibilityMetric
          icon={<Layers className="h-4 w-4 text-[#E9E778]" />}
          label="Max Site Coverage"
          valueM2={siteCoverageM2}
          fraction={SITE_COVERAGE_FRACTION}
          basis="GRZ / NRZ Standard B8"
          dimmed={!eligible}
        />
        <FeasibilityMetric
          icon={<Droplets className="h-4 w-4 text-[#E9E778]" />}
          label="Min Permeability"
          valueM2={permeabilityM2}
          fraction={PERMEABILITY_FRACTION}
          basis="ResCode Standard B9"
          dimmed={!eligible}
        />
      </div>

      <footer className="mt-4 flex items-start gap-2 border-t border-white/5 pt-3">
        <Ruler className="mt-0.5 h-3 w-3 flex-none text-zinc-600" aria-hidden />
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Indicative envelope only. Final eligibility depends on zone, overlays,
          frontage, slope, and ResCode Minimum Garden Area — confirm against the
          full feasibility tab before lodgement.
        </p>
      </footer>
    </motion.section>
  );
}

type MetricProps = {
  icon: React.ReactNode;
  label: string;
  valueM2: number;
  fraction: number;
  basis: string;
  dimmed?: boolean;
};

function FeasibilityMetric({ icon, label, valueM2, fraction, basis, dimmed }: MetricProps) {
  return (
    <div
      className={[
        'rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-opacity',
        dimmed ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </span>
      </div>
      <p className="font-mono text-xl font-semibold tabular-nums text-white">
        {valueM2.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-zinc-500">m²</span>
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
        {Math.round(fraction * 100)}% · {basis}
      </p>
    </div>
  );
}
