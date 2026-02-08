# DAX Measure Library -- EPL 2-Goal Lead Study

This document contains every DAX measure used in the Power BI report for the
"How Safe Is a Two-Goal Lead in the EPL?" study. Measures are grouped by
purpose. Each entry includes the measure name, DAX code, the visual(s) it
powers, and a plain-English description.

All measures should be created inside a dedicated **\_Measures** table
(Modeling > New Table > `_Measures = {BLANK()}`).

---

## Setup: Relationships

Before creating measures, configure these relationships in the Model View.

### Active Relationships

| From (Many Side)                          | To (One Side)                    | Cardinality | Notes                |
|-------------------------------------------|----------------------------------|-------------|----------------------|
| fact_plus2_events[match_key]              | dim_match[match_key]             | Many:1      |                      |
| fact_plus2_events[season_key]             | dim_season[season_key]           | Many:1      |                      |
| fact_plus2_events[leader_team_key]        | dim_team[team_key]               | Many:1      | ACTIVE relationship  |
| fact_plus2_events[bucket_key]             | dim_minute_bucket[bucket_key]    | Many:1      |                      |
| fact_goal_timeline[match_key]             | dim_match[match_key]             | Many:1      |                      |
| fact_goal_timeline[season_key]            | dim_season[season_key]           | Many:1      |                      |
| fact_goal_timeline[scoring_team_key]      | dim_team[team_key]               | Many:1      |                      |

### Inactive Relationships (use USERELATIONSHIP in DAX)

| From (Many Side)                          | To (One Side)       | Note                                              |
|-------------------------------------------|---------------------|----------------------------------------------------|
| fact_plus2_events[opponent_team_key]      | dim_team[team_key]  | Use for opponent-perspective measures               |

To make a relationship inactive in Power BI: right-click the relationship line
in the Model View, choose Properties, and uncheck "Make this relationship
active."

### Cross-filter Direction

All relationships use **Single** direction (from dimension to fact). Do not
enable bidirectional cross-filtering.

### Sort-by-Column Configuration

Set these in Data View before building visuals:

- **dim_minute_bucket[bucket_label]** -- Sort by Column: `bucket_order`
- **dim_season[season_label]** -- Sort by Column: `sort_order`

---

## Group 1: Core Counts

These measures provide the fundamental row counts and binary-flag totals that
almost every visual depends on.

### Total Events

```dax
Total Events = COUNTROWS(fact_plus2_events)
```

**Visual:** Card on Overview page (Page 1).
**Description:** Count of all +2 lead events in the dataset. Each row in
fact_plus2_events represents one instance of a team reaching a two-goal lead
in a match.

---

### Total Wins

```dax
Total Wins = SUM(fact_plus2_events[is_win])
```

**Visual:** Donut chart (W/D/L split) on Overview page; Team Leaderboard
table.
**Description:** Sum of the is_win flag (1 when the leading team won the match,
0 otherwise). Because is_win is an integer flag, SUM effectively counts wins.

---

### Total Draws

```dax
Total Draws = SUM(fact_plus2_events[is_draw])
```

**Visual:** Donut chart (W/D/L split) on Overview page; Team Leaderboard
table.
**Description:** Sum of the is_draw flag. Counts how many +2 lead events ended
in a draw -- the leader surrendered a two-goal advantage completely.

---

### Total Losses

```dax
Total Losses = SUM(fact_plus2_events[is_loss])
```

**Visual:** Donut chart (W/D/L split) on Overview page; Team Leaderboard
table.
**Description:** Sum of the is_loss flag. Counts +2 lead events where the
leading team lost -- a full comeback by the opponent.

---

### Total Matches

```dax
Total Matches = COUNTROWS(dim_match)
```

**Visual:** Supporting card or tooltip on Overview page.
**Description:** Total number of matches in the sample (all EPL matches across
ten seasons, 2014/15 through 2023/24). Provides denominator context: what
fraction of all matches produced a +2 event.

---

### Matches with +2 Event

```dax
Matches with +2 =
CALCULATE(
    COUNTROWS(dim_match),
    dim_match[had_plus2_event] = TRUE()
)
```

**Visual:** Supporting card or tooltip on Overview page.
**Description:** Number of distinct matches in which at least one team reached
a two-goal lead. Useful to show the prevalence of +2 events relative to total
matches.

---

## Group 2: Win/Draw/Loss Rates

Percentage measures derived from Group 1 counts. Formatted as percentages in
visuals.

### Win Rate

```dax
Win Rate =
DIVIDE(
    SUM(fact_plus2_events[is_win]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Primary KPI card on Overview page; line charts on Minute Deep Dive
and Season Trends pages. Format as percentage (e.g., 0.0%).
**Description:** The proportion of +2 lead events that resulted in a win for
the leading team. This is the study's headline statistic. DIVIDE returns 0 when
there are no rows in context (avoiding division-by-zero errors).

---

### Draw Rate

```dax
Draw Rate =
DIVIDE(
    SUM(fact_plus2_events[is_draw]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Tooltip on donut chart; secondary KPI display.
**Description:** Proportion of +2 lead events ending in a draw.

---

### Loss Rate

```dax
Loss Rate =
DIVIDE(
    SUM(fact_plus2_events[is_loss]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Tooltip on donut chart; secondary KPI display.
**Description:** Proportion of +2 lead events ending in a loss for the
leading team. Expected to be very small.

---

### Win Rate Display

```dax
Win Rate Display =
FORMAT([Win Rate], "0.0%")
```

**Visual:** Card visual on Overview page (formatted text display).
**Description:** A text-formatted version of Win Rate for use in card visuals
where you want to control the exact display format (e.g., "90.4%").

---

## Group 3: Points Analysis

Measures related to points earned and dropped from +2 lead situations.
Points-dropped logic: W = 0 dropped, D = 2 dropped, L = 3 dropped.

### Points Dropped

```dax
Points Dropped = SUM(fact_plus2_events[points_dropped])
```

**Visual:** Card on Overview page; bar chart on Team Leaderboard page.
**Description:** Total points dropped across all +2 events in the current
filter context. A win drops 0, a draw drops 2, and a loss drops 3.

---

### Points Earned

```dax
Points Earned = SUM(fact_plus2_events[points_earned])
```

**Visual:** Team Leaderboard table; supporting tooltip.
**Description:** Total points earned across all +2 events. A win earns 3, a
draw earns 1, and a loss earns 0.

---

### Avg Points Dropped

```dax
Avg Points Dropped =
DIVIDE(
    SUM(fact_plus2_events[points_dropped]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Team Leaderboard table column; scatter-plot tooltip.
**Description:** Average points dropped per +2 event. A lower number means the
team (or bucket, or season) converts +2 leads into wins more reliably.

---

## Group 4: Minute Bucket Analysis

These measures power the study's key finding: identifying the minute at which
a +2 lead becomes "locked" (win probability exceeds 90% or 95%).

### Win Rate by Bucket

```dax
Win Rate by Bucket =
DIVIDE(
    SUM(fact_plus2_events[is_win]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Line chart and clustered bar chart on the Minute Deep Dive page
(Page 2). X-axis: dim_minute_bucket[bucket_label] sorted by bucket_order.
**Description:** Identical formula to Win Rate but named distinctly so it reads
clearly when placed on a bucket-axis visual. Power BI evaluates it per bucket
because the bucket dimension is on the axis.

---

### Events by Bucket

```dax
Events by Bucket = COUNTROWS(fact_plus2_events)
```

**Visual:** Secondary axis on the line chart (Minute Deep Dive); table on
Page 2.
**Description:** Count of +2 events in each minute bucket. Shows sample size
per bucket -- important for interpreting whether a high win rate is
statistically meaningful.

---

### Is Locked 90

```dax
Is Locked 90 =
IF(
    [Win Rate by Bucket] >= 0.90,
    "LOCKED",
    "NOT LOCKED"
)
```

**Visual:** Conditional column in the bucket detail table on Page 2.
**Description:** Text indicator showing whether a given minute bucket's win
rate meets or exceeds the 90% threshold. Buckets at or above 90% are
considered "locked" -- a +2 lead reached by that minute nearly always holds.

---

### Threshold 90

```dax
Threshold 90 = 0.90
```

**Visual:** Constant reference line on the Win Rate by Bucket line chart.
**Description:** Returns 0.90 in every row context. Used as a constant line at
the 90% mark on the minute-bucket line chart to visually identify when win
probability crosses the threshold.

---

### Threshold 95

```dax
Threshold 95 = 0.95
```

**Visual:** Second constant reference line on the Win Rate by Bucket line
chart.
**Description:** Returns 0.95 in every row context. The stricter threshold --
if a bucket's win rate is above 95%, the lead is overwhelmingly safe.

---

## Group 5: Team-Level Analysis

Measures for the Team Leaderboard page (Page 3). The active relationship on
leader_team_key handles the standard "team as leader" perspective. The
USERELATIONSHIP function activates the inactive opponent_team_key relationship
for the opponent perspective.

### Team Win Rate

```dax
Team Win Rate =
DIVIDE(
    SUM(fact_plus2_events[is_win]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Bar chart (Top 10 teams by +2 win rate) and scatter plot on
Page 3. Filtered by dim_team[team_display_name] via the active relationship on
leader_team_key.
**Description:** Win rate for a specific team when they are the +2 leader.
Uses the active relationship (leader_team_key to dim_team). When a team slicer
is applied, this measure returns that team's conversion rate.

---

### Team Events

```dax
Team Events = COUNTROWS(fact_plus2_events)
```

**Visual:** Team Leaderboard table; X-axis on scatter plot (Page 3).
**Description:** Number of times a team achieved a +2 lead. Works via the
active leader_team_key relationship. Useful for filtering out teams with too
few events (e.g., minimum 10 events for meaningful comparison).

---

### Times as Trailing Team

```dax
Times as Trailing Team =
CALCULATE(
    COUNTROWS(fact_plus2_events),
    USERELATIONSHIP(
        fact_plus2_events[opponent_team_key],
        dim_team[team_key]
    )
)
```

**Visual:** Team Leaderboard table (opponent column); tooltip on scatter plot.
**Description:** Activates the INACTIVE relationship between
opponent_team_key and dim_team. Shows how many times a team was on the
receiving end of a +2 lead (i.e., they were trailing by 2+ goals). This lets
you answer: "Which team was most often trailing by two goals?"

---

### Opponent Comebacks

```dax
Opponent Comebacks =
CALCULATE(
    COUNTROWS(fact_plus2_events),
    USERELATIONSHIP(
        fact_plus2_events[opponent_team_key],
        dim_team[team_key]
    ),
    fact_plus2_events[result_for_leader] <> "W"
)
```

**Visual:** Team Leaderboard table (comeback column); tooltip.
**Description:** Uses the inactive opponent relationship. Counts +2 events
where the opponent (the team selected by dim_team) avoided defeat -- the
leader did not win (result was D or L). Answers: "How often did this team
mount a comeback from 2+ goals down?"

---

### Opponent Comeback Rate

```dax
Opponent Comeback Rate =
DIVIDE(
    [Opponent Comebacks],
    [Times as Trailing Team],
    0
)
```

**Visual:** Team Leaderboard table; bar chart of top comeback teams.
**Description:** Percentage of times a team avoided defeat when trailing by 2+
goals. A high rate indicates a team that is resilient when behind.

---

## Group 6: Home/Away Split

Measures that split results by whether the +2 leader was the home or away team.

### Home Leader Win Rate

```dax
Home Leader Win Rate =
CALCULATE(
    [Win Rate],
    fact_plus2_events[leader_is_home] = TRUE()
)
```

**Visual:** Home/Away comparison bar chart; card visual when Home/Away slicer
is set to Home.
**Description:** Win rate filtered to events where the leading team was
playing at home. Tests whether home advantage influences the ability to hold a
two-goal lead.

---

### Away Leader Win Rate

```dax
Away Leader Win Rate =
CALCULATE(
    [Win Rate],
    fact_plus2_events[leader_is_home] = FALSE()
)
```

**Visual:** Home/Away comparison bar chart; card visual when Home/Away slicer
is set to Away.
**Description:** Win rate filtered to events where the leading team was the
away side. Compared with Home Leader Win Rate to assess whether venue matters.

---

### Home Events

```dax
Home Events =
CALCULATE(
    COUNTROWS(fact_plus2_events),
    fact_plus2_events[leader_is_home] = TRUE()
)
```

**Visual:** Home/Away comparison table; tooltip.
**Description:** Count of +2 events where the leader was the home team.
Provides sample size context for the Home Leader Win Rate.

---

### Away Events

```dax
Away Events =
CALCULATE(
    COUNTROWS(fact_plus2_events),
    fact_plus2_events[leader_is_home] = FALSE()
)
```

**Visual:** Home/Away comparison table; tooltip.
**Description:** Count of +2 events where the leader was the away team.
Provides sample size context for the Away Leader Win Rate.

---

## Group 7: Strength Tier Analysis

Measures that segment results by the pre-match strength tier of the leading
team. The strength_tier field categorizes leaders as "Strong Favorite",
"Moderate", or "Underdog" based on implied probability terciles derived from
pre-match betting odds. These measures may return blanks for events without
odds data.

### Strength Win Rate

```dax
Strength Win Rate =
DIVIDE(
    SUM(fact_plus2_events[is_win]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Bar chart or column chart on Overview or Minute Deep Dive page,
with fact_plus2_events[strength_tier] on the axis. Apply a filter to exclude
BLANK strength_tier values.
**Description:** Win rate broken out by strength tier. Tests whether strong
favorites hold +2 leads more reliably than underdogs. The same formula as
Win Rate, but the axis segmentation creates distinct values per tier.

---

### Strength Events

```dax
Strength Events =
CALCULATE(
    COUNTROWS(fact_plus2_events),
    NOT(ISBLANK(fact_plus2_events[strength_tier]))
)
```

**Visual:** Strength tier table; tooltip.
**Description:** Count of +2 events that have a non-blank strength tier
assignment. Represents the subset of events with betting odds available.

---

### Points Dropped by Tier

```dax
Points Dropped by Tier =
DIVIDE(
    SUM(fact_plus2_events[points_dropped]),
    COUNTROWS(fact_plus2_events),
    0
)
```

**Visual:** Grouped bar chart alongside Strength Win Rate.
**Description:** Average points dropped per event within each strength tier.
Shows whether underdogs drop more points from +2 positions than favorites.

---

## Group 8: Conditional Formatting Helpers

Utility measures used for conditional formatting rules, data bars, and icon
sets in Power BI visuals. These do not appear as standalone visuals.

### Win Rate Color

```dax
Win Rate Color =
SWITCH(
    TRUE(),
    [Win Rate] >= 0.95, "#27ae60",
    [Win Rate] >= 0.90, "#2ecc71",
    [Win Rate] >= 0.80, "#f39c12",
    "#e74c3c"
)
```

**Visual:** Conditional formatting rule for background color in tables and
matrix visuals (field value-based formatting).
**Description:** Returns a hex color code based on win rate thresholds.
Dark green (#27ae60) for 95%+, light green (#2ecc71) for 90-95%, amber
(#f39c12) for 80-90%, and red (#e74c3c) below 80%. Consistent with the
report's color theme: green = safe, amber = caution, red = danger.

---

### Result Icon

```dax
Result Icon =
SWITCH(
    SELECTEDVALUE(fact_plus2_events[result_for_leader]),
    "W", "W",
    "D", "D",
    "L", "L",
    ""
)
```

**Visual:** Match Drill-Through page (Page 5) result indicator.
**Description:** Returns a single character representing the match result for
the leading team. Used in card visuals or table cells on the drill-through
page. Apply conditional formatting to color the cell green (W), amber (D), or
red (L) using the Win Rate Color logic or manual rules.

---

### Points Dropped Color

```dax
Points Dropped Color =
SWITCH(
    TRUE(),
    [Avg Points Dropped] = 0, "#27ae60",
    [Avg Points Dropped] <= 0.3, "#2ecc71",
    [Avg Points Dropped] <= 0.6, "#f39c12",
    "#e74c3c"
)
```

**Visual:** Conditional formatting on Points Dropped columns in tables.
**Description:** Returns a hex color code for the average-points-dropped
value. Green when zero or near-zero (the team almost always converts), amber
for moderate point loss, red for high point loss. Thresholds are approximate
and can be adjusted based on the data distribution.

---

### Event Count Font Weight

```dax
Event Count Font Weight =
IF(
    COUNTROWS(fact_plus2_events) >= 10,
    "Bold",
    "Normal"
)
```

**Visual:** Conditional formatting rule (font style) in Team Leaderboard
table.
**Description:** Returns "Bold" when a team has 10 or more +2 events, "Normal"
otherwise. Used to visually distinguish teams with a statistically meaningful
sample from those with only a handful of events. Apply via Rules-based
conditional formatting on the font weight property.

---

## Appendix: Measure Quick Reference

| #  | Measure Name              | Group                  | Format     |
|----|---------------------------|------------------------|------------|
| 1  | Total Events              | Core Counts            | Whole Number |
| 2  | Total Wins                | Core Counts            | Whole Number |
| 3  | Total Draws               | Core Counts            | Whole Number |
| 4  | Total Losses              | Core Counts            | Whole Number |
| 5  | Total Matches             | Core Counts            | Whole Number |
| 6  | Matches with +2           | Core Counts            | Whole Number |
| 7  | Win Rate                  | Win/Draw/Loss Rates    | Percentage |
| 8  | Draw Rate                 | Win/Draw/Loss Rates    | Percentage |
| 9  | Loss Rate                 | Win/Draw/Loss Rates    | Percentage |
| 10 | Win Rate Display          | Win/Draw/Loss Rates    | Text       |
| 11 | Points Dropped            | Points Analysis        | Whole Number |
| 12 | Points Earned             | Points Analysis        | Whole Number |
| 13 | Avg Points Dropped        | Points Analysis        | Decimal (0.00) |
| 14 | Win Rate by Bucket        | Minute Bucket Analysis | Percentage |
| 15 | Events by Bucket          | Minute Bucket Analysis | Whole Number |
| 16 | Is Locked 90              | Minute Bucket Analysis | Text       |
| 17 | Threshold 90              | Minute Bucket Analysis | Percentage |
| 18 | Threshold 95              | Minute Bucket Analysis | Percentage |
| 19 | Team Win Rate             | Team-Level Analysis    | Percentage |
| 20 | Team Events               | Team-Level Analysis    | Whole Number |
| 21 | Times as Trailing Team    | Team-Level Analysis    | Whole Number |
| 22 | Opponent Comebacks        | Team-Level Analysis    | Whole Number |
| 23 | Opponent Comeback Rate    | Team-Level Analysis    | Percentage |
| 24 | Home Leader Win Rate      | Home/Away Split        | Percentage |
| 25 | Away Leader Win Rate      | Home/Away Split        | Percentage |
| 26 | Home Events               | Home/Away Split        | Whole Number |
| 27 | Away Events               | Home/Away Split        | Whole Number |
| 28 | Strength Win Rate         | Strength Tier Analysis | Percentage |
| 29 | Strength Events           | Strength Tier Analysis | Whole Number |
| 30 | Points Dropped by Tier    | Strength Tier Analysis | Decimal (0.00) |
| 31 | Win Rate Color            | Cond. Formatting       | Text (Hex) |
| 32 | Result Icon               | Cond. Formatting       | Text       |
| 33 | Points Dropped Color      | Cond. Formatting       | Text (Hex) |
| 34 | Event Count Font Weight   | Cond. Formatting       | Text       |
