'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summarySeason from '@/data/summary_by_season.json';
import type { SummarySeason } from '@/lib/data';

const SeasonAreaChart = dynamic(() => import('@/components/charts/SeasonAreaChart'), { ssr: false });

const data = summarySeason as SummarySeason[];

export default function S08_SeasonTrends() {
  const { ref, inView } = useInView({ threshold: 0.2 });
  const [showDraws, setShowDraws] = useState(false);

  const sorted = [...data].sort((a, b) => a.sort_order - b.sort_order);
  const maxDraws = Math.max(...sorted.map(d => d.draws));

  return (
    <section
      ref={ref}
      id="season-trends"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          A Decade of Two-Goal Leads
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          How has the safety of a two-goal lead changed across ten EPL seasons?
        </p>
      </motion.div>

      <button
        onClick={() => setShowDraws(!showDraws)}
        className={`mb-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          showDraws
            ? 'bg-draw text-surface-dark'
            : 'bg-surface-mid text-text-secondary hover:bg-surface-light'
        }`}
      >
        {showDraws ? 'Showing Draw Count' : 'Show Draw Count'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="w-full max-w-5xl"
      >
        <SeasonAreaChart data={data} />
      </motion.div>

      {showDraws && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6 max-w-5xl w-full"
        >
          <div className="flex items-end gap-2 justify-center h-32">
            {sorted.map(s => {
              const height = (s.draws / maxDraws) * 100;
              return (
                <div key={s.season_key} className="flex flex-col items-center gap-1">
                  <span className="text-draw text-xs font-bold">{s.draws}</span>
                  <div
                    className="w-8 rounded-t"
                    style={{ height: `${height}%`, background: '#f39c1290' }}
                  />
                  <span className="text-text-muted text-[10px] -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                    {s.season_key.replace('-', '/')}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-text-muted text-sm mt-6">
            2015/16 had 15 draws — nearly double the average
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mt-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-surface-mid rounded-xl p-4"
        >
          <div className="text-loss text-sm font-medium">Riskiest Season</div>
          <div className="text-text-primary text-xl font-bold">2015/16</div>
          <div className="text-text-muted text-sm">88.6% win rate, 15 draws, 45 pts dropped</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-surface-mid rounded-xl p-4"
        >
          <div className="text-win text-sm font-medium">Safest Season</div>
          <div className="text-text-primary text-xl font-bold">2016/17</div>
          <div className="text-text-muted text-sm">96.5% win rate, 4 draws, 17 pts dropped</div>
        </motion.div>
      </div>
    </section>
  );
}
