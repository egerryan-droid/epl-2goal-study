'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Team, SummaryTeam } from '@/lib/data';

interface TeamSelectorProps {
  teams: Team[];
  summaryTeams: SummaryTeam[];
  selected: string | null;
  onSelect: (teamKey: string | null) => void;
  placeholder?: string;
}

export default function TeamSelector({
  teams,
  summaryTeams,
  selected,
  onSelect,
  placeholder = 'Select a team\u2026',
}: TeamSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  // Build a lookup of team_key -> SummaryTeam
  const summaryMap = useMemo(() => {
    const map = new Map<string, SummaryTeam>();
    for (const st of summaryTeams) {
      map.set(st.team_key, st);
    }
    return map;
  }, [summaryTeams]);

  // Sorted and filtered team list
  const filteredTeams = useMemo(() => {
    const sorted = [...teams].sort((a, b) =>
      a.team_display_name.localeCompare(b.team_display_name),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((t) => t.team_display_name.toLowerCase().includes(q));
  }, [teams, search]);

  const selectedTeam = teams.find((t) => t.team_key === selected) ?? null;
  const selectedSummary = selected ? summaryMap.get(selected) ?? null : null;

  function handleSelect(teamKey: string | null) {
    onSelect(teamKey);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-surface-mid px-3 py-2.5 text-sm card-hover"
      >
        {selectedTeam ? (
          <span className="flex items-center gap-2">
            <span className="text-text-primary font-medium">
              {selectedTeam.team_display_name}
            </span>
            {selectedSummary && (
              <span className="rounded bg-win/20 px-1.5 py-0.5 text-xs font-semibold text-win">
                {(selectedSummary.win_rate * 100).toFixed(0)}% W
              </span>
            )}
          </span>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}

        <svg
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-white/10 glass-strong shadow-xl"
          >
            {/* Search input */}
            <div className="border-b border-white/10 p-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams\u2026"
                className="w-full rounded-md bg-white/5 px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none ring-1 ring-white/10 focus:ring-accent"
              />
            </div>

            {/* Options list */}
            <div className="max-h-64 overflow-y-auto p-1">
              {/* Clear selection option */}
              {selected && (
                <button
                  onClick={() => handleSelect(null)}
                  className="flex w-full items-center rounded px-3 py-2 text-sm text-text-muted hover:bg-white/5"
                >
                  Clear selection
                </button>
              )}

              {filteredTeams.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-muted">
                  No teams found
                </div>
              ) : (
                filteredTeams.map((team) => {
                  const summary = summaryMap.get(team.team_key);
                  const isActive = team.team_key === selected;
                  return (
                    <button
                      key={team.team_key}
                      onClick={() => handleSelect(team.team_key)}
                      className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-all duration-150 border-l-2 ${
                        isActive
                          ? 'border-l-accent bg-accent/20 text-accent'
                          : 'border-l-transparent text-text-secondary hover:border-l-accent/50 hover:bg-white/5'
                      }`}
                    >
                      <span className={isActive ? 'font-medium' : ''}>
                        {team.team_display_name}
                      </span>
                      {summary && (
                        <span className="text-xs text-text-muted">
                          {summary.n_as_leader} events
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
