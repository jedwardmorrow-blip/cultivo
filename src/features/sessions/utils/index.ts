export function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
