'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { evaluateFastTrack, type ComplianceResult } from '@/lib/complianceRules';

type Lang = 'en' | 'zh';

type ComplianceStatusProps = {
  landSizeM2: number | null;
  zoneCode: string | null;
  overlays: string[];
  frontageM: number | null;
  isVacantLand: boolean;
  isLoadingData: boolean;
  lang: Lang;
};

const LABELS = {
  title: {
    en: 'Deemed-to-Comply Status',
    zh: '视为合规状态',
  },
  loading: {
    en: 'Evaluating compliance…',
    zh: '正在评估合规性…',
  },
  eligible: {
    en: 'Planning Permit Exempt',
    zh: '豁免规划许可',
  },
  permitRequired: {
    en: 'Planning Permit Required',
    zh: '需申请规划许可',
  },
  blockingFactors: {
    en: 'Blocking Factors',
    zh: '限制因素',
  },
  permitTriggers: {
    en: 'Permit Triggers',
    zh: '许可触发条件',
  },
  reasoning: {
    en: 'Assessment Basis',
    zh: '评估依据',
  },
};

export default function ComplianceStatus({
  landSizeM2,
  zoneCode,
  overlays,
  frontageM,
  isVacantLand,
  isLoadingData,
  lang,
}: ComplianceStatusProps) {
  // Wait until we have at least one piece of geospatial data before evaluating
  const hasMinimalData = landSizeM2 !== null || zoneCode !== null;

  if (isLoadingData || !hasMinimalData) {
    return (
      <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
            {LABELS.title[lang]}
          </h3>
        </div>
        <p className="text-xs text-zinc-500">{LABELS.loading[lang]}</p>
      </div>
    );
  }

  const result: ComplianceResult = evaluateFastTrack({
    landSizeM2,
    zoneCode,
    overlays,
    frontageM,
    isVacantLand,
  });

  // Visual state mapping
  const bgColor =
    result.status === 'eligible'
      ? 'bg-emerald-950/40'
      : result.status === 'permit-required'
        ? 'bg-amber-950/30'
        : 'bg-zinc-800/50';

  const borderColor =
    result.status === 'eligible'
      ? 'border-emerald-800/60'
      : result.status === 'permit-required'
        ? 'border-amber-800/60'
        : 'border-zinc-700';

  const iconColor =
    result.status === 'eligible'
      ? 'text-emerald-400'
      : result.status === 'permit-required'
        ? 'text-amber-400'
        : 'text-zinc-400';

  const statusLabel =
    result.status === 'eligible'
      ? LABELS.eligible[lang]
      : result.status === 'permit-required'
        ? LABELS.permitRequired[lang]
        : LABELS.loading[lang];

  const StatusIcon =
    result.status === 'eligible'
      ? CheckCircle2
      : result.status === 'permit-required'
        ? AlertTriangle
        : Loader2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`mb-6 rounded-lg border ${borderColor} ${bgColor} p-4`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <StatusIcon className={`w-5 h-5 ${iconColor}`} />
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {LABELS.title[lang]}
          </h3>
          <p className="text-sm font-bold text-white mt-0.5">{statusLabel}</p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
          {LABELS.reasoning[lang]}
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">{result.reasoning}</p>
      </div>

      {/* Blocking Factors */}
      {result.blockingFactors.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
            {LABELS.blockingFactors[lang]}
          </div>
          <ul className="space-y-1">
            {result.blockingFactors.map((factor, idx) => (
              <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Permit Triggers */}
      {result.permitTriggers.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
            {LABELS.permitTriggers[lang]}
          </div>
          <ul className="space-y-1">
            {result.permitTriggers.map((trigger, idx) => (
              <li key={idx} className="text-xs text-zinc-300 leading-relaxed flex gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{trigger}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
