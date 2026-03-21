'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useFilters } from '@/hooks/useFilterState';
import type { Season, Team, MinuteBucket } from '@/lib/data';

interface FilterBarProps {
  seasons: Season[];
  teams: Team[];
  buckets: MinuteBucket[];
}

/* ------------------------------------------------------------------ */
/*  Reusable multi-select dropdown                                    */
/* ------------------------------------------------------------------ */
function MultiSelect({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { key: string; display: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const allSelected = selected.length === 0;

  const toggle = useCallback(
    (key: string) => {
      if (selected.includes(key)) {
        onChange(selected.filter((k) => k !== key));
      } else {
        onChange([...selected, key]);
      }
    },
    [selected, onChange],
  );

  const summary = allSelected
    ? `All ${label}`
    : selected.length === 1
      ? items.find((i) => i.key === selected[0])?.display ?? '1 selected'
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
      >
        <span className="max-w-[120px] truncate">{summary}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-white/10 bg-[#16213e] p-1 shadow-xl">
          <button
            onClick={() => onChange([])}
            className={`w-full rounded px-3 py-1.5 text-left text-sm ${allSelected ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}
          >
            All
          </button>
          {items.map((item) => {
            const active = selected.includes(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={`w-full rounded px-3 py-1.5 text-left text-sm ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}
              >
                {item.display}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterBar                                                          */
/* ------------------------------------------------------------------ */
export default function FilterBar({ seasons, teams, buckets }: FilterBarProps) {
  const { filters, setSeasons, setTeams, setHomeAway, setBuckets, resetFilters } =
    useFilters();

  const homeAwayOptions: Array<'all' | 'home' | 'away'> = ['all', 'home', 'away'];

  const seasonItems = seasons
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ key: s.season_key, display: s.season_label }));

  const teamItems = teams
    .sort((a, b) => a.team_display_name.localeCompare(b.team_display_name))
    .map((t) => ({ key: t.team_key, display: t.team_display_name }));

  const bucketItems = buckets
    .sort((a, b) => a.bucket_order - b.bucket_order)
    .map((b) => ({ key: b.bucket_key, display: b.bucket_label }));

  const hasActiveFilters =
    filters.seasons.length > 0 ||
    filters.teams.length > 0 ||
    filters.homeAway !== 'all' ||
    filters.buckets.length > 0;

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#1a1a2e]/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Filters
        </span>

        <MultiSelect
          label="Seasons"
          items={seasonItems}
          selected={filters.seasons}
          onChange={setSeasons}
        />

        <MultiSelect
          label="Teams"
          items={teamItems}
          selected={filters.teams}
          onChange={setTeams}
        />

        {/* Home / Away toggle */}
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {homeAwayOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setHomeAway(opt)}
              className={`px-3 py-1.5 text-sm capitalize ${
                filters.homeAway === opt
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <MultiSelect
          label="Buckets"
          items={bucketItems}
          selected={filters.buckets}
          onChange={setBuckets}
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
