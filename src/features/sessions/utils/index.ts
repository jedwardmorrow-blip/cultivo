export function formatElapsedTime(startedAt: string, totalPauseMinutes?: number): string {
  const start = new Date(startedAt);
  const now = new Date();
  const wallClockMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
  const activeMinutes = Math.max(0, wallClockMinutes - Math.floor(totalPauseMinutes || 0));
  const hours = Math.floor(activeMinutes / 60);
  const mins = activeMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
