import { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle, MapPin } from 'lucide-react';
import { Button } from '@/shared/components';
import { cultivationService } from '../services';
import type { GrowRoom, PlantGroup, RoomTable } from '../types';

interface MoveToRoomModalProps {
  group: PlantGroup;
  rooms: GrowRoom[];
  onMove: (toRoomId: string) => Promise<void>;
  onCancel: () => void;
}

type Step = 'room' | 'section';

export function MoveToRoomModal({ group, rooms, onMove, onCancel }: MoveToRoomModalProps) {
  const [step, setStep] = useState<Step>('room');
  const [toRoomId, setToRoomId] = useState('');
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRooms = rooms.filter((r) => r.is_active && r.id !== group.grow_room_id);
  const selectedRoom = rooms.find((r) => r.id === toRoomId);

  useEffect(() => {
    if (!toRoomId) {
      setTables([]);
      setSelectedTableId(null);
      setSelectedSectionId(null);
      return;
    }
    setLoadingTables(true);
    cultivationService.listRoomTables(toRoomId).then((data) => {
      setTables(data);
    }).catch(() => {
      setTables([]);
    }).finally(() => {
      setLoadingTables(false);
    });
  }, [toRoomId]);

  const hasSections = tables.some((t) => t.sections.length > 0);

  const allSectionsFlat = tables.flatMap((t) =>
    t.sections.map((s) => ({ ...s, tableId: t.id, tableName: `Table ${t.table_number}${t.table_name ? ` — ${t.table_name}` : ''}` }))
  );

  function handleRoomContinue() {
    if (!toRoomId) return;
    if (hasSections) {
      setStep('section');
    } else {
      void handleMove();
    }
  }

  async function handleMove() {
    setSaving(true);
    setError(null);
    try {
      await onMove(toRoomId);

      if (selectedSectionId || selectedTableId) {
        await cultivationService.updatePlantGroupPlacement(group.id, {
          room_table_id: selectedTableId,
          room_section_id: selectedSectionId,
        });
      }
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
          Moving <span className="text-cult-white font-mono">{group.batch_registry?.batch_number ?? group.strains?.name ?? 'this group'}</span> from{' '}
          <span className="text-cult-white">{group.grow_rooms?.name ?? group.grow_room_id}</span>
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {step === 'room' && (
          <>
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
              {toRoomId && !loadingTables && hasSections && (
                <p className="text-xs text-cult-medium-gray mt-1.5">
                  This room has sections — you can assign a placement in the next step.
                </p>
              )}
              {toRoomId && !loadingTables && !hasSections && (
                <p className="text-xs text-cult-medium-gray mt-1.5">
                  No sections configured for this room.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRoomContinue}
                disabled={!toRoomId || saving || availableRooms.length === 0 || loadingTables}
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {hasSections ? 'Continue' : saving ? 'Moving...' : 'Move'}
              </Button>
              <button
                onClick={onCancel}
                className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'section' && (
          <>
            <div className="mb-1">
              <p className="text-xs text-cult-medium-gray mb-1">
                Moving to <span className="text-cult-white">{selectedRoom?.name}</span>
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-cult-light-gray" />
                <label className="text-xs text-cult-light-gray uppercase tracking-wider">Section Assignment (optional)</label>
              </div>
              <p className="text-xs text-cult-medium-gray mb-3">
                Assign a section now, or skip to place later from the Room Map.
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => { setSelectedTableId(null); setSelectedSectionId(null); }}
                  className={`w-full text-left px-3 py-2 text-xs border transition-colors ${
                    !selectedSectionId
                      ? 'border-cult-lighter-gray text-cult-white bg-cult-black'
                      : 'border-cult-dark-gray text-cult-medium-gray hover:border-cult-medium-gray hover:text-cult-light-gray'
                  }`}
                >
                  Skip — place later
                </button>
                {allSectionsFlat.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedTableId(s.tableId); setSelectedSectionId(s.id); }}
                    className={`w-full text-left px-3 py-2 text-xs border transition-colors ${
                      selectedSectionId === s.id
                        ? 'border-cult-lighter-gray text-cult-white bg-cult-black'
                        : 'border-cult-dark-gray text-cult-medium-gray hover:border-cult-medium-gray hover:text-cult-light-gray'
                    }`}
                  >
                    <span className="font-mono font-bold mr-2">{s.tableName} / {s.section_label}</span>
                    {s.section_sqft && <span className="opacity-60">{s.section_sqft} sqft</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleMove}
                disabled={saving}
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {saving ? 'Moving...' : 'Confirm Move'}
              </Button>
              <button
                onClick={() => setStep('room')}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
