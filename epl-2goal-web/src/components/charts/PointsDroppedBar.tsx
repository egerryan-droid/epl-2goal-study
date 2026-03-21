'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  type TooltipProps,
} from 'recharts';
import { COLORS } from '@/lib/theme';
import type { SummaryTeam } from '@/lib/data';

interface PointsDroppedBarProps {
  data: SummaryTeam[];
  limit?: number;
}

interface ChartRow {
  team_key: string;
  display_name: string;
  draws: number;
  losses: number;
  points_from_draws: number;
  points_from_losses: number;
  total_points_dropped: number;
}

function truncateName(name: string, max = 12): string {
  return name.length > max ? name.slice(0, max - 1) + '\u2026' : name;
}

function CustomTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold mb-1">{d.team_key}</p>
      <p className="text-gray-400">
        Draws: <span className="text-white">{d.draws}</span>{' '}
        <span style={{ color: COLORS.draw }}>({d.points_from_draws} pts)</span>
      </p>
      <p className="text-gray-400">
        Losses: <span className="text-white">{d.losses}</span>{' '}
        <span style={{ color: COLORS.loss }}>({d.points_from_losses} pts)</span>
      </p>
      <p className="text-gray-400">
        Total dropped: <span className="text-white">{d.total_points_dropped}</span>
      </p>
    </div>
  );
}

export default function PointsDroppedBar({
  data,
  limit = 15,
}: PointsDroppedBarProps) {
  const chartData = useMemo(() => {
    const filtered = data.filter((t) => t.n_as_leader >= 10);
    const sorted = [...filtered].sort((a, b) => b.points_dropped - a.points_dropped);
    return sorted.slice(0, limit).map<ChartRow>((t) => ({
      team_key: t.team_key,
      display_name: truncateName(t.team_key),
      draws: t.draws,
      losses: t.losses,
      points_from_draws: t.draws * 2,
      points_from_losses: t.losses * 3,
      total_points_dropped: t.points_dropped,
    }));
  }, [data, limit]);

  const avgDropped = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.total_points_dropped, 0);
    return sum / chartData.length;
  }, [chartData]);

  const barHeight = 28;
  const chartHeight = Math.max(300, chartData.length * barHeight + 60);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 40, bottom: 10, left: 100 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: COLORS.text.secondary, fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
        />
        <YAxis
          type="category"
          dataKey="display_name"
          width={90}
          tick={{ fill: COLORS.text.primary, fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
        />
        <Tooltip
          content={<CustomTooltipContent />}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: COLORS.text.secondary }}
        />
        <ReferenceLine
          x={avgDropped}
          stroke={COLORS.text.muted}
          strokeDasharray="4 4"
          label={{
            value: `Avg ${avgDropped.toFixed(1)}`,
            position: 'top',
            fill: COLORS.text.muted,
            fontSize: 10,
          }}
        />
        <Bar
          dataKey="points_from_draws"
          stackId="dropped"
          name="From Draws"
          fill={COLORS.draw}
          radius={[0, 0, 0, 0]}
          isAnimationActive={true}
          animationDuration={800}
        />
        <Bar
          dataKey="points_from_losses"
          stackId="dropped"
          name="From Losses"
          fill={COLORS.loss}
          radius={[0, 4, 4, 0]}
          isAnimationActive={true}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
