/**
 * Parking Deduction Card
 *
 * Displays Clause 52.06 car parking deduction for multi-dwelling developments.
 * Automatically calculates realistic buildable area after subtracting mandatory
 * parking, garages, and driveways.
 */

'use client';

import React from 'react';
import { Car, Minimize2 } from 'lucide-react';
import { calculateParkingDeduction, type DwellingCount } from '@/lib/vppCompliance';

interface ParkingDeductionCardProps {
  dwellingCount: DwellingCount;
  bedroomsPerDwelling: number;
  grossLotSizeM2: number;
  language: 'en' | 'zh';
  onDwellingCountChange?: (count: DwellingCount) => void;
}

export default function ParkingDeductionCard({
  dwellingCount,
  bedroomsPerDwelling,
  grossLotSizeM2,
  language,
  onDwellingCountChange,
}: ParkingDeductionCardProps) {
  const parking = calculateParkingDeduction(dwellingCount, bedroomsPerDwelling);
  const netBuildableM2 = Math.max(0, grossLotSizeM2 - parking.deductedM2);
  const deductionPercentage = grossLotSizeM2 > 0 ? (parking.deductedM2 / grossLotSizeM2) * 100 : 0;

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Car className="w-5 h-5 text-[#E9E778]" />
        <h3 className="text-lg font-bold text-white">
          {language === 'zh' ? 'Clause 52.06 车位扣减' : 'Clause 52.06 Car Parking'}
        </h3>
      </div>

      {/* Dwelling Count Selector */}
      {onDwellingCountChange && (
        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">
            {language === 'zh' ? '拟建住宅数量' : 'Proposed Dwelling Count'}
          </label>
          <select
            value={dwellingCount}
            onChange={(e) => onDwellingCountChange(Number(e.target.value) as DwellingCount)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E9E778] transition-colors"
          >
            <option value={1}>1 {language === 'zh' ? '套住宅' : 'Dwelling'}</option>
            <option value={2}>2 {language === 'zh' ? '套住宅' : 'Dwellings'} (Dual Occupancy)</option>
            <option value={3}>3 {language === 'zh' ? '套住宅' : 'Dwellings'}</option>
            <option value={4}>4 {language === 'zh' ? '套住宅' : 'Dwellings'}</option>
            <option value={5}>5 {language === 'zh' ? '套住宅' : 'Dwellings'}</option>
            <option value={6}>6 {language === 'zh' ? '套住宅' : 'Dwellings'}</option>
          </select>
        </div>
      )}

      {/* Parking Requirement Summary */}
      <div className="mb-4 p-3 bg-zinc-800/50 rounded">
        <p className="text-sm text-zinc-300 leading-relaxed">
          {parking.message[language]}
        </p>
      </div>

      {/* Deduction Breakdown */}
      <div className="space-y-3">
        {/* Gross Lot Size */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            {language === 'zh' ? '总地块面积' : 'Gross Lot Size'}
          </span>
          <span className="font-mono text-white">{grossLotSizeM2.toFixed(1)} m²</span>
        </div>

        {/* Parking Deduction */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-red-400" />
            <span className="text-zinc-400">
              {language === 'zh' ? '车位扣减' : 'Parking Deduction'}
            </span>
          </div>
          <span className="font-mono text-red-400">
            -{parking.deductedM2.toFixed(0)} m² ({deductionPercentage.toFixed(1)}%)
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-700" />

        {/* Net Buildable Area */}
        <div className="flex items-center justify-between text-base">
          <span className="font-semibold text-white">
            {language === 'zh' ? '净可建造面积' : 'Net Buildable Area'}
          </span>
          <span className="font-mono font-bold text-[#E9E778]">
            {netBuildableM2.toFixed(1)} m²
          </span>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
        <strong>
          {language === 'zh' ? '建筑师备注:' : 'Architect Note:'}
        </strong>{' '}
        {language === 'zh'
          ? '此扣减反映了车库、车道和回车空间的现实占地。ROI 计算已基于净可建造面积更新。'
          : 'This deduction reflects realistic site allocation for garages, driveways, and turnarounds. ROI calculations updated to net buildable area.'}
      </div>
    </div>
  );
}
