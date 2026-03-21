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
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
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
        <p className="text-text-secondary text-lg md:text-xl tracking-widest uppercase mb-4">
          English Premier League &middot; 10 Seasons &middot; 1,907 Events
        </p>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-text-primary mb-6 leading-tight">
          The Most <span className="text-draw">Dangerous</span> Lead?
        </h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
        >
          <div className="text-8xl md:text-9xl font-bold text-win">
            {inView && <CountUp end={93.3} decimals={1} duration={2} suffix="%" />}
          </div>
          <p className="text-text-secondary text-xl mt-2">
            of two-goal leads held
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 text-text-muted animate-bounce"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.div>
    </section>
  );
}
