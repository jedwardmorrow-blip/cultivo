import type { HealthStatus, GradeCode } from '../../hooks/useSalesPipeline';

export const HEALTH_STYLES: Record<HealthStatus, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-900', label: 'Critical' },
  low: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-900', label: 'Low' },
  warning: { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-900', label: 'Warning' },
  healthy: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-900', label: 'Healthy' },
};

export const HEALTH_HEX: Record<HealthStatus, string> = {
  critical: '#ff6b6b',
  low: '#ffb347',
  warning: '#ffd93d',
  healthy: '#22c55e',
};

export const GRADE_STYLES: Record<GradeCode, { bg: string; text: string; border: string; label: string }> = {
  CULT: { bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-800', label: 'CULT' },
  B: { bg: 'bg-sky-950/50', text: 'text-sky-400', border: 'border-sky-800', label: 'B Grade' },
  C: { bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-800', label: 'C Grade' },
  D: { bg: 'bg-neutral-800/50', text: 'text-neutral-400', border: 'border-neutral-700', label: 'D Grade' },
  UNDEFINED: { bg: 'bg-neutral-900/50', text: 'text-neutral-500', border: 'border-neutral-800', label: 'Ungraded' },
};

export const STAGE_COLORS: Record<string, string> = {
  binned: '#3b82f6',
  bucked: '#8b5cf6',
  trimmed: '#f59e0b',
  packaged: '#22c55e',
  byproduct: '#525252',
};

export const STAGE_TW: Record<string, { text: string; bg: string }> = {
  binned: { text: 'text-blue-400', bg: 'bg-blue-500' },
  bucked: { text: 'text-violet-400', bg: 'bg-violet-500' },
  trimmed: { text: 'text-amber-400', bg: 'bg-amber-500' },
  packaged: { text: 'text-emerald-400', bg: 'bg-emerald-500' },
  byproduct: { text: 'text-neutral-500', bg: 'bg-neutral-600' },
};

export function formatGrams(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
  return Math.round(v).toLocaleString();
}

export function formatCurrency(v: number): string {
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'k';
  return '$' + Math.round(v).toLocaleString();
}

export function formatCurrencyFull(v: number): string {
  return '$' + Math.round(v).toLocaleString();
}
