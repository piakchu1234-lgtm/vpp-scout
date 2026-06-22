/**
 * Highest & Best Use (HBU) Card
 *
 * Displays AI-powered development strategy recommendations that analyze:
 * - Lot size and buildable envelope (after garden area + parking deductions)
 * - Zone and planning controls
 * - Suburb market context and comparable sales
 * - Optimal product mix for maximum profitability
 */

'use client';

import React from 'react';
import { TrendingUp, DollarSign, Target } from 'lucide-react';

interface HighestBestUseCardProps {
  highestBestUse: string | null;
  language: 'en' | 'zh';
}

export default function HighestBestUseCard({
  highestBestUse,
  language,
}: HighestBestUseCardProps) {
  if (!highestBestUse) return null;

  return (
    <div className="bg-gradient-to-br from-[#E9E778]/10 to-zinc-900/50 backdrop-blur-md border border-[#E9E778]/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[#E9E778]" />
        <h3 className="text-lg font-bold text-white">
          {language === 'zh' ? 'Highest & Best Use (最优用途分析)' : 'Highest & Best Use'}
        </h3>
        <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-[#E9E778]/20 rounded text-xs font-semibold text-[#E9E778]">
          <TrendingUp className="w-3 h-3" />
          <span>{language === 'zh' ? 'AI 策略' : 'AI Strategy'}</span>
        </div>
      </div>

      {/* Strategic Recommendation */}
      <div className="space-y-3">
        <div className="p-4 bg-zinc-900/80 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
            {highestBestUse}
          </p>
        </div>

        {/* Financial Indicator Icons */}
        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>{language === 'zh' ? '财务建模' : 'Financial Modelling'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Target className="w-4 h-4 text-blue-400" />
            <span>{language === 'zh' ? '市场定位' : 'Market Positioning'}</span>
          </div>
        </div>
      </div>

      {/* Context Note */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
        <strong>
          {language === 'zh' ? '分析依据:' : 'Analysis Based On:'}
        </strong>{' '}
        {language === 'zh'
          ? '地块几何形状、ResCode 花园面积扣减、Clause 52.06 车位扣减、区域分区、以及本地市场可比销售数据。'
          : 'Lot geometry, ResCode garden area deductions, Clause 52.06 parking deductions, zone controls, and local market comparables.'}
      </div>
    </div>
  );
}
