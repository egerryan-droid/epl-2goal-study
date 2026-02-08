"""Join control variables (red cards, odds) from Football-Data onto +2 events."""
import os
import json
import glob
import pandas as pd
import numpy as np
from datetime import datetime

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PROC_DIR = os.path.join(PROJ_DIR, 'data', 'processed')
RAW_DIR = os.path.join(PROJ_DIR, 'data', 'raw')
SHARED_DIR = os.path.join(PROJ_DIR, 'shared')

# Load name mapping
with open(os.path.join(SHARED_DIR, 'name_mapping.json'), 'r') as f:
    name_config = json.load(f)

# Build variant -> canonical lookup
variant_to_canonical = {}
for canonical, info in name_config['mapping'].items():
    for variant in info['variants']:
        variant_to_canonical[variant.strip()] = canonical
    # Also map canonical to itself
    variant_to_canonical[canonical.strip()] = canonical


def normalize_team(name):
    """Map a team name to its canonical form."""
    name = str(name).strip()
    return variant_to_canonical.get(name, name)


# Load +2 events
events = pd.read_csv(os.path.join(PROC_DIR, 'plus2_events_raw.csv'))
print(f"Loaded {len(events)} +2 events")

# Normalize team names in events
events['home_team_norm'] = events['home_team'].apply(normalize_team)
events['away_team_norm'] = events['away_team'].apply(normalize_team)
events['leader_team_norm'] = events['leader_team'].apply(normalize_team)
events['opponent_team_norm'] = events['opponent_team'].apply(normalize_team)

# Load and combine Football-Data CSVs
fd_files = sorted(glob.glob(os.path.join(RAW_DIR, 'football_data_*.csv')))
print(f"\nLoading {len(fd_files)} Football-Data files...")

fd_frames = []
for f in fd_files:
    try:
        df = pd.read_csv(f, encoding='utf-8', on_bad_lines='skip')
    except Exception:
        df = pd.read_csv(f, encoding='latin-1', on_bad_lines='skip')
    # Extract season code from filename
    code = os.path.basename(f).replace('football_data_', '').replace('.csv', '')
    df['season_code'] = code
    fd_frames.append(df)
    print(f"  {os.path.basename(f)}: {len(df)} rows, columns: {list(df.columns[:10])}")

fd = pd.concat(fd_frames, ignore_index=True)

# Parse dates - handle multiple formats
def parse_date(d):
    for fmt in ('%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d'):
        try:
            return datetime.strptime(str(d).strip(), fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

fd['date_parsed'] = fd['Date'].apply(parse_date)
fd = fd.dropna(subset=['date_parsed'])

# Normalize Football-Data team names
fd['home_norm'] = fd['HomeTeam'].apply(normalize_team)
fd['away_norm'] = fd['AwayTeam'].apply(normalize_team)

# Check for name mapping failures
fd_teams = set(fd['home_norm'].unique()) | set(fd['away_norm'].unique())
event_teams = set(events['home_team_norm'].unique()) | set(events['away_team_norm'].unique())
unmapped_fd = {t for t in fd_teams if t not in variant_to_canonical.values()}
unmapped_ev = {t for t in event_teams if t not in variant_to_canonical.values()}
if unmapped_fd:
    print(f"\n  WARNING: Unmapped Football-Data teams: {unmapped_fd}")
if unmapped_ev:
    print(f"\n  WARNING: Unmapped Understat teams: {unmapped_ev}")

# Build join key
events['join_key'] = events['date'] + '_' + events['home_team_norm'] + '_' + events['away_team_norm']
fd['join_key'] = fd['date_parsed'] + '_' + fd['home_norm'] + '_' + fd['away_norm']

# Select control columns from Football-Data
# Red cards: HR, AR
# Odds: AvgH, AvgD, AvgA (fallback to B365H, B365D, B365A)
def safe_col(df, primary, fallback=None):
    """Get column with fallback. If primary exists but has NaNs, fill from fallback."""
    if primary in df.columns:
        col = df[primary].copy()
        if fallback and fallback in df.columns:
            col = col.fillna(df[fallback])
        return col
    elif fallback and fallback in df.columns:
        return df[fallback]
    else:
        return pd.Series([np.nan] * len(df), index=df.index)

fd_controls = fd[['join_key']].copy()
fd_controls['home_red'] = safe_col(fd, 'HR')
fd_controls['away_red'] = safe_col(fd, 'AR')
fd_controls['odds_home'] = safe_col(fd, 'AvgH', 'B365H')
fd_controls['odds_draw'] = safe_col(fd, 'AvgD', 'B365D')
fd_controls['odds_away'] = safe_col(fd, 'AvgA', 'B365A')

# Convert to numeric
for col in ['home_red', 'away_red', 'odds_home', 'odds_draw', 'odds_away']:
    fd_controls[col] = pd.to_numeric(fd_controls[col], errors='coerce')

# Drop duplicate join keys (shouldn't happen, but just in case)
fd_controls = fd_controls.drop_duplicates(subset='join_key', keep='first')

# Merge
merged = events.merge(fd_controls, on='join_key', how='left', indicator=True)

# Track join failures
failures = merged[merged['_merge'] == 'left_only'][['match_id', 'date', 'home_team', 'away_team', 'join_key']].copy()
failures.to_csv(os.path.join(PROC_DIR, 'join_failures.csv'), index=False)

join_rate = (merged['_merge'] == 'both').mean()
print(f"\nJoin results: {(merged['_merge']=='both').sum()} matched, {len(failures)} failures ({join_rate:.1%} success)")
merged = merged.drop(columns=['_merge'])

# Map controls to leader/opponent perspective
def map_controls(row):
    if row['leader_is_home']:
        return pd.Series({
            'leader_red_cards': row['home_red'],
            'opponent_red_cards': row['away_red'],
            'leader_prematch_win_odds': row['odds_home'],
            'opponent_prematch_win_odds': row['odds_away'],
            'draw_odds': row['odds_draw'],
        })
    else:
        return pd.Series({
            'leader_red_cards': row['away_red'],
            'opponent_red_cards': row['home_red'],
            'leader_prematch_win_odds': row['odds_away'],
            'opponent_prematch_win_odds': row['odds_home'],
            'draw_odds': row['odds_draw'],
        })

controls = merged.apply(map_controls, axis=1)
merged = pd.concat([merged, controls], axis=1)

# Compute implied probability
merged['leader_implied_prob'] = 1.0 / merged['leader_prematch_win_odds']

# Compute strength tier (terciles)
valid_probs = merged['leader_implied_prob'].dropna()
if len(valid_probs) > 0:
    t1 = valid_probs.quantile(1/3)
    t2 = valid_probs.quantile(2/3)
    merged['strength_tier'] = merged['leader_implied_prob'].apply(
        lambda p: 'Underdog' if pd.isna(p) else (
            'Underdog' if p < t1 else ('Moderate' if p < t2 else 'Strong Favorite')
        )
    )
    merged.loc[merged['leader_implied_prob'].isna(), 'strength_tier'] = np.nan
    print(f"\nStrength tier thresholds: Underdog < {t1:.3f}, Moderate < {t2:.3f}, Strong Favorite >= {t2:.3f}")
else:
    merged['strength_tier'] = np.nan

# Clean up - drop intermediate columns
drop_cols = ['home_team_norm', 'away_team_norm', 'join_key',
             'home_red', 'away_red', 'odds_home', 'odds_draw', 'odds_away']
merged = merged.drop(columns=[c for c in drop_cols if c in merged.columns])

# Save
out_path = os.path.join(PROC_DIR, 'plus2_events_joined.csv')
merged.to_csv(out_path, index=False)
print(f"\nSaved: {len(merged)} events to {os.path.abspath(out_path)}")

# Summary
print(f"\nControl variable coverage:")
for col in ['leader_red_cards', 'leader_prematch_win_odds', 'strength_tier']:
    valid = merged[col].notna().sum()
    pct = valid / len(merged) * 100
    print(f"  {col}: {valid}/{len(merged)} ({pct:.1f}%)")
