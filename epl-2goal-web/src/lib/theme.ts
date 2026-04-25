// Static fallback colors — Premier League brand palette
// (used by charts that can't read CSS vars at render time)
export const COLORS = {
  win: '#00FF85',     // PL fluoro green
  draw: '#FFE100',    // PL yellow card
  loss: '#E90052',    // PL magenta
  accent: '#04F5FF',  // PL electric cyan
  surface: { dark: '#1F0021', mid: '#37003C', light: '#5A1860' },
  text: { primary: '#FFFFFF', secondary: '#E6D8E8', muted: '#B49EB6' },
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
