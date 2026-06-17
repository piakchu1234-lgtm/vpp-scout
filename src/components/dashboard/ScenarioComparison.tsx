'use client';

import React from 'react';
import { Building2, Home, ShoppingBag, CheckCircle, XCircle } from 'lucide-react';
import type { YieldData } from '@/lib/yieldEngine';

type Lang = 'en' | 'zh';

type ScenarioComparisonProps = {
  yieldData: YieldData;
  lang: Lang;
};

const LABELS = {
  scenarioComparison: { en: 'Development Scenario Comparison', zh: '开发场景对比' },
  townhouse: { en: 'Townhouse', zh: '联排别墅' },
  apartment: { en: 'Apartment Multi-Storey', zh: '多层公寓' },
  commercial: { en: 'Commercial / Mixed-Use', zh: '商业 / 混合用途' },
  maxYield: { en: 'Max Yield', zh: '最大产量' },
  dwellings: { en: 'dwellings', zh: '住宅单元' },
  units: { en: 'units', zh: '单元' },
  fsr: { en: 'Floor Space Ratio', zh: '容积率' },
  gfa: { en: 'Gross Floor Area', zh: '总建筑面积' },
  setbackEnvelope: { en: 'Setback Envelope', zh: '退界范围' },
  front: { en: 'Front', zh: '前退界' },
  side: { en: 'Side', zh: '侧退界' },
  rear: { en: 'Rear', zh: '后退界' },
  landscaping: { en: 'Site Landscaping', zh: '场地绿化' },
  coverage: { en: 'coverage', zh: '覆盖率' },
  feasible: { en: 'Feasible', zh: '可行' },
  notFeasible: { en: 'Not Feasible', zh: '不可行' },
  retailSpace: { en: 'Active Retail', zh: '零售空间' },
  residentialGFA: { en: 'Residential GFA', zh: '住宅建筑面积' },
  maxHeight: { en: 'Max Height', zh: '最大高度' },
  storeys: { en: 'storeys', zh: '层' },
  noScenarioData: { en: 'Scenario analysis unavailable', zh: '场景分析不可用' },
  parkingReduction: { en: 'Parking Reduction', zh: '停车位减免' },
  pptn: { en: 'PPTN Catchment', zh: 'PPTN 范围' },
  precinct1: { en: 'Precinct 1 PO', zh: '1 区停车覆盖区' },
  none: { en: 'None', zh: '无' },
  additionalYield: { en: 'Additional yield', zh: '额外产量' },
};

export default function ScenarioComparison({ yieldData, lang }: ScenarioComparisonProps) {
  if (!yieldData.scenarios) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
        <p className="text-sm text-zinc-500">{LABELS.noScenarioData[lang]}</p>
      </div>
    );
  }

  const { townhouse, apartment, commercial } = yieldData.scenarios;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
        {LABELS.scenarioComparison[lang]}
      </h3>

      {/* Dense Data Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">
                {/* Metric column header */}
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800/50">
                <div className="flex items-center justify-center gap-2">
                  <Home className="w-4 h-4 text-[#E9E778]" />
                  {LABELS.townhouse[lang]}
                </div>
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800/50">
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4 text-[#E9E778]" />
                  {LABELS.apartment[lang]}
                </div>
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800/50">
                <div className="flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#E9E778]" />
                  {LABELS.commercial[lang]}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Max Yield */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.maxYield[lang]}
              </td>
              <td className="px-3 py-3 text-center font-bold text-white bg-zinc-900/40">
                {townhouse.feasible ? (
                  <span className="text-[#E9E778]">
                    {townhouse.maxYield} {LABELS.dwellings[lang]}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-center font-bold text-white bg-zinc-900/40">
                {apartment.feasible ? (
                  <span className="text-[#E9E778]">
                    {apartment.maxYield} {LABELS.units[lang]}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-center font-bold text-white bg-zinc-900/40">
                {commercial.feasible ? (
                  <span className="text-[#E9E778]">
                    {commercial.maxYield} {LABELS.units[lang]}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>

            {/* Row 2: FSR */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.fsr[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {apartment.feasible ? `${apartment.floorSpaceRatio.toFixed(1)}:1` : '—'}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${commercial.floorSpaceRatio.toFixed(1)}:1` : '—'}
              </td>
            </tr>

            {/* Row 3: GFA */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.gfa[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {apartment.feasible ? `${Math.round(apartment.maxGFA)} m²` : '—'}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${Math.round(commercial.maxGFA)} m²` : '—'}
              </td>
            </tr>

            {/* Row 4: Setback Envelope */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.setbackEnvelope[lang]}
              </td>
              <td className="px-3 py-3 text-center text-xs text-white bg-zinc-900/40">
                {townhouse.feasible ? (
                  <div className="space-y-0.5">
                    <div>{LABELS.front[lang]}: {townhouse.setbackFront}m</div>
                    <div>{LABELS.side[lang]}: {townhouse.setbackSide}m</div>
                    <div>{LABELS.rear[lang]}: {townhouse.setbackRear}m</div>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-3 text-center text-xs text-white bg-zinc-900/40">
                {apartment.feasible ? (
                  <div className="space-y-0.5">
                    <div>{LABELS.front[lang]}: {apartment.setbackFront}m</div>
                    <div>{LABELS.side[lang]}: {apartment.setbackSide}m</div>
                    <div>{LABELS.rear[lang]}: {apartment.setbackRear}m</div>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-3 text-center text-xs text-zinc-400 bg-zinc-900/40">
                Variable
              </td>
            </tr>

            {/* Row 5: Landscaping Coverage */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.landscaping[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {townhouse.feasible ? `${townhouse.minLandscaping}% ${LABELS.coverage[lang]}` : '—'}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {apartment.feasible ? `${apartment.minLandscaping}% ${LABELS.coverage[lang]}` : '—'}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${commercial.minLandscaping}% ${LABELS.coverage[lang]}` : '—'}
              </td>
            </tr>

            {/* Row 6: Max Height (Apartment & Commercial only) */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.maxHeight[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                9m (2 {LABELS.storeys[lang]})
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {apartment.feasible ? `${apartment.maxHeight}m (${apartment.storeys} ${LABELS.storeys[lang]})` : '—'}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${commercial.maxHeight}m (${commercial.storeys} ${LABELS.storeys[lang]})` : '—'}
              </td>
            </tr>

            {/* Row 7: Commercial-specific - Retail Space */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.retailSpace[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${Math.round(commercial.retailFloorSpace)} m²` : '—'}
              </td>
            </tr>

            {/* Row 8: Commercial-specific - Residential Air Rights */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.residentialGFA[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.feasible ? `${Math.round(commercial.residentialAirRights)} m²` : '—'}
              </td>
            </tr>

            {/* Row 9: Parking Reduction (VC311/VC277) */}
            <tr className="border-b border-zinc-800">
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.parkingReduction[lang]}
              </td>
              <td className="px-3 py-3 text-center text-sm text-zinc-400 bg-zinc-900/40">
                N/A
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {apartment.parkingReduction?.applies ? (
                  <div className="space-y-1">
                    <div className="text-[#E9E778] font-bold">
                      {apartment.parkingReduction.trigger === 'PPTN'
                        ? LABELS.pptn[lang]
                        : LABELS.precinct1[lang]}
                    </div>
                    <div className="text-xs text-zinc-400">
                      -{apartment.parkingReduction.reductionPercentage}% {LABELS.parkingReduction[lang]}
                    </div>
                    {apartment.parkingReduction.additionalYield > 0 && (
                      <div className="text-xs text-green-400">
                        +{apartment.parkingReduction.additionalYield} {LABELS.additionalYield[lang]}
                      </div>
                    )}
                  </div>
                ) : (
                  LABELS.none[lang]
                )}
              </td>
              <td className="px-3 py-3 text-center text-sm text-white bg-zinc-900/40">
                {commercial.parkingReduction?.applies ? (
                  <div className="space-y-1">
                    <div className="text-[#E9E778] font-bold">
                      {commercial.parkingReduction.trigger === 'PPTN'
                        ? LABELS.pptn[lang]
                        : LABELS.precinct1[lang]}
                    </div>
                    <div className="text-xs text-zinc-400">
                      -{commercial.parkingReduction.reductionPercentage}% {LABELS.parkingReduction[lang]}
                    </div>
                    {commercial.parkingReduction.additionalYield > 0 && (
                      <div className="text-xs text-green-400">
                        +{commercial.parkingReduction.additionalYield} {LABELS.additionalYield[lang]}
                      </div>
                    )}
                  </div>
                ) : (
                  LABELS.none[lang]
                )}
              </td>
            </tr>

            {/* Row 10: Feasibility Status */}
            <tr>
              <td className="px-3 py-3 text-xs font-semibold text-zinc-400">
                {LABELS.feasible[lang]}
              </td>
              <td className="px-3 py-3 text-center bg-zinc-900/40">
                {townhouse.feasible ? (
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.feasible[lang]}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.notFeasible[lang]}</span>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-center bg-zinc-900/40">
                {apartment.feasible ? (
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.feasible[lang]}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.notFeasible[lang]}</span>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-center bg-zinc-900/40">
                {commercial.feasible ? (
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.feasible[lang]}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{LABELS.notFeasible[lang]}</span>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
