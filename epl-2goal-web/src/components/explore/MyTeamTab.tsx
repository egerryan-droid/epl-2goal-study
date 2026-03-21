'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type {
  Team,
  SummaryTeam,
  Plus2Event,
  DrawEvent,
  SummaryBucket,
} from '@/lib/data';
import KpiCard from '@/components/ui/KpiCard';
import TeamCrest from '@/components/ui/TeamCrest';

const RadialBucketChart = dynamic(
  () => import('@/components/charts/RadialBucketChart'),
  { ssr: false },
);
const CollapseTimeline = dynamic(
  () => import('@/components/charts/CollapseTimeline'),
  { ssr: false },
);
const AnimatedDonut = dynamic(
  () => import('@/components/charts/AnimatedDonut'),
  { ssr: false },
);

interface MyTeamTabProps {
  teamKey: string | null;
  teams: Team[];
  summaryTeams: SummaryTeam[];
  events: Plus2Event[];
  drawEvents: DrawEvent[];
  bucketData: SummaryBucket[];
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function MyTeamTab({
  teamKey,
  teams,
  summaryTeams,
  events,
  drawEvents,
}: MyTeamTabProps) {
  /* ---- Derived data for the selected team ---- */

  const team = useMemo(
    () => teams.find((t) => t.team_key === teamKey) ?? null,
    [teams, teamKey],
  );

  const summary = useMemo(
    () => summaryTeams.find((s) => s.team_key === teamKey) ?? null,
    [summaryTeams, teamKey],
  );

  const teamBuckets: SummaryBucket[] = useMemo(() => {
    if (!teamKey) return [];

    const teamEvents = events.filter((e) => e.leader_team_key === teamKey);

    const grouped = new Map<
      string,
      { n: number; wins: number; draws: number; losses: number; pd: number }
    >();

    for (const ev of teamEvents) {
      const key = ev.bucket_key;
      let g = grouped.get(key);
      if (!g) {
        g = { n: 0, wins: 0, draws: 0, losses: 0, pd: 0 };
        grouped.set(key, g);
      }
      g.n += 1;
      g.wins += ev.is_win;
      g.draws += ev.is_draw;
      g.losses += ev.is_loss;
      g.pd += ev.points_dropped;
    }

    // Build SummaryBucket[] — bucket_order derived from bucket_key sort
    const bucketKeys = Array.from(grouped.keys()).sort();
    return bucketKeys.map((bk, idx) => {
      const g = grouped.get(bk)!;
      const wr = g.n > 0 ? g.wins / g.n : 0;
      return {
        bucket_key: bk,
        bucket_order: idx + 1,
        n: g.n,
        wins: g.wins,
        draws: g.draws,
        losses: g.losses,
        win_rate: wr,
        win_ci_low: wr,
        win_ci_high: wr,
        draw_rate: g.n > 0 ? g.draws / g.n : 0,
        loss_rate: g.n > 0 ? g.losses / g.n : 0,
        points_dropped: g.pd,
        is_locked_90: 0,
        is_locked_95: 0,
      } satisfies SummaryBucket;
    });
  }, [events, teamKey]);

  const teamDraws = useMemo(
    () => drawEvents.filter((d) => d.leader_team === teamKey),
    [drawEvents, teamKey],
  );

  /* ---- Empty state ---- */

  if (!teamKey || !team || !summary) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <svg className="h-16 w-16 text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <p className="text-text-muted font-display text-xl">
          Select a team above to explore their 2-goal lead record
        </p>
      </div>
    );
  }

  /* ---- Team selected ---- */

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div {...fade}>
        <div className="flex items-center gap-4">
          <TeamCrest team={team.team_key} size={72} />
          <h2 className="text-text-primary font-display text-4xl font-bold">
            {team.team_display_name}
          </h2>
        </div>
        <div className="mt-2 h-[2px] w-12 rounded-full bg-accent" />
        <p className="text-text-secondary mt-2 text-sm">
          2-Goal Lead Record
        </p>
      </motion.div>

      {/* KPI cards */}
      <motion.div
        {...fade}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <KpiCard
          value={summary.n_as_leader}
          label="Events"
          color={COLORS.accent}
        />
        <KpiCard
          value={summary.win_rate * 100}
          label="Win Rate"
          decimals={1}
          suffix="%"
          color={COLORS.win}
        />
        <KpiCard
          value={summary.draws}
          label="Draws"
          color={COLORS.draw}
        />
        <KpiCard
          value={summary.points_dropped}
          label="Points Dropped"
          color={COLORS.loss}
        />
      </motion.div>

      {/* W/D/L Donut */}
      <motion.div {...fade} transition={{ duration: 0.5, delay: 0.2 }}>
        <AnimatedDonut
          wins={summary.wins}
          draws={summary.draws}
          losses={summary.losses}
        />
      </motion.div>

      {/* Danger Profile */}
      {teamBuckets.length > 0 && (
        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.3 }}>
          <h3 className="text-text-primary mb-4 font-display text-xl font-semibold">
            When Are They Vulnerable?
          </h3>
          <RadialBucketChart data={teamBuckets} />
        </motion.div>
      )}

      {/* Collapse Stories */}
      {teamDraws.length > 0 && (
        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.4 }}>
          <h3 className="text-text-primary mb-4 font-display text-xl font-semibold">
            The Collapses ({teamDraws.length})
          </h3>
          <CollapseTimeline draws={teamDraws} />
        </motion.div>
      )}
    </div>
  );
}
