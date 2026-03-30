import { useMemo } from 'react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { StrainAggregate, CoverageState, SortKey } from './constants';
import { URGENCY_RANK } from './constants';
import { calcTotalEstG, getCoverage, fmtPct, getLaborTag } from './utils';
import { UrgencyBadge, COVERAGE_COLORS } from './shared-components';

// ─── Triage Table ───────────────────────────────────────────────────────────
// Section 1: Compact one-row-per-strain scan table.
// Goal: "Which strains need attention?" — answerable in 2 seconds.

interface TriageTableProps {
  strains: StrainAggregate[];
  lossPct: number;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  selectedStrainId: string | null;
  onSelectStrain: (strainId: string | null) => void;
}

interface TriageRow {
  strain: StrainAggregate;
  readyG: number;
  totalEstG: number;
  readyPct: number;
  coverage: { state: CoverageState; label: string };
  laborTag: { label: string; color: string };
}

function buildRows(strains: StrainAggregate[], lossPct: number): TriageRow[] {
  return strains.map(strain => {
    const readyG = strain.pipeline.packaged.weightG;
    const totalEstG = calcTotalEstG(strain.pipeline, lossPct);
    const readyPct = strain.totalDemandG > 0 ? (readyG / strain.totalDemandG) * 100 : 0;
    const coverage = getCoverage(readyG, totalEstG, strain.totalDemandG);
    const laborTag = getLaborTag(strain.pipeline, strain.totalDemandG, lossPct);
    return { strain, readyG, totalEstG, readyPct, coverage, laborTag };
  });
}

function sortRows(rows: TriageRow[], sortBy: SortKey, lossPct: number): TriageRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === 'urgency') return (URGENCY_RANK[a.strain.urgency] ?? 4) - (URGENCY_RANK[b.strain.urgency] ?? 4);
    if (sortBy === 'demand') return b.strain.totalDemandG - a.strain.totalDemandG;
    if (sortBy === 'ready') return a.readyPct - b.readyPct;
    if (sortBy === 'coverage') return (a.totalEstG / (a.strain.totalDemandG || 1)) - (b.totalEstG / (b.strain.totalDemandG || 1));
    return 0;
  });
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'urgency', label: 'Urgency' },
  { key: 'demand', label: 'Need' },
  { key: 'ready', label: 'Least Ready' },
  { key: 'coverage', label: 'Coverage' },
];

export default function TriageTable({
  strains,
  lossPct,
  sortBy,
  onSortChange,
  selectedStrainId,
  onSelectStrain,
}: TriageTableProps) {
  const rows = useMemo(() => buildRows(strains, lossPct), [strains, lossPct]);
  const sorted = useMemo(() => sortRows(rows, sortBy, lossPct), [rows, sortBy, lossPct]);

  // Counts
  const deficitCount = rows.filter(r => r.coverage.state === 'deficit').length;
  const tightCount = rows.filter(r => r.coverage.state === 'tight').length;

  return (
    <div className="space-y-2">
      {/* Section Header + Sort controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-cult-text-primary uppercase tracking-wider">
            Strain Triage
          </h3>
          <span className="text-[10px] text-gray-600">{strains.length} strains</span>
          {deficitCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/60 text-rose-400">
              {deficitCount} deficit
            </span>
          )}
          {tightCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-400">
              {tightCount} tight
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 font-medium mr-1">Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => onSortChange(opt.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                sortBy === opt.key
                  ? 'bg-cult-surface-overlay text-cult-text-primary'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-cult-surface rounded-cult border border-cult-border/50 overflow-hidden">
        {/* Header row */}
        <div
          className="grid gap-3 px-4 py-2 text-[9px] font-semibold text-gray-600 uppercase tracking-wider border-b border-cult-border/30"
          style={{ gridTemplateColumns: '1.4fr 0.7fr 0.6fr 0.8fr 1fr' }}
        >
          <div>Strain</div>
          <div>Demand</div>
          <div>Ready</div>
          <div>Coverage</div>
          <div>Next Action</div>
        </div>

        {/* Data rows */}
        <div className="divide-y divide-cult-border/20">
          {sorted.map(row => {
            const isSelected = (row.strain.strainId ?? row.strain.strainName) === selectedStrainId;
            const coverageBorderClass = row.coverage.state === 'deficit'
              ? 'border-l-2 border-l-rose-500/40'
              : row.coverage.state === 'tight'
                ? 'border-l-2 border-l-amber-500/30'
                : 'border-l-2 border-l-transparent';

            return (
              <div
                key={row.strain.strainId ?? row.strain.strainName}
                onClick={() => onSelectStrain(
                  isSelected ? null : (row.strain.strainId ?? row.strain.strainName)
                )}
                className={`grid gap-3 px-4 py-2.5 cursor-pointer transition-colors ${coverageBorderClass} ${
                  isSelected
                    ? 'bg-cult-surface-raised'
                    : 'hover:bg-cult-surface-raised/50'
                }`}
                style={{ gridTemplateColumns: '1.4fr 0.7fr 0.6fr 0.8fr 1fr' }}
              >
                {/* Strain name + urgency */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-cult-text-primary text-[12px] truncate">
                        {row.strain.strainName}
                      </span>
                      <UrgencyBadge urgency={row.strain.urgency} />
                    </div>
                    <div className="text-[10px] text-gray-600 truncate mt-px">
                      {row.strain.formats.map(f => f.formatLabel).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Demand */}
                <div>
                  <div className="text-[13px] font-bold text-cult-text-primary">
                    {formatWeight(row.strain.totalDemandG)}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {row.strain.orderCount} order{row.strain.orderCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Ready % */}
                <div>
                  <div className={`text-[14px] font-bold font-montserrat ${COVERAGE_COLORS[row.coverage.state]}`}>
                    {fmtPct(row.readyPct)}
                  </div>
                  <div className="flex h-1 rounded-sm bg-cult-border overflow-hidden mt-1 w-16">
                    <div className="bg-emerald-400 rounded-sm" style={{ width: `${Math.min(row.readyPct, 100)}%` }} />
                  </div>
                </div>

                {/* Coverage state badge */}
                <div className="flex items-center">
                  {row.coverage.state === 'surplus' ? (
                    <span className="text-[10px] font-semibold text-emerald-400">
                      {row.coverage.label}
                    </span>
                  ) : (
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wide ${
                      row.coverage.state === 'tight'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {row.coverage.label}
                    </span>
                  )}
                </div>

                {/* Next action */}
                <div className="flex items-center">
                  {row.laborTag.label ? (
                    <span className={`text-[11px] font-semibold ${row.laborTag.color}`}>
                      {row.laborTag.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600 italic">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
