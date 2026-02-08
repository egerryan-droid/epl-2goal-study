"""Pull shot-level data from Understat for 10 EPL seasons via their JSON API."""
import os
import sys
import time
import json
import requests
import pandas as pd

SEASONS = list(range(2014, 2024))  # 2014 = 2014/15 season
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
os.makedirs(OUT_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'X-Requested-With': 'XMLHttpRequest',
}
LEAGUE_URL = "https://understat.com/getLeagueData/EPL/{season}"
MATCH_URL = "https://understat.com/getMatchData/{match_id}"

REQUEST_DELAY = 1.5  # seconds between match requests
MAX_RETRIES = 3


def get_with_retry(url, referer, retries=MAX_RETRIES):
    """GET with exponential backoff."""
    headers = {**HEADERS, 'Referer': referer}
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code == 429:
                wait = 10 * (2 ** attempt)
                print(f"  Rate limited, waiting {wait}s...", flush=True)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            if attempt < retries - 1:
                wait = 5 * (2 ** attempt)
                print(f"  Retry {attempt+1}/{retries} after error: {e}, waiting {wait}s", flush=True)
                time.sleep(wait)
            else:
                raise
    return None


def process_season(season):
    """Pull all shots for one season and save to CSV."""
    out_path = os.path.join(OUT_DIR, f"understat_shots_{season}.csv")
    if os.path.exists(out_path):
        existing = pd.read_csv(out_path)
        print(f"  Already exists with {len(existing)} rows, skipping.")
        return len(existing)

    print(f"  Getting match list...", flush=True)
    referer = f"https://understat.com/league/EPL/{season}"
    league_data = get_with_retry(LEAGUE_URL.format(season=season), referer)
    matches = league_data['dates']
    # Only completed matches
    matches = [m for m in matches if m.get('isResult', False)]
    print(f"  Found {len(matches)} completed matches.", flush=True)

    all_shots = []
    failed_matches = []

    for i, match in enumerate(matches):
        match_id = match['id']
        home_team = match['h']['title']
        away_team = match['a']['title']
        match_date = match['datetime'][:10]
        h_goals = match['goals']['h']
        a_goals = match['goals']['a']

        try:
            match_referer = f"https://understat.com/match/{match_id}"
            match_data = get_with_retry(MATCH_URL.format(match_id=match_id), match_referer)
            shots = match_data['shots']

            for side_key in ('h', 'a'):
                for shot in shots.get(side_key, []):
                    all_shots.append({
                        'match_id': int(match_id),
                        'season': season,
                        'date': match_date,
                        'home_team': home_team,
                        'away_team': away_team,
                        'h_goals': int(h_goals),
                        'a_goals': int(a_goals),
                        'minute': int(shot['minute']),
                        'player': shot.get('player', ''),
                        'player_id': shot.get('player_id', ''),
                        'h_a': shot['h_a'],
                        'result': shot['result'],
                        'xG': float(shot['xG']),
                        'situation': shot.get('situation', ''),
                        'shotType': shot.get('shotType', ''),
                        'shot_id': shot.get('id', ''),
                    })
        except Exception as e:
            print(f"  FAILED match {match_id} ({home_team} vs {away_team}): {e}", flush=True)
            failed_matches.append(match_id)

        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/{len(matches)} matches", flush=True)

        time.sleep(REQUEST_DELAY)

    df = pd.DataFrame(all_shots)
    df.to_csv(out_path, index=False)
    print(f"  Saved {len(df)} shots from {len(matches)} matches ({len(failed_matches)} failures)")
    if failed_matches:
        print(f"  Failed match IDs: {failed_matches}")
    return len(df)


if __name__ == '__main__':
    total = 0
    for season in SEASONS:
        label = f"{season}/{season+1}"
        print(f"\n=== Season {label} (Understat key: {season}) ===", flush=True)
        n = process_season(season)
        total += n

    print(f"\n=== COMPLETE: {total} total shot records across {len(SEASONS)} seasons ===")
