/**
 * Garden Area Compliance Card
 *
 * Displays ResCode Minimum Garden Area compliance with visual progress bar.
 * Automatically validates against Victorian Planning Provisions thresholds:
 * - 400-500 m²: 25% minimum garden area
 * - 501-650 m²: 30% minimum garden area
 * - >650 m²: 35% minimum garden area
 */

'use client';

import React from 'react';
import { Leaf, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { checkGardenArea, type GardenAreaCheck } from '@/lib/vppCompliance';

interface GardenAreaCardProps {
  lotSizeM2: number;
  existingCoverageM2: number;
  proposedFootprintM2: number;
  language: 'en' | 'zh';
}

export default function GardenAreaCard({
  lotSizeM2,
  existingCoverageM2,
  proposedFootprintM2,
  language,
}: GardenAreaCardProps) {
  const check = checkGardenArea(lotSizeM2, existingCoverageM2, proposedFootprintM2);

  const getStatusIcon = (status: GardenAreaCheck['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'violation':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'exempt':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: GardenAreaCheck['status']) => {
    switch (status) {
      case 'compliant':
        return 'border-green-500/30 bg-green-500/10';
      case 'violation':
        return 'border-red-500/30 bg-red-500/10';
      case 'exempt':
        return 'border-blue-500/30 bg-blue-500/10';
      default:
        return 'border-zinc-700 bg-zinc-900/50';
    }
  };

  const getProgressBarColor = (status: GardenAreaCheck['status']) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-500';
      case 'violation':
        return 'bg-red-500';
      default:
        return 'bg-zinc-500';
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    check.requiredM2 && check.availableM2
      ? Math.min(100, (check.availableM2 / check.requiredM2) * 100)
      : null;

  return (
    <div
      className={`backdrop-blur-md border rounded-lg p-4 ${getStatusColor(check.status)}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="w-5 h-5 text-[#E9E778]" />
        <h3 className="text-lg font-bold text-white">
          {language === 'zh' ? '最低花园面积 (Minimum Garden Area)' : 'Minimum Garden Area'}
        </h3>
        {getStatusIcon(check.status)}
      </div>

      {/* Status Message */}
      <div className="mb-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          {check.message[language]}
        </p>
      </div>

      {/* Progress Bar (only for compliant/violation cases) */}
      {progressPercentage !== null && check.requiredM2 && check.availableM2 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>
              {language === 'zh' ? '可用花园面积' : 'Available Garden Area'}
            </span>
            <span className="font-mono">
              {check.availableM2.toFixed(1)} m² / {check.requiredM2.toFixed(1)} m²
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor(check.status)}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Percentage Label */}
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">
              {language === 'zh' ? '合规进度' : 'Compliance Progress'}
            </span>
            <span
              className={`font-bold ${
                check.status === 'compliant' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Requirement Details (for lots subject to garden area rules) */}
      {check.requiredPercentage && check.bracketLabel && (
        <div className="mt-4 pt-4 border-t border-zinc-700/50">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-zinc-500 mb-1">
                {language === 'zh' ? '地块分类' : 'Lot Bracket'}
              </div>
              <div className="font-mono text-white">{check.bracketLabel}</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">
                {language === 'zh' ? '最低要求' : 'Minimum Required'}
              </div>
              <div className="font-mono text-white">
                {Math.round(check.requiredPercentage * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Note */}
      <div className="mt-4 p-3 bg-zinc-900/80 rounded text-xs text-zinc-400">
        <strong className="text-zinc-300">ResCode Reference:</strong>{' '}
        {language === 'zh'
          ? 'Clause 54.03-5 / 55.03-9 — 维多利亚州规划条款'
          : 'Clause 54.03-5 / 55.03-9 — Victoria Planning Provisions'}
      </div>
    </div>
  );
}
