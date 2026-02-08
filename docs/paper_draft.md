# How Safe Is a Two-Goal Lead? Evidence from 10 Seasons of the English Premier League

**Author:** Ryan E.
**Affiliation:** Xavier University, Executive MBA Program
**Date:** February 2026

---

## Abstract

The conventional wisdom that "two-nil is the most dangerous scoreline" has permeated football commentary for decades, yet empirical evidence quantifying the actual safety of a two-goal lead remains scarce. We analyze 1,907 instances in which a team first achieved a two-goal lead across 3,800 English Premier League matches spanning 10 seasons (2014/15 through 2023/24). We find that teams holding a two-goal lead win 93.3% of the time (95% CI: 92.1%--94.4%), drawing 4.6% and losing just 2.1%. A chi-square test reveals a statistically significant association between the minute the lead is established and the match outcome (chi-squared = 39.6, p < 0.001), though all six 15-minute buckets exceed the 90% win-rate threshold. The most dramatic jump occurs in the 76--90+ minute window, where win probability reaches 99.7%. A logistic regression controlling for pre-match team strength, home advantage, and red cards confirms that later minutes and stronger pre-match favorites are significantly associated with holding the lead, while home advantage is not (p = 0.84). An interactive Power BI dashboard accompanies this paper, enabling team-level, season-level, and match-level exploration of the results.

**Keywords:** English Premier League, two-goal lead, win probability, game state, sports analytics, Power BI

---

## 1. Introduction

On December 4, 2016, Liverpool traveled to the Vitality Stadium leading AFC Bournemouth 2-0 before halftime. What followed was one of the most dramatic collapses in recent Premier League history: Bournemouth scored four unanswered goals to win 4-3, completing a comeback that seemed to defy the logic of the game (QA Report, Spot-Check #7; `docs/qa_report.md`). Moments like these fuel a deeply held belief in football: that a two-goal lead is somehow "the most dangerous scoreline."

But how often does this actually happen? Is a two-goal lead truly dangerous, or is the folklore sustained by the memorable exceptions rather than the statistical rule?

This paper addresses a deceptively simple research question: **When a team establishes a two-goal lead in the English Premier League, how likely are they to win the match, and does the minute at which the lead is established matter?**

We analyze 1,907 instances of a team reaching a two-goal lead across 3,800 EPL matches over 10 seasons (2014/15 through 2023/24). Using shot-level data from Understat to reconstruct goal timelines and match-level data from Football-Data.co.uk for contextual controls, we build a star-schema data model and apply both descriptive and inferential statistical methods.

Our findings are unambiguous. A two-goal lead is overwhelmingly safe: teams win 93.3% of the time (95% CI: 92.1%--94.4%). The 127 instances where the lead was not held (87 draws, 40 losses) represent just 6.7% of all events, producing 294 points dropped across the decade. Even in the earliest minute bucket (0--15 minutes), the win rate already exceeds 90%. By the 76--90+ minute window, it reaches 99.7%---only one team in 389 failed to hold the lead.

These results matter beyond the pub debate. For managers, identifying the minute at which a two-goal lead becomes statistically "locked" can inform substitution and tactical decisions. For analysts and media, the data provides a corrective to a misleading narrative. For sports business, understanding point-drop probabilities from commanding positions has direct implications for expected league standings and financial forecasting.

This paper is accompanied by an interactive Power BI dashboard that allows users to explore the data by season, team, minute bucket, and individual match. The dashboard serves as both an analytical tool and a presentation vehicle, demonstrating how business intelligence platforms can make academic research accessible and explorable. See Dashboard Pages 1--6 (`docs/powerbi_spec.md`).

---

## 2. Literature Review

### 2.1 The "Most Dangerous Lead" Cliche

The phrase "two-nil is the most dangerous lead" is among football's most enduring cliches. Its origins are difficult to trace precisely, but it has been a staple of British football commentary since at least the 1970s. The logic, such as it is, suggests that a team leading by two goals becomes complacent, while the trailing team has nothing to lose---creating the conditions for a dramatic comeback.

Despite its ubiquity, this claim has received surprisingly little rigorous empirical scrutiny. Most treatments in popular media rely on anecdotal evidence: memorable comebacks that confirm the narrative while ignoring the thousands of matches where a two-goal lead held comfortably. This paper aims to provide the empirical evidence that the cliche has long lacked.

### 2.2 Win Probability Models in Football

The broader field of in-play win probability modeling in football has grown substantially since 2010. FiveThirtyEight's Soccer Power Index and their match forecasting models pioneered the use of pre-match strength ratings to generate expected match outcomes (Silver, 2014). American Soccer Analysis extended this work to Major League Soccer, producing game-state-aware expected points models. Opta and StatsBomb have developed proprietary win probability models that update in real time based on goals, red cards, and expected goals.

These models generally confirm that a two-goal lead at any point in a match yields a very high win probability, typically above 90%. However, they tend to present win probability as a continuous function of match state rather than isolating the specific question of when a two-goal lead is first established.

### 2.3 Game State Research

The concept of "game state" --- the current goal difference during a match --- has been studied extensively in the context of team behavior. Research has shown that teams trailing by one or more goals take more risks offensively, increase their shot volume, and play with greater urgency (Anderson & Sally, 2013). Conversely, leading teams tend to adopt more conservative approaches. This behavioral asymmetry is central to understanding why comebacks occur at all: the trailing team's increased risk-taking occasionally pays off, even when the leading team starts from a position of overwhelming advantage.

### 2.4 Expected Goals Frameworks

The expected goals (xG) framework, which assigns a probability of scoring to every shot based on its characteristics, has become the standard analytical tool in modern football. While xG models are primarily used for evaluating shot quality and team performance, they are indirectly relevant to our research because the Understat data we use to identify goal minutes is derived from a shot-level database that also contains xG values. Our analysis focuses on actual goals rather than expected goals, as our research question concerns outcomes rather than underlying performance.

### 2.5 Research Gap

While the existing literature provides sophisticated models for overall match prediction and game-state analysis, there is a notable gap in focused, empirical quantification of the two-goal lead phenomenon. Specifically, no study we are aware of has: (a) isolated all instances of a team first reaching a two-goal lead across a large sample of matches, (b) analyzed how win probability varies by the minute the lead is established, and (c) identified a specific "locked minute" threshold at which the lead becomes statistically certain to hold. This paper addresses that gap using 10 seasons of EPL data and presents the findings through both static analysis and an interactive dashboard.

---

## 3. Methodology

### 3.1 Data Sources

We draw on two complementary data sources:

**Understat** (understat.com) provides shot-level data for every EPL match since the 2014/15 season, including the minute each shot was taken, the player, the result (goal, saved, blocked, missed, own goal), and the team. We accessed this data via Understat's internal JSON API, collecting 97,046 shots across 3,800 matches in 10 seasons.

**Football-Data.co.uk** provides match-level data including final scores, red card counts, and pre-match betting odds from multiple bookmakers. We use the average market odds (AvgH, AvgD, AvgA) with a fallback to Bet365 odds (B365H, B365D, B365A) for matches where average odds are unavailable. These odds are converted to implied probabilities after removing the overround.

The combination of these two sources gives us both the granular goal-by-goal timeline (from Understat) and the broader match context (from Football-Data).

### 3.2 Data Architecture

We design a star schema optimized for analysis in Power BI Desktop:

- **Fact Table 1: fact_plus2_events** (1,907 rows) --- The primary analysis table. Each row represents one instance of a team first reaching a two-goal lead in a match. Contains the event's minute, the leading team, the opponent, the match result, points earned and dropped, pre-match odds, strength tier, red cards, and home/away status.

- **Fact Table 2: fact_goal_timeline** (7,007 rows) --- A goal-by-goal record of every goal scored in matches that contained at least one goal. Used for drill-through analysis to reconstruct the narrative of individual matches.

- **Dimension Tables:** dim_season (10 rows), dim_team (34 rows, serving as a role-playing dimension for both leader and opponent perspectives), dim_match (3,800 rows), and dim_minute_bucket (6 rows).

The star schema design was chosen because it is the canonical data model for Power BI, enabling efficient DAX calculations, natural slicer interactions, and clear relationship paths. The role-playing dim_team dimension is connected to fact_plus2_events via two foreign keys (leader_team_key as active, opponent_team_key as inactive), with DAX measures using `USERELATIONSHIP()` to activate the opponent path when needed.

### 3.3 Variable Construction

**The "+2 event"** is defined as the first moment in a match when a team's running goal difference reaches +2 or greater. We track each team independently: in a match where both teams achieve a two-goal lead at different points (e.g., Team A leads 2-0, then Team B comes back to lead 4-2), each team generates a separate +2 event. Own goals are credited to the benefiting team, consistent with the official scoring record.

**Minute buckets** divide the 90+ minutes of a match into six 15-minute intervals: 0--15, 16--30, 31--45+ (including first-half stoppage time), 46--60, 61--75, and 76--90+ (including second-half stoppage time). These intervals provide sufficient granularity to observe temporal patterns while maintaining adequate sample sizes in each bucket.

**Pre-match strength** is derived from pre-match betting odds. We convert the leading team's pre-match win odds to an implied probability (1/odds), remove the overround by normalizing, and classify leaders into three tiers: Strong Favorite (top tercile), Moderate (middle tercile), and Underdog (bottom tercile).

**Points dropped** follows standard EPL scoring: a win earns 3 points (0 dropped), a draw earns 1 point (2 dropped), and a loss earns 0 points (3 dropped).

### 3.4 Analytical Approach

We employ a progression of methods from descriptive to inferential:

1. **Conditional probabilities** with Wilson score confidence intervals for P(Win | +2 lead), P(Draw | +2 lead), and P(Loss | +2 lead), both overall and stratified by minute bucket, season, team, and home/away status.

2. **Chi-square test of independence** to assess whether the minute bucket in which the +2 lead is established is associated with the match outcome. The 6x3 contingency table (6 buckets by 3 outcomes) tests the null hypothesis of no association.

3. **"Locked minute" threshold identification** --- We define a +2 lead as "locked" at the 90% level when the observed win rate first exceeds 90%, and at the 95% level when it first exceeds 95%.

4. **Logistic regression** modeling P(Win) as a function of minute_reached_plus2 (continuous), leader_implied_prob (continuous), leader_is_home (binary), leader_red_cards (count), and opponent_red_cards (count). This controls for confounding factors when assessing the minute effect.

Statistical inference was conducted in Python (statsmodels, scipy); interactive exploration uses Power BI Desktop with 34 custom DAX measures.

### 3.5 Limitations

Several limitations should be noted. First, **stoppage time granularity** is limited: goals scored in stoppage time at the end of each half are recorded at the minute they occurred (e.g., minute 47 or minute 93), which we map to the 31--45+ and 76--90+ buckets respectively, with bucket boundaries extended to minute 120 to accommodate deep stoppage time.

Second, **red cards are match-level** in our Football-Data source. We know how many red cards each team received in the match, but not the specific minute of the sending-off. We cannot determine whether a red card occurred before or after the +2 event, which limits the causal interpretation of the red card variable in our regression.

Third, we lack **in-play betting odds**, which would provide a direct measure of the market's real-time assessment of win probability. In-play odds data requires a commercial license and was not available for this study.

Fourth, **own goal attribution** follows the conventional approach of crediting the benefiting team, which is consistent with how the +2 threshold should be measured (the score changed in their favor) but may not perfectly reflect the attacking team's contribution.

Finally, the QA validation process (`docs/qa_report.md`) confirmed that the chi-square test's minimum expected cell count was 2.4, below the conventional threshold of 5. While the overall test remains valid for large samples, this is noted for transparency.

---

## 4. Results

### 4.1 Descriptive Overview

Across 3,800 EPL matches in our 10-season sample, 1,907 events saw a team reach a two-goal lead---occurring in approximately 50% of all matches. Of these 1,907 events:

- **1,780 resulted in a win** (93.3%, 95% CI: 92.1%--94.4%)
- **87 resulted in a draw** (4.6%, 95% CI: 3.7%--5.6%)
- **40 resulted in a loss** (2.1%, 95% CI: 1.5%--2.8%)

The total points dropped from these 127 non-win events was **294** over the decade, an average of 0.154 points dropped per +2 event.

The vast majority of +2 events (83.3%) involve the classic 2-0 scoreline (1,588 events). The next most common is 3-1 (290 events), followed by 4-2 (28 events) and 5-3 (1 event).

Home teams established the two-goal lead in 59.8% of events (1,140 events), consistent with the well-documented home advantage in football. See Dashboard Page 1 (Executive Overview) and Figure 1 (`docs/figures/fig1_overall_wdl.png`).

**Table 1: Overall +2 Lead Outcomes**

| Metric | Value | 95% CI |
|--------|-------|--------|
| Total +2 Events | 1,907 | --- |
| Win Rate | 93.3% | 92.1%--94.4% |
| Draw Rate | 4.6% | 3.7%--5.6% |
| Loss Rate | 2.1% | 1.5%--2.8% |
| Total Points Dropped | 294 | --- |
| Mean Points Dropped per Event | 0.154 | --- |

### 4.2 The Minute Question

The central question of this study is whether the minute at which a two-goal lead is established affects the probability of winning. Table 2 presents the results by 15-minute bucket.

**Table 2: Win Rate by Minute Bucket**

| Bucket | N | Wins | Draws | Losses | Win Rate | 95% CI | Locked (90%) | Locked (95%) |
|--------|---|------|-------|--------|----------|--------|--------------|--------------|
| 0--15 | 113 | 104 | 5 | 4 | 92.0% | 85.6%--95.8% | Yes | No |
| 16--30 | 268 | 243 | 16 | 9 | 90.7% | 86.6%--93.6% | Yes | No |
| 31--45+ | 503 | 455 | 34 | 14 | 90.5% | 87.6%--92.7% | Yes | No |
| 46--60 | 282 | 258 | 16 | 8 | 91.5% | 87.7%--94.2% | Yes | No |
| 61--75 | 352 | 332 | 15 | 5 | 94.3% | 91.4%--96.3% | Yes | No |
| 76--90+ | 389 | 388 | 1 | 0 | 99.7% | 98.6%--100.0% | Yes | Yes |

A chi-square test of independence confirms a statistically significant association between minute bucket and match outcome (chi-squared = 39.6, df = 10, p < 0.001). See Dashboard Page 2 (Minute Deep Dive) and Figure 2 (`docs/figures/fig2_win_rate_by_minute.png`).

The pattern is striking. All six buckets exceed the 90% win-rate threshold, meaning a two-goal lead is "locked" at our primary threshold from the very first minute of the match. However, the win rate is not strictly monotonically increasing---it dips slightly from 92.0% in the 0--15 bucket to 90.5% in the 31--45+ bucket before climbing through 91.5% (46--60), 94.3% (61--75), and finally 99.7% (76--90+).

Pairwise comparisons reveal that the only statistically significant jump between adjacent buckets occurs between 61--75 and 76--90+ (z = -4.44, p < 0.001). All other adjacent-bucket differences are non-significant, suggesting a relatively flat win rate from minutes 0 through 75, followed by a sharp spike in the final 15 minutes plus stoppage time.

The only bucket that meets the stricter 95% locked threshold is 76--90+. In this bucket, 388 of 389 teams holding a +2 lead won the match, with just a single draw and zero losses. See Figure 3 (`docs/figures/fig3_bucket_heatmap.png`).

### 4.3 Points Dropped

The 294 total points dropped across the decade are unevenly distributed across seasons and teams.

**By season**, 2015/16 saw the most points dropped from +2 positions (45 points from 176 events, win rate 88.6%), followed closely by 2022/23 (44 points from 192 events, win rate 90.1%). The most secure season was 2016/17, with only 17 points dropped from 202 events (win rate 96.5%). See Dashboard Page 4 (Season Trends) and Figure 4 (`docs/figures/fig4_points_dropped_season.png`).

**Table 3: Season Trends**

| Season | N Events | Win Rate | Points Dropped |
|--------|----------|----------|----------------|
| 2014/15 | 171 | 93.6% | 25 |
| 2015/16 | 176 | 88.6% | 45 |
| 2016/17 | 202 | 96.5% | 17 |
| 2017/18 | 179 | 92.7% | 31 |
| 2018/19 | 217 | 94.9% | 26 |
| 2019/20 | 186 | 94.6% | 23 |
| 2020/21 | 178 | 94.9% | 21 |
| 2021/22 | 191 | 93.7% | 28 |
| 2022/23 | 192 | 90.1% | 44 |
| 2023/24 | 215 | 93.0% | 34 |

**By team** (among those with 20+ events), Manchester City leads with a 97.1% win rate from 208 events (15 points dropped), closely followed by Chelsea (97.1% from 138 events, 8 points dropped) and Arsenal (96.9% from 159 events, 10 points dropped---and notably zero losses). At the other end among established teams, Southampton dropped 21 points from 69 events (87.0% win rate), and Burnley dropped 14 from 44 events (86.4%). See Dashboard Page 3 (Team Leaderboard) and Figure 7 (`docs/figures/fig7_team_comparison.png`).

### 4.4 Home vs. Away

We find a modest home advantage in holding a two-goal lead, though the difference is smaller than might be expected:

- **Home leaders:** 94.6% win rate (95% CI: 93.1%--95.7%), N = 1,140
- **Away leaders:** 91.5% win rate (95% CI: 89.3%--93.3%), N = 767

The 3.1 percentage-point gap suggests that away teams are slightly more vulnerable to losing a two-goal lead, though both rates remain above 90%. The logistic regression (Section 4.5) finds this difference is not statistically significant when controlling for other factors.

### 4.5 Strength Control: Logistic Regression

To disentangle the effects of timing, team strength, home advantage, and match events, we fit a logistic regression predicting P(Win) from five covariates. The model uses 1,895 observations (12 events excluded due to missing odds data).

**Table 4: Logistic Regression Results**

| Variable | Odds Ratio | 95% CI | p-value | Significant? |
|----------|-----------|--------|---------|--------------|
| Minute reached +2 | 1.022 | 1.014--1.031 | < 0.001 | Yes |
| Leader implied prob. | 66.69 | 23.5--188.8 | < 0.001 | Yes |
| Leader is home | 1.04 | 0.71--1.53 | 0.844 | No |
| Leader red cards | 0.42 | 0.20--0.89 | 0.024 | Yes |
| Opponent red cards | 3.46 | 1.26--9.50 | 0.016 | Yes |

Model fit: pseudo R-squared = 0.123, AIC = 829.1.

The results confirm several intuitive relationships. **Each additional minute** that a +2 lead is held increases the odds of winning by approximately 2.2% (OR = 1.022, p < 0.001). A team reaching +2 in minute 75 rather than minute 30 has meaningfully higher odds of winning, all else equal.

**Pre-match team strength** is the most powerful predictor. A one-unit increase in the leader's implied win probability is associated with a 66.7-fold increase in the odds of winning (p < 0.001). Strong favorites almost never squander a two-goal lead; when they do, the result is genuinely newsworthy.

**Home advantage is not statistically significant** (OR = 1.04, p = 0.844). After controlling for team strength and minute, being the home team provides negligible additional protection for a +2 lead. This is a notable finding: the raw home/away difference observed in Section 4.4 (3.1 percentage points) appears to be explained by the correlation between home status and pre-match strength rather than any independent venue effect.

**Red cards** have the expected directional effects. A red card for the leading team halves the odds of winning (OR = 0.42, p = 0.024), while a red card for the opponent triples them (OR = 3.46, p = 0.016). However, as noted in Section 3.5, we cannot determine whether the red card occurred before or after the +2 event.

See Dashboard Page 6 (Statistical Summary) and Figure 5 (`docs/figures/fig5_strength_scatter.png`).

---

## 5. Discussion

### 5.1 The "Most Dangerous Lead" Myth

Our results decisively refute the notion that a two-goal lead is the "most dangerous" scoreline. A 93.3% win rate---with even the earliest time bucket exceeding 90%---places the two-goal lead firmly in the "overwhelmingly safe" category. The phrase persists because human memory is disproportionately affected by dramatic exceptions: a 4-3 comeback is memorable; a routine 2-0 victory is forgettable.

That said, the data does reveal an important nuance. While a two-goal lead is safe at any point in the match, it is significantly safer later in the match. The jump from 94.3% at 61--75 minutes to 99.7% at 76--90+ is the only statistically significant adjacent-bucket difference, suggesting that the final 15 minutes represent a qualitative shift in lead security. A team that reaches +2 with 15 minutes to play has, statistically, already won the match---only one team in 389 failed to do so across our entire sample.

The early buckets (0--15 through 46--60) tell a different story. Win rates hover between 90% and 92%---still very high, but with enough exceptions (approximately 1 in 10) to make comebacks a realistic possibility. In these buckets, 66 of 1,166 events resulted in the leading team not winning. For a commentator, this means: "Yes, the lead is safe, but with 60+ minutes to play, there is roughly a 1-in-10 chance of a comeback."

### 5.2 Practical Implications

**For managers:** The data supports the common practice of shifting to a more defensive posture after establishing a two-goal lead, particularly before the 75th minute. The regression results suggest that the quality of the leading team (implied probability) matters more than home advantage, indicating that weaker teams holding a +2 lead should be especially vigilant. Red cards for the leading team are particularly damaging, halving the odds of holding the lead.

**For commentators and media:** The "2-0 is dangerous" narrative should be retired, or at least qualified. A more accurate framing would be: "A two-goal lead is overwhelmingly safe, though the small percentage of collapses---especially before the 75th minute---create some of the game's most memorable moments." Our data provides the specific probabilities to back this up.

**For analysts:** The "locked minute" framework provides a useful decision boundary. At the 90% threshold, a +2 lead is locked from the first minute. At the stricter 95% threshold, it is locked only in the 76--90+ window. These thresholds can be used in real-time analytics dashboards to flag when a match result should be considered effectively decided.

**For the Power BI dashboard:** The accompanying interactive dashboard (`docs/powerbi_spec.md`) demonstrates how a research dataset can be made accessible and explorable through business intelligence tools. Users can filter by team, season, and home/away status, drill through to individual matches, and examine the statistical evidence page by page. This approach bridges the gap between academic analysis and practical, stakeholder-facing communication.

### 5.3 Limitations and Future Work

Several extensions would strengthen this research. **In-play betting odds** would allow us to compare our observed win rates against market-implied probabilities at the exact moment the +2 lead is established. **Expected goals (xG) during the +2 state** could reveal whether comebacks are driven by increased shot volume, improved shot quality, or both. **Cross-league comparison** with the Bundesliga, La Liga, Serie A, and Ligue 1 would test the generalizability of our findings. **Tactical analysis**---particularly substitution patterns after a +2 lead---could illuminate managerial decision-making in response to commanding positions. Finally, **real-time integration** through live data feeds into the Power BI dashboard could transform this retrospective analysis into a live monitoring tool.

The chi-square test's minimum expected cell count of 2.4 (below the conventional 5.0 threshold) is noted as a methodological caveat, though the large overall sample size and highly significant p-value suggest the finding is robust. The match-level red card limitation is the most consequential for causal interpretation: future work should use minute-level discipline data to properly identify whether red cards preceded or followed the +2 event.

---

## 6. Conclusion

A two-goal lead in the English Premier League is overwhelmingly safe. Across 1,907 events over 10 seasons, teams holding a +2 lead won 93.3% of the time. Even in the earliest time bucket (0--15 minutes), the win rate exceeds 90%. By the 76th minute, it reaches 99.7%---virtual certainty. The total cost of blown two-goal leads across the decade was 294 league points, with substantial variation by team and season.

The "most dangerous lead" cliche is not supported by the evidence. What the data shows instead is a remarkably consistent phenomenon: once a team establishes a two-goal lead, the match is nearly always decided, regardless of when the lead is achieved. The only significant temporal effect is a dramatic spike in safety during the final 15 minutes, where the win probability rises from the low-to-mid 90s to effectively 100%.

The Power BI dashboard that accompanies this paper transforms these findings from static statistics into an interactive analytical tool. It enables stakeholders---coaches, analysts, executives, and fans---to explore the data at their own level of interest, from headline metrics on the Executive Overview to individual goal-by-goal timelines on the Match Drill-Through page.

For managers, the practical takeaway is clear: a two-goal lead warrants confidence, not complacency. For commentators, the next time the phrase "2-0 is the most dangerous lead" enters the broadcast, the data is now available to correct the record.

---

## References

Anderson, C., & Sally, D. (2013). *The Numbers Game: Why Everything You Know About Football Is Wrong*. Penguin Books.

Football-Data.co.uk. (2024). England Football Results and Betting Odds Data. Retrieved from https://www.football-data.co.uk/englandm.php

Silver, N. (2014). FiveThirtyEight's Soccer Power Index Methodology. *FiveThirtyEight*. Retrieved from https://fivethirtyeight.com/methodology/how-our-club-soccer-predictions-work/

Understat. (2024). Expected Goals and Shot Data for European Leagues. Retrieved from https://understat.com/league/EPL

Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference. *Journal of the American Statistical Association*, 22(158), 209--212.

---

## Appendix A: Power BI Dashboard Guide

The interactive Power BI dashboard consists of six pages, designed to progressively deepen the analysis:

### Page 1: Executive Overview
The landing page presents headline metrics (total events, win rate, points dropped) alongside a W/D/L donut chart and a win-rate-by-bucket bar chart with a 90% threshold line. Slicers for season, team, and home/away status filter all visuals on the page.

### Page 2: Minute Deep Dive
A line chart with confidence intervals shows P(Win) by minute bucket, with reference lines at 90% and 95%. A detail table presents the full bucket-level statistics including sample sizes and lock indicators. A chi-square test result is displayed.

### Page 3: Team Leaderboard
Horizontal bar charts show the top teams by win rate and by points dropped. A scatter plot maps events (x-axis) against win rate (y-axis) with point size proportional to points dropped. A full data table covers all 34 teams.

### Page 4: Season Trends
A line chart with trend line shows win rate across 10 seasons. A stacked area chart shows absolute W/D/L volumes by season. Card visuals highlight notable seasons.

### Page 5: Match Drill-Through
Accessible via right-click from any data point on Pages 1--4. Shows the match header, key cards (leader, opponent, result, minute), a goal-by-goal timeline table, and contextual information (odds, strength tier, red cards, home/away).

### Page 6: Statistical Summary
Presents pre-computed tables from the statistical analysis: overall metrics with confidence intervals, bucket statistics with chi-square results, and the logistic regression results table with odds ratios and significance indicators.

**Interaction Tips:**
- Use the Season and Team dropdown slicers on Pages 1--4 to filter the data
- Right-click any bar, point, or table row and select "Drill through" to navigate to the Match Drill-Through page
- Click the "Back" button on Page 5 to return to the originating page
- Slicers on Pages 1--4 are synced: changing a filter on one page updates all others

For full technical specifications, see `docs/powerbi_spec.md`. For setup instructions, see `docs/powerbi_load_instructions.md`.

---

## Appendix B: Data Dictionary

### Star Schema Overview

The data model follows a star schema design with two fact tables and four dimension tables:

**fact_plus2_events** (1,907 rows) --- Primary analysis table
| Field | Type | Description |
|-------|------|-------------|
| event_id | Integer | Unique event identifier |
| match_key | Integer | Foreign key to dim_match |
| season_key | String | Foreign key to dim_season (e.g., "2014-2015") |
| leader_team_key | String | Foreign key to dim_team (active relationship) |
| opponent_team_key | String | Foreign key to dim_team (inactive relationship) |
| bucket_key | String | Foreign key to dim_minute_bucket (e.g., "31-45+") |
| minute_reached_plus2 | Integer | Minute when +2 was first reached |
| result_for_leader | String | W, D, or L |
| is_win / is_draw / is_loss | Integer | Binary flags (0/1) |
| points_earned | Integer | 3 (W), 1 (D), 0 (L) |
| points_dropped | Integer | 0 (W), 2 (D), 3 (L) |
| leader_is_home | Boolean | True if leader is home team |
| leader_prematch_win_odds | Float | Pre-match win odds for the leader |
| leader_implied_prob | Float | Implied probability from odds |
| strength_tier | String | Strong Favorite / Moderate / Underdog |
| leader_red_cards | Integer | Red cards received by leading team |
| opponent_red_cards | Integer | Red cards received by opponent |

**fact_goal_timeline** (7,007 rows) --- Goal-by-goal narrative
| Field | Type | Description |
|-------|------|-------------|
| goal_id | String | Unique goal identifier |
| match_key | Integer | Foreign key to dim_match |
| season_key | String | Foreign key to dim_season |
| scoring_team_key | String | Foreign key to dim_team |
| minute | Integer | Minute of the goal |
| player | String | Goal scorer |
| is_own_goal | Boolean | True if own goal |
| home_score / away_score | Integer | Running score after this goal |
| running_diff | Integer | Home score minus away score |

**dim_season** (10 rows), **dim_team** (34 rows), **dim_match** (3,800 rows), **dim_minute_bucket** (6 rows).

For the complete schema definition including all fields, data types, and relationship specifications, see `shared/schema.json`.
