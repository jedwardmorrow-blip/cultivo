import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, Plus, Sprout, Trash2, X } from 'lucide-react';
import type { StrainCultivationStats, CalendarPlannedEntry, CalendarRoom, MotherBatchGroupRow } from '../types';
import { plannedCyclesService } from '../services/plannedCyclesService';

interface PlannedCycleFormProps {
  room: CalendarRoom;
  rooms?: CalendarRoom[];
  strainStats: StrainCultivationStats[];
  motherBatchGroups?: MotherBatchGroupRow[];
  initialFlowerStartDate?: string | null;
  gapContext?: {
    roomCode: string;
    startDate: string;
    endDate: string;
    days: number;
  } | null;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

export function PlannedCycleForm({
  room,
  rooms = [room],
  strainStats,
  motherBatchGroups = [],
  initialFlowerStartDate,
  gapContext,
  editing,
  onSave,
  onClose,
}: PlannedCycleFormProps) {
  const activeStrains = useMemo(
    () => strainStats.filter((s) => s.is_active).sort((a, b) => a.strain_name.localeCompare(b.strain_name)),
    [strainStats]
  );
  const selectableRooms = useMemo(
    () => rooms
      .filter((candidate) => candidate.room_type !== 'mother' || candidate.room_id === room.room_id)
      .sort((a, b) => a.room_code.localeCompare(b.room_code)),
    [room.room_id, rooms]
  );

  const [strainRows, setStrainRows] = useState<CohortStrainRow[]>(() => [
    makeRow(editing?.strain_id ?? '', editing?.planned_plant_count?.toString() ?? ''),
  ]);
  const [targetRoomId, setTargetRoomId] = useState(room.room_id);
  const [flowerStartDate, setFlowerStartDate] = useState(toInputDate(editing?.flower_start_date ?? initialFlowerStartDate ?? ''));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const targetRoom = useMemo(
    () => selectableRooms.find((candidate) => candidate.room_id === targetRoomId) ?? room,
    [room, selectableRooms, targetRoomId]
  );

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

  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!flowerStartDate) missing.push('flower start date');
    if (strainRows.some((row) => !row.strainId)) missing.push('stream');
    if (strainRows.some((row) => !parseInt(row.plantCount, 10) || parseInt(row.plantCount, 10) < 1)) missing.push('plant count');
    return [...new Set(missing)];
  }, [flowerStartDate, strainRows]);

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
  }, [strainRows, flowerStartDate, targetRoomId]);

  useEffect(() => {
    setTargetRoomId(room.room_id);
  }, [room.room_id]);

  function updateRow(rowId: string, patch: Partial<CohortStrainRow>) {
    setStrainRows((rows) => rows.map((row) => row.rowId === rowId ? { ...row, ...patch } : row));
  }

  function addStrainRow() {
    setStrainRows((rows) => [...rows, makeRow('', '')]);
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
            target_room_id: targetRoom.room_id,
            planned_plant_count: row.count,
            flower_start_date: flowerStartDate,
            estimated_harvest_date: addDays(flowerStartDate, flowerDays),
            veg_start_date: vegStart,
            clone_cut_date: addDays(vegStart, -14),
          };
        });
        const result = await plannedCyclesService.planCycle({
          room_id: targetRoom.room_id,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-cult-opaque-near-black border border-cult-border rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-border" data-legacy-object="New Batch Group">
          <div>
            <h2 className="text-base font-bold text-cult-text-primary">
              {editing ? 'Edit Cycle' : 'Plan Cycle'}
            </h2>
            <p className="text-xs text-cult-text-muted mt-0.5">
              {targetRoom.room_name}
              {targetRoom.capacity_plants ? ` · Room capacity: ${targetRoom.capacity_plants} plants` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-transparent text-cult-text-muted hover:border-cult-border hover:text-cult-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <section className="space-y-2">
            <label className="block text-sm font-medium text-cult-text-primary">
              Room <span className="text-cult-stage-flower">*</span>
            </label>
            <select
              value={targetRoom.room_id}
              onChange={(e) => setTargetRoomId(e.target.value)}
              disabled={!!editing}
              className="w-full bg-cult-opaque-black border border-cult-border rounded px-3 py-2 text-sm text-cult-text-primary disabled:opacity-50 focus:outline-none focus:border-cult-accent"
              aria-label="Target room"
            >
              {selectableRooms.map((candidate) => (
                <option key={candidate.room_id} value={candidate.room_id}>
                  {candidate.room_code} · {candidate.room_name}
                  {candidate.capacity_plants ? ` · ${candidate.capacity_plants} capacity` : ''}
                </option>
              ))}
            </select>
            {gapContext && gapContext.roomCode === targetRoom.room_code && (
              <div className="rounded border border-cult-accent/40 bg-cult-accent/10 px-3 py-2 text-xs text-cult-text-secondary">
                <span className="font-semibold text-cult-text-primary">Flower gap</span>
                <span className="ml-2">
                  {gapContext.roomCode} · {formatDate(gapContext.startDate)} to {formatDate(gapContext.endDate)} · {gapContext.days}d
                </span>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cult-text-secondary">
              <CalendarDays className="h-4 w-4 text-cult-accent" />
              Timing
            </div>
            <label className="block text-sm font-medium text-cult-text-primary">
              Flower Start Date <span className="text-cult-stage-flower">*</span>
            </label>
            <input
              type="date"
              value={flowerStartDate}
              onChange={(e) => setFlowerStartDate(e.target.value)}
              className="w-full bg-cult-opaque-black border border-cult-border rounded px-3 py-2 text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent [color-scheme:dark]"
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cult-text-secondary">
                <Sprout className="h-4 w-4 text-cult-accent" />
                Planned plants
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={addStrainRow}
                  aria-label="Add strain"
                  className="flex items-center gap-1.5 rounded border border-cult-border px-2.5 py-1.5 text-xs text-cult-text-secondary hover:border-cult-accent hover:text-cult-accent transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add stream
                </button>
              )}
            </div>

            <div className="space-y-3">
              {strainRows.map((row, index) => {
                const usedByOtherRows = new Set(
                  strainRows
                    .filter((other) => other.rowId !== row.rowId)
                    .map((other) => other.strainId)
                    .filter(Boolean)
                );
                const selectedMotherGroups = row.strainId ? (motherGroupsByStrain.get(row.strainId) ?? []) : [];

                return (
                  <div key={row.rowId} className="rounded border border-cult-border bg-cult-opaque-graphite p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_112px_32px]">
                      <div className="min-w-0">
                        <label className="mb-1 block text-[11px] font-semibold text-cult-text-muted">
                          Stream / Strain <span className="text-cult-stage-flower">*</span>
                        </label>
                        <select
                          value={row.strainId}
                          onChange={(e) => updateRow(row.rowId, { strainId: e.target.value, motherBatchGroupId: '' })}
                          disabled={!!editing}
                          className="w-full min-w-0 bg-cult-opaque-black border border-cult-border rounded px-3 py-2 text-sm text-cult-text-primary disabled:opacity-50 focus:outline-none focus:border-cult-accent"
                          aria-label={`Strain ${index + 1}`}
                        >
                          <option value="">Select stream…</option>
                          {activeStrains.map((s) => (
                            <option key={s.strain_id} value={s.strain_id} disabled={usedByOtherRows.has(s.strain_id)}>
                              {s.strain_name}
                              {s.flowering_time_days ? ` (${s.flowering_time_days}d flower)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-cult-text-muted">
                        Plants <span className="text-cult-stage-flower">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={row.plantCount}
                        onChange={(e) => updateRow(row.rowId, { plantCount: e.target.value })}
                        placeholder="Count"
                        className="w-full bg-cult-opaque-black border border-cult-border rounded px-2 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent"
                        aria-label={`Plant count ${index + 1}`}
                      />
                    </div>

                    {!editing && strainRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeStrainRow(row.rowId)}
                        className="flex h-9 w-9 items-center justify-center justify-self-end rounded border border-cult-border text-cult-text-muted hover:text-cult-stage-flower transition-colors sm:mt-5 sm:w-8"
                        aria-label={`Remove stream ${index + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>

                  {!editing && (
                    <div className="mt-2">
                      <label className="mb-1 block text-[11px] font-semibold text-cult-text-muted">
                        Mother source
                      </label>
                      <select
                        value={row.motherBatchGroupId}
                        onChange={(e) => updateRow(row.rowId, { motherBatchGroupId: e.target.value })}
                        disabled={!row.strainId || selectedMotherGroups.length === 0}
                        className="w-full min-w-0 bg-cult-opaque-black border border-cult-border rounded px-3 py-1.5 text-xs text-cult-text-primary disabled:opacity-60 focus:outline-none focus:border-cult-accent"
                        aria-label={`Mother batch group ${index + 1}`}
                      >
                        <option value="">
                          {!row.strainId
                            ? 'Select stream first'
                            : selectedMotherGroups.length === 0
                              ? 'No mother groups available'
                              : 'No mother group selected (optional)'}
                        </option>
                        {selectedMotherGroups.map((group) => (
                          <option key={group.mother_batch_group_key} value={group.mother_batch_group_key}>
                            {(group.source_cycle_code || group.source_batch_number || group.room_code || 'Mother group')}
                            {' · '}
                            {group.active_plant_count} moms
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
            {targetRoom.capacity_plants && (
              <p className="text-[11px] text-cult-text-muted">
                Room capacity: {targetRoom.capacity_plants} plants · Planned: {totalPlants} plants
              </p>
            )}
          </section>

          {dataHonestyWarnings.length > 0 && (
            <div className="border border-cult-border bg-cult-surface/50 rounded p-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-cult-stage-flower" />
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

          {/* Computed dates (read-only) */}
          {computedDates && (
            <div className="bg-cult-surface/50 rounded p-3 space-y-2 border border-cult-border/50">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cult-accent" />
                Schedule check
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
          <div className="flex flex-col gap-3 border-t border-cult-border pt-4 sm:flex-row sm:items-center sm:justify-between">
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
              <p className="text-xs text-cult-text-muted">
                {missingRequirements.length > 0
                  ? `Required: ${missingRequirements.join(', ')}.`
                  : `Ready to create ${totalPlants} plants in ${targetRoom.room_code} for ${formatDate(flowerStartDate)}.`}
              </p>
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
                aria-label={editing ? 'Save Changes' : 'Create Batch Group'}
                className="px-4 py-1.5 text-sm bg-cult-accent text-cult-bg rounded font-semibold disabled:opacity-50 hover:bg-cult-accent/90 transition-colors flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Cycle'}
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
  const formatted = formatDate(value);
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
