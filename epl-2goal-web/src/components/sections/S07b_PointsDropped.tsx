'use client';

import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import summaryTeam from '@/data/summary_by_team.json';
import type { SummaryTeam } from '@/lib/data';

const PointsDroppedBar = dynamic(() => import('@/components/charts/PointsDroppedBar'), { ssr: false });

const data = summaryTeam as SummaryTeam[];

export default function S07b_PointsDropped() {
  return (
    <SectionWrapper id="points-dropped" dark>
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          Points Dropped Breakdown
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-10">
          Orange = points lost from draws (2 per draw). Red = points lost from defeats (3 per loss).
          Which teams bleed the most when their two-goal lead slips?
        </p>

        <div className="w-full max-w-4xl bg-surface-mid rounded-xl p-6">
          <PointsDroppedBar data={data} limit={15} />
        </div>
      </div>
    </SectionWrapper>
  );
}
