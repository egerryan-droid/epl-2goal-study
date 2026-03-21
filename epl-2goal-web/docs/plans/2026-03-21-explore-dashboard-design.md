# Explore Dashboard Design

**Date:** 2026-03-21
**Approach:** Team Spotlight + Match Browser + Compare Mode

## Overview

Interactive dashboard at `/explore` where football fans can pick their team, see stats, browse all 1,907 matches, and compare two teams head-to-head. All data from existing static JSON files.

## Page Layout

### 1. Header Bar
- "Back to Story" link → returns to `/`
- Title: "Explore the Data"
- Subtitle: "1,907 two-goal leads across 10 EPL seasons"

### 2. Team Spotlight Section
- **Team Picker**: 20 team chips in a wrapping grid. Click to select. "All Teams" default. Second click on same team deselects.
- **Compare Toggle**: Button to enable compare mode. When active, user picks 2 teams shown side-by-side.
- **Stats Row**: 4 KPI cards (Win Rate, Draws, Losses, Points Dropped). In compare mode, shows both teams side-by-side.
- **Team Bucket Bar**: Horizontal bar chart showing W/D/L per bucket for selected team(s). Filtered from fact_plus2_events.json.
- **Team Draw Highlights**: Compact MatchCards for that team's draws with expandable goal timelines.

### 3. Compare Mode
- Activated by a "Compare" toggle button
- Pick Team A, then Team B from the chips
- Stats Row splits into two columns (Team A | Team B)
- Bucket chart shows both teams overlaid or side-by-side
- Match table filters to only show matches involving either team

### 4. Match Browser Section
- **Filter Row**: Season dropdown, Result filter (All/W/D/L), Home/Away toggle, text search
- **Match Table**: Sortable columns (Season, Leader, Opponent, Bucket, Minute, Score, Result). Color-coded result badges.
- **Pagination**: 25 per page
- **Row Expand**: Click row → inline GoalTimeline expansion

## Data Sources (all existing JSON)
- fact_plus2_events.json (1,907 events)
- goals_by_match.json (goal timelines)
- summary_by_team.json (team aggregates)
- dim_team.json, dim_season.json (lookups)
- draw_events.json (87 draws with goals)

## Components to Build
- TeamPicker — clickable chip grid with compare mode support
- TeamStatsRow — 4 KPI cards, supports single and compare view
- TeamBucketBar — horizontal bar chart per bucket for 1-2 teams
- MatchTable — sortable/filterable/paginated table
- MatchRow — expandable row rendering GoalTimeline
- CompareToggle — enables/disables compare mode

## Styling
Same dark theme. Responsive (chips wrap, table scrolls on mobile).
