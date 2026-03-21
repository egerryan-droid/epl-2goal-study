'use client';

import { motion } from 'framer-motion';

export type TabId = 'my-team' | 'head-to-head' | 'matches';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

/* Clean SVG icons instead of emojis */
function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5 21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6" />
      <path d="M8 8 4 4" />
      <path d="M5 3 3 5" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h10" />
    </svg>
  );
}

const TABS: Tab[] = [
  { id: 'my-team', label: 'My Team', icon: <TeamIcon /> },
  { id: 'head-to-head', label: 'Head to Head', icon: <SwordsIcon /> },
  { id: 'matches', label: 'Matches', icon: <ListIcon /> },
];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex flex-col sm:flex-row rounded-xl glass p-1 gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors z-10"
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent to-[#5dade2] shadow-[0_2px_12px_rgba(52,152,219,0.3)]"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10 text-text-muted">{tab.icon}</span>
          <span
            className={`relative z-10 font-display ${
              active === tab.id ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {tab.label}
          </span>
          {/* Active tab bottom glow */}
          {active === tab.id && (
            <motion.div
              layoutId="activeTabGlow"
              className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-accent/60 blur-[2px]"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
