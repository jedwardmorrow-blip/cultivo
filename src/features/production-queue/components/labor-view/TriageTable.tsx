import { useMemo } from 'react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { StrainAggregate, CoverageState, SortKey } from './constants';
import { URGENCY_RANK } from './constants';
import { calcTotalEstG, getCoverage, fmtPct, getLaborTag } from './utils';
import { UrgencyBadge, COVERAGE_COLORS } from './shared-components';

// ─── Triage Table ───────────────────────────────────────────────────────────
// Section 1: One-row-per-strain scan table.
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
    <div>
      {/* Summary badges */}
      <div className="flex items-center gap-3 px-1 mb-3">
        <span className="text-sm text-gray-400">{strains.length} strains</span>
        {deficitCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-cult-danger-muted text-cult-danger">
            {deficitCount} deficit
          </span>
        )}
        {tightCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-cult-warning-muted text-cult-warning">
            {tightCount} tight
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-cult-surface rounded-cult border border-cult-border/50 overflow-hidden">
        {/* Sortable header row */}
        <div
          className="grid gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-cult-border/40 select-none"
          style={{ gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.8fr 1.1fr' }}
        >
          <button onClick={() => onSortChange('urgency')} className={`text-left transition-colors hover:text-gray-300 ${sortBy === 'urgency' ? 'text-cult-text-primary' : ''}`}>
            Strain {sortBy === 'urgency' && '↓'}
          </button>
          <button onClick={() => onSortChange('demand')} className={`text-left transition-colors hover:text-gray-300 ${sortBy === 'demand' ? 'text-cult-text-primary' : ''}`}>
            Demand {sortBy === 'demand' && '↓'}
          </button>
          <button onClick={() => onSortChange('ready')} className={`text-left transition-colors hover:text-gray-300 ${sortBy === 'ready' ? 'text-cult-text-primary' : ''}`}>
            Ready {sortBy === 'ready' && '↑'}
          </button>
          <button onClick={() => onSortChange('coverage')} className={`text-left transition-colors hover:text-gray-300 ${sortBy === 'coverage' ? 'text-cult-text-primary' : ''}`}>
            Coverage {sortBy === 'coverage' && '↑'}
          </button>
          <div>Next Action</div>
        </div>

        {/* Data rows */}
        <div className="divide-y divide-cult-border/20">
          {sorted.map(row => {
            const isSelected = (row.strain.strainId ?? row.strain.strainName) === selectedStrainId;
            const coverageBorderClass = row.coverage.state === 'deficit'
              ? 'border-l-[3px] border-l-cult-danger/50'
              : row.coverage.state === 'tight'
                ? 'border-l-[3px] border-l-cult-warning/40'
                : 'border-l-[3px] border-l-transparent';

            return (
              <div
                key={row.strain.strainId ?? row.strain.strainName}
                onClick={() => onSelectStrain(
                  isSelected ? null : (row.strain.strainId ?? row.strain.strainName)
                )}
                className={`grid gap-4 px-5 py-3.5 cursor-pointer transition-colors ${coverageBorderClass} ${
                  isSelected
                    ? 'bg-cult-surface-raised'
                    : 'hover:bg-cult-surface-raised/50'
                }`}
                style={{ gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.8fr 1.1fr' }}
              >
                {/* Strain name + urgency */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-cult-text-primary text-sm truncate">
                        {row.strain.strainName}
                      </span>
                      <UrgencyBadge urgency={row.strain.urgency} />
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {row.strain.formats.map(f => f.formatLabel).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Demand */}
                <div className="flex flex-col justify-center">
                  <div className="text-sm font-bold text-cult-text-primary">
                    {formatWeight(row.strain.totalDemandG)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {row.strain.orderCount} order{row.strain.orderCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Ready % */}
                <div className="flex flex-col justify-center">
                  <div className={`text-base font-bold font-montserrat ${COVERAGE_COLORS[row.coverage.state]}`}>
                    {fmtPct(row.readyPct)}
                  </div>
                  <div className="flex h-1.5 rounded-sm bg-cult-border overflow-hidden mt-1 w-20">
                    <div
                      className={`rounded-sm ${
                        row.coverage.state === 'surplus' ? 'bg-cult-success'
                        : row.coverage.state === 'tight' ? 'bg-cult-warning'
                        : 'bg-cult-danger'
                      }`}
                      style={{ width: `${Math.min(row.readyPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Coverage state badge */}
                <div className="flex items-center">
                  {row.coverage.state === 'surplus' ? (
                    <span className="text-xs font-semibold text-cult-success">
                      {row.coverage.label}
                    </span>
                  ) : (
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                      row.coverage.state === 'tight'
                        ? 'bg-cult-warning/15 text-cult-warning'
                        : 'bg-cult-danger/15 text-cult-danger'
                    }`}>
                      {row.coverage.label}
                    </span>
                  )}
                </div>

                {/* Next action */}
                <div className="flex items-center">
                  {row.laborTag.label ? (
                    <span className={`text-sm font-semibold ${row.laborTag.color}`}>
                      {row.laborTag.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 italic">—</span>
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
