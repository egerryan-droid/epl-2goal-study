'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Detects when an element scrolls into view inside the snap-scroll container.
 * Works correctly in fullscreen mode by finding the actual scroll root (<main>).
 */
export function useInView(options?: IntersectionObserverInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current as HTMLElement | null;
    if (!node) return;

    // Find the scroll container — the <main> with overflow-y-auto
    const scrollRoot =
      node.closest('main[class*="overflow-y-auto"]') as HTMLElement | null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      {
        threshold: 0.15,
        ...options,
        // Use the scroll container as root so it works in fullscreen
        root: scrollRoot ?? undefined,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
