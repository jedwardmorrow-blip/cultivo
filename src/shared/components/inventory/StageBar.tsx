/**
 * StageBar — horizontal stacked color bar showing weight by pipeline stage.
 * Shared between Sales Pipeline and Production Queue batch views.
 */

import type { BatchStage } from './types';
import { STAGE_COLORS, fmtGrams } from './stageColors';

export function StageBar({ stages }: { stages: BatchStage[] }) {
  const gramStages = stages.filter((s) => s.unit === 'g' && s.availableQty > 0);
  const total = gramStages.reduce((acc, s) => acc + s.availableQty, 0);

  if (total === 0 && stages.every((s) => s.availableQty === 0)) return null;

  return (
    <div>
      {total > 0 && (
        <div className="flex gap-[2px] h-2 rounded overflow-hidden mb-1.5">
          {gramStages.map((s) => {
            const pct = (s.availableQty / total) * 100;
            return (
              <div
                key={s.category}
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: STAGE_COLORS[s.stageName] || '#525252',
                }}
              />
            );
          })}
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        {stages
          .filter((s) => s.availableQty > 0)
          .map((s) => (
            <div key={s.category} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: STAGE_COLORS[s.stageName] || '#525252',
                }}
              />
              <span className="text-xs text-neutral-500">{s.stageName}</span>
              <span className="text-xs font-bold text-neutral-300 tabular-nums">
                {s.unit === 'unit'
                  ? s.availableQty.toLocaleString() + 'u'
                  : fmtGrams(s.availableQty)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
