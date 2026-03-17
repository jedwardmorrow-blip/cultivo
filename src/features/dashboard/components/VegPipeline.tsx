import type { VegStrain } from '../hooks/useDashboardData';

interface Props {
  strains: VegStrain[];
}

export function VegPipeline({ strains }: Props) {
  const totalPlants = strains.reduce((s, v) => s + v.count, 0);

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Veg Pipeline — VEG-01
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-success/10 text-cult-success-bright">
          {totalPlants} plants · {strains.length} strains
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        {strains.map(s => (
          <div
            key={s.name}
            className={`text-[0.5625rem] px-2 py-0.5 rounded-[10px] bg-cult-surface-overlay border font-medium
              ${s.count >= 25
                ? 'border-cult-stage-veg text-cult-success-bright'
                : 'border-cult-border text-cult-text-secondary'
              }`}
          >
            {s.name} ({s.count})
          </div>
        ))}
      </div>

      <div className="mt-3 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult text-[0.6875rem] font-light text-cult-text-secondary border-l-2 border-cult-text-muted">
        At 8–10 week flower cycle, these plants could yield ~{Math.round(totalPlants * 0.45)} lbs dry if flipped soon.
      </div>
    </div>
  );
}
