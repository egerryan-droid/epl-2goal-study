'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SectionWrapper from '@/components/layout/SectionWrapper';
import QuoteCard from '@/components/ui/QuoteCard';
import { QUOTES } from '@/data/quotes';
import summaryTeam from '@/data/summary_by_team.json';
import type { SummaryTeam } from '@/lib/data';

import TeamCrest from '@/components/ui/TeamCrest';

const BubbleScatter = dynamic(() => import('@/components/charts/BubbleScatter'), { ssr: false });
const TeamBarChart = dynamic(() => import('@/components/charts/TeamBarChart'), { ssr: false });

const data = summaryTeam as SummaryTeam[];

export default function S07_TeamPerformance() {
  const [minEvents, setMinEvents] = useState(20);

  return (
    <SectionWrapper id="team-performance">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
          Team Performance
        </h2>
        <p className="text-text-secondary text-lg max-w-3xl mb-8">
          How do individual teams stack up at holding two-goal leads?
        </p>

        {/* Callout cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full mb-8">
          {[
            { team: 'Man City', crestKey: 'Manchester City', stat: '97.1%', detail: '208 events, 15 pts dropped', color: 'text-win' },
            { team: 'Arsenal', crestKey: 'Arsenal', stat: '0 losses', detail: '159 events, 96.9% win rate', color: 'text-accent' },
            { team: 'Southampton', crestKey: 'Southampton', stat: '87.0%', detail: '69 events, 21 pts dropped', color: 'text-loss' },
            { team: 'Liverpool', crestKey: 'Liverpool', stat: '9 draws', detail: '168 events, most draws of any team', color: 'text-draw' },
          ].map((card) => (
            <div
              key={card.team}
              className="bg-surface-mid rounded-xl p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                <TeamCrest team={card.crestKey} size={36} />
                {card.team}
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.stat}</div>
              <div className="text-text-muted text-xs">{card.detail}</div>
            </div>
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
          <div>
            <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Bubble Chart</h3>
            <BubbleScatter data={data} minEvents={minEvents} />
          </div>
          <div>
            <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Leaderboard</h3>
            <TeamBarChart data={data} limit={15} />
          </div>
        </div>

        {(() => {
          const q = QUOTES.find(q => q.section === 'team-performance');
          return q ? (
            <div className="max-w-2xl mx-auto mt-8">
              <QuoteCard quote={q} />
            </div>
          ) : null;
        })()}
      </div>
    </SectionWrapper>
  );
}
