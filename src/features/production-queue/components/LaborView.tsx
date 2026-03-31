import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { StrainFormatRow, OrderLineItem } from '../types';
import type { SortKey } from './labor-view/constants';
import { groupByStrain, buildOrdersByStrain } from './labor-view/utils';
import { TriageTable, LaborQueue, StrainDetailPanel } from './labor-view';

// ─── LaborView (Orchestrator) ───────────────────────────────────────────────
// Renders one of two modes:
//   'triage' — compact scan table + detail panel on click
//   'labor'  — task-grouped work queues + detail panel on click
//
// Loss slider + summary stats live in ProductionQueue (parent).
// Detail panel is contextual — opens below whichever mode is active.

export type LaborViewMode = 'triage' | 'labor';

interface LaborViewProps {
  byStrain: StrainFormatRow[];
  byOrder: OrderLineItem[];
  loading?: boolean;
  mode: LaborViewMode;
  lossPct: number;
}

export default function LaborView({ byStrain, byOrder, loading, mode, lossPct }: LaborViewProps) {
  // ── Local state ──
  const [sortBy, setSortBy] = useState<SortKey>('urgency');
  const [selectedStrainId, setSelectedStrainId] = useState<string | null>(null);

  // ── Derived data ──
  const strainGroups = useMemo(() => groupByStrain(byStrain), [byStrain]);
  const ordersByStrain = useMemo(() => buildOrdersByStrain(byOrder), [byOrder]);

  // Selected strain for detail panel
  const selectedStrain = useMemo(
    () => strainGroups.find(g => (g.strainId ?? g.strainName) === selectedStrainId) ?? null,
    [strainGroups, selectedStrainId],
  );

  // ── Loading / Empty states ──
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading production data&hellip;</div>;
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
      {/* ── Mode-specific section ── */}
      {mode === 'triage' && (
        <TriageTable
          strains={strainGroups}
          lossPct={lossPct}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedStrainId={selectedStrainId}
          onSelectStrain={setSelectedStrainId}
        />
      )}

      {mode === 'labor' && (
        <LaborQueue
          strains={strainGroups}
          lossPct={lossPct}
          selectedStrainId={selectedStrainId}
          onSelectStrain={setSelectedStrainId}
        />
      )}

      {/* ── Detail Panel (shared across modes) ── */}
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
