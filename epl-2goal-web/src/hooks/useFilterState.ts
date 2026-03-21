'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import React from 'react';

export interface FilterState {
  seasons: string[];
  teams: string[];
  homeAway: 'all' | 'home' | 'away';
  buckets: string[];
}

interface FilterContextValue {
  filters: FilterState;
  setSeasons: (seasons: string[]) => void;
  setTeams: (teams: string[]) => void;
  setHomeAway: (value: 'all' | 'home' | 'away') => void;
  setBuckets: (buckets: string[]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  seasons: [],
  teams: [],
  homeAway: 'all',
  buckets: [],
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setSeasons = useCallback(
    (seasons: string[]) => setFilters((prev) => ({ ...prev, seasons })),
    [],
  );

  const setTeams = useCallback(
    (teams: string[]) => setFilters((prev) => ({ ...prev, teams })),
    [],
  );

  const setHomeAway = useCallback(
    (homeAway: 'all' | 'home' | 'away') =>
      setFilters((prev) => ({ ...prev, homeAway })),
    [],
  );

  const setBuckets = useCallback(
    (buckets: string[]) => setFilters((prev) => ({ ...prev, buckets })),
    [],
  );

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const value = useMemo<FilterContextValue>(
    () => ({ filters, setSeasons, setTeams, setHomeAway, setBuckets, resetFilters }),
    [filters, setSeasons, setTeams, setHomeAway, setBuckets, resetFilters],
  );

  return React.createElement(FilterContext.Provider, { value }, children);
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return ctx;
}
