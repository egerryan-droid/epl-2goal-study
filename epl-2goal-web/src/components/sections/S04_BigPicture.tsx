'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';
import dynamic from 'next/dynamic';
import summaryOverall from '@/data/summary_overall.json';
import drawEvents from '@/data/draw_events.json';
import halfStats from '@/data/summary_half_stats.json';
import type { SummaryOverall, DrawEvent, HalfSummary } from '@/lib/data';

const AnimatedDonut = dynamic(() => import('@/components/charts/AnimatedDonut'), { ssr: false });
const KpiCard = dynamic(() => import('@/components/ui/KpiCard'), { ssr: false });
const DrawHeatmap = dynamic(() => import('@/components/charts/DrawHeatmap'), { ssr: false });

const data = summaryOverall as SummaryOverall[];
const draws = drawEvents as DrawEvent[];
const halves = halfStats as HalfSummary[];

function getMetric(name: string): number {
  return data.find(m => m.metric === name)?.value ?? 0;
}

export default function S04_BigPicture() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  const totalEvents = getMetric('Total +2 Events');
  const winRate = getMetric('Win Rate');
  const totalPtsDropped = getMetric('Total Points Dropped');

  // Calculate W/D/L from rates
  const wins = Math.round(totalEvents * winRate);
  const drawCount = Math.round(totalEvents * getMetric('Draw Rate'));
  const losses = totalEvents - wins - drawCount;

  return (
    <section
      ref={ref}
      id="big-picture"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-3xl md:text-5xl font-bold text-text-primary mb-4 text-center"
      >
        The Big Picture
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-text-secondary text-lg mb-12 text-center max-w-2xl"
      >
        Of 1,907 two-goal leads, the leader won {wins.toLocaleString()} times.
        Just {drawCount} were drawn and {losses} lost.
      </motion.p>

      <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex-shrink-0"
        >
          <AnimatedDonut wins={wins} draws={drawCount} losses={losses} />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          <KpiCard value={93.3} label="Win Rate" suffix="%" decimals={1} color="#2ecc71" />
          <KpiCard value={totalPtsDropped} label="Total Points Dropped" color="#e74c3c" />
          <KpiCard value={127} label="Non-Win Events" color="#f39c12" />
          <KpiCard value={0.154} label="Avg Points Dropped / Event" decimals={3} color="#3498db" />
        </div>
      </div>

      {/* Draw deep-dive sub-panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="mt-16 max-w-6xl w-full"
      >
        <h3 className="text-2xl font-bold text-draw mb-2 text-center">
          But 87 Times, the Lock Broke
        </h3>
        <p className="text-text-secondary text-center mb-8 max-w-2xl mx-auto">
          Where do draws cluster? This heatmap shows every team&apos;s draws by the minute bucket
          when they first reached +2.
        </p>

        <DrawHeatmap data={draws} />

        {/* H1 vs H2 comparison bar */}
        <div className="grid grid-cols-2 gap-4 mt-8 max-w-xl mx-auto">
          {halves.map(h => (
            <div key={h.half} className="bg-surface-mid rounded-xl p-4 text-center">
              <div className="text-accent text-sm font-medium">
                {h.half === 'H1' ? 'First Half Leads' : 'Second Half Leads'}
              </div>
              <div className="text-3xl font-bold text-draw mt-1">
                {(h.draw_rate * 100).toFixed(1)}%
              </div>
              <div className="text-text-muted text-sm">draw rate ({h.draws} of {h.n})</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
