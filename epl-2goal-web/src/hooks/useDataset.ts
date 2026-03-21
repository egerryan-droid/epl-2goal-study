'use client';

import { useState, useEffect } from 'react';

const cache = new Map<string, unknown>();

/**
 * Fetches heavy JSON datasets from /data/ (public folder) on demand.
 * Results are cached in memory — second access is instant.
 * Pass empty string to skip fetching.
 */
export function useDataset<T>(dataset: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(
    (cache.get(dataset) as T) ?? null,
  );
  const [loading, setLoading] = useState(!cache.has(dataset) && !!dataset);

  useEffect(() => {
    if (!dataset) {
      setLoading(false);
      return;
    }

    if (cache.has(dataset)) {
      setData(cache.get(dataset) as T);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/data/${dataset}.json`)
      .then((r) => r.json())
      .then((json) => {
        cache.set(dataset, json);
        if (!cancelled) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataset]);

  return { data, loading };
}
