'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import goalsByMatch from '@/data/goals_by_match.json';
import dimTeam from '@/data/dim_team.json';
import type { GoalEvent, GoalsByMatch } from '@/lib/data';

const GoalTimeline = dynamic(() => import('@/components/charts/GoalTimeline'), { ssr: false });

const typedGoals = goalsByMatch as unknown as GoalsByMatch;

// Bournemouth 4-3 Liverpool, Dec 4 2016 — match_key 4618
const BOURNEMOUTH_MATCH_KEY = '4618';

export default function S02_TheMouth() {
  const { ref, inView } = useInView({ threshold: 0.2 });
  const goals = typedGoals[BOURNEMOUTH_MATCH_KEY] || [];

  return (
    <section
      ref={ref}
      id="the-myth"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #16213e 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-4xl text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
          The <span className="text-loss">Myth</span>
        </h2>
        <p className="text-text-secondary text-lg md:text-xl leading-relaxed">
          December 4, 2016. Liverpool lead Bournemouth <span className="text-win font-semibold">2-0</span> away
          from home. The commentators had all but called the result. Then the unthinkable happened &mdash;
          Bournemouth scored <span className="text-loss font-semibold">four unanswered goals</span> to
          complete one of the most dramatic comebacks in Premier League history.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="w-full max-w-5xl"
      >
        {goals.length > 0 && (
          <GoalTimeline
            goals={goals}
            homeTeam="Bournemouth"
            awayTeam="Liverpool"
          />
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1, duration: 0.8 }}
        className="text-text-muted text-lg mt-12 max-w-3xl text-center italic"
      >
        Moments like these sustain one of football&apos;s most enduring myths.
        But how often does it actually happen?
      </motion.p>
    </section>
  );
}
