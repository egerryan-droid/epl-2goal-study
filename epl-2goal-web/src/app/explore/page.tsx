'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TabBar, { type TabId } from '@/components/explore/TabBar';
import TeamSelector from '@/components/explore/TeamSelector';
import LoadingSkeleton from '@/components/explore/LoadingSkeleton';
import { useDataset } from '@/hooks/useDataset';
import type {
  Plus2Event,
  SummaryTeam,
  GoalsByMatch,
  Season,
  Team,
  DrawEvent,
  SummaryBucket,
} from '@/lib/data';

// Small data (< 20KB total) — safe to bundle for instant header render
import teamsRaw from '@/data/dim_team.json';
import seasonsRaw from '@/data/dim_season.json';
import summaryTeamRaw from '@/data/summary_by_team.json';
import bucketDataRaw from '@/data/summary_by_bucket.json';

const teams = teamsRaw as Team[];
const seasons = seasonsRaw as Season[];
const summaryTeams = summaryTeamRaw as SummaryTeam[];
const bucketData = bucketDataRaw as SummaryBucket[];

// Tab components — code-split, loaded only when needed
const MyTeamTab = dynamic(() => import('@/components/explore/MyTeamTab'), {
  ssr: false,
  loading: () => <LoadingSkeleton />,
});
const HeadToHeadTab = dynamic(
  () => import('@/components/explore/HeadToHeadTab'),
  { ssr: false, loading: () => <LoadingSkeleton /> },
);
const MatchBrowserTab = dynamic(
  () => import('@/components/explore/MatchBrowserTab'),
  { ssr: false, loading: () => <LoadingSkeleton /> },
);

const tabMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25 },
};

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabId>('my-team');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Heavy data — fetched on demand from API routes, cached in memory
  const { data: events, loading: eventsLoading } =
    useDataset<Plus2Event[]>('events');
  const { data: drawEvents, loading: drawsLoading } =
    useDataset<DrawEvent[]>('draws');

  // Goals only needed by Match Browser — fetch when that tab is active
  const shouldLoadGoals = activeTab === 'matches';
  const { data: goalsByMatch, loading: goalsLoading } =
    useDataset<GoalsByMatch>(shouldLoadGoals ? 'goals' : '');

  const dataReady = !eventsLoading && !drawsLoading;
  const matchesReady = dataReady && (!shouldLoadGoals || !goalsLoading);

  return (
    <main className="min-h-screen bg-surface-dark pb-20">
      {/* Header — renders instantly (no heavy data needed) */}
      <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <span
            aria-hidden
            className="inline-block transition-transform duration-200 group-hover:-translate-x-1"
          >
            &larr;
          </span>{' '}
          Back to Story
        </Link>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          EPL 2-Goal Lead Explorer
        </h1>
        <div className="mt-3 h-[2px] w-16 rounded-full bg-gradient-to-r from-accent to-transparent" />
        <p className="mt-2 text-text-secondary">
          1,907 two-goal leads across 10 EPL seasons
        </p>
      </header>

      {/* Team Selector — only on My Team tab */}
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

      {/* Tab Bar — always visible immediately */}
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'my-team' && (
            <motion.div key="my-team" {...tabMotion}>
              {dataReady && events && drawEvents ? (
                <MyTeamTab
                  teamKey={selectedTeam}
                  teams={teams}
                  summaryTeams={summaryTeams}
                  events={events}
                  drawEvents={drawEvents}
                  bucketData={bucketData}
                />
              ) : (
                <LoadingSkeleton />
              )}
            </motion.div>
          )}
          {activeTab === 'head-to-head' && (
            <motion.div key="h2h" {...tabMotion}>
              {dataReady && events ? (
                <HeadToHeadTab
                  teams={teams}
                  summaryTeams={summaryTeams}
                  events={events}
                />
              ) : (
                <LoadingSkeleton />
              )}
            </motion.div>
          )}
          {activeTab === 'matches' && (
            <motion.div key="matches" {...tabMotion}>
              {matchesReady && events && goalsByMatch ? (
                <MatchBrowserTab
                  events={events}
                  goalsByMatch={goalsByMatch}
                  teams={teams}
                  seasons={seasons}
                />
              ) : (
                <LoadingSkeleton />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
