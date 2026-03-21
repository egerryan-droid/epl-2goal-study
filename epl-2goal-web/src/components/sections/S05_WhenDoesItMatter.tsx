'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryBucket from '@/data/summary_by_bucket.json';
import drawEvents from '@/data/draw_events.json';
import type { SummaryBucket, DrawEvent } from '@/lib/data';

const RadialBucketChart = dynamic(() => import('@/components/charts/RadialBucketChart'), { ssr: false });
const WinRateLine = dynamic(() => import('@/components/charts/WinRateLine'), { ssr: false });
const CollapseTimeline = dynamic(() => import('@/components/charts/CollapseTimeline'), { ssr: false });

const data = summaryBucket as SummaryBucket[];
const allDraws = drawEvents as DrawEvent[];

// Pick 5 most dramatic collapses by match_key
const FEATURED_MATCH_KEYS = [11877, 14483, 14108, 9432, 18581];
const featuredDraws = FEATURED_MATCH_KEYS
  .map(mk => allDraws.find(d => d.match_key === mk))
  .filter((d): d is DrawEvent => d !== undefined);
// Fallback if some keys don't match
const drawsForCarousel = featuredDraws.length >= 3 ? featuredDraws : allDraws.slice(0, 5);

export default function S05_WhenDoesItMatter() {
  const { ref, inView } = useInView({ threshold: 0.15 });
  const [view, setView] = useState<'radial' | 'line'>('radial');
  const [showHalf, setShowHalf] = useState(false);

  return (
    <section
      ref={ref}
      id="when-does-it-matter"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-surface-dark"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          When Does It <span className="text-accent">Matter</span>?
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Does the minute at which the two-goal lead is established affect safety?
          All six time buckets exceed the 90% threshold from the very start.
        </p>
      </motion.div>

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

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="w-full max-w-4xl"
      >
        {view === 'radial' ? (
          <RadialBucketChart data={data} />
        ) : (
          <WinRateLine data={data} />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-8 max-w-3xl"
      >
        {showHalf ? (
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
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
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.map(bucket => (
              <div key={bucket.bucket_key} className="bg-surface-mid rounded-lg p-3 text-center">
                <div className="text-text-muted text-sm">{bucket.bucket_key} min</div>
                <div className="text-xl font-bold text-win">{(bucket.win_rate * 100).toFixed(1)}%</div>
                <div className="text-text-muted text-xs">{bucket.n} events</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Collapse Timeline Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-12 w-full max-w-4xl"
      >
        <h3 className="text-xl font-bold text-loss mb-4 text-center">
          The Most Dramatic Collapses
        </h3>
        <div className="bg-surface-mid rounded-xl p-6">
          <CollapseTimeline draws={drawsForCarousel} />
        </div>
      </motion.div>
    </section>
  );
}
