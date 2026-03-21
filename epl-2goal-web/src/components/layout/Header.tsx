'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  sections: { id: string; label: string }[];
}

export default function Header({ sections }: HeaderProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: '-40% 0px -55% 0px' },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <header className="fixed top-0 left-0 z-50 flex w-full items-center justify-center gap-3 bg-[#1a1a2e]/70 px-4 py-3 backdrop-blur-md">
      {sections.map(({ id, label }) => {
        const isActive = activeId === id;
        const isHovered = hoveredId === id;

        return (
          <div
            key={id}
            className="group relative flex flex-col items-center"
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              onClick={() => scrollTo(id)}
              aria-label={label}
              className={`h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                isActive
                  ? 'scale-125 border-blue-400 bg-blue-400'
                  : 'border-slate-500 bg-transparent hover:border-slate-300'
              }`}
            />
            {/* tooltip label */}
            {isHovered && (
              <span className="absolute top-7 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-slate-300 shadow-lg">
                {label}
              </span>
            )}
          </div>
        );
      })}
      <Link href="/explore" className="ml-4 text-sm font-medium text-text-secondary hover:text-accent transition">
        Explore
      </Link>
    </header>
  );
}
