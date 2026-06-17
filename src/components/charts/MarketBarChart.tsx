'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MarketBarChartProps {
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
}

export function MarketBarChart({ bedrooms, bathrooms, carspaces }: MarketBarChartProps) {
  const data = [
    { name: 'Beds', value: bedrooms || 0, color: '#E9E778' },
    { name: 'Baths', value: bathrooms || 0, color: '#a1a1aa' },
    { name: 'Cars', value: carspaces || 0, color: '#52525b' },
  ];

  return (
    <div style={{ width: '100%', height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#a1a1aa', fontSize: 11 }}
          axisLine={{ stroke: '#3f3f46' }}
        />
        <YAxis
          tick={{ fill: '#a1a1aa', fontSize: 11 }}
          axisLine={{ stroke: '#3f3f46' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 10, 14, 0.9)',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff'
          }}
          cursor={{ fill: 'rgba(233, 231, 120, 0.1)' }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
