// Static fallback colors (used by charts that can't read CSS vars at render time)
export const COLORS = {
  win: '#2ecc71',
  draw: '#f39c12',
  loss: '#e74c3c',
  accent: '#3498db',
  surface: { dark: '#1a1a2e', mid: '#16213e', light: '#0f3460' },
  text: { primary: '#ECF0F1', secondary: '#BDC3C7', muted: '#7F8C8D' },
};

export const RESULT_COLORS = { W: COLORS.win, D: COLORS.draw, L: COLORS.loss };

/**
 * Read the current theme's color from CSS variables.
 * Falls back to the static COLORS if not in a browser.
 */
export function getThemeColor(varName: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}
