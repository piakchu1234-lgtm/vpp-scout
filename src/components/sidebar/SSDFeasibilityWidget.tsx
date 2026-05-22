'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Layers, Droplets, Ruler, Sparkles } from 'lucide-react';

const SSD_MIN_LOT_SIZE_M2 = 300;
const SITE_COVERAGE_FRACTION = 0.6;
const PERMEABILITY_FRACTION = 0.2;

type Lang = 'en' | 'zh';

type Props = {
  landSizeM2?: number | null;
  address?: string | null;
  lang?: Lang;
};

const COPY: Record<Lang, {
  title: string;
  basisTag: string;
  awaiting: string;
  eligible: string;
  ineligible: string;
  thresholdLine: (lot: number) => string;
  metricCoverage: string;
  metricPermeability: string;
  basisCoverage: string;
  basisPermeability: string;
  footer: string;
  unit: string;
  aiInsightTitle: string;
  aiInsightLoading: string;
  aiInsightError: string;
}> = {
  en: {
    title: 'SSD Feasibility',
    basisTag: 'ResCode · NCC 2026',
    awaiting: 'Awaiting spatial data to run feasibility…',
    eligible: 'SSD Eligible',
    ineligible: `SSD Ineligible (Lot ≤ ${SSD_MIN_LOT_SIZE_M2}m²)`,
    thresholdLine: (lot) =>
      `Lot ${Math.round(lot).toLocaleString()} m² · Threshold > ${SSD_MIN_LOT_SIZE_M2} m²`,
    metricCoverage: 'Max Site Coverage',
    metricPermeability: 'Min Permeability',
    basisCoverage: 'GRZ / NRZ · Standard B8',
    basisPermeability: 'ResCode · Standard B9',
    footer:
      'Indicative envelope only. Final eligibility also depends on zone, overlays, frontage, slope, and ResCode Minimum Garden Area — confirm against the full Feasibility tab before lodgement.',
    unit: 'm²',
    aiInsightTitle: 'AI Preliminary Insight',
    aiInsightLoading: 'Generating preliminary site assessment…',
    aiInsightError: 'Unable to generate insight. Please try again later.',
  },
  zh: {
    title: 'SSD 可行性',
    basisTag: 'ResCode · NCC 2026',
    awaiting: '正在等待空间数据以运行可行性分析…',
    eligible: '符合 SSD 资格',
    ineligible: `不符合 SSD 资格 (地块 ≤ ${SSD_MIN_LOT_SIZE_M2} m²)`,
    thresholdLine: (lot) =>
      `地块 ${Math.round(lot).toLocaleString()} m² · 阈值 > ${SSD_MIN_LOT_SIZE_M2} m²`,
    metricCoverage: '最大场地覆盖率',
    metricPermeability: '最小透水率',
    basisCoverage: 'GRZ / NRZ · Standard B8',
    basisPermeability: 'ResCode · Standard B9',
    footer:
      '本估算仅作初步参考。最终资格仍取决于分区、规划覆盖区、临街宽度、坡度及 ResCode 最小花园面积 — 在递交前请以完整可行性页为准。',
    unit: 'm²',
    aiInsightTitle: 'AI 初步洞察',
    aiInsightLoading: '正在生成初步场地评估…',
    aiInsightError: '无法生成洞察。请稍后重试。',
  },
};

export default function SSDFeasibilityWidget({ landSizeM2, address, lang = 'en' }: Props) {
  const t = COPY[lang];
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState(false);

  const hasArea =
    typeof landSizeM2 === 'number' && Number.isFinite(landSizeM2) && landSizeM2 > 0;

  useEffect(() => {
    if (!hasArea && address && !aiInsight && !isLoadingInsight && !insightError) {
      setIsLoadingInsight(true);
      fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.insight) {
            setAiInsight(data.insight);
          } else {
            setInsightError(true);
          }
        })
        .catch(() => {
          setInsightError(true);
        })
        .finally(() => {
          setIsLoadingInsight(false);
        });
    }
  }, [hasArea, address, aiInsight, isLoadingInsight, insightError]);

  if (!hasArea) {
    if (isLoadingInsight || aiInsight || insightError) {
      return (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-[#E9E778]/20 bg-gradient-to-br from-[#E9E778]/[0.08] to-[#E9E778]/[0.02] p-5 backdrop-blur-sm"
        >
          <header className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#E9E778]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#E9E778]">
                {t.aiInsightTitle}
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Gemini 1.5 Pro
            </span>
          </header>
          {isLoadingInsight && (
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="h-4 w-4 flex-none animate-spin text-[#E9E778]" />
              <p className="text-sm">{t.aiInsightLoading}</p>
            </div>
          )}
          {insightError && (
            <p className="text-sm text-rose-400">{t.aiInsightError}</p>
          )}
          {aiInsight && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {aiInsight}
              </p>
            </div>
          )}
        </motion.section>
      );
    }

    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
        aria-busy="true"
      >
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {t.title}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {t.basisTag}
          </span>
        </header>
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-4 w-4 flex-none animate-spin text-[#E9E778]" />
          <p className="text-sm">{t.awaiting}</p>
        </div>
      </motion.section>
    );
  }

  const lot = landSizeM2 as number;
  const eligible = lot > SSD_MIN_LOT_SIZE_M2;
  const siteCoverageM2 = Math.round(lot * SITE_COVERAGE_FRACTION);
  const permeabilityM2 = Math.round(lot * PERMEABILITY_FRACTION);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t.title}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          {t.basisTag}
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
            {eligible ? t.eligible : t.ineligible}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            {t.thresholdLine(lot)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FeasibilityMetric
          icon={<Layers className="h-4 w-4 text-[#E9E778]" />}
          label={t.metricCoverage}
          valueM2={siteCoverageM2}
          fraction={SITE_COVERAGE_FRACTION}
          basis={t.basisCoverage}
          unit={t.unit}
          dimmed={!eligible}
        />
        <FeasibilityMetric
          icon={<Droplets className="h-4 w-4 text-[#E9E778]" />}
          label={t.metricPermeability}
          valueM2={permeabilityM2}
          fraction={PERMEABILITY_FRACTION}
          basis={t.basisPermeability}
          unit={t.unit}
          dimmed={!eligible}
        />
      </div>

      <footer className="mt-4 flex items-start gap-2 border-t border-white/5 pt-3">
        <Ruler className="mt-0.5 h-3 w-3 flex-none text-zinc-600" aria-hidden />
        <p className="text-[11px] leading-relaxed text-zinc-500">{t.footer}</p>
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
  unit: string;
  dimmed?: boolean;
};

function FeasibilityMetric({ icon, label, valueM2, fraction, basis, unit, dimmed }: MetricProps) {
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
        <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
        {Math.round(fraction * 100)}% · {basis}
      </p>
    </div>
  );
}
