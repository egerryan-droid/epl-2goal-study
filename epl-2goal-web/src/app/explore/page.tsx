'use client';

import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import type {
  Plus2Event,
  SummaryTeam,
  GoalEvent,
  GoalsByMatch,
  Season,
  Team,
  DrawEvent,
} from '@/lib/data';

import eventsRaw from '@/data/fact_plus2_events.json';
import goalsByMatchRaw from '@/data/goals_by_match.json';
import teamsRaw from '@/data/dim_team.json';
import seasonsRaw from '@/data/dim_season.json';
import summaryTeamRaw from '@/data/summary_by_team.json';
import drawEventsRaw from '@/data/draw_events.json';

const events = eventsRaw as Plus2Event[];
const goalsByMatch = goalsByMatchRaw as unknown as GoalsByMatch;
const teams = teamsRaw as Team[];
const seasons = seasonsRaw as Season[];
const summaryTeam = summaryTeamRaw as SummaryTeam[];
const drawEvents = drawEventsRaw as DrawEvent[];

const PAGE_SIZE = 25;

// --------------- Helpers ---------------

function teamDisplayName(key: string): string {
  const t = teams.find((t) => t.team_key === key);
  return t ? t.team_display_name : key;
}

function teamShort(key: string): string {
  const t = teams.find((t) => t.team_key === key);
  return t ? t.team_short : key;
}

const sortedTeamKeys = teams
  .slice()
  .sort((a, b) => a.team_display_name.localeCompare(b.team_display_name))
  .map((t) => t.team_key);

const sortedSeasons = seasons.slice().sort((a, b) => a.sort_order - b.sort_order);

// --------------- Components ---------------

function ResultBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const cls =
    result === 'W'
      ? 'bg-win/20 text-win'
      : result === 'D'
        ? 'bg-draw/20 text-draw'
        : 'bg-loss/20 text-loss';
  const label = result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  compareValue,
  compareLabel,
}: {
  label: string;
  value: string;
  compareValue?: string;
  compareLabel?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-light p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      {compareValue != null ? (
        <div className="mt-1 flex items-center justify-center gap-3">
          <div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
          <span className="text-text-muted">vs</span>
          <div>
            <p className="text-2xl font-bold text-text-primary">{compareValue}</p>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
      )}
      {compareLabel && (
        <p className="mt-0.5 text-[10px] text-text-muted">{compareLabel}</p>
      )}
    </div>
  );
}

// --------------- Page ---------------

export default function ExplorePage() {
  // Team Spotlight state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  // Match Browser state
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'W' | 'D' | 'L'>('all');
  const [venueFilter, setVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // ---------- Team Picker Logic ----------

  function handleTeamClick(teamKey: string) {
    if (teamKey === 'all') {
      setSelectedTeams([]);
      return;
    }
    if (compareMode) {
      setSelectedTeams((prev) => {
        if (prev.includes(teamKey)) return prev.filter((t) => t !== teamKey);
        if (prev.length < 2) return [...prev, teamKey];
        // replace second selection
        return [prev[0], teamKey];
      });
    } else {
      setSelectedTeams((prev) =>
        prev.includes(teamKey) ? [] : [teamKey],
      );
    }
  }

  function toggleCompareMode() {
    setCompareMode((prev) => {
      if (prev) {
        // turning off — keep first selection only
        setSelectedTeams((sel) => (sel.length > 0 ? [sel[0]] : []));
      }
      return !prev;
    });
  }

  // ---------- Stats ----------

  function getTeamSummary(teamKey: string): SummaryTeam | undefined {
    return summaryTeam.find((s) => s.team_key === teamKey);
  }

  const statsA = selectedTeams[0] ? getTeamSummary(selectedTeams[0]) : undefined;
  const statsB = selectedTeams[1] ? getTeamSummary(selectedTeams[1]) : undefined;

  // overall stats when no team selected
  const overallStats = useMemo(() => {
    const total = events.length;
    const wins = events.filter((e) => e.result_for_leader === 'W').length;
    const draws = events.filter((e) => e.result_for_leader === 'D').length;
    const losses = events.filter((e) => e.result_for_leader === 'L').length;
    const pd = events.reduce((s, e) => s + e.points_dropped, 0);
    return {
      win_rate: total > 0 ? (wins / total) * 100 : 0,
      draws,
      losses,
      points_dropped: pd,
    };
  }, []);

  // draws for selected team
  const teamDraws = useMemo(() => {
    if (selectedTeams.length === 0) return [];
    return drawEvents.filter((d) =>
      selectedTeams.includes(d.leader_team),
    );
  }, [selectedTeams]);

  // ---------- Match Browser Filtering ----------

  const filteredEvents = useMemo(() => {
    let list = events;
    if (seasonFilter !== 'all') list = list.filter((e) => e.season_key === seasonFilter);
    if (resultFilter !== 'all') list = list.filter((e) => e.result_for_leader === resultFilter);
    if (venueFilter === 'home') list = list.filter((e) => e.leader_is_home);
    if (venueFilter === 'away') list = list.filter((e) => !e.leader_is_home);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.leader_team_key.toLowerCase().includes(q) ||
          e.opponent_team_key.toLowerCase().includes(q),
      );
    }
    return list;
  }, [seasonFilter, resultFilter, venueFilter, searchText]);

  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE);
  const pageEvents = filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // reset page when filters change
  const resetPage = () => setPage(0);

  // ---------- Render ----------

  return (
    <main className="min-h-screen bg-surface-dark pb-20">
      {/* ===== HEADER ===== */}
      <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <span aria-hidden>&larr;</span> Back to Story
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Explore the Data
        </h1>
        <p className="mt-1 text-text-secondary">
          1,907 two-goal leads across 10 EPL seasons
        </p>
      </header>

      {/* ===== TEAM SPOTLIGHT ===== */}
      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-text-primary">Team Spotlight</h2>
          <button
            onClick={toggleCompareMode}
            className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
              compareMode
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-text-muted text-text-muted hover:border-text-secondary'
            }`}
          >
            {compareMode ? 'Compare ON' : 'Compare'}
          </button>
        </div>

        {/* Team Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleTeamClick('all')}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              selectedTeams.length === 0
                ? 'bg-accent text-white'
                : 'bg-surface-light text-text-secondary hover:bg-surface-mid'
            }`}
          >
            All Teams
          </button>
          {sortedTeamKeys.map((key) => {
            const active = selectedTeams.includes(key);
            return (
              <button
                key={key}
                onClick={() => handleTeamClick(key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  active
                    ? 'bg-accent text-white'
                    : 'bg-surface-light text-text-secondary hover:bg-surface-mid'
                }`}
              >
                {teamDisplayName(key)}
              </button>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {selectedTeams.length === 0 ? (
            <>
              <StatCard label="Win Rate" value={`${overallStats.win_rate.toFixed(1)}%`} />
              <StatCard label="Total Draws" value={String(overallStats.draws)} />
              <StatCard label="Total Losses" value={String(overallStats.losses)} />
              <StatCard label="Pts Dropped" value={String(overallStats.points_dropped)} />
            </>
          ) : compareMode && statsA && statsB ? (
            <>
              <StatCard
                label="Win Rate"
                value={`${statsA.win_rate.toFixed(1)}%`}
                compareValue={`${statsB.win_rate.toFixed(1)}%`}
                compareLabel={`${teamShort(selectedTeams[0])} vs ${teamShort(selectedTeams[1])}`}
              />
              <StatCard
                label="Total Draws"
                value={String(statsA.draws)}
                compareValue={String(statsB.draws)}
                compareLabel={`${teamShort(selectedTeams[0])} vs ${teamShort(selectedTeams[1])}`}
              />
              <StatCard
                label="Total Losses"
                value={String(statsA.losses)}
                compareValue={String(statsB.losses)}
                compareLabel={`${teamShort(selectedTeams[0])} vs ${teamShort(selectedTeams[1])}`}
              />
              <StatCard
                label="Pts Dropped"
                value={String(statsA.points_dropped)}
                compareValue={String(statsB.points_dropped)}
                compareLabel={`${teamShort(selectedTeams[0])} vs ${teamShort(selectedTeams[1])}`}
              />
            </>
          ) : statsA ? (
            <>
              <StatCard label="Win Rate" value={`${statsA.win_rate.toFixed(1)}%`} />
              <StatCard label="Total Draws" value={String(statsA.draws)} />
              <StatCard label="Total Losses" value={String(statsA.losses)} />
              <StatCard label="Pts Dropped" value={String(statsA.points_dropped)} />
            </>
          ) : (
            <>
              <StatCard label="Win Rate" value="-" />
              <StatCard label="Total Draws" value="-" />
              <StatCard label="Total Losses" value="-" />
              <StatCard label="Pts Dropped" value="-" />
            </>
          )}
        </div>

        {/* Team Draws */}
        {teamDraws.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Draws as Leader ({teamDraws.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teamDraws.map((d) => (
                <div
                  key={d.event_id}
                  className="rounded-lg border border-draw/30 bg-surface-mid p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">
                      {d.leader_team} vs {d.opponent_team}
                    </span>
                    <span className="rounded bg-draw/20 px-2 py-0.5 text-xs font-bold text-draw">
                      {d.final_score}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-text-muted">
                    <span>{d.season}</span>
                    <span>{d.bucket}</span>
                    <span>{d.minute_reached_plus2}&apos;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== MATCH BROWSER ===== */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <h2 className="text-xl font-semibold text-text-primary">Match Browser</h2>

        {/* Filter Row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Season dropdown */}
          <select
            value={seasonFilter}
            onChange={(e) => {
              setSeasonFilter(e.target.value);
              resetPage();
            }}
            className="rounded-lg border border-surface-light bg-surface-mid px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">All Seasons</option>
            {sortedSeasons.map((s) => (
              <option key={s.season_key} value={s.season_key}>
                {s.season_label}
              </option>
            ))}
          </select>

          {/* Result filter */}
          <div className="flex overflow-hidden rounded-lg border border-surface-light">
            {(['all', 'W', 'D', 'L'] as const).map((r) => {
              const label = r === 'all' ? 'All' : r === 'W' ? 'Wins' : r === 'D' ? 'Draws' : 'Losses';
              return (
                <button
                  key={r}
                  onClick={() => {
                    setResultFilter(r);
                    resetPage();
                  }}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    resultFilter === r
                      ? 'bg-accent text-white'
                      : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Home/Away toggle */}
          <div className="flex overflow-hidden rounded-lg border border-surface-light">
            {(['all', 'home', 'away'] as const).map((v) => {
              const label = v === 'all' ? 'All' : v === 'home' ? 'Home' : 'Away';
              return (
                <button
                  key={v}
                  onClick={() => {
                    setVenueFilter(v);
                    resetPage();
                  }}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    venueFilter === v
                      ? 'bg-accent text-white'
                      : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by team..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              resetPage();
            }}
            className="w-48 rounded-lg border border-surface-light bg-surface-mid px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Match Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-surface-light">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-light bg-surface-mid text-xs uppercase tracking-wider text-text-muted">
                <th className="px-3 py-3">Season</th>
                <th className="px-3 py-3">Leader</th>
                <th className="px-3 py-3">Opponent</th>
                <th className="px-3 py-3">Bucket</th>
                <th className="px-3 py-3">Min</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {pageEvents.map((ev) => {
                const isExpanded = expandedRow === ev.match_key;
                const goals = goalsByMatch[String(ev.match_key)] as GoalEvent[] | undefined;
                return (
                  <Fragment key={ev.event_id}>
                    <tr
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : ev.match_key)
                      }
                      className="cursor-pointer border-b border-surface-light transition hover:bg-surface-mid"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                        {ev.season_key}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-text-primary">
                        {teamDisplayName(ev.leader_team_key)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                        {teamDisplayName(ev.opponent_team_key)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                        {ev.bucket_key}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                        {ev.minute_reached_plus2}&apos;
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-primary">
                        {ev.final_leader_goals}-{ev.final_opponent_goals}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <ResultBadge result={ev.result_for_leader} />
                      </td>
                    </tr>
                    {isExpanded && goals && (
                      <tr className="border-b border-surface-light bg-surface-mid/50">
                        <td colSpan={7} className="px-4 py-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                            Goal Timeline
                          </p>
                          <div className="space-y-1">
                            {goals.map((g, i) => (
                              <div
                                key={i}
                                className={`flex items-center gap-3 rounded px-2 py-1 text-sm ${
                                  g.is_plus2_moment
                                    ? 'bg-accent/10 text-accent'
                                    : 'text-text-secondary'
                                }`}
                              >
                                <span className="w-10 text-right font-mono text-xs">
                                  {g.minute}&apos;
                                </span>
                                <span className="flex-1">
                                  {g.player ?? 'Unknown'}{' '}
                                  <span className="text-text-muted">
                                    ({g.scoring_side})
                                  </span>
                                </span>
                                <span className="font-mono text-xs">
                                  {g.running_home}-{g.running_away}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {pageEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-text-muted"
                  >
                    No matches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
            <span>
              Showing {page * PAGE_SIZE + 1}-
              {Math.min((page + 1) * PAGE_SIZE, filteredEvents.length)} of{' '}
              {filteredEvents.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-surface-light px-3 py-1 transition hover:bg-surface-mid disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-surface-light px-3 py-1 transition hover:bg-surface-mid disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

