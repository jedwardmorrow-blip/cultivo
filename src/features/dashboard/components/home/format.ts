export function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

export function fmtLbs(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString() + ' lbs';
  return n.toFixed(1) + ' lbs';
}

export function fmtPct(n: number): string {
  return n.toFixed(0) + '%';
}

export function fmtCount(n: number): string {
  return n.toLocaleString();
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysFromToday(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00').getTime();
  const t = new Date().setHours(0, 0, 0, 0);
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}
