export function formatPressTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function formatCureDuration(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return '—';
  const days = Math.floor(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 86400000
  );
  return `${days}d`;
}

export function formatLogDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

export function getYieldColorClass(yieldPct: number | null): string {
  if (yieldPct === null) return 'text-cult-text-muted';
  if (yieldPct >= 15) return 'text-cult-success';
  if (yieldPct >= 10) return 'text-cult-warning';
  return 'text-cult-danger';
}

export function getCureLossColorClass(lossPct: number | null): string {
  if (lossPct === null) return 'text-cult-text-muted';
  if (lossPct < 3) return 'text-cult-success';
  if (lossPct <= 5) return 'text-cult-warning';
  return 'text-cult-danger';
}
