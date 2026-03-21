'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { DrawEvent } from '@/lib/data';

interface DrawHeatmapProps {
  data: DrawEvent[];
  maxTeams?: number;
}

const BUCKETS = ['0-15', '16-30', '31-45+', '46-60', '61-75', '76-90+'] as const;

const CELL_W = 64;
const CELL_H = 32;
const LABEL_W = 120;
const TOTAL_COL_W = 56;
const HEADER_H = 40;
const FOOTER_H = 32;
const H_LABEL_H = 20;
const GAP = 2;

function cellColor(count: number, surfaceDark: string): string {
  if (count === 0) return surfaceDark;
  // Interpolate from dim orange to bright orange (0 -> 3+)
  const t = Math.min(count / 3, 1);
  const r = Math.round(26 + (243 - 26) * t);
  const g = Math.round(26 + (156 - 26) * t);
  const b = Math.round(46 + (18 - 46) * t);
  return `rgb(${r},${g},${b})`;
}

export default function DrawHeatmap({ data, maxTeams = 20 }: DrawHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const tc = useThemeColors();

  const { rows, colTotals } = useMemo(() => {
    // Count draws per team per bucket
    const teamBucket: Record<string, Record<string, number>> = {};
    for (const ev of data) {
      const team = ev.leader_team;
      const bucket = ev.bucket;
      if (!teamBucket[team]) teamBucket[team] = {};
      teamBucket[team][bucket] = (teamBucket[team][bucket] || 0) + 1;
    }

    // Build rows with totals, sorted desc by total draws
    const rowData = Object.entries(teamBucket)
      .map(([team, buckets]) => {
        const counts = BUCKETS.map((b) => buckets[b] || 0);
        const total = counts.reduce((s, c) => s + c, 0);
        return { team, counts, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, maxTeams);

    // Column totals
    const cTotals = BUCKETS.map((_, ci) =>
      rowData.reduce((s, r) => s + r.counts[ci], 0),
    );

    return { rows: rowData, colTotals: cTotals };
  }, [data]);

  const gridW = BUCKETS.length * (CELL_W + GAP) - GAP;
  const gridH = rows.length * (CELL_H + GAP) - GAP;
  const svgW = LABEL_W + gridW + GAP + TOTAL_COL_W;
  const svgH = HEADER_H + H_LABEL_H + gridH + GAP + FOOTER_H;

  // X position for the dashed H1/H2 divider (between bucket index 2 and 3)
  const dividerX = LABEL_W + 3 * (CELL_W + GAP) - GAP / 2;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Draw heatmap by team and time bucket"
      >
        {/* Column headers */}
        {BUCKETS.map((b, ci) => (
          <text
            key={`hdr-${b}`}
            x={LABEL_W + ci * (CELL_W + GAP) + CELL_W / 2}
            y={HEADER_H - 6}
            textAnchor="middle"
            fill={tc.textSecondary}
            fontSize={11}
            fontFamily="sans-serif"
          >
            {b}
          </text>
        ))}

        {/* Total column header */}
        <text
          x={LABEL_W + gridW + GAP + TOTAL_COL_W / 2}
          y={HEADER_H - 6}
          textAnchor="middle"
          fill={tc.textMuted}
          fontSize={10}
          fontFamily="sans-serif"
        >
          Total
        </text>

        {/* H1 / H2 labels */}
        <text
          x={LABEL_W + 1.5 * (CELL_W + GAP) - GAP / 2}
          y={HEADER_H + H_LABEL_H - 4}
          textAnchor="middle"
          fill={tc.textMuted}
          fontSize={10}
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          H1
        </text>
        <text
          x={LABEL_W + 4.5 * (CELL_W + GAP) - GAP / 2}
          y={HEADER_H + H_LABEL_H - 4}
          textAnchor="middle"
          fill={tc.textMuted}
          fontSize={10}
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          H2
        </text>

        {/* Dashed H1/H2 divider */}
        <line
          x1={dividerX}
          y1={HEADER_H + H_LABEL_H}
          x2={dividerX}
          y2={HEADER_H + H_LABEL_H + gridH}
          stroke={tc.textMuted}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Rows */}
        {rows.map((row, ri) => {
          const y = HEADER_H + H_LABEL_H + ri * (CELL_H + GAP);
          return (
            <g key={row.team}>
              {/* Team label */}
              <text
                x={LABEL_W - 8}
                y={y + CELL_H / 2 + 4}
                textAnchor="end"
                fill={tc.textPrimary}
                fontSize={11}
                fontFamily="sans-serif"
              >
                {row.team}
              </text>

              {/* Cells */}
              {row.counts.map((count, ci) => {
                const x = LABEL_W + ci * (CELL_W + GAP);
                const cellKey = `${row.team}-${ci}`;
                const isHovered = hovered === cellKey;
                return (
                  <g
                    key={cellKey}
                    onMouseEnter={() => setHovered(cellKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'default' }}
                  >
                    <motion.rect
                      x={x}
                      y={y}
                      width={CELL_W}
                      height={CELL_H}
                      rx={3}
                      fill={cellColor(count, tc.surfaceDark)}
                      stroke={isHovered ? tc.textPrimary : 'transparent'}
                      strokeWidth={isHovered ? 1.5 : 0}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: ri * 0.03 + ci * 0.04,
                      }}
                    />
                    {count > 0 && (
                      <text
                        x={x + CELL_W / 2}
                        y={y + CELL_H / 2 + 4}
                        textAnchor="middle"
                        fill={count >= 2 ? '#000000' : tc.textPrimary}
                        fontSize={12}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        pointerEvents="none"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Row total */}
              <text
                x={LABEL_W + gridW + GAP + TOTAL_COL_W / 2}
                y={y + CELL_H / 2 + 4}
                textAnchor="middle"
                fill={COLORS.draw}
                fontSize={12}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {row.total}
              </text>
            </g>
          );
        })}

        {/* Column totals */}
        {colTotals.map((ct, ci) => (
          <text
            key={`ct-${ci}`}
            x={LABEL_W + ci * (CELL_W + GAP) + CELL_W / 2}
            y={HEADER_H + H_LABEL_H + gridH + GAP + FOOTER_H / 2 + 4}
            textAnchor="middle"
            fill={COLORS.draw}
            fontSize={12}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {ct}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}
