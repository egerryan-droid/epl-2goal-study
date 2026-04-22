# EPL 2-Goal Study — Full Validation Report

Run: 2026-04-22 17:07:35

## Summary

| Tier | Total | PASS | WARN | FAIL | CRITICAL | INFO |
|------|------:|-----:|-----:|-----:|---------:|-----:|
| 1. Integrity | 9 | 9 | 0 | 0 | 0 | 0 |
| 2. Cross-dataset | 11 | 5 | 3 | 1 | 0 | 2 |
| 3. Anchors | 3 | 0 | 3 | 0 | 0 | 0 |
| 4. Slides | 8 | 6 | 0 | 0 | 0 | 2 |

## Tier 1 — Integrity

### [PASS] running_diff arithmetic
  All 10,614 rows satisfy running_diff == running_home - running_away.

### [PASS] Per-goal running-score increments
  Every goal row increments exactly the scoring side by 1 relative to the prior row.

### [PASS] Final score = last running total
  All 3549 matches: final_{home,away}_goals == last running total.

### [PASS] Goals sorted by minute within match
  All matches have goal rows in ascending minute order.

### [PASS] Minute range [0, 120]
  All 10,614 goal minutes in [0, 120].

### [PASS] scoring_side ∈ {home, away}
  All rows have valid scoring_side.

### [PASS] scoring_team aligned with scoring_side
  All rows have scoring_team equal to the home/away team for the scoring side.

### [PASS] Non-null player names
  All goal rows have a player name.

### [PASS] Match metadata consistency
  Each match_id has exactly one (season, date, home, away) tuple across all its rows.

## Tier 2 — Cross-dataset

### [WARN] Football-Data join coverage
  25 of 3549 matches could not be joined to Football-Data (likely due to team-name aliases missing from TEAM_ALIASES).

### [PASS] Understat vs Football-Data final scores
  All 3524 joined matches agree on final score.

### [PASS] goal_timeline ↔ dim_match
  All 3549 matches present in dim_match with matching metadata.

### [PASS] goals_by_match.json ↔ goal_timeline.csv
  All 1901 JSON entries agree with CSV.

### [WARN] ESPN match coverage
  28 of 3,549 Understat matches could not be joined to ESPN (team-alias gap or ESPN missing data).

### [INFO] ESPN details[] completeness
  707 of 3,521 ESPN matches have an incomplete details[] array (ESPN's own final_score total > goals listed). These matches are excluded from scorer/minute comparison since ESPN is missing goal events. Common on pre-2016 matches — does not indicate Understat errors.

### [PASS] Understat vs ESPN final scores
  All 3,521 matched matches agree on final score.

### [PASS] Understat vs ESPN goal count
  All 2,814 comparable matches agree on number of goals.

### [FAIL] Understat vs ESPN scorer names
  5 goal(s) disagree on scorer (name or side). First 10:
    - match_id=3369 (2017-02-01 Stoke vs Everton) goal #2: Understat '38' Ryan Shawcross' vs ESPN '39' Kevin Mirallas'
    - match_id=11737 (2019-10-26 Manchester City vs Aston Villa) goal #2: Understat '64' Kevin De Bruyne' vs ESPN '65' David Silva'
    - match_id=11761 (2019-11-10 Manchester United vs Brighton) goal #2: Understat '18' Davy Pröpper' vs ESPN '19' Scott McTominay'
    - match_id=18466 (2023-03-11 Leeds vs Brighton) goal #3: Understat '60' Jack Harrison' vs ESPN '61' Solly March'
    - match_id=22103 (2024-01-20 Arsenal vs Crystal Palace) goal #2: Understat '36' Dean Henderson' vs ESPN '37' Gabriel Magalhães'

### [WARN] Understat vs ESPN minute drift (1-2)
  7,874 goals drift 1–2 minutes vs ESPN (known Understat convention: shot-minute vs clock-minute). No goals drift ≥3.

### [INFO] ESPN cross-check summary
  Total Understat matches: 3,549. Joined to ESPN: 3,521. ESPN incomplete (ESPN-side gaps): 707. Comparable after filtering: 2,814. Perfectly matched (count + scorer + minute): 2,809. Score disagreements: 0. Goal-count disagreements: 0. Scorer/side disagreements: 5. Minute drift ≥3: 0. Minute drift 1–2: 7,874.

## Tier 3 — Anchors

### [WARN] Anchor: Southampton 4-4 Liverpool — 2022/23 season finale, 2023-05-28 (user-provided anchor)
  Minute drift within tolerance:
      - goal #1 (Diogo Jota): minute drift 1 — anchor 10' vs CSV 9'
      - goal #2 (Roberto Firmino): minute drift 1 — anchor 14' vs CSV 13'
      - goal #3 (James Ward-Prowse): minute drift 1 — anchor 19' vs CSV 18'
      - goal #4 (Kamaldeen Sulemana): minute drift 1 — anchor 28' vs CSV 27'
      - goal #5 (Kamaldeen Sulemana): minute drift 2 — anchor 48' vs CSV 46'
      - goal #6 (Adam Armstrong): minute drift 1 — anchor 64' vs CSV 63'
      - goal #7 (Cody Gakpo): minute drift 1 — anchor 72' vs CSV 71'
      - goal #8 (Diogo Jota): minute drift 1 — anchor 73' vs CSV 72'

### [WARN] Anchor: Bournemouth 4-3 Liverpool — 2016-12-04 comeback (S02 slide narrative target)
  Minute drift within tolerance:
      - goal #1 (Sadio Mané): minute drift 1 — anchor 20' vs CSV 19'
      - goal #3 (Callum Wilson): minute drift 1 — anchor 56' vs CSV 55'
      - goal #4 (Emre Can): minute drift 1 — anchor 64' vs CSV 63'
      - goal #5 (Ryan Fraser): minute drift 1 — anchor 76' vs CSV 75'
      - goal #7 (Nathan Aké): minute drift 1 — anchor 93' vs CSV 92'

### [WARN] Anchor: Manchester City 4-1 Arsenal — 2023-04-26 title-swing game
  Minute drift within tolerance:
      - goal #1 (Kevin De Bruyne): minute drift 1 — anchor 7' vs CSV 6'
      - goal #3 (Kevin De Bruyne): minute drift 1 — anchor 54' vs CSV 53'
      - goal #4 (Rob Holding): minute drift 1 — anchor 86' vs CSV 85'
      - goal #5 (Erling Haaland): minute drift 1 — anchor 95' vs CSV 94'

## Tier 4 — Slides

### [PASS] S02_TheMouth.tsx :: MYTH_MATCH_KEY=18581
  Hint matches data: Southampton vs Liverpool on 2023-05-28 (4-4)

### [INFO] S02_TheMouth.tsx :: YouTube video
  Video id 'TizeozUuIKA' linked. Content cannot be auto-verified — confirm manually that the video depicts the narrated match.

### [PASS] S05b_CollapseTimeline.tsx :: FEATURED_MATCH_KEYS[11877]
  match_key 11877 → Everton vs Newcastle United on 2020-01-21, final 2-2.

### [PASS] S05b_CollapseTimeline.tsx :: FEATURED_MATCH_KEYS[14483]
  match_key 14483 → Tottenham vs West Ham on 2020-10-18, final 3-3.

### [PASS] S05b_CollapseTimeline.tsx :: FEATURED_MATCH_KEYS[14108]
  match_key 14108 → West Bromwich Albion vs Chelsea on 2020-09-26, final 3-3.

### [PASS] S05b_CollapseTimeline.tsx :: FEATURED_MATCH_KEYS[9432]
  match_key 9432 → Manchester United vs Burnley on 2019-01-29, final 2-2.

### [PASS] S05b_CollapseTimeline.tsx :: FEATURED_MATCH_KEYS[18581]
  match_key 18581 → Southampton vs Liverpool on 2023-05-28, final 4-4.

### [INFO] talk-track S02 narration
  S02 narration references Southampton 4-4 Liverpool. The slide should therefore point at match_key 18581.
