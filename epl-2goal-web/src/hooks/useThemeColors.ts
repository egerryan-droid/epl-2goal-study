'use client';

import { useState, useEffect } from 'react';

export function useThemeColors() {
  const [colors, setColors] = useState({
    textPrimary: '#f5f6fa',
    textSecondary: '#d5dbe0',
    textMuted: '#99a3ad',
    surfaceDark: '#1a1a2e',
    surfaceMid: '#16213e',
    surfaceLight: '#0f3460',
  });

  useEffect(() => {
    function update() {
      const cs = getComputedStyle(document.documentElement);
      setColors({
        textPrimary: cs.getPropertyValue('--color-text-primary').trim() || '#f5f6fa',
        textSecondary: cs.getPropertyValue('--color-text-secondary').trim() || '#d5dbe0',
        textMuted: cs.getPropertyValue('--color-text-muted').trim() || '#99a3ad',
        surfaceDark: cs.getPropertyValue('--color-surface-dark').trim() || '#1a1a2e',
        surfaceMid: cs.getPropertyValue('--color-surface-mid').trim() || '#16213e',
        surfaceLight: cs.getPropertyValue('--color-surface-light').trim() || '#0f3460',
      });
    }
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
