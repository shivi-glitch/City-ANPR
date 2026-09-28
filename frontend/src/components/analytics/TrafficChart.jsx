import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-[6px] p-3 shadow-2xl font-ui text-[12px] min-w-[150px]">
        <div className="text-[#AAAAAA] font-data mb-1.5 pb-1 border-b border-[#2A2A2A] flex justify-between items-center">
          <span>Time:</span>
          <span className="text-[#F0F0F0] font-semibold">{label}</span>
        </div>
        <div className="text-[#F0F0F0] font-data font-semibold flex justify-between items-center mb-1">
          <span className="text-[#888888] font-normal">Vehicles:</span>
          <span className="text-[#3B82F6]">{data.vehicle_count?.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-[#F0F0F0] font-data flex justify-between items-center">
          <span className="text-[#888888]">ANPR Reads:</span>
          <span className="text-[#22C55E]">{data.plate_reads?.toLocaleString('en-IN')}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function HourlyBarChart({ data, timePeriod = '1d' }) {
  const getInterval = () => {
    if (timePeriod === '1w') return 0; // Show all 7 days
    if (timePeriod === '1m') return 0; // Show all 4 weeks / cohorts
    if (timePeriod === 'last_hours') return 0; // Show all recent hours
    return 2; // For 24 hours show every 2-3 hours
  };

  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#2A2A2A" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#555555"
            fontSize={11}
            tickLine={false}
            interval={getInterval()}
            tick={{ fill: '#888888', fontFamily: 'var(--font-data)' }}
          />
          <YAxis
            stroke="#555555"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#888888', fontFamily: 'var(--font-data)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="vehicle_count"
            fill="#3B82F6"
            opacity={0.88}
            radius={[3, 3, 0, 0]}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IntervalsAreaChart({ data }) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2A2A2A" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#555555"
            fontSize={11}
            tickLine={false}
            interval={7}
            tick={{ fill: '#888888', fontFamily: 'var(--font-data)' }}
          />
          <YAxis
            stroke="#555555"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#888888', fontFamily: 'var(--font-data)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="vehicle_count"
            stroke="#3B82F6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#areaColor)"
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
