import { useState } from 'react';
import { ClipboardList, AlertTriangle, Check } from 'lucide-react';
import type { GrowRoom, StartPlantAuditInput } from '../../types';

interface PlantAuditSetupModalProps {
 rooms: GrowRoom[];
 onStart: (input: StartPlantAuditInput) => Promise<void>;
 onCancel: () => void;
}

/**
 * PlantAuditSetupModal — room scope picker that starts a new audit session.
 *
 * Scope can be:
 * - one or more rooms (targeted)
 * - all active rooms (full facility)
 *
 * Starting the session pre-seeds one audit line per active plant group in
 * the scoped rooms.
 */
export function PlantAuditSetupModal({ rooms, onStart, onCancel }: PlantAuditSetupModalProps) {
 const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
 const [notes, setNotes] = useState('');
 const [starting, setStarting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const activeRooms = rooms.filter((r) => r.is_active);
 const allSelected = selectedRoomIds.size === activeRooms.length && activeRooms.length > 0;

 function toggleRoom(id: string) {
 setSelectedRoomIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }

 function toggleAll() {
 if (allSelected) setSelectedRoomIds(new Set());
 else setSelectedRoomIds(new Set(activeRooms.map((r) => r.id)));
 }

 async function handleStart() {
 if (starting) return;
 setStarting(true);
 setError(null);
 try {
 await onStart({
 room_scope: Array.from(selectedRoomIds),
 notes: notes.trim() || undefined,
 });
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to start audit');
 setStarting(false);
 }
 }

 const canStart = !starting;

 return (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
 <div className="bg-cult-surface rounded-cult max-w-xl w-full max-h-[90vh] overflow-y-auto border border-cult-border">
 <div className="sticky top-0 bg-cult-surface border-b border-cult-border-subtle px-6 py-4 rounded-t-cult">
 <div className="flex items-center gap-3">
 <ClipboardList className="w-5 h-5 text-cult-text-muted" />
 <div>
 <h2 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">
 Start Plant Audit
 </h2>
 <p className="text-xs text-cult-text-secondary mt-0.5">
 Select rooms to audit. Counts will be pre-seeded from current plant groups.
 </p>
 </div>
 </div>
 </div>

 <div className="p-6 space-y-4">
 {error && (
 <div className="flex items-start gap-2 bg-cult-danger/10 border border-cult-danger/40 text-cult-danger text-sm p-3 rounded-cult">
 <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
 <span>{error}</span>
 </div>
 )}

 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-xs text-cult-text-secondary uppercase tracking-wider">
 Room Scope
 </label>
 <button
 type="button"
 onClick={toggleAll}
 className="text-xs text-cult-accent hover:text-cult-accent-hover transition uppercase tracking-wider"
 >
 {allSelected ? 'Clear all' : 'Select all'}
 </button>
 </div>

 <div className="space-y-2">
 {activeRooms.length === 0 ? (
 <p className="text-cult-text-secondary text-sm">No active rooms available.</p>
 ) : (
 activeRooms.map((room) => {
 const selected = selectedRoomIds.has(room.id);
 return (
 <button
 key={room.id}
 type="button"
 onClick={() => toggleRoom(room.id)}
 className={`w-full flex items-center justify-between p-3 rounded border transition-colors text-left ${
 selected
 ? 'bg-cult-surface-raised border-cult-accent/50'
 : 'bg-cult-surface-inset border-cult-border-subtle hover:bg-cult-surface-subtle hover:border-cult-border'
 }`}
 >
 <div>
 <div className="text-sm font-medium text-cult-text-primary">
 {room.room_code} — {room.name}
 </div>
 <div className="text-xs text-cult-text-secondary mt-0.5">
 {room.room_type}
 </div>
 </div>
 {selected && <Check className="w-4 h-4 text-cult-accent" />}
 </button>
 );
 })
 )}
 </div>

 <p className="text-xs text-cult-text-muted mt-2">
 {selectedRoomIds.size === 0
 ? 'No rooms selected → full facility audit'
 : `${selectedRoomIds.size} room${selectedRoomIds.size === 1 ? '' : 's'} selected`}
 </p>
 </div>

 <div>
 <label className="block text-xs text-cult-text-secondary uppercase tracking-wider mb-1">
 Notes (optional)
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={2}
 placeholder="Baseline reset, post-move reconcile, etc."
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 </div>

 <div className="flex gap-3 justify-end px-6 pb-6 border-t border-cult-border-subtle pt-4">
 <button
 type="button"
 onClick={onCancel}
 disabled={starting}
 className="px-5 py-2 rounded border border-cult-border text-cult-text-primary hover:bg-cult-surface-subtle hover:border-cult-border-strong transition-colors disabled:opacity-50 font-mono uppercase tracking-[0.16em] text-[11px]"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleStart}
 disabled={!canStart}
 className="px-5 py-2 rounded border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono uppercase tracking-[0.16em] text-[11px]"
 >
 {starting ? 'Starting…' : 'Start Audit'}
 </button>
 </div>
 </div>
 </div>
 );
}
