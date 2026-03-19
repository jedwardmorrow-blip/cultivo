import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, Wind, Scale, Leaf, AlertTriangle, Clock, ExternalLink, Trash2, Package, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBinningSessions } from '../hooks/useBinningSessions';
import { useAuth } from '@/lib/auth';
import { formatWeight, formatDate } from '../utils';
import type { BinningSession, BinningSessionStatus, BinEntry, CreateBinningSessionInput, HarvestSession } from '../types';

type TabKey = 'pending' | 'active' | 'completed' | 'cancelled';

const TAB_LABELS: Record<TabKey, string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function yieldPct(wet: number, dry: number): string {
  if (wet <= 0) return '—';
  return `${((dry / wet) * 100).toFixed(1)}%`;
}

interface NewBinningFormProps {
  unbinnedHarvests: HarvestSession[];
  onSuccess: () => void;
  onCancel: () => void;
}

function NewBinningForm({ unbinnedHarvests, onSuccess, onCancel }: NewBinningFormProps) {
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
    <div className="rounded-lg border border-cult-medium-gray bg-cult-dark-gray p-5 space-y-4">
      <h3 className="text-sm font-semibold text-cult-white">New Binning Session</h3>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Harvest Session *</label>
          <select
            value={harvestSessionId}
            onChange={(e) => setHarvestSessionId(e.target.value)}
            className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
          >
            <option value="">Select a harvest session...</option>
            {unbinnedHarvests.map((h) => (
              <option key={h.id} value={h.id}>
                {h.plant_groups?.strains?.name ?? 'Unknown'} -- {h.batch_registry?.batch_number ?? '--'} ({formatDate(h.harvest_date)})
              </option>
            ))}
          </select>
          {unbinnedHarvests.length === 0 && (
            <p className="mt-1 text-xs text-cult-medium-gray">No completed harvest sessions awaiting binning.</p>
          )}
          {selectedHarvest && wetWeight !== null && (
            <p className="mt-1 text-xs text-cult-medium-gray">
              Wet weight: <span className="text-cult-white">{formatWeight(wetWeight)}</span>
              {selectedHarvest.adjusted_weight_grams && <span className="text-amber-400 ml-1">(adjusted)</span>}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Dry Room</label>
          {selectedHarvest ? (
            primaryDryRoomId ? (
              <div className="rounded-md bg-cult-black border border-cult-medium-gray px-3 py-2 text-sm text-cult-white">
                Assigned {dryRoomCode ? <span className="text-cult-medium-gray font-mono ml-1">({dryRoomCode})</span> : null}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-950 border border-amber-700 px-3 py-2 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                No dry room assigned to this harvest.
              </div>
            )
          ) : (
            <div className="rounded-md bg-cult-black border border-cult-medium-gray px-3 py-2 text-sm text-cult-medium-gray">
              Select a harvest first
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Bin Date *</label>
          <input
            type="date"
            value={binDate}
            onChange={(e) => setBinDate(e.target.value)}
            className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-cult-light-gray mb-1">Notes <span className="text-cult-medium-gray">optional</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes about this drying run..."
          className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white resize-none"
        />
      </div>

      {selectedHarvest && !selectedHarvest.batch_registry_id && (
        <div className="flex items-center gap-2 rounded-md bg-amber-950 border border-amber-700 px-3 py-2 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>This harvest session has no linked batch. Complete the harvest first.</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="px-4 py-2 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Start Binning Session'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-cult-medium-gray text-cult-light-gray text-sm hover:border-cult-white hover:text-cult-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface BinEntryWorkspaceProps {
  sessionId: string;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  addBinEntry: (input: { binning_session_id: string; bin_weight_grams: number; notes?: string }) => Promise<BinEntry>;
  removeBinEntry: (id: string) => Promise<void>;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
  wetWeight: number | null;
}

function BinEntryWorkspace({ sessionId, listBinEntries, addBinEntry, removeBinEntry, onComplete, onCancel, wetWeight }: BinEntryWorkspaceProps) {
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

interface CompletedBinEntriesProps {
  sessionId: string;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  canAddMissing: boolean;
  onAddBin: (sessionId: string, weight: number, notes?: string) => Promise<void>;
}

function CompletedBinEntries({ sessionId, listBinEntries, canAddMissing, onAddBin }: CompletedBinEntriesProps) {
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

interface SessionCardProps {
  session: BinningSession;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onViewBatch?: () => void;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  addBinEntry: (input: { binning_session_id: string; bin_weight_grams: number; notes?: string }) => Promise<BinEntry>;
  removeBinEntry: (id: string) => Promise<void>;
  isManager?: boolean;
  onAddBinToCompleted?: (sessionId: string, weight: number, notes?: string) => Promise<void>;
}

function SessionCard({ session, onComplete, onCancel, onViewBatch, listBinEntries, addBinEntry, removeBinEntry, isManager, onAddBinToCompleted }: SessionCardProps) {
  const strainName = session.harvest_sessions?.plant_groups?.strains?.name ?? 'Unknown Strain';
  const wetWeight = session.harvest_sessions?.adjusted_weight_grams ?? session.harvest_sessions?.wet_weight_grams ?? null;
  const batchNumber = session.batch_registry?.batch_number ?? '--';
  const dryRoomName = session.dry_rooms?.name ?? '--';
  const dryRoomCode = session.dry_rooms?.room_code ?? '';

  const harvestDate = session.harvest_sessions?.harvest_date
    ? formatDate(session.harvest_sessions.harvest_date)
    : '--';

  const statusColor: Record<BinningSessionStatus, string> = {
    active: 'text-green-400 border-green-700 bg-green-950',
    completed: 'text-sky-400 border-sky-700 bg-sky-950',
    cancelled: 'text-cult-medium-gray border-cult-medium-gray bg-cult-black',
  };

  return (
    <div className="rounded-lg border border-cult-medium-gray bg-cult-dark-gray p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-cult-white">{strainName}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColor[session.session_status]}`}>
              {session.session_status.charAt(0).toUpperCase() + session.session_status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-cult-medium-gray flex-wrap">
            <span>Batch: <span className="font-mono text-cult-light-gray">{batchNumber}</span></span>
            <span>Harvest: {harvestDate}</span>
            <span>Bin date: {formatDate(session.bin_date)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
          <div className="text-xs text-cult-medium-gray mb-0.5">Dry Room</div>
          <div className="text-sm font-medium text-cult-white">{dryRoomName}</div>
          <div className="text-xs text-cult-medium-gray font-mono">{dryRoomCode}</div>
        </div>

        {session.session_status !== 'active' && session.dry_weight_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
            <div className="text-xs text-cult-medium-gray mb-0.5">Dry Weight</div>
            <div className="text-sm font-semibold text-cult-white">{formatWeight(session.dry_weight_grams)}</div>
            <div className="text-xs text-cult-medium-gray">{session.dry_weight_grams.toLocaleString()} g</div>
          </div>
        )}

        {session.session_status !== 'active' && wetWeight !== null && session.dry_weight_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
            <div className="text-xs text-cult-medium-gray mb-0.5">Yield</div>
            <div className="text-sm font-semibold text-green-400">{yieldPct(wetWeight, session.dry_weight_grams)}</div>
            <div className="text-xs text-cult-medium-gray">of {formatWeight(wetWeight)} wet</div>
          </div>
        )}

        {session.session_status === 'completed' && session.water_loss_grams != null && session.water_loss_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
            <div className="text-xs text-cult-medium-gray mb-0.5">Water Loss</div>
            <div className="text-sm font-semibold text-amber-400">{formatWeight(session.water_loss_grams)}</div>
          </div>
        )}
      </div>

      {session.notes && (
        <p className="text-xs text-cult-medium-gray italic">{session.notes}</p>
      )}

      {session.session_status === 'active' && (
        <BinEntryWorkspace
          sessionId={session.id}
          listBinEntries={listBinEntries}
          addBinEntry={addBinEntry}
          removeBinEntry={removeBinEntry}
          onComplete={() => onComplete(session.id)}
          onCancel={() => onCancel(session.id)}
          wetWeight={wetWeight}
        />
      )}

      {session.session_status === 'completed' && (
        <CompletedBinEntries
          sessionId={session.id}
          listBinEntries={listBinEntries}
          canAddMissing={!!isManager && !!onAddBinToCompleted}
          onAddBin={onAddBinToCompleted ?? (async () => {})}
        />
      )}

      {session.session_status === 'completed' && session.completed_at && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-cult-medium-gray flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-sky-400" />
            Completed {formatDate(session.completed_at.slice(0, 10))}
          </div>
          {onViewBatch && batchNumber !== '--' && (
            <button
              onClick={onViewBatch}
              className="flex items-center gap-1 text-xs bg-green-950 border border-green-700 text-green-400 px-2 py-0.5 font-mono hover:bg-green-900 transition-colors"
            >
              {batchNumber}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface PendingHarvestRowProps {
  harvest: HarvestSession;
  onStartBinning: (harvest: HarvestSession, dryRoomId?: string) => Promise<void>;
  startingId: string | null;
  rowError: string | null;
}

function PendingHarvestRow({ harvest, onStartBinning, startingId, rowError }: PendingHarvestRowProps) {
  const strainName = harvest.plant_groups?.strains?.name ?? 'Unknown Strain';
  const batchNumber = harvest.batch_registry?.batch_number ?? '--';
  const flowerEntries = harvest.harvest_weight_entries?.filter(e => e.destination === 'flower') ?? [];
  const wetWeight = flowerEntries.reduce((s, e) => s + Number(e.weight_grams), 0) || (harvest.adjusted_weight_grams ?? harvest.wet_weight_grams);
  const primaryDryRoomCode = flowerEntries.map(e => e.dry_rooms?.room_code).find(Boolean);
  const primaryDryRoomId = flowerEntries.map(e => e.location_id).find(Boolean);
  const dryRoomLabel = primaryDryRoomCode ? `Room ${primaryDryRoomCode}` : null;
  const isStarting = startingId === harvest.id;
  const missingRequirements = !harvest.batch_registry_id || !primaryDryRoomId;

  return (
    <div className="rounded-md border border-cult-medium-gray bg-cult-dark-gray px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
            <span className="text-sm font-medium text-cult-white">{strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-cult-medium-gray flex-wrap">
            <span>Batch: <span className="font-mono text-cult-light-gray">{batchNumber}</span></span>
            <span>Harvested: {formatDate(harvest.harvest_date)}</span>
            <span>Wet: {formatWeight(wetWeight)}</span>
            {harvest.adjusted_weight_grams && <span className="text-amber-400">(adjusted)</span>}
            {dryRoomLabel && <span>Dry room: <span className="text-cult-light-gray">{dryRoomLabel}</span></span>}
          </div>
        </div>
        <button
          onClick={() => onStartBinning(harvest, primaryDryRoomId || undefined)}
          disabled={isStarting || missingRequirements}
          className="flex items-center gap-1.5 flex-shrink-0 text-xs px-3 py-1.5 rounded-md bg-cult-white text-cult-black font-medium hover:bg-cult-light-gray transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Wind className="h-3.5 w-3.5" />
              Start Binning
            </>
          )}
        </button>
      </div>
      {rowError && startingId === harvest.id && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{rowError}</span>
        </div>
      )}
      {missingRequirements && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {!harvest.batch_registry_id ? 'No batch linked.' : 'No dry room assigned.'} Complete the harvest first.
        </div>
      )}
    </div>
  );
}

interface BinningSessionsViewProps {
  onViewChange?: (view: string) => void;
}

export function BinningSessionsView({ onViewChange }: BinningSessionsViewProps = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [showNewForm, setShowNewForm] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const { isManager } = useAuth();

  const { sessions, unbinnedHarvests, loading, error, reload, createSession, completeSession, cancelSession, listBinEntries, addBinEntry, removeBinEntry, addBinToCompleted } = useBinningSessions();

  const sessionsByTab: Record<Exclude<TabKey, 'pending'>, BinningSession[]> = {
    active: sessions.filter((s) => s.session_status === 'active'),
    completed: sessions.filter((s) => s.session_status === 'completed'),
    cancelled: sessions.filter((s) => s.session_status === 'cancelled'),
  };

  const tabCounts: Record<TabKey, number> = {
    pending: unbinnedHarvests.length,
    active: sessionsByTab.active.length,
    completed: sessionsByTab.completed.length,
    cancelled: sessionsByTab.cancelled.length,
  };

  async function handleStartBinning(harvest: HarvestSession, dryRoomId?: string) {
    if (!dryRoomId || !harvest.batch_registry_id) return;
    setStartingId(harvest.id);
    setStartError(null);
    try {
      const input: CreateBinningSessionInput = {
        harvest_session_id: harvest.id,
        dry_room_id: dryRoomId,
        batch_registry_id: harvest.batch_registry_id,
        bin_date: new Date().toISOString().slice(0, 10),
      };
      await createSession(input);
      setActiveTab('active');
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : 'Failed to start binning session');
    } finally {
      setStartingId(null);
    }
  }

  function handleFormSuccess() {
    setShowNewForm(false);
    setActiveTab('active');
    reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cult-white">Drying</h2>
          <p className="text-sm text-cult-medium-gray mt-0.5">Record dry weights after the drying process. Add bin entries, then complete to create inventory.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={reload} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {showNewForm && (
        <NewBinningForm
          unbinnedHarvests={unbinnedHarvests}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div className="flex border-b border-cult-medium-gray">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-cult-white text-cult-white'
                : 'border-transparent text-cult-medium-gray hover:text-cult-white'
            }`}
          >
            {TAB_LABELS[tab]}
            {tabCounts[tab] > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? 'bg-cult-white text-cult-black' : 'bg-cult-dark-gray text-cult-light-gray'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-cult-medium-gray py-10 text-center">Loading sessions...</div>
      ) : (
        <>
          {activeTab === 'pending' && (
            <div className="space-y-2">
              {unbinnedHarvests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-cult-medium-gray p-8 text-center">
                  <Scale className="h-8 w-8 text-cult-medium-gray mx-auto mb-3" />
                  <p className="text-sm font-medium text-cult-white">No harvests awaiting binning</p>
                  <p className="text-xs text-cult-medium-gray mt-1">Completed harvest sessions will appear here once they have no binning record.</p>
                </div>
              ) : (
                unbinnedHarvests.map((harvest) => (
                  <PendingHarvestRow
                    key={harvest.id}
                    harvest={harvest}
                    onStartBinning={handleStartBinning}
                    startingId={startingId}
                    rowError={startError}
                  />
                ))
              )}
            </div>
          )}

          {activeTab !== 'pending' && (
            <div className="space-y-3">
              {sessionsByTab[activeTab].length === 0 ? (
                <div className="rounded-lg border border-dashed border-cult-medium-gray p-8 text-center">
                  <Clock className="h-8 w-8 text-cult-medium-gray mx-auto mb-3" />
                  <p className="text-sm font-medium text-cult-white">
                    No {TAB_LABELS[activeTab].toLowerCase()} sessions
                  </p>
                </div>
              ) : (
                sessionsByTab[activeTab].map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onComplete={async (id) => { await completeSession(id); }}
                    onCancel={async (id) => { await cancelSession(id); }}
                    onViewBatch={onViewChange ? () => onViewChange('batches') : undefined}
                    listBinEntries={listBinEntries}
                    addBinEntry={addBinEntry}
                    removeBinEntry={removeBinEntry}
                    isManager={isManager}
                    onAddBinToCompleted={async (sessionId, weight, notes) => {
                      await addBinToCompleted(sessionId, weight, notes);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
