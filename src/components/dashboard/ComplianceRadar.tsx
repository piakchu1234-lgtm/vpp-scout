"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ComplianceRadarProps {
  metrics: {
    parameter: string;
    actual: number;
    threshold: number;
  }[];
}

export function ComplianceRadar({ metrics }: ComplianceRadarProps) {
  // Normalize values on a 0-100 scale for visual plotting uniformity
  const chartData = metrics.map((m) => ({
    subject: m.parameter,
    "Current Site": Math.min((m.actual / m.threshold) * 100, 100),
    "Max Allowance": 100,
    fullValue: `${m.actual.toFixed(1)} / ${m.threshold.toFixed(1)}`,
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
          />
          <PolarRadiusAxis
            tick={false}
            axisLine={false}
            domain={[0, 100]}
          />
          <Radar
            name="Max Threshold"
            dataKey="Max Allowance"
            stroke="rgba(255,255,255,0.2)"
            fill="rgba(255,255,255,0.02)"
            fillOpacity={0.6}
          />
          <Radar
            name="Current Capacity"
            dataKey="Current Site"
            stroke="#E9E778"
            fill="#E9E778"
            fillOpacity={0.15}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10, 10, 14, 0.95)',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#fff',
              padding: '8px'
            }}
            formatter={(value: any, name: any, props: any) => {
              if (name === 'Current Site') {
                return [`${Number(value).toFixed(1)}% (${props.payload.fullValue})`, name];
              }
              return [`${Number(value).toFixed(1)}%`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#a1a1aa', paddingTop: '8px' }}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
