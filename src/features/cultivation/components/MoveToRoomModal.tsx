import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRight, AlertTriangle, MapPin, Skull, Minus, Plus } from 'lucide-react';
import { Button } from '@/shared/components';
import { cultivationService } from '../services';
import { useMortalityLog } from '../hooks';
import type { GrowRoom, PlantGroup, RoomTable, SplitAndMoveInput, SplitAndMoveMultiInput, PlacementEntry, StrainCount } from '../types';

interface MoveToRoomModalProps {
 group: PlantGroup;
 /** When moving a multi-group batch, all groups in the batch */
 groups?: PlantGroup[];
 rooms: GrowRoom[];
 onMove: (toRoomId: string) => Promise<void>;
 onSplitAndMove?: (input: SplitAndMoveInput) => Promise<void>;
 onSplitAndMoveMultiple?: (input: SplitAndMoveMultiInput) => Promise<void>;
 onCancel: () => void;
}

type Step = 'room' | 'placement';

/** Per-cell state in the grid */
interface CellState {
 tableId: string;
 sectionId: string;
 tableNumber: number;
 sectionLabel: string;
 selected: boolean;
 plantCount: number;
 /** Existing occupancy from other groups */
 occupiedCount: number;
 occupiedStrains: StrainCount[];
}

export function MoveToRoomModal({ group, groups, rooms, onMove, onSplitAndMove, onSplitAndMoveMultiple, onCancel }: MoveToRoomModalProps) {
 const isMultiGroup = groups && groups.length > 1;
 const [step, setStep] = useState<Step>('room');
 const [toRoomId, setToRoomId] = useState('');
 const [tables, setTables] = useState<RoomTable[]>([]);
 const [loadingTables, setLoadingTables] = useState(false);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Kill plants state
 const [killCount, setKillCount] = useState(0);
 const { insertMortalityLog } = useMortalityLog();

 // Grid state — flat map keyed by"tableNumber-sectionLabel"
 const [cells, setCells] = useState<Map<string, CellState>>(new Map());

 const availableRooms = rooms.filter((r) => r.is_active && r.id !== group.grow_room_id);
 const selectedRoom = rooms.find((r) => r.id === toRoomId);
 const isFlowerRoom = selectedRoom?.room_type === 'flower';

 // Derive grid dimensions from tables
 const sortedTables = useMemo(() =>
 [...tables].filter(t => t.sections.length > 0).sort((a, b) => a.table_number - b.table_number),
 [tables]
 );
 const sectionLabels = useMemo(() => {
 const labels = new Set<string>();
 sortedTables.forEach(t => t.sections.forEach(s => { if (s.is_active) labels.add(s.section_label); }));
 return [...labels].sort();
 }, [sortedTables]);

 // Computed totals — use sum of all groups when multi-group batch
 const totalPlants = isMultiGroup
 ? groups.reduce((sum, g) => sum + g.plant_count, 0)
 : group.plant_count;
 const availablePlants = totalPlants - killCount;
 const selectedCells = useMemo(() =>
 [...cells.values()].filter(c => c.selected),
 [cells]
 );
 const assignedPlants = selectedCells.reduce((sum, c) => sum + c.plantCount, 0);
 const remainingPlants = availablePlants - assignedPlants;

 // Load tables + occupancy when room changes
 useEffect(() => {
 if (!toRoomId) {
 setTables([]);
 setCells(new Map());
 return;
 }
 setLoadingTables(true);
 Promise.all([
 cultivationService.listRoomTables(toRoomId),
 cultivationService.getSectionOccupancy(toRoomId),
 ]).then(([tableData, occupancyMap]) => {
 setTables(tableData);
 // Build the cell grid
 const newCells = new Map<string, CellState>();
 for (const table of tableData) {
 for (const section of table.sections) {
 if (!section.is_active) continue;
 const key = `${table.table_number}-${section.section_label}`;
 const occ = occupancyMap.get(section.id);
 newCells.set(key, {
 tableId: table.id,
 sectionId: section.id,
 tableNumber: table.table_number,
 sectionLabel: section.section_label,
 selected: false,
 plantCount: 0,
 occupiedCount: occ?.total_plants ?? 0,
 occupiedStrains: occ?.strain_counts ?? [],
 });
 }
 }
 setCells(newCells);
 }).catch(() => {
 setTables([]);
 setCells(new Map());
 }).finally(() => {
 setLoadingTables(false);
 });
 }, [toRoomId]);

 const hasSections = tables.some((t) => t.sections.length > 0);

 // ─── Cell interactions ───

 const toggleCell = useCallback((key: string) => {
 setCells(prev => {
 const next = new Map(prev);
 const cell = next.get(key);
 if (!cell) return prev;
 next.set(key, { ...cell, selected: !cell.selected, plantCount: cell.selected ? 0 : cell.plantCount });
 return next;
 });
 }, []);

 const setCellCount = useCallback((key: string, value: number) => {
 setCells(prev => {
 const next = new Map(prev);
 const cell = next.get(key);
 if (!cell) return prev;
 const num = Math.max(0, Math.floor(value));
 next.set(key, { ...cell, plantCount: num, selected: true });
 return next;
 });
 }, []);

 const distributeEvenly = useCallback(() => {
 setCells(prev => {
 const next = new Map(prev);
 const sel = [...next.values()].filter(c => c.selected);
 if (sel.length === 0) return prev;
 const per = Math.floor(availablePlants / sel.length);
 const remainder = availablePlants % sel.length;
 let idx = 0;
 for (const [key, cell] of next) {
 if (cell.selected) {
 next.set(key, { ...cell, plantCount: per + (idx < remainder ? 1 : 0) });
 idx++;
 }
 }
 return next;
 });
 }, [availablePlants]);

 const clearSelection = useCallback(() => {
 setCells(prev => {
 const next = new Map(prev);
 for (const [key, cell] of next) {
 if (cell.selected) {
 next.set(key, { ...cell, selected: false, plantCount: 0 });
 }
 }
 return next;
 });
 }, []);

 // ─── Step transitions ───

 function handleRoomContinue() {
 if (!toRoomId) return;
 if (isFlowerRoom && hasSections) {
 setStep('placement');
 } else {
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
 setSaving(true);
 setError(null);
 try {
 const validPlacements: PlacementEntry[] = selectedCells
 .filter((c) => c.plantCount > 0)
 .map((c) => ({
 table_id: c.tableId,
 section_id: c.sectionId,
 plant_count: c.plantCount,
 }));

 if (validPlacements.length === 0) {
 setError('Select sections and assign plant counts first.');
 setSaving(false);
 return;
 }

 // Log mortality first — trigger auto-decrements source group plant_count
 if (killCount > 0) {
 await insertMortalityLog({
 plant_group_id: group.id,
 room_id: group.grow_room_id,
 quantity: killCount,
 cause: 'cull_at_move',
 cause_detail: `Culled during move to ${selectedRoom?.room_code ?? toRoomId}`,
 notes: `${killCount} plant${killCount !== 1 ? 's' : ''} culled — too small/unhealthy for move`,
 });
 }

 if (isMultiGroup && onSplitAndMoveMultiple) {
 // Multi-group batch move — draw from all source groups
 await onSplitAndMoveMultiple({
 source_group_ids: groups!.map(g => g.id),
 to_room_id: toRoomId,
 placements: validPlacements,
 kill_count: killCount,
 });
 } else if (onSplitAndMove) {
 // Single-group move
 await onSplitAndMove({
 source_group_id: group.id,
 to_room_id: toRoomId,
 placements: validPlacements,
 });
 }
 } catch (err: unknown) {
 setError(err instanceof Error ? err.message : 'Failed to move plant group.');
 } finally {
 setSaving(false);
 }
 }

 const groupLabel = isMultiGroup
 ? `${group.batch_registry?.batch_number ?? group.strains?.name ?? 'Batch'} (${groups!.length} groups)`
 : (group.batch_registry?.batch_number ?? group.strains?.name ?? 'this group');
 const fromRoom = group.grow_rooms?.name ?? group.grow_room_id;
 const filledCount = selectedCells.filter(c => c.plantCount > 0).length;
 const canConfirm = remainingPlants >= 0 && filledCount > 0;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
 <div className={`rounded-cult border border-cult-border bg-cult-surface p-6 ${step === 'placement' ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
 <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">{isMultiGroup ? 'Move Batch' : 'Move Plant Group'}</h3>
 <p className="text-white/50 text-sm mb-1">
 Moving <span className="text-white font-mono font-bold">{groupLabel}</span> from{' '}
 <span className="text-white">{fromRoom}</span>
 </p>
 <p className="text-white/30 text-xs mb-4">
 {totalPlants} plant{totalPlants !== 1 ? 's' : ''} in group
 </p>

 {error && (
 <div className="flex items-start gap-2 rounded-cult bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 mb-4">
 <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
 {error}
 </div>
 )}

 {/* ─── Step 1: Room Selection ─── */}
 {step === 'room' && (
 <>
 <div className="mb-4">
 <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Destination Room *</label>
 {availableRooms.length === 0 ? (
 <p className="text-amber-400 text-sm">No other active rooms available.</p>
 ) : (
 <select
 value={toRoomId}
 onChange={(e) => setToRoomId(e.target.value)}
 className="w-full rounded border border-cult-border-subtle bg-cult-surface-inset text-cult-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-cult-accent transition-colors"
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
 <p className="text-xs text-emerald-400/70 mt-1.5">
 Flower room — you&apos;ll assign plants to tables and sections next.
 </p>
 )}
 {toRoomId && !loadingTables && !isFlowerRoom && (
 <p className="text-xs text-white/30 mt-1.5">
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
 className="px-5 py-2 text-sm font-medium rounded-cult border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 transition-all"
 >
 Cancel
 </button>
 </div>
 </>
 )}

 {/* ─── Step2: Grid-based Placement Builder ─── */}
 {step === 'placement' && (
 <>
 <div className="mb-3">
 <p className="text-xs text-white/30 mb-2">
 Moving to <span className="text-white font-bold">{selectedRoom?.room_code}</span> — {selectedRoom?.name}
 </p>
 </div>

 {/* Kill plants row */}
 <div className="flex items-center gap-3 rounded-cult bg-red-500/10 border border-red-500/20 px-3 py-2.5 mb-3">
 <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500/10 flex-shrink-0">
 <Skull className="w-3 h-3 text-red-400" />
 </div>
 <div className="flex-1">
 <p className="text-[10px] text-red-400 font-medium uppercase tracking-wider">Kill Plants</p>
 </div>
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => setKillCount((c) => Math.max(c - 1, 0))}
 disabled={killCount <= 0}
 className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-red-500/20 text-red-400 hover:border-red-500/40 disabled:opacity-30 transition-colors"
 >
 <Minus className="w-3 h-3" />
 </button>
 <input
 type="number"
 min={0}
 max={totalPlants - 1}
 value={killCount > 0 ? killCount : ''}
 onChange={(e) => {
 const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
 setKillCount(Math.min(v, totalPlants - 1));
 }}
 placeholder="0"
 className="w-12 rounded-lg bg-white/5 border border-red-500/20 text-red-400 px-1 py-0.5 text-xs text-center font-mono focus:outline-none focus:border-red-500/40"
 />
 <button
 type="button"
 onClick={() => setKillCount((c) => Math.min(c + 1, totalPlants - 1))}
 disabled={killCount >= totalPlants - 1}
 className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-red-500/20 text-red-400 hover:border-red-500/40 disabled:opacity-30 transition-colors"
 >
 <Plus className="w-3 h-3" />
 </button>
 </div>
 </div>

 {/* Grid header with actions */}
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-1.5">
 <MapPin className="w-3 h-3 text-white/40" />
 <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Tap sections to select</span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={distributeEvenly}
 disabled={selectedCells.length === 0}
 className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded-lg border border-white/10 text-white/40 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-30 transition-all"
 >
 Distribute evenly
 </button>
 <button
 onClick={clearSelection}
 disabled={selectedCells.length === 0}
 className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded-lg border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 disabled:opacity-30 transition-all"
 >
 Clear
 </button>
 </div>
 </div>

 {/* Grid legend */}
 <div className="flex items-center gap-4 mb-2">
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded border border-dashed border-cult-border bg-cult-surface-inset" />
 <span className="text-[9px] text-white/25">Empty</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded border border-amber-500/30 bg-amber-500/10" />
 <span className="text-[9px] text-white/25">Occupied</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded border border-emerald-500/30 bg-emerald-500/10" />
 <span className="text-[9px] text-white/25">Placing here</span>
 </div>
 </div>

 {/* ─── Room Grid ─── */}
 <div
 className="grid gap-[3px] mb-3"
 style={{
 gridTemplateColumns: `36px repeat(${sectionLabels.length}, 1fr)`,
 }}
 >
 {/* Column headers */}
 <div className="text-center text-[9px] font-mono font-bold text-white/20 py-1" />
 {sectionLabels.map((label) => (
 <div key={label} className="text-center text-[9px] font-mono font-bold text-white/20 py-1 tracking-wider">
 {label}
 </div>
 ))}

 {/* Grid rows */}
 {sortedTables.map((table) => (
 <>
 {/* Row label */}
 <div key={`label-${table.table_number}`} className="flex items-center justify-center text-[9px] font-mono font-bold text-white/20">
 T{table.table_number}
 </div>
 {/* Cells */}
 {sectionLabels.map((sLabel) => {
 const key = `${table.table_number}-${sLabel}`;
 const cell = cells.get(key);
 if (!cell) {
 return <div key={key} className="min-h-[52px] rounded bg-cult-surface-inset border border-cult-border-faint" />;
 }

 const isOccupied = cell.occupiedCount > 0;
 const isSelected = cell.selected;
 const strainSummary = cell.occupiedStrains.map(s => `${s.count} ${s.abbreviation}`).join(', ');

 if (isSelected) {
 return (
 <div
 key={key}
 className="min-h-[52px] rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 flex flex-col items-center justify-center relative"
 >
 <button
 onClick={() => toggleCell(key)}
 className="absolute top-0.5 right-1 text-[8px] text-emerald-400/40 hover:text-red-400 transition-colors"
 title="Deselect"
 >
 ✕
 </button>
 <input
 ref={(el) => { if (el && cell.plantCount === 0) el.focus(); }}
 type="number"
 min={0}
 value={cell.plantCount > 0 ? cell.plantCount : ''}
 onChange={(e) => setCellCount(key, Number(e.target.value) || 0)}
 onFocus={(e) => e.target.select()}
 placeholder="0"
 className="w-full h-full text-center bg-transparent text-emerald-400 font-mono text-sm font-bold outline-none cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
 />
 {isOccupied && (
 <div className="flex flex-col items-center">
 {cell.occupiedStrains.map(s => (
 <span key={s.abbreviation} className="text-[7px] text-amber-400/50 font-mono leading-tight">
 +{s.count} {s.abbreviation}
 </span>
 ))}
 </div>
 )}
 </div>
 );
 }

 if (isOccupied) {
 return (
 <button
 key={key}
 onClick={() => toggleCell(key)}
 className="min-h-[52px] rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/30 transition-colors"
 title={`Occupied: ${strainSummary} — click to co-place`}
 >
 <span className="font-mono text-[11px] font-bold text-amber-400/70">{cell.occupiedCount}</span>
 <div className="flex flex-col items-center">
 {cell.occupiedStrains.map(s => (
 <span key={s.abbreviation} className="text-[7px] text-amber-400/30 uppercase tracking-wider leading-tight">
 {s.count} {s.abbreviation}
 </span>
 ))}
 </div>
 </button>
 );
 }

 return (
 <button
 key={key}
 onClick={() => toggleCell(key)}
 className="min-h-[52px] rounded bg-cult-surface-inset border border-dashed border-cult-border hover:border-cult-success/40 hover:bg-cult-success/5 transition-colors cursor-pointer"
 />
 );
 })}
 </>
 ))}
 </div>

 {/* Running counter */}
 <div className="flex items-center justify-between rounded border border-cult-border-subtle bg-cult-surface-inset px-3 py-2.5 mb-3">
 <div className="text-xs text-white/30">
 {killCount > 0 && (
 <span className="text-red-400 font-mono font-bold mr-1.5">{killCount} killed</span>
 )}
 <span className="text-white font-mono font-bold">{assignedPlants}</span> assigned
 </div>
 <div className="text-xs text-white/30">
 <span className={`font-mono font-bold ${remainingPlants === 0 ? 'text-emerald-400' : remainingPlants < 0 ? 'text-red-400' : 'text-amber-400'}`}>
 {remainingPlants}
 </span> remaining
 </div>
 <div className="text-xs text-white/30">
 of <span className="text-white font-mono font-bold">{availablePlants}</span> avail
 </div>
 </div>

 {remainingPlants > 0 && filledCount > 0 && (
 <p className="text-xs text-white/25 mb-3">
 {remainingPlants} plant{remainingPlants !== 1 ? 's' : ''} will stay in {fromRoom}.
 </p>
 )}

 {remainingPlants < 0 && (
 <div className="flex items-start gap-2 rounded-cult bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 mb-3">
 <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
 Over-assigned by {Math.abs(remainingPlants)} — reduce plant counts{killCount > 0 ? ' or kill count' : ''}.
 </div>
 )}

 <div className="flex gap-3">
 <Button
 onClick={handleSplitMove}
 disabled={!canConfirm || saving}
 size="sm"
 icon={<ArrowRight className="w-4 h-4" />}
 >
 {saving ? 'Moving...' : `${killCount > 0 ? `Kill ${killCount} & ` : ''}Move ${assignedPlants} Plant${assignedPlants !== 1 ? 's' : ''}`}
 </Button>
 <button
 onClick={() => { setStep('room'); clearSelection(); setKillCount(0); }}
 disabled={saving}
 className="px-5 py-2 text-sm font-medium rounded-cult border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 transition-all"
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
