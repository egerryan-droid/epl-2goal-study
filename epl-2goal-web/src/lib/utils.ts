import { RESULT_COLORS } from './theme';

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function getResultColor(result: 'W' | 'D' | 'L'): string {
  return RESULT_COLORS[result];
}

export function getResultLabel(result: 'W' | 'D' | 'L'): string {
  const labels: Record<string, string> = { W: 'Win', D: 'Draw', L: 'Loss' };
  return labels[result];
}
