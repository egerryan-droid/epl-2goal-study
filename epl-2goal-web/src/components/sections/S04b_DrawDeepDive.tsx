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
        <h2 className="font-display text-4xl md:text-5xl font-bold text-draw mb-2">
          87 Times, the Lock Broke
        </h2>

        <p className="text-text-secondary text-lg mb-6 max-w-2xl">
          Top 10 teams by draws — by the minute they first reached +2.
        </p>

        <div className="w-full max-w-4xl">
          <DrawHeatmap data={draws} maxTeams={10} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 max-w-md w-full">
          {halves.map(h => (
            <div key={h.half} className="glass rounded-xl p-3 text-center">
              <div className="text-accent text-xs font-medium uppercase tracking-wider">
                {h.half === 'H1' ? '1st Half' : '2nd Half'}
              </div>
              <div className="text-2xl font-bold text-draw mt-1 font-display">
                {(h.draw_rate * 100).toFixed(1)}%
              </div>
              <div className="text-text-muted text-xs">draw rate</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
