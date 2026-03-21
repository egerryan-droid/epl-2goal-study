'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';

interface AnimatedDonutProps {
  wins: number;
  draws: number;
  losses: number;
}

const INNER_RADIUS = 80;
const OUTER_RADIUS = 120;
const SIZE = 300;
const CENTER = SIZE / 2;

const arcGenerator = d3.arc<d3.PieArcDatum<number>>()
  .innerRadius(INNER_RADIUS)
  .outerRadius(OUTER_RADIUS)
  .cornerRadius(3)
  .padAngle(0.02);

export default function AnimatedDonut({ wins, draws, losses }: AnimatedDonutProps) {
  const total = wins + draws + losses;

  const segments = useMemo(() => {
    const data = [wins, draws, losses];
    const pie = d3.pie<number>().sort(null).value((d) => d);
    return pie(data);
  }, [wins, draws, losses]);

  const colors = [COLORS.win, COLORS.draw, COLORS.loss];
  const labels = ['Wins', 'Draws', 'Losses'];
  const counts = [wins, draws, losses];

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[300px]">
        <g transform={`translate(${CENTER},${CENTER})`}>
          {segments.map((seg, i) => {
            const path = arcGenerator(seg) || '';
            return (
              <motion.path
                key={i}
                d={path}
                fill={colors[i]}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: i * 0.2, ease: 'easeOut' }}
              />
            );
          })}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-3xl font-bold"
            dy="-6"
          >
            {total}
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-400 text-xs"
            dy="16"
          >
            events
          </text>
        </g>
      </svg>

      <div className="flex gap-6 flex-wrap justify-center">
        {labels.map((label, i) => (
          <motion.div
            key={label}
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
            <span className="text-gray-300">{label}</span>
            <span className="text-white font-semibold">{counts[i]}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
