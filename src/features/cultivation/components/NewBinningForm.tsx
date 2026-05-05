import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBinningSessions } from '../hooks/useBinningSessions';
import { formatWeight, formatDate } from '../utils';
import type { CreateBinningSessionInput, HarvestSession } from '../types';

interface NewBinningFormProps {
  unbinnedHarvests: HarvestSession[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewBinningForm({ unbinnedHarvests, onSuccess, onCancel }: NewBinningFormProps) {
  const { createSession } = useBinningSessions();

  const [harvestSessionId, setHarvestSessionId] = useState('');
  const [binDate, setBinDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHarvest = unbinnedHarvests.find((h) => h.id === harvestSessionId);
  const flowerEntries = selectedHarvest?.harvest_weight_entries?.filter(e => e.destination === 'flower') ?? [];
  const primaryDryRoomId = flowerEntries.map(e => e.location_id).find(Boolean);
  const dryRoomCode = flowerEntries.map(e => e.dry_rooms?.room_code).find(Boolean);

  const canSave =
    harvestSessionId &&
    primaryDryRoomId &&
    selectedHarvest?.batch_registry_id &&
    binDate &&
    !saving;

  async function handleSubmit() {
    if (!canSave || !selectedHarvest?.batch_registry_id || !primaryDryRoomId) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreateBinningSessionInput = {
        harvest_session_id: harvestSessionId,
        dry_room_id: primaryDryRoomId,
        batch_registry_id: selectedHarvest.batch_registry_id,
        bin_date: binDate,
        notes: notes.trim() || undefined,
      };
      await createSession(input);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create binning session');
    } finally {
      setSaving(false);
    }
  }

  const wetWeight = selectedHarvest ? (flowerEntries.reduce((s, e) => s + Number(e.weight_grams), 0) || (selectedHarvest.adjusted_weight_grams ?? selectedHarvest.wet_weight_grams)) : null;

  return (
    <div className="rounded-lg border border-cult-border bg-cult-surface p-5 space-y-4">
      <h3 className="text-sm font-semibold text-cult-text-primary">New Binning Session</h3>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-cult-danger-muted border border-cult-danger px-3 py-2 text-sm text-cult-danger">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Harvest Session *</label>
          <select
            value={harvestSessionId}
            onChange={(e) => setHarvestSessionId(e.target.value)}
            className="w-full rounded-md bg-cult-black border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-accent"
          >
            <option value="">Select a harvest session...</option>
            {unbinnedHarvests.map((h) => (
              <option key={h.id} value={h.id}>
                {h.plant_groups?.strains?.name ?? 'Unknown'} -- {h.batch_registry?.batch_number ?? '--'} ({formatDate(h.harvest_date)})
              </option>
            ))}
          </select>
          {unbinnedHarvests.length === 0 && (
            <p className="mt-1 text-xs text-cult-border">No completed harvest sessions awaiting binning.</p>
          )}
          {selectedHarvest && wetWeight !== null && (
            <p className="mt-1 text-xs text-cult-border">
              Wet weight: <span className="text-cult-text-primary">{formatWeight(wetWeight)}</span>
              {selectedHarvest.adjusted_weight_grams && <span className="text-cult-warning ml-1">(adjusted)</span>}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Dry Room</label>
          {selectedHarvest ? (
            primaryDryRoomId ? (
              <div className="rounded-md bg-cult-black border border-cult-border px-3 py-2 text-sm text-cult-text-primary">
                Assigned {dryRoomCode ? <span className="text-cult-border font-mono ml-1">({dryRoomCode})</span> : null}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md bg-cult-warning-muted border border-cult-warning px-3 py-2 text-xs text-cult-warning">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                No dry room assigned to this harvest.
              </div>
            )
          ) : (
            <div className="rounded-md bg-cult-black border border-cult-border px-3 py-2 text-sm text-cult-border">
              Select a harvest first
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Bin Date *</label>
          <input
            type="date"
            value={binDate}
            onChange={(e) => setBinDate(e.target.value)}
            className="w-full rounded-md bg-cult-black border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-accent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-cult-text-muted mb-1">Notes <span className="text-cult-border">optional</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes about this drying run..."
          className="w-full rounded-md bg-cult-black border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-accent resize-none"
        />
      </div>

      {selectedHarvest && !selectedHarvest.batch_registry_id && (
        <div className="flex items-center gap-2 rounded-md bg-cult-warning-muted border border-cult-warning px-3 py-2 text-sm text-cult-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>This harvest session has no linked batch. Complete the harvest first.</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="px-4 py-2 rounded-md bg-cult-accent text-cult-opaque-black text-sm font-medium hover:bg-cult-text-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Start Binning Session'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-cult-border text-cult-text-muted text-sm hover:border-cult-accent hover:text-cult-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
