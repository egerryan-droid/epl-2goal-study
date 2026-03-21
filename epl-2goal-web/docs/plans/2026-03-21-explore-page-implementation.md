# Explore Page: Team Explorer Hub - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the existing `/explore` page from a basic spotlight + table into a three-tab Team Explorer Hub with interactive charts, team comparison, and a polished match browser.

**Architecture:** Enhance the existing `src/app/explore/page.tsx` by extracting tab content into separate components, adding chart integrations, and wrapping everything in a tab-based layout. All data is already imported via static JSON.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Framer Motion, Recharts, D3

---

### Task 1: Create Tab Navigation Component

**Files:**
- Create: `src/components/explore/TabBar.tsx`

**Step 1: Create TabBar component**

```tsx
'use client';

import { motion } from 'framer-motion';

const TABS = [
  { id: 'my-team', label: 'My Team', icon: '⚽' },
  { id: 'head-to-head', label: 'Head to Head', icon: '⚔️' },
  { id: 'matches', label: 'Matches', icon: '📋' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export default function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-mid p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            active === tab.id
              ? 'text-white'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-accent"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">
            {tab.icon} {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd C:\ryane\Projects\epl-2goal-study\epl-2goal-web && npx tsc --noEmit`
Expected: Clean

**Step 3: Commit**

```bash
git add src/components/explore/TabBar.tsx
git commit -m "feat(explore): add TabBar component with animated active indicator"
```

---

### Task 2: Create TeamSelector Component

**Files:**
- Create: `src/components/explore/TeamSelector.tsx`

**Step 1: Build TeamSelector dropdown**

A searchable dropdown with team names sorted alphabetically. Shows team's win rate next to name as a small badge.

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Team, SummaryTeam } from '@/lib/data';

export default function TeamSelector({
  teams,
  summaryTeams,
  selected,
  onSelect,
  placeholder = 'Select a team...',
}: {
  teams: Team[];
  summaryTeams: SummaryTeam[];
  selected: string | null;
  onSelect: (teamKey: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sorted = teams
    .slice()
    .sort((a, b) => a.team_display_name.localeCompare(b.team_display_name))
    .filter((t) =>
      t.team_display_name.toLowerCase().includes(search.toLowerCase()),
    );

  const selectedTeam = teams.find((t) => t.team_key === selected);
  const selectedSummary = summaryTeams.find((s) => s.team_key === selected);

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-surface-light bg-surface-mid px-4 py-3 text-left text-sm transition hover:border-accent"
      >
        <span className={selected ? 'text-text-primary font-medium' : 'text-text-muted'}>
          {selectedTeam ? selectedTeam.team_display_name : placeholder}
        </span>
        {selectedSummary && (
          <span className="ml-2 rounded-full bg-win/20 px-2 py-0.5 text-xs font-bold text-win">
            {(selectedSummary.win_rate * 100).toFixed(1)}%
          </span>
        )}
        <span className="ml-2 text-text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-surface-light bg-surface-dark shadow-xl">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border-b border-surface-light bg-transparent px-4 py-2 text-sm text-text-primary placeholder-text-muted outline-none"
          />
          <button
            onClick={() => { onSelect(null); setOpen(false); setSearch(''); }}
            className="w-full px-4 py-2 text-left text-sm text-text-muted hover:bg-surface-mid"
          >
            Clear selection
          </button>
          {sorted.map((t) => {
            const summary = summaryTeams.find((s) => s.team_key === t.team_key);
            return (
              <button
                key={t.team_key}
                onClick={() => { onSelect(t.team_key); setOpen(false); setSearch(''); }}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-surface-mid ${
                  selected === t.team_key ? 'bg-accent/10 text-accent' : 'text-text-primary'
                }`}
              >
                <span>{t.team_display_name}</span>
                {summary && (
                  <span className="text-xs text-text-muted">
                    {summary.n_as_leader} events
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/explore/TeamSelector.tsx
git commit -m "feat(explore): add searchable TeamSelector dropdown"
```

---

### Task 3: Create MyTeamTab Component

**Files:**
- Create: `src/components/explore/MyTeamTab.tsx`

**Step 1: Build MyTeamTab**

This tab shows KPI cards, a danger radar (RadialBucketChart), CollapseTimeline carousel for draws, and a season breakdown. Import and reuse existing chart components.

Key features:
- 4 animated KPI cards (Events, Win Rate, Draws, Points Dropped)
- "Danger Profile" section with RadialBucketChart showing per-bucket win rate for the team
- If team has draws, show CollapseTimeline carousel
- Season mini-chart (simplified)
- Empty state when no team is selected: "Select a team above to see their 2-goal lead record"

Uses dynamic imports for chart components (`next/dynamic` with `ssr: false`).

Receives props: `{ teamKey: string | null; teams: Team[]; summaryTeams: SummaryTeam[]; events: Plus2Event[]; drawEvents: DrawEvent[]; bucketData: SummaryBucket[] }`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/explore/MyTeamTab.tsx
git commit -m "feat(explore): add MyTeamTab with KPIs, danger radar, and collapse carousel"
```

---

### Task 4: Create HeadToHeadTab Component

**Files:**
- Create: `src/components/explore/HeadToHeadTab.tsx`

**Step 1: Build HeadToHeadTab**

Two TeamSelectors side-by-side. When both teams are selected, show:
- Mirrored KPI cards with color-coded "better" highlights (green for better, red for worse)
- Overlaid comparison: both teams' bucket-level stats in a side-by-side bar chart or table
- Points dropped breakdown for each team

Receives props: `{ teams: Team[]; summaryTeams: SummaryTeam[]; events: Plus2Event[]; bucketData: SummaryBucket[] }`

Empty state: "Select two teams to compare their 2-goal lead records"

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/explore/HeadToHeadTab.tsx
git commit -m "feat(explore): add HeadToHeadTab with dual team comparison"
```

---

### Task 5: Extract MatchBrowserTab Component

**Files:**
- Create: `src/components/explore/MatchBrowserTab.tsx`
- Modify: `src/app/explore/page.tsx` (remove inline match browser code)

**Step 1: Extract existing match browser code**

Move all match browser logic (filters, table, pagination, expandable rows) from `page.tsx` into a standalone `MatchBrowserTab` component. Keep the same functionality but make it accept data via props.

Props: `{ events: Plus2Event[]; goalsByMatch: GoalsByMatch; teams: Team[]; seasons: Season[] }`

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/explore/MatchBrowserTab.tsx
git commit -m "refactor(explore): extract MatchBrowserTab component"
```

---

### Task 6: Rewrite Explore Page with Tabs

**Files:**
- Modify: `src/app/explore/page.tsx`

**Step 1: Rewrite page.tsx**

Replace the current monolithic page with:
1. Header with "← Back to Story" and page title
2. TeamSelector (prominent, top-center) — used by MyTeam tab
3. TabBar (My Team | Head to Head | Matches)
4. Tab content area with AnimatePresence transitions
5. Import and render MyTeamTab, HeadToHeadTab, MatchBrowserTab based on active tab

Also import bucket data: `summary_by_bucket.json`

**Step 2: Verify build**

Run: `npx tsc --noEmit && npm run build`

**Step 3: Commit**

```bash
git add src/app/explore/page.tsx
git commit -m "feat(explore): rewrite page with three-tab layout"
```

---

### Task 7: Add Navigation Links

**Files:**
- Modify: `src/components/sections/S11_Verdict.tsx` (add "Explore the Data →" button)
- Modify: `src/components/layout/Header.tsx` (add Explore link to nav)

**Step 1: Add CTA to Verdict section**

Add a prominent button at the bottom of S11_Verdict linking to `/explore`:
```tsx
<Link href="/explore" className="...">
  Explore the Data →
</Link>
```

**Step 2: Add Explore to Header nav**

Add a small "Explore" link in the fixed header, next to the section dots.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/components/sections/S11_Verdict.tsx src/components/layout/Header.tsx
git commit -m "feat: add navigation links between story and explore page"
```

---

### Task 8: Visual Polish and Responsive Testing

**Files:**
- Modify: Various explore components for responsive tweaks

**Step 1: Test on mobile viewport**

Verify all three tabs work on small screens (375px). Fix any overflow or layout issues.

**Step 2: Test tab transitions**

Verify AnimatePresence transitions between tabs are smooth.

**Step 3: Final build and type check**

Run: `npx tsc --noEmit && npm run build`

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(explore): responsive polish and tab transitions"
```

---

### Task 9: Push and Deploy

**Step 1: Push to GitHub**

```bash
git push origin master
```

**Step 2: Verify Vercel auto-deploys**

Check that https://epl2goalstudy.live updates with the new /explore page.

**Step 3: Test live site**

Navigate to https://epl2goalstudy.live/explore and verify all tabs work.
