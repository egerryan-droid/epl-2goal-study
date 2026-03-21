# Explore Page Design: Team Explorer Hub

## Overview

Fan-facing interactive `/explore` page for EPL 2-goal lead data. Three tabs: My Team, Head to Head, Match Browser. Built in code first, Figma polish afterward.

## Audience

EPL/soccer fans exploring their team's 2-goal lead record. Non-technical users. May expand to other leagues later.

## Architecture

- **Route**: `/explore` (Next.js App Router)
- **State**: Client-side with `useFilterState` context + local tab/team state
- **Data**: Same static JSON imports used by scrollytelling page
- **Charts**: Reuse existing chart components (AnimatedDonut, RadialBucketChart, CollapseTimeline, PointsDroppedBar, SeasonAreaChart, TeamBarChart)

## Layout

### Header
- "← Back to Story" link to `/`
- Page title: "EPL 2-Goal Lead Explorer"
- Team selector dropdown (prominent, top-center)
- Three tab buttons: My Team | Head to Head | Matches

### Tab 1: My Team
- Hero row with team accent color + title "Arsenal's 2-Goal Lead Record"
- 4 KPI cards: Events, Win Rate, Draws, Points Dropped
- Danger Profile: RadialBucketChart filtered to selected team
- Collapse Stories: CollapseTimeline carousel (only if team has draws)
- Season Breakdown: SeasonAreaChart filtered to team

### Tab 2: Head to Head
- Two team selectors side by side
- Mirrored KPI cards with color-coded comparison highlights
- Overlaid radar chart: both teams' bucket win rates
- Points Dropped comparison: stacked bars for draws vs losses

### Tab 3: Match Browser
- FilterBar: Season, Team, Bucket, Home/Away, Result
- Searchable/sortable table of 1,907 events
- Columns: Date, Home, Away, Score, Leader, Bucket, Min, Result
- Expandable rows with goal timeline
- 25 per page pagination

### Navigation
- "Explore the Data →" button on scrollytelling S11_Verdict links to `/explore`
- "← Back to Story" on explore page links to `/`

## New Components Needed
1. `TeamSelector` — dropdown with team names, optional team color accent
2. `TabBar` — three-tab switcher with active state
3. `MyTeamTab` — orchestrates KPIs + charts for selected team
4. `HeadToHeadTab` — dual team selectors + mirrored stats
5. `MatchBrowserTab` — filter + table + expandable rows + pagination
6. `DangerRadar` — RadialBucketChart variant filtered to one team's bucket stats
7. `CompareRadar` — RadialBucketChart variant overlaying two teams

## Existing Components Reused
- KpiCard, FilterBar, MatchCard, CollapseTimeline
- AnimatedDonut, RadialBucketChart, SeasonAreaChart, PointsDroppedBar, TeamBarChart

## Design System
- Same dark theme (surface-dark, surface-mid, surface-light)
- Same COLORS from theme.ts
- Tailwind CSS with existing custom classes
- Framer Motion for tab transitions and chart animations
