'use client';

import type { Plus2Event } from '@/lib/data';
import { getResultColor, getResultLabel } from '@/lib/utils';

interface MatchCardProps {
  event: Plus2Event;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
}

export default function MatchCard({
  event,
  homeTeam,
  awayTeam,
  matchDate,
}: MatchCardProps) {
  const resultColor = getResultColor(event.result_for_leader);
  const resultLabel = getResultLabel(event.result_for_leader);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      {/* result indicator bar */}
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: resultColor }}
      />

      <div className="ml-3 flex flex-col gap-2">
        {/* score line */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-semibold ${event.leader_is_home ? 'text-white' : 'text-slate-300'}`}
          >
            {homeTeam}
          </span>
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-white">
            {event.final_leader_goals} - {event.final_opponent_goals}
          </span>
          <span
            className={`font-semibold ${!event.leader_is_home ? 'text-white' : 'text-slate-300'}`}
          >
            {awayTeam}
          </span>
        </div>

        {/* meta row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{matchDate}</span>
          <span
            className="rounded-full px-2 py-0.5 font-semibold"
            style={{ backgroundColor: `${resultColor}22`, color: resultColor }}
          >
            {resultLabel}
          </span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-semibold text-blue-400">
            +2 at {event.minute_reached_plus2}&apos;
          </span>
        </div>
      </div>
    </div>
  );
}
