'use client';

import { motion } from 'framer-motion';

export type TabId = 'my-team' | 'head-to-head' | 'matches';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'my-team', label: 'My Team', icon: '\u26BD' },
  { id: 'head-to-head', label: 'Head to Head', icon: '\u2694\uFE0F' },
  { id: 'matches', label: 'Matches', icon: '\uD83D\uDCCB' },
];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex flex-col sm:flex-row rounded-xl bg-surface-mid p-1 gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors z-10"
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-accent"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.icon}</span>
          <span
            className={`relative z-10 ${
              active === tab.id ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
