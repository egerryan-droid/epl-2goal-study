"""Logistic regression: is_win ~ minute + implied_prob + home + red cards."""
import os
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PBI_DIR = os.path.join(PROJ_DIR, 'data', 'powerbi')
OUT_DIR = os.path.join(PROJ_DIR, 'data', 'output')

fact = pd.read_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'))
print(f"Loaded {len(fact)} events")

# Check odds coverage
odds_coverage = fact['leader_implied_prob'].notna().mean()
print(f"Odds coverage: {odds_coverage:.1%}")

if odds_coverage < 0.80:
    print("WARNING: Odds coverage below 80%, regression may be unreliable.")
    # Still run it but note the limitation

# Prepare data - drop rows with missing IVs
ivs = ['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home']
reg_data = fact[['is_win'] + ivs + ['leader_red_cards', 'opponent_red_cards']].copy()

# Convert booleans to int
reg_data['leader_is_home'] = reg_data['leader_is_home'].astype(int)

# Drop NAs on core variables
reg_core = reg_data.dropna(subset=['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home'])
print(f"Regression sample (core): {len(reg_core)} events")

# Model 1: Core model
X = reg_core[['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home']].copy()
X = sm.add_constant(X)
y = reg_core['is_win']

model = sm.Logit(y, X).fit(disp=0)
print(f"\n=== Logistic Regression Results ===")
print(model.summary())

# Model 2: With red cards (if available)
reg_full = reg_data.dropna()
if len(reg_full) > len(reg_core) * 0.8:
    X_full = reg_full[['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home',
                        'leader_red_cards', 'opponent_red_cards']].copy()
    X_full = sm.add_constant(X_full)
    y_full = reg_full['is_win']
    model_full = sm.Logit(y_full, X_full).fit(disp=0)
    print(f"\n=== Full Model (with red cards) ===")
    print(model_full.summary())
    use_model = model_full
    used_vars = ['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home', 'leader_red_cards', 'opponent_red_cards']
else:
    print(f"\nFull model skipped (insufficient red card data: {len(reg_full)}/{len(reg_core)})")
    use_model = model
    used_vars = ['minute_reached_plus2', 'leader_implied_prob', 'leader_is_home']

# Extract results
results = {
    'model': 'Logistic Regression',
    'dv': 'is_win',
    'n': int(use_model.nobs),
    'pseudo_r2': round(use_model.prsquared, 4),
    'aic': round(use_model.aic, 1),
    'bic': round(use_model.bic, 1),
    'log_likelihood': round(use_model.llf, 1),
    'coefficients': {},
}

for var in ['const'] + used_vars:
    coef = use_model.params[var]
    se = use_model.bse[var]
    p = use_model.pvalues[var]
    ci = use_model.conf_int().loc[var]
    results['coefficients'][var] = {
        'coefficient': round(float(coef), 4),
        'odds_ratio': round(float(np.exp(coef)), 4),
        'std_error': round(float(se), 4),
        'p_value': round(float(p), 4),
        'ci_low': round(float(ci[0]), 4),
        'ci_high': round(float(ci[1]), 4),
        'significant': 'Yes' if p < 0.05 else 'No',
    }

with open(os.path.join(OUT_DIR, 'regression_results.json'), 'w') as f:
    json.dump(results, f, indent=2)

# Power BI summary
reg_rows = []
for var in ['const'] + used_vars:
    c = results['coefficients'][var]
    reg_rows.append({
        'variable': var,
        'coefficient': c['coefficient'],
        'odds_ratio': c['odds_ratio'],
        'p_value': c['p_value'],
        'ci_low': c['ci_low'],
        'ci_high': c['ci_high'],
        'significant': c['significant'],
    })

reg_df = pd.DataFrame(reg_rows)
reg_df.to_csv(os.path.join(PBI_DIR, 'summary_regression.csv'), index=False)

print(f"\nExported: regression_results.json + summary_regression.csv")
print(f"Pseudo R²: {results['pseudo_r2']}")
print(f"Key findings:")
for var in used_vars:
    c = results['coefficients'][var]
    print(f"  {var}: OR={c['odds_ratio']}, p={c['p_value']} ({c['significant']})")
