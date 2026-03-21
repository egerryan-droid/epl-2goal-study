'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import events from '@/data/fact_plus2_events.json';
import goalsByMatch from '@/data/goals_by_match.json';
import dimMatch from '@/data/dim_match.json';
import dimSeason from '@/data/dim_season.json';
import type { Plus2Event, GoalsByMatch, Match, Season } from '@/lib/data';
import { COLORS } from '@/lib/theme';

const GoalTimeline = dynamic(() => import('@/components/charts/GoalTimeline'), { ssr: false });

const typedEvents = events as Plus2Event[];
const typedGoals = goalsByMatch as unknown as GoalsByMatch;
const typedMatches = dimMatch as Match[];
const typedSeasons = dimSeason as Season[];

const matchLookup = new Map(typedMatches.map(m => [m.match_key, m]));

export default function S10_MatchExplorer() {
  const { ref, inView } = useInView({ threshold: 0.1 });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'W' | 'D' | 'L'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return typedEvents.filter(e => {
      if (seasonFilter !== 'all' && e.season_key !== seasonFilter) return false;
      if (resultFilter !== 'all' && e.result_for_leader !== resultFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return e.leader_team_key.toLowerCase().includes(q) ||
               e.opponent_team_key.toLowerCase().includes(q);
      }
      return true;
    });
  }, [seasonFilter, resultFilter, searchQuery]);

  const resultColor = (r: string) =>
    r === 'W' ? COLORS.win : r === 'D' ? COLORS.draw : COLORS.loss;

  return (
    <section
      ref={ref}
      id="match-explorer"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          Match Explorer
        </h2>
        <p className="text-text-secondary text-lg">
          Browse every two-goal lead event. Click to see the goal-by-goal timeline.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 max-w-4xl w-full justify-center">
        <select
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="bg-surface-mid text-text-primary rounded-lg px-3 py-2 text-sm border border-surface-light"
        >
          <option value="all">All Seasons</option>
          {typedSeasons.map(s => (
            <option key={s.season_key} value={s.season_key}>{s.season_label}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {(['all', 'W', 'D', 'L'] as const).map(r => (
            <button
              key={r}
              onClick={() => setResultFilter(r)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                resultFilter === r
                  ? 'bg-accent text-white'
                  : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
              }`}
            >
              {r === 'all' ? 'All' : r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search team..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-surface-mid text-text-primary rounded-lg px-3 py-2 text-sm border border-surface-light placeholder-text-muted"
        />
      </div>

      <div className="text-text-muted text-sm mb-4">
        Showing {filtered.length} of {typedEvents.length} events
      </div>

      {/* Event list */}
      <div className="w-full max-w-4xl space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {filtered.slice(0, 100).map(event => {
          const match = matchLookup.get(event.match_key);
          const isExpanded = expandedEvent === event.event_id;
          const goals = typedGoals[String(event.match_key)] || [];

          return (
            <div key={event.event_id}>
              <button
                onClick={() => setExpandedEvent(isExpanded ? null : event.event_id)}
                className="w-full bg-surface-mid hover:bg-surface-light rounded-lg p-3 flex items-center gap-4 text-left transition-colors"
              >
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: resultColor(event.result_for_leader) }}
                />
                <div className="flex-grow min-w-0">
                  <div className="text-text-primary text-sm font-medium truncate">
                    {event.leader_team_key} vs {event.opponent_team_key}
                  </div>
                  <div className="text-text-muted text-xs">
                    {match?.match_date} &middot; {event.score_at_event_display} at {event.minute_reached_plus2}&apos; &rarr; {event.final_leader_goals}-{event.final_opponent_goals} ({event.result_for_leader})
                  </div>
                </div>
                <div className="text-text-muted text-xs flex-shrink-0">
                  {event.bucket_key} min
                </div>
                <svg
                  className={`w-4 h-4 text-text-muted transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {isExpanded && goals.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface-dark rounded-b-lg p-4 border border-surface-light border-t-0">
                      <GoalTimeline
                        goals={goals}
                        homeTeam={match?.home_team_key || ''}
                        awayTeam={match?.away_team_key || ''}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
