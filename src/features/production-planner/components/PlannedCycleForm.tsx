import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import type { StrainCultivationStats, CalendarPlannedEntry, CalendarRoom, MotherBatchGroupRow } from '../types';
import { plannedCyclesService } from '../services/plannedCyclesService';

interface PlannedCycleFormProps {
  room: CalendarRoom;
  strainStats: StrainCultivationStats[];
  motherBatchGroups?: MotherBatchGroupRow[];
  initialFlowerStartDate?: string | null;
  /** If provided, we are editing an existing cycle */
  editing?: CalendarPlannedEntry | null;
  onSave: () => void;
  onClose: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

interface CohortStrainRow {
  rowId: string;
  strainId: string;
  plantCount: string;
  motherBatchGroupId: string;
}

function makeRow(strainId = '', plantCount = '', motherBatchGroupId = ''): CohortStrainRow {
  return {
    rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strainId,
    plantCount,
    motherBatchGroupId,
  };
}

function confidenceWarnings(strains: StrainCultivationStats[]): string[] {
  return strains.flatMap((strain) => {
    const warnings: string[] = [];
    if ((strain.harvest_count ?? 0) < 3) {
      warnings.push(`${strain.strain_name}: ${strain.harvest_count ?? 0} harvest records`);
    }
    if ((strain.conversion_sessions ?? 0) < 3) {
      warnings.push(`${strain.strain_name}: ${strain.conversion_sessions ?? 0} conversion sessions`);
    }
    if (strain.conversion_confidence && strain.conversion_confidence !== 'high') {
      warnings.push(`${strain.strain_name}: ${strain.conversion_confidence} conversion confidence`);
    }
    return warnings;
  });
}

export function PlannedCycleForm({ room, strainStats, motherBatchGroups = [], initialFlowerStartDate, editing, onSave, onClose }: PlannedCycleFormProps) {
  const activeStrains = useMemo(
    () => strainStats.filter((s) => s.is_active).sort((a, b) => a.strain_name.localeCompare(b.strain_name)),
    [strainStats]
  );

  const [strainRows, setStrainRows] = useState<CohortStrainRow[]>(() => [
    makeRow(editing?.strain_id ?? (activeStrains[0]?.strain_id ?? ''), editing?.planned_plant_count?.toString() ?? ''),
  ]);
  const [flowerStartDate, setFlowerStartDate] = useState(toInputDate(editing?.flower_start_date ?? initialFlowerStartDate ?? ''));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const strainById = useMemo(
    () => new Map(activeStrains.map((s) => [s.strain_id, s])),
    [activeStrains]
  );

  const validRows = useMemo(() => {
    return strainRows
      .map((row) => ({
        ...row,
        strain: strainById.get(row.strainId) ?? null,
        count: parseInt(row.plantCount, 10),
      }))
      .filter((row) => row.strain && Number.isFinite(row.count) && row.count > 0);
  }, [strainById, strainRows]);

  const motherGroupsByStrain = useMemo(() => {
    const map = new Map<string, MotherBatchGroupRow[]>();
    for (const group of motherBatchGroups) {
      if (group.active_plant_count <= 0) continue;
      const list = map.get(group.strain_id) ?? [];
      list.push(group);
      map.set(group.strain_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const roomCompare = (a.room_code ?? a.room_name ?? '').localeCompare(b.room_code ?? b.room_name ?? '');
        if (roomCompare !== 0) return roomCompare;
        return (b.last_created_at ?? '').localeCompare(a.last_created_at ?? '');
      });
    }
    return map;
  }, [motherBatchGroups]);

  const totalPlants = useMemo(
    () => validRows.reduce((sum, row) => sum + row.count, 0),
    [validRows]
  );

  const dataHonestyWarnings = useMemo(
    () => confidenceWarnings(validRows.map((row) => row.strain).filter((strain): strain is StrainCultivationStats => Boolean(strain))),
    [validRows]
  );

  // Auto-compute cohort-level dates from shared flower start + longest strain timing.
  const computedDates = useMemo(() => {
    if (!flowerStartDate || validRows.length === 0) return null;
    const vegDays = Math.max(...validRows.map((row) => row.strain?.veg_days_avg ?? 28));
    const flowerDays = Math.max(...validRows.map((row) => row.strain?.flowering_time_days ?? 63));
    const vegStart = addDays(flowerStartDate, -vegDays);
    const cloneCut = addDays(vegStart, -14);
    const estHarvest = addDays(flowerStartDate, flowerDays);
    return { vegStart, cloneCut, estHarvest, vegDays, flowerDays };
  }, [flowerStartDate, validRows]);

  useEffect(() => {
    // Reset error when inputs change
    setFormError(null);
    setFormNotice(null);
  }, [strainRows, flowerStartDate]);

  function updateRow(rowId: string, patch: Partial<CohortStrainRow>) {
    setStrainRows((rows) => rows.map((row) => row.rowId === rowId ? { ...row, ...patch } : row));
  }

  function addStrainRow() {
    const used = new Set(strainRows.map((row) => row.strainId).filter(Boolean));
    const nextStrain = activeStrains.find((strain) => !used.has(strain.strain_id));
    setStrainRows((rows) => [...rows, makeRow(nextStrain?.strain_id ?? '', '')]);
  }

  function removeStrainRow(rowId: string) {
    setStrainRows((rows) => rows.length === 1 ? rows : rows.filter((row) => row.rowId !== rowId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flowerStartDate || !computedDates || validRows.length === 0) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (validRows.length !== strainRows.length) {
      setFormError('Each strain row needs a strain and a positive plant count.');
      return;
    }
    const uniqueStrains = new Set(validRows.map((row) => row.strainId));
    if (uniqueStrains.size !== validRows.length) {
      setFormError('Each strain can only appear once in a batch group.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const row = validRows[0];
        if (!row) {
          setFormError('Please fill in all required fields.');
          return;
        }
        const flowerDays = row.strain?.flowering_time_days ?? 63;
        const vegDays = row.strain?.veg_days_avg ?? 28;
        const vegStart = addDays(flowerStartDate, -vegDays);
        const cloneCut = addDays(vegStart, -14);
        await plannedCyclesService.update(editing.id, {
          planned_plant_count: row.count,
          flower_start_date: flowerStartDate,
          estimated_harvest_date: addDays(flowerStartDate, flowerDays),
          veg_start_date: vegStart,
          clone_cut_date: cloneCut,
        });
      } else {
        const legacyFallback = validRows.map((row) => {
          const flowerDays = row.strain?.flowering_time_days ?? 63;
          const vegDays = row.strain?.veg_days_avg ?? 28;
          const vegStart = addDays(flowerStartDate, -vegDays);
          return {
            strain_id: row.strainId,
            target_room_id: room.room_id,
            planned_plant_count: row.count,
            flower_start_date: flowerStartDate,
            estimated_harvest_date: addDays(flowerStartDate, flowerDays),
            veg_start_date: vegStart,
            clone_cut_date: addDays(vegStart, -14),
          };
        });
        const result = await plannedCyclesService.planCycle({
          room_id: room.room_id,
          planned_flip_date: flowerStartDate,
          strains: validRows.map((row) => ({
            strain_id: row.strainId,
            plant_count: row.count,
            mother_batch_group_id: row.motherBatchGroupId || null,
          })),
          planned_strains: validRows.map((row) => row.strain?.strain_name ?? row.strainId),
          legacyFallback,
        });
        if (result.mode === 'legacy') {
          setFormNotice('fn_plan_cycle is not deployed yet, so this was saved through planned_cycles.');
        }
      }
      onSave();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Failed to save planned cycle.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm('Delete this planned cycle?')) return;
    setDeleting(true);
    try {
      await plannedCyclesService.delete(editing.id);
      onSave();
    } catch (err: unknown) {
      setFormError(errorMessage(err, 'Failed to delete planned cycle.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-cult-bg border border-cult-border rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-border">
          <div>
            <h2 className="text-base font-bold text-cult-text-primary">
              {editing ? 'Edit Planned Cycle' : 'New Batch Group'}
            </h2>
            <p className="text-xs text-cult-text-muted mt-0.5">{room.room_name}</p>
          </div>
          <button onClick={onClose} className="text-cult-text-muted hover:text-cult-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Strain rows */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-cult-text-secondary">
                Batch Group Composition <span className="text-cult-stage-flower">*</span>
              </label>
              {!editing && (
                <button
                  type="button"
                  onClick={addStrainRow}
                  className="flex items-center gap-1 text-[11px] text-cult-accent hover:text-cult-accent/80 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add strain
                </button>
              )}
            </div>
            <div className="space-y-2">
              {strainRows.map((row, index) => (
                <div key={row.rowId} className="grid grid-cols-[1fr_88px_24px] gap-2">
                  <div className="min-w-0 space-y-2">
                    <select
                      value={row.strainId}
                      onChange={(e) => updateRow(row.rowId, { strainId: e.target.value, motherBatchGroupId: '' })}
                      disabled={!!editing}
                      className="w-full min-w-0 bg-cult-surface border border-cult-border rounded px-3 py-2 text-sm text-cult-text-primary disabled:opacity-50 focus:outline-none focus:border-cult-accent"
                      aria-label={`Strain ${index + 1}`}
                    >
                      <option value="">Select strain…</option>
                      {activeStrains.map((s) => (
                        <option key={s.strain_id} value={s.strain_id}>
                          {s.strain_name}
                          {s.flowering_time_days ? ` (${s.flowering_time_days}d flower)` : ''}
                        </option>
                      ))}
                    </select>
                    {!editing && row.strainId && (
                      <select
                        value={row.motherBatchGroupId}
                        onChange={(e) => updateRow(row.rowId, { motherBatchGroupId: e.target.value })}
                        className="w-full min-w-0 bg-cult-surface border border-cult-border rounded px-3 py-1.5 text-xs text-cult-text-primary focus:outline-none focus:border-cult-accent"
                        aria-label={`Mother batch group ${index + 1}`}
                      >
                        <option value="">No mother group selected</option>
                        {(motherGroupsByStrain.get(row.strainId) ?? []).map((group) => (
                          <option key={group.mother_batch_group_key} value={group.mother_batch_group_key}>
                            {(group.source_cycle_code || group.source_batch_number || group.room_code || 'Mother group')}
                            {' · '}
                            {group.active_plant_count} moms
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={row.plantCount}
                    onChange={(e) => updateRow(row.rowId, { plantCount: e.target.value })}
                    placeholder="Plants"
                    className="self-start bg-cult-surface border border-cult-border rounded px-2 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent"
                    aria-label={`Plant count ${index + 1}`}
                  />
                  {!editing && strainRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeStrainRow(row.rowId)}
                      className="self-start flex items-center justify-center rounded border border-cult-border text-cult-text-muted hover:text-cult-stage-flower transition-colors h-9"
                      aria-label={`Remove strain ${index + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            {room.capacity_plants && (
              <p className="text-[11px] text-cult-text-muted mt-1">
                Room capacity: {room.capacity_plants} plants · Planned: {totalPlants} plants
              </p>
            )}
          </div>

          {dataHonestyWarnings.length > 0 && (
            <div className="border border-cult-border bg-cult-surface/50 rounded p-3">
              <p className="text-[11px] font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">
                Data Honesty
              </p>
              <div className="space-y-1">
                {dataHonestyWarnings.slice(0, 4).map((warning) => (
                  <p key={warning} className="text-[11px] text-cult-text-muted">
                    {warning}
                  </p>
                ))}
                {dataHonestyWarnings.length > 4 && (
                  <p className="text-[11px] text-cult-text-muted">
                    +{dataHonestyWarnings.length - 4} more confidence notes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Flower start date */}
          <div>
            <label className="block text-xs font-semibold text-cult-text-secondary mb-1.5">
              Flower Start Date <span className="text-cult-stage-flower">*</span>
            </label>
            <input
              type="date"
              value={flowerStartDate}
              onChange={(e) => setFlowerStartDate(e.target.value)}
              className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent [color-scheme:dark]"
            />
          </div>

          {/* Computed dates (read-only) */}
          {computedDates && (
            <div className="bg-cult-surface/50 rounded p-3 space-y-2 border border-cult-border/50">
              <p className="text-[11px] font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                Computed Schedule
              </p>
              <ComputedField label="Clone Cut" value={computedDates.cloneCut} />
              <ComputedField
                label="Veg Start"
                value={computedDates.vegStart}
                note={`(${computedDates.vegDays}d max)`}
              />
              <ComputedField label="Flower Start" value={flowerStartDate} highlight />
              <ComputedField
                label="Est. Harvest"
                value={computedDates.estHarvest}
                note={`(${computedDates.flowerDays}d max)`}
              />
            </div>
          )}

          {formError && (
            <p className="text-sm text-cult-stage-flower">{formError}</p>
          )}

          {formNotice && (
            <p className="text-xs text-cult-text-muted">{formNotice}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {editing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-cult-stage-flower hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm text-cult-text-secondary hover:text-cult-text-primary border border-cult-border rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !flowerStartDate || validRows.length !== strainRows.length}
                className="px-4 py-1.5 text-sm bg-cult-accent text-cult-bg rounded font-semibold disabled:opacity-50 hover:bg-cult-accent/90 transition-colors flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Batch Group'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ComputedField({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  const formatted = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={highlight ? 'text-cult-text-primary font-medium' : 'text-cult-text-muted'}>
        {label}
        {note && <span className="ml-1 text-cult-text-muted font-normal">{note}</span>}
      </span>
      <span className={highlight ? 'text-cult-accent font-semibold' : 'text-cult-text-secondary'}>
        {formatted}
      </span>
    </div>
  );
}
