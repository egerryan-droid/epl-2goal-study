'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useInView } from '@/hooks/useInView';
import Link from 'next/link';

export default function S11_Verdict() {
  const { ref, inView } = useInView({ threshold: 0.3 });

  const stats = [
    { value: 93.3, suffix: '%', label: 'Overall Win Rate', color: '#2ecc71' },
    { value: 99.7, suffix: '%', label: 'After 76th Minute', color: '#2ecc71' },
    { value: 1907, suffix: '', label: 'Events Studied', color: '#3498db' },
  ];

  return (
    <section
      ref={ref}
      id="verdict"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 text-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 50%, #0f3460 0%, #1a1a2e 50%, #0a0a1a 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-3xl"
      >
        <h2 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
          The <span className="text-win">Verdict</span>
        </h2>

        <p className="text-xl md:text-2xl text-text-secondary leading-relaxed mb-12">
          A two-goal lead in the English Premier League is <strong className="text-win">not dangerous</strong>.
          It is <strong className="text-win">overwhelmingly safe</strong>. The myth persists because
          memorable comebacks dominate human memory, while routine wins are forgotten.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
            className="bg-surface-mid/50 backdrop-blur rounded-xl p-6"
          >
            <div className="text-4xl font-bold mb-1" style={{ color: stat.color }}>
              {inView && <CountUp end={stat.value} decimals={stat.suffix === '%' ? 1 : 0} duration={2} suffix={stat.suffix} />}
            </div>
            <div className="text-text-muted text-sm">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1, duration: 0.6 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-lg font-bold text-white transition hover:bg-accent/80"
        >
          Explore the Data
          <span aria-hidden>→</span>
        </Link>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="text-text-muted text-sm mt-12"
      >
        EPL 2-Goal Lead Safety Study &middot; Xavier University EMBA &middot; 2014/15 &ndash; 2023/24
      </motion.p>
    </section>
  );
}
