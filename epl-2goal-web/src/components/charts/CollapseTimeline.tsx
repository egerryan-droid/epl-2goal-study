'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { DrawEvent, GoalDetail } from '@/lib/data';

interface CollapseTimelineProps {
  draws: DrawEvent[];
}

/* ------------------------------------------------------------------ */
/*  Layout constants for the SVG                                      */
/* ------------------------------------------------------------------ */
const SVG_W = 900;
const SVG_H = 260;
const MARGIN = { top: 50, right: 30, bottom: 40, left: 30 };
const TIMELINE_Y = SVG_H / 2;              // centre line y
const MIN_MINUTE = 0;
const MAX_MINUTE = 96;
const AXIS_TICKS = [0, 15, 30, 45, 60, 75, 90];
const GOAL_RADIUS = 14;

function xScale(minute: number): number {
  return (
    MARGIN.left +
    ((minute - MIN_MINUTE) / (MAX_MINUTE - MIN_MINUTE)) *
      (SVG_W - MARGIN.left - MARGIN.right)
  );
}

/* Extract the scorer surname (last token) */
function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function MatchHeader({
  draw,
  index,
  total,
}: {
  draw: DrawEvent;
  index: number;
  total: number;
}) {
  const home = draw.leader_is_home ? draw.leader_team : draw.opponent_team;
  const away = draw.leader_is_home ? draw.opponent_team : draw.leader_team;
  return (
    <div className="text-center mb-2">
      <p
        className="text-lg font-bold"
        style={{ color: COLORS.text.primary }}
      >
        {home}{' '}
        <span style={{ color: COLORS.draw }}>{draw.final_score}</span>{' '}
        {away}
      </p>
      <p className="text-sm" style={{ color: COLORS.text.secondary }}>
        {draw.season} &middot; +2 at {draw.minute_reached_plus2}&prime;
      </p>
      <p className="text-xs mt-0.5" style={{ color: COLORS.text.muted }}>
        {index + 1} of {total} collapses
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex justify-center gap-6 mt-2 text-xs">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: COLORS.win }}
        />
        <span style={{ color: COLORS.text.secondary }}>Leader</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: COLORS.loss }}
        />
        <span style={{ color: COLORS.text.secondary }}>Opponent</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ backgroundColor: COLORS.loss, opacity: 0.2 }}
        />
        <span style={{ color: COLORS.text.secondary }}>Collapse zone</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Goal circle with staggered animation                              */
/* ------------------------------------------------------------------ */

function GoalCircle({
  goal,
  idx,
}: {
  goal: GoalDetail;
  idx: number;
}) {
  const isLeader = goal.team === 'leader';
  const cx = xScale(goal.minute);
  const cy = isLeader ? TIMELINE_Y - 40 : TIMELINE_Y + 40;
  const fill = isLeader ? COLORS.win : COLORS.loss;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ delay: 0.15 * idx, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* connector line from centre to circle */}
      <line
        x1={cx}
        y1={TIMELINE_Y}
        x2={cx}
        y2={cy}
        stroke={fill}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.5}
      />

      {/* circle */}
      <circle cx={cx} cy={cy} r={GOAL_RADIUS} fill={fill} opacity={0.9} />

      {/* minute inside circle */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={10}
        fontWeight={700}
      >
        {goal.minute}&prime;
      </text>

      {/* scorer surname */}
      <text
        x={cx}
        y={isLeader ? cy - GOAL_RADIUS - 6 : cy + GOAL_RADIUS + 12}
        textAnchor="middle"
        fill={COLORS.text.secondary}
        fontSize={9}
      >
        {surname(goal.scorer)}
      </text>

      {/* running score */}
      <text
        x={cx}
        y={isLeader ? cy - GOAL_RADIUS - 17 : cy + GOAL_RADIUS + 23}
        textAnchor="middle"
        fill={COLORS.text.muted}
        fontSize={8}
      >
        {goal.running_score}
      </text>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Main timeline SVG for a single draw                               */
/* ------------------------------------------------------------------ */

function TimelineSvg({ draw }: { draw: DrawEvent }) {
  /* Collapse zone: from the first opponent goal after +2 moment to
     the final equaliser (last opponent goal). We derive it from goals. */
  const collapseZone = useMemo(() => {
    const opponentGoals = draw.goals.filter((g) => g.team === 'opponent');
    if (opponentGoals.length === 0) return null;
    // Goals after (or at) the +2 moment scored by the opponent
    const comebackGoals = opponentGoals.filter(
      (g) => g.minute >= draw.minute_reached_plus2,
    );
    if (comebackGoals.length === 0) return null;
    const startMin = Math.min(...comebackGoals.map((g) => g.minute));
    const endMin = Math.max(...comebackGoals.map((g) => g.minute));
    return { startMin, endMin };
  }, [draw]);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Collapse zone rectangle */}
      {collapseZone && (
        <rect
          x={xScale(collapseZone.startMin) - 6}
          y={MARGIN.top - 10}
          width={
            xScale(collapseZone.endMin) -
            xScale(collapseZone.startMin) +
            12
          }
          height={SVG_H - MARGIN.top - MARGIN.bottom + 20}
          rx={4}
          fill={COLORS.loss}
          opacity={0.12}
        />
      )}

      {/* Centre timeline line */}
      <line
        x1={MARGIN.left}
        y1={TIMELINE_Y}
        x2={SVG_W - MARGIN.right}
        y2={TIMELINE_Y}
        stroke={COLORS.text.muted}
        strokeWidth={1.5}
        opacity={0.4}
      />

      {/* Axis ticks */}
      {AXIS_TICKS.map((t) => {
        const tx = xScale(t);
        return (
          <g key={t}>
            <line
              x1={tx}
              y1={TIMELINE_Y - 4}
              x2={tx}
              y2={TIMELINE_Y + 4}
              stroke={COLORS.text.muted}
              strokeWidth={1}
            />
            <text
              x={tx}
              y={TIMELINE_Y + 18}
              textAnchor="middle"
              fill={COLORS.text.muted}
              fontSize={10}
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* +2 moment dashed vertical line */}
      <line
        x1={xScale(draw.minute_reached_plus2)}
        y1={MARGIN.top - 14}
        x2={xScale(draw.minute_reached_plus2)}
        y2={SVG_H - MARGIN.bottom + 10}
        stroke={COLORS.accent}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text
        x={xScale(draw.minute_reached_plus2)}
        y={MARGIN.top - 20}
        textAnchor="middle"
        fill={COLORS.accent}
        fontSize={10}
        fontWeight={700}
      >
        +2 ({draw.minute_reached_plus2}&prime;)
      </text>

      {/* Goal circles */}
      <AnimatePresence mode="wait">
        {draw.goals.map((g, i) => (
          <GoalCircle
            key={`${draw.event_id}-${g.minute}-${g.scorer}`}
            goal={g}
            idx={i}
          />
        ))}
      </AnimatePresence>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported carousel component                                       */
/* ------------------------------------------------------------------ */

export default function CollapseTimeline({ draws }: CollapseTimelineProps) {
  const [idx, setIdx] = useState(0);
  const total = draws.length;

  if (total === 0) {
    return (
      <p className="text-center py-8" style={{ color: COLORS.text.muted }}>
        No collapse data available.
      </p>
    );
  }

  const draw = draws[idx];

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <div>
      {/* Navigation + header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={prev}
          aria-label="Previous collapse"
          className="px-3 py-1 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: COLORS.surface.light,
            color: COLORS.text.primary,
          }}
        >
          &larr; Prev
        </button>

        <MatchHeader draw={draw} index={idx} total={total} />

        <button
          onClick={next}
          aria-label="Next collapse"
          className="px-3 py-1 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: COLORS.surface.light,
            color: COLORS.text.primary,
          }}
        >
          Next &rarr;
        </button>
      </div>

      {/* Animated swap between timelines */}
      <AnimatePresence mode="wait">
        <motion.div
          key={draw.event_id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <TimelineSvg draw={draw} />
        </motion.div>
      </AnimatePresence>

      <Legend />
    </div>
  );
}
