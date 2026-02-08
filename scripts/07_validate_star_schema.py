"""Validate star schema integrity before handoff to QA agent."""
import os
import sys
import pandas as pd

PBI_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'powerbi')
errors = []
warnings = []


def check(condition, msg, severity='ERROR'):
    if not condition:
        if severity == 'ERROR':
            errors.append(msg)
            print(f"  FAIL: {msg}")
        else:
            warnings.append(msg)
            print(f"  WARN: {msg}")
    else:
        print(f"  PASS: {msg}")


# Load all tables
print("Loading star schema tables...")
try:
    dim_season = pd.read_csv(os.path.join(PBI_DIR, 'dim_season.csv'))
    dim_team = pd.read_csv(os.path.join(PBI_DIR, 'dim_team.csv'))
    dim_match = pd.read_csv(os.path.join(PBI_DIR, 'dim_match.csv'))
    dim_bucket = pd.read_csv(os.path.join(PBI_DIR, 'dim_minute_bucket.csv'))
    fact_plus2 = pd.read_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'))
    fact_tl = pd.read_csv(os.path.join(PBI_DIR, 'fact_goal_timeline.csv'))
    print("  All 6 files loaded successfully.\n")
except Exception as e:
    print(f"  FATAL: Could not load files: {e}")
    sys.exit(1)

# =========================================
# 1. Row Counts
# =========================================
print("=== ROW COUNTS ===")
check(len(dim_season) == 10, f"dim_season has {len(dim_season)} rows (expected 10)")
check(len(dim_bucket) == 6, f"dim_minute_bucket has {len(dim_bucket)} rows (expected 6)")
check(30 <= len(dim_team) <= 40, f"dim_team has {len(dim_team)} rows (expected 30-35)")
check(3000 <= len(dim_match) <= 4500, f"dim_match has {len(dim_match)} rows (expected ~3800)")
check(1200 <= len(fact_plus2) <= 2500, f"fact_plus2_events has {len(fact_plus2)} rows (expected 1500-2100)")
check(len(fact_tl) > 0, f"fact_goal_timeline has {len(fact_tl)} rows")

# =========================================
# 2. Primary Key Uniqueness
# =========================================
print("\n=== PRIMARY KEY UNIQUENESS ===")
check(dim_season['season_key'].is_unique, "dim_season.season_key is unique")
check(dim_team['team_key'].is_unique, "dim_team.team_key is unique")
check(dim_match['match_key'].is_unique, "dim_match.match_key is unique")
check(dim_bucket['bucket_key'].is_unique, "dim_minute_bucket.bucket_key is unique")
check(fact_plus2['event_id'].is_unique, "fact_plus2_events.event_id is unique")
check(fact_tl['goal_id'].is_unique, "fact_goal_timeline.goal_id is unique")

# =========================================
# 3. Foreign Key Integrity
# =========================================
print("\n=== FOREIGN KEY INTEGRITY ===")
season_keys = set(dim_season['season_key'])
team_keys = set(dim_team['team_key'])
match_keys = set(dim_match['match_key'])
bucket_keys = set(dim_bucket['bucket_key'])

# fact_plus2_events FKs
orphan_match = set(fact_plus2['match_key']) - match_keys
orphan_season = set(fact_plus2['season_key']) - season_keys
orphan_leader = set(fact_plus2['leader_team_key']) - team_keys
orphan_opponent = set(fact_plus2['opponent_team_key']) - team_keys
orphan_bucket = set(fact_plus2['bucket_key']) - bucket_keys

check(len(orphan_match) == 0, f"fact_plus2.match_key -> dim_match ({len(orphan_match)} orphans: {list(orphan_match)[:5]})")
check(len(orphan_season) == 0, f"fact_plus2.season_key -> dim_season ({len(orphan_season)} orphans: {list(orphan_season)[:5]})")
check(len(orphan_leader) == 0, f"fact_plus2.leader_team_key -> dim_team ({len(orphan_leader)} orphans: {list(orphan_leader)[:5]})")
check(len(orphan_opponent) == 0, f"fact_plus2.opponent_team_key -> dim_team ({len(orphan_opponent)} orphans: {list(orphan_opponent)[:5]})")
check(len(orphan_bucket) == 0, f"fact_plus2.bucket_key -> dim_minute_bucket ({len(orphan_bucket)} orphans: {list(orphan_bucket)[:5]})")

# fact_goal_timeline FKs
orphan_tl_match = set(fact_tl['match_key']) - match_keys
orphan_tl_season = set(fact_tl['season_key']) - season_keys
orphan_tl_team = set(fact_tl['scoring_team_key']) - team_keys

check(len(orphan_tl_match) == 0, f"fact_timeline.match_key -> dim_match ({len(orphan_tl_match)} orphans: {list(orphan_tl_match)[:5]})")
check(len(orphan_tl_season) == 0, f"fact_timeline.season_key -> dim_season ({len(orphan_tl_season)} orphans: {list(orphan_tl_season)[:5]})")
check(len(orphan_tl_team) == 0, f"fact_timeline.scoring_team_key -> dim_team ({len(orphan_tl_team)} orphans: {list(orphan_tl_team)[:5]})")

# dim_match FKs
orphan_dm_season = set(dim_match['season_key']) - season_keys
orphan_dm_home = set(dim_match['home_team_key']) - team_keys
orphan_dm_away = set(dim_match['away_team_key']) - team_keys

check(len(orphan_dm_season) == 0, f"dim_match.season_key -> dim_season ({len(orphan_dm_season)} orphans)")
check(len(orphan_dm_home) == 0, f"dim_match.home_team_key -> dim_team ({len(orphan_dm_home)} orphans: {list(orphan_dm_home)[:5]})")
check(len(orphan_dm_away) == 0, f"dim_match.away_team_key -> dim_team ({len(orphan_dm_away)} orphans: {list(orphan_dm_away)[:5]})")

# =========================================
# 4. Business Logic Checks
# =========================================
print("\n=== BUSINESS LOGIC ===")

# is_win + is_draw + is_loss = 1
wdl_sum = fact_plus2['is_win'] + fact_plus2['is_draw'] + fact_plus2['is_loss']
check((wdl_sum == 1).all(), f"is_win + is_draw + is_loss = 1 for all rows ({(wdl_sum != 1).sum()} violations)")

# points_earned + points_dropped = 3
pts_sum = fact_plus2['points_earned'] + fact_plus2['points_dropped']
check((pts_sum == 3).all(), f"points_earned + points_dropped = 3 for all rows ({(pts_sum != 3).sum()} violations)")

# result_for_leader matches is_win/draw/loss
win_match = (fact_plus2['result_for_leader'] == 'W') == (fact_plus2['is_win'] == 1)
draw_match = (fact_plus2['result_for_leader'] == 'D') == (fact_plus2['is_draw'] == 1)
loss_match = (fact_plus2['result_for_leader'] == 'L') == (fact_plus2['is_loss'] == 1)
check(win_match.all() and draw_match.all() and loss_match.all(), "result_for_leader matches is_win/is_draw/is_loss")

# leader_team_key != opponent_team_key
check((fact_plus2['leader_team_key'] != fact_plus2['opponent_team_key']).all(), "leader != opponent for all events")

# Minute within bucket range
bucket_ranges = dict(zip(dim_bucket['bucket_key'], zip(dim_bucket['min_minute'], dim_bucket['max_minute'])))
minute_ok = True
for _, row in fact_plus2.iterrows():
    bk = row['bucket_key']
    m = row['minute_reached_plus2']
    if bk in bucket_ranges:
        lo, hi = bucket_ranges[bk]
        if not (lo <= m <= hi):
            minute_ok = False
            break
check(minute_ok, "All minutes fall within their bucket range")

# dim_match: home != away
check((dim_match['home_team_key'] != dim_match['away_team_key']).all(), "home != away in dim_match")

# dim_match: FTR derived correctly
ftr_check = dim_match.apply(
    lambda r: (r['full_time_result'] == 'H' and r['final_home_goals'] > r['final_away_goals']) or
              (r['full_time_result'] == 'A' and r['final_away_goals'] > r['final_home_goals']) or
              (r['full_time_result'] == 'D' and r['final_home_goals'] == r['final_away_goals']),
    axis=1
)
check(ftr_check.all(), f"full_time_result matches goals ({(~ftr_check).sum()} violations)")

# total_goals = home + away
check((dim_match['total_goals'] == dim_match['final_home_goals'] + dim_match['final_away_goals']).all(), "total_goals = home + away")

# =========================================
# 5. Data Quality
# =========================================
print("\n=== DATA QUALITY ===")

# No trailing whitespace in key columns
for name, df, cols in [
    ('fact_plus2', fact_plus2, ['event_id', 'season_key', 'leader_team_key', 'opponent_team_key', 'bucket_key']),
    ('fact_tl', fact_tl, ['goal_id', 'season_key', 'scoring_team_key']),
    ('dim_season', dim_season, ['season_key']),
    ('dim_team', dim_team, ['team_key', 'team_short']),
    ('dim_match', dim_match, ['season_key', 'home_team_key', 'away_team_key']),
    ('dim_bucket', dim_bucket, ['bucket_key']),
]:
    for col in cols:
        if col in df.columns:
            has_ws = df[col].astype(str).str.contains(r'\s+$', regex=True).any()
            check(not has_ws, f"No trailing whitespace in {name}.{col}")

# season_key format check
sk_pattern = fact_plus2['season_key'].str.match(r'^\d{4}-\d{4}$')
check(sk_pattern.all(), f"season_key format YYYY-YYYY ({(~sk_pattern).sum()} violations)")

# Date format check
date_pattern = dim_match['match_date'].str.match(r'^\d{4}-\d{2}-\d{2}$')
check(date_pattern.all(), f"match_date format YYYY-MM-DD ({(~date_pattern).sum()} violations)")

# =========================================
# 6. Distribution Sanity
# =========================================
print("\n=== DISTRIBUTIONS ===")
win_rate = fact_plus2['is_win'].mean()
check(0.80 <= win_rate <= 0.95, f"Win rate: {win_rate:.3f} (expected 0.85-0.92)", severity='WARN' if 0.80 <= win_rate <= 0.95 else 'ERROR')

plus2_rate = dim_match['had_plus2_event'].sum() / len(dim_match)
check(0.35 <= plus2_rate <= 0.60, f"+2 event rate: {plus2_rate:.3f} (expected 0.40-0.55)", severity='WARN')

home_leader_rate = fact_plus2['leader_is_home'].mean()
check(0.45 <= home_leader_rate <= 0.70, f"Home leader share: {home_leader_rate:.3f} (expected 0.50-0.65)")

# Per-season event counts
season_counts = fact_plus2.groupby('season_key').size()
print(f"\n  Events per season:")
for s, n in season_counts.items():
    flag = " <<<" if n < 120 or n > 240 else ""
    print(f"    {s}: {n}{flag}")

# =========================================
# SUMMARY
# =========================================
print(f"\n{'='*50}")
print(f"VALIDATION SUMMARY")
print(f"{'='*50}")
print(f"  Errors:   {len(errors)}")
print(f"  Warnings: {len(warnings)}")

if errors:
    print(f"\n  ERRORS:")
    for e in errors:
        print(f"    - {e}")
if warnings:
    print(f"\n  WARNINGS:")
    for w in warnings:
        print(f"    - {w}")

if not errors:
    print(f"\n  RESULT: PASS {'(with warnings)' if warnings else ''}")
    print("  Star schema is ready for handoff to QA agent.")
else:
    print(f"\n  RESULT: FAIL")
    print("  Fix errors before proceeding.")
    sys.exit(1)
