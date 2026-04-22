"""
Comprehensive validator for the EPL 2-Goal Study data and slide deck.

Runs four tiers of checks in a single pass:

  Tier 1 — Within-dataset integrity (data/processed/goal_timeline.csv)
  Tier 2 — Cross-dataset consistency (Understat vs Football-Data, JSON vs CSV,
           goal_timeline vs dim_match)
  Tier 3 — Anchor-match ground truth (data/reference/anchor_matches.yaml)
  Tier 4 — Slide-vs-data consistency (epl-2goal-web/src/components/sections/*.tsx,
           docs/talk-track.md)

Outputs:
  data/output/validation_report.md    (human-readable Markdown)
  data/output/validation_report.json  (machine-readable)

Exits 0 on success, 1 if any finding meets the --fail-on threshold.

Usage:
  python scripts/13_full_validation.py
  python scripts/13_full_validation.py --tier integrity
  python scripts/13_full_validation.py --fail-on warn
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import yaml


# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJ_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJ_DIR / "data"
PROC_DIR = DATA_DIR / "processed"
PBI_DIR = DATA_DIR / "powerbi"
RAW_DIR = DATA_DIR / "raw"
REF_DIR = DATA_DIR / "reference"
OUT_DIR = DATA_DIR / "output"
WEB_DIR = PROJ_DIR / "epl-2goal-web" / "src"
WEB_DATA = WEB_DIR / "data" / "goals_by_match.json"
WEB_SECTIONS = WEB_DIR / "components" / "sections"
TALK_TRACK = PROJ_DIR / "docs" / "talk-track.md"
ESPN_GOALS = PROJ_DIR / "data" / "raw" / "espn_goals.csv"
ESPN_MATCHES = PROJ_DIR / "data" / "raw" / "espn_matches.csv"

FACT_PLUS2 = PBI_DIR / "fact_plus2_events.csv"
AGG_DESC_JSON = OUT_DIR / "descriptive_stats.json"
AGG_BUCKET_JSON = OUT_DIR / "bucket_analysis.json"
SUMMARY_BY_BUCKET = PBI_DIR / "summary_by_bucket.csv"
SUMMARY_BY_SEASON = PBI_DIR / "summary_by_season.csv"
SUMMARY_BY_TEAM = PBI_DIR / "summary_by_team.csv"
NARRATIVE_CLAIMS = REF_DIR / "narrative_claims.yaml"
REGRESSION_JSON = OUT_DIR / "regression_results.json"
ACCEPTED_DISPUTES = REF_DIR / "accepted_disputes.yaml"

# Tolerances for aggregate parity
RATE_TOL = 1e-3     # ±0.001 for rates (4 decimal JSON resolution)
STAT_TOL = 0.01     # ±0.01 for chi-square etc.


# -----------------------------------------------------------------------------
# Severity and team-alias map
# -----------------------------------------------------------------------------
FAIL_LEVELS = {
    "critical": {"CRITICAL"},
    "error":    {"CRITICAL", "FAIL"},
    "warn":     {"CRITICAL", "FAIL", "WARN"},
    "none":     set(),
}

# Third-party team name → canonical team_key (from dim_team.csv).
# Merges Football-Data short names with ESPN long names. Anything not
# in this map passes through unchanged.
TEAM_ALIASES = {
    # Football-Data short names
    "Bournemouth": "AFC Bournemouth",
    "Leicester": "Leicester City",
    "Stoke": "Stoke City",
    "West Brom": "West Bromwich Albion",
    "Man City": "Manchester City",
    "Man United": "Manchester United",
    "QPR": "Queens Park Rangers",
    "Wolves": "Wolverhampton Wanderers",
    "Newcastle": "Newcastle United",
    "Nott'm Forest": "Nottingham Forest",
    "Leeds": "Leeds United",
    "Norwich": "Norwich City",
    "Swansea": "Swansea City",
    "Cardiff": "Cardiff City",
    "Luton": "Luton Town",
    "Hull": "Hull City",
    "West Ham": "West Ham United",
    "Spurs": "Tottenham",
    # ESPN long names
    "Tottenham Hotspur": "Tottenham",
    "Brighton & Hove Albion": "Brighton",
    "Wolverhampton": "Wolverhampton Wanderers",
    "Huddersfield Town": "Huddersfield",
}


def norm_team(name: str) -> str:
    if name is None:
        return ""
    s = str(name).strip()
    return TEAM_ALIASES.get(s, s)


# -----------------------------------------------------------------------------
# Findings
# -----------------------------------------------------------------------------
@dataclass
class Finding:
    tier: int
    tier_name: str
    check: str
    severity: str              # CRITICAL | FAIL | WARN | INFO | PASS
    detail: str = ""
    subject: str = ""
    suggested_fix: Optional[str] = None
    context: dict = field(default_factory=dict)


findings: list[Finding] = []


def record(
    tier: int,
    tier_name: str,
    check: str,
    severity: str,
    detail: str = "",
    subject: str = "",
    suggested_fix: Optional[str] = None,
    context: Optional[dict] = None,
) -> None:
    findings.append(
        Finding(tier, tier_name, check, severity, detail, subject,
                suggested_fix, context or {})
    )


# -----------------------------------------------------------------------------
# Load
# -----------------------------------------------------------------------------
def load_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    gt = pd.read_csv(PROC_DIR / "goal_timeline.csv")
    dim_match = pd.read_csv(PBI_DIR / "dim_match.csv")
    dim_team = pd.read_csv(PBI_DIR / "dim_team.csv")
    with open(WEB_DATA, "r", encoding="utf-8") as f:
        web_goals = json.load(f)
    return gt, dim_match, dim_team, web_goals


def load_anchors(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or []


# -----------------------------------------------------------------------------
# Tier 1 — within-dataset integrity
# -----------------------------------------------------------------------------
def tier1_integrity(gt: pd.DataFrame) -> None:
    tn = "Integrity"

    # 1a. running_diff == running_home - running_away (vectorized, fast)
    bad = gt[gt["running_diff"] != (gt["running_home"] - gt["running_away"])]
    if len(bad) == 0:
        record(1, tn, "running_diff arithmetic", "PASS",
               f"All {len(gt):,} rows satisfy running_diff == running_home - running_away.")
    else:
        record(1, tn, "running_diff arithmetic", "FAIL",
               f"{len(bad)} rows have inconsistent running_diff.")

    # 1b. Per-match: each row increments exactly one side by 1 versus previous.
    side_errors: list[dict] = []
    for mid, group in gt.groupby("match_id", sort=False):
        g = group.sort_values("minute").reset_index(drop=True)
        prev_h, prev_a = 0, 0
        for idx, r in g.iterrows():
            inc_h = 1 if r["scoring_side"] == "home" else 0
            inc_a = 1 if r["scoring_side"] == "away" else 0
            expected_h = prev_h + inc_h
            expected_a = prev_a + inc_a
            if int(r["running_home"]) != expected_h or int(r["running_away"]) != expected_a:
                side_errors.append(
                    {
                        "match_id": int(mid),
                        "row_i": int(idx),
                        "minute": int(r["minute"]),
                        "expected": [expected_h, expected_a],
                        "got": [int(r["running_home"]), int(r["running_away"])],
                    }
                )
            prev_h, prev_a = int(r["running_home"]), int(r["running_away"])
    if not side_errors:
        record(1, tn, "Per-goal running-score increments", "PASS",
               "Every goal row increments exactly the scoring side by 1 relative to the prior row.")
    else:
        sample = side_errors[:5]
        record(1, tn, "Per-goal running-score increments", "FAIL",
               f"{len(side_errors)} goal rows have running-score mismatches. First 5: {sample}",
               context={"errors_sample": sample})

    # 1c. Final scores match last row's running totals.
    mismatches = []
    for mid, group in gt.groupby("match_id", sort=False):
        last = group.sort_values("minute").iloc[-1]
        if int(last["running_home"]) != int(last["final_home_goals"]) or \
           int(last["running_away"]) != int(last["final_away_goals"]):
            mismatches.append(
                {
                    "match_id": int(mid),
                    "running": [int(last["running_home"]), int(last["running_away"])],
                    "final": [int(last["final_home_goals"]), int(last["final_away_goals"])],
                }
            )
    if not mismatches:
        record(1, tn, "Final score = last running total", "PASS",
               f"All {gt['match_id'].nunique()} matches: final_{{home,away}}_goals == last running total.")
    else:
        record(1, tn, "Final score = last running total", "FAIL",
               f"{len(mismatches)} matches mismatched. First 5: {mismatches[:5]}",
               context={"mismatches_sample": mismatches[:5]})

    # 1d. Goals sorted ascending by minute within each match.
    out_of_order = []
    for mid, group in gt.groupby("match_id", sort=False):
        mins = list(group["minute"])
        if mins != sorted(mins):
            out_of_order.append(int(mid))
    if not out_of_order:
        record(1, tn, "Goals sorted by minute within match", "PASS",
               "All matches have goal rows in ascending minute order.")
    else:
        record(1, tn, "Goals sorted by minute within match", "WARN",
               f"{len(out_of_order)} matches have out-of-order goal rows. First 5: {out_of_order[:5]}")

    # 1e. Minutes within [0, 120].
    bad_min = gt[(gt["minute"] < 0) | (gt["minute"] > 120)]
    if len(bad_min) == 0:
        record(1, tn, "Minute range [0, 120]", "PASS",
               f"All {len(gt):,} goal minutes in [0, 120].")
    else:
        record(1, tn, "Minute range [0, 120]", "FAIL",
               f"{len(bad_min)} goals have minute outside [0, 120].")

    # 1f. scoring_side ∈ {home, away}.
    bad_side = gt[~gt["scoring_side"].isin(["home", "away"])]
    if len(bad_side) == 0:
        record(1, tn, "scoring_side ∈ {home, away}", "PASS",
               "All rows have valid scoring_side.")
    else:
        record(1, tn, "scoring_side ∈ {home, away}", "FAIL",
               f"{len(bad_side)} rows have invalid scoring_side.")

    # 1g. scoring_team matches the side's team name.
    bad_team = gt[
        ((gt["scoring_side"] == "home") & (gt["scoring_team"] != gt["home_team"]))
        | ((gt["scoring_side"] == "away") & (gt["scoring_team"] != gt["away_team"]))
    ]
    if len(bad_team) == 0:
        record(1, tn, "scoring_team aligned with scoring_side", "PASS",
               "All rows have scoring_team equal to the home/away team for the scoring side.")
    else:
        record(1, tn, "scoring_team aligned with scoring_side", "FAIL",
               f"{len(bad_team)} rows have scoring_team mismatched with scoring_side.")

    # 1h. No NULL / empty player names.
    null_players = gt[gt["player"].isna() | (gt["player"].astype(str).str.strip() == "")]
    if len(null_players) == 0:
        record(1, tn, "Non-null player names", "PASS",
               "All goal rows have a player name.")
    else:
        record(1, tn, "Non-null player names", "WARN",
               f"{len(null_players)} rows have missing player names.")

    # 1i. Each match_id has exactly one (season, date, home_team, away_team).
    bad_meta = []
    for mid, group in gt.groupby("match_id", sort=False):
        uniq = group[["season", "date", "home_team", "away_team"]].drop_duplicates()
        if len(uniq) > 1:
            bad_meta.append(int(mid))
    if not bad_meta:
        record(1, tn, "Match metadata consistency", "PASS",
               "Each match_id has exactly one (season, date, home, away) tuple across all its rows.")
    else:
        record(1, tn, "Match metadata consistency", "FAIL",
               f"{len(bad_meta)} match_ids have inconsistent metadata. First 5: {bad_meta[:5]}")

    # 1j. Own-goal semantics: for each is_own_goal row in timeline, the player
    # should be on the CONCEDING team (i.e. h_a in raw shots is opposite to
    # the timeline's scoring_side). Only runs if raw understat data is present.
    tier1_own_goal_semantics(gt)


def tier1_own_goal_semantics(gt: pd.DataFrame) -> None:
    tn = "Integrity"
    own_goals = gt[gt["is_own_goal"] == True]
    if len(own_goals) == 0:
        record(1, tn, "Own-goal semantics", "INFO",
               "No own goals in goal_timeline.csv — nothing to check.")
        return

    raw_files = sorted(glob.glob(str(RAW_DIR / "understat_shots_*.csv")))
    if not raw_files:
        record(1, tn, "Own-goal semantics", "INFO",
               "Raw understat_shots_*.csv files not present (data/raw/ is gitignored). "
               f"{len(own_goals)} own goals not cross-checked. Re-run scripts/02_pull_understat_shots.py to enable.")
        return

    og_frames = []
    for path in raw_files:
        try:
            s = pd.read_csv(path)
        except Exception:
            continue
        if "result" not in s.columns or "h_a" not in s.columns:
            continue
        og = s[s["result"] == "OwnGoal"]
        if len(og) > 0:
            og_frames.append(og[["match_id", "player", "minute", "h_a"]])
    if not og_frames:
        record(1, tn, "Own-goal semantics", "INFO",
               "No OwnGoal rows found in raw understat_shots; skipping cross-check.")
        return
    shots_og = pd.concat(og_frames, ignore_index=True)

    issues: list[str] = []
    unmatched = 0
    checked = 0
    for _, r in own_goals.iterrows():
        cand = shots_og[
            (shots_og["match_id"] == r["match_id"])
            & (shots_og["player"].astype(str).str.strip() == str(r["player"]).strip())
        ]
        if len(cand) == 0:
            unmatched += 1
            continue
        checked += 1
        shooter_h_a = str(cand.iloc[0]["h_a"]).strip().lower()
        conceding = "a" if r["scoring_side"] == "home" else "h"
        if shooter_h_a != conceding:
            issues.append(
                f"match_id={int(r['match_id'])} min={int(r['minute'])} "
                f"player='{r['player']}': shooter h_a='{shooter_h_a}' but "
                f"conceding side should be '{conceding}' "
                f"(scoring_side='{r['scoring_side']}', scoring_team='{r['scoring_team']}')"
            )

    if issues:
        record(1, tn, "Own-goal semantics", "FAIL",
               f"{len(issues)} of {checked} own-goals have shooter on wrong side "
               f"(expected conceding team):\n  - " + "\n  - ".join(issues[:10]),
               context={"issues": issues[:30]})
    else:
        detail = f"All {checked} own-goals cross-checked against raw shots — shooter is on conceding team."
        if unmatched > 0:
            detail += f" ({unmatched} own-goals had no matching raw shot — possible name mismatch.)"
        record(1, tn, "Own-goal semantics", "PASS", detail)


# -----------------------------------------------------------------------------
# Tier 2 — cross-dataset consistency
# -----------------------------------------------------------------------------
def _load_fd_frames() -> pd.DataFrame:
    """Load all raw football_data CSVs, normalize to a single DataFrame."""
    frames = []
    for path in sorted(glob.glob(str(RAW_DIR / "football_data_*.csv"))):
        try:
            fd = pd.read_csv(path, encoding="utf-8", on_bad_lines="skip")
        except UnicodeDecodeError:
            fd = pd.read_csv(path, encoding="latin-1", on_bad_lines="skip")
        if "Date" not in fd.columns or "HomeTeam" not in fd.columns:
            continue
        # Dates are DD/MM/YYYY; some seasons use DD/MM/YY.
        iso = pd.to_datetime(fd["Date"], format="%d/%m/%Y", errors="coerce")
        missing = iso.isna()
        if missing.any():
            iso.loc[missing] = pd.to_datetime(fd.loc[missing, "Date"], format="%d/%m/%y", errors="coerce")
        fd = fd.assign(date=iso.dt.strftime("%Y-%m-%d"))
        fd = fd.dropna(subset=["date"])
        fd = fd.assign(
            fd_home=fd["HomeTeam"].map(lambda s: norm_team(str(s))),
            fd_away=fd["AwayTeam"].map(lambda s: norm_team(str(s))),
        )
        frames.append(fd[["date", "fd_home", "fd_away", "FTHG", "FTAG"]])
    if not frames:
        return pd.DataFrame(columns=["date", "fd_home", "fd_away", "FTHG", "FTAG"])
    out = pd.concat(frames, ignore_index=True)
    out["FTHG"] = pd.to_numeric(out["FTHG"], errors="coerce").astype("Int64")
    out["FTAG"] = pd.to_numeric(out["FTAG"], errors="coerce").astype("Int64")
    return out


def tier2_cross(gt: pd.DataFrame, dim_match: pd.DataFrame, web_goals: dict) -> None:
    tn = "Cross-dataset"

    # Per-match summary from timeline.
    tl_matches = (
        gt.groupby("match_id", sort=False)
        .agg(
            date=("date", "first"),
            home_team=("home_team", "first"),
            away_team=("away_team", "first"),
            final_home_goals=("final_home_goals", "first"),
            final_away_goals=("final_away_goals", "first"),
        )
        .reset_index()
    )
    tl_matches["home_canon"] = tl_matches["home_team"].map(norm_team)
    tl_matches["away_canon"] = tl_matches["away_team"].map(norm_team)

    # 2a. Understat (goal_timeline) vs Football-Data final scores.
    fd_all = _load_fd_frames()
    merged = tl_matches.merge(
        fd_all, left_on=["date", "home_canon", "away_canon"],
        right_on=["date", "fd_home", "fd_away"], how="left",
    )
    unmatched = merged[merged["FTHG"].isna()]
    matched = merged[merged["FTHG"].notna()].copy()
    if len(matched) > 0:
        matched["FTHG"] = matched["FTHG"].astype(int)
        matched["FTAG"] = matched["FTAG"].astype(int)
        score_mismatches = matched[
            (matched["final_home_goals"] != matched["FTHG"])
            | (matched["final_away_goals"] != matched["FTAG"])
        ]
    else:
        score_mismatches = matched

    if len(unmatched) > 0:
        record(
            2, tn, "Football-Data join coverage", "WARN",
            f"{len(unmatched)} of {len(tl_matches)} matches could not be joined to Football-Data "
            f"(likely due to team-name aliases missing from TEAM_ALIASES).",
            context={"sample": unmatched[["match_id", "date", "home_team", "away_team"]].head(10).to_dict("records")},
        )
    else:
        record(2, tn, "Football-Data join coverage", "PASS",
               f"All {len(tl_matches)} matches joined to Football-Data successfully.")

    if len(score_mismatches) == 0:
        record(2, tn, "Understat vs Football-Data final scores", "PASS",
               f"All {len(matched)} joined matches agree on final score.")
    else:
        lines = []
        for _, r in score_mismatches.iterrows():
            lines.append(
                f"match_id={int(r['match_id'])} ({r['date']} {r['home_team']} vs {r['away_team']}): "
                f"Understat {int(r['final_home_goals'])}-{int(r['final_away_goals'])} "
                f"vs Football-Data {int(r['FTHG'])}-{int(r['FTAG'])}"
            )
        record(
            2, tn, "Understat vs Football-Data final scores", "FAIL",
            f"{len(score_mismatches)} matches disagree:\n  - " + "\n  - ".join(lines),
            context={"mismatches": score_mismatches[
                ["match_id", "date", "home_team", "away_team",
                 "final_home_goals", "final_away_goals", "FTHG", "FTAG"]
            ].to_dict("records")},
        )

    # 2b. goal_timeline ↔ dim_match.
    dm = dim_match[
        ["match_key", "match_date", "home_team_key", "away_team_key",
         "final_home_goals", "final_away_goals"]
    ].rename(
        columns={
            "match_date": "dm_date",
            "home_team_key": "dm_home",
            "away_team_key": "dm_away",
            "final_home_goals": "dm_fh",
            "final_away_goals": "dm_fa",
        }
    )
    joined = tl_matches.merge(dm, left_on="match_id", right_on="match_key", how="left")
    missing = joined[joined["match_key"].isna()]
    present = joined[joined["match_key"].notna()].copy()
    present["dm_fh"] = present["dm_fh"].astype(int)
    present["dm_fa"] = present["dm_fa"].astype(int)
    present["dm_home_c"] = present["dm_home"].map(norm_team)
    present["dm_away_c"] = present["dm_away"].map(norm_team)
    meta_bad = present[
        (present["date"] != present["dm_date"])
        | (present["home_canon"] != present["dm_home_c"])
        | (present["away_canon"] != present["dm_away_c"])
        | (present["final_home_goals"] != present["dm_fh"])
        | (present["final_away_goals"] != present["dm_fa"])
    ]
    if len(missing) == 0 and len(meta_bad) == 0:
        record(2, tn, "goal_timeline ↔ dim_match", "PASS",
               f"All {len(tl_matches)} matches present in dim_match with matching metadata.")
    else:
        parts = []
        if len(missing) > 0:
            parts.append(f"{len(missing)} match_ids missing from dim_match.")
        if len(meta_bad) > 0:
            parts.append(f"{len(meta_bad)} matches have metadata mismatches.")
        record(2, tn, "goal_timeline ↔ dim_match", "FAIL", " ".join(parts),
               context={
                   "missing": missing[["match_id"]].head(10).to_dict("records"),
                   "meta_bad": meta_bad.head(10).to_dict("records"),
               })

    # 2c. goals_by_match.json ↔ goal_timeline.csv
    json_issues = []
    for key_str, goals in web_goals.items():
        try:
            mid = int(key_str)
        except (TypeError, ValueError):
            json_issues.append({"match_key": key_str, "issue": "non-integer key"})
            continue
        csv_rows = (
            gt[gt["match_id"] == mid]
            .sort_values(["minute", "scoring_side", "player"])
            .reset_index(drop=True)
        )
        json_sorted = sorted(
            goals, key=lambda g: (g.get("minute", 0), g.get("scoring_side", ""), g.get("player", ""))
        )
        if len(csv_rows) == 0:
            json_issues.append({"match_key": mid, "issue": "no CSV rows", "json_count": len(json_sorted)})
            continue
        if len(csv_rows) != len(json_sorted):
            json_issues.append(
                {"match_key": mid, "issue": "row count",
                 "csv": len(csv_rows), "json": len(json_sorted)}
            )
            continue
        for i, jg in enumerate(json_sorted):
            cr = csv_rows.iloc[i]
            jm = jg.get("minute")
            jp = str(jg.get("player", "")).strip()
            js = jg.get("scoring_side")
            if jm != int(cr["minute"]) or jp != str(cr["player"]).strip() or js != cr["scoring_side"]:
                json_issues.append(
                    {
                        "match_key": mid, "issue": "row_diff", "i": i,
                        "json": {"minute": jm, "player": jp, "side": js},
                        "csv": {"minute": int(cr["minute"]),
                                "player": str(cr["player"]),
                                "side": cr["scoring_side"]},
                    }
                )
                break
    if not json_issues:
        record(2, tn, "goals_by_match.json ↔ goal_timeline.csv", "PASS",
               f"All {len(web_goals)} JSON entries agree with CSV.")
    else:
        record(2, tn, "goals_by_match.json ↔ goal_timeline.csv", "FAIL",
               f"{len(json_issues)} JSON-vs-CSV divergences. First 5: {json_issues[:5]}",
               context={"issues_sample": json_issues[:10]})

    # 2d. Understat (goal_timeline) vs ESPN goal-level cross-check.
    tier2_espn_cross_check(gt, tl_matches)

    # 2e. Aggregate parity: committed JSON/CSV aggregates must match re-computed ones.
    tier2_aggregate_parity()

    # 2f. Regression parity: re-fit the logistic model and confirm coefficients match.
    tier2_regression_parity()

    # 2g. Web dashboard JSONs must still match the CSVs they were generated from.
    tier2_web_data_parity()


def tier2_espn_cross_check(gt: pd.DataFrame, tl_matches: pd.DataFrame) -> None:
    tn = "Cross-dataset"
    if not ESPN_GOALS.exists():
        record(2, tn, "Understat vs ESPN (third-party source)", "INFO",
               "ESPN goal data not found. Run `python scripts/14_fetch_espn_goals.py` "
               "to pull goal-by-goal data from ESPN's public Soccer API and enable this check.")
        return

    espn = pd.read_csv(ESPN_GOALS)
    espn["home_canon"] = espn["home_team"].map(norm_team)
    espn["away_canon"] = espn["away_team"].map(norm_team)
    espn = espn.sort_values(["match_date", "home_canon", "away_canon", "minute"]).reset_index(drop=True)

    # Index ESPN goals by (date, home_canon, away_canon).
    espn_by_match: dict[tuple[str, str, str], pd.DataFrame] = {}
    for (d, h, a), grp in espn.groupby(["match_date", "home_canon", "away_canon"], sort=False):
        espn_by_match[(d, h, a)] = grp.reset_index(drop=True)

    # ESPN match index with final scores (some matches have 0 goals and no rows in espn_goals).
    if ESPN_MATCHES.exists():
        espn_matches = pd.read_csv(ESPN_MATCHES)
        espn_matches["home_canon"] = espn_matches["home_team"].map(norm_team)
        espn_matches["away_canon"] = espn_matches["away_team"].map(norm_team)
        espn_match_by_key = {
            (r["match_date"], r["home_canon"], r["away_canon"]): r
            for _, r in espn_matches.iterrows()
        }
    else:
        espn_match_by_key = {}

    accepted = _load_accepted_disputes()

    unmatched_matches = 0
    espn_incomplete: list[dict] = []  # ESPN's own details[] < its own final score
    score_mismatches: list[dict] = []
    goal_count_mismatches: list[dict] = []
    scorer_mismatches: list[dict] = []
    accepted_mismatches: list[dict] = []
    minute_warns: list[dict] = []
    minute_fails: list[dict] = []
    perfect = 0

    for _, m in tl_matches.iterrows():
        key = (m["date"], m["home_canon"], m["away_canon"])
        espn_goals = espn_by_match.get(key)
        espn_match = espn_match_by_key.get(key)

        if espn_goals is None and espn_match is None:
            unmatched_matches += 1
            continue

        # Final-score comparison (works even if 0-0).
        fh = fa = None
        if espn_match is not None:
            try:
                fh = int(espn_match["home_score"])
                fa = int(espn_match["away_score"])
            except (TypeError, ValueError):
                fh = fa = None
            if fh is not None and (fh != int(m["final_home_goals"]) or fa != int(m["final_away_goals"])):
                score_mismatches.append({
                    "match_id": int(m["match_id"]), "date": m["date"],
                    "home": m["home_team"], "away": m["away_team"],
                    "understat": f"{int(m['final_home_goals'])}-{int(m['final_away_goals'])}",
                    "espn": f"{fh}-{fa}",
                })

        # Goal-level comparison.
        us_goals = (
            gt[gt["match_id"] == m["match_id"]]
            .sort_values(["minute", "scoring_side", "player"])
            .reset_index(drop=True)
        )
        es_goals = (
            espn_goals.sort_values(["minute", "scoring_side", "scorer"]).reset_index(drop=True)
            if espn_goals is not None else pd.DataFrame(columns=["minute", "scorer", "scoring_side"])
        )

        # Detect matches where ESPN's details[] is itself incomplete: i.e., ESPN's final
        # scoreboard total doesn't match the number of detail rows it published. In those
        # cases ESPN is missing goal events (common on older matches) — don't blame Understat.
        if fh is not None and fa is not None and (fh + fa) != len(es_goals):
            espn_incomplete.append({
                "match_id": int(m["match_id"]), "date": m["date"],
                "home": m["home_team"], "away": m["away_team"],
                "espn_final": f"{fh}-{fa}",
                "espn_details_count": len(es_goals),
                "understat_count": len(us_goals),
            })
            continue

        if len(us_goals) != len(es_goals):
            goal_count_mismatches.append({
                "match_id": int(m["match_id"]), "date": m["date"],
                "home": m["home_team"], "away": m["away_team"],
                "understat_goals": len(us_goals),
                "espn_goals": len(es_goals),
            })
            continue  # Skip per-goal comparison if counts disagree

        match_had_issue = False
        for i in range(len(us_goals)):
            us = us_goals.iloc[i]
            es = es_goals.iloc[i]
            us_scorer = str(us["player"]).strip()
            es_scorer = str(es["scorer"]).strip()
            us_min = int(us["minute"])
            try:
                es_min = int(es["minute"]) if pd.notna(es["minute"]) else None
            except (TypeError, ValueError):
                es_min = None
            us_side = us["scoring_side"]
            es_side = es["scoring_side"]

            # Scorer comparison is loose: ESPN and Understat sometimes use different
            # name formats (Heung-Min Son vs Son Heung-Min, accent differences, etc.).
            # We require at least one token ≥4 chars to overlap.
            if not _scorer_names_match(us_scorer, es_scorer):
                disp = _disputed_row(m, i, "scorer_name", us, es,
                                     us_min, us_scorer, es_min, es_scorer)
                if _dispute_is_accepted(accepted, disp):
                    accepted_mismatches.append(disp)
                else:
                    scorer_mismatches.append(disp)
                    match_had_issue = True
                continue

            if us_side and es_side and us_side != es_side:
                disp = _disputed_row(m, i, "scoring_side", us, es,
                                     us_min, us_scorer, es_min, es_scorer)
                if _dispute_is_accepted(accepted, disp):
                    accepted_mismatches.append(disp)
                else:
                    scorer_mismatches.append(disp)
                    match_had_issue = True
                continue

            if es_min is not None:
                diff = abs(us_min - es_min)
                if diff >= 3:
                    minute_fails.append({
                        "match_id": int(m["match_id"]), "date": m["date"],
                        "home": m["home_team"], "away": m["away_team"],
                        "i": i + 1, "scorer": us_scorer,
                        "understat_min": us_min, "espn_min": es_min, "diff": diff,
                    })
                    match_had_issue = True
                elif diff >= 1:
                    minute_warns.append({
                        "match_id": int(m["match_id"]), "date": m["date"],
                        "i": i + 1, "scorer": us_scorer,
                        "understat_min": us_min, "espn_min": es_min, "diff": diff,
                    })
        if not match_had_issue:
            perfect += 1

    total_matched = len(tl_matches) - unmatched_matches
    comparable = total_matched - len(espn_incomplete)
    # Report.
    if unmatched_matches > 0:
        record(
            2, tn, "ESPN match coverage", "WARN",
            f"{unmatched_matches} of {len(tl_matches):,} Understat matches could not be joined to ESPN "
            f"(team-alias gap or ESPN missing data).",
        )
    else:
        record(2, tn, "ESPN match coverage", "PASS",
               f"All {len(tl_matches):,} matches joined to ESPN.")

    if espn_incomplete:
        record(
            2, tn, "ESPN details[] completeness", "INFO",
            f"{len(espn_incomplete):,} of {total_matched:,} ESPN matches have an incomplete "
            f"details[] array (ESPN's own final_score total > goals listed). These matches are "
            f"excluded from scorer/minute comparison since ESPN is missing goal events. "
            f"Common on pre-2016 matches — does not indicate Understat errors.",
            context={"sample": espn_incomplete[:10]},
        )

    if score_mismatches:
        sample = "\n  - ".join(
            f"match_id={d['match_id']} ({d['date']} {d['home']} vs {d['away']}): "
            f"Understat {d['understat']} vs ESPN {d['espn']}"
            for d in score_mismatches[:10]
        )
        record(2, tn, "Understat vs ESPN final scores", "FAIL",
               f"{len(score_mismatches)} match(es) disagree on final score:\n  - " + sample,
               context={"mismatches": score_mismatches})
    else:
        record(2, tn, "Understat vs ESPN final scores", "PASS",
               f"All {total_matched:,} matched matches agree on final score.")

    if goal_count_mismatches:
        sample = "\n  - ".join(
            f"match_id={d['match_id']} ({d['date']} {d['home']} vs {d['away']}): "
            f"Understat={d['understat_goals']}, ESPN={d['espn_goals']}"
            for d in goal_count_mismatches[:10]
        )
        record(2, tn, "Understat vs ESPN goal count", "FAIL",
               f"{len(goal_count_mismatches)} match(es) disagree on goal count "
               f"(after excluding ESPN-incomplete matches):\n  - " + sample,
               context={"mismatches": goal_count_mismatches})
    else:
        record(2, tn, "Understat vs ESPN goal count", "PASS",
               f"All {comparable:,} comparable matches agree on number of goals.")

    if scorer_mismatches:
        sample = "\n  - ".join(
            f"match_id={d['match_id']} ({d['date']} {d['home_team']} vs {d['away_team']}) goal #{d['goal_index']}: "
            f"Understat '{d['understat_minute']}' {d['understat_scorer']}' vs "
            f"ESPN '{d['espn_minute']}' {d['espn_scorer']}'"
            for d in scorer_mismatches[:10]
        )
        record(2, tn, "Understat vs ESPN scorer names", "FAIL",
               f"{len(scorer_mismatches)} NEW goal(s) disagree on scorer (name or side). "
               f"Review and either resolve or add to data/reference/accepted_disputes.yaml. First 10:\n  - " + sample,
               context={"mismatches_sample": scorer_mismatches[:50]})
    else:
        suffix = (
            f" ({len(accepted_mismatches)} accepted dispute(s) acknowledged in "
            f"data/reference/accepted_disputes.yaml.)"
            if accepted_mismatches else ""
        )
        record(2, tn, "Understat vs ESPN scorer names", "PASS",
               f"No new scorer disagreements where goal counts match." + suffix)

    if accepted_mismatches:
        record(2, tn, "ESPN scorer names: accepted disputes", "INFO",
               f"{len(accepted_mismatches)} acknowledged dispute(s) — see "
               f"data/reference/accepted_disputes.yaml for resolutions.",
               context={"accepted": accepted_mismatches})

    # Emit disputed_goals.csv — every current dispute (new + accepted), so the
    # artifact always reflects the full picture even when CI passes.
    _write_disputed_goals(scorer_mismatches + accepted_mismatches)

    if minute_fails:
        sample = "\n  - ".join(
            f"match_id={d['match_id']} ({d['date']} {d['home']} vs {d['away']}) "
            f"goal #{d['i']} ({d['scorer']}): Understat {d['understat_min']}' vs ESPN {d['espn_min']}' "
            f"(drift {d['diff']})"
            for d in minute_fails[:10]
        )
        record(2, tn, "Understat vs ESPN minute drift (≥3)", "FAIL",
               f"{len(minute_fails)} goal(s) drift ≥3 minutes:\n  - " + sample,
               context={"mismatches_sample": minute_fails[:50]})
    elif minute_warns:
        record(2, tn, "Understat vs ESPN minute drift (1-2)", "WARN",
               f"{len(minute_warns):,} goals drift 1–2 minutes vs ESPN (known Understat convention: "
               "shot-minute vs clock-minute). No goals drift ≥3.")
    else:
        record(2, tn, "Understat vs ESPN minute drift", "PASS",
               "All goal minutes agree within tolerance.")

    record(2, tn, "ESPN cross-check summary", "INFO",
           f"Total Understat matches: {len(tl_matches):,}. "
           f"Joined to ESPN: {total_matched:,}. "
           f"ESPN incomplete (ESPN-side gaps): {len(espn_incomplete):,}. "
           f"Comparable after filtering: {comparable:,}. "
           f"Perfectly matched (count + scorer + minute): {perfect:,}. "
           f"Score disagreements: {len(score_mismatches)}. "
           f"Goal-count disagreements: {len(goal_count_mismatches)}. "
           f"Scorer/side disagreements: {len(scorer_mismatches)}. "
           f"Minute drift ≥3: {len(minute_fails)}. Minute drift 1–2: {len(minute_warns):,}.")


# Explicit player-name aliases. Maps a known variant (nickname, short form, or
# typo) to its canonical full name. Only add entries for cases where we have
# verified both forms refer to the same person.
PLAYER_ALIASES: dict[str, str] = {
    # Nicknames / mononym forms used by Understat, mapped to ESPN full-name form
    "Chicharito": "Javier Hernández",
    "Zanka": "Mathias Jørgensen",
    # ESPN typos / spelling variants
    "Biram Kiyal": "Beram Kayal",
}


def _normalize_name(s: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()


def _resolve_alias(s: str) -> str:
    """Return canonical name if `s` is a known alias, else `s` unchanged."""
    if s in PLAYER_ALIASES:
        return PLAYER_ALIASES[s]
    normalized = _normalize_name(s)
    for variant, canonical in PLAYER_ALIASES.items():
        if _normalize_name(variant) == normalized:
            return canonical
    return s


DISPUTED_GOALS = PROJ_DIR / "data" / "output" / "disputed_goals.csv"


def _disputed_row(m, goal_index, issue_type, us_row, es_row, us_min, us_scorer, es_min, es_scorer):
    """Build a rich record of a scorer disagreement for disputed_goals.csv."""
    return {
        "match_id": int(m["match_id"]),
        "date": m["date"],
        "home_team": m["home_team"],
        "away_team": m["away_team"],
        "final_score": f"{int(m['final_home_goals'])}-{int(m['final_away_goals'])}",
        "goal_index": goal_index + 1,
        "issue_type": issue_type,
        "understat_minute": us_min,
        "understat_scorer": us_scorer,
        "understat_side": us_row["scoring_side"],
        "understat_scoring_team": us_row["scoring_team"],
        "understat_is_own_goal": bool(us_row["is_own_goal"]),
        "espn_minute": es_min,
        "espn_scorer": es_scorer,
        "espn_side": es_row["scoring_side"],
        "espn_scoring_team": es_row["scoring_team"],
        "espn_is_own_goal": bool(es_row["is_own_goal"]) if "is_own_goal" in es_row.index else False,
        "espn_event_id": int(es_row["espn_event_id"]) if "espn_event_id" in es_row.index and pd.notna(es_row["espn_event_id"]) else "",
    }


def _write_disputed_goals(mismatches: list[dict]) -> None:
    """Write data/output/disputed_goals.csv — one row per disputed goal."""
    DISPUTED_GOALS.parent.mkdir(parents=True, exist_ok=True)
    cols = [
        "match_id", "date", "home_team", "away_team", "final_score",
        "goal_index", "issue_type",
        "understat_minute", "understat_scorer", "understat_side",
        "understat_scoring_team", "understat_is_own_goal",
        "espn_minute", "espn_scorer", "espn_side",
        "espn_scoring_team", "espn_is_own_goal", "espn_event_id",
    ]
    if not mismatches:
        # Emit an empty file with just the header, so downstream consumers can
        # always read it.
        pd.DataFrame(columns=cols).to_csv(DISPUTED_GOALS, index=False)
        return
    df = pd.DataFrame(mismatches, columns=cols)
    df = df.sort_values(["date", "match_id", "goal_index"]).reset_index(drop=True)
    df.to_csv(DISPUTED_GOALS, index=False)


WEB_CSV_PAIRS = [
    ("dim_match",            PBI_DIR / "dim_match.csv"),
    ("dim_minute_bucket",    PBI_DIR / "dim_minute_bucket.csv"),
    ("dim_season",           PBI_DIR / "dim_season.csv"),
    ("dim_team",             PBI_DIR / "dim_team.csv"),
    ("fact_plus2_events",    PBI_DIR / "fact_plus2_events.csv"),
    ("summary_bucket_stats", PBI_DIR / "summary_bucket_stats.csv"),
    ("summary_by_bucket",    PBI_DIR / "summary_by_bucket.csv"),
    ("summary_by_season",    PBI_DIR / "summary_by_season.csv"),
    ("summary_by_team",      PBI_DIR / "summary_by_team.csv"),
    ("summary_overall",      PBI_DIR / "summary_overall.csv"),
    ("summary_regression",   PBI_DIR / "summary_regression.csv"),
]


def _coerce_csv_value(v):
    """Mirror the coercion done by epl-2goal-web/scripts/csv-to-json.ts."""
    if v is None:
        return None
    if isinstance(v, float):
        import math
        if math.isnan(v):
            return None
        if v.is_integer():
            return int(v)
        return v
    if isinstance(v, (int, bool)):
        return v
    s = str(v)
    if s == "" or s.lower() in ("none", "null", "nan"):
        return None
    if s == "True":
        return True
    if s == "False":
        return False
    try:
        n = float(s)
        if n.is_integer() and "." not in s and "e" not in s.lower():
            return int(n)
        return n
    except ValueError:
        return s


def _values_equivalent(a, b, tol: float = 1e-4) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) <= tol
    return str(a) == str(b)


def tier2_web_data_parity() -> None:
    """Verify that every web dashboard JSON in epl-2goal-web/src/data/ still
    matches the CSV it was generated from. The JSONs are committed to git and
    used by Next.js components, so they can drift from the canonical CSVs
    between pipeline runs if csv-to-json.ts isn't re-run.
    """
    tn = "Cross-dataset"
    web_data_dir = WEB_DIR / "data"
    if not web_data_dir.exists():
        record(2, tn, "Web data parity", "INFO",
               f"{web_data_dir} not found; skipping web-data parity check.")
        return

    row_mismatches: list[str] = []
    col_mismatches: list[str] = []
    value_mismatches: list[str] = []
    checked = 0

    for stem, csv_path in WEB_CSV_PAIRS:
        json_path = web_data_dir / f"{stem}.json"
        if not csv_path.exists() or not json_path.exists():
            continue
        checked += 1
        csv = pd.read_csv(csv_path)
        csv_rows = [
            {col: _coerce_csv_value(row[col]) for col in csv.columns}
            for _, row in csv.iterrows()
        ]
        json_rows = json.loads(json_path.read_text(encoding="utf-8"))

        if len(csv_rows) != len(json_rows):
            row_mismatches.append(
                f"{stem}: CSV has {len(csv_rows)} rows, JSON has {len(json_rows)}"
            )
            continue

        csv_cols = set(csv.columns)
        json_cols = set(json_rows[0].keys()) if json_rows else set()
        if csv_cols != json_cols:
            col_mismatches.append(
                f"{stem}: columns differ. "
                f"CSV only: {sorted(csv_cols - json_cols)}. "
                f"JSON only: {sorted(json_cols - csv_cols)}."
            )
            continue

        for i, (c_row, j_row) in enumerate(zip(csv_rows, json_rows)):
            for col in csv.columns:
                c_val = c_row.get(col)
                j_val = j_row.get(col)
                if not _values_equivalent(c_val, j_val):
                    value_mismatches.append(
                        f"{stem}[row {i}, col '{col}']: CSV={c_val!r} vs JSON={j_val!r}"
                    )
                    if len(value_mismatches) >= 30:
                        break
            if len(value_mismatches) >= 30:
                break

    total_issues = len(row_mismatches) + len(col_mismatches) + len(value_mismatches)
    if total_issues == 0:
        record(2, tn, "Web data parity", "PASS",
               f"All {checked} web JSON files match their source CSVs.")
    else:
        sample = (row_mismatches + col_mismatches + value_mismatches)[:15]
        record(2, tn, "Web data parity", "FAIL",
               f"{total_issues} divergence(s) across {checked} files "
               f"({len(row_mismatches)} row-count, {len(col_mismatches)} column, "
               f"{len(value_mismatches)} value):\n  - " + "\n  - ".join(sample),
               context={
                   "row_mismatches": row_mismatches,
                   "col_mismatches": col_mismatches,
                   "value_mismatches_sample": value_mismatches[:30],
               })


def tier2_regression_parity() -> None:
    """Re-fit the logistic regression described in scripts/11_regression.py and
    verify that the committed coefficients/odds ratios/p-values/AIC/BIC in
    data/output/regression_results.json match within tolerance. Catches any
    drift from a pipeline re-run that would otherwise silently invalidate the
    paper's regression table.
    """
    tn = "Cross-dataset"
    if not FACT_PLUS2.exists():
        record(2, tn, "Regression parity", "INFO",
               f"{FACT_PLUS2} not found — skipping regression parity.")
        return
    if not REGRESSION_JSON.exists():
        record(2, tn, "Regression parity", "INFO",
               f"{REGRESSION_JSON} not found — run scripts/11_regression.py to generate.")
        return

    try:
        import statsmodels.api as sm
        import numpy as np
    except ImportError:
        record(2, tn, "Regression parity", "INFO",
               "statsmodels not installed — cannot verify regression parity.")
        return

    fact = pd.read_csv(FACT_PLUS2)
    reg_data = fact[[
        "is_win", "minute_reached_plus2", "leader_implied_prob",
        "leader_is_home", "leader_red_cards", "opponent_red_cards",
    ]].copy()
    reg_data["leader_is_home"] = reg_data["leader_is_home"].astype(int)

    reg_core = reg_data.dropna(subset=[
        "minute_reached_plus2", "leader_implied_prob", "leader_is_home",
    ])
    reg_full = reg_data.dropna()

    # Mirror the feature-set selection from scripts/11_regression.py.
    if len(reg_full) > len(reg_core) * 0.8:
        x_cols = [
            "minute_reached_plus2", "leader_implied_prob", "leader_is_home",
            "leader_red_cards", "opponent_red_cards",
        ]
        data = reg_full
    else:
        x_cols = ["minute_reached_plus2", "leader_implied_prob", "leader_is_home"]
        data = reg_core

    X = sm.add_constant(data[x_cols])
    y = data["is_win"]
    try:
        model = sm.Logit(y, X).fit(disp=0)
    except Exception as e:
        record(2, tn, "Regression parity", "FAIL", f"Re-fit failed: {e}")
        return

    committed = json.loads(REGRESSION_JSON.read_text(encoding="utf-8"))

    COEF_TOL = 1e-3
    OR_TOL = 1e-2
    P_TOL = 1e-3
    STAT_TOL = 0.2

    issues: list[str] = []

    # Top-level stats.
    n_committed = int(committed.get("n", 0))
    if int(model.nobs) != n_committed:
        issues.append(f"n: committed={n_committed} vs recomputed={int(model.nobs)}")
    pseudo_new = round(float(model.prsquared), 4)
    pseudo_com = float(committed.get("pseudo_r2", 0))
    if abs(pseudo_new - pseudo_com) > 1e-3:
        issues.append(f"pseudo_r2: committed={pseudo_com} vs recomputed={pseudo_new}")
    aic_new = round(float(model.aic), 1)
    aic_com = float(committed.get("aic", 0))
    if abs(aic_new - aic_com) > STAT_TOL:
        issues.append(f"aic: committed={aic_com} vs recomputed={aic_new}")
    bic_new = round(float(model.bic), 1)
    bic_com = float(committed.get("bic", 0))
    if abs(bic_new - bic_com) > STAT_TOL:
        issues.append(f"bic: committed={bic_com} vs recomputed={bic_new}")
    ll_new = round(float(model.llf), 1)
    ll_com = float(committed.get("log_likelihood", 0))
    if abs(ll_new - ll_com) > STAT_TOL:
        issues.append(f"log_likelihood: committed={ll_com} vs recomputed={ll_new}")

    # Coefficients.
    committed_coefs = committed.get("coefficients", {})
    for var in ["const"] + x_cols:
        if var not in committed_coefs:
            issues.append(f"coefficient '{var}' missing from regression_results.json")
            continue
        c = committed_coefs[var]
        coef_new = round(float(model.params[var]), 4)
        p_new = round(float(model.pvalues[var]), 4)
        or_new = round(float(np.exp(model.params[var])), 4)
        ci = model.conf_int().loc[var]
        ci_low_new = round(float(ci.iloc[0]), 4)
        ci_high_new = round(float(ci.iloc[1]), 4)

        if abs(coef_new - float(c.get("coefficient", 0))) > COEF_TOL:
            issues.append(
                f"{var}.coefficient: committed={c.get('coefficient')} vs recomputed={coef_new}"
            )
        if abs(p_new - float(c.get("p_value", 0))) > P_TOL:
            issues.append(
                f"{var}.p_value: committed={c.get('p_value')} vs recomputed={p_new}"
            )
        if abs(or_new - float(c.get("odds_ratio", 0))) > OR_TOL:
            issues.append(
                f"{var}.odds_ratio: committed={c.get('odds_ratio')} vs recomputed={or_new}"
            )
        if abs(ci_low_new - float(c.get("ci_low", 0))) > COEF_TOL:
            issues.append(
                f"{var}.ci_low: committed={c.get('ci_low')} vs recomputed={ci_low_new}"
            )
        if abs(ci_high_new - float(c.get("ci_high", 0))) > COEF_TOL:
            issues.append(
                f"{var}.ci_high: committed={c.get('ci_high')} vs recomputed={ci_high_new}"
            )

    if issues:
        record(2, tn, "Regression parity", "FAIL",
               f"{len(issues)} divergence(s) vs regression_results.json:\n  - "
               + "\n  - ".join(issues[:15]),
               context={"issues": issues})
    else:
        record(2, tn, "Regression parity", "PASS",
               f"Logistic regression re-fit matches committed model "
               f"(n={int(model.nobs)}, pseudo_r²={pseudo_new}, AIC={aic_new}, "
               f"all {len(['const'] + x_cols)} coefficients within tolerance).")


def tier2_aggregate_parity() -> None:
    """Verify that committed aggregate files still match a fresh re-computation.

    Covers the L3 aggregate layer from docs/qa_plan.md — descriptive_stats.json,
    bucket_analysis.json, and the summary_*.csv files. If the pipeline is ever
    re-run with updated data, any aggregate that drifts from a re-computation on
    fact_plus2_events.csv will fail this check — preventing stale numbers from
    silently shipping to the paper, talk-track, or slides.
    """
    tn = "Cross-dataset"

    if not FACT_PLUS2.exists():
        record(2, tn, "Aggregate parity", "INFO",
               f"{FACT_PLUS2} not found — skipping aggregate parity.")
        return
    if not AGG_DESC_JSON.exists():
        record(2, tn, "Aggregate parity", "INFO",
               f"{AGG_DESC_JSON} not found — run `scripts/09_descriptive_stats.py` to generate.")
        return

    fact = pd.read_csv(FACT_PLUS2)
    desc = json.loads(AGG_DESC_JSON.read_text(encoding="utf-8"))
    bucket_ana = (
        json.loads(AGG_BUCKET_JSON.read_text(encoding="utf-8"))
        if AGG_BUCKET_JSON.exists() else {}
    )

    # ---- Overall aggregates ----
    overall = desc.get("overall", {})
    recomputed = {
        "n":               int(len(fact)),
        "wins":            int(fact["is_win"].sum()),
        "draws":           int(fact["is_draw"].sum()),
        "losses":          int(fact["is_loss"].sum()),
        "win_rate":        round(float(fact["is_win"].mean()), 4),
        "draw_rate":       round(float(fact["is_draw"].mean()), 4),
        "loss_rate":       round(float(fact["is_loss"].mean()), 4),
        "points_dropped":  int(fact["points_dropped"].sum()),
        "avg_points_dropped": round(float(fact["points_dropped"].mean()), 4),
        "home_n":          int(fact["leader_is_home"].sum()),
        "away_n":          int((~fact["leader_is_home"].astype(bool)).sum()),
        "home_win_rate":   round(float(fact[fact["leader_is_home"]]["is_win"].mean()), 4),
        "away_win_rate":   round(float(fact[~fact["leader_is_home"].astype(bool)]["is_win"].mean()), 4),
    }
    issues = _compare_scalar_dict(recomputed, overall, tolerance=RATE_TOL, label_prefix="overall")
    if issues:
        record(2, tn, "Aggregate parity: overall", "FAIL",
               f"{len(issues)} divergence(s) between recomputed and descriptive_stats.json.overall:\n  - "
               + "\n  - ".join(issues),
               context={"issues": issues})
    else:
        record(2, tn, "Aggregate parity: overall", "PASS",
               f"All {len(recomputed)} overall aggregates match descriptive_stats.json.overall.")

    # ---- By bucket ----
    by_bucket_issues = _check_group_parity(
        fact, by_col="bucket_key",
        committed=desc.get("by_bucket", []),
        int_cols=["n", "wins", "draws", "losses", "points_dropped"],
        rate_cols=["win_rate"],
        key="bucket_key",
    )
    if by_bucket_issues:
        record(2, tn, "Aggregate parity: by bucket", "FAIL",
               f"{len(by_bucket_issues)} divergence(s) vs descriptive_stats.json.by_bucket:\n  - "
               + "\n  - ".join(by_bucket_issues[:15]),
               context={"issues_sample": by_bucket_issues[:30]})
    else:
        record(2, tn, "Aggregate parity: by bucket", "PASS",
               "All bucket aggregates match descriptive_stats.json.by_bucket.")

    # ---- By season ----
    by_season_issues = _check_group_parity(
        fact, by_col="season_key",
        committed=desc.get("by_season", []),
        int_cols=["n", "wins", "draws", "losses", "points_dropped"],
        rate_cols=["win_rate"],
        key="season_key",
    )
    if by_season_issues:
        record(2, tn, "Aggregate parity: by season", "FAIL",
               f"{len(by_season_issues)} divergence(s) vs descriptive_stats.json.by_season:\n  - "
               + "\n  - ".join(by_season_issues[:15]))
    else:
        record(2, tn, "Aggregate parity: by season", "PASS",
               "All season aggregates match descriptive_stats.json.by_season.")

    # ---- By team ----
    team_rows = (
        fact.groupby("leader_team_key")
        .agg(
            n_as_leader=("event_id", "count"),
            wins=("is_win", "sum"),
            draws=("is_draw", "sum"),
            losses=("is_loss", "sum"),
            points_dropped=("points_dropped", "sum"),
        )
        .reset_index()
        .rename(columns={"leader_team_key": "team_key"})
    )
    team_rows["win_rate"] = (team_rows["wins"] / team_rows["n_as_leader"]).round(4)
    opp_counts = fact.groupby("opponent_team_key").size().to_dict()
    opp_held = fact[fact["is_win"] != 1].groupby("opponent_team_key").size().to_dict()
    team_recomputed = {
        r["team_key"]: {
            "n_as_leader": int(r["n_as_leader"]),
            "wins":        int(r["wins"]),
            "draws":       int(r["draws"]),
            "losses":      int(r["losses"]),
            "win_rate":    float(r["win_rate"]),
            "points_dropped": int(r["points_dropped"]),
            "n_as_opponent": int(opp_counts.get(r["team_key"], 0)),
            "times_opponent_held": int(opp_held.get(r["team_key"], 0)),
        }
        for _, r in team_rows.iterrows()
    }
    team_committed = {item["team_key"]: item for item in desc.get("by_team", [])}
    team_issues: list[str] = []
    for tk, rec in team_recomputed.items():
        c = team_committed.get(tk)
        if c is None:
            team_issues.append(f"team '{tk}' missing from descriptive_stats.by_team")
            continue
        for col in ["n_as_leader", "wins", "draws", "losses", "points_dropped",
                    "n_as_opponent", "times_opponent_held"]:
            if int(c.get(col, -1)) != rec[col]:
                team_issues.append(f"team '{tk}' {col}: committed={c.get(col)} vs recomputed={rec[col]}")
        if abs(float(c.get("win_rate", 0)) - rec["win_rate"]) > RATE_TOL:
            team_issues.append(f"team '{tk}' win_rate: committed={c.get('win_rate')} vs recomputed={rec['win_rate']:.4f}")
    for tk in team_committed:
        if tk not in team_recomputed:
            team_issues.append(f"team '{tk}' in committed but not in recomputed (orphan)")
    if team_issues:
        record(2, tn, "Aggregate parity: by team", "FAIL",
               f"{len(team_issues)} divergence(s) vs descriptive_stats.json.by_team:\n  - "
               + "\n  - ".join(team_issues[:15]),
               context={"issues_sample": team_issues[:30]})
    else:
        record(2, tn, "Aggregate parity: by team", "PASS",
               f"All {len(team_recomputed)} team aggregates match descriptive_stats.json.by_team.")

    # ---- Bucket analysis: lock points + chi-square (sanity) ----
    ba_issues: list[str] = []
    if bucket_ana:
        committed_rates = bucket_ana.get("win_rates_by_bucket", {})
        recomputed_rates = (
            fact.groupby("bucket_key")["is_win"].mean().round(4).to_dict()
        )
        for bk, rate in recomputed_rates.items():
            if bk not in committed_rates:
                ba_issues.append(f"bucket '{bk}' missing from bucket_analysis.win_rates_by_bucket")
                continue
            if abs(float(committed_rates[bk]) - float(rate)) > RATE_TOL:
                ba_issues.append(
                    f"bucket '{bk}' win_rate: committed={committed_rates[bk]} vs recomputed={rate:.4f}"
                )
        # Lock point: committed bucket with win_rate >= 0.95 must still exist in recomputed
        locked_95 = bucket_ana.get("locked_minute_95")
        locked_95_rate = bucket_ana.get("locked_minute_95_win_rate")
        if locked_95 is not None:
            new_rate = recomputed_rates.get(locked_95)
            if new_rate is None or new_rate < 0.95:
                ba_issues.append(
                    f"locked_minute_95='{locked_95}' no longer passes ≥0.95 "
                    f"(recomputed win_rate={new_rate})"
                )
            elif locked_95_rate is not None and abs(float(locked_95_rate) - float(new_rate)) > RATE_TOL:
                ba_issues.append(
                    f"locked_minute_95_win_rate: committed={locked_95_rate} vs recomputed={new_rate:.4f}"
                )
    if ba_issues:
        record(2, tn, "Aggregate parity: bucket analysis", "FAIL",
               f"{len(ba_issues)} divergence(s) vs bucket_analysis.json:\n  - "
               + "\n  - ".join(ba_issues))
    elif bucket_ana:
        record(2, tn, "Aggregate parity: bucket analysis", "PASS",
               "win_rates_by_bucket and lock points match bucket_analysis.json.")
    else:
        record(2, tn, "Aggregate parity: bucket analysis", "INFO",
               f"{AGG_BUCKET_JSON} not found — skipping bucket analysis parity.")

    # ---- CSV ↔ JSON parity for summary_by_* files ----
    tier2_summary_csv_parity(desc)


def tier2_summary_csv_parity(desc: dict) -> None:
    """Check that summary_*.csv files in data/powerbi/ agree with the JSON aggregates."""
    tn = "Cross-dataset"
    drifts: list[str] = []

    def _compare_csv(csv_path, json_rows, key_col, int_cols, rate_cols, label):
        if not csv_path.exists():
            return None
        csv = pd.read_csv(csv_path)
        json_by_key = {row[key_col]: row for row in json_rows}
        for _, row in csv.iterrows():
            k = row[key_col]
            j = json_by_key.get(k)
            if j is None:
                drifts.append(f"{label}: key '{k}' in CSV but not in JSON")
                continue
            for col in int_cols:
                if col in row and col in j and int(row[col]) != int(j[col]):
                    drifts.append(f"{label} [{k}] {col}: CSV={row[col]} vs JSON={j[col]}")
            for col in rate_cols:
                if col in row and col in j:
                    if abs(float(row[col]) - float(j[col])) > RATE_TOL:
                        drifts.append(f"{label} [{k}] {col}: CSV={row[col]} vs JSON={j[col]}")
        for k in json_by_key:
            if k not in set(csv[key_col]):
                drifts.append(f"{label}: key '{k}' in JSON but not in CSV")
        return True

    _compare_csv(
        SUMMARY_BY_BUCKET, desc.get("by_bucket", []),
        key_col="bucket_key",
        int_cols=["n", "wins", "draws", "losses", "points_dropped", "is_locked_90", "is_locked_95"],
        rate_cols=["win_rate", "draw_rate", "loss_rate"],
        label="summary_by_bucket",
    )
    _compare_csv(
        SUMMARY_BY_SEASON, desc.get("by_season", []),
        key_col="season_key",
        int_cols=["n", "wins", "draws", "losses", "points_dropped"],
        rate_cols=["win_rate"],
        label="summary_by_season",
    )
    _compare_csv(
        SUMMARY_BY_TEAM, desc.get("by_team", []),
        key_col="team_key",
        int_cols=["n_as_leader", "wins", "draws", "losses", "points_dropped",
                  "n_as_opponent", "times_opponent_held"],
        rate_cols=["win_rate"],
        label="summary_by_team",
    )

    if drifts:
        record(2, tn, "CSV ↔ JSON summary parity", "FAIL",
               f"{len(drifts)} row(s) differ between summary_*.csv and descriptive_stats.json:\n  - "
               + "\n  - ".join(drifts[:15]),
               context={"drifts_sample": drifts[:30]})
    else:
        record(2, tn, "CSV ↔ JSON summary parity", "PASS",
               "summary_by_bucket.csv, summary_by_season.csv, summary_by_team.csv "
               "all agree with descriptive_stats.json.")


def _compare_scalar_dict(recomputed: dict, committed: dict, tolerance: float,
                          label_prefix: str = "") -> list[str]:
    issues: list[str] = []
    for k, rec in recomputed.items():
        com = committed.get(k)
        if com is None:
            continue
        if isinstance(rec, int):
            if int(com) != rec:
                issues.append(f"{label_prefix}.{k}: committed={com} vs recomputed={rec}")
        else:
            if abs(float(com) - float(rec)) > tolerance:
                issues.append(
                    f"{label_prefix}.{k}: committed={com} vs recomputed={rec:.4f} "
                    f"(Δ={abs(float(com)-float(rec)):.4f})"
                )
    return issues


def _check_group_parity(fact: pd.DataFrame, by_col: str, committed: list,
                        int_cols: list[str], rate_cols: list[str], key: str) -> list[str]:
    grp = (
        fact.groupby(by_col)
        .agg(
            n=("event_id", "count"),
            wins=("is_win", "sum"),
            draws=("is_draw", "sum"),
            losses=("is_loss", "sum"),
            points_dropped=("points_dropped", "sum"),
        )
        .reset_index()
    )
    grp["win_rate"] = (grp["wins"] / grp["n"]).round(4)
    recomputed_by_key = {r[by_col]: r for _, r in grp.iterrows()}
    committed_by_key = {item[key]: item for item in committed}
    issues: list[str] = []
    for k, rec in recomputed_by_key.items():
        c = committed_by_key.get(k)
        if c is None:
            issues.append(f"{key} '{k}' present in data but missing from committed")
            continue
        for col in int_cols:
            if col in rec and col in c and int(rec[col]) != int(c[col]):
                issues.append(f"{key} '{k}' {col}: committed={c[col]} vs recomputed={rec[col]}")
        for col in rate_cols:
            if col in rec and col in c and abs(float(rec[col]) - float(c[col])) > RATE_TOL:
                issues.append(f"{key} '{k}' {col}: committed={c[col]} vs recomputed={rec[col]:.4f}")
    for k in committed_by_key:
        if k not in recomputed_by_key:
            issues.append(f"{key} '{k}' in committed but not in recomputed (orphan)")
    return issues


def _load_accepted_disputes() -> list[dict]:
    """Load the human-curated list of acknowledged Understat-vs-ESPN conflicts.
    Missing file is fine (no accepted disputes — every conflict will FAIL).
    """
    if not ACCEPTED_DISPUTES.exists():
        return []
    try:
        data = yaml.safe_load(ACCEPTED_DISPUTES.read_text(encoding="utf-8")) or []
    except yaml.YAMLError:
        return []
    return list(data)


def _dispute_is_accepted(accepted: list[dict], disp: dict) -> bool:
    """Match a detected dispute against the accepted list. Matches on the
    tuple (match_id, goal_index, understat_scorer, espn_scorer) — a later
    pipeline run that surfaces a *different* player would not be silenced.
    """
    for entry in accepted:
        if (
            int(entry.get("match_id", -1)) == disp["match_id"]
            and int(entry.get("goal_index", -1)) == disp["goal_index"]
            and str(entry.get("understat_scorer", "")).strip() == str(disp["understat_scorer"]).strip()
            and str(entry.get("espn_scorer", "")).strip() == str(disp["espn_scorer"]).strip()
        ):
            return True
    return False


def _scorer_names_match(a: str, b: str) -> bool:
    """Loose scorer-name comparison.

    Returns True if, after de-aliasing and normalization (lowercase, accent-
    stripped), either (a) the two strings are equal, or (b) they share at
    least one token of length ≥ 4. Handles reversed order like 'Heung-Min
    Son' vs 'Son Heung-Min', accent differences, and known nicknames via
    PLAYER_ALIASES.
    """
    a_canon = _resolve_alias(a)
    b_canon = _resolve_alias(b)
    na = _normalize_name(a_canon)
    nb = _normalize_name(b_canon)
    if not na or not nb:
        return False
    if na == nb:
        return True
    tokens_a = {t for t in na.replace("-", " ").split() if len(t) >= 4}
    tokens_b = {t for t in nb.replace("-", " ").split() if len(t) >= 4}
    return bool(tokens_a & tokens_b)


# -----------------------------------------------------------------------------
# Tier 3 — anchor-match ground truth
# -----------------------------------------------------------------------------
def tier3_anchors(gt: pd.DataFrame, anchors: list[dict]) -> None:
    tn = "Anchors"
    if not anchors:
        record(3, tn, "Anchor file", "INFO",
               f"No anchors defined at {REF_DIR / 'anchor_matches.yaml'}.")
        return

    for anchor in anchors:
        mk = int(anchor["match_key"])
        desc = anchor.get("description", f"match_key {mk}")
        csv = (
            gt[gt["match_id"] == mk]
            .sort_values(["minute", "scoring_side", "player"])
            .reset_index(drop=True)
        )
        if len(csv) == 0:
            record(3, tn, f"Anchor: {desc}", "FAIL",
                   f"match_key {mk} not found in goal_timeline.csv.",
                   subject=str(mk))
            continue

        head = csv.iloc[0]
        meta_issues = []
        if norm_team(head["home_team"]) != norm_team(anchor["home_team"]):
            meta_issues.append(
                f"home team: anchor '{anchor['home_team']}' vs CSV '{head['home_team']}'"
            )
        if norm_team(head["away_team"]) != norm_team(anchor["away_team"]):
            meta_issues.append(
                f"away team: anchor '{anchor['away_team']}' vs CSV '{head['away_team']}'"
            )
        if str(head["date"]) != str(anchor["date"]):
            meta_issues.append(f"date: anchor {anchor['date']} vs CSV {head['date']}")
        if int(head["final_home_goals"]) != int(anchor["final_home_goals"]) or \
           int(head["final_away_goals"]) != int(anchor["final_away_goals"]):
            meta_issues.append(
                f"final score: anchor {anchor['final_home_goals']}-{anchor['final_away_goals']} "
                f"vs CSV {int(head['final_home_goals'])}-{int(head['final_away_goals'])}"
            )

        anchor_goals = sorted(
            anchor.get("goals", []),
            key=lambda g: (g["minute"], g.get("side", ""), g["scorer"]),
        )
        csv_goals = csv.to_dict("records")
        fails: list[str] = []
        warns: list[str] = []

        if len(anchor_goals) != len(csv_goals):
            fails.append(f"goal count: anchor {len(anchor_goals)} vs CSV {len(csv_goals)}")
        else:
            for i, (ag, cg) in enumerate(zip(anchor_goals, csv_goals), start=1):
                a_scorer = str(ag["scorer"]).strip()
                c_scorer = str(cg["player"]).strip()
                a_min = int(ag["minute"])
                c_min = int(cg["minute"])
                a_side = ag.get("side")
                c_side = cg["scoring_side"]
                if a_scorer != c_scorer:
                    fails.append(f"goal #{i}: scorer — anchor '{a_scorer}' vs CSV '{c_scorer}'")
                    continue  # Don't bother on minute if scorer is wrong
                if a_side and a_side != c_side:
                    fails.append(f"goal #{i} ({a_scorer}): side — anchor {a_side} vs CSV {c_side}")
                diff = abs(a_min - c_min)
                if diff >= 3:
                    fails.append(f"goal #{i} ({a_scorer}): minute drift {diff} — anchor {a_min}' vs CSV {c_min}'")
                elif diff >= 1:
                    warns.append(f"goal #{i} ({a_scorer}): minute drift {diff} — anchor {a_min}' vs CSV {c_min}'")

        all_fails = meta_issues + fails
        if all_fails:
            detail = "; ".join(all_fails)
            if warns:
                detail += " | Warnings: " + "; ".join(warns)
            record(3, tn, f"Anchor: {desc}", "FAIL", detail, subject=str(mk))
        elif warns:
            record(3, tn, f"Anchor: {desc}", "WARN",
                   "Minute drift within tolerance:\n    - " + "\n    - ".join(warns),
                   subject=str(mk))
        else:
            record(3, tn, f"Anchor: {desc}", "PASS",
                   f"All {len(anchor_goals)} goals match on scorer, minute, and side.",
                   subject=str(mk))


# -----------------------------------------------------------------------------
# Tier 4 — slide-vs-data consistency
# -----------------------------------------------------------------------------
MATCH_KEY_CONST_RE = re.compile(
    r"const\s+(\w*MATCH_KEY\w*)\s*=\s*['\"](\d+)['\"]\s*;?",
    re.MULTILINE,
)
MATCH_KEYS_ARRAY_RE = re.compile(
    r"const\s+(\w*MATCH_KEYS?\w*)\s*=\s*\[\s*([\d,\s]+?)\s*\]\s*;?",
    re.MULTILINE,
)
YOUTUBE_RE = re.compile(r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]+)")

# Parses "Bournemouth 4-3 Liverpool, Dec 4 2016 — match_key 4618" and variants.
COMMENT_HINT_RE = re.compile(
    r"(?P<home>[A-Z][\w'. ]+?)\s+(?P<hs>\d+)\s*[-–]\s*(?P<as>\d+)\s+"
    r"(?P<away>[A-Z][\w'. ]+?)\s*,?\s*(?P<date>[A-Za-z]+\s+\d+(?:,)?\s+\d{4}|\d{4}-\d{2}-\d{2})"
    r"\s*[—–\-]+\s*match_key\s+(?P<mk>\d+)",
    re.IGNORECASE,
)


def parse_comment_hint(comment: str) -> Optional[dict]:
    m = COMMENT_HINT_RE.search(comment)
    if not m:
        return None
    return {
        "home_team": m.group("home").strip(),
        "away_team": m.group("away").strip(),
        "final_home_goals": int(m.group("hs")),
        "final_away_goals": int(m.group("as")),
        "date_str": m.group("date").strip().rstrip(",").strip(),
        "match_key": int(m.group("mk")),
    }


def parse_date_loose(s: str) -> Optional[str]:
    s = s.strip().rstrip(",").strip()
    for fmt in (
        "%Y-%m-%d", "%B %d %Y", "%b %d %Y",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
    ):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def find_match_by_narrative(
    gt: pd.DataFrame, home: str, away: str, date: Optional[str], fh: int, fa: int
) -> Optional[dict]:
    per_match = (
        gt.groupby("match_id", sort=False)
        .agg(
            date=("date", "first"),
            home_team=("home_team", "first"),
            away_team=("away_team", "first"),
            final_home_goals=("final_home_goals", "first"),
            final_away_goals=("final_away_goals", "first"),
        )
        .reset_index()
    )
    per_match["home_c"] = per_match["home_team"].map(norm_team)
    per_match["away_c"] = per_match["away_team"].map(norm_team)
    home_c = norm_team(home)
    away_c = norm_team(away)
    cand = per_match[
        (per_match["home_c"] == home_c)
        & (per_match["away_c"] == away_c)
        & (per_match["final_home_goals"] == fh)
        & (per_match["final_away_goals"] == fa)
    ]
    if date:
        d = cand[cand["date"] == date]
        if len(d) > 0:
            return d.iloc[0].to_dict()
    if len(cand) > 0:
        return cand.iloc[0].to_dict()
    return None


def _evaluate_slide_match_key(
    slide: str, const_name: str, key: int, hint: Optional[dict], gt: pd.DataFrame
) -> None:
    tn = "Slides"
    subject_label = f"{slide} :: {const_name}={key}"
    row = gt[gt["match_id"] == key]
    if len(row) == 0:
        record(4, tn, subject_label, "FAIL",
               f"match_key {key} not found in goal_timeline.csv.",
               subject=slide)
        return
    actual = row.iloc[0]
    actual_str = (f"{actual['home_team']} vs {actual['away_team']} on {actual['date']} "
                  f"({int(actual['final_home_goals'])}-{int(actual['final_away_goals'])})")

    if hint is None:
        record(4, tn, subject_label, "INFO",
               f"No comment hint present. match_key {key} resolves to {actual_str}.",
               subject=slide)
        return

    hint_date = parse_date_loose(hint["date_str"])
    issues = []
    if norm_team(hint["home_team"]) != norm_team(actual["home_team"]):
        issues.append(f"home team: hint '{hint['home_team']}' vs data '{actual['home_team']}'")
    if norm_team(hint["away_team"]) != norm_team(actual["away_team"]):
        issues.append(f"away team: hint '{hint['away_team']}' vs data '{actual['away_team']}'")
    if hint_date and hint_date != actual["date"]:
        issues.append(f"date: hint {hint_date} vs data {actual['date']}")
    if hint["final_home_goals"] != int(actual["final_home_goals"]) \
            or hint["final_away_goals"] != int(actual["final_away_goals"]):
        issues.append(
            f"final score: hint {hint['final_home_goals']}-{hint['final_away_goals']} "
            f"vs data {int(actual['final_home_goals'])}-{int(actual['final_away_goals'])}"
        )

    if not issues:
        record(4, tn, subject_label, "PASS",
               f"Hint matches data: {actual_str}", subject=slide)
        return

    cand = find_match_by_narrative(
        gt, hint["home_team"], hint["away_team"], hint_date,
        hint["final_home_goals"], hint["final_away_goals"],
    )
    suggestion = None
    if cand:
        suggestion = (f"match_key={int(cand['match_id'])}  "
                      f"({cand['home_team']} {cand['final_home_goals']}-{cand['final_away_goals']} "
                      f"{cand['away_team']}, {cand['date']})")
    detail = (
        f"Hint claims: {hint['home_team']} vs {hint['away_team']} on {hint['date_str']} "
        f"({hint['final_home_goals']}-{hint['final_away_goals']}). "
        f"Actual: {actual_str}. Issues: {'; '.join(issues)}."
    )
    record(4, "Slides", subject_label, "FAIL", detail,
           subject=slide, suggested_fix=suggestion)


def tier4_slides(gt: pd.DataFrame) -> None:
    tn = "Slides"
    if not WEB_SECTIONS.exists():
        record(4, tn, "Slide directory", "WARN",
               f"{WEB_SECTIONS} not found; skipping slide checks.")
        return

    tsx_files = sorted(WEB_SECTIONS.glob("S*.tsx"))
    if not tsx_files:
        record(4, tn, "Slide files", "WARN",
               f"No S*.tsx files found in {WEB_SECTIONS}.")
        return

    for path in tsx_files:
        slide = path.name
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()

        # Single hardcoded match-key constants.
        for m in MATCH_KEY_CONST_RE.finditer(text):
            const_name = m.group(1)
            key = int(m.group(2))
            start_line = text[: m.start()].count("\n")
            hint = None
            if start_line > 0:
                prev = lines[start_line - 1].strip()
                if prev.startswith("//"):
                    hint = parse_comment_hint(prev.lstrip("/").strip())
            _evaluate_slide_match_key(slide, const_name, key, hint, gt)

        # Arrays of match keys (e.g., FEATURED_MATCH_KEYS).
        for m in MATCH_KEYS_ARRAY_RE.finditer(text):
            arr_name = m.group(1)
            raw = m.group(2)
            keys = [int(x.strip()) for x in raw.split(",") if x.strip()]
            for key in keys:
                subject_label = f"{slide} :: {arr_name}[{key}]"
                row = gt[gt["match_id"] == key]
                if len(row) == 0:
                    record(4, tn, subject_label, "FAIL",
                           f"match_key {key} not found in goal_timeline.csv.",
                           subject=slide)
                    continue
                first = row.iloc[0]
                record(4, tn, subject_label, "PASS",
                       f"match_key {key} → {first['home_team']} vs {first['away_team']} "
                       f"on {first['date']}, final "
                       f"{int(first['final_home_goals'])}-{int(first['final_away_goals'])}.",
                       subject=slide)

        # YouTube video ids — flag for manual review.
        for m in YOUTUBE_RE.finditer(text):
            vid = m.group(1)
            record(4, tn, f"{slide} :: YouTube video", "INFO",
                   f"Video id '{vid}' linked. Content cannot be auto-verified — "
                   "confirm manually that the video depicts the narrated match.",
                   subject=slide)


def _resolve_json_path(data, path: str):
    """Navigate a dot-path through nested dicts/lists with optional [key=value] filters.

    Supported syntax:
        foo.bar.baz                       -> data['foo']['bar']['baz']
        list_name[key=value].field        -> for item in data['list_name']:
                                                if str(item[key]) == value: pick item
                                             then item['field']
    """
    parts = path.split(".")
    cur = data
    for p in parts:
        if "[" in p and p.endswith("]"):
            name, sel = p[:-1].split("[", 1)
            cur = cur[name]
            if "=" in sel:
                k, v = sel.split("=", 1)
                matches = [item for item in cur if str(item.get(k)) == v]
                if not matches:
                    raise KeyError(f"no item with {k}={v} in list '{name}'")
                cur = matches[0]
            else:
                cur = cur[int(sel)]
        else:
            if isinstance(cur, list):
                cur = cur[int(p)]
            else:
                cur = cur[p]
    return cur


def _format_value(value, fmt: str) -> str:
    """Render a numeric value to its narrative display string."""
    try:
        return fmt.format(value)
    except (TypeError, ValueError):
        return str(value)


def tier4_narrative_claims() -> None:
    """Verify that every numeric claim quoted in paper/talk-track still matches
    its canonical source and that the rendered display string actually appears
    in each listed narrative file.

    Driven by data/reference/narrative_claims.yaml — new claims are added there
    without touching code.
    """
    tn = "Slides"
    if not NARRATIVE_CLAIMS.exists():
        record(4, tn, "Narrative claims", "INFO",
               f"{NARRATIVE_CLAIMS} not found — skipping narrative claim check.")
        return

    try:
        claims = yaml.safe_load(NARRATIVE_CLAIMS.read_text(encoding="utf-8")) or []
    except yaml.YAMLError as e:
        record(4, tn, "Narrative claims", "FAIL", f"Failed to parse YAML: {e}")
        return

    if not claims:
        record(4, tn, "Narrative claims", "INFO",
               f"{NARRATIVE_CLAIMS} is empty.")
        return

    # Cache source files so we don't re-read per claim.
    source_cache: dict[Path, object] = {}

    def load_source(path: Path):
        if path not in source_cache:
            source_cache[path] = json.loads(path.read_text(encoding="utf-8"))
        return source_cache[path]

    # Cache narrative file contents too.
    narrative_cache: dict[Path, str] = {}

    def load_narrative(path: Path) -> str:
        if path not in narrative_cache:
            narrative_cache[path] = path.read_text(encoding="utf-8")
        return narrative_cache[path]

    pass_count = 0
    fail_items: list[str] = []
    stale_hits: list[str] = []

    for claim in claims:
        cid = claim.get("id", "<unnamed>")
        src_file = PROJ_DIR / claim["source_file"]
        src_path = claim["source_path"]
        fmt = claim.get("display_format", "{}")
        aliases = claim.get("display_aliases", []) or []
        stale_forms = claim.get("stale_forms", []) or []
        narratives = claim.get("narratives", []) or []

        if not src_file.exists():
            fail_items.append(f"[{cid}] source_file not found: {src_file}")
            continue

        try:
            data = load_source(src_file)
            value = _resolve_json_path(data, src_path)
        except (KeyError, IndexError, TypeError) as e:
            fail_items.append(f"[{cid}] could not resolve {src_path} in {src_file.name}: {e}")
            continue

        display = _format_value(value, fmt)
        searches = [display] + list(aliases)

        for nar in narratives:
            nar_path = PROJ_DIR / nar
            if not nar_path.exists():
                fail_items.append(f"[{cid}] narrative file not found: {nar}")
                continue
            content = load_narrative(nar_path)

            display_found = any(s in content for s in searches)
            if not display_found:
                fail_items.append(
                    f"[{cid}] expected '{display}' (from {src_path} = {value}) "
                    f"not found in {nar}"
                )

            # Stale-form check is independent — run even when display is missing,
            # since both a missing canonical and a lingering stale value are
            # useful signals (and usually occur together).
            for stale in stale_forms:
                if stale in content:
                    stale_hits.append(
                        f"[{cid}] stale value '{stale}' still present in {nar} "
                        f"— update to '{display}'"
                    )

            if display_found:
                pass_count += 1

    total = sum(len(c.get("narratives", [])) for c in claims)
    if fail_items or stale_hits:
        details = fail_items + stale_hits
        record(4, tn, "Narrative claims", "FAIL",
               f"{len(fail_items)} missing and {len(stale_hits)} stale of {total} claim×file checks. "
               f"First 15:\n  - " + "\n  - ".join(details[:15]),
               context={"missing": fail_items, "stale": stale_hits})
    else:
        record(4, tn, "Narrative claims", "PASS",
               f"All {total} claim×file checks matched ({len(claims)} claims across "
               f"{len({n for c in claims for n in c.get('narratives', [])})} files).")


TEAM_CRESTS_TS = WEB_DIR / "lib" / "crests.ts"
FIGURES_DIR = PROJ_DIR / "docs" / "figures"


def tier4_team_crests() -> None:
    """Verify every team in dim_team.csv and every team referenced on a slide
    has a crest entry in epl-2goal-web/src/lib/crests.ts. Catches missing
    assets before they render as initials-fallback on screen.
    """
    tn = "Slides"
    if not TEAM_CRESTS_TS.exists():
        record(4, tn, "Team crests", "INFO",
               f"{TEAM_CRESTS_TS} not found — skipping team crest presence check.")
        return

    crests_src = TEAM_CRESTS_TS.read_text(encoding="utf-8")
    known = set(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*`\$\{CREST_BASE\}/\d+\.png`", crests_src))

    expected: set[str] = set()
    dim_team_path = PBI_DIR / "dim_team.csv"
    if dim_team_path.exists():
        dim_team = pd.read_csv(dim_team_path)
        expected.update(str(t) for t in dim_team["team_key"].tolist())

    if WEB_SECTIONS.exists():
        for tsx in WEB_SECTIONS.glob("S*.tsx"):
            text = tsx.read_text(encoding="utf-8")
            for m in re.finditer(r'team\s*=\s*["\']([^"\']+)["\']', text):
                expected.add(m.group(1))

    missing = expected - known
    unused = known - expected

    if missing:
        record(4, tn, "Team crests", "FAIL",
               f"{len(missing)} team(s) referenced but missing from crests.ts: "
               + ", ".join(sorted(missing)),
               context={"missing": sorted(missing), "unused_in_map": sorted(unused)})
    else:
        detail = f"All {len(expected)} teams referenced have crest entries."
        if unused:
            detail += f" ({len(unused)} historical team(s) still in crests.ts but not in current data: {', '.join(sorted(unused))})"
        record(4, tn, "Team crests", "PASS", detail,
               context={"unused_in_map": sorted(unused)})


def tier4_figures() -> None:
    """Verify that every figure referenced by the paper exists on disk and
    is non-empty. Paper references take the form `docs/figures/figN_*.png`.
    """
    tn = "Slides"
    if not FIGURES_DIR.exists():
        record(4, tn, "Figures", "INFO",
               f"{FIGURES_DIR} not found — skipping figure presence check.")
        return

    paper = PROJ_DIR / "docs" / "paper_draft.md"
    referenced: set[str] = set()
    if paper.exists():
        text = paper.read_text(encoding="utf-8")
        for m in re.finditer(r"docs/figures/([A-Za-z0-9_\-]+\.(?:png|jpg|jpeg|svg|pdf))", text):
            referenced.add(m.group(1))

    present = {p.name for p in FIGURES_DIR.iterdir() if p.is_file()}
    missing = referenced - present
    empty = [p.name for p in FIGURES_DIR.iterdir() if p.is_file() and p.stat().st_size == 0]
    orphan = present - referenced if referenced else set()

    problems = []
    if missing:
        problems.append(f"{len(missing)} figure(s) referenced by paper but not on disk: " + ", ".join(sorted(missing)))
    if empty:
        problems.append(f"{len(empty)} figure(s) are empty (0 bytes): " + ", ".join(sorted(empty)))

    if problems:
        record(4, tn, "Figures", "FAIL", "; ".join(problems),
               context={"missing": sorted(missing), "empty": empty})
    elif referenced:
        detail = f"All {len(referenced)} figures referenced in paper are present and non-empty."
        if orphan:
            detail += f" ({len(orphan)} unreferenced file(s) in docs/figures/)"
        record(4, tn, "Figures", "PASS", detail,
               context={"orphan": sorted(orphan)})
    else:
        record(4, tn, "Figures", "INFO",
               f"No figures referenced from paper; {len(present)} files present in docs/figures/.")


def tier4_talk_track(gt: pd.DataFrame) -> None:
    tn = "Slides"
    if not TALK_TRACK.exists():
        record(4, tn, "Talk-track narration", "INFO",
               f"{TALK_TRACK} not found; skipping narration check.")
        return
    text = TALK_TRACK.read_text(encoding="utf-8")
    # Check the S02 narration matches the current slide (Southampton 4-4 Liverpool).
    if re.search(r"###\s+S02:.*Southampton.*Liverpool", text, re.IGNORECASE | re.DOTALL):
        record(4, tn, "talk-track S02 narration", "INFO",
               "S02 narration references Southampton 4-4 Liverpool. "
               "The slide should therefore point at match_key 18581.")
    else:
        record(4, tn, "talk-track S02 narration", "WARN",
               "S02 talk-track narration does not match expected Southampton-Liverpool pattern; "
               "ensure docs/talk-track.md matches the slide content.")


# -----------------------------------------------------------------------------
# Report
# -----------------------------------------------------------------------------
TIER_NAMES = ["Integrity", "Cross-dataset", "Anchors", "Slides"]


def render_report() -> tuple[str, dict]:
    summary: dict[str, dict[str, int]] = {tn: defaultdict(int) for tn in TIER_NAMES}
    for f in findings:
        summary[f.tier_name][f.severity] += 1

    lines = [
        "# EPL 2-Goal Study — Full Validation Report",
        "",
        f"Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "## Summary",
        "",
        "| Tier | Total | PASS | WARN | FAIL | CRITICAL | INFO |",
        "|------|------:|-----:|-----:|-----:|---------:|-----:|",
    ]
    for i, tn in enumerate(TIER_NAMES, start=1):
        s = summary[tn]
        total = sum(s.values())
        lines.append(
            f"| {i}. {tn} | {total} | {s['PASS']} | {s['WARN']} | "
            f"{s['FAIL']} | {s['CRITICAL']} | {s['INFO']} |"
        )
    lines.append("")

    icon = {"PASS": "[PASS]", "INFO": "[INFO]", "WARN": "[WARN]",
            "FAIL": "[FAIL]", "CRITICAL": "[CRIT]"}

    for i, tn in enumerate(TIER_NAMES, start=1):
        lines.append(f"## Tier {i} — {tn}")
        lines.append("")
        tier_findings = [f for f in findings if f.tier == i]
        if not tier_findings:
            lines.append("_No findings._")
            lines.append("")
            continue
        for f in tier_findings:
            lines.append(f"### {icon.get(f.severity, '[?]')} {f.check}")
            if f.detail:
                for dl in f.detail.split("\n"):
                    lines.append(f"  {dl}")
            if f.suggested_fix:
                lines.append(f"")
                lines.append(f"  **Suggested fix:** {f.suggested_fix}")
            lines.append("")

    md = "\n".join(lines)
    js = {
        "run_at": datetime.now().isoformat(),
        "summary": {tn: dict(summary[tn]) for tn in TIER_NAMES},
        "findings": [asdict(f) for f in findings],
    }
    return md, js


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1] if __doc__ else None)
    ap.add_argument(
        "--tier", choices=["integrity", "cross", "anchors", "slides", "all"],
        default="all",
    )
    ap.add_argument("--output-dir", type=Path, default=OUT_DIR)
    ap.add_argument("--anchors", type=Path, default=REF_DIR / "anchor_matches.yaml")
    ap.add_argument(
        "--fail-on", choices=list(FAIL_LEVELS.keys()), default="error",
        help="Exit code 1 if any finding has severity in the selected set "
             "(critical < error < warn). Default: error.",
    )
    args = ap.parse_args()

    print("Loading data...")
    gt, dim_match, dim_team, web_goals = load_data()
    anchors = load_anchors(args.anchors)
    print(f"  goal_timeline.csv:   {len(gt):,} rows across {gt['match_id'].nunique()} matches")
    print(f"  dim_match.csv:       {len(dim_match):,} rows")
    print(f"  dim_team.csv:        {len(dim_team):,} rows")
    print(f"  goals_by_match.json: {len(web_goals):,} match entries")
    print(f"  anchors:             {len(anchors)} (from {args.anchors})")

    run = {"integrity", "cross", "anchors", "slides"} if args.tier == "all" else {args.tier}
    if "integrity" in run:
        print("\n== Tier 1: Within-dataset integrity ==")
        tier1_integrity(gt)
    if "cross" in run:
        print("\n== Tier 2: Cross-dataset consistency ==")
        tier2_cross(gt, dim_match, web_goals)
    if "anchors" in run:
        print("\n== Tier 3: Anchor-match ground truth ==")
        tier3_anchors(gt, anchors)
    if "slides" in run:
        print("\n== Tier 4: Slide-vs-data consistency ==")
        tier4_slides(gt)
        tier4_talk_track(gt)
        tier4_narrative_claims()
        tier4_team_crests()
        tier4_figures()

    md, js = render_report()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    md_path = args.output_dir / "validation_report.md"
    js_path = args.output_dir / "validation_report.json"
    md_path.write_text(md, encoding="utf-8")
    js_path.write_text(json.dumps(js, indent=2, default=str), encoding="utf-8")

    print("\n" + "=" * 72)
    print("VALIDATION SUMMARY")
    print("=" * 72)
    for tn in TIER_NAMES:
        counts = defaultdict(int)
        for f in findings:
            if f.tier_name == tn:
                counts[f.severity] += 1
        total = sum(counts.values())
        if total == 0:
            continue
        print(
            f"  {tn:15s}  total={total:3d}  "
            f"PASS={counts['PASS']:3d}  WARN={counts['WARN']:3d}  "
            f"FAIL={counts['FAIL']:3d}  CRITICAL={counts['CRITICAL']:3d}  INFO={counts['INFO']:3d}"
        )
    print(f"\n  Report:         {md_path}")
    print(f"  JSON:           {js_path}")
    if DISPUTED_GOALS.exists():
        disputed_count = sum(1 for _ in open(DISPUTED_GOALS, encoding="utf-8")) - 1
        print(f"  Disputed goals: {DISPUTED_GOALS} ({disputed_count} row(s))")

    fail_set = FAIL_LEVELS[args.fail_on]
    if any(f.severity in fail_set for f in findings):
        print(f"  Result: FAIL  (any severity in {sorted(fail_set)} triggers --fail-on={args.fail_on})")
        return 1
    print("  Result: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
