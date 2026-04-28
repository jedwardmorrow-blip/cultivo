import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

const fmtDate = (iso: string) => {
  if (!iso || iso === 'TBD') return 'TBD';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

export function BottomTimeline() {
  const { data, loading } = useDashboardData();
  const windows = data?.harvestPipeline ?? [];
  const totalLbs = windows.reduce((sum, w) => sum + (w.estDryLbs ?? 0), 0);
  const overdueCount = windows.filter((w) => w.isOverdue).length;

  return (
    <div className="fpl-timeline">
      <div className="fpl-timeline-cap">
        <div>
          <div className="fpl-timeline-eyebrow">60 DAYS · HARVEST PIPELINE</div>
          <div className="fpl-timeline-h">
            Harvest queue
            <em>
              {loading
                ? 'loading…'
                : `${windows.length} window${windows.length === 1 ? '' : 's'} · ${totalLbs.toFixed(0)} lbs est${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
            </em>
          </div>
        </div>
      </div>
      <div
        className="fpl-timeline-strip"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(windows.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {windows.length === 0 ? (
          <div className="fpl-tl-day" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>
            <div className="fpl-tl-name" style={{ color: 'var(--op-ink-3)' }}>
              {loading ? 'loading harvest windows…' : 'no harvest windows in next 60 days'}
            </div>
          </div>
        ) : (
          windows.map((w) => (
            <div
              key={`${w.room}-${w.date}`}
              className={`fpl-tl-day ${w.isOverdue ? 'is-today' : ''}`}
            >
              <div
                className="fpl-tl-num"
                style={{
                  color: w.isOverdue ? 'var(--status-bad)' : 'var(--op-ink)',
                }}
              >
                {fmtDate(w.date)}
              </div>
              <div className="fpl-tl-name">
                {w.isOverdue ? 'overdue' : 'projected'}
              </div>
              <div
                className={`fpl-tl-pill ${w.isOverdue ? 'urgent' : 'attention'}`}
                style={{
                  background: w.isOverdue
                    ? 'rgba(197,106,106,0.10)'
                    : 'rgba(232,224,212,0.06)',
                  borderColor: w.isOverdue
                    ? 'rgba(197,106,106,0.40)'
                    : 'rgba(232,224,212,0.18)',
                }}
              >
                <div className="fpl-tl-pill-room">{w.room}</div>
                <div className="fpl-tl-pill-strain">
                  {w.estDryLbs.toFixed(0)} lbs · {w.plants}p
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
