import type { HarvestWindow } from '../hooks/useDashboardData';

interface Props {
  windows: HarvestWindow[];
}

export function HarvestPipeline({ windows }: Props) {
  const totalPlants = windows.reduce((s, w) => s + w.plants, 0);
  const totalDryLbs = windows.reduce((s, w) => s + w.estDryLbs, 0);
  const maxPlants = Math.max(...windows.map(w => w.plants), 1);

  const overdue = windows.filter(w => w.isOverdue);

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Harvest Pipeline
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-accent/10 text-cult-accent">
          {windows.length} windows
        </span>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[120px_80px_1fr_80px_90px] gap-3 px-3.5 pb-1.5 text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold">
        <span>Room</span>
        <span>Date</span>
        <span>Strains</span>
        <span className="text-right">Plants</span>
        <span className="text-right">Est. Dry lbs</span>
      </div>

      <div className="flex flex-col gap-2">
        {windows.map((w, i) => {
          const d = new Date(w.date);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const barPct = Math.max((w.plants / maxPlants) * 100, 10);

          return (
            <div
              key={i}
              className={`grid grid-cols-[120px_80px_1fr_80px_90px] items-center gap-3 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult
                hover:bg-cult-border transition-colors duration-200
                ${w.isOverdue ? 'border-l-2 border-cult-accent' : ''}`}
            >
              <div className="text-xs font-semibold text-cult-text-primary">{w.room}</div>
              <div className="text-[0.6875rem] font-medium" style={{ color: w.dateColor }}>
                {dateStr}{w.isOverdue ? ' ⚠' : ''}
              </div>
              <div className="h-[22px] bg-cult-surface-sunken rounded-cult overflow-hidden">
                <div
                  className="h-full rounded-cult flex items-center pl-2 text-[0.625rem] font-semibold text-cult-surface transition-all duration-700 ease-cult"
                  style={{ width: `${barPct}%`, backgroundColor: w.barColor }}
                >
                  {w.strainCount} strains
                </div>
              </div>
              <div className="text-xs font-semibold text-right tabular-nums">{w.plants.toLocaleString()}</div>
              <div className="text-[0.6875rem] font-semibold text-right tabular-nums text-cult-stage-harvest">
                ~{Math.round(w.estDryLbs)} lbs
              </div>
            </div>
          );
        })}
      </div>

      {/* Total row */}
      <div className="mt-2.5 pt-2 border-t border-cult-border flex justify-between text-xs">
        <span className="text-cult-text-muted font-medium">Total Pipeline (60 days)</span>
        <span>
          <strong>{totalPlants.toLocaleString()}</strong> plants →{' '}
          <strong className="text-cult-stage-harvest">~{Math.round(totalDryLbs)} lbs</strong> est. dry
        </span>
      </div>

      {overdue.length > 0 && (
        <div className="mt-2.5 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult text-[0.6875rem] font-light text-cult-text-secondary border-l-2 border-cult-stage-harvest">
          <strong className="text-cult-accent font-semibold">
            {overdue[0].room} overdue.
          </strong>{' '}
          {overdue[0].plants} plants ready now. Yield model: 2,256g wet/plant avg × 20% dry-back (from FLW-10 actuals).
        </div>
      )}
    </div>
  );
}
