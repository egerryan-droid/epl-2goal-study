'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SummaryBucket } from '@/lib/data';

interface RadialBucketChartProps {
  data: SummaryBucket[];
}

const SIZE = 400;
const CENTER = SIZE / 2;
const MAX_RADIUS = 160;
const MIN_SCALE = 0.80;
const MAX_SCALE = 1.00;

const THRESHOLDS = [0.85, 0.90, 0.95, 1.00];

function scaleRadius(rate: number): number {
  const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rate));
  return ((clamped - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * MAX_RADIUS;
}

export default function RadialBucketChart({ data }: RadialBucketChartProps) {
  const tc = useThemeColors();

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.bucket_order - b.bucket_order),
    [data],
  );

  const spokeCount = sorted.length;
  const angleStep = (2 * Math.PI) / spokeCount;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[400px]">
        <g transform={`translate(${CENTER},${CENTER})`}>
          {/* Concentric threshold circles */}
          {THRESHOLDS.map((t) => {
            const r = scaleRadius(t);
            const is90 = t === 0.90;
            return (
              <g key={t}>
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke={is90 ? COLORS.accent : tc.textMuted}
                  strokeOpacity={is90 ? 1 : 0.2}
                  strokeWidth={is90 ? 1.5 : 0.5}
                  strokeDasharray={is90 ? '6 4' : 'none'}
                />
                <text
                  x={4}
                  y={-r - 2}
                  fontSize={9}
                  fill={tc.textMuted}
                  textAnchor="start"
                >
                  {(t * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Spokes */}
          {sorted.map((bucket, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = scaleRadius(bucket.win_rate);
            const endX = Math.cos(angle) * MAX_RADIUS;
            const endY = Math.sin(angle) * MAX_RADIUS;
            const spokeX = Math.cos(angle) * r;
            const spokeY = Math.sin(angle) * r;
            const labelX = Math.cos(angle) * (MAX_RADIUS + 20);
            const labelY = Math.sin(angle) * (MAX_RADIUS + 20);

            const opacity = 0.4 + 0.6 * ((bucket.win_rate - MIN_SCALE) / (MAX_SCALE - MIN_SCALE));

            return (
              <g key={bucket.bucket_key}>
                {/* Spoke line */}
                <line
                  x1={0}
                  y1={0}
                  x2={endX}
                  y2={endY}
                  stroke={tc.textMuted}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                {/* Filled spoke segment */}
                <motion.line
                  x1={0}
                  y1={0}
                  x2={spokeX}
                  y2={spokeY}
                  stroke={COLORS.win}
                  strokeWidth={14}
                  strokeLinecap="round"
                  opacity={opacity}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
                {/* Data point */}
                <motion.circle
                  cx={spokeX}
                  cy={spokeY}
                  r={5}
                  fill={COLORS.win}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                />
                {/* Bucket label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fill={tc.textSecondary}
                  fontWeight={500}
                >
                  {bucket.bucket_key}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
