import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, Trash2, XCircle, Package, Loader2, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { formatWeight } from '../utils';
import { useBinEntryLabel } from '../hooks/useBinEntryLabel';
import type { BinLabelContext } from '../hooks/useBinEntryLabel';
import type { BinEntry } from '../types';

function yieldPct(wet: number, dry: number): string {
  if (wet <= 0) return '—';
  return `${((dry / wet) * 100).toFixed(1)}%`;
}

// ─── BinEntryWorkspace ───

export interface BinEntryWorkspaceProps {
  sessionId: string;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  addBinEntry: (input: { binning_session_id: string; bin_weight_grams: number; notes?: string }) => Promise<BinEntry>;
  removeBinEntry: (id: string) => Promise<void>;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
  wetWeight: number | null;
  labelContext: BinLabelContext | null;
}

export function BinEntryWorkspace({ sessionId, listBinEntries, addBinEntry, removeBinEntry, onComplete, onCancel, wetWeight, labelContext }: BinEntryWorkspaceProps) {
  const { printBinLabel } = useBinEntryLabel(labelContext);
  const [entries, setEntries] = useState<BinEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [weight, setWeight] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const data = await listBinEntries(sessionId);
      setEntries(data);
    } catch {
      setError('Failed to load bin entries');
    } finally {
      setLoadingEntries(false);
    }
  }, [sessionId, listBinEntries]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const totalWeight = entries.reduce((sum, e) => sum + Number(e.bin_weight_grams), 0);

  async function handleAddEntry() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    setAdding(true);
    setError(null);
    try {
      const newEntry = await addBinEntry({
        binning_session_id: sessionId,
        bin_weight_grams: w,
        notes: entryNotes.trim() || undefined,
      });
      setWeight('');
      setEntryNotes('');
      await loadEntries();

      // Auto-print label for the new bin entry
      printBinLabel({
        weightGrams: w,
        entryOrder: newEntry.entry_order,
        notes: newEntry.notes ?? undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add entry');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveEntry(id: string) {
    setError(null);
    try {
      await removeBinEntry(id);
      await loadEntries();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove entry');
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setError(null);
    try {
      await onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to complete session');
      setConfirmAction(null);
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    setError(null);
    try {
      await onCancel();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to cancel session');
      setConfirmAction(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-cult bg-cult-danger-muted border border-cult-danger/30 px-3 py-2 text-xs text-cult-danger">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded border border-cult-border-subtle bg-cult-surface-inset p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Bin Entries</span>
          <div className="text-[10px] text-white/30">
            {entries.length} bin{entries.length !== 1 ? 's' : ''}&nbsp;&middot;&nbsp;
            <span className="text-white/60 font-mono">{formatWeight(totalWeight)}</span>
            {wetWeight !== null && wetWeight > 0 && (
              <span className="ml-2 text-emerald-300/70">({yieldPct(wetWeight, totalWeight)} yield)</span>
            )}
          </div>
        </div>

        {/* Entry list */}
        {loadingEntries ? (
          <div className="text-[10px] text-white/25 py-2">Loading entries...</div>
        ) : entries.length > 0 ? (
          <div className="space-y-1">
            {entries.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded bg-cult-surface-inset border border-cult-border-faint px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] text-white/20 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                  <span className="text-sm font-mono font-medium text-white/70">{formatWeight(Number(entry.bin_weight_grams))}</span>
                  {entry.notes && <span className="text-[10px] text-white/30 truncate">{entry.notes}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => printBinLabel({ weightGrams: Number(entry.bin_weight_grams), entryOrder: entry.entry_order, notes: entry.notes ?? undefined })}
                    className="text-white/20 hover:text-white/50 transition-colors"
                    title="Reprint label"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="text-white/20 hover:text-rose-400/60 transition-colors"
                    title="Remove entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-white/20 py-1">No entries yet. Add a bin weight below.</p>
        )}

        {/* Add entry form */}
        <div className="flex items-end gap-2 pt-1">
          <div className="flex-1">
            <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Weight (g)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 3500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
              className="w-full glass-input rounded-cult px-3 py-2 text-sm text-white font-mono placeholder:text-white/15"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">
              Notes <span className="text-white/15">optional</span>
            </label>
            <input
              type="text"
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              placeholder="e.g. Bin A"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
              className="w-full glass-input rounded-cult px-3 py-2 text-sm text-white placeholder:text-white/15"
            />
          </div>
          <button
            onClick={handleAddEntry}
            disabled={adding || !parseFloat(weight)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-cult bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {confirmAction ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-white/40">
              {confirmAction === 'complete'
                ? `Complete and create ${entries.length} package${entries.length !== 1 ? 's' : ''} totaling ${formatWeight(totalWeight)}?`
                : 'Cancel this session? No inventory will be created.'}
            </span>
            <button
              onClick={confirmAction === 'complete' ? handleComplete : handleCancel}
              disabled={completing}
              className={`text-[10px] px-3 py-1.5 rounded-cult font-medium transition-all active:scale-95 disabled:opacity-50 ${
                confirmAction === 'complete'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              {completing ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              Nevermind
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmAction('complete')}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-cult bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Package className="h-3.5 w-3.5" />
              Complete &amp; Create Inventory
            </button>
            <button
              onClick={() => setConfirmAction('cancel')}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded bg-cult-surface-inset text-cult-text-muted border border-cult-border-subtle hover:text-cult-text-secondary hover:bg-cult-surface-subtle transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CompletedBinEntries ───

export interface CompletedBinEntriesProps {
  sessionId: string;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  canAddMissing: boolean;
  onAddBin: (sessionId: string, weight: number, notes?: string) => Promise<void>;
}

export function CompletedBinEntries({ sessionId, listBinEntries, canAddMissing, onAddBin }: CompletedBinEntriesProps) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<BinEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const data = await listBinEntries(sessionId);
      setEntries(data);
    } catch {
      setError('Failed to load entries');
    } finally {
      setLoadingEntries(false);
    }
  }, [sessionId, listBinEntries]);

  useEffect(() => {
    if (expanded && entries.length === 0 && !loadingEntries) {
      loadEntries();
    }
  }, [expanded, entries.length, loadingEntries, loadEntries]);

  const totalWeight = entries.reduce((sum, e) => sum + Number(e.bin_weight_grams), 0);

  async function handleAddBin() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    setAdding(true);
    setError(null);
    try {
      await onAddBin(sessionId, w, entryNotes.trim() || undefined);
      setWeight('');
      setEntryNotes('');
      setShowAddForm(false);
      await loadEntries();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add bin');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide' : 'Show'} bin entries
        {entries.length > 0 && !expanded && (
          <span className="text-white/20 ml-1">({entries.length})</span>
        )}
      </button>

      {expanded && (
        <div className="rounded border border-cult-border-subtle bg-cult-surface-inset p-3 space-y-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-cult-danger-muted border border-cult-danger/30 px-3 py-1.5 text-[10px] text-cult-danger">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingEntries ? (
            <div className="flex items-center gap-2 text-[10px] text-white/25 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          ) : entries.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Bin Entries</span>
                <span className="text-[10px] text-white/25">
                  {entries.length} bin{entries.length !== 1 ? 's' : ''}&nbsp;&middot;&nbsp;
                  <span className="text-white/50 font-mono">{formatWeight(totalWeight)}</span>
                </span>
              </div>
              <div className="space-y-1">
                {entries.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded bg-cult-surface-inset border border-cult-border-faint px-3 py-1.5">
                    <span className="text-[10px] text-white/20 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-mono font-medium text-white/60">{formatWeight(Number(entry.bin_weight_grams))}</span>
                    {entry.notes && <span className="text-[10px] text-white/25 truncate">{entry.notes}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-white/20 py-1">No bin entries recorded.</p>
          )}

          {canAddMissing && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-cult bg-amber-500/10 text-amber-300/70 border border-amber-500/20 hover:bg-amber-500/15 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Missing Bin
            </button>
          )}

          {canAddMissing && showAddForm && (
            <div className="rounded-cult border border-amber-500/20 bg-amber-500/[0.05] p-3 space-y-2">
              <div className="text-[10px] text-amber-300/70 font-semibold uppercase tracking-wider">
                Add Missing Bin — creates inventory
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 3500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddBin(); }}
                    className="w-full glass-input rounded-cult px-3 py-2 text-sm text-white font-mono placeholder:text-white/15"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">
                    Notes <span className="text-white/15">optional</span>
                  </label>
                  <input
                    type="text"
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="e.g. Late bin"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddBin(); }}
                    className="w-full glass-input rounded-cult px-3 py-2 text-sm text-white placeholder:text-white/15"
                  />
                </div>
                <button
                  onClick={handleAddBin}
                  disabled={adding || !parseFloat(weight)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-cult bg-amber-500/15 text-amber-300 border border-amber-500/20 text-sm font-medium hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {adding ? 'Adding...' : 'Add & Create Inventory'}
                </button>
              </div>
              <button
                onClick={() => { setShowAddForm(false); setWeight(''); setEntryNotes(''); setError(null); }}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
