'use client';

import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import drawEvents from '@/data/draw_events.json';
import type { DrawEvent } from '@/lib/data';

const CollapseTimeline = dynamic(() => import('@/components/charts/CollapseTimeline'), { ssr: false });

const allDraws = drawEvents as DrawEvent[];

// Pick 5 most dramatic collapses by match_key
const FEATURED_MATCH_KEYS = [11877, 14483, 14108, 9432, 18581];
const featuredDraws = FEATURED_MATCH_KEYS
  .map(mk => allDraws.find(d => d.match_key === mk))
  .filter((d): d is DrawEvent => d !== undefined);
// Fallback if some keys don't match
const drawsForCarousel = featuredDraws.length >= 3 ? featuredDraws : allDraws.slice(0, 5);

export default function S05b_CollapseTimeline() {
  return (
    <SectionWrapper id="collapse-timeline" dark>
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-loss mb-4">
          The Most Dramatic Collapses
        </h2>

        <p className="text-text-secondary text-lg max-w-3xl mb-10">
          Five matches where a comfortable two-goal lead evaporated.
          Swipe through to see minute-by-minute how each collapse unfolded.
        </p>

        <div className="w-full max-w-4xl bg-surface-mid rounded-xl p-6">
          <CollapseTimeline draws={drawsForCarousel} />
        </div>
      </div>
    </SectionWrapper>
  );
}
