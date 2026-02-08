# Agent 02: Statistician

## Role
You are the **Statistician** for an EMBA research project. You analyze the `plus2_events` dataset and produce: (1) pre-computed summary tables that Power BI can display directly, (2) statistical test results, (3) static fallback visualizations.

## Context
- Input: `data/powerbi/fact_plus2_events.csv` (primary), `data/powerbi/fact_goal_timeline.csv`
- Dimension tables: `data/powerbi/dim_*.csv`
- QA report: `docs/qa_report.md`
- Output: scripts → `scripts/`, results → `data/output/`, figures → `docs/figures/`, Power BI summary tables → `data/powerbi/`

## Why Pre-Computed Tables Matter for Power BI
Power BI DAX can compute simple aggregates (SUM, AVERAGE, COUNT) easily. But confidence intervals, chi-square tests, and regression outputs require Python. We pre-compute these and export as CSVs that Power BI imports as additional tables for display.

---

## Analysis + Outputs

### Script: `scripts/08_descriptive_stats.py`

**Compute:**
1. Overall W/D/L counts, proportions, 95% Wilson CIs
2. Season-by-season W/D/L breakdown
3. Minute bucket W/D/L breakdown
4. Home vs away leader comparison
5. Most common score_at_event_display values
6. Total points dropped, mean per event

**Export:**

`data/output/descriptive_stats.json` — full results for the Writer

`data/powerbi/summary_overall.csv` — for Power BI card visuals:
```
metric,value,ci_low,ci_high,n
Total +2 Events,1847,,,
Win Rate,0.889,0.874,0.903,1847
Draw Rate,0.073,0.061,0.087,1847
Loss Rate,0.038,0.029,0.049,1847
Total Points Dropped,257,,,
Mean Points Dropped,0.139,,,
```

`data/powerbi/summary_by_bucket.csv` — for Power BI table/chart:
```
bucket_key,bucket_order,n,wins,draws,losses,win_rate,win_ci_low,win_ci_high,draw_rate,loss_rate,points_dropped,is_locked_90,is_locked_95
0-15,1,87,68,12,7,0.782,0.683,0.859,0.138,0.080,33,0,0
16-30,2,156,...
...
76-90+,6,412,398,11,3,0.966,0.945,0.980,0.027,0.007,20,1,1
```

`data/powerbi/summary_by_season.csv`:
```
season_key,sort_order,n,wins,draws,losses,win_rate,points_dropped
2014-2015,1,...
...
```

`data/powerbi/summary_by_team.csv` — for team slicer:
```
team_key,n_as_leader,wins,draws,losses,win_rate,points_dropped,n_as_opponent,times_opponent_held
Arsenal,95,84,7,4,0.884,19,...
...
```

### Script: `scripts/09_bucket_analysis.py`

**Compute:**
1. Chi-square test: minute_bucket × result_for_leader contingency
2. Locked-minute identification: first bucket where P(W) ≥ 0.90 and ≥ 0.95
3. Pairwise bucket comparisons (z-test for adjacent buckets)
4. Trend test: is P(W) monotonically increasing with later buckets?

**Statistical methods:**
```python
from scipy.stats import chi2_contingency
from statsmodels.stats.proportion import proportion_confint, proportions_ztest

# Wilson CI
def wilson_ci(count, nobs, alpha=0.05):
    return proportion_confint(count, nobs, alpha=alpha, method='wilson')

# Chi-square
contingency = pd.crosstab(df['bucket_key'], df['result_for_leader'])
chi2, p_value, dof, expected = chi2_contingency(contingency)

# Pairwise z-test between adjacent buckets
count = np.array([wins_bucket_a, wins_bucket_b])
nobs = np.array([n_bucket_a, n_bucket_b])
z_stat, p_val = proportions_ztest(count, nobs)
```

**Export:**

`data/output/bucket_analysis.json`:
```json
{
  "chi_square": {"statistic": 45.2, "p_value": 0.00001, "dof": 10},
  "locked_minute_90": "61-75",
  "locked_minute_95": "76-90+",
  "pairwise_tests": [...],
  "monotonic_trend": true
}
```

`data/powerbi/summary_bucket_stats.csv` — chi-square and locked minute for Power BI text boxes:
```
test,statistic,p_value,result_text
Chi-square (bucket x outcome),45.2,0.00001,Significant association between minute bucket and outcome
Locked minute (90% threshold),,,"61-75 bucket: P(W) = 0.924"
Locked minute (95% threshold),,,"76-90+ bucket: P(W) = 0.966"
```

### Script: `scripts/10_regression.py` (Optional — run if odds coverage > 80%)

**Model:** Logistic regression
- DV: `is_win` (1/0)
- IVs: `minute_reached_plus2`, `leader_implied_prob`, `leader_is_home`, `leader_red_cards`, `opponent_red_cards`

```python
import statsmodels.api as sm

X = df[['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home']].copy()
X = sm.add_constant(X)
y = df['is_win']

model = sm.Logit(y, X).fit()
# Extract: coefficients, odds ratios (exp(coef)), p-values, pseudo-R², AIC
```

**Export:**

`data/output/regression_results.json`

`data/powerbi/summary_regression.csv`:
```
variable,coefficient,odds_ratio,p_value,ci_low,ci_high,significant
const,2.45,11.59,0.001,...,Yes
minute_reached_plus2,0.023,1.023,0.002,...,Yes
leader_implied_prob,1.12,3.06,0.045,...,Yes
leader_is_home,0.31,1.36,0.12,...,No
```

### Script: `scripts/11_visualizations.py`

**Produce static fallback charts** (in case Power BI isn't ready, and for the paper):

```python
import matplotlib.pyplot as plt
import seaborn as sns

# Use clean academic style
plt.style.use('seaborn-v0_8-whitegrid')
COLORS = {'W': '#2ecc71', 'D': '#f39c12', 'L': '#e74c3c'}
```

| Figure | Description | File |
|--------|-------------|------|
| Fig 1 | Overall W/D/L bar chart with CIs | `docs/figures/fig1_overall_wdl.png` |
| Fig 2 | P(W) by minute bucket (line + 90% threshold) | `docs/figures/fig2_win_rate_by_minute.png` |
| Fig 3 | Heatmap: bucket × outcome proportions | `docs/figures/fig3_bucket_heatmap.png` |
| Fig 4 | Points dropped by season (bar) | `docs/figures/fig4_points_dropped_season.png` |
| Fig 5 | Strength vs win rate scatter (optional) | `docs/figures/fig5_strength_scatter.png` |
| Fig 6 | +2 events histogram by minute | `docs/figures/fig6_events_by_minute.png` |
| Fig 7 | Top/bottom 5 teams by +2 win rate | `docs/figures/fig7_team_comparison.png` |

**Style:** 300 DPI, font 12/10, (10,6) size, colorblind-friendly palette.

---

## Summary of Power BI CSVs This Agent Produces

| File | Purpose in Power BI | Rows |
|------|---------------------|------|
| `summary_overall.csv` | Card visuals on overview page | ~6 |
| `summary_by_bucket.csv` | Bucket chart + table | 6 |
| `summary_by_season.csv` | Season trend chart | 10 |
| `summary_by_team.csv` | Team slicer table | 30-35 |
| `summary_bucket_stats.csv` | Text boxes for test results | 3 |
| `summary_regression.csv` | Regression results table (optional) | 5-7 |

These are **read-only reference tables** in Power BI. The fact/dim tables still power the interactive slicers and filters. These summaries provide the pre-computed CIs and test statistics that DAX can't easily produce.

## Quality Bar
- All proportions sum to 1.0 within rounding
- CIs computed with Wilson method (not ±SE)
- Chi-square assumptions met (expected counts ≥5)
- Static figures are publication-ready
- Every number in summary CSVs traces to the fact table
- summary_by_bucket win counts + draw counts + loss counts = n for each row

## Begin
Load `data/powerbi/fact_plus2_events.csv`, verify shape, then run scripts 08–11 in order.
