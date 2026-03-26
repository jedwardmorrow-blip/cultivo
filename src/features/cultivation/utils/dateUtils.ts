// Re-export canonical formatWeight from shared utils (lbs at 453.592g threshold)
export { formatWeight } from '@/shared/utils/format';

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export { todayIso, daysBetween } from '@/shared/utils/format';
