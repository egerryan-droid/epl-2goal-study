'use client';

import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import summaryOverall from '@/data/summary_overall.json';
import type { SummaryOverall } from '@/lib/data';

const AnimatedDonut = dynamic(() => import('@/components/charts/AnimatedDonut'), { ssr: false });
const KpiCard = dynamic(() => import('@/components/ui/KpiCard'), { ssr: false });

const data = summaryOverall as SummaryOverall[];

function getMetric(name: string): number {
  return data.find(m => m.metric === name)?.value ?? 0;
}

export default function S04_BigPicture() {
  const totalEvents = getMetric('Total +2 Events');
  const winRate = getMetric('Win Rate');
  const totalPtsDropped = getMetric('Total Points Dropped');

  const wins = Math.round(totalEvents * winRate);
  const drawCount = Math.round(totalEvents * getMetric('Draw Rate'));
  const losses = totalEvents - wins - drawCount;

  return (
    <SectionWrapper id="big-picture" dark>
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          The Big Picture
        </h2>

        <p className="text-text-secondary text-lg mb-12 max-w-3xl">
          Of 1,907 two-goal leads, the leader won {wins.toLocaleString()} times.
          Just {drawCount} were drawn and {losses} lost.
        </p>

        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl w-full">
          <div className="flex-shrink-0">
            <AnimatedDonut wins={wins} draws={drawCount} losses={losses} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
            <KpiCard value={93.3} label="Win Rate" suffix="%" decimals={1} color="#2ecc71" />
            <KpiCard value={totalPtsDropped} label="Total Points Dropped" color="#e74c3c" />
            <KpiCard value={127} label="Non-Win Events" color="#f39c12" />
            <KpiCard value={0.154} label="Avg Points Dropped / Event" decimals={3} color="#3498db" />
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
