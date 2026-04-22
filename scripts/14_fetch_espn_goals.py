"""
Fetch per-goal event data from ESPN's public Soccer API for every Premier League
match in our 10-season window, to serve as an independent cross-check against
Understat-derived goal_timeline.csv.

Endpoint:
  https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=YYYYMMDD

One call per unique match date returns every PL match that day, including
`competitions[].details[]` with `scoringPlay=true` entries — scorer, minute,
and team id.

Output:
  data/raw/espn_goals.csv    (one row per goal)
  data/raw/espn_matches.csv  (one row per match, final scores)

Run:
  python scripts/14_fetch_espn_goals.py                  # fetch all dates
  python scripts/14_fetch_espn_goals.py --max-dates 10   # quick test
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

import pandas as pd


SCRIPT_DIR = Path(__file__).resolve().parent
PROJ_DIR = SCRIPT_DIR.parent
GT_PATH = PROJ_DIR / "data" / "processed" / "goal_timeline.csv"
OUT_GOALS = PROJ_DIR / "data" / "raw" / "espn_goals.csv"
OUT_MATCHES = PROJ_DIR / "data" / "raw" / "espn_matches.csv"
PROGRESS = PROJ_DIR / "data" / "raw" / ".espn_progress"

API_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates={date}"
USER_AGENT = "epl-2goal-study-validator/1.0 (+research use; contact via repo)"

GOAL_FIELDS = [
    "match_date", "home_team", "away_team",
    "home_score", "away_score", "espn_event_id",
    "minute_raw", "minute", "scorer",
    "scoring_side", "scoring_team", "is_own_goal", "is_penalty",
]
MATCH_FIELDS = [
    "match_date", "home_team", "away_team",
    "home_score", "away_score", "espn_event_id",
]


def parse_minute(display: str) -> Optional[int]:
    if display is None:
        return None
    s = str(display).replace("'", "").strip()
    if not s:
        return None
    if "+" in s:
        base, extra = s.split("+", 1)
        try:
            return int(base) + int(extra)
        except ValueError:
            return None
    try:
        return int(s)
    except ValueError:
        return None


def fetch_date_json(yyyymmdd: str, delay: float, max_retries: int = 4) -> dict:
    url = API_URL.format(date=yyyymmdd)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_err = None
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (429, 500, 502, 503, 504):
                time.sleep((2 ** attempt) + delay)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep((2 ** attempt) + delay)
    raise RuntimeError(f"failed after {max_retries} retries: {last_err}")


def extract_from_event(ev: dict, match_date: str) -> tuple[Optional[dict], list[dict]]:
    event_id = ev.get("id")
    competitions = ev.get("competitions") or []
    if not competitions:
        return None, []
    comp = competitions[0]
    competitors = comp.get("competitors", [])
    home = away = None
    home_score = away_score = None
    home_id = away_id = None
    for c in competitors:
        team = c.get("team", {}) or {}
        name = team.get("displayName", "")
        score = c.get("score")
        if c.get("homeAway") == "home":
            home, home_score, home_id = name, score, team.get("id")
        elif c.get("homeAway") == "away":
            away, away_score, away_id = name, score, team.get("id")
    match_row = {
        "match_date": match_date,
        "home_team": home,
        "away_team": away,
        "home_score": home_score,
        "away_score": away_score,
        "espn_event_id": event_id,
    }
    goal_rows: list[dict] = []
    for d in comp.get("details", []) or []:
        type_info = d.get("type") or {}
        type_text = (type_info.get("text") or "").lower()
        is_goal = bool(d.get("scoringPlay")) and ("goal" in type_text)
        if not is_goal:
            continue
        clock_display = (d.get("clock") or {}).get("displayValue", "")
        minute = parse_minute(clock_display)
        team_info = d.get("team") or {}
        team_id = team_info.get("id")
        if team_id == home_id:
            side, scoring_team = "home", home
        elif team_id == away_id:
            side, scoring_team = "away", away
        else:
            side, scoring_team = None, None
        athletes = d.get("athletesInvolved") or []
        scorer = athletes[0].get("displayName") if athletes else ""
        is_own_goal = ("own" in type_text) or bool(d.get("ownGoal"))
        is_penalty = ("penalty" in type_text) or bool(d.get("penaltyKick"))
        goal_rows.append({
            "match_date": match_date,
            "home_team": home,
            "away_team": away,
            "home_score": home_score,
            "away_score": away_score,
            "espn_event_id": event_id,
            "minute_raw": clock_display,
            "minute": minute,
            "scorer": scorer,
            "scoring_side": side,
            "scoring_team": scoring_team,
            "is_own_goal": is_own_goal,
            "is_penalty": is_penalty,
        })
    return match_row, goal_rows


def load_progress() -> set[str]:
    if not PROGRESS.exists():
        return set()
    return {line.strip() for line in PROGRESS.read_text().splitlines() if line.strip()}


def append_progress(date_iso: str) -> None:
    with PROGRESS.open("a", encoding="utf-8") as f:
        f.write(date_iso + "\n")


def append_rows(path: Path, rows: list[dict], fields: list[str]) -> None:
    if not rows:
        return
    exists = path.exists()
    with path.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        if not exists:
            w.writeheader()
        for r in rows:
            w.writerow(r)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1] if __doc__ else None)
    ap.add_argument("--max-dates", type=int, default=0, help="Limit to first N dates for testing (0 = all).")
    ap.add_argument("--delay", type=float, default=0.4, help="Base sleep between requests (seconds).")
    ap.add_argument("--fresh", action="store_true", help="Ignore progress file and refetch all dates.")
    args = ap.parse_args()

    if args.fresh:
        for p in (OUT_GOALS, OUT_MATCHES, PROGRESS):
            if p.exists():
                p.unlink()

    gt = pd.read_csv(GT_PATH)
    all_dates = sorted(gt["date"].unique().tolist())
    if args.max_dates > 0:
        all_dates = all_dates[: args.max_dates]

    done = load_progress()
    remaining = [d for d in all_dates if d not in done]
    print(f"Total dates: {len(all_dates):,}  already done: {len(done):,}  to fetch: {len(remaining):,}")
    if not remaining:
        print("Nothing to do.")
        return 0

    start = time.time()
    for i, d in enumerate(remaining, 1):
        yyyymmdd = d.replace("-", "")
        try:
            data = fetch_date_json(yyyymmdd, delay=args.delay)
        except Exception as e:
            print(f"  [{i}/{len(remaining)}] {d}: ERROR {e}")
            continue

        match_rows: list[dict] = []
        goal_rows: list[dict] = []
        for ev in data.get("events", []) or []:
            m, gs = extract_from_event(ev, d)
            if m is not None:
                match_rows.append(m)
            goal_rows.extend(gs)

        append_rows(OUT_MATCHES, match_rows, MATCH_FIELDS)
        append_rows(OUT_GOALS, goal_rows, GOAL_FIELDS)
        append_progress(d)

        if i % 25 == 0 or i == len(remaining):
            elapsed = time.time() - start
            rate = i / elapsed if elapsed > 0 else 0
            eta_s = (len(remaining) - i) / rate if rate > 0 else 0
            print(f"  [{i}/{len(remaining)}] {d}: {len(match_rows)} matches, {len(goal_rows)} goals "
                  f"(elapsed {elapsed:.0f}s, eta {eta_s:.0f}s)")
        time.sleep(args.delay)

    print(f"\nDone. Goals → {OUT_GOALS}   Matches → {OUT_MATCHES}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
