# Power BI Setup Guide — EPL 2-Goal Lead Study

## Prerequisites
- Power BI Desktop (free download from Microsoft)
- All CSV files from `data/powerbi/` folder (12 files total)

---

## Step 1: Open Power BI Desktop
- File → New Report

---

## Step 2: Load Data

Home → Get Data → Text/CSV

Load files in this order from the `data/powerbi/` folder:

### Dimension Tables (load first)
1. **dim_season.csv** — 10 rows (one per season)
2. **dim_team.csv** — 34 rows (all EPL teams in sample)
3. **dim_match.csv** — 3,800 rows (all matches)
4. **dim_minute_bucket.csv** — 6 rows (time intervals)

### Fact Tables
5. **fact_plus2_events.csv** — 1,907 rows (primary analysis table)
6. **fact_goal_timeline.csv** — 7,007 rows (goal-by-goal for drill-through)

### Pre-Computed Summary Tables (from Statistician)
7. **summary_overall.csv** — 6 rows (headline metrics with CIs)
8. **summary_by_bucket.csv** — 6 rows (bucket-level stats)
9. **summary_by_season.csv** — 10 rows (season trends)
10. **summary_by_team.csv** — 34 rows (team leaderboard)
11. **summary_bucket_stats.csv** — 3 rows (chi-square & locked minute)
12. **summary_regression.csv** — 6 rows (logistic regression results)

**For each file:**
- Click "Load" (not "Transform" — data is already clean)
- Verify row counts match the numbers above

---

## Step 3: Configure Relationships

Go to **Model View** (left sidebar, 3rd icon — the diagram icon)

### Create Active Relationships (drag fields to connect)

| From (Many side) | To (One side) | Type |
|-------------------|---------------|------|
| fact_plus2_events[match_key] | dim_match[match_key] | Many:1 |
| fact_plus2_events[season_key] | dim_season[season_key] | Many:1 |
| fact_plus2_events[leader_team_key] | dim_team[team_key] | Many:1 **★ ACTIVE** |
| fact_plus2_events[bucket_key] | dim_minute_bucket[bucket_key] | Many:1 |
| fact_goal_timeline[match_key] | dim_match[match_key] | Many:1 |
| fact_goal_timeline[season_key] | dim_season[season_key] | Many:1 |
| fact_goal_timeline[scoring_team_key] | dim_team[team_key] | Many:1 |

### Create Inactive Relationship

| From (Many side) | To (One side) | Note |
|-------------------|---------------|------|
| fact_plus2_events[opponent_team_key] | dim_team[team_key] | **SET AS INACTIVE** |

**To make a relationship inactive:**
1. Double-click the relationship line
2. Uncheck "Make this relationship active"
3. Click OK

**IMPORTANT:** The dim_team table connects to fact_plus2_events twice (leader and opponent). Only the leader_team_key relationship should be active. The opponent relationship uses `USERELATIONSHIP()` in DAX measures.

### Cross-Filter Direction
All relationships should be: **Single direction** (from dimension to fact)

---

## Step 4: Set Sort Orders

Go to **Data View** (left sidebar, table icon)

### dim_minute_bucket
1. Click the `bucket_label` column
2. In the Column Tools ribbon → **Sort by Column** → select `bucket_order`
3. This ensures buckets display in chronological order (0–15, 16–30, ... 76–90+)

### dim_season
1. Click the `season_label` column
2. In the Column Tools ribbon → **Sort by Column** → select `sort_order`
3. This ensures seasons display chronologically

---

## Step 5: Create Measure Table

1. Modeling → **New Table**
2. Enter: `_Measures = {0}`
3. This creates a dedicated table for all DAX measures
4. Add all measures from `docs/dax_measures.md` into this table:
   - Right-click `_Measures` → **New Measure**
   - Paste each DAX formula
   - Repeat for all measures

---

## Step 6: Build Pages

Follow `docs/powerbi_spec.md` page by page.

**Quick page creation order:**
1. **Page 1: Executive Overview** — Start here. Add cards, donut chart, bar chart, slicers.
2. **Page 2: Minute Deep Dive** — Line chart with threshold lines, detail table.
3. **Page 3: Team Leaderboard** — Bar charts and scatter plot.
4. **Page 4: Season Trends** — Line and area charts.
5. **Page 5: Match Drill-Through** — Configure drill-through on match_key.
6. **Page 6: Statistical Summary** — Tables from summary CSVs.

---

## Step 7: Apply Theme

1. View → **Themes** → **Browse for themes**
2. Select `data/powerbi/epl_study_theme.json`
3. The theme applies these colors consistently:
   - **Green (#2ecc71):** Win
   - **Amber (#f39c12):** Draw
   - **Red (#e74c3c):** Loss
   - **Blue (#3498db):** Neutral/accent

---

## Step 8: Configure Drill-Through

On **Page 5 (Match Drill-Through)**:
1. Add `dim_match[match_key]` to the **Drill-through** field well
2. This allows right-click → Drill through from any visual on pages 1-4
3. Test by right-clicking a data point on Page 1 → Drill through → Match Drill-Through

---

## Step 9: Final Checks

- [ ] All slicers work (Season, Team, Home/Away)
- [ ] Drill-through navigates to correct match
- [ ] Bucket chart is sorted chronologically (not alphabetically)
- [ ] Season chart is sorted chronologically
- [ ] Win rate cards show percentage format
- [ ] 90% threshold line appears on bucket chart
- [ ] Team slicer filters all visuals on the page
- [ ] Summary tables (chi-square, regression) display correctly on Page 6

---

## Step 10: Publish

**Option A: Share as file**
- File → Save As → `.pbix` file

**Option B: Publish to web**
- File → Publish to web (requires Power BI Pro)

**Option C: Export for paper**
- File → Export to PDF (for paper appendix)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bucket chart in wrong order | Step 4: Sort bucket_label by bucket_order |
| Team slicer shows wrong results | Check that leader_team_key relationship is ACTIVE |
| Opponent analysis not working | Use measures with USERELATIONSHIP() |
| Dates not recognized | Ensure match_date column is Date type (not Text) |
| Cards show wrong totals | Verify cross-filter direction is Single (dim→fact) |
| Drill-through not available | Ensure match_key is in the Drill-through field well |

---

## Summary Table Reference

The summary CSVs are **read-only reference tables**. They provide pre-computed confidence intervals and test statistics that DAX cannot easily produce. Use them for:
- `summary_overall` → Card visuals with CIs
- `summary_by_bucket` → Bucket detail table with CIs and locked flags
- `summary_bucket_stats` → Text boxes for chi-square results
- `summary_regression` → Regression results table
