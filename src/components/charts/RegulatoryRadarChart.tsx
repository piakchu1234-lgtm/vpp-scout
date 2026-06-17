'use client';

import { ComplianceRadar } from '@/components/dashboard/ComplianceRadar';
import type { YieldData } from '@/lib/yieldEngine';

interface RegulatoryRadarChartProps {
  yieldData: YieldData;
}

export function RegulatoryRadarChart({ yieldData }: RegulatoryRadarChartProps) {
  // Extract real compliance metrics from YieldData
  const townhouse = yieldData.scenarios?.townhouse;
  const apartment = yieldData.scenarios?.apartment;
  const activeScenario = townhouse || apartment;

  const metrics = [
    {
      parameter: 'Height',
      actual: (activeScenario && 'maxHeight' in activeScenario) ? activeScenario.maxHeight : 9,
      threshold: 11,
    },
    {
      parameter: 'Front Setback',
      actual: activeScenario?.setbackFront || 4,
      threshold: 5,
    },
    {
      parameter: 'Side Setback',
      actual: activeScenario?.setbackSide || 1,
      threshold: 1.5,
    },
    {
      parameter: 'Site Coverage',
      actual: (activeScenario && 'maxFootprintRatio' in activeScenario) ? activeScenario.maxFootprintRatio : 50,
      threshold: 60,
    },
    {
      parameter: 'Garden Area',
      actual: activeScenario?.minLandscaping || 25,
      threshold: 25,
    },
  ];

  return <ComplianceRadar metrics={metrics} />;
}
