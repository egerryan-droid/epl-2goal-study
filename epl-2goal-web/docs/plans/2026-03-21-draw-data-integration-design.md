# Draw Data Integration Design

**Date:** 2026-03-21
**Approach:** Enrich-In-Place — weave draw/collapse data into existing scrollytelling sections

## Problem

The current app covers 1,907 two-goal lead events with a focus on win rates, time buckets, team performance, and regression analysis. But the 87 draws (4.56%) — the most dramatic moments in the data — have no dedicated visualizations. The user also wants first-half vs second-half analysis and points-dropped breakdowns.

## Data Files to Create

### `src/data/draw_events.json`
All 87 draw events extracted from `fact_plus2_events.json`, enriched with goal-by-goal timeline data from `goals_by_match.json`. Each entry:
- match_key, season, leader_team, opponent_team, leader_is_home
- bucket, minute_reached_plus2, final_score
- strength_tier
- goals[] array: { minute, scorer, team ('leader'|'opponent'), running_score }

### `src/data/summary_half_stats.json`
H1/H2 aggregate stats:
- First Half (buckets 0-15, 16-30, 31-45+): n, wins, draws, losses, rates
- Second Half (buckets 46-60, 61-75, 76-90+): n, wins, draws, losses, rates
- Preserves 6-bucket granularity underneath

## New Types (add to `src/lib/data.ts`)

```typescript
interface DrawEvent {
  event_id: number;
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

interface GoalDetail {
  minute: number;
  scorer: string;
  team: 'leader' | 'opponent';
  running_score: string;
}

interface HalfSummary {
  half: 'H1' | 'H2';
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  draw_rate: number;
  loss_rate: number;
}
```

## New Chart Components (3)

### `DrawHeatmap.tsx`
- Team × Bucket matrix (20 teams × 6 buckets)
- Cell color intensity = draw count (0=dark, 3+=bright orange)
- Hover tooltip: exact count + points dropped
- Row totals (team total draws) and column totals (bucket total draws)
- H1/H2 divider line between bucket 3 and 4
- SVG-based with Framer Motion cell entrance

### `CollapseTimeline.tsx`
- Horizontal timeline for a single draw match
- Goals above/below center line (home/away)
- Red "collapse zone" highlighted from comeback start to equalizer
- Carousel of 5 most dramatic collapses (navigable)
- Framer Motion staggered entrance
- Featured matches: Everton 2-2 Newcastle (93'+94'), Spurs 3-3 West Ham (3-0 to 3-3), West Brom 3-3 Chelsea, Man Utd 2-2 Burnley (only 76-90+ draw), Southampton 4-4 Liverpool (double +2)

### `PointsDroppedBar.tsx`
- Horizontal bar chart, teams sorted by total points dropped from draws
- Bars split: orange (from draws) + red (from losses)
- Reference line at average
- Recharts BarChart with layout="vertical"

## Section Modifications

### S04 (Big Picture)
- Below existing donut: transition text "But 87 times, the lock broke"
- DrawHeatmap component showing team × bucket draw clustering
- H1/H2 stat comparison bar: "First Half leads: X% draw rate | Second Half: Y%"

### S05 (Time Buckets)
- After radial/line chart: CollapseTimeline carousel with 5 featured draws
- H1 vs H2 toggle overlay on existing bucket chart (aggregates buckets 1-3 and 4-6)

### S07 (Team Performance)
- Alongside TeamBarChart: PointsDroppedBar showing team-level draw bleeding
- StatReveal callout: "Liverpool: 9 draws from 168 leads"

### S08 (Season Trends)
- Draw count overlaid as line on SeasonAreaChart (secondary toggle)
- Callout: "2015-16: 15 draws — the year the lock was weakest"

## Implementation Approach
- Generate JSON data files from existing fact/summary data
- Build 3 chart components following existing patterns (D3/Recharts + Framer Motion)
- Modify 4 section components to include new sub-panels
- Run type check + dev server to verify
