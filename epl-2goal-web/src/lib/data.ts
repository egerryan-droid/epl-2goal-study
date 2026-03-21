export interface Plus2Event {
  event_id: string;
  match_key: number;
  season_key: string;
  leader_team_key: string;
  opponent_team_key: string;
  bucket_key: string;
  minute_reached_plus2: number;
  stoppage_flag: boolean;
  leader_is_home: boolean;
  score_at_event_leader: number;
  score_at_event_opponent: number;
  score_at_event_display: string;
  final_leader_goals: number;
  final_opponent_goals: number;
  result_for_leader: 'W' | 'D' | 'L';
  is_win: number;
  is_draw: number;
  is_loss: number;
  points_earned: number;
  points_dropped: number;
  leader_red_cards: number;
  opponent_red_cards: number;
  leader_prematch_win_odds: number | null;
  opponent_prematch_win_odds: number | null;
  draw_odds: number | null;
  leader_implied_prob: number | null;
  strength_tier: string | null;
}

export interface GoalEvent {
  goal_id: string;
  match_key: number;
  season_key: string;
  scoring_team_key: string;
  minute: number;
  scoring_side: 'home' | 'away';
  is_own_goal: boolean;
  player: string | null;
  running_home: number;
  running_away: number;
  running_diff: number;
  is_plus2_moment: boolean;
}

export interface Season {
  season_key: string;
  season_label: string;
  season_short: string;
  start_year: number;
  end_year: number;
  sort_order: number;
}

export interface Team {
  team_key: string;
  team_display_name: string;
  team_short: string;
  city: string | null;
  seasons_in_sample: number;
}

export interface Match {
  match_key: number;
  match_date: string;
  match_year: number;
  match_month: number;
  match_day_of_week: string;
  season_key: string;
  home_team_key: string;
  away_team_key: string;
  final_home_goals: number;
  final_away_goals: number;
  full_time_result: string;
  total_goals: number;
  had_plus2_event: boolean;
  match_label: string;
}

export interface MinuteBucket {
  bucket_key: string;
  bucket_label: string;
  bucket_order: number;
  half: string;
  min_minute: number;
  max_minute: number;
  bucket_description: string;
}

export interface SummaryOverall {
  metric: string;
  value: number;
  ci_low: number | null;
  ci_high: number | null;
  n: number;
}

export interface SummaryBucket {
  bucket_key: string;
  bucket_order: number;
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  win_ci_low: number;
  win_ci_high: number;
  draw_rate: number;
  loss_rate: number;
  points_dropped: number;
  is_locked_90: number;
  is_locked_95: number;
}

export interface SummarySeason {
  season_key: string;
  sort_order: number;
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  points_dropped: number;
}

export interface SummaryTeam {
  team_key: string;
  n_as_leader: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  points_dropped: number;
  n_as_opponent: number;
  times_opponent_held: number;
}

export interface SummaryRegression {
  variable: string;
  coefficient: number;
  odds_ratio: number;
  p_value: number;
  ci_low: number;
  ci_high: number;
  significant: string;
}

export type GoalsByMatch = Record<string, GoalEvent[]>;

export interface DrawEvent {
  event_id: string;
  match_key: number;
  season: string;
  leader_team: string;
  opponent_team: string;
  leader_is_home: boolean;
  bucket: string;
  minute_reached_plus2: number;
  final_score: string;
  strength_tier: string;
  goals: GoalDetail[];
}

export interface GoalDetail {
  minute: number;
  scorer: string;
  team: 'leader' | 'opponent';
  running_score: string;
}

export interface HalfSummary {
  half: 'H1' | 'H2';
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  draw_rate: number;
  loss_rate: number;
  buckets: string[];
}
