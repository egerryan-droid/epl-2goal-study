# Quick Start — EPL 2-Goal Lead Study (Power BI Edition)

## Setup (5 minutes)

```bash
# 1. Copy project to your working directory
cd ~/epl-2goal-study    # or wherever you cloned it

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Make runner executable
chmod +x run_agents.sh

# 4. Verify Claude Code
claude --version
```

## Opening Claude Code (Windows/WSL)
```powershell
# In PowerShell:
wsl

# Then in WSL:
cd ~/epl-2goal-study
claude
```

## Running the Pipeline

### Recommended: Phase by Phase
```bash
# Phase 1: Plan
./run_agents.sh --phase 1

# Phase 2: Build data + star schema (longest step)
./run_agents.sh --phase 2
# → Check: data/powerbi/ should have 6 CSVs

# Phase 3: QA validation
./run_agents.sh --phase 3
# → Check: docs/qa_report.md for PASS/FAIL

# Phase 4: Statistical analysis + pre-computed tables
./run_agents.sh --phase 4
# → Check: data/powerbi/summary_*.csv files

# Phase 5: Power BI architecture
./run_agents.sh --phase 5
# → Check: docs/dax_measures.md, docs/powerbi_spec.md

# Phase 6: Paper
./run_agents.sh --phase 6
# → Check: docs/paper_draft.md
```

### Alternative: Interactive Mode
```bash
claude
# Paste agent prompts one at a time:
# 1. agents/00_orchestrator.md
# 2. agents/01_data_engineer.md
# 3. agents/03_qa_agent.md
# 4. agents/02_statistician.md
# 5. agents/04_powerbi_architect.md
# 6. agents/05_writer.md
```

## After Pipeline Completes: Build Power BI Dashboard

### Quick Version (15-20 minutes)
1. Open **Power BI Desktop**
2. **Get Data → Text/CSV** → load all files from `data/powerbi/`
3. Go to **Model View** → set up relationships per `docs/powerbi_load_instructions.md`
4. Create measures from `docs/dax_measures.md`
5. Build pages per `docs/powerbi_spec.md`
6. Apply theme: View → Themes → Browse → `data/powerbi/epl_study_theme.json`

### Files to Load into Power BI

**Core Star Schema (6 files):**
| File | Type | Rows |
|------|------|------|
| dim_season.csv | Dimension | 10 |
| dim_team.csv | Dimension | ~33 |
| dim_match.csv | Dimension | ~3,800 |
| dim_minute_bucket.csv | Dimension | 6 |
| fact_plus2_events.csv | Fact | ~1,700 |
| fact_goal_timeline.csv | Fact | ~5,000 |

**Pre-computed Summary Tables (5-6 files):**
| File | Purpose |
|------|---------|
| summary_overall.csv | Card visuals |
| summary_by_bucket.csv | Bucket chart with CIs |
| summary_by_season.csv | Season trend |
| summary_by_team.csv | Team leaderboard |
| summary_bucket_stats.csv | Test result text boxes |
| summary_regression.csv | Regression table (if exists) |

**Theme:**
| File | Purpose |
|------|---------|
| epl_study_theme.json | Green/amber/red color scheme |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Understat 403 errors | Longer delays (3-5s), or use `understat` package |
| Football-Data CSV changes | Check headers, update download script |
| QA finds blockers | Fix data, re-run: `./run_agents.sh --from 2` |
| Name mapping miss | Add to `shared/name_mapping.json`, re-run from phase 2 |
| Power BI relationship error | Check that key columns have no whitespace, match exactly |
| DAX error on USERELATIONSHIP | Ensure opponent_team_key relationship exists but is INACTIVE |
| Bucket sort wrong in chart | Set bucket_label "Sort by Column" = bucket_order |

## Timeline

| Phase | Agent | Time |
|-------|-------|------|
| 1 | Orchestrator | ~5 min |
| 2 | Data Engineer | ~30-45 min |
| 3 | QA Agent | ~10 min |
| 4 | Statistician | ~15 min |
| 5 | PBI Architect | ~15 min |
| 6 | Writer | ~15 min |
| — | **Build PBI Dashboard** | ~20-30 min |

**Total: ~2-2.5 hours** from zero to finished dashboard + paper.
