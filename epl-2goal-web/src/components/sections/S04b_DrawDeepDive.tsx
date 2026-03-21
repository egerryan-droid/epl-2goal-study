'use client';

import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import drawEvents from '@/data/draw_events.json';
import halfStats from '@/data/summary_half_stats.json';
import type { DrawEvent, HalfSummary } from '@/lib/data';

const DrawHeatmap = dynamic(() => import('@/components/charts/DrawHeatmap'), { ssr: false });

const draws = drawEvents as DrawEvent[];
const halves = halfStats as HalfSummary[];

export default function S04b_DrawDeepDive() {
  return (
    <SectionWrapper id="draw-deep-dive">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-draw mb-4">
          87 Times, the Lock Broke
        </h2>

        <p className="text-text-secondary text-lg mb-10 max-w-3xl">
          Where do draws cluster? This heatmap shows every team&apos;s draws by the minute bucket
          when they first reached +2.
        </p>

        <div className="w-full max-w-5xl">
          <DrawHeatmap data={draws} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10 max-w-xl w-full">
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
      </div>
    </SectionWrapper>
  );
}
