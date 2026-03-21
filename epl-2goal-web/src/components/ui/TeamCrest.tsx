'use client';

import { getCrestUrl } from '@/lib/crests';

interface TeamCrestProps {
  team: string;
  size?: number;
  className?: string;
}

/**
 * Displays a team's crest/badge. Falls back to a colored circle with initials.
 */
export default function TeamCrest({ team, size = 32, className = '' }: TeamCrestProps) {
  const url = getCrestUrl(team);
  const initials = team
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-surface-light text-text-muted text-xs font-bold shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title={team}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${team} crest`}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      loading="lazy"
      onError={(e) => {
        // Fallback to initials on load error
        const target = e.currentTarget;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `flex items-center justify-center rounded-full bg-surface-light text-text-muted text-xs font-bold`;
        fallback.style.width = `${size}px`;
        fallback.style.height = `${size}px`;
        fallback.textContent = initials;
        target.parentElement?.appendChild(fallback);
      }}
    />
  );
}
