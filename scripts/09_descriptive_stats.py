"""Descriptive statistics: W/D/L rates, Wilson CIs, breakdowns by season/bucket/team."""
import os
import json
import pandas as pd
import numpy as np
from scipy.stats import norm

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PBI_DIR = os.path.join(PROJ_DIR, 'data', 'powerbi')
OUT_DIR = os.path.join(PROJ_DIR, 'data', 'output')
os.makedirs(OUT_DIR, exist_ok=True)

fact = pd.read_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'))
dim_season = pd.read_csv(os.path.join(PBI_DIR, 'dim_season.csv'))
dim_team = pd.read_csv(os.path.join(PBI_DIR, 'dim_team.csv'))
dim_bucket = pd.read_csv(os.path.join(PBI_DIR, 'dim_minute_bucket.csv'))
print(f"Loaded {len(fact)} +2 events")


def wilson_ci(count, nobs, alpha=0.05):
    """Wilson score confidence interval."""
    if nobs == 0:
        return (0.0, 0.0)
    z = norm.ppf(1 - alpha / 2)
    p = count / nobs
    denom = 1 + z**2 / nobs
    center = (p + z**2 / (2 * nobs)) / denom
    spread = z * np.sqrt(p * (1 - p) / nobs + z**2 / (4 * nobs**2)) / denom
    return (max(0, center - spread), min(1, center + spread))


# =========================================
# Overall stats
# =========================================
n = len(fact)
wins = int(fact['is_win'].sum())
draws = int(fact['is_draw'].sum())
losses = int(fact['is_loss'].sum())
win_rate = wins / n
draw_rate = draws / n
loss_rate = losses / n
win_ci = wilson_ci(wins, n)
draw_ci = wilson_ci(draws, n)
loss_ci = wilson_ci(losses, n)
pts_dropped = int(fact['points_dropped'].sum())
avg_pts_dropped = pts_dropped / n

overall = {
    'n': n,
    'wins': wins, 'draws': draws, 'losses': losses,
    'win_rate': round(win_rate, 4), 'win_ci_low': round(win_ci[0], 4), 'win_ci_high': round(win_ci[1], 4),
    'draw_rate': round(draw_rate, 4), 'draw_ci_low': round(draw_ci[0], 4), 'draw_ci_high': round(draw_ci[1], 4),
    'loss_rate': round(loss_rate, 4), 'loss_ci_low': round(loss_ci[0], 4), 'loss_ci_high': round(loss_ci[1], 4),
    'points_dropped': pts_dropped,
    'avg_points_dropped': round(avg_pts_dropped, 3),
}
print(f"\nOverall: {n} events, Win={win_rate:.1%} [{win_ci[0]:.1%}-{win_ci[1]:.1%}], Draw={draw_rate:.1%}, Loss={loss_rate:.1%}")

# Home vs away
home = fact[fact['leader_is_home']]
away = fact[~fact['leader_is_home']]
home_wr = home['is_win'].mean()
away_wr = away['is_win'].mean()
home_ci = wilson_ci(int(home['is_win'].sum()), len(home))
away_ci = wilson_ci(int(away['is_win'].sum()), len(away))
overall['home_n'] = len(home)
overall['home_win_rate'] = round(home_wr, 4)
overall['home_win_ci_low'] = round(home_ci[0], 4)
overall['home_win_ci_high'] = round(home_ci[1], 4)
overall['away_n'] = len(away)
overall['away_win_rate'] = round(away_wr, 4)
overall['away_win_ci_low'] = round(away_ci[0], 4)
overall['away_win_ci_high'] = round(away_ci[1], 4)
print(f"Home leader: {home_wr:.1%} win rate ({len(home)} events)")
print(f"Away leader: {away_wr:.1%} win rate ({len(away)} events)")

# Most common scores at event
score_counts = fact['score_at_event_display'].value_counts().head(10)
overall['top_scores'] = score_counts.to_dict()

# =========================================
# By bucket
# =========================================
print("\nBy minute bucket:")
bucket_rows = []
for _, b in dim_bucket.sort_values('bucket_order').iterrows():
    bk = b['bucket_key']
    sub = fact[fact['bucket_key'] == bk]
    bn = len(sub)
    bw = int(sub['is_win'].sum())
    bd = int(sub['is_draw'].sum())
    bl = int(sub['is_loss'].sum())
    bwr = bw / bn if bn > 0 else 0
    bci = wilson_ci(bw, bn)
    bpd = int(sub['points_dropped'].sum())
    is_locked_90 = 1 if bwr >= 0.90 else 0
    is_locked_95 = 1 if bwr >= 0.95 else 0
    bucket_rows.append({
        'bucket_key': bk, 'bucket_order': int(b['bucket_order']),
        'n': bn, 'wins': bw, 'draws': bd, 'losses': bl,
        'win_rate': round(bwr, 4), 'win_ci_low': round(bci[0], 4), 'win_ci_high': round(bci[1], 4),
        'draw_rate': round(bd/bn, 4) if bn > 0 else 0,
        'loss_rate': round(bl/bn, 4) if bn > 0 else 0,
        'points_dropped': bpd,
        'is_locked_90': is_locked_90, 'is_locked_95': is_locked_95,
    })
    print(f"  {bk}: n={bn}, win={bwr:.1%} [{bci[0]:.1%}-{bci[1]:.1%}], dropped={bpd}, locked90={'Y' if is_locked_90 else 'N'}")

bucket_df = pd.DataFrame(bucket_rows)

# =========================================
# By season
# =========================================
print("\nBy season:")
season_rows = []
for _, s in dim_season.sort_values('sort_order').iterrows():
    sk = s['season_key']
    sub = fact[fact['season_key'] == sk]
    sn = len(sub)
    sw = int(sub['is_win'].sum())
    sd = int(sub['is_draw'].sum())
    sl = int(sub['is_loss'].sum())
    swr = sw / sn if sn > 0 else 0
    spd = int(sub['points_dropped'].sum())
    season_rows.append({
        'season_key': sk, 'sort_order': int(s['sort_order']),
        'n': sn, 'wins': sw, 'draws': sd, 'losses': sl,
        'win_rate': round(swr, 4), 'points_dropped': spd,
    })
    print(f"  {sk}: n={sn}, win={swr:.1%}, dropped={spd}")

season_df = pd.DataFrame(season_rows)

# =========================================
# By team
# =========================================
print("\nBy team (top 10 by events as leader):")
team_rows = []
for _, t in dim_team.iterrows():
    tk = t['team_key']
    as_leader = fact[fact['leader_team_key'] == tk]
    as_opp = fact[fact['opponent_team_key'] == tk]
    nl = len(as_leader)
    if nl == 0:
        continue
    tw = int(as_leader['is_win'].sum())
    td = int(as_leader['is_draw'].sum())
    tl = int(as_leader['is_loss'].sum())
    twr = tw / nl
    tpd = int(as_leader['points_dropped'].sum())
    no = len(as_opp)
    opp_held = int(as_opp[as_opp['result_for_leader'] != 'W'].shape[0])
    team_rows.append({
        'team_key': tk, 'n_as_leader': nl,
        'wins': tw, 'draws': td, 'losses': tl,
        'win_rate': round(twr, 4), 'points_dropped': tpd,
        'n_as_opponent': no, 'times_opponent_held': opp_held,
    })

team_df = pd.DataFrame(team_rows).sort_values('n_as_leader', ascending=False)
for _, row in team_df.head(10).iterrows():
    print(f"  {row['team_key']}: {row['n_as_leader']} events, win={row['win_rate']:.1%}, dropped={row['points_dropped']}")

# =========================================
# Export
# =========================================
# Full JSON
desc_stats = {
    'overall': overall,
    'by_bucket': bucket_rows,
    'by_season': season_rows,
    'by_team': team_df.to_dict('records'),
}
with open(os.path.join(OUT_DIR, 'descriptive_stats.json'), 'w') as f:
    json.dump(desc_stats, f, indent=2, default=str)

# Power BI summary CSVs
summary_overall = pd.DataFrame([
    {'metric': 'Total +2 Events', 'value': n, 'ci_low': '', 'ci_high': '', 'n': n},
    {'metric': 'Win Rate', 'value': round(win_rate, 4), 'ci_low': round(win_ci[0], 4), 'ci_high': round(win_ci[1], 4), 'n': n},
    {'metric': 'Draw Rate', 'value': round(draw_rate, 4), 'ci_low': round(draw_ci[0], 4), 'ci_high': round(draw_ci[1], 4), 'n': n},
    {'metric': 'Loss Rate', 'value': round(loss_rate, 4), 'ci_low': round(loss_ci[0], 4), 'ci_high': round(loss_ci[1], 4), 'n': n},
    {'metric': 'Total Points Dropped', 'value': pts_dropped, 'ci_low': '', 'ci_high': '', 'n': n},
    {'metric': 'Mean Points Dropped', 'value': round(avg_pts_dropped, 3), 'ci_low': '', 'ci_high': '', 'n': n},
])
summary_overall.to_csv(os.path.join(PBI_DIR, 'summary_overall.csv'), index=False)
bucket_df.to_csv(os.path.join(PBI_DIR, 'summary_by_bucket.csv'), index=False)
season_df.to_csv(os.path.join(PBI_DIR, 'summary_by_season.csv'), index=False)
team_df.to_csv(os.path.join(PBI_DIR, 'summary_by_team.csv'), index=False)

print(f"\nExported: descriptive_stats.json + 4 summary CSVs")
