"""Bucket analysis: chi-square, locked-minute, pairwise z-tests, trend test."""
import os
import json
import pandas as pd
import numpy as np
from scipy.stats import chi2_contingency, norm

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PBI_DIR = os.path.join(PROJ_DIR, 'data', 'powerbi')
OUT_DIR = os.path.join(PROJ_DIR, 'data', 'output')

fact = pd.read_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'))
dim_bucket = pd.read_csv(os.path.join(PBI_DIR, 'dim_minute_bucket.csv')).sort_values('bucket_order')
summary_bucket = pd.read_csv(os.path.join(PBI_DIR, 'summary_by_bucket.csv')).sort_values('bucket_order')

print(f"Loaded {len(fact)} events, {len(dim_bucket)} buckets")


def wilson_ci(count, nobs, alpha=0.05):
    if nobs == 0:
        return (0.0, 0.0)
    z = norm.ppf(1 - alpha / 2)
    p = count / nobs
    denom = 1 + z**2 / nobs
    center = (p + z**2 / (2 * nobs)) / denom
    spread = z * np.sqrt(p * (1 - p) / nobs + z**2 / (4 * nobs**2)) / denom
    return (max(0, center - spread), min(1, center + spread))


def proportions_ztest(count1, nobs1, count2, nobs2):
    """Two-proportion z-test."""
    p1 = count1 / nobs1
    p2 = count2 / nobs2
    p_pool = (count1 + count2) / (nobs1 + nobs2)
    se = np.sqrt(p_pool * (1 - p_pool) * (1/nobs1 + 1/nobs2))
    if se == 0:
        return 0, 1.0
    z = (p1 - p2) / se
    p_val = 2 * (1 - norm.cdf(abs(z)))
    return z, p_val


# =========================================
# Chi-square test: bucket × outcome
# =========================================
print("\n=== Chi-Square Test ===")
contingency = pd.crosstab(fact['bucket_key'], fact['result_for_leader'])
# Reorder rows by bucket_order
bucket_order = dict(zip(dim_bucket['bucket_key'], dim_bucket['bucket_order']))
contingency = contingency.loc[sorted(contingency.index, key=lambda x: bucket_order.get(x, 99))]
print(contingency)

chi2, p_value, dof, expected = chi2_contingency(contingency)
print(f"\nChi-square = {chi2:.2f}, df = {dof}, p = {p_value:.6f}")

# Check expected counts ≥ 5
min_expected = expected.min()
print(f"Min expected count: {min_expected:.1f} (requirement: ≥5)")

chi_result = {
    'statistic': round(chi2, 2),
    'p_value': round(p_value, 6),
    'dof': int(dof),
    'min_expected_count': round(min_expected, 1),
    'assumptions_met': bool(min_expected >= 5),
}

# =========================================
# Locked minute identification
# =========================================
print("\n=== Locked Minute ===")
locked_90 = None
locked_95 = None
for _, row in summary_bucket.iterrows():
    wr = row['win_rate']
    bk = row['bucket_key']
    if wr >= 0.90 and locked_90 is None:
        locked_90 = bk
        locked_90_wr = wr
    if wr >= 0.95 and locked_95 is None:
        locked_95 = bk
        locked_95_wr = wr

print(f"Locked at 90%: {locked_90} (P(W) = {locked_90_wr:.3f})" if locked_90 else "90% threshold not reached")
print(f"Locked at 95%: {locked_95} (P(W) = {locked_95_wr:.3f})" if locked_95 else "95% threshold not reached")

# =========================================
# Pairwise z-tests (adjacent buckets)
# =========================================
print("\n=== Pairwise Z-Tests (Adjacent Buckets) ===")
pairwise = []
buckets_sorted = summary_bucket.sort_values('bucket_order').reset_index(drop=True)
for i in range(len(buckets_sorted) - 1):
    a = buckets_sorted.iloc[i]
    b = buckets_sorted.iloc[i + 1]
    z_stat, p_val = proportions_ztest(a['wins'], a['n'], b['wins'], b['n'])
    sig = 'Yes' if p_val < 0.05 else 'No'
    pairwise.append({
        'bucket_a': a['bucket_key'], 'bucket_b': b['bucket_key'],
        'win_rate_a': round(a['win_rate'], 3), 'win_rate_b': round(b['win_rate'], 3),
        'z_stat': round(z_stat, 3), 'p_value': round(p_val, 4),
        'significant': sig,
    })
    print(f"  {a['bucket_key']} vs {b['bucket_key']}: {a['win_rate']:.3f} vs {b['win_rate']:.3f}, z={z_stat:.3f}, p={p_val:.4f} ({sig})")

# =========================================
# Monotonic trend test
# =========================================
print("\n=== Monotonic Trend ===")
win_rates = list(buckets_sorted['win_rate'])
monotonic = all(win_rates[i] <= win_rates[i+1] for i in range(len(win_rates)-1))
print(f"Win rates by bucket: {[round(w,3) for w in win_rates]}")
print(f"Monotonically increasing: {monotonic}")

# =========================================
# Export
# =========================================
bucket_analysis = {
    'chi_square': chi_result,
    'locked_minute_90': locked_90,
    'locked_minute_90_win_rate': round(locked_90_wr, 4) if locked_90 else None,
    'locked_minute_95': locked_95,
    'locked_minute_95_win_rate': round(locked_95_wr, 4) if locked_95 else None,
    'pairwise_tests': pairwise,
    'monotonic_trend': monotonic,
    'win_rates_by_bucket': {row['bucket_key']: round(row['win_rate'], 4) for _, row in buckets_sorted.iterrows()},
}

with open(os.path.join(OUT_DIR, 'bucket_analysis.json'), 'w') as f:
    json.dump(bucket_analysis, f, indent=2)

# Power BI summary
stats_rows = [
    {'test': 'Chi-square (bucket x outcome)', 'statistic': chi2, 'p_value': p_value,
     'result_text': f'Significant association (chi2={chi2:.1f}, p<0.001)' if p_value < 0.001 else f'chi2={chi2:.1f}, p={p_value:.4f}'},
]
if locked_90:
    stats_rows.append({'test': 'Locked minute (90% threshold)', 'statistic': '', 'p_value': '',
                       'result_text': f'{locked_90} bucket: P(W) = {locked_90_wr:.3f}'})
if locked_95:
    stats_rows.append({'test': 'Locked minute (95% threshold)', 'statistic': '', 'p_value': '',
                       'result_text': f'{locked_95} bucket: P(W) = {locked_95_wr:.3f}'})

stats_df = pd.DataFrame(stats_rows)
stats_df.to_csv(os.path.join(PBI_DIR, 'summary_bucket_stats.csv'), index=False)

print(f"\nExported: bucket_analysis.json + summary_bucket_stats.csv")
