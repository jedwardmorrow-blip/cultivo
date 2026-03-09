import type { ThroughputBucket } from '../types/rosin-lab.types';

export function getDateFrom(timeRange: string): string {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case 'all':
    default:
      return '2000-01-01';
  }
  return now.toISOString().split('T')[0];
}

export function getPreviousPeriodDates(timeRange: string): { from: string; to: string } {
  const days =
    timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() - days);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - days);
  return {
    from: periodStart.toISOString().split('T')[0],
    to: periodEnd.toISOString().split('T')[0],
  };
}

export function aggregateThroughput(
  data: Array<{ press_date: string; output_weight_grams: number }>,
  timeRange: string
): ThroughputBucket[] {
  if (!data || data.length === 0) return [];

  const bucketSize = timeRange === '7d' ? 'day' : timeRange === 'all' ? 'month' : 'week';
  const buckets = new Map<string, { totalGrams: number; runCount: number }>();

  for (const run of data) {
    const date = new Date(run.press_date);
    let key: string;

    if (bucketSize === 'day') {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (bucketSize === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      key = `Wk ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    if (!buckets.has(key)) {
      buckets.set(key, { totalGrams: 0, runCount: 0 });
    }
    const bucket = buckets.get(key)!;
    bucket.totalGrams += run.output_weight_grams || 0;
    bucket.runCount += 1;
  }

  return Array.from(buckets.entries()).map(([label, d]) => ({
    label,
    totalGrams: d.totalGrams,
    runCount: d.runCount,
  }));
}

export const CONSISTENCY_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

export const CONSISTENCY_LABELS: Record<string, string> = {
  badder: 'Badder',
  jam: 'Jam',
  sauce: 'Sauce',
  fresh_press: 'Fresh Press',
};

export const CHART_THEME = {
  gridColor: '#2E2E2E',
  axisTextColor: '#666666',
  tooltipBg: '#1C1C1C',
  tooltipBorder: '#404040',
  tooltipText: '#FFFFFF',
} as const;

export function getYieldBarColor(yieldPct: number): string {
  if (yieldPct >= 15) return '#34d399';
  if (yieldPct >= 10) return '#fbbf24';
  return '#f87171';
}
