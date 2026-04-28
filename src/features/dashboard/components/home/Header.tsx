import { useEffect, useState } from 'react';

interface Props {
  tasksDoneToday: number;
  tasksTotalToday: number;
  loadedAt: number;
}

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFreshness(loadedAt: number, now: number): string {
  if (!loadedAt) return 'loading';
  const ageS = Math.max(0, Math.floor((now - loadedAt) / 1000));
  if (ageS < 5) return 'live';
  if (ageS < 60) return `${ageS}s ago`;
  const ageM = Math.floor(ageS / 60);
  if (ageM < 60) return `${ageM}m ago`;
  const ageH = Math.floor(ageM / 60);
  return `${ageH}h ago`;
}

export function HomeHeader({ tasksDoneToday, tasksTotalToday, loadedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="home-header">
      <div className="home-header-l">
        <span className="home-header-title">Command Center</span>
        <span className="home-header-date">{formatDate()}</span>
        <span className="home-header-tasks">
          tasks{' '}
          <strong>
            {tasksDoneToday} / {tasksTotalToday}
          </strong>{' '}
          today
        </span>
      </div>
      <div className="home-header-r">{formatFreshness(loadedAt, now)}</div>
    </div>
  );
}
