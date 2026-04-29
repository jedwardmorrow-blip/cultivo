import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { auditService } from '../../services/audit.service';

const AVAILABLE_STAGES = ['Binned', 'Bucked', 'Trimmed', 'Packaged'];

interface AuditInitiateModalProps {
 open: boolean;
 loading: boolean;
 lockedStages: Map<string, string>;
 onClose: () => void;
 onStart: (selectedStages: string[], notes?: string) => void;
}

export function AuditInitiateModal({ open, loading, lockedStages, onClose, onStart }: AuditInitiateModalProps) {
 const [selectedStages, setSelectedStages] = useState<string[]>([]);
 const [notes, setNotes] = useState('');
 const [pendingConversions, setPendingConversions] = useState<{ blocked: boolean; message: string | null; details: { batch_name: string; count: number }[] }>({ blocked: false, message: null, details: [] });
 const [checkingConversions, setCheckingConversions] = useState(false);

 useEffect(() => {
 if (!open) return;
 setCheckingConversions(true);
 auditService.checkPendingConversions()
 .then(setPendingConversions)
 .catch(() => setPendingConversions({ blocked: false, message: null, details: [] }))
 .finally(() => setCheckingConversions(false));
 }, [open]);

 if (!open) return null;

 function toggleStage(stage: string) {
 setSelectedStages((prev) =>
 prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
 );
 }

 function selectAll() {
 setSelectedStages(AVAILABLE_STAGES.filter((s) => !lockedStages.has(s)));
 }

 function handleStart() {
 if (selectedStages.length === 0) return;
 onStart(selectedStages, notes.trim() || undefined);
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div className="absolute inset-0 bg-black/70" onClick={onClose} />

 {/* Modal */}
 <div className="relative w-full max-w-md rounded-cult border border-cult-border bg-cult-surface p-6">
 <button
 type="button"
 onClick={onClose}
 className="absolute top-4 right-4 text-cult-text-muted hover:text-cult-text-primary transition"
 >
 <X className="w-5 h-5" />
 </button>

 <h3 className="text-lg font-bold text-cult-text-primary">Start Inventory Audit</h3>
 <p className="text-sm text-cult-text-secondary mt-1 mb-5">
 Select which pipeline stages to count. All packages with on-hand quantity in
 those stages will be snapshotted into the audit.
 </p>

 {/* Pending conversions blocker */}
 {checkingConversions && (
 <div className="mb-5 p-3 rounded-cult bg-cult-surface-subtle border border-cult-border-subtle flex items-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin text-cult-text-muted" />
 <p className="text-xs text-cult-text-muted">Checking for pending conversions…</p>
 </div>
 )}
 {pendingConversions.blocked && (
 <div className="mb-5 p-4 rounded-cult bg-amber-500/10 border border-amber-500/30">
 <div className="flex items-start gap-2.5">
 <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
 <div>
 <p className="text-sm font-medium text-amber-300">Pending Conversions</p>
 <p className="text-xs text-cult-text-secondary mt-1">
 All pending conversions must be finalized or voided before starting an audit.
 Auditing while conversions are pending leads to inventory mismatches.
 </p>
 <ul className="mt-2 space-y-0.5">
 {pendingConversions.details.map((d) => (
 <li key={d.batch_name} className="text-xs text-cult-text-secondary">
 <span className="text-cult-text-primary font-medium">{d.batch_name}</span>
 {' — '}{d.count} pending
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 )}

 {/* Stage picker */}
 <div className="space-y-2 mb-4">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-cult-text-secondary uppercase tracking-wider">
 Stages
 </label>
 <button
 type="button"
 onClick={selectAll}
 className="text-xs text-cult-accent hover:underline"
 >
 Select all
 </button>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {AVAILABLE_STAGES.map((stage) => {
 const active = selectedStages.includes(stage);
 const lockedBy = lockedStages.get(stage);
 return (
 <button
 key={stage}
 type="button"
 onClick={() => !lockedBy && toggleStage(stage)}
 disabled={!!lockedBy}
 className={`px-3 py-2.5 rounded-cult border text-sm font-medium transition ${
 lockedBy
 ? 'border-cult-border bg-cult-surface-inset text-cult-text-muted cursor-not-allowed opacity-50'
 : active
 ? 'border-cult-accent bg-cult-accent/10 text-cult-accent'
 : 'border-cult-border bg-cult-surface-subtle text-cult-text-secondary hover:bg-cult-surface-raised'
 }`}
 >
 {stage}
 {lockedBy && (
 <span className="block text-[10px] text-cult-text-muted mt-0.5">
 In use · {lockedBy}
 </span>
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* Notes */}
 <div className="mb-5">
 <label className="text-xs font-bold text-cult-text-secondary uppercase tracking-wider block mb-1.5">
 Notes (optional)
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={2}
 placeholder="Sunday baseline reset…"
 className="w-full px-3 py-2 rounded-cult border border-cult-border bg-cult-surface-subtle text-sm text-cult-text-primary placeholder:text-cult-text-muted resize-none focus:outline-none focus:border-cult-accent/50"
 />
 </div>

 {/* Scope preview */}
 {selectedStages.length > 0 && (
 <div className="mb-5 p-3 rounded-cult bg-cult-surface-subtle border border-cult-border-subtle">
 <p className="text-xs text-cult-text-secondary">
 This audit will snapshot all packages in{' '}
 <span className="text-cult-text-primary font-medium">
 {selectedStages.join(', ')}
 </span>{' '}
 with on-hand qty &gt; 0.
 </p>
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-end gap-3">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded-cult text-sm text-cult-text-secondary hover:text-cult-text-primary transition"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleStart}
 disabled={selectedStages.length === 0 || loading || pendingConversions.blocked || checkingConversions}
 className="px-5 py-2 rounded border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-mono uppercase tracking-[0.16em] text-[11px]"
 >
 {loading && <Loader2 className="w-4 h-4 animate-spin" />}
 Start Audit
 </button>
 </div>
 </div>
 </div>
 );
}
