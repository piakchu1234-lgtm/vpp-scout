'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Language } from '@/lib/i18n/propertyUi';

interface SpatialPieChartProps {
  landSize: number;
  effectiveLandSize: number | null;
  language?: Language;
}

export function SpatialPieChart({ landSize, effectiveLandSize, language = 'en' }: SpatialPieChartProps) {
  const usedLand = effectiveLandSize || landSize * 0.6;
  const permeable = landSize - usedLand;

  const data = [
    {
      name: language === 'en' ? 'Built Footprint' : '建筑占地',
      value: usedLand,
      color: '#E9E778'
    },
    {
      name: language === 'en' ? 'Permeable Area' : '透水面积',
      value: permeable,
      color: '#27272a'
    },
  ];

  return (
    <div style={{ width: '100%', height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 10, 14, 0.9)',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff'
          }}
          formatter={(value: any) => `${Number(value).toFixed(1)} m²`}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
          formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
