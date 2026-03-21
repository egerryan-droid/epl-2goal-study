'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { COLORS, getThemeColor } from '@/lib/theme';
import type { GoalEvent } from '@/lib/data';

interface GoalTimelineProps {
  goals: GoalEvent[];
  homeTeam: string;
  awayTeam: string;
}

const WIDTH = 800;
const HEIGHT = 260;
const MARGIN = { top: 60, right: 40, bottom: 60, left: 40 };
const TRACK_Y = HEIGHT / 2;
const TIMELINE_LEFT = MARGIN.left;
const TIMELINE_RIGHT = WIDTH - MARGIN.right;

function minuteToX(minute: number): number {
  const maxMinute = 95;
  const t = Math.min(minute, maxMinute) / maxMinute;
  return TIMELINE_LEFT + t * (TIMELINE_RIGHT - TIMELINE_LEFT);
}

export default function GoalTimeline({ goals, homeTeam, awayTeam }: GoalTimelineProps) {
  const sorted = useMemo(
    () => [...goals].sort((a, b) => a.minute - b.minute),
    [goals],
  );

  // Theme-aware colors for SVG elements (re-reads on theme change)
  const [themeColors, setThemeColors] = useState({
    textMuted: COLORS.text.muted,
    line: 'rgba(255,255,255,0.2)',
    lineTick: 'rgba(255,255,255,0.3)',
    lineSubtle: 'rgba(255,255,255,0.1)',
    dot: 'white',
    dotStroke: 'white',
  });

  useEffect(() => {
    function update() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      setThemeColors({
        textMuted: getThemeColor('--color-text-muted') || COLORS.text.muted,
        line: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
        lineTick: isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)',
        lineSubtle: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
        dot: isLight ? '#1a1a2e' : 'white',
        dotStroke: isLight ? '#1a1a2e' : 'white',
      });
    }
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const ticks = [0, 15, 30, 45, 60, 75, 90];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[600px]" role="img" aria-label="Timeline of goals scored by minute">
        {/* Team labels */}
        <text
          x={TIMELINE_LEFT}
          y={TRACK_Y - 70}
          className="text-xs fill-text-muted font-semibold uppercase tracking-wide"
        >
          {homeTeam}
        </text>
        <text
          x={TIMELINE_LEFT}
          y={TRACK_Y + 82}
          className="text-xs fill-text-muted font-semibold uppercase tracking-wide"
        >
          {awayTeam}
        </text>

        {/* Timeline track */}
        <line
          x1={TIMELINE_LEFT}
          y1={TRACK_Y}
          x2={TIMELINE_RIGHT}
          y2={TRACK_Y}
          stroke={themeColors.line}
          strokeWidth={2}
        />

        {/* Minute ticks */}
        {ticks.map((m) => {
          const x = minuteToX(m);
          return (
            <g key={m}>
              <line
                x1={x}
                y1={TRACK_Y - 6}
                x2={x}
                y2={TRACK_Y + 6}
                stroke={themeColors.lineTick}
                strokeWidth={1}
              />
              <text
                x={x}
                y={TRACK_Y + 20}
                textAnchor="middle"
                className="text-[10px] fill-text-muted"
              >
                {m}&apos;
              </text>
            </g>
          );
        })}

        {/* Half-time line */}
        <line
          x1={minuteToX(45)}
          y1={TRACK_Y - 30}
          x2={minuteToX(45)}
          y2={TRACK_Y + 30}
          stroke={themeColors.lineSubtle}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Goal markers */}
        {sorted.map((goal, i) => {
          const x = minuteToX(goal.minute);
          const isHome = goal.scoring_side === 'home';
          const yOffset = isHome ? -30 : 30;
          const labelY = isHome ? -50 : 50;

          return (
            <motion.g
              key={goal.goal_id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.15, ease: 'backOut' }}
            >
              {/* Connector line */}
              <line
                x1={x}
                y1={TRACK_Y}
                x2={x}
                y2={TRACK_Y + yOffset}
                stroke={goal.is_plus2_moment ? COLORS.accent : themeColors.lineTick}
                strokeWidth={1}
              />

              {/* Goal dot */}
              {goal.is_plus2_moment ? (
                <>
                  <circle
                    cx={x}
                    cy={TRACK_Y + yOffset}
                    r={8}
                    fill={COLORS.accent}
                    opacity={0.25}
                  />
                  <circle
                    cx={x}
                    cy={TRACK_Y + yOffset}
                    r={5}
                    fill={COLORS.accent}
                    stroke={themeColors.dotStroke}
                    strokeWidth={1.5}
                  />
                </>
              ) : (
                <circle
                  cx={x}
                  cy={TRACK_Y + yOffset}
                  r={4}
                  fill={themeColors.dot}
                  opacity={0.85}
                />
              )}

              {/* Label */}
              <text
                x={x}
                y={TRACK_Y + labelY}
                textAnchor="middle"
                className={`text-[9px] font-medium ${
                  goal.is_plus2_moment ? 'fill-accent' : 'fill-text-secondary'
                }`}
              >
                {goal.player ?? 'Goal'} {goal.minute}&apos;
              </text>

              {/* Running score */}
              <text
                x={x}
                y={TRACK_Y + labelY + (isHome ? -12 : 12)}
                textAnchor="middle"
                className="text-[8px] fill-text-muted"
              >
                {goal.running_home}-{goal.running_away}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
