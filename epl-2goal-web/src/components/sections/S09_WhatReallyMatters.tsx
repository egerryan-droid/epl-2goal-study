'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryRegression from '@/data/summary_regression.json';
import type { SummaryRegression } from '@/lib/data';

const RegressionForest = dynamic(() => import('@/components/charts/RegressionForest'), { ssr: false });

const data = summaryRegression as SummaryRegression[];

const insights = [
  { text: 'Each additional minute increases win odds by 2.2%', icon: '⏱', color: 'text-accent' },
  { text: 'Pre-match favorites hold leads far more reliably (OR=66.7)', icon: '💪', color: 'text-win' },
  { text: 'Home advantage is NOT significant (p=0.84)', icon: '🏟', color: 'text-text-muted' },
  { text: 'A red card for the leader halves the odds (OR=0.42)', icon: '🟥', color: 'text-loss' },
  { text: 'An opponent red card triples them (OR=3.46)', icon: '✅', color: 'text-win' },
];

export default function S09_WhatReallyMatters() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      id="what-really-matters"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-surface-dark"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          What <span className="text-accent">Really</span> Matters
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Logistic regression reveals which factors actually predict whether a two-goal lead holds,
          controlling for all other variables simultaneously.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10 max-w-6xl w-full items-start">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex-1"
        >
          <RegressionForest data={data} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex-1 space-y-3"
        >
          <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-4">Key Findings</h3>
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
              className="bg-surface-mid rounded-lg p-4 flex items-start gap-3"
            >
              <span className="text-2xl">{insight.icon}</span>
              <p className={`${insight.color} text-sm font-medium`}>{insight.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
