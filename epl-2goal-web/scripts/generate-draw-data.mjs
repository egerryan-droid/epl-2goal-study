import { readFileSync, writeFileSync } from 'fs';

// --- Draw Events ---
const events = JSON.parse(readFileSync('src/data/fact_plus2_events.json', 'utf8'));
const goalsByMatch = JSON.parse(readFileSync('src/data/goals_by_match.json', 'utf8'));

const drawEvents = events
  .filter(e => e.result_for_leader === 'D')
  .map(e => {
    const matchGoals = goalsByMatch[String(e.match_key)] || [];
    const leaderIsHome = e.leader_is_home;

    const goals = matchGoals.map(g => {
      const isLeaderGoal = leaderIsHome
        ? g.scoring_side === 'home'
        : g.scoring_side === 'away';

      return {
        minute: g.minute,
        scorer: g.player || 'Unknown',
        team: isLeaderGoal ? 'leader' : 'opponent',
        running_score: `${g.running_home}-${g.running_away}`,
      };
    });

    const finalScore = leaderIsHome
      ? `${e.final_leader_goals}-${e.final_opponent_goals}`
      : `${e.final_opponent_goals}-${e.final_leader_goals}`;

    return {
      event_id: e.event_id,
      match_key: e.match_key,
      season: e.season_key,
      leader_team: e.leader_team_key,
      opponent_team: e.opponent_team_key,
      leader_is_home: e.leader_is_home,
      bucket: e.bucket_key,
      minute_reached_plus2: e.minute_reached_plus2,
      final_score: finalScore,
      strength_tier: e.strength_tier || 'Unknown',
      goals,
    };
  });

writeFileSync('src/data/draw_events.json', JSON.stringify(drawEvents, null, 2));
console.log(`Generated ${drawEvents.length} draw events`);

// --- Half Stats ---
const bucketData = JSON.parse(readFileSync('src/data/summary_by_bucket.json', 'utf8'));

const h1Buckets = bucketData.filter(b => ['0-15', '16-30', '31-45+'].includes(b.bucket_key));
const h2Buckets = bucketData.filter(b => ['46-60', '61-75', '76-90+'].includes(b.bucket_key));

function aggregateHalf(label, buckets) {
  const n = buckets.reduce((s, b) => s + b.n, 0);
  const wins = buckets.reduce((s, b) => s + b.wins, 0);
  const draws = buckets.reduce((s, b) => s + b.draws, 0);
  const losses = buckets.reduce((s, b) => s + b.losses, 0);
  return {
    half: label,
    n,
    wins,
    draws,
    losses,
    win_rate: +(wins / n).toFixed(4),
    draw_rate: +(draws / n).toFixed(4),
    loss_rate: +(losses / n).toFixed(4),
    buckets: buckets.map(b => b.bucket_key),
  };
}

const halfStats = [
  aggregateHalf('H1', h1Buckets),
  aggregateHalf('H2', h2Buckets),
];

writeFileSync('src/data/summary_half_stats.json', JSON.stringify(halfStats, null, 2));
console.log('Generated half stats:', halfStats.map(h => `${h.half}: ${h.n} events, ${(h.draw_rate * 100).toFixed(1)}% draw rate`).join(' | '));
