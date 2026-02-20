import { useState } from 'react';
import { X, AlertTriangle, Flower2 } from 'lucide-react';
import { cultivationService } from '../services';
import type { GrowRoom, PlantGroup } from '../types';

interface FlipRoomModalProps {
  room: GrowRoom;
  plantGroups: PlantGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAGE_LABELS: Record<string, string> = {
  clone: 'Clone',
  veg: 'Veg',
  flower: 'Flower',
  harvested: 'Harvested',
};

export function FlipRoomModal({ room, plantGroups, onClose, onSuccess }: FlipRoomModalProps) {
  const [flipDate, setFlipDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleGroups = plantGroups.filter(
    (g) => g.growth_stage !== 'flower' && g.growth_stage !== 'harvested'
  );
  const alreadyFlower = plantGroups.filter((g) => g.growth_stage === 'flower');
  const hasExistingFlipDate = plantGroups.some((g) => g.grow_room_id === room.id);

  const isUpdate = alreadyFlower.length > 0 || hasExistingFlipDate;

  async function handleConfirm() {
    if (!flipDate) { setError('Please select a flip date'); return; }
    setSaving(true);
    setError(null);
    try {
      await cultivationService.flipRoom({ grow_room_id: room.id, flip_date: flipDate });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flip room');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-cult-near-black border border-cult-medium-gray w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cult-medium-gray">
          <div className="flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-cult-white uppercase tracking-wider">
              {isUpdate ? 'Update Flip Date' : 'Flip Room'}: {room.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-cult-medium-gray hover:text-cult-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isUpdate && (
            <div className="bg-amber-950/40 border border-amber-800 px-3 py-2 text-xs text-amber-300">
              This room already has groups at flower stage. Re-triggering will update the flip date on all sections.
            </div>
          )}

          <div>
            <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-2">Flip Date *</label>
            <input
              type="date"
              value={flipDate}
              onChange={(e) => setFlipDate(e.target.value)}
              disabled={saving}
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
            />
            {flipDate && (
              <p className="text-xs text-cult-medium-gray mt-1">
                {formatDate(flipDate)} will be set on all active sections in this room
              </p>
            )}
          </div>

          <div className="space-y-3">
            {eligibleGroups.length > 0 && (
              <div>
                <p className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">
                  {eligibleGroups.length} group{eligibleGroups.length !== 1 ? 's' : ''} will advance to flower
                </p>
                <div className="space-y-1">
                  {eligibleGroups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2 bg-rose-950/30 border border-rose-900 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-rose-300">{g.batch_registry?.batch_number ?? '—'}</span>
                        <span className="text-xs text-cult-light-gray truncate">
                          {g.strains?.name ?? g.strain_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-cult-medium-gray">{g.plant_count} plants</span>
                        <span className="text-xs border border-amber-800 text-amber-400 px-1.5 py-0.5 uppercase tracking-wider">
                          {STAGE_LABELS[g.growth_stage] ?? g.growth_stage}
                        </span>
                        <span className="text-xs text-cult-medium-gray">→</span>
                        <span className="text-xs border border-rose-700 text-rose-400 px-1.5 py-0.5 uppercase tracking-wider">
                          Flower
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eligibleGroups.length === 0 && (
              <div className="bg-cult-black border border-cult-dark-gray px-3 py-3 text-xs text-cult-medium-gray">
                No groups eligible for stage advancement in this room. The flip date will still be updated on all active sections.
              </div>
            )}

            {alreadyFlower.length > 0 && (
              <div>
                <p className="text-xs text-cult-medium-gray uppercase tracking-wider mb-2">
                  {alreadyFlower.length} group{alreadyFlower.length !== 1 ? 's' : ''} already in flower — not affected
                </p>
                <div className="space-y-1">
                  {alreadyFlower.map((g) => (
                    <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 opacity-50">
                      <span className="font-mono text-xs text-cult-medium-gray">{g.batch_registry?.batch_number ?? '—'}</span>
                      <span className="text-xs text-cult-medium-gray">{g.plant_count} plants</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-cult-medium-gray">
          <button
            onClick={handleConfirm}
            disabled={saving || !flipDate}
            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Flower2 className="w-3.5 h-3.5" />
            {saving ? 'Flipping...' : isUpdate ? 'Update Flip Date' : `Flip Room`}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
