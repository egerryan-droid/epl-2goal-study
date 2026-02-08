"""Retry failed match IDs for the 2021/22 season."""
import os
import time
import json
import requests
import pandas as pd

FAILED_IDS = ['16492', '16494', '16495', '16489', '16490', '16493', '16496', '16501', '16503', '16505', '16498', '16497', '16502', '16504', '16500', '16513', '16508', '16509', '16510', '16511', '16514', '16506', '16507', '16515', '16512', '16524', '16520', '16521', '16525', '16523', '16518', '16519', '16522', '16516', '16517', '16527', '16534', '16526', '16530', '16533', '16535', '16529', '16532', '16531', '16541', '16545', '16538', '16542', '16536', '16543', '16544', '16548', '16555', '16550', '16552', '16560', '16562', '16563', '16564', '16556', '16557', '16561', '16569', '16570', '16575', '16573', '16568', '16567', '16574', '16576', '16585', '16579', '16577', '16580', '16581']

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'understat_shots_2021.csv')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'X-Requested-With': 'XMLHttpRequest',
}
MATCH_URL = "https://understat.com/getMatchData/{match_id}"

# Load existing data
existing = pd.read_csv(OUT_PATH)
existing_match_ids = set(existing['match_id'].unique())
print(f"Existing: {len(existing)} shots from {len(existing_match_ids)} matches")

# Get match info for each failed match
new_shots = []
still_failed = []

for i, match_id in enumerate(FAILED_IDS):
    if int(match_id) in existing_match_ids:
        print(f"  {match_id}: already in data, skip")
        continue

    print(f"  [{i+1}/{len(FAILED_IDS)}] Match {match_id}... ", end="", flush=True)
    for attempt in range(5):
        try:
            url = MATCH_URL.format(match_id=match_id)
            resp = requests.get(url, headers={**HEADERS, 'Referer': f'https://understat.com/match/{match_id}'}, timeout=60)
            if resp.status_code == 429:
                wait = 15 * (2 ** attempt)
                print(f"429, wait {wait}s ", end="", flush=True)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()

            # Get match info from first shot or from match page
            match_info_url = f'https://understat.com/match/{match_id}'
            import re
            info_resp = requests.get(match_info_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
            m = re.search(r"JSON\.parse\('(.*?)'\)", info_resp.text)
            if m:
                info = json.loads(m.group(1).encode().decode('unicode_escape'))
                home_team = info.get('team_h', '')
                away_team = info.get('team_a', '')
                date = info.get('date', '')[:10]
                h_goals = int(info.get('h_goals', 0))
                a_goals = int(info.get('a_goals', 0))
            else:
                home_team = away_team = date = ''
                h_goals = a_goals = 0

            shots = data['shots']
            for side_key in ('h', 'a'):
                for shot in shots.get(side_key, []):
                    new_shots.append({
                        'match_id': int(match_id),
                        'season': 2021,
                        'date': date,
                        'home_team': home_team,
                        'away_team': away_team,
                        'h_goals': h_goals,
                        'a_goals': a_goals,
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
            print(f"OK ({len(shots.get('h',[]))+len(shots.get('a',[]))} shots)")
            break
        except Exception as e:
            if attempt < 4:
                wait = 10 * (2 ** attempt)
                print(f"err, wait {wait}s ", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"FAILED: {e}")
                still_failed.append(match_id)

    time.sleep(2)

if new_shots:
    new_df = pd.DataFrame(new_shots)
    combined = pd.concat([existing, new_df], ignore_index=True)
    combined.to_csv(OUT_PATH, index=False)
    print(f"\nAdded {len(new_df)} shots from {len(FAILED_IDS) - len(still_failed)} retried matches")
    print(f"New total: {len(combined)} shots")
else:
    print("\nNo new shots retrieved")

if still_failed:
    print(f"Still failed: {still_failed}")
else:
    print("All retries successful!")
