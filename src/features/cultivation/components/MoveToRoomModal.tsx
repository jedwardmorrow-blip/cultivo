import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, AlertTriangle, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components';
import { cultivationService } from '../services';
import type { GrowRoom, PlantGroup, RoomTable, SplitAndMoveInput, PlacementEntry } from '../types';

interface MoveToRoomModalProps {
  group: PlantGroup;
  rooms: GrowRoom[];
  onMove: (toRoomId: string) => Promise<void>;
  onSplitAndMove?: (input: SplitAndMoveInput) => Promise<void>;
  onCancel: () => void;
}

type Step = 'room' | 'placement';

interface PlacementRow {
  id: string;
  tableId: string;
  sectionId: string;
  plantCount: number;
}

let rowIdCounter = 0;
function nextRowId() {
  return `row-${++rowIdCounter}`;
}

export function MoveToRoomModal({ group, rooms, onMove, onSplitAndMove, onCancel }: MoveToRoomModalProps) {
  const [step, setStep] = useState<Step>('room');
  const [toRoomId, setToRoomId] = useState('');
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placement builder state
  const [placements, setPlacements] = useState<PlacementRow[]>([]);

  const availableRooms = rooms.filter((r) => r.is_active && r.id !== group.grow_room_id);
  const selectedRoom = rooms.find((r) => r.id === toRoomId);
  const isFlowerRoom = selectedRoom?.room_type === 'flower';

  // Flatten all sections for the dropdown options
  const allSections = useMemo(() =>
    tables.flatMap((t) =>
      t.sections
        .filter((s) => s.is_active)
        .map((s) => ({
          id: s.id,
          tableId: t.id,
          tableNumber: t.table_number,
          tableName: t.table_name,
          sectionLabel: s.section_label,
          displayName: `T${t.table_number} / ${s.section_label}`,
        }))
    ),
    [tables]
  );

  // Compute assigned / remaining — force integer math
  const totalPlants = group.plant_count;
  const assignedPlants = placements.reduce((sum, p) => sum + (Number(p.plantCount) || 0), 0);
  const remainingPlants = totalPlants - assignedPlants;

  // Sections already used in placements (prevent duplicates)
  const usedSectionIds = new Set(placements.map((p) => p.sectionId).filter(Boolean));

  useEffect(() => {
    if (!toRoomId) {
      setTables([]);
      setPlacements([]);
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

  function handleRoomContinue() {
    if (!toRoomId) return;
    if (isFlowerRoom && hasSections) {
      // Seed with one empty placement row
      setPlacements([{ id: nextRowId(), tableId: '', sectionId: '', plantCount: 0 }]);
      setStep('placement');
    } else {
      // Non-flower room — simple move, no placement needed
      void handleSimpleMove();
    }
  }

  async function handleSimpleMove() {
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

  async function handleSplitMove() {
    if (!onSplitAndMove) return;
    setSaving(true);
    setError(null);
    try {
      const validPlacements: PlacementEntry[] = placements
        .filter((p) => p.sectionId && p.tableId && p.plantCount > 0)
        .map((p) => ({
          table_id: p.tableId,
          section_id: p.sectionId,
          plant_count: p.plantCount,
        }));

      if (validPlacements.length === 0) {
        setError('Add at least one placement with a section and plant count.');
        setSaving(false);
        return;
      }

      await onSplitAndMove({
        source_group_id: group.id,
        to_room_id: toRoomId,
        placements: validPlacements,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to move plant group.');
    } finally {
      setSaving(false);
    }
  }

  function addPlacementRow() {
    setPlacements((prev) => [...prev, { id: nextRowId(), tableId: '', sectionId: '', plantCount: 0 }]);
  }

  function removePlacementRow(rowId: string) {
    setPlacements((prev) => prev.filter((p) => p.id !== rowId));
  }

  function updatePlacement(rowId: string, field: keyof PlacementRow, value: string | number) {
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== rowId) return p;
        if (field === 'sectionId') {
          // Auto-fill tableId from section selection
          const section = allSections.find((s) => s.id === value);
          return { ...p, sectionId: value as string, tableId: section?.tableId ?? '' };
        }
        if (field === 'plantCount') {
          // Always store as integer
          const num = Math.max(0, Math.floor(Number(value) || 0));
          return { ...p, plantCount: num };
        }
        return { ...p, [field]: value };
      })
    );
  }

  const groupLabel = group.batch_registry?.batch_number ?? group.strains?.name ?? 'this group';
  const fromRoom = group.grow_rooms?.name ?? group.grow_room_id;
  // Valid placements = rows with both section and count filled in
  const filledPlacements = placements.filter((p) => p.sectionId && p.plantCount > 0);
  const canConfirm = remainingPlants >= 0 && filledPlacements.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-1">Move Plant Group</h3>
        <p className="text-cult-light-gray text-sm mb-1">
          Moving <span className="text-cult-white font-mono font-bold">{groupLabel}</span> from{' '}
          <span className="text-cult-white">{fromRoom}</span>
        </p>
        <p className="text-cult-medium-gray text-xs mb-4">
          {totalPlants} plant{totalPlants !== 1 ? 's' : ''} in group
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ─── Step 1: Room Selection ─── */}
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
              {toRoomId && !loadingTables && isFlowerRoom && hasSections && (
                <p className="text-xs text-emerald-400/80 mt-1.5">
                  Flower room — you&apos;ll assign plants to tables and sections next.
                </p>
              )}
              {toRoomId && !loadingTables && !isFlowerRoom && (
                <p className="text-xs text-cult-medium-gray mt-1.5">
                  Non-flower room — entire group will be moved.
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
                {isFlowerRoom && hasSections ? 'Assign Placement' : saving ? 'Moving...' : 'Move'}
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

        {/* ─── Step 2: Placement Builder ─── */}
        {step === 'placement' && (
          <>
            <div className="mb-3">
              <p className="text-xs text-cult-medium-gray mb-1">
                Moving to <span className="text-cult-white font-bold">{selectedRoom?.room_code}</span> — {selectedRoom?.name}
              </p>
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 text-cult-light-gray" />
                <label className="text-xs text-cult-light-gray uppercase tracking-wider">Section Placement</label>
              </div>
            </div>

            {/* Running counter */}
            <div className="flex items-center justify-between bg-cult-black border border-cult-dark-gray px-3 py-2 mb-3">
              <div className="text-xs text-cult-medium-gray">
                <span className="text-cult-white font-mono font-bold">{assignedPlants}</span> assigned
              </div>
              <div className="text-xs text-cult-medium-gray">
                <span className={`font-mono font-bold ${remainingPlants === 0 ? 'text-emerald-400' : remainingPlants < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {remainingPlants}
                </span> remaining
              </div>
              <div className="text-xs text-cult-medium-gray">
                of <span className="text-cult-white font-mono font-bold">{totalPlants}</span> total
              </div>
            </div>

            {remainingPlants > 0 && filledPlacements.length > 0 && (
              <p className="text-xs text-cult-medium-gray mb-3">
                {remainingPlants} plant{remainingPlants !== 1 ? 's' : ''} will stay in {fromRoom}.
              </p>
            )}

            {remainingPlants < 0 && (
              <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Over-assigned by {Math.abs(remainingPlants)} — reduce plant counts.
              </div>
            )}

            {/* Placement rows */}
            <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
              {placements.map((row, idx) => (
                <div key={row.id} className="flex items-center gap-2">
                  {/* Section select */}
                  <select
                    value={row.sectionId}
                    onChange={(e) => updatePlacement(row.id, 'sectionId', e.target.value)}
                    className="flex-1 bg-cult-black border border-cult-dark-gray text-cult-white px-2 py-1.5 text-xs focus:outline-none focus:border-cult-lighter-gray"
                  >
                    <option value="">Section...</option>
                    {allSections.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={usedSectionIds.has(s.id) && row.sectionId !== s.id}
                      >
                        {s.displayName}
                      </option>
                    ))}
                  </select>

                  {/* Plant count */}
                  <input
                    type="number"
                    min={0}
                    max={totalPlants}
                    value={row.plantCount > 0 ? row.plantCount : ''}
                    onChange={(e) => updatePlacement(row.id, 'plantCount', e.target.value)}
                    placeholder="qty"
                    className="w-16 bg-cult-black border border-cult-dark-gray text-cult-white px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:border-cult-lighter-gray"
                  />

                  {/* Remove row */}
                  {placements.length > 1 && (
                    <button
                      onClick={() => removePlacementRow(row.id)}
                      className="p-1 text-cult-medium-gray hover:text-red-400 transition-colors"
                      title="Remove placement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add another placement row */}
            {remainingPlants > 0 && (
              <button
                onClick={addPlacementRow}
                className="flex items-center gap-1.5 text-xs text-cult-light-gray hover:text-cult-white transition-colors mb-4"
              >
                <Plus className="w-3.5 h-3.5" />
                Add section ({remainingPlants} plant{remainingPlants !== 1 ? 's' : ''} remaining)
              </button>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSplitMove}
                disabled={!canConfirm || saving}
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {saving ? 'Moving...' : `Move ${assignedPlants} Plant${assignedPlants !== 1 ? 's' : ''}`}
              </Button>
              <button
                onClick={() => { setStep('room'); setPlacements([]); }}
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
