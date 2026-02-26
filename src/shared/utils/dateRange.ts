export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export type DatePreset =
  | '30d'
  | '60d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'ytd'
  | 'all_time';

export interface DatePresetOption {
  key: DatePreset;
  label: string;
  shortLabel: string;
}

export const DATE_PRESETS: DatePresetOption[] = [
  { key: '30d', label: 'Last 30 Days', shortLabel: '30D' },
  { key: '60d', label: 'Last 60 Days', shortLabel: '60D' },
  { key: '90d', label: 'Last 90 Days', shortLabel: '90D' },
  { key: 'this_month', label: 'This Month', shortLabel: 'MTD' },
  { key: 'last_month', label: 'Last Month', shortLabel: 'Last Mo' },
  { key: 'this_quarter', label: 'This Quarter', shortLabel: 'QTD' },
  { key: 'ytd', label: 'Year to Date', shortLabel: 'YTD' },
  { key: 'all_time', label: 'All Time', shortLabel: 'All' },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  const today = toDateStr(now);

  switch (preset) {
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start: toDateStr(start), end: today, label: 'Last 30 Days' };
    }
    case '60d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 60);
      return { start: toDateStr(start), end: today, label: 'Last 60 Days' };
    }
    case '90d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start: toDateStr(start), end: today, label: 'Last 90 Days' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toDateStr(start), end: today, label: 'This Month' };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toDateStr(start), end: toDateStr(end), label: 'Last Month' };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: toDateStr(start), end: today, label: 'This Quarter' };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toDateStr(start), end: today, label: 'Year to Date' };
    }
    case 'all_time': {
      return { start: '2020-01-01', end: today, label: 'All Time' };
    }
  }
}

export function computePreviousPeriod(range: DateRange): DateRange {
  const startDate = new Date(range.start + 'T00:00:00');
  const endDate = new Date(range.end + 'T00:00:00');
  const durationMs = endDate.getTime() - startDate.getTime();

  const prevEnd = new Date(startDate.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    start: toDateStr(prevStart),
    end: toDateStr(prevEnd),
    label: 'Previous period',
  };
}

export function getPresetForRange(range: DateRange): DatePreset | null {
  for (const preset of DATE_PRESETS) {
    const computed = computeDateRange(preset.key);
    if (computed.start === range.start && computed.end === range.end) {
      return preset.key;
    }
  }
  return null;
}
