'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import goalsByMatch from '@/data/goals_by_match.json';
import type { GoalEvent, GoalsByMatch } from '@/lib/data';
import TeamCrest from '@/components/ui/TeamCrest';

const GoalTimeline = dynamic(() => import('@/components/charts/GoalTimeline'), { ssr: false });

const typedGoals = goalsByMatch as unknown as GoalsByMatch;

// Southampton 4-4 Liverpool, May 28 2023 — match_key 18581
const MYTH_MATCH_KEY = '18581';

export default function S02_TheMouth() {
  const { ref, inView } = useInView({ threshold: 0.2 });
  const goals = typedGoals[MYTH_MATCH_KEY] || [];

  return (
    <section
      ref={ref}
      id="the-myth"
      className="h-screen snap-start snap-always flex flex-col items-center justify-center px-6 py-20 overflow-hidden bg-surface-dark"
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
          May 28, 2023. Liverpool lead Southampton <span className="text-win font-semibold">2-0</span> away
          from home. The commentators had all but called the result. Then the unthinkable happened &mdash;
          Southampton scored <span className="text-loss font-semibold">four unanswered goals</span> to
          take a 4-2 lead, before Liverpool rescued a dramatic 4-4 draw with two late goals.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="w-full max-w-5xl"
      >
        {goals.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-center gap-4">
              <span className="flex items-center gap-2 text-text-primary font-display text-lg font-semibold">
                <TeamCrest team="Southampton" size={32} />
                Southampton
              </span>
              <span className="text-text-muted font-display text-sm">vs</span>
              <span className="flex items-center gap-2 text-text-primary font-display text-lg font-semibold">
                Liverpool
                <TeamCrest team="Liverpool" size={32} />
              </span>
            </div>
            <GoalTimeline
              goals={goals}
              homeTeam="Southampton"
              awayTeam="Liverpool"
            />
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1, duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <a
          href="https://www.youtube.com/watch?v=TizeozUuIKA"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 text-sm font-medium text-accent hover:text-white transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Watch the Full Collapse
        </a>

        <p className="text-text-muted text-lg mt-6 max-w-3xl text-center italic">
          Moments like these sustain one of football&apos;s most enduring myths.
          But how often does it actually happen?
        </p>
      </motion.div>
    </section>
  );
}
