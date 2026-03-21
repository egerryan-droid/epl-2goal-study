'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { SummarySeason } from '@/lib/data';

interface SeasonAreaChartProps {
  data: SummarySeason[];
}

interface ChartRow {
  season: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
}

function CustomTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.reverse().map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function SeasonAreaChart({ data }: SeasonAreaChartProps) {
  const chartData: ChartRow[] = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          season: s.season_key,
          wins: s.wins,
          draws: s.draws,
          losses: s.losses,
          total: s.n,
        })),
    [data],
  );

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="season"
            tick={{ fill: '#BDC3C7', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: '#BDC3C7', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Area
            type="monotone"
            dataKey="losses"
            stackId="1"
            stroke={COLORS.loss}
            fill={COLORS.loss}
            fillOpacity={0.7}
            name="Losses"
            isAnimationActive={true}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="draws"
            stackId="1"
            stroke={COLORS.draw}
            fill={COLORS.draw}
            fillOpacity={0.7}
            name="Draws"
            isAnimationActive={true}
            animationDuration={800}
            animationBegin={200}
          />
          <Area
            type="monotone"
            dataKey="wins"
            stackId="1"
            stroke={COLORS.win}
            fill={COLORS.win}
            fillOpacity={0.7}
            name="Wins"
            isAnimationActive={true}
            animationDuration={800}
            animationBegin={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
