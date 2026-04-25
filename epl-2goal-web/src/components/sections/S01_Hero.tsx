'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function S01_Hero() {
  // Hero is always visible on load — trigger animation after mount
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  const inView = show;

  return (
    <section
      id="hero"
      className="relative h-screen snap-start snap-always flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-surface-dark"
    >
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Brand chrome (PL logo + slide counter) is rendered globally by
          <DeckChrome /> in src/app/page.tsx so it persists across every slide. */}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <p className="glass inline-block rounded-full px-5 py-1.5 text-xs sm:text-sm tracking-widest uppercase text-text-secondary mb-8">
          English Premier League &middot; 10 Seasons &middot; 1,907 Events
        </p>

        <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold text-text-primary mb-8 leading-tight">
          The Most <span className="text-draw">Dangerous</span> Lead?
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="font-sans text-xl sm:text-2xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
        >
          They say a two-goal lead is the most dangerous lead in football.
          <br />
          <span className="text-text-muted text-lg">We analyzed 10 years of Premier League data to find out.</span>
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs uppercase tracking-widest text-text-muted">Scroll to explore</span>
        <div className="h-12 w-px bg-gradient-to-b from-accent to-transparent animate-pulse" />
      </motion.div>
    </section>
  );
}
