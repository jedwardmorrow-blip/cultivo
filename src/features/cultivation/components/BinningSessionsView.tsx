import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Wind, Scale, Leaf, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useBinningSessions } from '../hooks/useBinningSessions';
import { useDryRooms } from '../hooks/useDryRooms';
import { formatWeight, formatDate } from '../utils';
import type { BinningSession, BinningSessionStatus, CreateBinningSessionInput, HarvestSession } from '../types';

type TabKey = 'pending' | 'active' | 'completed' | 'cancelled';

const TAB_LABELS: Record<TabKey, string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function yieldPct(wet: number, dry: number): string {
  return `${((dry / wet) * 100).toFixed(1)}%`;
}

interface NewBinningFormProps {
  unbinnedHarvests: HarvestSession[];
  onSuccess: () => void;
  onCancel: () => void;
}

function NewBinningForm({ unbinnedHarvests, onSuccess, onCancel }: NewBinningFormProps) {
  const { activeRooms, loading: roomsLoading } = useDryRooms();
  const { createSession } = useBinningSessions();

  const [harvestSessionId, setHarvestSessionId] = useState('');
  const [dryRoomId, setDryRoomId] = useState('');
  const [dryWeight, setDryWeight] = useState('');
  const [binDate, setBinDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHarvest = unbinnedHarvests.find((h) => h.id === harvestSessionId);
  const wetWeight = selectedHarvest?.adjusted_weight_grams ?? selectedHarvest?.wet_weight_grams ?? null;

  const canSave =
    harvestSessionId &&
    dryRoomId &&
    parseFloat(dryWeight) > 0 &&
    binDate &&
    !saving;

  async function handleSubmit() {
    if (!canSave || !selectedHarvest?.batch_registry_id) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreateBinningSessionInput = {
        harvest_session_id: harvestSessionId,
        dry_room_id: dryRoomId,
        batch_registry_id: selectedHarvest.batch_registry_id,
        dry_weight_grams: parseFloat(dryWeight),
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

  return (
    <div className="rounded-lg border border-cult-medium-gray bg-cult-dark-gray p-5 space-y-4">
      <h3 className="text-sm font-semibold text-cult-white">New Binning Session</h3>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Harvest Session *</label>
          <select
            value={harvestSessionId}
            onChange={(e) => setHarvestSessionId(e.target.value)}
            className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
          >
            <option value="">Select a harvest session…</option>
            {unbinnedHarvests.map((h) => (
              <option key={h.id} value={h.id}>
                {h.plant_groups?.strains?.name ?? 'Unknown'} — {h.batch_registry?.batch_number ?? '—'} ({formatDate(h.harvest_date)})
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
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Dry Room *</label>
          {roomsLoading ? (
            <div className="text-xs text-cult-medium-gray py-2">Loading…</div>
          ) : (
            <select
              value={dryRoomId}
              onChange={(e) => setDryRoomId(e.target.value)}
              className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
            >
              <option value="">Select a dry room…</option>
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.room_code})</option>
              ))}
            </select>
          )}
          {activeRooms.length === 0 && !roomsLoading && (
            <p className="mt-1 text-xs text-amber-400">No active dry rooms — add one in Settings first.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Dry Weight (grams) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={dryWeight}
            onChange={(e) => setDryWeight(e.target.value)}
            placeholder="e.g. 12500"
            className="w-full rounded-md bg-cult-black border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
          />
          {wetWeight !== null && parseFloat(dryWeight) > 0 && (
            <p className="mt-1 text-xs text-cult-medium-gray">
              Yield: <span className="text-green-400">{yieldPct(wetWeight, parseFloat(dryWeight))}</span>
            </p>
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
          placeholder="Optional notes about this drying run…"
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
          disabled={!canSave || !selectedHarvest?.batch_registry_id}
          className="px-4 py-2 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Start Binning Session'}
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

interface SessionCardProps {
  session: BinningSession;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onViewBatch?: () => void;
}

function SessionCard({ session, onComplete, onCancel, onViewBatch }: SessionCardProps) {
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel' | null>(null);

  const strainName = session.harvest_sessions?.plant_groups?.strains?.name ?? 'Unknown Strain';
  const wetWeight = session.harvest_sessions?.adjusted_weight_grams ?? session.harvest_sessions?.wet_weight_grams ?? null;
  const batchNumber = session.batch_registry?.batch_number ?? '—';
  const dryRoomName = session.dry_rooms?.name ?? '—';
  const dryRoomCode = session.dry_rooms?.room_code ?? '';

  const harvestDate = session.harvest_sessions?.harvest_date
    ? formatDate(session.harvest_sessions.harvest_date)
    : '—';

  async function handleAction(action: 'complete' | 'cancel') {
    setActing(true);
    try {
      if (action === 'complete') await onComplete(session.id);
      else await onCancel(session.id);
    } finally {
      setActing(false);
      setConfirmAction(null);
    }
  }

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

        <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
          <div className="text-xs text-cult-medium-gray mb-0.5">Dry Weight</div>
          <div className="text-sm font-semibold text-cult-white">{formatWeight(session.dry_weight_grams)}</div>
          <div className="text-xs text-cult-medium-gray">{session.dry_weight_grams.toLocaleString()} g</div>
        </div>

        {wetWeight !== null && (
          <div className="rounded-md bg-cult-black border border-cult-dark-gray px-3 py-2">
            <div className="text-xs text-cult-medium-gray mb-0.5">Yield</div>
            <div className="text-sm font-semibold text-green-400">{yieldPct(wetWeight, session.dry_weight_grams)}</div>
            <div className="text-xs text-cult-medium-gray">of {formatWeight(wetWeight)} wet</div>
          </div>
        )}
      </div>

      {session.notes && (
        <p className="text-xs text-cult-medium-gray italic">{session.notes}</p>
      )}

      {session.session_status === 'active' && (
        <div className="flex gap-2 pt-1">
          {confirmAction ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-cult-light-gray">
                {confirmAction === 'complete' ? 'Mark as completed?' : 'Cancel this session?'}
              </span>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={acting}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                  confirmAction === 'complete'
                    ? 'bg-green-900 text-green-300 hover:bg-green-800'
                    : 'bg-red-900 text-red-300 hover:bg-red-800'
                }`}
              >
                {acting ? 'Saving…' : 'Confirm'}
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
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-950 border border-green-700 text-green-400 hover:bg-green-900 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Complete
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
      )}

      {session.session_status === 'completed' && session.completed_at && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-cult-medium-gray flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-sky-400" />
            Completed {formatDate(session.completed_at.slice(0, 10))}
          </div>
          {onViewBatch && batchNumber !== '—' && (
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
  onStartBinning: (harvest: HarvestSession) => void;
}

function PendingHarvestRow({ harvest, onStartBinning }: PendingHarvestRowProps) {
  const strainName = harvest.plant_groups?.strains?.name ?? 'Unknown Strain';
  const batchNumber = harvest.batch_registry?.batch_number ?? '—';
  const wetWeight = harvest.adjusted_weight_grams ?? harvest.wet_weight_grams;

  return (
    <div className="flex items-center justify-between rounded-md border border-cult-medium-gray bg-cult-dark-gray px-4 py-3 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Leaf className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium text-cult-white">{strainName}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-cult-medium-gray">
          <span>Batch: <span className="font-mono text-cult-light-gray">{batchNumber}</span></span>
          <span>Harvested: {formatDate(harvest.harvest_date)}</span>
          <span>Wet: {formatWeight(wetWeight)}</span>
          {harvest.adjusted_weight_grams && <span className="text-amber-400">(adjusted)</span>}
        </div>
      </div>
      <button
        onClick={() => onStartBinning(harvest)}
        className="flex items-center gap-1.5 flex-shrink-0 text-xs px-3 py-1.5 rounded-md bg-cult-white text-cult-black font-medium hover:bg-cult-light-gray transition-colors"
      >
        <Wind className="h-3.5 w-3.5" />
        Start Binning
      </button>
    </div>
  );
}

interface BinningSessionsViewProps {
  onViewChange?: (view: string) => void;
}

export function BinningSessionsView({ onViewChange }: BinningSessionsViewProps = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [showNewForm, setShowNewForm] = useState(false);
  const [preselectedHarvest, setPreselectedHarvest] = useState<HarvestSession | null>(null);

  const { sessions, unbinnedHarvests, loading, error, reload, completeSession, cancelSession } = useBinningSessions();

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

  function handleStartBinning(harvest: HarvestSession) {
    setPreselectedHarvest(harvest);
    setShowNewForm(true);
    setActiveTab('active');
  }

  function handleFormSuccess() {
    setShowNewForm(false);
    setPreselectedHarvest(null);
    setActiveTab('active');
    reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cult-white">Binning Sessions</h2>
          <p className="text-sm text-cult-medium-gray mt-0.5">Record dry weights after the drying process.</p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setPreselectedHarvest(null); }}
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
          unbinnedHarvests={preselectedHarvest ? [preselectedHarvest, ...unbinnedHarvests.filter((h) => h.id !== preselectedHarvest.id)] : unbinnedHarvests}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowNewForm(false); setPreselectedHarvest(null); }}
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
        <div className="text-sm text-cult-medium-gray py-10 text-center">Loading sessions…</div>
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
                    onComplete={completeSession}
                    onCancel={cancelSession}
                    onViewBatch={onViewChange ? () => onViewChange('batches') : undefined}
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
