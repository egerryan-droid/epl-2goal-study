'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export function useScrollProgress(): {
  ref: RefObject<HTMLDivElement | null>;
  progress: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    function handleScroll() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // When the top of the section hits the bottom of the viewport, progress = 0.
      // When the bottom of the section hits the top of the viewport, progress = 1.
      const totalTravel = rect.height + viewportHeight;
      const traveled = viewportHeight - rect.top;
      const raw = traveled / totalTravel;
      setProgress(Math.min(1, Math.max(0, raw)));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, progress };
}
