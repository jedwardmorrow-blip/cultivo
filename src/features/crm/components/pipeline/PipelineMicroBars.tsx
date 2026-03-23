import { STAGE_COLORS, HEALTH_HEX } from './pipelineConstants';
import type { HealthStatus } from '../../hooks/useSalesPipeline';

interface MicroBarProps {
  value: number;
  max: number;
  color?: string;
  width?: number;
}

export function MicroBar({ value, max, color = '#22c55e', width = 48 }: MicroBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="rounded-full overflow-hidden bg-neutral-800/50 h-[4px]" style={{ width: `${width}px` }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

interface MiniPipelineBarProps {
  stages: { binned: number; bucked: number; trimmed: number; packaged: number };
  width?: number;
}

export function MiniPipelineBar({ stages, width = 60 }: MiniPipelineBarProps) {
  const total = stages.binned + stages.bucked + stages.trimmed + (stages.packaged * 3.5);
  if (total === 0) return <span className="text-xs text-neutral-700">&mdash;</span>;

  const keys: (keyof typeof stages)[] = ['binned', 'bucked', 'trimmed', 'packaged'];

  return (
    <div className="flex gap-px rounded-sm overflow-hidden h-[4px]" style={{ width: `${width}px` }}>
      {keys.map(k => {
        const val = k === 'packaged' ? stages[k] * 3.5 : stages[k];
        const pct = (val / total) * 100;
        return pct > 0 ? (
          <div key={k} className="h-full" style={{ width: `${pct}%`, background: STAGE_COLORS[k] }} />
        ) : null;
      })}
    </div>
  );
}

interface SupplyDemandBarProps {
  supply: number;
  demand: number;
  health: HealthStatus;
}

export function SupplyDemandBar({ supply, demand, health }: SupplyDemandBarProps) {
  const max = Math.max(supply, demand * 3.5, 1);
  const pct = Math.min((supply / max) * 100, 100);
  return (
    <div className="rounded-full overflow-hidden bg-neutral-800/50 h-[4px] w-12">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: HEALTH_HEX[health] }} />
    </div>
  );
}
