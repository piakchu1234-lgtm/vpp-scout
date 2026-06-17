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
      actual: activeScenario?.maxHeight || 9,
      threshold: 11, // GRZ typical max
    },
    {
      parameter: 'Front Setback',
      actual: activeScenario?.setbackFront || 4,
      threshold: 5, // Typical GRZ requirement
    },
    {
      parameter: 'Side Setback',
      actual: activeScenario?.setbackSide || 1,
      threshold: 1.5,
    },
    {
      parameter: 'Site Coverage',
      actual: activeScenario?.maxFootprintRatio || 50,
      threshold: 60, // GRZ max
    },
    {
      parameter: 'Garden Area',
      actual: activeScenario?.minLandscaping || 25,
      threshold: 25, // GRZ min (inverted - more is better)
    },
  ];

  return <ComplianceRadar metrics={metrics} />;
}
