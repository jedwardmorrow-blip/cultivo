import { useMemo } from 'react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { StrainAggregate } from './constants';
import { calcTotalEstG, calcShortfallG, estOutputG, getCoverage } from './utils';
import { UrgencyBadge } from './shared-components';

// ─── Labor Queue ────────────────────────────────────────────────────────────
// Section 2: Three task-grouped cards — Buck, Trim, Package.
// Goal: "What does the team need to do today?" — grouped by task type.

interface LaborQueueProps {
  strains: StrainAggregate[];
  lossPct: number;
  selectedStrainId: string | null;
  onSelectStrain: (strainId: string | null) => void;
}

interface QueueItem {
  strain: StrainAggregate;
  weightG: number;
  isShortfall: boolean;
}

interface QueueGroup {
  key: 'buck' | 'trim' | 'package';
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  accentHex: string;
  timeEstimate: string;
  items: QueueItem[];
  totalWeightG: number;
}

function buildQueues(strains: StrainAggregate[], lossPct: number): QueueGroup[] {
  const buckItems: QueueItem[] = [];
  const trimItems: QueueItem[] = [];
  const packageItems: QueueItem[] = [];

  for (const strain of strains) {
    const { pipeline, totalDemandG } = strain;
    const totalEstG = calcTotalEstG(pipeline, lossPct);
    const coverage = getCoverage(pipeline.packaged.weightG, totalEstG, totalDemandG);

    // Only include strains that actually have work in that stage
    // or are in deficit (need material sourced)
    const binned = pipeline.binned.weightG;
    const bucked = pipeline.bucked.weightG;
    const bulk = pipeline.bulk.weightG;

    if (binned > 0) {
      buckItems.push({ strain, weightG: binned, isShortfall: false });
    }

    // Trim queue: bucked material + material coming from binned (after buck)
    const trimWeight = bucked + (binned > 0 ? binned * (1 - lossPct / 100) : 0);
    if (trimWeight > 0) {
      trimItems.push({ strain, weightG: trimWeight, isShortfall: false });
    }

    // Package queue: bulk material + material coming from trim
    if (bulk > 0 || bucked > 0 || binned > 0) {
      const pkgWeight = bulk + (bucked > 0 ? bucked * (1 - lossPct / 100) : 0);
      if (pkgWeight > 0 || bulk > 0) {
        packageItems.push({ strain, weightG: pkgWeight || bulk, isShortfall: false });
      }
    }

    // If deficit — flag the shortfall in the earliest possible queue
    if (coverage.state === 'deficit') {
      const shortfall = calcShortfallG(totalDemandG, totalEstG, lossPct);
      if (shortfall && binned === 0 && bucked === 0 && bulk === 0) {
        // Nothing in pipeline at all — show as shortfall in buck queue (first step)
        buckItems.push({ strain, weightG: shortfall.buckWeightNeeded, isShortfall: true });
      }
    }
  }

  // Sort each queue: most urgent first, then by weight desc
  const urgencySort = (a: QueueItem, b: QueueItem) => {
    const ur: Record<string, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4 };
    const diff = (ur[a.strain.urgency] ?? 4) - (ur[b.strain.urgency] ?? 4);
    return diff !== 0 ? diff : b.weightG - a.weightG;
  };

  buckItems.sort(urgencySort);
  trimItems.sort(urgencySort);
  packageItems.sort(urgencySort);

  return [
    {
      key: 'buck',
      label: 'Bucking',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/[0.06]',
      borderClass: 'border-orange-500/15',
      accentHex: '#fb923c',
      timeEstimate: '~2-3 days',
      items: buckItems,
      totalWeightG: buckItems.reduce((s, i) => s + i.weightG, 0),
    },
    {
      key: 'trim',
      label: 'Trimming',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/[0.06]',
      borderClass: 'border-amber-500/15',
      accentHex: '#fbbf24',
      timeEstimate: '~1-2 days',
      items: trimItems,
      totalWeightG: trimItems.reduce((s, i) => s + i.weightG, 0),
    },
    {
      key: 'package',
      label: 'Packaging',
      colorClass: 'text-sky-400',
      bgClass: 'bg-sky-500/[0.06]',
      borderClass: 'border-sky-500/15',
      accentHex: '#38bdf8',
      timeEstimate: 'same day',
      items: packageItems,
      totalWeightG: packageItems.reduce((s, i) => s + i.weightG, 0),
    },
  ];
}

function QueueCard({
  queue,
  selectedStrainId,
  onSelectStrain,
}: {
  queue: QueueGroup;
  selectedStrainId: string | null;
  onSelectStrain: (id: string | null) => void;
}) {
  if (queue.items.length === 0) {
    return (
      <div className={`flex-1 min-w-[240px] p-3 rounded-cult border border-cult-border/30 bg-cult-surface`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${queue.colorClass}`}>
            {queue.label}
          </span>
        </div>
        <div className="text-[11px] text-gray-600 italic py-4 text-center">
          No work queued
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-w-[240px] rounded-cult border ${queue.borderClass} ${queue.bgClass}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${queue.colorClass}`}>
            {queue.label}
          </span>
          <span className="text-[10px] text-gray-500">
            {queue.items.length} strain{queue.items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-cult-text-primary">
            {formatWeight(queue.totalWeightG)}
          </div>
          <div className="text-[9px] text-gray-500">{queue.timeEstimate}</div>
        </div>
      </div>

      {/* Items */}
      <div className="px-2 pb-2 flex flex-col gap-1">
        {queue.items.map(item => {
          const key = item.strain.strainId ?? item.strain.strainName;
          const isSelected = key === selectedStrainId;
          return (
            <div
              key={key + (item.isShortfall ? '-short' : '')}
              onClick={() => onSelectStrain(isSelected ? null : key)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-cult cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-cult-surface-raised border border-cult-border'
                  : 'hover:bg-cult-surface/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-medium text-cult-text-primary truncate">
                  {item.strain.strainName}
                </span>
                <UrgencyBadge urgency={item.strain.urgency} />
                {item.isShortfall && (
                  <span className="text-[9px] font-bold px-1 py-px rounded bg-rose-500/15 text-rose-400">
                    NEED
                  </span>
                )}
              </div>
              <span className="text-[12px] font-bold text-cult-text-primary whitespace-nowrap">
                {formatWeight(item.weightG)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LaborQueue({
  strains,
  lossPct,
  selectedStrainId,
  onSelectStrain,
}: LaborQueueProps) {
  const queues = useMemo(() => buildQueues(strains, lossPct), [strains, lossPct]);

  // Check if any queues have items
  const hasWork = queues.some(q => q.items.length > 0);
  if (!hasWork) {
    return (
      <div className="px-1">
        <h3 className="text-xs font-bold text-cult-text-primary uppercase tracking-wider mb-2">
          Labor Queue
        </h3>
        <div className="text-center py-6 text-[11px] text-gray-600 bg-cult-surface rounded-cult border border-cult-border/50">
          All strains are fully packaged or in surplus. No labor tasks queued.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-1 mb-2">
        <h3 className="text-xs font-bold text-cult-text-primary uppercase tracking-wider">
          Labor Queue
        </h3>
        <span className="text-[10px] text-gray-600">
          Post-production tasks by stage
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {queues.map(queue => (
          <QueueCard
            key={queue.key}
            queue={queue}
            selectedStrainId={selectedStrainId}
            onSelectStrain={onSelectStrain}
          />
        ))}
      </div>
    </div>
  );
}
