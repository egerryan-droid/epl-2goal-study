# EPL "2-Goal Lead Safety" Study — Agent Team Project

## Overview
This project uses a team of Claude Code agents to research, acquire, transform, analyze, and visualize findings on how often a 2-goal lead in the English Premier League results in a win, draw, or loss — and at what minute the lead becomes effectively "locked."

**Final deliverable:** A Power BI dashboard with interactive analysis, supported by an EMBA research paper.

## Project Structure
```
epl-2goal-study/
├── agents/                     # Agent system prompts (one per role)
│   ├── 00_orchestrator.md      # Master coordinator
│   ├── 01_data_engineer.md     # Data acquisition + star schema ETL
│   ├── 02_statistician.md      # Analysis + pre-computed measures
│   ├── 03_qa_agent.md          # Validation + spot-checks
│   ├── 04_powerbi_architect.md # Power BI data model + DAX + layout
│   └── 05_writer.md            # EMBA paper output
├── shared/                     # Shared configs used by all agents
│   ├── schema.json             # Star schema: fact + dimension tables
│   ├── name_mapping.json       # Team name normalization
│   └── project_state.json      # Orchestrator tracks progress here
├── scripts/                    # Python scripts (agents write these here)
├── data/
│   ├── raw/                    # Downloaded source files
│   ├── processed/              # Intermediate cleaned tables
│   ├── output/                 # Analysis JSON results
│   └── powerbi/                # ★ Power BI-ready CSVs (star schema)
│       ├── fact_plus2_events.csv
│       ├── fact_goal_timeline.csv
│       ├── dim_season.csv
│       ├── dim_team.csv
│       ├── dim_match.csv
│       ├── dim_minute_bucket.csv
│       └── measures_reference.md
└── docs/                       # Paper drafts, DAX reference
    ├── figures/                # Static fallback charts
    ├── tables/                 # Formatted tables
    ├── dax_measures.md         # Complete DAX measure library
    ├── powerbi_spec.md         # Dashboard page-by-page spec
    └── paper_draft.md          # EMBA paper
```

## Data Model (Star Schema for Power BI)
```
                    ┌──────────────┐
                    │  dim_season   │
                    │──────────────│
                    │ season_key   │
                    │ season_label │
                    │ start_year   │
                    │ end_year     │
                    └──────┬───────┘
                           │
┌──────────────┐    ┌──────┴───────────────┐    ┌──────────────────┐
│  dim_team    │    │  fact_plus2_events    │    │ dim_minute_bucket │
│──────────────│    │──────────────────────│    │──────────────────│
│ team_key     ├────┤ event_id             ├────┤ bucket_key       │
│ team_name    │    │ match_key (FK)       │    │ bucket_label     │
│ short_name   │    │ season_key (FK)      │    │ bucket_order     │
│ city         │    │ leader_team_key (FK) │    │ min_minute       │
└──────────────┘    │ opponent_team_key(FK)│    │ max_minute       │
                    │ bucket_key (FK)      │    └──────────────────┘
┌──────────────┐    │ minute_reached_plus2 │
│  dim_match   │    │ result_for_leader    │
│──────────────│    │ points_dropped       │
│ match_key    ├────┤ ...odds, cards...    │
│ match_date   │    └──────────────────────┘
│ home_team_key│
│ away_team_key│           ┌──────────────────────┐
│ final_home   │           │  fact_goal_timeline   │
│ final_away   │           │──────────────────────│
│ ftr          │           │ goal_id              │
└──────────────┘           │ match_key (FK)       │
                           │ season_key (FK)      │
                           │ scoring_team_key(FK) │
                           │ minute               │
                           │ running_home         │
                           │ running_away         │
                           │ running_diff         │
                           └──────────────────────┘
```

## Agent Execution Order

| Phase | Agent | Output | ~Time |
|-------|-------|--------|-------|
| 1 | Orchestrator | Execution plan | 5 min |
| 2 | Data Engineer | Star schema CSVs in `data/powerbi/` | 30-45 min |
| 3 | QA Agent | Validation report | 10 min |
| 4 | Statistician | Pre-computed measures + static figures | 15 min |
| 5 | Power BI Architect | DAX library + dashboard spec + template | 15 min |
| 6 | Writer | EMBA paper draft | 15 min |

## Research Questions
1. P(win | +2 lead) overall and by minute bucket
2. At what minute does a +2 lead become "locked" (≥90% win rate)?
3. How many matches had a +2 lead where the leader didn't win?
4. Does pre-match strength (odds proxy) affect the relationship?
5. Which teams are most/least reliable at holding +2 leads?

## Parameters
- Seasons: 2014/15 – 2023/24 (10 seasons, ~3,800 matches)
- Minute buckets: 0–15, 16–30, 31–45+, 46–60, 61–75, 76–90+
- Locked threshold: 90% win rate (robustness 95%)
