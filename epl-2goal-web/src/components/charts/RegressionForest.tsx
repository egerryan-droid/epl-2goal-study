'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { SummaryRegression } from '@/lib/data';

interface RegressionForestProps {
  data: SummaryRegression[];
}

const MARGIN = { top: 30, right: 140, bottom: 30, left: 180 };
const ROW_HEIGHT = 36;
const DOT_RADIUS = 5;

export default function RegressionForest({ data }: RegressionForestProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.odds_ratio - a.odds_ratio),
    [data],
  );

  const height = MARGIN.top + MARGIN.bottom + sorted.length * ROW_HEIGHT;
  const width = 700;
  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotWidth = plotRight - plotLeft;

  // Compute x scale: log scale for odds ratios
  // NOTE: ci_low/ci_high are log-odds coefficients, need to exponentiate
  const allORValues = sorted.flatMap((d) => [Math.exp(d.ci_low), Math.exp(d.ci_high), d.odds_ratio]);
  const minOR = Math.min(...allORValues.filter(v => v > 0 && isFinite(v)), 0.1);
  const maxOR = Math.max(...allORValues.filter(v => v > 0 && isFinite(v)), 10);

  // Use log scale
  const logMin = Math.log(minOR * 0.8);
  const logMax = Math.log(maxOR * 1.2);

  function xScale(or: number): number {
    const logVal = Math.log(Math.max(or, 0.01));
    const t = (logVal - logMin) / (logMax - logMin);
    return plotLeft + t * plotWidth;
  }

  function yPos(index: number): number {
    return MARGIN.top + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  }

  const refLineX = xScale(1.0);

  // Tick values for log scale
  const ticks = [0.25, 0.5, 1.0, 2.0, 4.0, 8.0].filter(
    (t) => t >= minOR * 0.8 && t <= maxOR * 1.2,
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px]">
        {/* Background */}
        <rect x={plotLeft} y={MARGIN.top - 10} width={plotWidth} height={sorted.length * ROW_HEIGHT + 20} fill="rgba(255,255,255,0.02)" rx={4} />

        {/* Reference line at OR = 1.0 */}
        <line
          x1={refLineX}
          y1={MARGIN.top - 10}
          x2={refLineX}
          y2={height - MARGIN.bottom + 10}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={refLineX}
          y={MARGIN.top - 16}
          textAnchor="middle"
          className="text-[9px] fill-gray-500"
        >
          OR = 1.0
        </text>

        {/* X axis ticks */}
        {ticks.map((t) => {
          const x = xScale(t);
          return (
            <g key={t}>
              <line
                x1={x}
                y1={height - MARGIN.bottom + 10}
                x2={x}
                y2={height - MARGIN.bottom + 16}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - MARGIN.bottom + 26}
                textAnchor="middle"
                className="text-[9px] fill-gray-500"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Data rows */}
        {sorted.map((d, i) => {
          const y = yPos(i);
          const isSig = d.significant === 'yes' || d.significant === 'true' || d.significant === '*';
          const ciLeft = xScale(Math.exp(d.ci_low));
          const ciRight = xScale(Math.exp(d.ci_high));
          const dotX = xScale(d.odds_ratio);

          return (
            <motion.g
              key={d.variable}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              {/* Alternating row background */}
              {i % 2 === 0 && (
                <rect
                  x={plotLeft}
                  y={y - ROW_HEIGHT / 2}
                  width={plotWidth}
                  height={ROW_HEIGHT}
                  fill="rgba(255,255,255,0.02)"
                />
              )}

              {/* Variable name (left label) */}
              <text
                x={plotLeft - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                className={`text-[11px] ${
                  isSig ? 'fill-white font-semibold' : 'fill-gray-500'
                }`}
              >
                {d.variable}
              </text>

              {/* CI line */}
              <line
                x1={ciLeft}
                y1={y}
                x2={ciRight}
                y2={y}
                stroke={isSig ? COLORS.accent : 'rgba(255,255,255,0.25)'}
                strokeWidth={isSig ? 2 : 1.5}
              />

              {/* CI caps */}
              <line x1={ciLeft} y1={y - 4} x2={ciLeft} y2={y + 4} stroke={isSig ? COLORS.accent : 'rgba(255,255,255,0.25)'} strokeWidth={1.5} />
              <line x1={ciRight} y1={y - 4} x2={ciRight} y2={y + 4} stroke={isSig ? COLORS.accent : 'rgba(255,255,255,0.25)'} strokeWidth={1.5} />

              {/* Dot at odds ratio */}
              <circle
                cx={dotX}
                cy={y}
                r={DOT_RADIUS}
                fill={isSig ? COLORS.accent : 'transparent'}
                stroke={isSig ? COLORS.accent : 'rgba(255,255,255,0.35)'}
                strokeWidth={isSig ? 0 : 1.5}
              />

              {/* Right label: OR + p-value */}
              <text
                x={plotRight + 10}
                y={y - 6}
                textAnchor="start"
                className={`text-[10px] ${isSig ? 'fill-white font-medium' : 'fill-gray-500'}`}
              >
                {d.odds_ratio.toFixed(2)}
              </text>
              <text
                x={plotRight + 10}
                y={y + 8}
                textAnchor="start"
                className="text-[8px] fill-gray-600"
              >
                p={d.p_value < 0.001 ? '<0.001' : d.p_value.toFixed(3)}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
