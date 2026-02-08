"""Build goal timeline from Understat shot data. Filter to goals, handle own goals, compute running scores."""
import os
import glob
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
os.makedirs(OUT_DIR, exist_ok=True)

# Load all understat shot files
files = sorted(glob.glob(os.path.join(RAW_DIR, 'understat_shots_*.csv')))
print(f"Loading {len(files)} shot files...")
dfs = []
for f in files:
    df = pd.read_csv(f)
    dfs.append(df)
    print(f"  {os.path.basename(f)}: {len(df)} shots")

shots = pd.concat(dfs, ignore_index=True)
print(f"\nTotal shots: {len(shots)}")

# Filter to goals (Goal or OwnGoal)
goals = shots[shots['result'].isin(['Goal', 'OwnGoal'])].copy()
print(f"Goals (incl OwnGoals): {len(goals)}")

# Determine scoring side:
# - For "Goal": scoring_side = h_a (the team that shot)
# - For "OwnGoal": scoring_side = opposite of h_a (credit goes to the other team)
def get_scoring_side(row):
    if row['result'] == 'OwnGoal':
        return 'away' if row['h_a'] == 'h' else 'home'
    else:
        return 'home' if row['h_a'] == 'h' else 'away'

goals['scoring_side'] = goals.apply(get_scoring_side, axis=1)
goals['is_own_goal'] = (goals['result'] == 'OwnGoal')

# Map scoring_team to actual team name
goals['scoring_team'] = goals.apply(
    lambda r: r['home_team'] if r['scoring_side'] == 'home' else r['away_team'], axis=1
)

# Sort by match_id, then minute for running score computation
goals = goals.sort_values(['match_id', 'minute', 'shot_id']).reset_index(drop=True)

# Compute running scores per match
running_home = []
running_away = []
prev_match = None
h_score, a_score = 0, 0

for _, row in goals.iterrows():
    if row['match_id'] != prev_match:
        h_score, a_score = 0, 0
        prev_match = row['match_id']

    if row['scoring_side'] == 'home':
        h_score += 1
    else:
        a_score += 1

    running_home.append(h_score)
    running_away.append(a_score)

goals['running_home'] = running_home
goals['running_away'] = running_away
goals['running_diff'] = goals['running_home'] - goals['running_away']

# Select and rename columns for output
timeline = goals[[
    'match_id', 'season', 'date', 'home_team', 'away_team',
    'minute', 'scoring_side', 'scoring_team', 'player', 'is_own_goal',
    'running_home', 'running_away', 'running_diff',
    'h_goals', 'a_goals'  # final scores for validation
]].copy()

# Rename h_goals/a_goals to final scores
timeline = timeline.rename(columns={'h_goals': 'final_home_goals', 'a_goals': 'final_away_goals'})

out_path = os.path.join(OUT_DIR, 'goal_timeline.csv')
timeline.to_csv(out_path, index=False)
print(f"\nSaved goal timeline: {len(timeline)} goals across {timeline['match_id'].nunique()} matches")
print(f"Output: {os.path.abspath(out_path)}")

# Quick validation
print(f"\nValidation:")
print(f"  Seasons: {sorted(timeline['season'].unique())}")
print(f"  Own goals: {timeline['is_own_goal'].sum()}")
print(f"  Goals per match (mean): {len(timeline) / timeline['match_id'].nunique():.2f}")
