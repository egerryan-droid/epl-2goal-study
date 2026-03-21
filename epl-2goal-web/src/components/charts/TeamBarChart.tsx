'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { SummaryTeam } from '@/lib/data';

type MetricKey = 'win_rate' | 'points_dropped' | 'n_as_leader';

interface TeamBarChartProps {
  data: SummaryTeam[];
  metric?: MetricKey;
  limit?: number;
}

const METRIC_CONFIG: Record<MetricKey, { label: string; format: (v: number) => string; domain?: [number, number] }> = {
  win_rate: {
    label: 'Win Rate',
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  points_dropped: {
    label: 'Points Dropped',
    format: (v) => v.toFixed(0),
  },
  n_as_leader: {
    label: 'Events as Leader',
    format: (v) => v.toFixed(0),
  },
};

function barColor(value: number, min: number, max: number, metric: MetricKey): string {
  if (metric === 'points_dropped') {
    // More dropped = worse = redder
    const t = max > min ? (value - min) / (max - min) : 0;
    return t > 0.5 ? COLORS.loss : t > 0.25 ? COLORS.draw : COLORS.win;
  }
  if (metric === 'win_rate') {
    if (value >= 0.95) return COLORS.win;
    if (value >= 0.90) return '#a3d977';
    if (value >= 0.85) return COLORS.draw;
    return COLORS.loss;
  }
  return COLORS.accent;
}

function CustomTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as SummaryTeam & { display_value: string };
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold mb-1">{d.team_key}</p>
      <p className="text-gray-400">
        Events: <span className="text-white">{d.n_as_leader}</span>
      </p>
      <p className="text-gray-400">
        Win rate: <span className="text-white">{(d.win_rate * 100).toFixed(1)}%</span>
      </p>
      <p className="text-gray-400">
        W/D/L: <span className="text-white">{d.wins}/{d.draws}/{d.losses}</span>
      </p>
      <p className="text-gray-400">
        Pts dropped: <span className="text-white">{d.points_dropped}</span>
      </p>
    </div>
  );
}

export default function TeamBarChart({
  data,
  metric = 'win_rate',
  limit = 15,
}: TeamBarChartProps) {
  const config = METRIC_CONFIG[metric];

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (metric === 'points_dropped') return b[metric] - a[metric];
      return b[metric] - a[metric];
    });
    return sorted.slice(0, limit).map((t) => ({
      ...t,
      display_value: config.format(t[metric]),
    }));
  }, [data, metric, limit, config]);

  const values = chartData.map((d) => d[metric]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const barHeight = 28;
  const chartHeight = Math.max(300, chartData.length * barHeight + 60);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 80, bottom: 10, left: 90 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#BDC3C7', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            tickFormatter={metric === 'win_rate' ? (v: number) => `${(v * 100).toFixed(0)}%` : undefined}
          />
          <YAxis
            type="category"
            dataKey="team_key"
            width={80}
            tick={{ fill: '#ECF0F1', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            dataKey={metric}
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={800}
            label={{
              position: 'right',
              formatter: (value: number) => config.format(value),
              style: { fill: '#BDC3C7', fontSize: 10 },
            }}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry[metric], minVal, maxVal, metric)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
