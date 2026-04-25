'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Order must match the section sequence rendered in src/app/page.tsx.
// Each entry maps a section's `id` to a short display label and a "track"
// that groups related slides under one umbrella heading.
type Slide = { id: string; track: string; label: string };

const SLIDES: Slide[] = [
  { id: 'hero',                track: 'Title',           label: 'Title' },
  { id: 'the-myth',            track: 'The Setup',       label: 'The Myth' },
  { id: 'in-their-words',      track: 'The Setup',       label: 'In Their Words' },
  { id: 'the-data',            track: 'The Setup',       label: 'The Data' },
  { id: 'big-picture',         track: 'The Headline',    label: 'The Big Picture' },
  { id: 'the-draw',            track: 'The Headline',    label: 'The Draws' },
  { id: 'when-it-matters',     track: 'The Outliers',    label: 'When It Matters' },
  { id: 'collapse-timeline',   track: 'The Outliers',    label: 'Famous Collapses' },
  { id: 'lock-point',          track: 'The Lock',        label: 'The Lock Point' },
  { id: 'sankey',              track: 'The Lock',        label: 'The Flow' },
  { id: 'team-performance',    track: 'By Team & Time',  label: 'Team Performance' },
  { id: 'points-dropped',      track: 'By Team & Time',  label: 'Points Dropped' },
  { id: 'season-trends',       track: 'By Team & Time',  label: 'By Season' },
  { id: 'what-really-matters', track: 'The Model',       label: 'What Really Matters' },
  { id: 'key-findings',        track: 'The Model',       label: 'Key Findings' },
  { id: 'match-explorer',      track: 'Wrap',            label: 'Match Explorer' },
  { id: 'verdict',             track: 'Wrap',            label: 'The Verdict' },
];

export default function DeckChrome() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // The deck scrolls inside a snap container (`<main>` in src/app/page.tsx),
    // not the viewport. Sections are loaded with dynamic({ ssr: false }) so on
    // first useEffect tick they may not be in the DOM yet — we retry until at
    // least one section + a scrollable ancestor exist.
    const findScrollRoot = (): HTMLElement | null => {
      const first = document.getElementById(SLIDES[0].id);
      if (!first) return null;
      let p: HTMLElement | null = first.parentElement;
      while (p) {
        const oy = getComputedStyle(p).overflowY;
        if (oy === 'auto' || oy === 'scroll') return p;
        p = p.parentElement;
      }
      return null;
    };

    let scrollRoot = findScrollRoot();
    let alive = true;

    const computeActive = () => {
      // If sections weren't in the DOM at mount time, keep trying to locate
      // the scroll container until we find one (rAF runs every frame).
      if (!scrollRoot) {
        scrollRoot = findScrollRoot();
        if (!scrollRoot) return;
      }
      // The slide whose top is closest to (but not past) the scroll container's
      // current scrollTop wins. Sections are full-screen and snap-aligned, so
      // this matches the visually-centered slide reliably.
      const scrollTop = scrollRoot.scrollTop;
      const probe = scrollTop + scrollRoot.clientHeight / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < SLIDES.length; i++) {
        const el = document.getElementById(SLIDES[i].id);
        if (!el) continue;
        const top = el.offsetTop;
        const center = top + el.offsetHeight / 2;
        const d = Math.abs(center - probe);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx));
    };

    // A short rAF polling loop is the most reliable way to track snapped
    // position inside a scroll container with `scroll-snap-type: mandatory`
    // — programmatic .scrollTo() and finger-flick snaps don't always emit
    // scroll events at predictable times across browsers, but rAF always ticks.
    const tick = () => {
      if (!alive) return;
      computeActive();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      alive = false;
    };
  }, []);

  const active = SLIDES[activeIndex];
  const isHero = active.id === 'hero';
  const slideNumber = String(activeIndex + 1).padStart(2, '0');
  const totalSlides = SLIDES.length;

  return (
    <>
      {/* ---------- Top-left: PL crown + track / label chips ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pointer-events-none fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-stretch gap-0"
      >
        {/* Logo block — purple square so the white crown reads on any slide bg */}
        <div className="flex items-center bg-surface-mid px-4 py-2 rounded-l-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/pl-logo.svg"
            alt="Premier League"
            className="h-7 w-auto sm:h-8"
            style={{ color: '#FFFFFF' }}
          />
        </div>

        {/* Track + slide-label chips — hidden on phones; hidden on hero */}
        <AnimatePresence mode="wait">
          {!isHero && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
              className="hidden sm:flex items-stretch"
            >
              <div className="flex items-center bg-surface-mid px-3 py-2 text-text-primary text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]">
                {active.track}
              </div>
              <div className="flex items-center bg-loss px-4 py-2 rounded-r-md text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]">
                {active.label}
              </div>
            </motion.div>
          )}
          {isHero && (
            <motion.div
              key="hero-cap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden sm:flex items-stretch"
            >
              <div className="flex items-center bg-surface-mid px-4 py-2 rounded-r-md text-accent text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]">
                EMBA Research <span className="mx-2 text-text-muted">·</span> Xavier University
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---------- Top-right: slide counter ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="pointer-events-none fixed top-4 right-4 sm:top-6 sm:right-6 z-50"
      >
        <div className="bg-surface-mid border border-text-muted/20 px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary tabular-nums">
          Slide <span className="text-text-primary">{slideNumber}</span>
          <span className="mx-1.5 text-text-muted">/</span>
          <span className="text-text-muted">{String(totalSlides).padStart(2, '0')}</span>
        </div>
      </motion.div>
    </>
  );
}
