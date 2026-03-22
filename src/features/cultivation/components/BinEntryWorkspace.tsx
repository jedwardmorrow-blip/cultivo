import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, Trash2, XCircle, Package, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatWeight } from '../utils';
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
}

export function BinEntryWorkspace({ sessionId, listBinEntries, addBinEntry, removeBinEntry, onComplete, onCancel, wetWeight }: BinEntryWorkspaceProps) {
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
      await addBinEntry({
        binning_session_id: sessionId,
        bin_weight_grams: w,
        notes: entryNotes.trim() || undefined,
      });
      setWeight('');
      setEntryNotes('');
      await loadEntries();
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
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-md border border-cult-medium-gray bg-cult-black p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-cult-light-gray uppercase tracking-wider">Bin Entries</h4>
          <div className="text-xs text-cult-medium-gray">
            {entries.length} bin{entries.length !== 1 ? 's' : ''} &middot; <span className="text-cult-white font-medium">{formatWeight(totalWeight)}</span>
            {wetWeight !== null && wetWeight > 0 && (
              <span className="ml-2 text-green-400">({yieldPct(wetWeight, totalWeight)} yield)</span>
            )}
          </div>
        </div>

        {loadingEntries ? (
          <div className="text-xs text-cult-medium-gray py-2">Loading entries...</div>
        ) : entries.length > 0 ? (
          <div className="space-y-1">
            {entries.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded bg-cult-dark-gray px-3 py-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-cult-medium-gray w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm font-medium text-cult-white">{formatWeight(Number(entry.bin_weight_grams))}</span>
                  {entry.notes && <span className="text-xs text-cult-medium-gray truncate">{entry.notes}</span>}
                </div>
                <button
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="text-cult-medium-gray hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-cult-medium-gray py-1">No entries yet. Add bin weights below.</p>
        )}

        <div className="flex items-end gap-2 pt-1">
          <div className="flex-1">
            <label className="block text-xs text-cult-medium-gray mb-0.5">Weight (g)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 3500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
              className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-1.5 focus:outline-none focus:border-cult-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-cult-medium-gray mb-0.5">Notes <span className="text-cult-medium-gray/60">optional</span></label>
            <input
              type="text"
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              placeholder="e.g. Bin A"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
              className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-1.5 focus:outline-none focus:border-cult-white"
            />
          </div>
          <button
            onClick={handleAddEntry}
            disabled={adding || !parseFloat(weight)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {confirmAction ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-cult-light-gray">
              {confirmAction === 'complete'
                ? `Complete session and create ${entries.length} individual package${entries.length !== 1 ? 's' : ''} totaling ${formatWeight(totalWeight)}?`
                : 'Cancel this session? No inventory will be created.'}
            </span>
            <button
              onClick={confirmAction === 'complete' ? handleComplete : handleCancel}
              disabled={completing}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                confirmAction === 'complete'
                  ? 'bg-green-900 text-green-300 hover:bg-green-800'
                  : 'bg-red-900 text-red-300 hover:bg-red-800'
              }`}
            >
              {completing ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              Nevermind
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmAction('complete')}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-950 border border-green-700 text-green-400 hover:bg-green-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Package className="h-3.5 w-3.5" />
              Complete & Create Inventory
            </button>
            <button
              onClick={() => setConfirmAction('cancel')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 transition-colors"
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
        className="flex items-center gap-1.5 text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide' : 'Show'} bin entries
        {entries.length > 0 && !expanded && (
          <span className="text-cult-light-gray ml-1">({entries.length})</span>
        )}
      </button>

      {expanded && (
        <div className="rounded-md border border-cult-medium-gray bg-cult-black p-3 space-y-2">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-1.5 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingEntries ? (
            <div className="flex items-center gap-2 text-xs text-cult-medium-gray py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading entries...
            </div>
          ) : entries.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-cult-light-gray uppercase tracking-wider">Bin Entries</span>
                <span className="text-xs text-cult-medium-gray">
                  {entries.length} bin{entries.length !== 1 ? 's' : ''} &middot; <span className="text-cult-white font-medium">{formatWeight(totalWeight)}</span>
                </span>
              </div>
              <div className="space-y-1">
                {entries.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded bg-cult-dark-gray px-3 py-1.5">
                    <span className="text-xs text-cult-medium-gray w-5 text-right flex-shrink-0">{i + 1}.</span>
                    <span className="text-sm font-medium text-cult-white">{formatWeight(Number(entry.bin_weight_grams))}</span>
                    {entry.notes && <span className="text-xs text-cult-medium-gray truncate">{entry.notes}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-cult-medium-gray py-1">No bin entries recorded.</p>
          )}

          {canAddMissing && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-amber-950 border border-amber-700 text-amber-400 hover:bg-amber-900 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Missing Bin
            </button>
          )}

          {canAddMissing && showAddForm && (
            <div className="rounded-md border border-amber-700 bg-amber-950/30 p-3 space-y-2">
              <div className="text-xs text-amber-400 font-medium">Add Missing Bin (creates inventory)</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-cult-medium-gray mb-0.5">Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 3500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddBin(); }}
                    className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-1.5 focus:outline-none focus:border-cult-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-cult-medium-gray mb-0.5">Notes <span className="text-cult-medium-gray/60">optional</span></label>
                  <input
                    type="text"
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="e.g. Late bin"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddBin(); }}
                    className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-1.5 focus:outline-none focus:border-cult-white"
                  />
                </div>
                <button
                  onClick={handleAddBin}
                  disabled={adding || !parseFloat(weight)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-600 text-cult-black text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {adding ? 'Adding...' : 'Add & Create Inventory'}
                </button>
              </div>
              <button
                onClick={() => { setShowAddForm(false); setWeight(''); setEntryNotes(''); setError(null); }}
                className="text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
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
