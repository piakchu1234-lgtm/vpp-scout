'use client';

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { YieldData } from '@/lib/yieldEngine';

interface RegulatoryRadarChartProps {
  yieldData: YieldData;
}

export function RegulatoryRadarChart({ yieldData }: RegulatoryRadarChartProps) {
  // Extract compliance metrics (normalized to 0-100 scale)
  const data = [
    { metric: 'Height', value: yieldData.scenarios?.townhouse?.feasible ? 85 : 40 },
    { metric: 'Setbacks', value: yieldData.scenarios?.townhouse?.feasible ? 90 : 50 },
    { metric: 'Coverage', value: yieldData.isFeasible ? 75 : 35 },
    { metric: 'Garden', value: yieldData.isFeasible ? 80 : 45 },
    { metric: 'Parking', value: yieldData.scenarios?.townhouse?.feasible ? 70 : 60 },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data}>
        <PolarGrid stroke="#3f3f46" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#a1a1aa', fontSize: 10 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#a1a1aa', fontSize: 9 }}
        />
        <Radar
          name="Compliance"
          dataKey="value"
          stroke="#E9E778"
          fill="#E9E778"
          fillOpacity={0.5}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 10, 14, 0.9)',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff'
          }}
          formatter={(value: any) => `${Number(value)}%`}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
