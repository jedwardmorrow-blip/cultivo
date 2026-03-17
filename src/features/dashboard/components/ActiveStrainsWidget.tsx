import type { ActiveStrain } from '../hooks/useDashboardData';

interface Props {
  strains: ActiveStrain[];
}

const STAGE_COLORS: Record<string, string> = {
  flower: '#F43F5E',
  cure: '#8B5CF6',
  clone: '#0EA5E9',
};

export function ActiveStrainsWidget({ strains }: Props) {
  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Active Strains
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-success/10 text-cult-success-bright">
          In Pipeline
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {strains.map(s => {
          const color = STAGE_COLORS[s.stage] || '#666666';
          return (
            <div
              key={s.name}
              className="text-[0.5625rem] px-2 py-0.5 rounded-[10px] bg-cult-surface-overlay border font-medium"
              style={{ borderColor: color, color }}
            >
              {s.name} · {s.lbs.toFixed(1)} lbs
            </div>
          );
        })}
      </div>

      {strains.length > 0 && (
        <div className="mt-3.5 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult text-[0.6875rem] font-light text-cult-text-secondary border-l-2 border-cult-text-muted">
          {strains.length} strains in post-production pipeline. Color indicates predominant stage.
        </div>
      )}
    </div>
  );
}
