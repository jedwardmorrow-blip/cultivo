import { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { GrowRoom, PlantGroup } from '../types';

interface MoveToRoomModalProps {
  group: PlantGroup;
  rooms: GrowRoom[];
  onMove: (toRoomId: string) => Promise<void>;
  onCancel: () => void;
}

export function MoveToRoomModal({ group, rooms, onMove, onCancel }: MoveToRoomModalProps) {
  const [toRoomId, setToRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRooms = rooms.filter((r) => r.is_active && r.id !== group.grow_room_id);

  async function handleMove() {
    if (!toRoomId) return;
    setSaving(true);
    setError(null);
    try {
      await onMove(toRoomId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to move plant group.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-1">Move Plant Group</h3>
        <p className="text-cult-light-gray text-sm mb-4">
          Moving <span className="text-cult-white font-mono">{group.group_number}</span> from{' '}
          <span className="text-cult-white">{group.grow_rooms?.name ?? group.grow_room_id}</span>
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Destination Room *</label>
          {availableRooms.length === 0 ? (
            <p className="text-amber-400 text-sm">No other active rooms available.</p>
          ) : (
            <select
              value={toRoomId}
              onChange={(e) => setToRoomId(e.target.value)}
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
            >
              <option value="">— Select destination —</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_code} — {r.name} ({r.room_type})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleMove}
            disabled={!toRoomId || saving || availableRooms.length === 0}
            className="flex items-center gap-2 bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" />
            {saving ? 'Moving...' : 'Move'}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
