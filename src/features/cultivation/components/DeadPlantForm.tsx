import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Minus, Plus, AlertCircle, CheckCircle2, Skull } from 'lucide-react';
import { Button } from '@/shared/components';
import { usePlantGroups, useMortalityLog } from '../hooks';
import type { PlantGroup } from '../types';

const MORTALITY_CAUSES = [
  'pest', 'disease', 'nutrient', 'environmental', 'mechanical', 'unknown', 'other',
] as const;

function formatLabel(val: string) {
  return val.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DeadPlantFormProps {
  prefilledRoomId?: string | null;
  onComplete: () => void;
  onClose: () => void;
}

export function DeadPlantForm({ prefilledRoomId, onComplete, onClose }: DeadPlantFormProps) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [deadCount, setDeadCount] = useState(1);
  const [cause, setCause] = useState('unknown');
  const [causeDetail, setCauseDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const { groups } = usePlantGroups({ stage: 'active' });
  const { insertMortalityLog } = useMortalityLog();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!prefilledRoomId) return groups;
    return groups.filter((g) => g.grow_room_id === prefilledRoomId);
  }, [groups, prefilledRoomId]);

  const selectedGroup: PlantGroup | null = useMemo(
    () => filteredGroups.find((g) => g.id === selectedGroupId) ?? null,
    [filteredGroups, selectedGroupId],
  );

  const maxCount = selectedGroup?.plant_count ?? 999;

  function incrementCount() {
    setDeadCount((c) => Math.min(c + 1, maxCount));
  }
  function decrementCount() {
    setDeadCount((c) => Math.max(c - 1, 1));
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedGroupId) { setError('Select a plant group'); return; }
    if (deadCount < 1) { setError('Count must be at least 1'); return; }
    if (deadCount > maxCount) { setError(`Cannot exceed ${maxCount} plants in this group`); return; }

    setSaving(true);
    try {
      const roomId = selectedGroup?.grow_room_id;
      if (!roomId) throw new Error('Could not determine room');

      await insertMortalityLog({
        plant_group_id: selectedGroupId,
        room_id: roomId,
        quantity: deadCount,
        cause: cause,
        cause_detail: causeDetail || null,
        notes: notes || null,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record mortality');
    } finally {
      setSaving(false);
    }
  }

  const selectClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
  const inputClass = selectClass;
  const labelClass = 'block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1';

  const formContent = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-red-950 flex-shrink-0">
            <Skull className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Log Dead Plants</h3>
            <p className="text-[10px] text-cult-medium-gray mt-0.5">Record plant mortality</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-cult-medium-gray hover:text-cult-light-gray transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className={labelClass}>Plant Group *</label>
        <select
          value={selectedGroupId}
          onChange={(e) => { setSelectedGroupId(e.target.value); setDeadCount(1); }}
          className={selectClass}
        >
          <option value="">Select plant group...</option>
          {filteredGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.group_number ?? g.name ?? g.id.slice(0, 8)} - {g.strains?.name ?? 'Unknown'} ({g.plant_count} plants, {g.growth_stage})
            </option>
          ))}
        </select>
      </div>

      {selectedGroup && (
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-sm px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-cult-light-gray">
            Stage: <span className="text-cult-white font-medium capitalize">{selectedGroup.growth_stage}</span>
          </span>
          <span className="text-cult-light-gray">
            Plants: <span className="text-cult-white font-medium">{selectedGroup.plant_count}</span>
          </span>
        </div>
      )}

      <div>
        <label className={labelClass}>Dead Count *</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={decrementCount}
            disabled={deadCount <= 1}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-cult-charcoal border border-cult-dark-gray text-cult-light-gray hover:border-cult-medium-gray disabled:opacity-30 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min={1}
            max={maxCount}
            value={deadCount}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1 && v <= maxCount) setDeadCount(v);
            }}
            className="w-20 text-center bg-cult-charcoal border border-cult-dark-gray text-cult-white text-lg font-bold py-2 rounded-sm focus:outline-none focus:border-cult-accent"
          />
          <button
            type="button"
            onClick={incrementCount}
            disabled={deadCount >= maxCount}
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-cult-charcoal border border-cult-dark-gray text-cult-light-gray hover:border-cult-medium-gray disabled:opacity-30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Cause</label>
        <div className="flex flex-wrap gap-1.5">
          {MORTALITY_CAUSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCause(c)}
              className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                cause === c
                  ? 'bg-red-950 border-red-700 text-red-400'
                  : 'bg-cult-charcoal border-cult-dark-gray text-cult-light-gray hover:border-cult-medium-gray'
              }`}
            >
              {formatLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Cause Detail</label>
        <input
          type="text"
          value={causeDetail}
          onChange={(e) => setCauseDetail(e.target.value)}
          placeholder="e.g., Root rot from overwatering"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional details..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-sm px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={saving || !selectedGroupId}
        variant="danger"
        className="w-full"
        icon={CheckCircle2}
      >
        {saving ? 'Recording...' : `Record ${deadCount} Dead Plant${deadCount > 1 ? 's' : ''}`}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-end bg-black/60"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      >
        <div className="w-full bg-cult-surface-overlay border-t border-cult-medium-gray rounded-t-xl p-5 max-h-[90vh] overflow-y-auto animate-slide-in">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-cult-surface-overlay border border-cult-medium-gray w-full max-w-sm p-5 animate-fade-in">
        {formContent}
      </div>
    </div>
  );
}
