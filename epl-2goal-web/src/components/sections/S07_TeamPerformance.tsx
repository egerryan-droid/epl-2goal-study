'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryTeam from '@/data/summary_by_team.json';
import type { SummaryTeam } from '@/lib/data';

const BubbleScatter = dynamic(() => import('@/components/charts/BubbleScatter'), { ssr: false });
const TeamBarChart = dynamic(() => import('@/components/charts/TeamBarChart'), { ssr: false });
const PointsDroppedBar = dynamic(() => import('@/components/charts/PointsDroppedBar'), { ssr: false });

const data = summaryTeam as SummaryTeam[];

export default function S07_TeamPerformance() {
  const { ref, inView } = useInView({ threshold: 0.15 });
  const [minEvents, setMinEvents] = useState(20);

  return (
    <section
      ref={ref}
      id="team-performance"
      className="min-h-screen flex flex-col items-center px-6 py-20 bg-surface-dark"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
          Team Performance
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          How do individual teams stack up at holding two-goal leads?
        </p>
      </motion.div>

      {/* Callout cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full mb-8">
        {[
          { team: 'Man City', stat: '97.1%', detail: '208 events, 15 pts dropped', color: 'text-win' },
          { team: 'Arsenal', stat: '0 losses', detail: '159 events, 96.9% win rate', color: 'text-accent' },
          { team: 'Southampton', stat: '87.0%', detail: '69 events, 21 pts dropped', color: 'text-loss' },
          { team: 'Liverpool', stat: '9 draws', detail: '168 events, most draws of any team', color: 'text-draw' },
        ].map((card, i) => (
          <motion.div
            key={card.team}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 * i, duration: 0.5 }}
            className="bg-surface-mid rounded-xl p-4 text-center"
          >
            <div className="text-text-muted text-sm">{card.team}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.stat}</div>
            <div className="text-text-muted text-xs">{card.detail}</div>
          </motion.div>
        ))}
      </div>

      {/* Min events filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-text-muted text-sm">Min events:</span>
        <input
          type="range"
          min={1}
          max={50}
          value={minEvents}
          onChange={e => setMinEvents(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-text-primary text-sm font-medium">{minEvents}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Bubble Chart</h3>
          <BubbleScatter data={data} minEvents={minEvents} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Leaderboard</h3>
          <TeamBarChart data={data} limit={15} />
        </motion.div>
      </div>

      {/* Points Dropped Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="mt-12 max-w-4xl w-full"
      >
        <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Points Dropped Breakdown</h3>
        <p className="text-text-muted text-sm mb-4">
          Orange = points lost from draws (2 per draw). Red = points lost from defeats (3 per loss).
        </p>
        <div className="bg-surface-mid rounded-xl p-4">
          <PointsDroppedBar data={data} limit={15} />
        </div>
      </motion.div>
    </section>
  );
}
