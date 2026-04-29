import { useEffect, useState } from 'react';
import { Printer, CircleOff, Loader2, Check, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { cultivationService } from '../services';
import { formatDate } from '../utils/dateUtils';
import type { PlantGroup, IndividualPlant } from '../types';

interface ExpandedPlantsListProps {
  group: PlantGroup;
  onPrintSinglePlant: (plant: IndividualPlant) => void;
  onPrintSelectedPlants: (plants: IndividualPlant[]) => void;
  onPrintAllPlants: () => void;
}

export function ExpandedPlantsList({
  group,
  onPrintSinglePlant,
  onPrintSelectedPlants,
  onPrintAllPlants,
}: ExpandedPlantsListProps) {
  const [plants, setPlants] = useState<IndividualPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cultivationService.listIndividualPlants(group.id).then((data) => {
      if (!cancelled) { setPlants(data); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [group.id]);

  const activePlants = plants.filter((p) => p.is_active);
  const inactivePlants = plants.filter((p) => !p.is_active);

  function toggleSelect(plantId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === activePlants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activePlants.map((p) => p.id)));
    }
  }

  function handlePrint() {
    if (selectedIds.size > 0 && selectedIds.size < activePlants.length) {
      const selected = activePlants.filter((p) => selectedIds.has(p.id));
      onPrintSelectedPlants(selected);
    } else {
      onPrintAllPlants();
    }
  }

  async function handleDeactivateSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeactivating(true);
    setError(null);
    try {
      for (const id of ids) {
        await cultivationService.deactivateIndividualPlant(id);
      }
      const fresh = await cultivationService.listIndividualPlants(group.id);
      setPlants(fresh);
      setSelectedIds(new Set());
      setConfirmDeactivate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate plants.');
    } finally {
      setDeactivating(false);
    }
  }

  const motherPlantId = group.mother_group?.individual_plants?.find((p) => p.is_active)?.state_plant_id;
  const cloneDate = group.batch_registry?.clone_date;
  const daysInStage = Math.floor(
    (Date.now() - new Date(group.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-cult-border">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading plants...
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-cult-border italic">
        No plant IDs registered yet.
      </div>
    );
  }

  const allSelected = selectedIds.size === activePlants.length && activePlants.length > 0;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="border-t border-cult-surface bg-cult-surface/50">
      <div className="px-4 py-2.5 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
          {motherPlantId && (
            <div className="flex flex-col">
              <span className="text-xs text-cult-border uppercase tracking-wider">Mother ID</span>
              <span className="text-xs text-cult-text-primary font-mono">{motherPlantId}</span>
            </div>
          )}
          {cloneDate && (
            <div className="flex flex-col">
              <span className="text-xs text-cult-border uppercase tracking-wider">Clone Date</span>
              <span className="text-xs text-cult-text-muted">{formatDate(cloneDate)}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-cult-border uppercase tracking-wider">Stage Entered</span>
            <span className="text-xs text-cult-text-muted">{formatDate(group.stage_entered_at)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-cult-border uppercase tracking-wider">Days in Stage</span>
            <span className="text-xs text-cult-text-primary font-semibold">{daysInStage}d</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-cult-surface/50">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-cult-border hover:text-cult-text-muted transition-colors uppercase tracking-wider"
          >
            {allSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-cult-text-primary" />
              : <Square className="w-3.5 h-3.5" />
            }
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-cult-text-muted">
            <span className="text-cult-text-primary font-semibold">{activePlants.length}</span> active
            {inactivePlants.length > 0 && (
              <span className="text-cult-border ml-1">/ {inactivePlants.length} inactive</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              {!confirmDeactivate ? (
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  className="flex items-center gap-1 text-xs border border-cult-danger/40 text-cult-danger px-2 py-0.5 hover:border-cult-danger hover:text-cult-danger transition-all uppercase tracking-wider"
                >
                  <CircleOff className="w-3 h-3" />
                  Deactivate ({selectedIds.size})
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDeactivateSelected}
                    disabled={deactivating}
                    className="flex items-center gap-1 text-xs bg-cult-danger-muted border border-cult-danger text-cult-danger px-2 py-0.5 hover:bg-cult-danger-muted transition-all uppercase tracking-wider disabled:opacity-40"
                  >
                    {deactivating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeactivate(false)}
                    className="text-xs text-cult-border hover:text-cult-text-primary px-1 py-0.5 uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
          <button
            onClick={handlePrint}
            disabled={activePlants.length === 0}
            className="flex items-center gap-1.5 text-xs border border-cult-border text-cult-text-muted px-2 py-0.5 hover:border-cult-text-muted hover:text-cult-text-primary transition-all uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Printer className="w-3 h-3" />
            {someSelected && selectedIds.size < activePlants.length
              ? `Print Selected (${selectedIds.size})`
              : `Print All (${activePlants.length})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 mx-4 mb-2 bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs p-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto px-4 pb-3 space-y-0.5">
        {activePlants.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-2.5 py-1.5 border text-xs transition-all ${
              selectedIds.has(p.id)
                ? 'border-cult-text-muted bg-cult-black/80'
                : 'border-cult-surface bg-cult-black'
            }`}
          >
            <button
              onClick={() => toggleSelect(p.id)}
              className="flex-shrink-0 text-cult-border hover:text-cult-text-primary transition-colors"
            >
              {selectedIds.has(p.id)
                ? <CheckSquare className="w-3.5 h-3.5 text-cult-text-primary" />
                : <Square className="w-3.5 h-3.5" />
              }
            </button>
            <span className="font-mono text-cult-text-primary flex-1 min-w-0 truncate">{p.state_plant_id}</span>
            {p.notes && <span className="text-cult-border truncate max-w-[120px]">{p.notes}</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onPrintSinglePlant(p); }}
              title="Print label for this plant"
              className="flex-shrink-0 p-0.5 text-cult-border hover:text-cult-text-primary transition-colors"
            >
              <Printer className="w-3 h-3" />
            </button>
          </div>
        ))}
        {inactivePlants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 px-2.5 py-1.5 border border-cult-surface bg-black text-xs opacity-40"
          >
            <div className="w-3.5 flex-shrink-0" />
            <span className="font-mono text-cult-border line-through flex-1">{p.state_plant_id}</span>
            <CircleOff className="w-3 h-3 text-cult-surface flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
