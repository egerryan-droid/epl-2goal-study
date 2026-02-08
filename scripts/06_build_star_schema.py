"""Build star schema for Power BI: 4 dimension tables + 2 fact tables."""
import os
import json
import pandas as pd
import numpy as np

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PROC_DIR = os.path.join(PROJ_DIR, 'data', 'processed')
PBI_DIR = os.path.join(PROJ_DIR, 'data', 'powerbi')
SHARED_DIR = os.path.join(PROJ_DIR, 'shared')
os.makedirs(PBI_DIR, exist_ok=True)

# Load inputs
events = pd.read_csv(os.path.join(PROC_DIR, 'plus2_events_joined.csv'))
timeline = pd.read_csv(os.path.join(PROC_DIR, 'goal_timeline.csv'))
with open(os.path.join(SHARED_DIR, 'name_mapping.json'), 'r') as f:
    name_config = json.load(f)
with open(os.path.join(SHARED_DIR, 'schema.json'), 'r') as f:
    schema = json.load(f)

print(f"Loaded: {len(events)} +2 events, {len(timeline)} goals")

# Build variant -> canonical lookup
variant_to_canonical = {}
for canonical, info in name_config['mapping'].items():
    for variant in info['variants']:
        variant_to_canonical[variant.strip()] = canonical
    variant_to_canonical[canonical.strip()] = canonical


def normalize_team(name):
    name = str(name).strip()
    return variant_to_canonical.get(name, name)


# =========================================
# DIMENSION TABLES
# =========================================

# --- dim_season ---
print("\nBuilding dim_season...")
seasons = []
for i, year in enumerate(range(2014, 2024)):
    seasons.append({
        'season_key': f"{year}-{year+1}",
        'season_label': f"{year}/{year+1}",
        'season_short': f"{str(year)[2:]}/{str(year+1)[2:]}",
        'start_year': year,
        'end_year': year + 1,
        'sort_order': i + 1,
    })
dim_season = pd.DataFrame(seasons)
dim_season.to_csv(os.path.join(PBI_DIR, 'dim_season.csv'), index=False)
print(f"  dim_season: {len(dim_season)} rows")

# --- dim_minute_bucket ---
print("Building dim_minute_bucket...")
buckets_def = schema['minute_bucket_definitions']
buckets = []
for key, info in buckets_def.items():
    half = info['half']
    buckets.append({
        'bucket_key': key,
        'bucket_label': key.replace('-', '\u2013'),  # en-dash
        'bucket_order': info['order'],
        'half': half,
        'min_minute': info['min'],
        'max_minute': info['max'],
        'bucket_description': f"{'Early' if info['order'] in [1,4] else 'Mid' if info['order'] in [2,5] else 'Late'} {half.lower()} ({info['min']}-{info['max']} min)",
    })
dim_bucket = pd.DataFrame(buckets).sort_values('bucket_order')
dim_bucket.to_csv(os.path.join(PBI_DIR, 'dim_minute_bucket.csv'), index=False)
print(f"  dim_minute_bucket: {len(dim_bucket)} rows")

# --- dim_team ---
print("Building dim_team...")
# Get all teams appearing in the data
all_teams = set()
all_teams.update(timeline['home_team'].apply(normalize_team).unique())
all_teams.update(timeline['away_team'].apply(normalize_team).unique())

teams = []
for canonical, info in name_config['mapping'].items():
    if canonical in all_teams:
        # Count seasons
        team_seasons_h = timeline[timeline['home_team'].apply(normalize_team) == canonical]['season'].unique()
        team_seasons_a = timeline[timeline['away_team'].apply(normalize_team) == canonical]['season'].unique()
        n_seasons = len(set(team_seasons_h) | set(team_seasons_a))
        teams.append({
            'team_key': canonical,
            'team_display_name': canonical,
            'team_short': info['short'],
            'city': info['city'],
            'seasons_in_sample': n_seasons,
        })

dim_team = pd.DataFrame(teams).sort_values('team_key')
dim_team.to_csv(os.path.join(PBI_DIR, 'dim_team.csv'), index=False)
print(f"  dim_team: {len(dim_team)} rows")

# --- dim_match ---
print("Building dim_match...")
# Get unique matches from timeline
matches_from_timeline = timeline.groupby('match_id').first().reset_index()

# Also need matches with 0 goals — get from events file
# For comprehensive coverage, use all matches from timeline + events
match_data = timeline.groupby('match_id').agg(
    season=('season', 'first'),
    date=('date', 'first'),
    home_team=('home_team', 'first'),
    away_team=('away_team', 'first'),
    final_home_goals=('final_home_goals', 'first'),
    final_away_goals=('final_away_goals', 'first'),
).reset_index()

# We also need matches with 0-0 scores (no goals = not in timeline)
# We'll get those from Football-Data
import glob
fd_files = sorted(glob.glob(os.path.join(PROJ_DIR, 'data', 'raw', 'football_data_*.csv')))

# Map season codes to Understat season years
season_code_to_year = {
    '1415': 2014, '1516': 2015, '1617': 2016, '1718': 2017,
    '1819': 2018, '1920': 2019, '2021': 2020, '2122': 2021,
    '2223': 2022, '2324': 2023
}

# Build comprehensive match list from Football-Data (for 0-0 matches)
from datetime import datetime
fd_matches = []
for f in fd_files:
    code = os.path.basename(f).replace('football_data_', '').replace('.csv', '')
    season_year = season_code_to_year.get(code)
    try:
        df = pd.read_csv(f, encoding='utf-8', on_bad_lines='skip')
    except Exception:
        df = pd.read_csv(f, encoding='latin-1', on_bad_lines='skip')

    for _, row in df.iterrows():
        # Parse date
        date_str = str(row.get('Date', '')).strip()
        parsed_date = None
        for fmt in ('%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d'):
            try:
                parsed_date = datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                break
            except ValueError:
                continue
        if not parsed_date:
            continue

        fd_matches.append({
            'date': parsed_date,
            'home_team': normalize_team(row['HomeTeam']),
            'away_team': normalize_team(row['AwayTeam']),
            'final_home_goals': int(row['FTHG']) if pd.notna(row.get('FTHG')) else None,
            'final_away_goals': int(row['FTAG']) if pd.notna(row.get('FTAG')) else None,
            'season': season_year,
        })

fd_match_df = pd.DataFrame(fd_matches)
fd_match_df = fd_match_df.dropna(subset=['final_home_goals', 'final_away_goals'])
fd_match_df['final_home_goals'] = fd_match_df['final_home_goals'].astype(int)
fd_match_df['final_away_goals'] = fd_match_df['final_away_goals'].astype(int)

# Normalize timeline match data teams
match_data['home_team_norm'] = match_data['home_team'].apply(normalize_team)
match_data['away_team_norm'] = match_data['away_team'].apply(normalize_team)

# Create join keys for merging
match_data['merge_key'] = match_data['date'] + '_' + match_data['home_team_norm'] + '_' + match_data['away_team_norm']
fd_match_df['merge_key'] = fd_match_df['date'] + '_' + fd_match_df['home_team'] + '_' + fd_match_df['away_team']

# Find 0-0 matches only in FD (not in timeline because no goals)
zero_zero = fd_match_df[
    (fd_match_df['final_home_goals'] == 0) & (fd_match_df['final_away_goals'] == 0)
].copy()
# These won't have Understat match_ids, so assign negative IDs
zero_zero_no_overlap = zero_zero[~zero_zero['merge_key'].isin(match_data['merge_key'])]

# For matches that ARE in the timeline, use the Understat match_id
# For 0-0 matches, generate synthetic IDs
synthetic_id_start = -1
synthetic_matches = []
for _, row in zero_zero_no_overlap.iterrows():
    synthetic_matches.append({
        'match_id': synthetic_id_start,
        'season': row['season'],
        'date': row['date'],
        'home_team': row['home_team'],
        'away_team': row['away_team'],
        'home_team_norm': row['home_team'],
        'away_team_norm': row['away_team'],
        'final_home_goals': 0,
        'final_away_goals': 0,
    })
    synthetic_id_start -= 1

if synthetic_matches:
    synthetic_df = pd.DataFrame(synthetic_matches)
    all_matches = pd.concat([match_data, synthetic_df], ignore_index=True)
else:
    all_matches = match_data.copy()

# Ensure team names are normalized
if 'home_team_norm' not in all_matches.columns:
    all_matches['home_team_norm'] = all_matches['home_team'].apply(normalize_team)
if 'away_team_norm' not in all_matches.columns:
    all_matches['away_team_norm'] = all_matches['away_team'].apply(normalize_team)

# Build plus2 match set for had_plus2_event flag
plus2_match_ids = set(events['match_id'].unique())

# Build dim_match
dim_match_rows = []
for _, row in all_matches.iterrows():
    match_date = str(row['date'])
    try:
        dt = pd.to_datetime(match_date)
        match_year = dt.year
        match_month = dt.month
        match_dow = dt.strftime('%A')
    except Exception:
        match_year = None
        match_month = None
        match_dow = None

    fhg = int(row['final_home_goals'])
    fag = int(row['final_away_goals'])
    if fhg > fag:
        ftr = 'H'
    elif fag > fhg:
        ftr = 'A'
    else:
        ftr = 'D'

    season_key = f"{int(row['season'])}-{int(row['season'])+1}"
    home_key = row.get('home_team_norm', normalize_team(row['home_team']))
    away_key = row.get('away_team_norm', normalize_team(row['away_team']))

    dim_match_rows.append({
        'match_key': int(row['match_id']),
        'match_date': match_date,
        'match_year': match_year,
        'match_month': match_month,
        'match_day_of_week': match_dow,
        'season_key': season_key,
        'home_team_key': home_key,
        'away_team_key': away_key,
        'final_home_goals': fhg,
        'final_away_goals': fag,
        'full_time_result': ftr,
        'total_goals': fhg + fag,
        'had_plus2_event': int(row['match_id']) in plus2_match_ids,
        'match_label': f"{home_key} {fhg}-{fag} {away_key} ({match_date})",
    })

dim_match = pd.DataFrame(dim_match_rows).drop_duplicates(subset='match_key')
dim_match.to_csv(os.path.join(PBI_DIR, 'dim_match.csv'), index=False)
print(f"  dim_match: {len(dim_match)} rows ({dim_match['had_plus2_event'].sum()} with +2 events)")

# =========================================
# FACT TABLES
# =========================================

# --- Helper: assign bucket_key ---
def assign_bucket(minute):
    minute = int(minute)
    for key, info in buckets_def.items():
        if info['min'] <= minute <= info['max']:
            return key
    # Overflow: late stoppage time
    if minute > 90:
        return '76-90+'
    if minute > 45 and minute < 46:
        return '31-45+'
    return '76-90+'  # fallback for very late minutes

# --- fact_plus2_events ---
print("\nBuilding fact_plus2_events...")
fact_events = []
for _, row in events.iterrows():
    leader_key = normalize_team(row['leader_team_norm'])
    opponent_key = normalize_team(row['opponent_team_norm'])
    season_key = f"{int(row['season'])}-{int(row['season'])+1}"
    minute = int(row['minute_reached_plus2'])
    bucket = assign_bucket(minute)
    result = row['result_for_leader']

    # Stoppage flag
    stoppage = minute > 45 and minute < 46 or minute > 90

    fact_events.append({
        'event_id': f"{int(row['match_id'])}_{leader_key}",
        'match_key': int(row['match_id']),
        'season_key': season_key,
        'leader_team_key': leader_key,
        'opponent_team_key': opponent_key,
        'bucket_key': bucket,
        'minute_reached_plus2': minute,
        'stoppage_flag': stoppage,
        'leader_is_home': bool(row['leader_is_home']),
        'score_at_event_leader': int(row['score_at_event_leader']),
        'score_at_event_opponent': int(row['score_at_event_opponent']),
        'score_at_event_display': f"{int(row['score_at_event_leader'])}-{int(row['score_at_event_opponent'])}",
        'final_leader_goals': int(row['final_leader_goals']),
        'final_opponent_goals': int(row['final_opponent_goals']),
        'result_for_leader': result,
        'is_win': 1 if result == 'W' else 0,
        'is_draw': 1 if result == 'D' else 0,
        'is_loss': 1 if result == 'L' else 0,
        'points_earned': 3 if result == 'W' else (1 if result == 'D' else 0),
        'points_dropped': 0 if result == 'W' else (2 if result == 'D' else 3),
        'leader_red_cards': row.get('leader_red_cards') if pd.notna(row.get('leader_red_cards')) else None,
        'opponent_red_cards': row.get('opponent_red_cards') if pd.notna(row.get('opponent_red_cards')) else None,
        'leader_prematch_win_odds': row.get('leader_prematch_win_odds') if pd.notna(row.get('leader_prematch_win_odds')) else None,
        'opponent_prematch_win_odds': row.get('opponent_prematch_win_odds') if pd.notna(row.get('opponent_prematch_win_odds')) else None,
        'draw_odds': row.get('draw_odds') if pd.notna(row.get('draw_odds')) else None,
        'leader_implied_prob': row.get('leader_implied_prob') if pd.notna(row.get('leader_implied_prob')) else None,
        'strength_tier': row.get('strength_tier') if pd.notna(row.get('strength_tier')) else None,
    })

fact_plus2 = pd.DataFrame(fact_events)

# Convert int columns properly
for col in ['leader_red_cards', 'opponent_red_cards']:
    fact_plus2[col] = pd.to_numeric(fact_plus2[col], errors='coerce').astype('Int64')

fact_plus2.to_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'), index=False)
print(f"  fact_plus2_events: {len(fact_plus2)} rows")

# --- fact_goal_timeline ---
print("Building fact_goal_timeline...")
# Filter to only matches that have a +2 event
plus2_matches = set(events['match_id'].unique())
tl_filtered = timeline[timeline['match_id'].isin(plus2_matches)].copy()

# Determine is_plus2_moment
plus2_moments = set()
for _, ev in events.iterrows():
    plus2_moments.add((int(ev['match_id']), int(ev['minute_reached_plus2'])))

fact_tl_rows = []
for _, row in tl_filtered.iterrows():
    match_id = int(row['match_id'])
    minute = int(row['minute'])
    scoring_team = normalize_team(row['scoring_team'])
    season_key = f"{int(row['season'])}-{int(row['season'])+1}"
    scoring_side = row['scoring_side']

    # Check if this goal is a +2 moment
    is_plus2 = (match_id, minute) in plus2_moments

    fact_tl_rows.append({
        'goal_id': f"{match_id}_{minute}_{scoring_side}",
        'match_key': match_id,
        'season_key': season_key,
        'scoring_team_key': scoring_team,
        'minute': minute,
        'scoring_side': scoring_side,
        'is_own_goal': bool(row['is_own_goal']),
        'player': row['player'] if pd.notna(row['player']) else None,
        'running_home': int(row['running_home']),
        'running_away': int(row['running_away']),
        'running_diff': int(row['running_diff']),
        'is_plus2_moment': is_plus2,
    })

fact_timeline = pd.DataFrame(fact_tl_rows)

# Handle potential duplicate goal_ids (same minute, same side - rare but possible)
dupes = fact_timeline[fact_timeline.duplicated(subset='goal_id', keep=False)]
if len(dupes) > 0:
    print(f"  WARNING: {len(dupes)} duplicate goal_ids, deduplicating with sequence suffix...")
    # Add sequence number within duplicates
    fact_timeline['seq'] = fact_timeline.groupby('goal_id').cumcount()
    fact_timeline.loc[fact_timeline['seq'] > 0, 'goal_id'] = (
        fact_timeline.loc[fact_timeline['seq'] > 0, 'goal_id'] + '_' +
        fact_timeline.loc[fact_timeline['seq'] > 0, 'seq'].astype(str)
    )
    fact_timeline = fact_timeline.drop(columns='seq')

fact_timeline.to_csv(os.path.join(PBI_DIR, 'fact_goal_timeline.csv'), index=False)
print(f"  fact_goal_timeline: {len(fact_timeline)} rows across {fact_timeline['match_key'].nunique()} matches")

# =========================================
# SUMMARY
# =========================================
print(f"\n{'='*50}")
print("Star Schema Build Complete")
print(f"{'='*50}")
print(f"  dim_season:         {len(dim_season):>6} rows")
print(f"  dim_team:           {len(dim_team):>6} rows")
print(f"  dim_match:          {len(dim_match):>6} rows")
print(f"  dim_minute_bucket:  {len(dim_bucket):>6} rows")
print(f"  fact_plus2_events:  {len(fact_plus2):>6} rows")
print(f"  fact_goal_timeline: {len(fact_timeline):>6} rows")
print(f"\nAll files saved to: {os.path.abspath(PBI_DIR)}")
