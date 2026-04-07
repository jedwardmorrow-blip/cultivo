import type { BatchPlanData } from '../types';

// Stage colors from design sketch: Binned=indigo, Bucked=violet, Bulk=emerald, Packaged=cyan, Trim=stone
const STAGE_CONFIG = [
  { key: 'binned_g' as const, label: 'Binned', color: 'bg-indigo-500' },
  { key: 'bucked_g' as const, label: 'Bucked', color: 'bg-violet-500' },
  { key: 'bulk_g' as const, label: 'Bulk', color: 'bg-cult-success' },
  { key: 'packaged_g' as const, label: 'Packaged', color: 'bg-cyan-500' },
  { key: 'trim_g' as const, label: 'Trim', color: 'bg-stone-500' },
] as const;

interface BatchStageBarProps {
  batch: BatchPlanData;
  /** Height class, e.g. "h-2" or "h-3". Default "h-2.5" */
  height?: string;
}

export function BatchStageBar({ batch, height = 'h-2.5' }: BatchStageBarProps) {
  const total = batch.total_weight_g;
  if (total <= 0) return null;

  const segments = STAGE_CONFIG
    .map(cfg => ({ ...cfg, value: batch[cfg.key] }))
    .filter(s => s.value > 0);

  return (
    <div className="space-y-1">
      {/* Bar */}
      <div className={`flex ${height} rounded-full overflow-hidden gap-px bg-gray-800`}>
        {segments.map(seg => (
          <div
            key={seg.key}
            className={`${seg.color} transition-all`}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${seg.value.toLocaleString()}g`}
          />
        ))}
      </div>

      {/* Legend text */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map(seg => (
          <span key={seg.key} className="flex items-center gap-1 text-xs text-gray-400">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${seg.color}`} />
            {seg.label} ({seg.value.toLocaleString()}g)
          </span>
        ))}
      </div>
    </div>
  );
}
