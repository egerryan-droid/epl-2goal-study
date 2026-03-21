'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';

export default function S01_Hero() {
  // Hero is always visible on load — trigger animation after mount
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  const inView = show;

  return (
    <section
      id="hero"
      className="relative h-screen snap-start snap-always flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 120%, #0f3460 0%, #1a1a2e 50%, #0a0a1a 100%)',
      }}
    >
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <p className="glass inline-block rounded-full px-5 py-1.5 text-xs sm:text-sm tracking-widest uppercase text-text-secondary mb-8">
          English Premier League &middot; 10 Seasons &middot; 1,907 Events
        </p>

        <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold text-text-primary mb-6 leading-tight">
          The Most <span className="text-draw">Dangerous</span> Lead?
        </h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative mt-8"
        >
          {/* Animated gradient pulse behind stat */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 sm:h-80 sm:w-80 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(46,204,113,0.15) 0%, transparent 70%)',
            }}
          />
          <div className="relative font-display stat-number text-8xl sm:text-9xl font-bold text-win">
            {inView && <CountUp end={93.3} decimals={1} duration={2} suffix="%" />}
          </div>
          <p className="text-text-secondary tracking-wider uppercase text-sm mt-2">
            of two-goal leads held
          </p>
        </motion.div>

        <p className="font-sans text-lg sm:text-xl text-text-secondary mt-6 max-w-xl mx-auto">
          A data-driven look at comebacks in the English Premier League
        </p>
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
