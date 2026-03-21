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
}

function CustomDot({ cx = 0, cy = 0, payload, hoveredTeam, onHover }: CustomDotProps) {
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
        stroke={isHovered ? 'white' : 'none'}
        strokeWidth={isHovered ? 2 : 0}
      />
      {show && (
        <text
          x={cx}
          y={cy - payload.r - 6}
          textAnchor="middle"
          className="text-[10px] fill-gray-300 font-medium"
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

export default function BubbleScatter({ data, minEvents = 0 }: BubbleScatterProps) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="n_as_leader"
            name="Events"
            tick={{ fill: '#BDC3C7', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            label={{
              value: 'Number of +2 Events',
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#7F8C8D', fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="win_rate"
            name="Win Rate"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: '#BDC3C7', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            label={{
              value: 'Win Rate',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: '#7F8C8D', fontSize: 11 },
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
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
