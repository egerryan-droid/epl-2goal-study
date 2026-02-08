#!/bin/bash
# =============================================================================
# EPL 2-Goal Lead Safety Study — Agent Team Runner
# =============================================================================
# Usage:
#   ./run_agents.sh              # Run all 6 phases
#   ./run_agents.sh --phase 4    # Run only phase 4 (Statistician)
#   ./run_agents.sh --from 3     # Run from phase 3 onward
# =============================================================================

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
PHASE_START=1
PHASE_END=6
if [[ "$1" == "--phase" ]]; then
    PHASE_START=$2
    PHASE_END=$2
elif [[ "$1" == "--from" ]]; then
    PHASE_START=$2
fi

echo "========================================="
echo " EPL 2-Goal Lead Safety — Agent Runner"
echo " Final deliverable: Power BI Dashboard"
echo "========================================="
echo ""

mkdir -p data/{raw,processed,output,powerbi} docs/{figures,tables} scripts

# Phase 1: Orchestrator
if [[ $PHASE_START -le 1 && $PHASE_END -ge 1 ]]; then
    echo -e "${CYAN}[Phase 1/6] Orchestrator — Planning${NC}"
    claude --print "$(cat agents/00_orchestrator.md)" 2>&1 | tee docs/log_orchestrator.txt
    echo -e "${GREEN}✓ Phase 1 complete${NC}\n"
fi

# Phase 2: Data Engineer
if [[ $PHASE_START -le 2 && $PHASE_END -ge 2 ]]; then
    echo -e "${CYAN}[Phase 2/6] Data Engineer — Acquisition + Star Schema${NC}"
    echo "Estimated: 30-45 minutes (includes web requests)"
    claude --print "$(cat agents/01_data_engineer.md)" 2>&1 | tee docs/log_data_engineer.txt
    echo -e "${GREEN}✓ Phase 2 complete${NC}"
    # Verify critical output
    EXPECTED_FILES=("data/powerbi/fact_plus2_events.csv" "data/powerbi/dim_season.csv" "data/powerbi/dim_team.csv" "data/powerbi/dim_match.csv" "data/powerbi/dim_minute_bucket.csv" "data/powerbi/fact_goal_timeline.csv")
    for f in "${EXPECTED_FILES[@]}"; do
        if [[ ! -f "$f" ]]; then
            echo -e "${RED}[ERROR] Missing: $f${NC}"
            exit 1
        fi
    done
    echo "fact_plus2_events rows: $(wc -l < data/powerbi/fact_plus2_events.csv)"
    echo ""
fi

# Phase 3: QA Agent
if [[ $PHASE_START -le 3 && $PHASE_END -ge 3 ]]; then
    echo -e "${CYAN}[Phase 3/6] QA Agent — Validation${NC}"
    claude --print "$(cat agents/03_qa_agent.md)" 2>&1 | tee docs/log_qa.txt
    echo -e "${GREEN}✓ Phase 3 complete${NC}"
    if [[ -f "docs/qa_report.md" ]] && grep -qi "BLOCKER" docs/qa_report.md; then
        echo -e "${RED}[BLOCKER] QA found critical issues. Fix and re-run: ./run_agents.sh --from 2${NC}"
        exit 1
    fi
    echo ""
fi

# Phase 4: Statistician
if [[ $PHASE_START -le 4 && $PHASE_END -ge 4 ]]; then
    echo -e "${CYAN}[Phase 4/6] Statistician — Analysis + Pre-computed Measures${NC}"
    claude --print "$(cat agents/02_statistician.md)" 2>&1 | tee docs/log_statistician.txt
    echo -e "${GREEN}✓ Phase 4 complete${NC}\n"
fi

# Phase 5: Power BI Architect
if [[ $PHASE_START -le 5 && $PHASE_END -ge 5 ]]; then
    echo -e "${CYAN}[Phase 5/6] Power BI Architect — DAX + Dashboard Spec${NC}"
    claude --print "$(cat agents/04_powerbi_architect.md)" 2>&1 | tee docs/log_powerbi.txt
    echo -e "${GREEN}✓ Phase 5 complete${NC}\n"
fi

# Phase 6: Writer
if [[ $PHASE_START -le 6 && $PHASE_END -ge 6 ]]; then
    echo -e "${CYAN}[Phase 6/6] Writer — EMBA Paper${NC}"
    claude --print "$(cat agents/05_writer.md)" 2>&1 | tee docs/log_writer.txt
    echo -e "${GREEN}✓ Phase 6 complete${NC}\n"
fi

echo "========================================="
echo -e "${GREEN} All requested phases complete!${NC}"
echo "========================================="
echo ""
echo "★ POWER BI FILES (load these into Power BI Desktop):"
echo "  data/powerbi/fact_plus2_events.csv"
echo "  data/powerbi/fact_goal_timeline.csv"
echo "  data/powerbi/dim_season.csv"
echo "  data/powerbi/dim_team.csv"
echo "  data/powerbi/dim_match.csv"
echo "  data/powerbi/dim_minute_bucket.csv"
echo "  data/powerbi/summary_*.csv (pre-computed stats)"
echo "  data/powerbi/epl_study_theme.json (color theme)"
echo ""
echo "★ POWER BI SETUP GUIDES:"
echo "  docs/powerbi_load_instructions.md"
echo "  docs/dax_measures.md"
echo "  docs/powerbi_spec.md"
echo ""
echo "★ PAPER:"
echo "  docs/paper_draft.md"
echo ""
echo "★ STATIC FIGURES (fallback):"
echo "  docs/figures/"
echo ""
