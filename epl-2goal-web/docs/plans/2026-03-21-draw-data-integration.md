# Draw Data Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Weave draw/collapse data, first-half vs second-half analysis, and points-dropped breakdowns into the existing scrollytelling sections (S04, S05, S07, S08).

**Architecture:** Generate 2 new JSON data files from existing fact data, build 3 new chart components (DrawHeatmap, CollapseTimeline, PointsDroppedBar), then enrich 4 existing section components with new sub-panels. No new routes or pages.

**Tech Stack:** Next.js 14, React, TypeScript, Recharts, D3, Framer Motion, Tailwind CSS

---

### Task 1: Add New TypeScript Types

**Files:**
- Modify: `src/lib/data.ts`

**Step 1: Add DrawEvent, GoalDetail, and HalfSummary interfaces**

Append to the bottom of `src/lib/data.ts`:

```typescript
export interface DrawEvent {
  event_id: string;
  match_key: number;
  season: string;
  leader_team: string;
  opponent_team: string;
  leader_is_home: boolean;
  bucket: string;
  minute_reached_plus2: number;
  final_score: string;
  strength_tier: string;
  goals: GoalDetail[];
}

export interface GoalDetail {
  minute: number;
  scorer: string;
  team: 'leader' | 'opponent';
  running_score: string;
}

export interface HalfSummary {
  half: 'H1' | 'H2';
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  draw_rate: number;
  loss_rate: number;
  buckets: string[];
}
```

**Step 2: Verify types compile**

Run: `cd C:\ryane\Projects\epl-2goal-study\epl-2goal-web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add DrawEvent, GoalDetail, HalfSummary types"
```

---

### Task 2: Generate draw_events.json Data File

**Files:**
- Create: `src/data/draw_events.json`

**Step 1: Write a Node.js script to extract draw events**

Create `scripts/generate-draw-data.mjs`:

```javascript
import { readFileSync, writeFileSync } from 'fs';

const events = JSON.parse(readFileSync('src/data/fact_plus2_events.json', 'utf8'));
const goalsByMatch = JSON.parse(readFileSync('src/data/goals_by_match.json', 'utf8'));

const drawEvents = events
  .filter(e => e.result_for_leader === 'D')
  .map(e => {
    const matchGoals = goalsByMatch[String(e.match_key)] || [];
    const leaderIsHome = e.leader_is_home;

    const goals = matchGoals.map(g => {
      const isLeaderGoal = leaderIsHome
        ? g.scoring_side === 'home'
        : g.scoring_side === 'away';

      return {
        minute: g.minute,
        scorer: g.player || 'Unknown',
        team: isLeaderGoal ? 'leader' : 'opponent',
        running_score: `${g.running_home}-${g.running_away}`,
      };
    });

    const finalScore = leaderIsHome
      ? `${e.final_leader_goals}-${e.final_opponent_goals}`
      : `${e.final_opponent_goals}-${e.final_leader_goals}`;

    return {
      event_id: e.event_id,
      match_key: e.match_key,
      season: e.season_key,
      leader_team: e.leader_team_key,
      opponent_team: e.opponent_team_key,
      leader_is_home: e.leader_is_home,
      bucket: e.bucket_key,
      minute_reached_plus2: e.minute_reached_plus2,
      final_score: finalScore,
      strength_tier: e.strength_tier || 'Unknown',
      goals,
    };
  });

writeFileSync('src/data/draw_events.json', JSON.stringify(drawEvents, null, 2));
console.log(`Generated ${drawEvents.length} draw events`);
```

**Step 2: Run the script**

Run: `cd C:\ryane\Projects\epl-2goal-study\epl-2goal-web && node scripts/generate-draw-data.mjs`
Expected: `Generated 87 draw events` (approximately)

**Step 3: Verify output**

Spot-check the JSON: match_key, goals array populated, final_score correct.

**Step 4: Commit**

```bash
git add scripts/generate-draw-data.mjs src/data/draw_events.json
git commit -m "feat: generate draw_events.json with 87 draw events and goal timelines"
```

---

### Task 3: Generate summary_half_stats.json Data File

**Files:**
- Create: `src/data/summary_half_stats.json`

**Step 1: Add half-stats generation to the script**

Append to `scripts/generate-draw-data.mjs`:

```javascript
const bucketData = JSON.parse(readFileSync('src/data/summary_by_bucket.json', 'utf8'));

const h1Buckets = bucketData.filter(b => ['0-15', '16-30', '31-45+'].includes(b.bucket_key));
const h2Buckets = bucketData.filter(b => ['46-60', '61-75', '76-90+'].includes(b.bucket_key));

function aggregateHalf(label, buckets) {
  const n = buckets.reduce((s, b) => s + b.n, 0);
  const wins = buckets.reduce((s, b) => s + b.wins, 0);
  const draws = buckets.reduce((s, b) => s + b.draws, 0);
  const losses = buckets.reduce((s, b) => s + b.losses, 0);
  return {
    half: label,
    n,
    wins,
    draws,
    losses,
    win_rate: +(wins / n).toFixed(4),
    draw_rate: +(draws / n).toFixed(4),
    loss_rate: +(losses / n).toFixed(4),
    buckets: buckets.map(b => b.bucket_key),
  };
}

const halfStats = [
  aggregateHalf('H1', h1Buckets),
  aggregateHalf('H2', h2Buckets),
];

writeFileSync('src/data/summary_half_stats.json', JSON.stringify(halfStats, null, 2));
console.log('Generated half stats:', halfStats.map(h => `${h.half}: ${h.n} events, ${(h.draw_rate * 100).toFixed(1)}% draw rate`));
```

**Step 2: Run the updated script**

Run: `cd C:\ryane\Projects\epl-2goal-study\epl-2goal-web && node scripts/generate-draw-data.mjs`
Expected: Two half summaries printed, H1 draw rate ~6%, H2 draw rate ~3%

**Step 3: Commit**

```bash
git add scripts/generate-draw-data.mjs src/data/summary_half_stats.json
git commit -m "feat: generate summary_half_stats.json with H1/H2 aggregates"
```

---

### Task 4: Build DrawHeatmap Chart Component

**Files:**
- Create: `src/components/charts/DrawHeatmap.tsx`

**Step 1: Implement the DrawHeatmap component**

```typescript
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { DrawEvent } from '@/lib/data';

interface Props {
  data: DrawEvent[];
}

const BUCKETS = ['0-15', '16-30', '31-45+', '46-60', '61-75', '76-90+'];

export default function DrawHeatmap({ data }: Props) {
  const [hovered, setHovered] = useState<{ team: string; bucket: string } | null>(null);

  const { matrix, teams, maxCount } = useMemo(() => {
    // Count draws per team×bucket
    const counts: Record<string, Record<string, number>> = {};
    data.forEach(d => {
      if (!counts[d.leader_team]) counts[d.leader_team] = {};
      counts[d.leader_team][d.bucket] = (counts[d.leader_team][d.bucket] || 0) + 1;
    });

    // Sort teams by total draws descending
    const teamTotals = Object.entries(counts).map(([team, buckets]) => ({
      team,
      total: Object.values(buckets).reduce((s, v) => s + v, 0),
    }));
    teamTotals.sort((a, b) => b.total - a.total);
    const teams = teamTotals.map(t => t.team);

    let maxCount = 0;
    teams.forEach(t => BUCKETS.forEach(b => {
      const v = counts[t]?.[b] || 0;
      if (v > maxCount) maxCount = v;
    }));

    return { matrix: counts, teams, maxCount };
  }, [data]);

  const cellSize = 36;
  const labelW = 120;
  const headerH = 60;
  const w = labelW + BUCKETS.length * cellSize + 50; // +50 for row totals
  const h = headerH + teams.length * cellSize;

  function getColor(count: number): string {
    if (count === 0) return COLORS.surface.mid;
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    // Orange interpolation
    const r = Math.round(30 + intensity * (243 - 30));
    const g = Math.round(34 + intensity * (156 - 34));
    const b = Math.round(62 + intensity * (18 - 62));
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Bucket headers */}
        {BUCKETS.map((bucket, i) => (
          <text
            key={bucket}
            x={labelW + i * cellSize + cellSize / 2}
            y={headerH - 8}
            textAnchor="middle"
            fill={COLORS.text.secondary}
            fontSize={10}
          >
            {bucket}
          </text>
        ))}
        <text
          x={labelW + BUCKETS.length * cellSize + 25}
          y={headerH - 8}
          textAnchor="middle"
          fill={COLORS.text.muted}
          fontSize={9}
        >
          Total
        </text>

        {/* H1/H2 divider */}
        <line
          x1={labelW + 3 * cellSize}
          y1={headerH - 4}
          x2={labelW + 3 * cellSize}
          y2={h}
          stroke={COLORS.accent}
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={0.6}
        />
        <text x={labelW + 1.5 * cellSize} y={headerH - 22} textAnchor="middle" fill={COLORS.accent} fontSize={9} fontWeight="bold">H1</text>
        <text x={labelW + 4.5 * cellSize} y={headerH - 22} textAnchor="middle" fill={COLORS.accent} fontSize={9} fontWeight="bold">H2</text>

        {/* Rows */}
        {teams.map((team, row) => {
          const rowTotal = BUCKETS.reduce((s, b) => s + (matrix[team]?.[b] || 0), 0);
          return (
            <g key={team}>
              <text
                x={labelW - 8}
                y={headerH + row * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                fill={COLORS.text.secondary}
                fontSize={10}
              >
                {team.length > 14 ? team.slice(0, 12) + '…' : team}
              </text>
              {BUCKETS.map((bucket, col) => {
                const count = matrix[team]?.[bucket] || 0;
                const isHovered = hovered?.team === team && hovered?.bucket === bucket;
                return (
                  <motion.rect
                    key={bucket}
                    x={labelW + col * cellSize + 1}
                    y={headerH + row * cellSize + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={4}
                    fill={getColor(count)}
                    stroke={isHovered ? '#fff' : 'transparent'}
                    strokeWidth={isHovered ? 2 : 0}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: row * 0.02 + col * 0.03 }}
                    onMouseEnter={() => setHovered({ team, bucket })}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
              {/* Cell value labels */}
              {BUCKETS.map((bucket, col) => {
                const count = matrix[team]?.[bucket] || 0;
                return count > 0 ? (
                  <text
                    key={`label-${bucket}`}
                    x={labelW + col * cellSize + cellSize / 2}
                    y={headerH + row * cellSize + cellSize / 2 + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={11}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {count}
                  </text>
                ) : null;
              })}
              {/* Row total */}
              <text
                x={labelW + BUCKETS.length * cellSize + 25}
                y={headerH + row * cellSize + cellSize / 2 + 4}
                textAnchor="middle"
                fill={COLORS.draw}
                fontSize={11}
                fontWeight="bold"
              >
                {rowTotal}
              </text>
            </g>
          );
        })}

        {/* Column totals */}
        {BUCKETS.map((bucket, col) => {
          const colTotal = teams.reduce((s, t) => s + (matrix[t]?.[bucket] || 0), 0);
          return (
            <text
              key={`total-${bucket}`}
              x={labelW + col * cellSize + cellSize / 2}
              y={h + 16}
              textAnchor="middle"
              fill={COLORS.draw}
              fontSize={10}
              fontWeight="bold"
            >
              {colTotal}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bg-surface-dark border border-draw/30 rounded-lg px-3 py-2 text-sm pointer-events-none shadow-lg z-10">
          <div className="text-text-primary font-medium">{hovered.team}</div>
          <div className="text-draw">{matrix[hovered.team]?.[hovered.bucket] || 0} draws in {hovered.bucket} min</div>
          <div className="text-text-muted">{(matrix[hovered.team]?.[hovered.bucket] || 0) * 2} pts dropped</div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/charts/DrawHeatmap.tsx
git commit -m "feat: add DrawHeatmap team×bucket matrix chart"
```

---

### Task 5: Build CollapseTimeline Chart Component

**Files:**
- Create: `src/components/charts/CollapseTimeline.tsx`

**Step 1: Implement the CollapseTimeline component**

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { DrawEvent } from '@/lib/data';

interface Props {
  draws: DrawEvent[];
}

export default function CollapseTimeline({ draws }: Props) {
  const [idx, setIdx] = useState(0);
  const match = draws[idx];
  if (!match) return null;

  const width = 700;
  const height = 200;
  const margin = { top: 30, right: 30, bottom: 40, left: 30 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Find the minute where comeback starts (first opponent goal after +2)
  const plus2Min = match.minute_reached_plus2;
  const comebackGoals = match.goals.filter(g => g.team === 'opponent' && g.minute > plus2Min);
  const comebackStart = comebackGoals.length > 0 ? comebackGoals[0].minute : plus2Min;
  const equalizer = comebackGoals.length > 0 ? comebackGoals[comebackGoals.length - 1].minute : 90;

  function xScale(minute: number): number {
    return margin.left + (Math.min(minute, 96) / 96) * plotW;
  }

  return (
    <div className="relative">
      {/* Match header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="px-3 py-1 rounded bg-surface-mid text-text-secondary hover:bg-surface-light disabled:opacity-30 text-sm"
        >
          ← Prev
        </button>
        <div className="text-center">
          <div className="text-text-primary font-bold text-lg">
            {match.leader_is_home ? match.leader_team : match.opponent_team}
            {' '}<span className="text-draw">{match.final_score}</span>{' '}
            {match.leader_is_home ? match.opponent_team : match.leader_team}
          </div>
          <div className="text-text-muted text-sm">{match.season} · +2 at {match.minute_reached_plus2}&apos;</div>
        </div>
        <button
          onClick={() => setIdx(i => Math.min(draws.length - 1, i + 1))}
          disabled={idx === draws.length - 1}
          className="px-3 py-1 rounded bg-surface-mid text-text-secondary hover:bg-surface-light disabled:opacity-30 text-sm"
        >
          Next →
        </button>
      </div>

      <div className="text-text-muted text-xs text-center mb-1">
        {idx + 1} of {draws.length} collapses
      </div>

      <AnimatePresence mode="wait">
        <motion.svg
          key={match.match_key}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Center line */}
          <line
            x1={margin.left} y1={margin.top + plotH / 2}
            x2={margin.left + plotW} y2={margin.top + plotH / 2}
            stroke={COLORS.text.muted} strokeWidth={1} opacity={0.3}
          />

          {/* Collapse zone highlight */}
          <rect
            x={xScale(comebackStart)}
            y={margin.top}
            width={xScale(equalizer) - xScale(comebackStart)}
            height={plotH}
            fill={COLORS.loss}
            opacity={0.12}
            rx={4}
          />

          {/* +2 marker */}
          <line
            x1={xScale(plus2Min)} y1={margin.top}
            x2={xScale(plus2Min)} y2={margin.top + plotH}
            stroke={COLORS.accent} strokeWidth={2} strokeDasharray="4,3"
          />
          <text
            x={xScale(plus2Min)} y={margin.top - 6}
            textAnchor="middle" fill={COLORS.accent} fontSize={10} fontWeight="bold"
          >
            +2 ({plus2Min}&apos;)
          </text>

          {/* Goals */}
          {match.goals.map((goal, i) => {
            const cx = xScale(goal.minute);
            const isLeader = goal.team === 'leader';
            const cy = margin.top + plotH / 2 + (isLeader ? -25 : 25);
            const color = isLeader ? COLORS.win : COLORS.loss;

            return (
              <motion.g
                key={`${goal.minute}-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
              >
                <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.9} />
                <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">
                  {goal.minute}&apos;
                </text>
                <text
                  x={cx} y={isLeader ? cy - 14 : cy + 18}
                  textAnchor="middle" fill={COLORS.text.secondary} fontSize={8}
                >
                  {goal.scorer.split(' ').pop()}
                </text>
                <text
                  x={cx} y={isLeader ? cy - 24 : cy + 28}
                  textAnchor="middle" fill={COLORS.text.muted} fontSize={8}
                >
                  {goal.running_score}
                </text>
              </motion.g>
            );
          })}

          {/* Minute axis */}
          {[0, 15, 30, 45, 60, 75, 90].map(min => (
            <g key={min}>
              <line
                x1={xScale(min)} y1={margin.top + plotH}
                x2={xScale(min)} y2={margin.top + plotH + 4}
                stroke={COLORS.text.muted} opacity={0.4}
              />
              <text
                x={xScale(min)} y={margin.top + plotH + 16}
                textAnchor="middle" fill={COLORS.text.muted} fontSize={9}
              >
                {min}&apos;
              </text>
            </g>
          ))}

          {/* Legend */}
          <circle cx={margin.left} cy={height - 6} r={5} fill={COLORS.win} />
          <text x={margin.left + 10} y={height - 2} fill={COLORS.text.muted} fontSize={9}>Leader</text>
          <circle cx={margin.left + 65} cy={height - 6} r={5} fill={COLORS.loss} />
          <text x={margin.left + 75} y={height - 2} fill={COLORS.text.muted} fontSize={9}>Opponent</text>
          <rect x={margin.left + 140} y={height - 10} width={12} height={8} fill={COLORS.loss} opacity={0.2} rx={2} />
          <text x={margin.left + 157} y={height - 2} fill={COLORS.text.muted} fontSize={9}>Collapse Zone</text>
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/charts/CollapseTimeline.tsx
git commit -m "feat: add CollapseTimeline carousel chart for draw match replays"
```

---

### Task 6: Build PointsDroppedBar Chart Component

**Files:**
- Create: `src/components/charts/PointsDroppedBar.tsx`

**Step 1: Implement the PointsDroppedBar component**

```typescript
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { COLORS } from '@/lib/theme';
import type { SummaryTeam } from '@/lib/data';

interface Props {
  data: SummaryTeam[];
  limit?: number;
}

export default function PointsDroppedBar({ data, limit = 15 }: Props) {
  const chartData = useMemo(() => {
    return [...data]
      .filter(t => t.n_as_leader >= 10)
      .sort((a, b) => b.points_dropped - a.points_dropped)
      .slice(0, limit)
      .map(t => ({
        team: t.team_key.length > 12 ? t.team_key.slice(0, 10) + '…' : t.team_key,
        fullTeam: t.team_key,
        fromDraws: t.draws * 2,
        fromLosses: t.losses * 3,
        total: t.points_dropped,
        draws: t.draws,
        losses: t.losses,
      }));
  }, [data, limit]);

  const avg = chartData.reduce((s, d) => s + d.total, 0) / chartData.length;

  return (
    <ResponsiveContainer width="100%" height={limit * 36 + 40}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
        <XAxis type="number" tick={{ fill: COLORS.text.muted, fontSize: 10 }} axisLine={false} />
        <YAxis
          type="category"
          dataKey="team"
          width={100}
          tick={{ fill: COLORS.text.secondary, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: COLORS.surface.dark, border: `1px solid ${COLORS.draw}40`, borderRadius: 8 }}
          labelStyle={{ color: COLORS.text.primary, fontWeight: 'bold' }}
          formatter={(value: number, name: string) => {
            const label = name === 'fromDraws' ? 'From Draws' : 'From Losses';
            return [value + ' pts', label];
          }}
        />
        <ReferenceLine x={avg} stroke={COLORS.text.muted} strokeDasharray="3 3" label={{ value: `Avg: ${avg.toFixed(0)}`, fill: COLORS.text.muted, fontSize: 10 }} />
        <Bar dataKey="fromDraws" stackId="pts" fill={COLORS.draw} radius={[0, 0, 0, 0]} name="fromDraws" />
        <Bar dataKey="fromLosses" stackId="pts" fill={COLORS.loss} radius={[0, 4, 4, 0]} name="fromLosses" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/charts/PointsDroppedBar.tsx
git commit -m "feat: add PointsDroppedBar stacked horizontal bar chart"
```

---

### Task 7: Enrich S04_BigPicture with DrawHeatmap + H1/H2 Stats

**Files:**
- Modify: `src/components/sections/S04_BigPicture.tsx`

**Step 1: Add imports and data loading**

Add at the top of the file, after existing imports:

```typescript
import drawEvents from '@/data/draw_events.json';
import halfStats from '@/data/summary_half_stats.json';
import type { DrawEvent, HalfSummary } from '@/lib/data';

const DrawHeatmap = dynamic(() => import('@/components/charts/DrawHeatmap'), { ssr: false });

const draws = drawEvents as DrawEvent[];
const halves = halfStats as HalfSummary[];
```

**Step 2: Add the draw sub-panel below the existing KPI grid**

After the closing `</div>` of the `grid grid-cols-1 sm:grid-cols-2 gap-4` div (line ~72), add:

```tsx
{/* Draw deep-dive sub-panel */}
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ delay: 0.8, duration: 0.7 }}
  className="mt-16 max-w-6xl w-full"
>
  <h3 className="text-2xl font-bold text-draw mb-2 text-center">
    But 87 Times, the Lock Broke
  </h3>
  <p className="text-text-secondary text-center mb-8 max-w-2xl mx-auto">
    Where do draws cluster? This heatmap shows every team&apos;s draws by the minute bucket when they first reached +2.
  </p>

  <DrawHeatmap data={draws} />

  {/* H1 vs H2 comparison bar */}
  <div className="grid grid-cols-2 gap-4 mt-8 max-w-xl mx-auto">
    {halves.map(h => (
      <div key={h.half} className="bg-surface-mid rounded-xl p-4 text-center">
        <div className="text-accent text-sm font-medium">
          {h.half === 'H1' ? 'First Half Leads' : 'Second Half Leads'}
        </div>
        <div className="text-3xl font-bold text-draw mt-1">
          {(h.draw_rate * 100).toFixed(1)}%
        </div>
        <div className="text-text-muted text-sm">draw rate ({h.draws} of {h.n})</div>
      </div>
    ))}
  </div>
</motion.div>
```

**Step 3: Verify it compiles and renders**

Run: `npx tsc --noEmit`
Then check http://localhost:3000 — scroll to Big Picture section, verify heatmap appears.

**Step 4: Commit**

```bash
git add src/components/sections/S04_BigPicture.tsx
git commit -m "feat: enrich S04 BigPicture with DrawHeatmap and H1/H2 stats"
```

---

### Task 8: Enrich S05_WhenDoesItMatter with CollapseTimeline + H1/H2 Toggle

**Files:**
- Modify: `src/components/sections/S05_WhenDoesItMatter.tsx`

**Step 1: Add imports**

After existing imports, add:

```typescript
import drawEvents from '@/data/draw_events.json';
import type { DrawEvent } from '@/lib/data';

const CollapseTimeline = dynamic(() => import('@/components/charts/CollapseTimeline'), { ssr: false });

const allDraws = drawEvents as DrawEvent[];

// Pick 5 most dramatic collapses
const FEATURED_MATCH_KEYS = [11877, 14483, 14108, 9432, 18581]; // Everton-Newcastle 93'+94', Spurs 3-3 WHU, WBA 3-3 Chelsea, MU 2-2 Burnley (76-90+), Soton 4-4 Liverpool
const featuredDraws = FEATURED_MATCH_KEYS
  .map(mk => allDraws.find(d => d.match_key === mk))
  .filter(Boolean) as DrawEvent[];
// Fallback: if some keys don't match, fill with first draws
const drawsForCarousel = featuredDraws.length >= 3 ? featuredDraws : allDraws.slice(0, 5);
```

**Step 2: Add H1/H2 toggle state**

Add to existing state:

```typescript
const [showHalf, setShowHalf] = useState(false);
```

**Step 3: Add H1/H2 toggle button alongside existing view toggles**

In the button group (around line 41), add a third button:

```tsx
<button
  onClick={() => setShowHalf(!showHalf)}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    showHalf
      ? 'bg-accent text-white'
      : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
  }`}
>
  H1 vs H2
</button>
```

**Step 4: Add H1/H2 overlay in the bucket stat cards**

In the bucket stat grid (around line 82), wrap with conditional:

```tsx
{showHalf ? (
  <div className="grid grid-cols-2 gap-4 max-w-xl">
    {[
      { label: 'First Half (0-45+)', buckets: ['0-15', '16-30', '31-45+'] },
      { label: 'Second Half (46-90+)', buckets: ['46-60', '61-75', '76-90+'] },
    ].map(half => {
      const hBuckets = data.filter(b => half.buckets.includes(b.bucket_key));
      const n = hBuckets.reduce((s, b) => s + b.n, 0);
      const draws = hBuckets.reduce((s, b) => s + b.draws, 0);
      const wins = hBuckets.reduce((s, b) => s + b.wins, 0);
      return (
        <div key={half.label} className="bg-surface-mid rounded-xl p-4 text-center">
          <div className="text-accent text-sm font-medium">{half.label}</div>
          <div className="text-xl font-bold text-win">{((wins / n) * 100).toFixed(1)}%</div>
          <div className="text-text-muted text-xs">{n} events</div>
          <div className="text-draw text-sm mt-1">{draws} draws ({((draws / n) * 100).toFixed(1)}%)</div>
        </div>
      );
    })}
  </div>
) : (
  /* existing bucket grid */
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
    {data.map(bucket => (
      <div key={bucket.bucket_key} className="bg-surface-mid rounded-lg p-3 text-center">
        <div className="text-text-muted text-sm">{bucket.bucket_key} min</div>
        <div className="text-xl font-bold text-win">{(bucket.win_rate * 100).toFixed(1)}%</div>
        <div className="text-text-muted text-xs">{bucket.n} events</div>
      </div>
    ))}
  </div>
)}
```

**Step 5: Add CollapseTimeline carousel after the chart area**

After the bucket stats grid (bottom of the section), add:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ delay: 0.8, duration: 0.6 }}
  className="mt-12 w-full max-w-4xl"
>
  <h3 className="text-xl font-bold text-loss mb-4 text-center">
    The Most Dramatic Collapses
  </h3>
  <div className="bg-surface-mid rounded-xl p-6">
    <CollapseTimeline draws={drawsForCarousel} />
  </div>
</motion.div>
```

**Step 6: Verify and commit**

Run: `npx tsc --noEmit`
Check http://localhost:3000 — the "When Does It Matter" section should show the H1/H2 toggle and collapse carousel.

```bash
git add src/components/sections/S05_WhenDoesItMatter.tsx
git commit -m "feat: enrich S05 with CollapseTimeline carousel and H1/H2 toggle"
```

---

### Task 9: Enrich S07_TeamPerformance with PointsDroppedBar + Draw Callout

**Files:**
- Modify: `src/components/sections/S07_TeamPerformance.tsx`

**Step 1: Add imports**

After existing imports:

```typescript
const PointsDroppedBar = dynamic(() => import('@/components/charts/PointsDroppedBar'), { ssr: false });
```

**Step 2: Add "Liverpool: 9 draws" callout card to the existing callout grid**

In the callout cards array (around line 42), add a 4th card:

```typescript
{ team: 'Liverpool', stat: '9 draws', detail: '168 events, most draws of any team', color: 'text-draw' },
```

Change the grid from `md:grid-cols-3` to `md:grid-cols-4`.

**Step 3: Add PointsDroppedBar below the existing chart grid**

After the closing `</div>` of the `grid grid-cols-1 lg:grid-cols-2` chart grid (around line 92), add:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ delay: 0.7, duration: 0.6 }}
  className="mt-12 max-w-4xl w-full"
>
  <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Points Dropped Breakdown</h3>
  <p className="text-text-muted text-sm mb-4">
    Orange = points lost from draws (2 per draw). Red = points lost from defeats (3 per loss).
  </p>
  <div className="bg-surface-mid rounded-xl p-4">
    <PointsDroppedBar data={data} limit={15} />
  </div>
</motion.div>
```

**Step 4: Verify and commit**

Run: `npx tsc --noEmit`
Check http://localhost:3000 — Team Performance section shows PointsDroppedBar.

```bash
git add src/components/sections/S07_TeamPerformance.tsx
git commit -m "feat: enrich S07 with PointsDroppedBar and Liverpool draw callout"
```

---

### Task 10: Enrich S08_SeasonTrends with Draw Count Overlay

**Files:**
- Modify: `src/components/sections/S08_SeasonTrends.tsx`

**Step 1: Add state for draw overlay toggle**

Add imports and state:

```typescript
import { useState } from 'react';
```

Add inside the component:

```typescript
const [showDraws, setShowDraws] = useState(false);
```

**Step 2: Add toggle button above the chart**

After the subtitle `<p>` tag and before the chart `<motion.div>`, add:

```tsx
<button
  onClick={() => setShowDraws(!showDraws)}
  className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    showDraws
      ? 'bg-draw text-surface-dark'
      : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
  }`}
>
  {showDraws ? 'Showing Draw Count' : 'Show Draw Count'}
</button>
```

**Step 3: Pass showDraws prop to SeasonAreaChart (or render an inline overlay)**

After the `<SeasonAreaChart data={data} />`, add a conditional draw count bar chart:

```tsx
{showDraws && (
  <div className="mt-6 max-w-5xl w-full">
    <div className="flex items-end gap-2 justify-center h-32">
      {data.sort((a, b) => a.sort_order - b.sort_order).map(s => {
        const maxDraws = Math.max(...data.map(d => d.draws));
        const height = (s.draws / maxDraws) * 100;
        return (
          <div key={s.season_key} className="flex flex-col items-center gap-1">
            <span className="text-draw text-xs font-bold">{s.draws}</span>
            <div
              className="w-8 rounded-t bg-draw/70"
              style={{ height: `${height}%` }}
            />
            <span className="text-text-muted text-xs -rotate-45 origin-top-left mt-1">
              {s.season_key.replace('-', '/')}
            </span>
          </div>
        );
      })}
    </div>
    <p className="text-center text-text-muted text-sm mt-4">
      2015/16 had 15 draws — nearly double the average
    </p>
  </div>
)}
```

**Step 4: Add 2015/16 callout**

Update the "Riskiest Season" card to mention draws:

Change `<div className="text-text-muted text-sm">88.6% win rate, 45 pts dropped</div>` to:

```tsx
<div className="text-text-muted text-sm">88.6% win rate, 15 draws, 45 pts dropped</div>
```

**Step 5: Verify and commit**

Run: `npx tsc --noEmit`
Check http://localhost:3000 — Season Trends shows draw toggle.

```bash
git add src/components/sections/S08_SeasonTrends.tsx
git commit -m "feat: enrich S08 with draw count overlay and season callouts"
```

---

### Task 11: Final Verification

**Step 1: Run full type check**

Run: `cd C:\ryane\Projects\epl-2goal-study\epl-2goal-web && npx tsc --noEmit`
Expected: No errors

**Step 2: Check dev server builds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual smoke test**

Open http://localhost:3000 and verify:
- S04: Donut + KPIs + DrawHeatmap + H1/H2 bar visible
- S05: Radial/Line/H1vsH2 toggles work, CollapseTimeline carousel navigates
- S07: 4 callout cards + BubbleScatter + TeamBar + PointsDroppedBar
- S08: Area chart + Draw Count toggle + updated callout cards

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete draw data integration across S04, S05, S07, S08"
```
