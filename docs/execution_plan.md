# Execution Plan: EPL 2-Goal Lead Safety Study

## Project Overview
- **Researcher:** Ryan, EMBA student at Xavier University (graduating Dec 2026)
- **Scope:** 2-3 week solo student project using public data
- **Research question:** When a team takes a 2-goal lead in the EPL, what is P(win/draw/loss) and at what minute is the lead "locked" (>=90% win rate)?
- **Final deliverables:** (1) Power BI dashboard with interactive analysis, (2) EMBA research paper
- **Data:** 10 EPL seasons (2014/15 through 2023/24), ~3,800 matches

## Phase 1: Planning (Orchestrator) -- Day 1
**Status:** COMPLETE
**Agent:** Orchestrator

### Tasks completed:
- Validated `shared/schema.json` -- star schema with 2 fact tables + 4 dimension tables, 8 relationships
  - **Fix applied:** `points_dropped` description corrected from D=1 to D=2 (must satisfy points_earned + points_dropped = 3)
- Validated `shared/project_state.json` -- all 6 phases defined with substeps
- Validated `shared/name_mapping.json` -- 35 teams with variants, short names, cities
  - **Note:** Ipswich Town included but wasn't in EPL during sample period (harmless)
- Created directory structure: `docs/`, `scripts/`, `data/{raw,processed,powerbi,output}`, `docs/figures/`
- Produced this execution plan
- Confirmed agent sequence and handoff contracts

### Outputs:
- `docs/execution_plan.md` (this file)
- Updated `shared/project_state.json`

---

## Phase 2: Data Acquisition + Star Schema (Data Engineer) -- Days 1-5
**Status:** PENDING
**Agent:** Data Engineer

### Steps:
1. **Download Football-Data CSVs** (`scripts/01_download_football_data.py`)
   - 10 season files from football-data.co.uk
   - Output: `data/raw/football_data_*.csv` (10 files)

2. **Pull Understat Shot Data** (`scripts/02_pull_understat_shots.py`)
   - Shot-level data with minute timestamps for all 10 seasons
   - Rate-limited (1-2s between requests)
   - Output: `data/raw/understat_shots_*.csv` (10 files)

3. **Build Goal Timeline** (`scripts/03_build_goal_timeline.py`)
   - Filter shots to goals, handle own goals (flip credit)
   - Compute running scores per match
   - Output: `data/processed/goal_timeline.csv`

4. **Detect +2 Events** (`scripts/04_detect_plus2_events.py`)
   - Identify first moment each team reaches a 2-goal lead per match
   - Attach final result from leader perspective
   - Output: `data/processed/plus2_events_raw.csv`

5. **Join Controls** (`scripts/05_join_controls.py`)
   - Normalize team names via `shared/name_mapping.json`
   - Join red cards, odds from Football-Data
   - Compute implied probability and strength tiers
   - Output: `data/processed/plus2_events_joined.csv`, `data/processed/join_failures.csv`

6. **Build Star Schema** (`scripts/06_build_star_schema.py`)
   - 4 dimension tables: dim_season (10 rows), dim_team (30-35 rows), dim_match (~3,800 rows), dim_minute_bucket (6 rows)
   - 2 fact tables: fact_plus2_events (~1,500-2,100 rows), fact_goal_timeline
   - Output: `data/powerbi/*.csv` (6 files)

7. **Validate Star Schema** (`scripts/07_validate_star_schema.py`)
   - FK/PK integrity, row counts, key consistency
   - Must pass before handoff

### Handoff to QA:
- **Required:** All 6 CSVs in `data/powerbi/` exist, are non-empty, headers match schema
- **Quality bar:** Zero FK orphans, correct row counts, no trailing whitespace in keys

---

## Phase 3: QA Validation (QA Agent) -- Days 5-7
**Status:** PENDING
**Agent:** QA Agent

### Validation areas:
1. Star schema structure (columns match `shared/schema.json`)
2. Dimension table validation (row counts, key formats)
3. Fact table validation (FK integrity, is_win + is_draw + is_loss = 1, points_earned + points_dropped = 3)
4. Known match spot-checks (10+ real EPL matches via web search)
5. Distribution sanity (win rate 85-92%, +2 event rate 40-55%)
6. Missing data audit (nullable fields: red cards <20%, odds <25%)
7. Power BI readiness (no NULLs in keys, UTF-8, no BOM, clean dates)

### Outputs:
- `docs/qa_report.md` (with severity: BLOCKER / WARNING / NOTE)
- `data/processed/qa_flags.csv`

### Handoff to Statistician:
- **Gate:** No BLOCKERs in QA report

---

## Phase 4: Statistical Analysis (Statistician) -- Days 7-10
**Status:** PENDING
**Agent:** Statistician

### Scripts:
1. **Descriptive Stats** (`scripts/08_descriptive_stats.py`)
   - Overall W/D/L with Wilson CIs
   - Breakdowns by season, bucket, team, home/away
   - Outputs: `data/output/descriptive_stats.json`, `data/powerbi/summary_overall.csv`, `summary_by_bucket.csv`, `summary_by_season.csv`, `summary_by_team.csv`

2. **Bucket Analysis** (`scripts/09_bucket_analysis.py`)
   - Chi-square test (bucket x outcome)
   - Locked-minute identification (first bucket >= 90% win rate)
   - Pairwise z-tests between adjacent buckets
   - Outputs: `data/output/bucket_analysis.json`, `data/powerbi/summary_bucket_stats.csv`

3. **Regression** (`scripts/10_regression.py`) -- optional, if odds coverage > 80%
   - Logistic regression: is_win ~ minute + implied_prob + home + red cards
   - Outputs: `data/output/regression_results.json`, `data/powerbi/summary_regression.csv`

4. **Visualizations** (`scripts/11_visualizations.py`)
   - 7 static figures (300 DPI, publication-ready)
   - Output: `docs/figures/fig1_overall_wdl.png` through `fig7_team_comparison.png`

### Handoff to Power BI Architect:
- **Required:** `data/output/*.json` files exist and parse cleanly

---

## Phase 5: Power BI Architecture (Power BI Architect) -- Days 10-13
**Status:** PENDING
**Agent:** Power BI Architect

### Deliverables:
1. **DAX Measure Library** (`docs/dax_measures.md`)
   - 8 groups: core counts, rates, points, bucket analysis, team-level, home/away, strength, conditional formatting
   - Active/inactive relationship handling for dim_team

2. **Dashboard Specification** (`docs/powerbi_spec.md`)
   - 6 pages: Executive Overview, Minute Deep Dive, Team Leaderboard, Season Trends, Match Drill-Through, Statistical Summary
   - Visual-by-visual specs with measures and axes

3. **Load Instructions** (`docs/powerbi_load_instructions.md`)
   - Step-by-step guide for Power BI Desktop

4. **Color Theme** (`data/powerbi/epl_study_theme.json`)
   - Green=Win, Amber=Draw, Red=Loss

### Handoff to Writer:
- **Required:** DAX measures compile, spec covers all research questions

---

## Phase 6: Paper Writing (Writer) -- Days 13-16
**Status:** PENDING
**Agent:** Writer

### Paper structure:
- Title: "How Safe Is a Two-Goal Lead? Evidence from 10 Seasons of the English Premier League"
- Sections: Abstract, Introduction (with real blown-lead example), Literature Review, Methodology, Results, Discussion, Conclusion, References, Appendices (Power BI guide + data dictionary)
- Length: 4,000-6,000 words
- Every number sourced from result files; dashboard pages cross-referenced with static figures

### Output:
- `docs/paper_draft.md`

---

## Handoff Contracts Summary

| From | To | Required Files | Validation Gate |
|------|----|---------------|----------------|
| Data Engineer | QA | `data/powerbi/*.csv` (6 files) | All CSVs exist, non-empty, headers match schema |
| QA | Statistician | `docs/qa_report.md` | No BLOCKERs in report |
| Statistician | PBI Architect | `data/output/*.json` | Results JSON files exist and parse cleanly |
| PBI Architect | Writer | `docs/dax_measures.md`, `docs/powerbi_spec.md` | DAX measures compile, spec covers all RQs |
| All | Writer | Everything above | All phases complete or noted as cut |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Understat rate-limiting / 403s | No goal minutes | Exponential backoff; fallback to direct scraping; last resort FBref |
| Football-Data column changes across seasons | Missing controls (red cards, odds) | Log warnings, use available columns, note for Statistician |
| Team name mismatches on join | Lost +2 events | name_mapping.json covers 35 teams with 80+ variants; log failures |
| Stoppage time encoding | Incorrect bucket assignment | Explicit rules in schema.json (minute > 90 -> 76-90+ bucket) |
| Low odds coverage | Regression not viable | Regression is optional (run only if > 80% coverage) |
| dim_team role-playing in Power BI | Broken slicers | USERELATIONSHIP pattern documented; only leader_team_key is active |
| DAX circular dependencies | Broken measures | Separate measure table (_Measures); pre-computed summaries as fallback |

---

## Issues Found During Validation

### Fixed:
1. **`shared/schema.json` -- points_dropped for draws**: Description said D=1 but must be D=2 to satisfy `points_earned + points_dropped = 3`. Corrected.

### Noted (no action required):
1. **`shared/name_mapping.json` -- Ipswich Town**: Included in mapping but not in EPL during 2014-2024 sample. Harmless; they will simply have zero matches in the data.
