'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SummaryTeam } from '@/lib/data';

interface BubbleScatterProps {
  data: SummaryTeam[];
  minEvents?: number;
}

const TOP_N = 6;

function winRateColor(rate: number): string {
  if (rate >= 0.95) return COLORS.win;
  if (rate >= 0.90) return '#a3d977';
  if (rate >= 0.85) return COLORS.draw;
  return COLORS.loss;
}

interface DotPayload {
  team_key: string;
  n_as_leader: number;
  win_rate: number;
  points_dropped: number;
  wins: number;
  draws: number;
  losses: number;
  r: number;
  isTop: boolean;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: DotPayload;
  hoveredTeam: string | null;
  onHover: (team: string | null) => void;
  textFill: string;
}

function CustomDot({ cx = 0, cy = 0, payload, hoveredTeam, onHover, textFill }: CustomDotProps) {
  if (!payload) return null;
  const isHovered = hoveredTeam === payload.team_key;
  const show = payload.isTop || isHovered;

  return (
    <g
      onMouseEnter={() => onHover(payload.team_key)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={payload.r}
        fill={winRateColor(payload.win_rate)}
        opacity={isHovered ? 0.95 : 0.65}
        stroke={isHovered ? textFill : 'none'}
        strokeWidth={isHovered ? 2 : 0}
      />
      {show && (
        <text
          x={cx}
          y={cy - payload.r - 6}
          textAnchor="middle"
          fontSize={10}
          fill={textFill}
          fontWeight={500}
          style={{ pointerEvents: 'none' }}
        >
          {payload.team_key}
        </text>
      )}
    </g>
  );
}

function CustomTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as DotPayload;
  return (
    <div className="bg-surface-dark border border-surface-light rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-text-primary font-semibold mb-1">{d.team_key}</p>
      <p className="text-text-muted">
        Events: <span className="text-text-primary">{d.n_as_leader}</span>
      </p>
      <p className="text-text-muted">
        Win rate: <span className="text-text-primary">{(d.win_rate * 100).toFixed(1)}%</span>
      </p>
      <p className="text-text-muted">
        W/D/L: <span className="text-text-primary">{d.wins}/{d.draws}/{d.losses}</span>
      </p>
      <p className="text-text-muted">
        Pts dropped: <span className="text-text-primary">{d.points_dropped}</span>
      </p>
    </div>
  );
}

export default function BubbleScatter({ data, minEvents = 0 }: BubbleScatterProps) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const tc = useThemeColors();

  const handleHover = useCallback((team: string | null) => setHoveredTeam(team), []);

  const chartData = useMemo(() => {
    const filtered = data.filter((t) => t.n_as_leader >= minEvents);
    const sortedByEvents = [...filtered].sort((a, b) => b.n_as_leader - a.n_as_leader);
    const topTeams = new Set(sortedByEvents.slice(0, TOP_N).map((t) => t.team_key));

    const maxDropped = Math.max(...filtered.map((t) => t.points_dropped), 1);

    return filtered.map((t) => ({
      ...t,
      r: 6 + (t.points_dropped / maxDropped) * 20,
      isTop: topTeams.has(t.team_key),
    }));
  }, [data, minEvents]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tc.textMuted} strokeOpacity={0.12} />
          <XAxis
            type="number"
            dataKey="n_as_leader"
            name="Events"
            tick={{ fill: tc.textSecondary, fontSize: 11 }}
            axisLine={{ stroke: tc.textMuted }}
            label={{
              value: 'Number of +2 Events',
              position: 'insideBottom',
              offset: -10,
              style: { fill: tc.textMuted, fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="win_rate"
            name="Win Rate"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: tc.textSecondary, fontSize: 11 }}
            axisLine={{ stroke: tc.textMuted }}
            label={{
              value: 'Win Rate',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: tc.textMuted, fontSize: 11 },
            }}
          />
          <Tooltip
            content={<CustomTooltipContent />}
            cursor={false}
          />
          <Scatter
            data={chartData}
            shape={(props: unknown) => (
              <CustomDot
                {...(props as CustomDotProps)}
                hoveredTeam={hoveredTeam}
                onHover={handleHover}
                textFill={tc.textSecondary}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
