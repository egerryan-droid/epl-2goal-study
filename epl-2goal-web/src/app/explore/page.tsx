'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import TabBar, { type TabId } from '@/components/explore/TabBar';
import TeamSelector from '@/components/explore/TeamSelector';
import MyTeamTab from '@/components/explore/MyTeamTab';
import HeadToHeadTab from '@/components/explore/HeadToHeadTab';
import MatchBrowserTab from '@/components/explore/MatchBrowserTab';
import type {
  Plus2Event,
  SummaryTeam,
  GoalsByMatch,
  Season,
  Team,
  DrawEvent,
  SummaryBucket,
} from '@/lib/data';

import eventsRaw from '@/data/fact_plus2_events.json';
import goalsByMatchRaw from '@/data/goals_by_match.json';
import teamsRaw from '@/data/dim_team.json';
import seasonsRaw from '@/data/dim_season.json';
import summaryTeamRaw from '@/data/summary_by_team.json';
import drawEventsRaw from '@/data/draw_events.json';
import bucketDataRaw from '@/data/summary_by_bucket.json';

const events = eventsRaw as Plus2Event[];
const goalsByMatch = goalsByMatchRaw as unknown as GoalsByMatch;
const teams = teamsRaw as Team[];
const seasons = seasonsRaw as Season[];
const summaryTeams = summaryTeamRaw as SummaryTeam[];
const drawEvents = drawEventsRaw as DrawEvent[];
const bucketData = bucketDataRaw as SummaryBucket[];

const tabMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25 },
};

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabId>('my-team');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-surface-dark pb-20">
      {/* Header */}
      <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <span aria-hidden className="inline-block transition-transform duration-200 group-hover:-translate-x-1">&larr;</span> Back to Story
        </Link>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          EPL 2-Goal Lead Explorer
        </h1>
        <div className="mt-3 h-[2px] w-16 rounded-full bg-gradient-to-r from-accent to-transparent" />
        <p className="mt-2 text-text-secondary">
          1,907 two-goal leads across 10 EPL seasons
        </p>
      </header>

      {/* Team Selector — only visible on My Team tab */}
      {activeTab === 'my-team' && (
        <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <TeamSelector
            teams={teams}
            summaryTeams={summaryTeams}
            selected={selectedTeam}
            onSelect={setSelectedTeam}
          />
        </div>
      )}

      {/* Tab Bar */}
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'my-team' && (
            <motion.div key="my-team" {...tabMotion}>
              <MyTeamTab
                teamKey={selectedTeam}
                teams={teams}
                summaryTeams={summaryTeams}
                events={events}
                drawEvents={drawEvents}
                bucketData={bucketData}
              />
            </motion.div>
          )}
          {activeTab === 'head-to-head' && (
            <motion.div key="h2h" {...tabMotion}>
              <HeadToHeadTab
                teams={teams}
                summaryTeams={summaryTeams}
                events={events}
              />
            </motion.div>
          )}
          {activeTab === 'matches' && (
            <motion.div key="matches" {...tabMotion}>
              <MatchBrowserTab
                events={events}
                goalsByMatch={goalsByMatch}
                teams={teams}
                seasons={seasons}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
