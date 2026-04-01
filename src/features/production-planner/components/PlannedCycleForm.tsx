import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import type { StrainCultivationStats, CalendarPlannedEntry, CalendarRoom } from '../types';
import { plannedCyclesService } from '../services/plannedCyclesService';

interface PlannedCycleFormProps {
  room: CalendarRoom;
  strainStats: StrainCultivationStats[];
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

export function PlannedCycleForm({ room, strainStats, editing, onSave, onClose }: PlannedCycleFormProps) {
  const activeStrains = useMemo(
    () => strainStats.filter((s) => s.is_active).sort((a, b) => a.strain_name.localeCompare(b.strain_name)),
    [strainStats]
  );

  const [strainId, setStrainId] = useState(editing?.strain_id ?? (activeStrains[0]?.strain_id ?? ''));
  const [plantCount, setPlantCount] = useState(editing?.planned_plant_count?.toString() ?? '');
  const [flowerStartDate, setFlowerStartDate] = useState(toInputDate(editing?.flower_start_date ?? ''));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedStrain = useMemo(
    () => activeStrains.find((s) => s.strain_id === strainId) ?? null,
    [activeStrains, strainId]
  );

  // Auto-compute dates from flower start + strain timing
  const computedDates = useMemo(() => {
    if (!flowerStartDate || !selectedStrain) return null;
    const vegDays = selectedStrain.veg_days_avg ?? 28;
    const flowerDays = selectedStrain.flowering_time_days ?? 63;
    const vegStart = addDays(flowerStartDate, -vegDays);
    const cloneCut = addDays(vegStart, -14);
    const estHarvest = addDays(flowerStartDate, flowerDays);
    return { vegStart, cloneCut, estHarvest };
  }, [flowerStartDate, selectedStrain]);

  useEffect(() => {
    // Reset error when inputs change
    setFormError(null);
  }, [strainId, plantCount, flowerStartDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strainId || !flowerStartDate || !plantCount || !computedDates) {
      setFormError('Please fill in all required fields.');
      return;
    }
    const count = parseInt(plantCount, 10);
    if (isNaN(count) || count <= 0) {
      setFormError('Plant count must be a positive number.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await plannedCyclesService.update(editing.id, {
          planned_plant_count: count,
          flower_start_date: flowerStartDate,
          estimated_harvest_date: computedDates.estHarvest,
          veg_start_date: computedDates.vegStart,
          clone_cut_date: computedDates.cloneCut,
        });
      } else {
        await plannedCyclesService.create({
          strain_id: strainId,
          target_room_id: room.room_id,
          planned_plant_count: count,
          flower_start_date: flowerStartDate,
          estimated_harvest_date: computedDates.estHarvest,
          veg_start_date: computedDates.vegStart,
          clone_cut_date: computedDates.cloneCut,
        });
      }
      onSave();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save planned cycle.');
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
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to delete planned cycle.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-cult-bg border border-cult-border rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-border">
          <div>
            <h2 className="text-base font-bold text-cult-white">
              {editing ? 'Edit Planned Cycle' : 'New Planned Cycle'}
            </h2>
            <p className="text-xs text-cult-text-muted mt-0.5">{room.room_name}</p>
          </div>
          <button onClick={onClose} className="text-cult-text-muted hover:text-cult-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Strain picker */}
          <div>
            <label className="block text-xs font-semibold text-cult-text-secondary mb-1.5">
              Strain <span className="text-cult-stage-flower">*</span>
            </label>
            <select
              value={strainId}
              onChange={(e) => setStrainId(e.target.value)}
              disabled={!!editing}
              className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-sm text-cult-white disabled:opacity-50 focus:outline-none focus:border-cult-accent"
            >
              <option value="">Select strain…</option>
              {activeStrains.map((s) => (
                <option key={s.strain_id} value={s.strain_id}>
                  {s.strain_name}
                  {s.flowering_time_days ? ` (${s.flowering_time_days}d flower)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Plant count */}
          <div>
            <label className="block text-xs font-semibold text-cult-text-secondary mb-1.5">
              Plant Count <span className="text-cult-stage-flower">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={plantCount}
              onChange={(e) => setPlantCount(e.target.value)}
              placeholder="e.g. 60"
              className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-sm text-cult-white placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent"
            />
            {room.capacity_plants && (
              <p className="text-[11px] text-cult-text-muted mt-1">
                Room capacity: {room.capacity_plants} plants
              </p>
            )}
          </div>

          {/* Flower start date */}
          <div>
            <label className="block text-xs font-semibold text-cult-text-secondary mb-1.5">
              Flower Start Date <span className="text-cult-stage-flower">*</span>
            </label>
            <input
              type="date"
              value={flowerStartDate}
              onChange={(e) => setFlowerStartDate(e.target.value)}
              className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-sm text-cult-white focus:outline-none focus:border-cult-accent [color-scheme:dark]"
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
                note={selectedStrain?.veg_days_avg ? `(${selectedStrain.veg_days_avg}d avg)` : undefined}
              />
              <ComputedField label="Flower Start" value={flowerStartDate} highlight />
              <ComputedField
                label="Est. Harvest"
                value={computedDates.estHarvest}
                note={selectedStrain?.flowering_time_days ? `(${selectedStrain.flowering_time_days}d flower)` : undefined}
              />
            </div>
          )}

          {formError && (
            <p className="text-sm text-cult-stage-flower">{formError}</p>
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
                className="px-4 py-1.5 text-sm text-cult-text-secondary hover:text-cult-white border border-cult-border rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !strainId || !flowerStartDate || !plantCount}
                className="px-4 py-1.5 text-sm bg-cult-accent text-cult-bg rounded font-semibold disabled:opacity-50 hover:bg-cult-accent/90 transition-colors flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Plan'}
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
      <span className={highlight ? 'text-cult-white font-medium' : 'text-cult-text-muted'}>
        {label}
        {note && <span className="ml-1 text-cult-text-muted font-normal">{note}</span>}
      </span>
      <span className={highlight ? 'text-cult-accent font-semibold' : 'text-cult-text-secondary'}>
        {formatted}
      </span>
    </div>
  );
}
