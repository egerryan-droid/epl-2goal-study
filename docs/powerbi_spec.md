# Power BI Dashboard Specification — EPL 2-Goal Lead Study

## Report Properties
- **Canvas size:** 16:9 (1280 x 720)
- **Theme:** `data/powerbi/epl_study_theme.json`
- **Font family:** Segoe UI
- **Background:** #FAFAFA (light gray)
- **Color logic:** Green (#2ecc71) = Win, Amber (#f39c12) = Draw, Red (#e74c3c) = Loss, Blue (#3498db) = Neutral/accent

---

## Page 1: Executive Overview

**Purpose:** Headline findings at a glance. This is the landing page.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TITLE: "How Safe Is a Two-Goal Lead in the EPL?"       │
│  Subtitle: 10 Seasons · 2014/15 – 2023/24 · N = 1,907  │
├──────────┬──────────┬──────────┬────────────────────────┤
│  CARD    │  CARD    │  CARD    │   DONUT CHART          │
│  Total   │  Win     │  Points  │   W / D / L Split      │
│  Events  │  Rate    │  Dropped │   (1,780 / 87 / 40)    │
│  1,907   │  93.3%   │  294     │                        │
├──────────┴──────────┴──────────┼────────────────────────┤
│  CLUSTERED BAR + LINE CHART    │  KEY INSIGHT BOX       │
│  Win Rate by Minute Bucket     │  "A two-goal lead is   │
│  (6 bars with line overlay)    │   already above 90%    │
│  90% threshold reference line  │   from the earliest    │
│  X: bucket_label               │   bucket (0-15 min).   │
│  Y: Win Rate / Event Count     │   By 76-90+, it rises  │
│                                │   to 99.7%."           │
├────────────────────────────────┴────────────────────────┤
│  SLICERS: [Season ▼] [Team ▼] [Home / Away]            │
└─────────────────────────────────────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Measure(s) | Axis / Category | Format Notes |
|---|--------|------|-----------|-----------------|--------------|
| 1 | Title | Text box | — | — | Font 20pt bold, color #2C3E50 |
| 2 | Total Events | Card | `[Total Events]` | — | Whole number, no decimal |
| 3 | Win Rate | Card | `[Win Rate Display]` | — | Shows "93.3%", font 28pt, green |
| 4 | Points Dropped | Card | `[Points Dropped]` | — | Whole number, subtitle "league points lost" |
| 5 | W/D/L Donut | Donut chart | Values: `[Total Wins]`, `[Total Draws]`, `[Total Losses]` | Legend: result_for_leader | Colors: W=#2ecc71, D=#f39c12, L=#e74c3c. Show data labels with count and %. |
| 6 | Win Rate by Bucket | Combo chart (clustered bar + line) | Bar: `[Events by Bucket]`, Line: `[Win Rate by Bucket]` | X-axis: `dim_minute_bucket[bucket_label]` (sorted by `bucket_order`) | Bar on primary axis, line on secondary (0% to 100%). Add constant line at 0.90 (dashed, gray, labeled "90% Threshold"). |
| 7 | Key Insight | Text box | — | — | Rich text. Reference the findings: 90% locked from earliest bucket, 99.7% at 76-90+. Background white, border #3498db. |
| 8 | Season Slicer | Dropdown slicer | — | `dim_season[season_label]` | Multi-select enabled. Sorted by `sort_order`. |
| 9 | Team Slicer | Dropdown slicer | — | `dim_team[team_display_name]` | Multi-select enabled. Alphabetical. |
| 10 | Home/Away Slicer | Chiclet / button slicer | — | `fact_plus2_events[leader_is_home]` | Display labels: "Home" / "Away" / "All". |

### Interactions
- All slicers filter all visuals on this page
- Clicking a bar in the bucket chart cross-filters the donut chart
- Donut chart segments are clickable and cross-filter the bucket chart

---

## Page 2: Minute Deep Dive

**Purpose:** Detailed minute-bucket analysis showing when a +2 lead becomes statistically "locked."

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TITLE: "When Does a Two-Goal Lead Become Safe?"        │
├─────────────────────────────────────────────────────────┤
│  LINE CHART: P(Win) by Minute Bucket                    │
│  Y-axis: Win Rate (80% - 100%)                          │
│  X-axis: bucket_label (sorted by bucket_order)          │
│  Reference lines: 90% (dashed amber) and 95% (dashed    │
│  green). CI bands shown as error bars.                   │
├──────────────────────────┬──────────────────────────────┤
│  TABLE: Bucket Details   │  STACKED BAR CHART           │
│  ┌─────┬───┬──┬──┬───┐  │  W / D / L Counts by Bucket  │
│  │Bucket│ N │W │D │L  │  │  Colors: green/amber/red     │
│  │0-15 │113│...│   │  │  │                              │
│  │...  │   │   │   │  │  │                              │
│  │76-90│389│...│   │  │  │                              │
│  └─────┴───┴──┴──┴───┘  │                              │
├──────────────────────────┴──────────────────────────────┤
│  TEXT BOX: Chi-square result                             │
│  "Chi-square test: chi2 = 39.6, p < 0.001.              │
│   Significant association between minute bucket and      │
│   match outcome."                                        │
└─────────────────────────────────────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Measure(s) / Fields | Details |
|---|--------|------|---------------------|---------|
| 1 | Win Rate Line | Line chart | Y: `[Win Rate by Bucket]` | X: `dim_minute_bucket[bucket_label]`. Min Y-axis: 0.80. Max: 1.00. Add constant lines at 0.90 and 0.95. Data labels on. Markers on. |
| 2 | CI Error Bars | Error bars on line chart | Use `summary_by_bucket[win_ci_low]` and `summary_by_bucket[win_ci_high]` | If error bars not available natively, show CI as columns in the table instead. |
| 3 | Bucket Detail Table | Table | Columns: `bucket_label`, `n`, `wins`, `draws`, `losses`, `win_rate`, `is_locked_90`, `is_locked_95` | Source: `summary_by_bucket`. Conditional formatting on `win_rate` column: green >= 95%, light green >= 90%, amber >= 80%, red < 80%. Bold the "LOCKED" indicators. |
| 4 | W/D/L Stacked Bar | 100% Stacked bar | Values: `[Total Wins]`, `[Total Draws]`, `[Total Losses]` | X-axis: `dim_minute_bucket[bucket_label]`. Colors: W=#2ecc71, D=#f39c12, L=#e74c3c. |
| 5 | Chi-square Text | Text box | — | Display result from `summary_bucket_stats`. Rich text, italicized, font 10pt. |

### Interactions
- Clicking a point on the line chart filters the table and stacked bar
- Page-level filter: inherits Season/Team slicers from Page 1 (sync slicers)

### Tooltip Configuration
- Custom tooltip on line chart points showing: Bucket, N events, Win Rate, 95% CI range

---

## Page 3: Team Leaderboard

**Purpose:** Which teams are best/worst at holding two-goal leads? Both as leader and as trailing team.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TITLE: "Team Performance from Two-Goal Leads"          │
├─────────────────────────────────────────────────────────┤
│  BAR CHART: Top 15 Teams by Win Rate                    │
│  (min 20 events filter — excludes small-sample teams)   │
│  Horizontal bars, sorted descending                     │
├─────────────────────────────────────────────────────────┤
│  BAR CHART: Top 10 Teams by Total Points Dropped        │
│  Horizontal bars, sorted descending                     │
├──────────────────────────┬──────────────────────────────┤
│  TABLE: Full Team Data   │  SCATTER PLOT               │
│  All 34 teams:           │  X = Events as Leader       │
│  N, Wins, Draws, Losses, │  Y = Win Rate               │
│  Win Rate, Pts Dropped,  │  Size = Points Dropped      │
│  N as Opponent, Comebacks│  Label = Team Name          │
│  (from summary_by_team)  │  Min 10 events filter       │
└──────────────────────────┴──────────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Measure(s) / Fields | Details |
|---|--------|------|---------------------|---------|
| 1 | Top Teams Bar | Bar chart (horizontal) | Y: `dim_team[team_display_name]`, X: `[Team Win Rate]` | Top N filter = 15 by `[Team Events]` >= 20. Data labels on. Conditional color by win rate (green/amber/red). |
| 2 | Points Dropped Bar | Bar chart (horizontal) | Y: `dim_team[team_display_name]`, X: `[Points Dropped]` | Top N filter = 10 by `[Points Dropped]` descending. Color: #e74c3c. |
| 3 | Full Team Table | Table | Columns from `summary_by_team`: `team_key`, `n_as_leader`, `wins`, `draws`, `losses`, `win_rate`, `points_dropped`, `n_as_opponent` | Sortable columns. Conditional formatting on `win_rate`. Bold teams with n >= 50 events. |
| 4 | Scatter Plot | Scatter | X: `[Team Events]`, Y: `[Team Win Rate]`, Size: `[Points Dropped]` | Data labels: team names. Only show teams with >= 10 events. Add constant line at 0.933 (overall avg). Quadrant labels optional. |

### Key Data Points to Highlight
- **Manchester City:** 208 events, 97.1% win rate, only 15 points dropped
- **Chelsea:** 138 events, 97.1% win rate, only 8 points dropped
- **Arsenal:** 159 events, 96.9% win rate, 0 losses from +2
- **Luton Town:** Lowest win rate (50.0%) but only 4 events (small sample)
- **Sheffield United:** 66.7% win rate from 9 events

### Interactions
- Clicking a team in any visual cross-filters all others
- Table is sortable by any column

---

## Page 4: Season Trends

**Purpose:** How has the safety of a two-goal lead changed over 10 EPL seasons?

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TITLE: "Season-by-Season Trends"                       │
├─────────────────────────────────────────────────────────┤
│  LINE CHART: Win Rate by Season                         │
│  Y-axis: 80% - 100%. X-axis: season_label              │
│  Add trend line (linear regression)                     │
│  Add constant line at 93.3% (overall average)           │
├─────────────────────────────────────────────────────────┤
│  STACKED AREA CHART: W / D / L Counts by Season        │
│  Shows absolute volume alongside rate                   │
├──────────────────────────┬──────────────────────────────┤
│  CARD                    │  CARD                        │
│  "Most Points Dropped"   │  "Highest Win Rate"          │
│  2015/16: 45 points      │  2016/17: 96.5%              │
│                          │  (195/202 events won)         │
├──────────────────────────┼──────────────────────────────┤
│  CARD                    │  CARD                        │
│  "Most Events"           │  "Fewest Events"             │
│  2018/19: 217            │  2014/15: 171                │
└──────────────────────────┴──────────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Measure(s) / Fields | Details |
|---|--------|------|---------------------|---------|
| 1 | Win Rate Line | Line chart | Y: `[Win Rate]` | X: `dim_season[season_label]` sorted by `sort_order`. Min Y: 0.80. Max Y: 1.00. Add constant line at 0.933. Add analytics trend line. Markers on. |
| 2 | W/D/L Area | Stacked area chart | Y: `[Total Wins]`, `[Total Draws]`, `[Total Losses]` | X: `dim_season[season_label]` sorted by `sort_order`. Colors: W=#2ecc71, D=#f39c12, L=#e74c3c. |
| 3 | Most Points Dropped | Card | — | Static text referencing `summary_by_season`: 2015/16 with 45 points dropped. Or use a DAX measure: `MAXX(summary_by_season, [points_dropped])`. |
| 4 | Highest Win Rate | Card | — | Static text: 2016/17 at 96.5%. |
| 5 | Most Events | Card | — | Static text: 2018/19 with 217 events. |
| 6 | Fewest Events | Card | — | Static text: 2014/15 with 171 events. |

### Season Data Reference (from summary_by_season.csv)

| Season | N | Win Rate | Points Dropped |
|--------|---|----------|----------------|
| 2014/15 | 171 | 93.6% | 25 |
| 2015/16 | 176 | 88.6% | 45 |
| 2016/17 | 202 | 96.5% | 17 |
| 2017/18 | 179 | 92.7% | 31 |
| 2018/19 | 217 | 94.9% | 26 |
| 2019/20 | 186 | 94.6% | 23 |
| 2020/21 | 178 | 94.9% | 21 |
| 2021/22 | 191 | 93.7% | 28 |
| 2022/23 | 192 | 90.1% | 44 |
| 2023/24 | 215 | 93.0% | 34 |

### Interactions
- Season slicer (synced from Page 1) updates all visuals
- Clicking a point on the line chart cross-filters the area chart

---

## Page 5: Match Drill-Through

**Purpose:** Deep dive into any individual match. Accessible via right-click drill-through from Pages 1-4.

### Drill-Through Configuration
- **Drill-through field:** `dim_match[match_key]` (add to Drill-through well on this page)
- **Back button:** Enabled (auto-generated by Power BI)
- Users right-click any data point on other pages and select Drill through > Match Drill-Through

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  MATCH HEADER                                           │
│  Card: match_description (e.g., "Arsenal 3-1 Chelsea")  │
│  Card: match_date | season_label                        │
├──────────┬──────────┬──────────┬────────────────────────┤
│  CARD    │  CARD    │  CARD    │  CARD                  │
│  Leader  │  Opponent│  Result  │  +2 Reached            │
│  Team    │  Team    │  W/D/L   │  at Minute X           │
├──────────┴──────────┴──────────┴────────────────────────┤
│  TABLE: Goal Timeline                                   │
│  ┌────────┬──────────┬───────┬──────────┬─────────────┐ │
│  │ Minute │ Scorer   │ Team  │ Score    │ Goal Diff   │ │
│  │   12   │ Saka     │ ARS   │  1-0     │  +1         │ │
│  │   34   │ Jesus    │ ARS   │  2-0     │  +2  ★      │ │
│  │   56   │ Palmer   │ CHE   │  2-1     │  +1         │ │
│  │   78   │ Havertz  │ ARS   │  3-1     │  +2         │ │
│  └────────┴──────────┴───────┴──────────┴─────────────┘ │
├──────────┬──────────┬──────────┬────────────────────────┤
│  CARD    │  CARD    │  CARD    │  CARD                  │
│  Pre-match│ Strength│  Red     │  Home /                │
│  Odds    │  Tier   │  Cards   │  Away                  │
└──────────┴──────────┴──────────┴────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Field(s) | Details |
|---|--------|------|----------|---------|
| 1 | Match Description | Card | `dim_match[match_description]` | Font 18pt bold. Shows "Home Team X-Y Away Team". |
| 2 | Match Date | Card | `dim_match[match_date]` | Format: dd MMM yyyy. |
| 3 | Leader Team | Card | `fact_plus2_events[leader_team_key]` | Background color: #3498db. |
| 4 | Opponent Team | Card | `fact_plus2_events[opponent_team_key]` | Background color: #95a5a6. |
| 5 | Result | Card | `fact_plus2_events[result_for_leader]` | Conditional color: W=#2ecc71, D=#f39c12, L=#e74c3c. Use `[Result Icon]` measure. |
| 6 | Minute Reached | Card | `fact_plus2_events[minute_reached_plus2]` | Suffix: "th minute". |
| 7 | Goal Timeline | Table | `fact_goal_timeline` columns: `minute`, `player`, `scoring_team_key`, `home_score`, `away_score`, `running_diff` | Filter to current match. Sort by minute ascending. Highlight the row where +2 is first reached (conditional formatting on running_diff >= 2 or <= -2). |
| 8 | Pre-match Odds | Card | `fact_plus2_events[leader_prematch_win_odds]` | Format: 0.00. Label "Pre-match Win Odds". |
| 9 | Strength Tier | Card | `fact_plus2_events[strength_tier]` | Shows "Strong Favorite", "Moderate", or "Underdog". |
| 10 | Red Cards | Card | `fact_plus2_events[leader_red_cards]` + `fact_plus2_events[opponent_red_cards]` | Show as "Leader: X, Opponent: Y". |
| 11 | Home/Away | Card | `fact_plus2_events[leader_is_home]` | Show "HOME" or "AWAY". |

### Interactions
- This page is only accessible via drill-through (not from tab navigation)
- Back button returns to the originating page
- Hide this page from the navigation bar

---

## Page 6: Statistical Summary

**Purpose:** Reference page with formal test results for the academic audience. Presents the pre-computed statistical results from the Statistician's analysis.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TITLE: "Statistical Analysis Summary"                  │
│  Subtitle: "Pre-computed results for paper reference"   │
├─────────────────────────────────────────────────────────┤
│  TABLE 1: Overall Metrics (summary_overall.csv)         │
│  ┌────────────────────┬────────┬────────┬──────┬──────┐ │
│  │ Metric             │ Value  │ CI Low │CI Hi │  N   │ │
│  │ Total +2 Events    │ 1,907  │   —    │  —   │1,907 │ │
│  │ Win Rate           │ 93.3%  │ 92.1%  │94.4% │1,907 │ │
│  │ Draw Rate          │  4.6%  │  3.7%  │ 5.6% │1,907 │ │
│  │ Loss Rate          │  2.1%  │  1.5%  │ 2.8% │1,907 │ │
│  │ Total Pts Dropped  │  294   │   —    │  —   │1,907 │ │
│  │ Mean Pts Dropped   │  0.154 │   —    │  —   │1,907 │ │
│  └────────────────────┴────────┴────────┴──────┴──────┘ │
├─────────────────────────────────────────────────────────┤
│  TABLE 2: Bucket Statistics (summary_bucket_stats.csv)  │
│  ┌─────────────────────────────────┬────────────────┐   │
│  │ Test                            │ Result         │   │
│  │ Chi-square (bucket x outcome)   │ chi2=39.6,     │   │
│  │                                 │ p < 0.001      │   │
│  │ Locked minute (90% threshold)   │ 0-15 bucket:   │   │
│  │                                 │ P(W) = 0.920   │   │
│  │ Locked minute (95% threshold)   │ 76-90+ bucket: │   │
│  │                                 │ P(W) = 0.997   │   │
│  └─────────────────────────────────┴────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  TABLE 3: Logistic Regression (summary_regression.csv)  │
│  ┌──────────────────┬───────┬────────┬───────┬───────┐  │
│  │ Variable         │ OR    │ p-value│ 95% CI│ Sig?  │  │
│  │ Minute reached   │ 1.02  │ <0.001 │ ...   │ Yes   │  │
│  │ Implied prob     │ 66.7  │ <0.001 │ ...   │ Yes   │  │
│  │ Home advantage   │ 1.04  │ 0.844  │ ...   │ No    │  │
│  │ Leader red cards │ 0.42  │ 0.024  │ ...   │ Yes   │  │
│  │ Opponent red card│ 3.46  │ 0.016  │ ...   │ Yes   │  │
│  └──────────────────┴───────┴────────┴───────┴───────┘  │
├─────────────────────────────────────────────────────────┤
│  TEXT BOX: Interpretation                               │
│  "The logistic regression confirms that later minutes   │
│   and stronger pre-match favorites increase the         │
│   probability of holding a +2 lead. Home advantage is   │
│   NOT statistically significant (p = 0.84). Red cards   │
│   for the leader halve the odds of winning (OR = 0.42), │
│   while opponent red cards triple them (OR = 3.46)."    │
└─────────────────────────────────────────────────────────┘
```

### Visual Specifications

| # | Visual | Type | Source | Details |
|---|--------|------|--------|---------|
| 1 | Overall Metrics | Table | `summary_overall` | Direct table visual. Format value column as appropriate (% for rates, whole number for counts). |
| 2 | Bucket Stats | Table | `summary_bucket_stats` | Columns: test, result_text. Clean formatting. |
| 3 | Regression | Table | `summary_regression` | Columns: variable, odds_ratio, p_value, ci_low, ci_high, significant. Conditional formatting: highlight significant rows in green, non-significant in gray. |
| 4 | Interpretation | Text box | — | Rich text. Academic tone. Summarize key regression findings. |

### Notes
- This page has NO slicers — it shows fixed pre-computed results
- Tables pull directly from summary CSVs (not from DAX measures)
- Format p-values: show as "<0.001" when very small

---

## Cross-Page Features

### Slicer Sync
Sync these slicers across Pages 1-4:
- **Season slicer** → Pages 1, 2, 3, 4
- **Team slicer** → Pages 1, 2, 3, 4

To configure: View > Sync Slicers. Check the "sync" and "visible" boxes for each page.

Page 5 (Drill-Through) and Page 6 (Statistical Summary) should NOT sync with slicers.

### Bookmarks (Optional)
Create bookmarks for common views:
1. **"Big Six Only"** — Season slicer: All, Team slicer: Arsenal, Chelsea, Liverpool, Man City, Man Utd, Tottenham
2. **"2022/23 Deep Dive"** — Season slicer: 2022/23 (lowest win rate season at 90.1%)
3. **"Late Goals"** — Navigate to Page 2 with 76-90+ bucket selected

### Navigation Buttons (Optional)
Add navigation buttons at the bottom of each page:
- Pages 1-4: Visible in tab bar
- Page 5: Hidden from tab bar (drill-through only)
- Page 6: Visible in tab bar

---

## Color Reference

| Context | Color | Hex | Usage |
|---------|-------|-----|-------|
| Win | Green | #2ecc71 | Donut, stacked bars, conditional formatting |
| Draw | Amber | #f39c12 | Donut, stacked bars, conditional formatting |
| Loss | Red | #e74c3c | Donut, stacked bars, conditional formatting |
| Accent | Blue | #3498db | Table accent, reference lines, headers |
| Dark Green | Dark Green | #27ae60 | Win rate >= 95% (conditional formatting) |
| Text | Dark Gray | #2C3E50 | All body text |
| Background | Light Gray | #FAFAFA | Page backgrounds |
| Muted | Gray | #95a5a6 | Non-significant results, secondary text |

---

## Data Source Quick Reference

| Table | Rows | Primary Use |
|-------|------|-------------|
| fact_plus2_events | 1,907 | Core analysis — every +2 lead event |
| fact_goal_timeline | 7,007 | Drill-through goal-by-goal narrative |
| dim_season | 10 | Slicer and axis labels |
| dim_team | 34 | Slicer and axis labels (role-playing) |
| dim_match | 3,800 | Drill-through match context |
| dim_minute_bucket | 6 | Bucket axis labels and sort |
| summary_overall | 6 | Page 6 headline table |
| summary_by_bucket | 6 | Page 2 CI data, Page 6 |
| summary_by_season | 10 | Page 4 reference data |
| summary_by_team | 34 | Page 3 full team table |
| summary_bucket_stats | 3 | Page 6 chi-square results |
| summary_regression | 6 | Page 6 regression results |
