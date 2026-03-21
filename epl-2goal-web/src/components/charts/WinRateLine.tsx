'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SummaryBucket } from '@/lib/data';

interface WinRateLineProps {
  data: SummaryBucket[];
}

interface ChartRow {
  bucket: string;
  win_rate: number;
  win_ci_low: number;
  win_ci_high: number;
  n: number;
  ci_range: [number, number];
}

function CustomTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-surface-dark border border-surface-light rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-text-primary font-semibold mb-1">{d.bucket}</p>
      <p className="text-text-muted">
        Win rate: <span className="text-text-primary">{(d.win_rate * 100).toFixed(1)}%</span>
      </p>
      <p className="text-text-muted">
        95% CI: <span className="text-text-primary">
          {(d.win_ci_low * 100).toFixed(1)}% &ndash; {(d.win_ci_high * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-text-muted">
        n: <span className="text-text-primary">{d.n}</span>
      </p>
    </div>
  );
}

export default function WinRateLine({ data }: WinRateLineProps) {
  const tc = useThemeColors();

  const chartData: ChartRow[] = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.bucket_order - b.bucket_order)
        .map((b) => ({
          bucket: b.bucket_key,
          win_rate: b.win_rate,
          win_ci_low: b.win_ci_low,
          win_ci_high: b.win_ci_high,
          n: b.n,
          ci_range: [b.win_ci_low, b.win_ci_high] as [number, number],
        })),
    [data],
  );

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div role="img" aria-label="Line chart of win rate over time">
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 10, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tc.textMuted} strokeOpacity={0.12} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: tc.textSecondary, fontSize: 11 }}
            axisLine={{ stroke: tc.textMuted }}
          />
          <YAxis
            domain={[0.8, 1.0]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: tc.textSecondary, fontSize: 11 }}
            axisLine={{ stroke: tc.textMuted }}
          />
          <Tooltip content={<CustomTooltipContent />} />

          {/* CI band */}
          <Area
            dataKey="ci_range"
            fill={COLORS.win}
            fillOpacity={0.12}
            stroke="none"
            type="monotone"
            isAnimationActive={true}
            animationDuration={800}
          />

          {/* Threshold lines */}
          <ReferenceLine
            y={0.90}
            stroke={COLORS.draw}
            strokeDasharray="6 4"
            strokeWidth={1}
            label={{
              value: '90%',
              position: 'right',
              style: { fill: COLORS.draw, fontSize: 10 },
            }}
          />
          <ReferenceLine
            y={0.95}
            stroke={COLORS.win}
            strokeDasharray="6 4"
            strokeWidth={1}
            label={{
              value: '95%',
              position: 'right',
              style: { fill: COLORS.win, fontSize: 10 },
            }}
          />

          {/* Main line */}
          <Line
            type="monotone"
            dataKey="win_rate"
            stroke={COLORS.win}
            strokeWidth={2.5}
            dot={{ r: 5, fill: COLORS.win, stroke: tc.surfaceDark, strokeWidth: 2 }}
            activeDot={{ r: 7, fill: COLORS.win, stroke: tc.textPrimary, strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
