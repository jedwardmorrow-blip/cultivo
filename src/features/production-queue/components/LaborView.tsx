import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatWeight } from '@/shared/utils/format';
import type { StrainFormatRow, OrderLineItem } from '../types';
import type { SortKey } from './labor-view/constants';
import { groupByStrain, buildOrdersByStrain, calcTotalEstG, getCoverage } from './labor-view/utils';
import { TriageTable, LaborQueue, StrainDetailPanel } from './labor-view';

// ─── LaborView (Orchestrator) ───────────────────────────────────────────────
// Three-section layout:
//   1. Triage Table  — compact scan, one row per strain
//   2. Labor Queue   — task-grouped cards (Buck, Trim, Package)
//   3. Detail Panel  — full strain breakdown (shown on click)
//
// Props unchanged from v1 — drop-in replacement.

interface LaborViewProps {
  byStrain: StrainFormatRow[];
  byOrder: OrderLineItem[];
  loading?: boolean;
}

export default function LaborView({ byStrain, byOrder, loading }: LaborViewProps) {
  // ── Shared state ──
  const [lossPct, setLossPct] = useState(15);
  const [sortBy, setSortBy] = useState<SortKey>('urgency');
  const [selectedStrainId, setSelectedStrainId] = useState<string | null>(null);

  // ── Derived data ──
  const strainGroups = useMemo(() => groupByStrain(byStrain), [byStrain]);
  const ordersByStrain = useMemo(() => buildOrdersByStrain(byOrder), [byOrder]);

  // Summary stats
  const totalOrderedG = strainGroups.reduce((s, g) => s + g.totalOrderedG, 0);
  const totalReadyG = strainGroups.reduce((s, g) => s + g.pipeline.packaged.weightG, 0);
  const totalDemandG = strainGroups.reduce((s, g) => s + g.totalDemandG, 0);

  // Selected strain for detail panel
  const selectedStrain = useMemo(
    () => strainGroups.find(g => (g.strainId ?? g.strainName) === selectedStrainId) ?? null,
    [strainGroups, selectedStrainId],
  );

  // ── Loading / Empty states ──
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading production data\u2026</div>;
  }

  if (strainGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No strain data to display. Adjust filters or check order data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Global controls bar ── */}
      <div className="flex items-center gap-5 px-4 py-2.5 bg-cult-surface rounded-cult border border-cult-border/50 flex-wrap">
        {/* Summary stats */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Ordered</div>
          <div className="text-lg font-bold text-cult-text-primary">{formatWeight(totalOrderedG)}</div>
        </div>
        <span className="text-gray-600">&rarr;</span>
        <div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wide">Packaged</div>
          <div className="text-lg font-bold text-emerald-400">{formatWeight(totalReadyG)}</div>
        </div>
        <span className="text-gray-600">&rarr;</span>
        <div>
          <div className="text-[10px] text-rose-400 uppercase tracking-wide">Still Need</div>
          <div className="text-lg font-bold text-rose-400">{formatWeight(totalDemandG)}</div>
        </div>

        <div className="w-px h-7 bg-cult-border" />

        {/* Loss slider */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-gray-500 font-medium">Loss</label>
          <input
            type="range"
            min={5}
            max={35}
            step={1}
            value={lossPct}
            onChange={e => setLossPct(Number(e.target.value))}
            className="w-16 accent-amber-400"
          />
          <span className="text-xs font-semibold text-amber-400 min-w-[28px]">{lossPct}%</span>
        </div>
      </div>

      {/* ── Section 1: Triage Table ── */}
      <TriageTable
        strains={strainGroups}
        lossPct={lossPct}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedStrainId={selectedStrainId}
        onSelectStrain={setSelectedStrainId}
      />

      {/* ── Section 2: Labor Queue ── */}
      <LaborQueue
        strains={strainGroups}
        lossPct={lossPct}
        selectedStrainId={selectedStrainId}
        onSelectStrain={setSelectedStrainId}
      />

      {/* ── Section 3: Strain Detail Panel ── */}
      {selectedStrain && (
        <StrainDetailPanel
          strain={selectedStrain}
          lossPct={lossPct}
          orders={ordersByStrain.get(selectedStrain.strainId ?? '') ?? []}
          onClose={() => setSelectedStrainId(null)}
        />
      )}
    </div>
  );
}
