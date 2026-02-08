"""Detect +2 events from goal timeline. First moment each team reaches a 2-goal lead per match."""
import os
import pandas as pd

PROC_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
timeline = pd.read_csv(os.path.join(PROC_DIR, 'goal_timeline.csv'))
print(f"Loaded goal timeline: {len(timeline)} goals, {timeline['match_id'].nunique()} matches")


def detect_plus2(match_goals_df):
    """Detect first +2 events for each team in a match.

    Returns list of event dicts.
    """
    events = []
    home_reached_plus2 = False
    away_reached_plus2 = False

    # Get final scores from the data (should be consistent across rows)
    final_home = int(match_goals_df['final_home_goals'].iloc[0])
    final_away = int(match_goals_df['final_away_goals'].iloc[0])
    match_id = int(match_goals_df['match_id'].iloc[0])
    season = int(match_goals_df['season'].iloc[0])
    date = match_goals_df['date'].iloc[0]
    home_team = match_goals_df['home_team'].iloc[0]
    away_team = match_goals_df['away_team'].iloc[0]

    for _, goal in match_goals_df.iterrows():
        diff = goal['running_diff']  # home - away

        if diff >= 2 and not home_reached_plus2:
            home_reached_plus2 = True
            events.append({
                'match_id': match_id,
                'season': season,
                'date': date,
                'home_team': home_team,
                'away_team': away_team,
                'leader': 'home',
                'leader_team': home_team,
                'opponent_team': away_team,
                'minute_reached_plus2': int(goal['minute']),
                'score_at_event_leader': int(goal['running_home']),
                'score_at_event_opponent': int(goal['running_away']),
                'final_home_goals': final_home,
                'final_away_goals': final_away,
                'final_leader_goals': final_home,
                'final_opponent_goals': final_away,
            })

        elif diff <= -2 and not away_reached_plus2:
            away_reached_plus2 = True
            events.append({
                'match_id': match_id,
                'season': season,
                'date': date,
                'home_team': home_team,
                'away_team': away_team,
                'leader': 'away',
                'leader_team': away_team,
                'opponent_team': home_team,
                'minute_reached_plus2': int(goal['minute']),
                'score_at_event_leader': int(goal['running_away']),
                'score_at_event_opponent': int(goal['running_home']),
                'final_home_goals': final_home,
                'final_away_goals': final_away,
                'final_leader_goals': final_away,
                'final_opponent_goals': final_home,
            })

    # Attach result for leader
    for event in events:
        fl = event['final_leader_goals']
        fo = event['final_opponent_goals']
        if fl > fo:
            event['result_for_leader'] = 'W'
        elif fl == fo:
            event['result_for_leader'] = 'D'
        else:
            event['result_for_leader'] = 'L'

    return events


# Process all matches
all_events = []
for match_id, group in timeline.groupby('match_id'):
    group_sorted = group.sort_values(['minute'])
    events = detect_plus2(group_sorted)
    all_events.extend(events)

events_df = pd.DataFrame(all_events)
print(f"\nDetected {len(events_df)} +2 events across {events_df['match_id'].nunique()} matches")

# Add leader_is_home flag
events_df['leader_is_home'] = (events_df['leader'] == 'home')

# Save
out_path = os.path.join(PROC_DIR, 'plus2_events_raw.csv')
events_df.to_csv(out_path, index=False)
print(f"Saved: {os.path.abspath(out_path)}")

# Summary
print(f"\nSummary:")
print(f"  Total +2 events: {len(events_df)}")
print(f"  Result distribution:")
print(events_df['result_for_leader'].value_counts().to_string())
print(f"  Home leader: {events_df['leader_is_home'].sum()} ({events_df['leader_is_home'].mean():.1%})")
print(f"  Away leader: {(~events_df['leader_is_home']).sum()} ({(~events_df['leader_is_home']).mean():.1%})")
print(f"  Both teams +2 in same match: {len(events_df) - events_df['match_id'].nunique()} cases")
