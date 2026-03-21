'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import summaryBucket from '@/data/summary_by_bucket.json';
import type { SummaryBucket } from '@/lib/data';

const RadialBucketChart = dynamic(() => import('@/components/charts/RadialBucketChart'), { ssr: false });
const WinRateLine = dynamic(() => import('@/components/charts/WinRateLine'), { ssr: false });

const data = summaryBucket as SummaryBucket[];

export default function S05_WhenDoesItMatter() {
  const [view, setView] = useState<'radial' | 'line'>('radial');
  const [showHalf, setShowHalf] = useState(false);

  return (
    <SectionWrapper id="when-does-it-matter">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          When Does It <span className="text-accent">Matter</span>?
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-8">
          Does the minute at which the two-goal lead is established affect safety?
          All six time buckets exceed the 90% threshold from the very start.
        </p>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setView('radial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'radial'
                ? 'bg-accent text-white'
                : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
            }`}
          >
            Radial View
          </button>
          <button
            onClick={() => setView('line')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'line'
                ? 'bg-accent text-white'
                : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setShowHalf(!showHalf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showHalf
                ? 'bg-accent text-white'
                : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
            }`}
          >
            H1 vs H2
          </button>
        </div>

        <div className="w-full max-w-4xl">
          {view === 'radial' ? (
            <RadialBucketChart data={data} />
          ) : (
            <WinRateLine data={data} />
          )}
        </div>

        <div className="mt-8 max-w-3xl">
          <AnimatePresence mode="wait">
            {showHalf ? (
              <motion.div
                key="half-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-2 gap-4 max-w-xl mx-auto"
              >
                {[
                  { label: 'First Half (0\u201345+)', buckets: ['0-15', '16-30', '31-45+'] },
                  { label: 'Second Half (46\u201390+)', buckets: ['46-60', '61-75', '76-90+'] },
                ].map(half => {
                  const hBuckets = data.filter(b => half.buckets.includes(b.bucket_key));
                  const n = hBuckets.reduce((s, b) => s + b.n, 0);
                  const draws = hBuckets.reduce((s, b) => s + b.draws, 0);
                  const wins = hBuckets.reduce((s, b) => s + b.wins, 0);
                  return (
                    <div key={half.label} className="bg-surface-mid rounded-xl p-4 text-center">
                      <div className="text-accent text-sm font-medium">{half.label}</div>
                      <div className="text-xl font-bold text-win">{((wins / n) * 100).toFixed(1)}%</div>
                      <div className="text-text-muted text-xs">{n} events</div>
                      <div className="text-draw text-sm mt-1">{draws} draws ({((draws / n) * 100).toFixed(1)}%)</div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="bucket-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
              >
                {data.map(bucket => (
                  <div key={bucket.bucket_key} className="bg-surface-mid rounded-lg p-3 text-center">
                    <div className="text-text-muted text-sm">{bucket.bucket_key} min</div>
                    <div className="text-xl font-bold text-win">{(bucket.win_rate * 100).toFixed(1)}%</div>
                    <div className="text-text-muted text-xs">{bucket.n} events</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionWrapper>
  );
}
