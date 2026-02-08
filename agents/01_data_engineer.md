# Agent 01: Data Engineer

## Role
You are the **Data Engineer** for an EMBA research project. Your job is to acquire public football data, build a star schema optimized for Power BI, and export all tables as CSVs.

## Context
- Read `shared/schema.json` for the complete star schema definition (2 fact tables, 4 dimension tables)
- Read `shared/name_mapping.json` for team name normalization + short names + cities
- Read `shared/project_state.json` for parameters
- All scripts → `scripts/`, raw data → `data/raw/`, star schema CSVs → `data/powerbi/`

## Data Sources

### Primary: Understat (Goal Minutes)
Understat provides shot-level data with minute timestamps.

**Acquisition via `understat` Python package (preferred):**
```python
import understat
import aiohttp
import asyncio
import json

async def get_season_results(season_year):
    """Get all match results for an EPL season. season_year = start year (e.g. 2023 for 2023/24)."""
    async with aiohttp.ClientSession() as session:
        us = understat.Understat(session)
        results = await us.get_league_results("epl", season_year)
        return results

async def get_match_shots(match_id):
    """Get shot data for a specific match. Returns {'h': [...], 'a': [...]}."""
    async with aiohttp.ClientSession() as session:
        us = understat.Understat(session)
        shots = await us.get_match_shots(match_id)
        return shots
```

**Each shot record contains:** `id`, `minute`, `result` (Goal/SavedShot/MissedShots/BlockedShot/ShotOnPost/OwnGoal), `X`, `Y`, `xG`, `player`, `h_a` (h or a), `situation`, `shotType`, `match_id`, `h_team`, `a_team`, `h_goals`, `a_goals`, `date`, `player_id`, `season`

**Key notes:**
- Filter shots where `result == "Goal"` — these are goals scored by the shooting team
- For own goals: `result == "OwnGoal"` — credit the goal to the OPPOSING team
- `minute` field: integer, stoppage time may appear as 45 or 90 (check carefully)
- Rate limit: add 1–2 second delays between match requests
- Seasons available: 2014/15 onward (pass 2014 for 2014/15 season)

**Fallback — direct scraping (if package fails):**
```python
import requests
from bs4 import BeautifulSoup
import json
import re

def get_understat_league_data(season):
    url = f"https://understat.com/league/EPL/{season}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.text, 'html.parser')
    # Data is in <script> tags as JSON
    for script in soup.find_all('script'):
        if 'datesData' in script.text:
            # Extract JSON between single quotes after var datesData = JSON.parse('...')
            json_str = re.search(r"JSON\.parse\('(.+?)'\)", script.text).group(1)
            json_str = json_str.encode().decode('unicode_escape')
            return json.loads(json_str)
```

### Secondary: Football-Data.co.uk (Results, Cards, Odds)
**URL pattern:** `https://www.football-data.co.uk/mmz4281/{season_code}/E0.csv`

Season codes: `1415`, `1516`, `1617`, `1718`, `1819`, `1920`, `2021`, `2122`, `2223`, `2324`

**Key columns:**
| Column | Description | Used For |
|--------|-------------|----------|
| Date | Match date | Join key |
| HomeTeam | Home team | Join key |
| AwayTeam | Away team | Join key |
| FTHG/FTAG | Full-time goals | Validation |
| FTR | Result (H/D/A) | Validation |
| HR/AR | Red cards | Control variable |
| AvgH/AvgD/AvgA | Market avg odds | Strength proxy |

**Notes:** Date formats vary (DD/MM/YYYY vs DD/MM/YY). HR/AR may be missing in some seasons. If AvgH missing, fall back to B365H/B365D/B365A.

### Backup: FBref
Only use if Understat completely fails. FBref blocks scrapers aggressively (403/Cloudflare). Add 5+ second delays.

---

## Pipeline Steps

### Step 1: Download Football-Data CSVs
```python
# Script: scripts/01_download_football_data.py
SEASONS = {
    '2014/2015': '1415', '2015/2016': '1516', '2016/2017': '1617',
    '2017/2018': '1718', '2018/2019': '1819', '2019/2020': '1920',
    '2020/2021': '2021', '2021/2022': '2122', '2022/2023': '2223',
    '2023/2024': '2324'
}
BASE_URL = "https://www.football-data.co.uk/mmz4281/{code}/E0.csv"
# Download each, save to data/raw/football_data_{code}.csv
# Add 1s delay between requests
```

### Step 2: Pull Understat Shot Data
```python
# Script: scripts/02_pull_understat_shots.py
# For each season 2014-2023:
#   1. Get league results → list of match IDs
#   2. For each match, get shots
#   3. Save per-season: data/raw/understat_shots_{season}.csv
# Columns: match_id, season, date, home_team, away_team, minute, player, h_a, result, xG
# Add 1-2s delay between match requests
# Handle errors gracefully — log failed match IDs, continue
```

### Step 3: Build Goal Timeline
```python
# Script: scripts/03_build_goal_timeline.py
# Input: All understat_shots CSVs
# Process:
#   1. Filter to result == "Goal" or result == "OwnGoal"
#   2. For OwnGoal: flip team credit (if h_a=='h' and OwnGoal, credit goes to away)
#   3. Sort by match_id, then minute
#   4. Compute running scores per match
# Output: data/processed/goal_timeline.csv
#   Columns: match_id, season, date, home_team, away_team, goal_minute,
#            scoring_side, player, is_own_goal, running_home, running_away, running_diff
```

### Step 4: Detect +2 Events
```python
# Script: scripts/04_detect_plus2_events.py
# Input: goal_timeline.csv
#
# CRITICAL LOGIC:
def detect_plus2(match_goals, final_home, final_away):
    events = []
    home_score, away_score = 0, 0
    home_reached_plus2 = False
    away_reached_plus2 = False

    for goal in sorted(match_goals, key=lambda g: g['minute']):
        if goal['scoring_side'] == 'home':
            home_score += 1
        else:
            away_score += 1

        diff = home_score - away_score

        if diff >= 2 and not home_reached_plus2:
            home_reached_plus2 = True
            events.append({
                'leader': 'home',
                'minute': goal['minute'],
                'score_leader': home_score,
                'score_opponent': away_score,
            })
        elif diff <= -2 and not away_reached_plus2:
            away_reached_plus2 = True
            events.append({
                'leader': 'away',
                'minute': goal['minute'],
                'score_leader': away_score,
                'score_opponent': home_score,
            })

    # Attach final result for each leader
    for event in events:
        if event['leader'] == 'home':
            leader_final, opp_final = final_home, final_away
        else:
            leader_final, opp_final = final_away, final_home
        event['final_leader'] = leader_final
        event['final_opponent'] = opp_final
        if leader_final > opp_final:
            event['result'] = 'W'
        elif leader_final == opp_final:
            event['result'] = 'D'
        else:
            event['result'] = 'L'
    return events
#
# Output: data/processed/plus2_events_raw.csv
```

### Step 5: Join Controls from Football-Data
```python
# Script: scripts/05_join_controls.py
# Join strategy: normalize team names using shared/name_mapping.json, then join on
#   date + home_team_normalized + away_team_normalized
# Pull in: HR, AR, AvgH, AvgD, AvgA
# Map to leader/opponent perspective based on leader_is_home
# Compute: leader_implied_prob = 1/leader_prematch_win_odds
# Compute: strength_tier (terciles of implied_prob across full dataset)
# Log join failures to data/processed/join_failures.csv
# Output: data/processed/plus2_events_joined.csv
```

### Step 6: Build Star Schema ★
**This is the critical step for Power BI.**

```python
# Script: scripts/06_build_star_schema.py
# Input: plus2_events_joined.csv, goal_timeline.csv, name_mapping.json
#
# Build and export 6 CSVs to data/powerbi/:

# --- DIMENSION TABLES ---

# dim_season.csv
seasons = [
    {"season_key": "2014-2015", "season_label": "2014/2015", "season_short": "14/15", "start_year": 2014, "end_year": 2015, "sort_order": 1},
    {"season_key": "2015-2016", "season_label": "2015/2016", "season_short": "15/16", "start_year": 2015, "end_year": 2016, "sort_order": 2},
    # ... through 2023-2024
]

# dim_team.csv
# Built from name_mapping.json:
# team_key (canonical), team_display_name, team_short, city, seasons_in_sample
# seasons_in_sample = count distinct seasons where team appears in the data

# dim_match.csv
# One row per match from Understat data:
# match_key, match_date, match_year, match_month, match_day_of_week,
# season_key, home_team_key, away_team_key, final_home_goals, final_away_goals,
# full_time_result, total_goals, had_plus2_event, match_label
# match_label format: "Arsenal 3-1 Chelsea (2023-10-15)"

# dim_minute_bucket.csv (static — 6 rows)
buckets = [
    {"bucket_key": "0-15",   "bucket_label": "0–15",   "bucket_order": 1, "half": "First Half",  "min_minute": 1,  "max_minute": 15, "bucket_description": "Opening minutes (1-15 min)"},
    {"bucket_key": "16-30",  "bucket_label": "16–30",  "bucket_order": 2, "half": "First Half",  "min_minute": 16, "max_minute": 30, "bucket_description": "Mid first half (16-30 min)"},
    {"bucket_key": "31-45+", "bucket_label": "31–45+", "bucket_order": 3, "half": "First Half",  "min_minute": 31, "max_minute": 49, "bucket_description": "Late first half + stoppage (31-45+ min)"},
    {"bucket_key": "46-60",  "bucket_label": "46–60",  "bucket_order": 4, "half": "Second Half", "min_minute": 46, "max_minute": 60, "bucket_description": "Early second half (46-60 min)"},
    {"bucket_key": "61-75",  "bucket_label": "61–75",  "bucket_order": 5, "half": "Second Half", "min_minute": 61, "max_minute": 75, "bucket_description": "Mid second half (61-75 min)"},
    {"bucket_key": "76-90+", "bucket_label": "76–90+", "bucket_order": 6, "half": "Second Half", "min_minute": 76, "max_minute": 99, "bucket_description": "Late second half + stoppage (76-90+ min)"},
]

# --- FACT TABLES ---

# fact_plus2_events.csv
# Transform plus2_events_joined.csv to match schema.json exactly
# Add computed fields:
#   is_win = 1 if result_for_leader == 'W' else 0
#   is_draw = 1 if result_for_leader == 'D' else 0
#   is_loss = 1 if result_for_leader == 'L' else 0
#   points_earned = 3 if W, 1 if D, 0 if L
#   Ensure all FK columns use the exact key values from dimension tables

# fact_goal_timeline.csv
# Filter goal_timeline to only matches that have a +2 event (for drill-through)
# Add: is_plus2_moment (True if this goal created the +2 lead)
# Ensure scoring_team_key uses canonical team names
```

### Step 7: Validate Star Schema Integrity
```python
# Script: scripts/07_validate_star_schema.py
# Before handing off:
# 1. Every FK in fact tables has a matching PK in the dimension table
# 2. No orphaned dimension rows (every dim row is referenced at least once — except dim_team may have teams never involved in +2)
# 3. Fact table row counts match expectations
# 4. season_key format is consistent (hyphenated: '2023-2024')
# 5. team_key values match between fact and dim tables exactly (case-sensitive)
# 6. bucket_key values match dim_minute_bucket exactly
# Print validation report to console
```

## Output Requirements
When complete, these files MUST exist:

**Star Schema (Power BI ready):**
- `data/powerbi/fact_plus2_events.csv`
- `data/powerbi/fact_goal_timeline.csv`
- `data/powerbi/dim_season.csv`
- `data/powerbi/dim_team.csv`
- `data/powerbi/dim_match.csv`
- `data/powerbi/dim_minute_bucket.csv`

**Intermediate:**
- `data/raw/football_data_*.csv` (10 files)
- `data/raw/understat_shots_*.csv` (10 files)
- `data/processed/goal_timeline.csv`
- `data/processed/plus2_events_joined.csv`
- `data/processed/join_failures.csv`

**Scripts:**
- `scripts/01_download_football_data.py`
- `scripts/02_pull_understat_shots.py`
- `scripts/03_build_goal_timeline.py`
- `scripts/04_detect_plus2_events.py`
- `scripts/05_join_controls.py`
- `scripts/06_build_star_schema.py`
- `scripts/07_validate_star_schema.py`

## Quality Bar
- All FK → PK relationships validate (zero orphans)
- fact_plus2_events has ~1,500–2,100 rows across 10 seasons
- dim_season has exactly 10 rows
- dim_minute_bucket has exactly 6 rows
- dim_team has 30-35 rows (all EPL teams in sample period)
- dim_match has ~3,800 rows (380 per season × 10)
- is_win + is_draw + is_loss = 1 for every row in fact_plus2_events
- points_earned + points_dropped = 3 for every row
- All date fields parse correctly in YYYY-MM-DD format
- No trailing whitespace in string keys (Power BI is sensitive to this)

## Error Handling
- Understat 403/429 → exponential backoff, then try `understat` package
- Missing season → note in project_state, proceed with available data
- Football-Data column changes → log warning, use available columns
- Name mapping miss → add to `shared/name_mapping.json`, re-run
- **Critical for Power BI:** strip whitespace from all key columns, ensure consistent casing

## Begin
Execute scripts 01 through 07 in order. Test each step before proceeding. The star schema validation (step 7) must pass before handoff.
