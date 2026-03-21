'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Plus2Event, SummaryTeam, Team } from '@/lib/data';
import { COLORS } from '@/lib/theme';
import TeamSelector from '@/components/explore/TeamSelector';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HeadToHeadTabProps {
  teams: Team[];
  summaryTeams: SummaryTeam[];
  events: Plus2Event[];
}

interface TeamBucketStats {
  bucket_key: string;
  n: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  points_dropped: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BUCKETS = [
  { key: '0-15', label: '0\u201315' },
  { key: '16-30', label: '16\u201330' },
  { key: '31-45+', label: '31\u201345+' },
  { key: '46-60', label: '46\u201360' },
  { key: '61-75', label: '61\u201375' },
  { key: '76-90+', label: '76\u201390+' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function computeTeamStats(events: Plus2Event[], teamKey: string) {
  const teamEvents = events.filter((e) => e.leader_team_key === teamKey);
  const n = teamEvents.length;
  const wins = teamEvents.filter((e) => e.result_for_leader === 'W').length;
  const draws = teamEvents.filter((e) => e.result_for_leader === 'D').length;
  const losses = teamEvents.filter((e) => e.result_for_leader === 'L').length;
  const pointsDropped = teamEvents.reduce((s, e) => s + e.points_dropped, 0);
  return {
    n,
    wins,
    draws,
    losses,
    win_rate: n > 0 ? wins / n : 0,
    points_dropped: pointsDropped,
  };
}

function computeBucketStats(
  events: Plus2Event[],
  teamKey: string,
): TeamBucketStats[] {
  const teamEvents = events.filter((e) => e.leader_team_key === teamKey);
  return BUCKETS.map(({ key }) => {
    const bucketEvents = teamEvents.filter((e) => e.bucket_key === key);
    const n = bucketEvents.length;
    const wins = bucketEvents.filter((e) => e.result_for_leader === 'W').length;
    const draws = bucketEvents.filter(
      (e) => e.result_for_leader === 'D',
    ).length;
    const losses = bucketEvents.filter(
      (e) => e.result_for_leader === 'L',
    ).length;
    const pointsDropped = bucketEvents.reduce(
      (s, e) => s + e.points_dropped,
      0,
    );
    return {
      bucket_key: key,
      n,
      wins,
      draws,
      losses,
      win_rate: n > 0 ? wins / n : 0,
      points_dropped: pointsDropped,
    };
  });
}

function teamName(teams: Team[], key: string): string {
  return teams.find((t) => t.team_key === key)?.team_display_name ?? key;
}

function teamShort(teams: Team[], key: string): string {
  return teams.find((t) => t.team_key === key)?.team_short ?? key;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ComparisonCard({
  label,
  valueA,
  valueB,
  higherIsBetter,
  index,
}: {
  label: string;
  valueA: number;
  valueB: number;
  higherIsBetter: boolean;
  index: number;
}) {
  const aBetter = higherIsBetter ? valueA > valueB : valueA < valueB;
  const bBetter = higherIsBetter ? valueB > valueA : valueB < valueA;
  const tied = valueA === valueB;

  const format = (v: number) =>
    label === 'Win Rate' ? pct(v) : String(v);

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-lg glass card-hover p-4 text-center"
    >
      <p className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span
          className={`text-2xl font-bold ${
            tied
              ? 'text-text-primary'
              : aBetter
                ? 'text-win drop-shadow-[0_0_6px_rgba(46,204,113,0.3)]'
                : 'text-text-muted'
          }`}
        >
          {format(valueA)}
        </span>
        <span className="font-display text-sm text-text-muted">vs</span>
        <span
          className={`text-2xl font-bold ${
            tied
              ? 'text-text-primary'
              : bBetter
                ? 'text-win drop-shadow-[0_0_6px_rgba(46,204,113,0.3)]'
                : 'text-text-muted'
          }`}
        >
          {format(valueB)}
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function HeadToHeadTab({
  teams,
  summaryTeams,
  events,
}: HeadToHeadTabProps) {
  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);

  // Computed stats
  const statsA = useMemo(
    () => (teamA ? computeTeamStats(events, teamA) : null),
    [events, teamA],
  );
  const statsB = useMemo(
    () => (teamB ? computeTeamStats(events, teamB) : null),
    [events, teamB],
  );

  const bucketsA = useMemo(
    () => (teamA ? computeBucketStats(events, teamA) : []),
    [events, teamA],
  );
  const bucketsB = useMemo(
    () => (teamB ? computeBucketStats(events, teamB) : []),
    [events, teamB],
  );

  const bothSelected = teamA !== null && teamB !== null;
  const oneSelected = (teamA !== null) !== (teamB !== null);
  const selectedKey = teamA ?? teamB;
  const selectedStats = teamA ? statsA : statsB;

  // Points dropped breakdown
  const pdBreakdownA = statsA
    ? { draws: statsA.draws * 2, losses: statsA.losses * 3 }
    : null;
  const pdBreakdownB = statsB
    ? { draws: statsB.draws * 2, losses: statsB.losses * 3 }
    : null;
  const maxPD = Math.max(
    pdBreakdownA ? pdBreakdownA.draws + pdBreakdownA.losses : 0,
    pdBreakdownB ? pdBreakdownB.draws + pdBreakdownB.losses : 0,
    1,
  );

  return (
    <div className="space-y-8">
      {/* ---- Team Selectors ---- */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="w-full sm:flex-1">
          <TeamSelector
            teams={teams}
            summaryTeams={summaryTeams}
            selected={teamA}
            onSelect={setTeamA}
            placeholder="Select Team A\u2026"
          />
        </div>
        <span className="shrink-0 font-display text-3xl text-accent">vs</span>
        <div className="w-full sm:flex-1">
          <TeamSelector
            teams={teams}
            summaryTeams={summaryTeams}
            selected={teamB}
            onSelect={setTeamB}
            placeholder="Select Team B\u2026"
          />
        </div>
      </div>

      {/* ---- Empty state ---- */}
      {!teamA && !teamB && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center text-text-muted"
        >
          Select two teams to compare
        </motion.p>
      )}

      {/* ---- One team selected ---- */}
      {oneSelected && selectedStats && selectedKey && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-center text-sm text-text-muted">
            Showing stats for{' '}
            <span className="font-semibold text-text-primary">
              {teamName(teams, selectedKey)}
            </span>{' '}
            &mdash; select a second team to compare
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg glass card-hover p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Win Rate
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {pct(selectedStats.win_rate)}
              </p>
            </div>
            <div className="rounded-lg glass card-hover p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Events
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {selectedStats.n}
              </p>
            </div>
            <div className="rounded-lg glass card-hover p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Draws
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {selectedStats.draws}
              </p>
            </div>
            <div className="rounded-lg glass card-hover p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                Pts Dropped
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {selectedStats.points_dropped}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Both teams selected ---- */}
      {bothSelected && statsA && statsB && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* --- Stat Comparison Cards --- */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Overall Comparison
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ComparisonCard
                label="Win Rate"
                valueA={statsA.win_rate}
                valueB={statsB.win_rate}
                higherIsBetter
                index={0}
              />
              <ComparisonCard
                label="Events"
                valueA={statsA.n}
                valueB={statsB.n}
                higherIsBetter
                index={1}
              />
              <ComparisonCard
                label="Draws"
                valueA={statsA.draws}
                valueB={statsB.draws}
                higherIsBetter={false}
                index={2}
              />
              <ComparisonCard
                label="Points Dropped"
                valueA={statsA.points_dropped}
                valueB={statsB.points_dropped}
                higherIsBetter={false}
                index={3}
              />
            </div>
            <p className="mt-2 text-center text-xs text-text-muted">
              {teamShort(teams, teamA)} (left) vs {teamShort(teams, teamB)}{' '}
              (right)
            </p>
          </div>

          {/* --- Bucket-by-Bucket Table --- */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Bucket-by-Bucket Comparison
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10 glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3 font-display">Bucket</th>
                    <th className="px-3 py-3 text-right font-display">
                      {teamShort(teams, teamA)} Win%
                    </th>
                    <th className="px-3 py-3 text-right font-display">
                      {teamShort(teams, teamA)} N
                    </th>
                    <th className="px-3 py-3 text-right font-display">
                      {teamShort(teams, teamB)} Win%
                    </th>
                    <th className="px-3 py-3 text-right font-display">
                      {teamShort(teams, teamB)} N
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BUCKETS.map(({ key, label }, idx) => {
                    const a = bucketsA[idx];
                    const b = bucketsB[idx];
                    const aWr = a?.win_rate ?? 0;
                    const bWr = b?.win_rate ?? 0;
                    const aN = a?.n ?? 0;
                    const bN = b?.n ?? 0;
                    const aBetter = aWr > bWr;
                    const bBetter = bWr > aWr;
                    return (
                      <tr
                        key={key}
                        className="border-b border-white/5 transition hover:bg-white/5"
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-text-primary">
                          {label}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-mono ${
                            aN === 0
                              ? 'text-text-muted'
                              : aBetter
                                ? 'font-semibold text-win border-l-2 border-l-win/50'
                                : 'text-text-secondary'
                          }`}
                        >
                          {aN > 0 ? pct(aWr) : '\u2014'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-text-muted">
                          {aN}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-mono ${
                            bN === 0
                              ? 'text-text-muted'
                              : bBetter
                                ? 'font-semibold text-win border-l-2 border-l-win/50'
                                : 'text-text-secondary'
                          }`}
                        >
                          {bN > 0 ? pct(bWr) : '\u2014'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-text-muted">
                          {bN}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* --- Points Dropped Breakdown --- */}
          {pdBreakdownA && pdBreakdownB && (
            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                Points Dropped Breakdown
              </h3>
              <div className="space-y-4 rounded-lg glass p-4">
                {/* Team A bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">
                      {teamShort(teams, teamA)}
                    </span>
                    <span className="text-text-muted">
                      {statsA.points_dropped} pts dropped
                    </span>
                  </div>
                  <div className="flex h-6 w-full overflow-hidden rounded-md bg-white/5">
                    <div
                      className="flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        width: `${(pdBreakdownA.draws / maxPD) * 100}%`,
                        backgroundColor: COLORS.draw,
                      }}
                    >
                      {pdBreakdownA.draws > 0 && `D: ${pdBreakdownA.draws}`}
                    </div>
                    <div
                      className="flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        width: `${(pdBreakdownA.losses / maxPD) * 100}%`,
                        backgroundColor: COLORS.loss,
                      }}
                    >
                      {pdBreakdownA.losses > 0 && `L: ${pdBreakdownA.losses}`}
                    </div>
                  </div>
                </div>

                {/* Team B bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">
                      {teamShort(teams, teamB)}
                    </span>
                    <span className="text-text-muted">
                      {statsB.points_dropped} pts dropped
                    </span>
                  </div>
                  <div className="flex h-6 w-full overflow-hidden rounded-md bg-white/5">
                    <div
                      className="flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        width: `${(pdBreakdownB.draws / maxPD) * 100}%`,
                        backgroundColor: COLORS.draw,
                      }}
                    >
                      {pdBreakdownB.draws > 0 && `D: ${pdBreakdownB.draws}`}
                    </div>
                    <div
                      className="flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        width: `${(pdBreakdownB.losses / maxPD) * 100}%`,
                        backgroundColor: COLORS.loss,
                      }}
                    >
                      {pdBreakdownB.losses > 0 && `L: ${pdBreakdownB.losses}`}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: COLORS.draw }}
                    />
                    Draws (&times;2)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: COLORS.loss }}
                    />
                    Losses (&times;3)
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
