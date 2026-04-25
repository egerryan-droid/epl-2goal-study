# EPL 2-Goal Study — QA Plan

A layered plan for keeping every part of the project — raw data, processed
tables, statistics, narrative, and the web deck — internally consistent and
externally verifiable.

The goal is simple: when a stat or a scorer appears in a slide, a paper, or a
talk-track, a machine has confirmed it matches the data on disk and (where
possible) an independent source.

---

## 0. Severity ladder

| Level | Meaning | Example | Exit-code impact |
|-------|---------|---------|------------------|
| **CRITICAL** | Data is structurally broken, downstream work invalid | FK orphans, duplicate PK | Fail build |
| **FAIL** | Real disagreement between sources or a claim contradicts the data | Slide says "93.3%" but aggregate is 92.6% | Fail build |
| **WARN** | Known quirk or cross-source drift within tolerance | Understat minutes 1–2 off official | Pass with notice |
| **INFO** | Contextual note, not an issue | "ESPN details[] incomplete for 707 old matches" | Pass |
| **PASS** | Check ran clean | — | Pass |

Default `--fail-on error` treats CRITICAL + FAIL as build-breakers.

---

## 1. Project layers and ownership

| Layer | Artifact | Who/what produces it |
|-------|----------|----------------------|
| **L0 Raw** | `data/raw/football_data_*.csv`, `data/raw/understat_shots_*.csv`, `data/raw/espn_*.csv` | `scripts/01_*`, `02_*`, `14_*` |
| **L1 Processed** | `data/processed/goal_timeline.csv`, `plus2_events_*.csv` | `scripts/03_*`, `04_*`, `05_*` |
| **L2 Star schema** | `data/powerbi/dim_*.csv`, `fact_*.csv` | `scripts/06_*` |
| **L3 Aggregates** | `data/powerbi/summary_*.csv`, `data/output/*.json` (`descriptive_stats`, `bucket_analysis`, `regression_results`) | `scripts/09_*`, `10_*`, `11_*` |
| **L4 Visual assets** | `docs/figures/*.png` | `scripts/12_*` |
| **L5 Narrative** | `docs/paper_draft.md`, `docs/talk-track.md`, `docs/qa_report.md`, `docs/powerbi_spec.md`, `docs/dax_measures.md` | Humans |
| **L6 Web** | `epl-2goal-web/src/components/sections/S*.tsx`, `epl-2goal-web/src/data/*.json` | Humans + `epl-2goal-web/scripts/csv-to-json.ts` |
| **L7 Third-party** | Anchor matches, ESPN snapshot, Football-Data archive | Curated / scraped |

Every layer downstream must be **derivable or traceable** to the layer above.

---

## 2. Checks by layer

### L0 — Raw data acquisition

- **R0-1** Every season's raw CSVs exist (2014/15 through 2023/24 for both FD and Understat).
- **R0-2** Row counts per season within expected ranges (~380 matches, ~9,000+ shots).
- **R0-3** Raw files readable in both UTF-8 and latin-1 (FD sometimes uses latin-1).
- **R0-4** Schema columns present (`FTHG`, `FTAG`, `Date`, `HomeTeam`, `AwayTeam` for FD; `match_id`, `minute`, `player`, `result`, `h_a` for Understat).
- **R0-5** ESPN snapshot matches FD date coverage ±1 day (handles known Understat date drift).

**Current coverage:** partial — row-count ranges in `07_validate_star_schema.py`; no explicit schema-column test; no ESPN vs FD date-coverage test.

**Tool:** extend `scripts/13_full_validation.py` with a Tier 0 pass, or add to `07`.

---

### L1 — Processed data

- **P1-1** `running_diff == running_home - running_away` (every row). ✓
- **P1-2** Per-goal increments exactly 1 on the scoring side. ✓
- **P1-3** `final_home_goals` / `final_away_goals` == last running total (every match). ✓
- **P1-4** Goals sorted by minute within match, minute ∈ [0, 120]. ✓
- **P1-5** `scoring_side` ∈ {home, away}; `scoring_team` aligned with side. ✓
- **P1-6** Non-null `player` on every row. ✓
- **P1-7** `(season, date, home_team, away_team)` unique per `match_id`. ✓
- **P1-8** Own-goal semantics: `is_own_goal=True` → `player` is on the *conceding* team (cross-check against raw Understat `h_a`). ✗ **not implemented**
- **P1-9** `plus2_events_joined.csv`: every event has `match_id` present in `goal_timeline.csv`; `minute_reached_plus2` matches when +2 first appeared in the running totals. ✗ **not implemented**

**Tool:** Tier 1 of [scripts/13_full_validation.py](../scripts/13_full_validation.py). Extend with P1-8 and P1-9.

---

### L2 — Star schema

- **S2-1** Six expected CSVs exist in `data/powerbi/`. ✓ (`scripts/07`)
- **S2-2** Primary-key uniqueness per dimension (`season_key`, `team_key`, `match_key`, `bucket_key`, `event_id`, `goal_id`). ✓
- **S2-3** Foreign-key integrity: every FK in `fact_plus2_events` / `fact_goal_timeline` resolves to its dimension. ✓
- **S2-4** Business logic: `is_win + is_draw + is_loss = 1`, `points_earned + points_dropped = 3`, `result_for_leader` consistent with flags. ✓
- **S2-5** `full_time_result` derivable from goals. ✓
- **S2-6** `minute_reached_plus2` within bucket range. ✓
- **S2-7** Booleans encoded consistently (True/False or 1/0). ✓
- **S2-8** Dates YYYY-MM-DD. ✓
- **S2-9** `goal_timeline.csv` (processed) agrees with `fact_goal_timeline.csv` (schema) on row count and per-match totals. ✗ **not explicitly checked** — relies on `06` building both consistently.

**Tool:** [scripts/07_validate_star_schema.py](../scripts/07_validate_star_schema.py) + Tier 1 of [scripts/13_full_validation.py](../scripts/13_full_validation.py). Add S2-9 as a new cross-check.

---

### L3 — Statistical outputs (aggregates & models)

This is the **biggest current gap**. The numbers the paper and talk cite live
here, but nothing checks that they're still accurate after a data refresh.

- **A3-1** `descriptive_stats.json.overall.win_rate` == `fact_plus2_events.is_win.mean()`. ✗
- **A3-2** `descriptive_stats.json.overall.{events, wins, draws, losses, points_dropped}` match `fact_plus2_events` aggregates. ✗
- **A3-3** `descriptive_stats.json.by_bucket` matches a fresh groupby on `bucket_key`. ✗
- **A3-4** `descriptive_stats.json.by_season` matches a fresh groupby on `season_key`. ✗
- **A3-5** `descriptive_stats.json.by_team` matches fresh groupby (for both leader and opponent angles). ✗
- **A3-6** `bucket_analysis.json.win_rates_by_bucket` matches `summary_by_bucket.csv`. ✗
- **A3-7** `bucket_analysis.json.locked_minute_95` still identifies the same ≥95% lock window. ✗
- **A3-8** `regression_results.json.coefficients` match a fresh statsmodels re-fit (within numerical tolerance, e.g. ±1e-4 on coef, same sign, same significance). ✗
- **A3-9** `summary_overall.csv`, `summary_by_bucket.csv`, `summary_by_season.csv`, `summary_by_team.csv` all agree with fresh groupbys of `fact_plus2_events`. ✗ **partially covered by** `08_qa_validation.py` distribution checks only.

**Tool:** **new** — `scripts/15_validate_aggregates.py`, or a Tier 1.5 added to
[scripts/13_full_validation.py](../scripts/13_full_validation.py). This should
re-compute every aggregate and compare to the committed JSON/CSV, failing on
any divergence > tolerance.

---

### L4 — Figures

- **F4-1** Every expected figure is present and non-zero bytes. ✗
- **F4-2** Figure counts / IDs referenced in the paper exist on disk. ✗

**Tool:** Tier 4.5 (new) — small glob check in [scripts/13_full_validation.py](../scripts/13_full_validation.py).

---

### L5 — Narrative (paper, talk-track, PBI spec, DAX)

- **N5-1** Numeric claims in `docs/paper_draft.md` and `docs/talk-track.md`
  (e.g. `1,907`, `93.3%`, `99.7%`, `294`, `66.7x`, `p = 0.84`) match the
  corresponding aggregate file. ✗ **biggest narrative gap**
- **N5-2** Section headers in `talk-track.md` (S01–S11, S02b, S04b, S05b, S06b, S07b, S09b)
  match the slide files present in `epl-2goal-web/src/components/sections/`. ✗
- **N5-3** `docs/paper_draft.md` ↔ `docs/talk-track.md` consistency: same headline stats. ✗
- **N5-4** `docs/powerbi_spec.md` references real columns in `shared/schema.json`. ✗
- **N5-5** `docs/dax_measures.md` measures reference real `fact_*` / `dim_*` tables and columns. ✗
- **N5-6** `docs/qa_report.md` timestamp / status consistent with the latest validator run. ✗

**Tool:** **new** — `scripts/16_validate_narrative.py` (or a new Tier in
[scripts/13_full_validation.py](../scripts/13_full_validation.py)) that extracts
numeric claims by regex, resolves each to a canonical aggregate source, and
compares. Requires a **claims map** (e.g. `docs/narrative_claims.yaml`)
associating `"93.3%"` → `summary_overall.csv:win_rate` so future claims can be
added by editing the YAML, not code.

---

### L6 — Web (slides + dashboard data)

- **W6-1** Every `S*.tsx` hardcoded `*MATCH_KEY*` resolves to a real match and the comment/narrative agrees with the data. ✓ (Tier 4 currently)
- **W6-2** Every `FEATURED_MATCH_KEYS[]` entry resolves to a real match. ✓
- **W6-3** `epl-2goal-web/src/data/*.json` payloads match their source CSVs (CSV→JSON conversion agrees). Partial — `goals_by_match.json` checked. Others (`summary_by_bucket.json`, `summary_by_season.json`, `summary_by_team.json`, `summary_bucket_stats.json`, `summary_overall.json`, `summary_regression.json`, `summary_half_stats.json`, `dim_*.json`, `fact_plus2_events.json`, `draw_events.json`) **not cross-checked**.
- **W6-4** TeamCrest image exists for every team that appears on any slide. ✗
- **W6-5** YouTube links return HTTP 200 and the video is still available. ✗ (out of scope in v1; flagged manually)
- **W6-6** S*.tsx numeric literals (e.g. "1,907 Events", "10 Seasons") match aggregates. ✗
- **W6-7** `epl-2goal-web/` `npm run build` succeeds (catches TS errors, missing imports). ✗ **not part of QA**

**Tool:** extend Tier 4 of [scripts/13_full_validation.py](../scripts/13_full_validation.py) for W6-3, W6-4, W6-6. W6-7 is a CI concern.

---

### L7 — Third-party cross-checks

- **T7-1** Understat vs Football-Data final scores. ✓
- **T7-2** Understat vs ESPN scorer names and minutes. ✓
- **T7-3** Anchor matches from curated external sources (PL/BBC/ESPN). ✓ (3 seeded; extend as gaps appear)
- **T7-4** Disputed goals written to `data/output/disputed_goals.csv`. ✓
- **T7-5** ESPN data completeness check: flag `details[]` gaps so Understat isn't blamed for them. ✓
- **T7-6** Understat date drift — 25 matches 1 day off FD — document, not fix. Currently WARN; unchanged.

**Tool:** Tier 2 of [scripts/13_full_validation.py](../scripts/13_full_validation.py).

---

### L8 — Automation & reproducibility

- **R8-1** Pipeline re-runnable end-to-end from clean checkout (`01` through `12`), deterministic outputs.
- **R8-2** Every QA layer runnable from one entry point. ✓ (`scripts/13_full_validation.py`)
- **R8-3** Pre-commit hook runs the full validator (~22s). ✓ ([.pre-commit-config.yaml](../.pre-commit-config.yaml))
- **R8-4** CI job runs the full validator on every PR + push to master. ✓ ([.github/workflows/validate.yml](../.github/workflows/validate.yml))
- **R8-5** Weekly cron re-fetches ESPN for the current season and reruns validation. (deferred)

**Enabling pre-commit locally (one-time setup per clone):**
```bash
pip install pre-commit
pre-commit install
```
Subsequent `git commit` invocations will run the validator on any commit that
touches `scripts/`, `data/{processed,powerbi,output,reference}/`, `docs/paper_draft.md`,
`docs/talk-track.md`, `epl-2goal-web/src/`, `shared/`, or `requirements.txt`.

Bypass once (only when you know what you're doing, e.g. fixing a pre-commit
issue in the validator itself): `git commit --no-verify`.

**Accepted disputes** — genuine Understat-vs-ESPN scorer conflicts that
can't be resolved without a paid third source are acknowledged in
[data/reference/accepted_disputes.yaml](../data/reference/accepted_disputes.yaml).
Listing a dispute there downgrades it from FAIL to INFO so CI stays
green, but genuinely new disputes surface as FAIL and block merge until
reviewed and either resolved or added to the file.

---

## 3. Current coverage heatmap

| Layer | Covered | Partial | Missing | Tool |
|-------|:-------:|:-------:|:-------:|------|
| L0 Raw | | ● | | `07` |
| L1 Processed | ● | | P1-9 | `13` Tier 1 (incl. own-goal semantics) |
| L2 Star schema | ● | | S2-9 | `07`, `08`, `13` Tier 1 |
| L3 Aggregates | ● | | | `13` Tier 2 (overall + by bucket/season/team, regression parity, CSV↔JSON) |
| L4 Figures | ● | | | `13` Tier 4 |
| L5 Narrative | ● | | N5-3 through N5-6 | `13` Tier 4 (narrative claim map) |
| L6 Web | ● | | W6-5 (YouTube), W6-7 (npm build) | `13` Tier 4 (slides + data parity + team crests) |
| L7 Third-party | ● | | | `13` Tier 2, `14` |
| L8 Automation | ● | | R8-5 weekly cron | `.pre-commit-config.yaml`, `.github/workflows/validate.yml` |

Every layer that was identified as a gap is now covered. What remains are
quality-of-life items (YouTube link liveness, `npm run build`, weekly
ESPN refresh cron).

---

## 4. Prioritized gaps

Ranked by blast-radius-if-wrong ÷ implementation effort.

1. **L3 aggregate parity** — recompute `descriptive_stats.json`,
   `bucket_analysis.json`, `summary_*.csv` from `fact_plus2_events.csv`
   and fail on any divergence > tolerance. Protects every number the
   paper and talk-track cite. (~half day)
2. **L5 numeric-claim map** — a YAML mapping "93.3%" → aggregate source, so
   every quoted stat in `paper_draft.md`/`talk-track.md`/`S*.tsx` is
   pinned to a canonical value and re-validated automatically. (~1 day)
3. **L3 regression parity** — re-fit the logistic model and confirm
   coefficients, p-values, AIC/BIC within tolerance. (~2 hours)
4. **L6 web-data parity** — diff every `epl-2goal-web/src/data/*.json`
   against its source CSV (extension of the existing `goals_by_match`
   check to all summary JSONs). (~1 hour)
5. **L6 team-crest presence** — confirm an image exists for every team
   referenced on any slide. (~30 min)
6. **L1 own-goal semantics (P1-8)** — verify own-goal scorer's team
   matches the conceding side in raw shots. (~1 hour)
7. **L4 figure presence** — glob check on `docs/figures/`. (~15 min)
8. **L8 CI automation** — pre-commit + GitHub Action wiring. (~1 hour once
   the validator extensions above are stable)

Everything beyond #4 is nice-to-have.

---

## 5. How to run the plan today

```bash
# Full 4-tier validator (integrity, cross-dataset, anchors, slides)
python scripts/13_full_validation.py

# Specific tier only
python scripts/13_full_validation.py --tier cross
python scripts/13_full_validation.py --tier slides

# Fetch/refresh third-party ESPN source (resumable)
python scripts/14_fetch_espn_goals.py

# Star-schema-only validation
python scripts/07_validate_star_schema.py

# Legacy QA (row counts, spot-checks)
python scripts/08_qa_validation.py
```

Outputs:
- `data/output/validation_report.md` — human-readable
- `data/output/validation_report.json` — machine-readable
- `data/output/disputed_goals.csv` — real source conflicts

Exit codes:
- `0` — all checks passed (or passed with WARNs)
- `1` — at least one CRITICAL or FAIL (adjust with `--fail-on {critical,error,warn,none}`)

---

## 6. Maintenance cadence

| Frequency | Action | Owner |
|-----------|--------|-------|
| Every commit touching `scripts/`, `data/`, `docs/`, or `epl-2goal-web/` | Run [scripts/13_full_validation.py](../scripts/13_full_validation.py) | Whoever is committing |
| Every data pipeline re-run | Re-run validator; update `data/output/validation_report.md`; review `disputed_goals.csv` changes | Data engineer |
| When adding a slide or narrative claim | Add the claim to the YAML claim map (once built in gap #2) | Author |
| When a source disagreement appears | Adjudicate in `disputed_goals.csv` (paste authoritative answer into a `resolution` column); optionally add a new anchor | Data engineer |
| Quarterly | Re-fetch ESPN snapshot for the full window; compare against committed snapshot | Maintainer |
| When a team name changes (new promotion, rebrand) | Add to `TEAM_ALIASES` in [scripts/13_full_validation.py](../scripts/13_full_validation.py) | Whoever noticed |

---

## 7. Out of scope for this plan

- **Video content verification** (is the embedded YouTube still the right match?) — requires manual review or paid API. Flagged via `[INFO]` so it stays visible but doesn't block.
- **Accessibility / cross-browser / Lighthouse** of `epl-2goal-web` — separate concern; covered by the Next.js build and manual UX.
- **Statistical model selection** — whether logistic regression with these factors is the *right* model is a research question, not a data-QA question. We only check the committed model's parity with a re-fit.
- **Real-time live data** — this is a historical study over 10 closed seasons. No live-update concerns.

---

## 8. Appendix — numeric claims to pin first

The following stats appear in the paper and/or talk-track and should be the
first entries in the claim map (gap #2 above):

| Claim | Value | Source of truth |
|-------|-------|-----------------|
| Events studied | 1,907 | `fact_plus2_events.csv` row count |
| Seasons | 10 | `dim_season.csv` row count |
| Matches examined | 3,800+ | `dim_match.csv` row count |
| Overall win rate | 93.3% | `fact_plus2_events.is_win.mean()` |
| Lock-point win rate (76-90+) | 99.7% | groupby bucket_key |
| Points dropped | 294 | `fact_plus2_events.points_dropped.sum()` |
| Draws | 87 | `fact_plus2_events.is_draw.sum()` |
| Losses | 40 | `fact_plus2_events.is_loss.sum()` |
| Lock-point events | 389 | count where bucket_key = "76-90+" |
| Lock-point holds | 388 | count where bucket_key = "76-90+" AND is_win = 1 |
| Season-high risk | 2015/16, 88.6% | groupby season_key |
| Season-low risk | 2016/17, 96.5% | groupby season_key |
| Favorite odds ratio | 66.7x | `regression_results.coefficients.is_favorite` |
| Red card (leader) OR | 0.42x | `regression_results.coefficients.leader_red_cards` |
| Red card (opp) OR | 3.46x | `regression_results.coefficients.opponent_red_cards` |
| Home advantage p-value | 0.84 | `regression_results.coefficients.leader_is_home.p_value` |
| First-half draw rate | 6.22% | groupby half |
| Second-half draw rate | 3.13% | groupby half |

Every one of these is currently quoted in narrative with no machine check
that the underlying aggregate still produces the cited number.
