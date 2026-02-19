import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Scale, ChevronRight, Leaf, AlertTriangle, ExternalLink } from 'lucide-react';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { isValidStrainAbbreviation, formatWeight, formatDate } from '../utils';
import type { HarvestSession, CreateHarvestSessionInput } from '../types';

const ERR_MISSING_ABBREVIATION = 'strain abbreviation';
const ERR_WRONG_STAGE = 'flower stage';

type TabKey = 'active' | 'completed' | 'cancelled';

const TAB_LABELS: Record<TabKey, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface NewHarvestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function NewHarvestForm({ onSuccess, onCancel }: NewHarvestFormProps) {
  const { groups, loading: groupsLoading } = usePlantGroups({ stage: 'flower' });
  const { createSession } = useHarvestSessions();

  const [plantGroupId, setPlantGroupId] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [wetWeight, setWetWeight] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === plantGroupId);
  const hasAbbreviation = isValidStrainAbbreviation(selectedGroup?.strains?.abbreviation);

  const canSave =
    plantGroupId &&
    harvestDate &&
    parseFloat(wetWeight) > 0 &&
    parseInt(plantCount) > 0 &&
    hasAbbreviation &&
    !saving;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreateHarvestSessionInput = {
        plant_group_id: plantGroupId,
        harvest_date: harvestDate,
        wet_weight_grams: parseFloat(wetWeight),
        plant_count_harvested: parseInt(plantCount),
        notes: notes.trim() || undefined,
      };
      await createSession(input);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes(ERR_MISSING_ABBREVIATION)) {
        setError('Strain is missing a 3-letter abbreviation. Update it in Products > Strains first.');
      } else if (msg.includes(ERR_WRONG_STAGE)) {
        setError('Only flower-stage plant groups can be harvested.');
      } else {
        setError(msg || 'Failed to create harvest session.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray p-6 mb-6">
      <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-4">Start Harvest Session</h3>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">
            Plant Group (Flower Stage) *
          </label>
          {groupsLoading ? (
            <div className="text-cult-medium-gray text-sm">Loading flower groups...</div>
          ) : groups.length === 0 ? (
            <div className="text-amber-400 text-sm">No flower-stage plant groups found.</div>
          ) : (
            <select
              value={plantGroupId}
              onChange={(e) => setPlantGroupId(e.target.value)}
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
            >
              <option value="">— Select plant group —</option>
              {groups.map((g) => {
                const validAbbrev = isValidStrainAbbreviation(g.strains?.abbreviation);
                return (
                  <option key={g.id} value={g.id} disabled={!validAbbrev}>
                    {g.group_number} — {g.strains?.name ?? 'Unknown Strain'} — {g.plant_count} plants
                    {!validAbbrev ? ' (no abbreviation)' : ''}
                  </option>
                );
              })}
            </select>
          )}
          {selectedGroup && !hasAbbreviation && (
            <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              This strain has no abbreviation. Add one in Products &gt; Strains before harvesting.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Harvest Date *</label>
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Wet Weight (grams) *</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={wetWeight}
            onChange={(e) => setWetWeight(e.target.value)}
            placeholder="e.g. 5400"
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Plants Harvested *</label>
          <input
            type="number"
            min="1"
            step="1"
            value={plantCount}
            onChange={(e) => setPlantCount(e.target.value)}
            placeholder={selectedGroup ? String(selectedGroup.plant_count) : 'e.g. 24'}
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="flex items-center gap-2 bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Leaf className="w-4 h-4" />
          {saving ? 'Saving...' : 'Start Harvest'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface AdjustWeightModalProps {
  session: HarvestSession;
  onSuccess: () => void;
  onCancel: () => void;
  onAdjust: (id: string, weight: number, reason: string) => Promise<void>;
}

function AdjustWeightModal({ session, onSuccess, onCancel, onAdjust }: AdjustWeightModalProps) {
  const [adjustedWeight, setAdjustedWeight] = useState(
    String(session.adjusted_weight_grams ?? session.wet_weight_grams)
  );
  const [reason, setReason] = useState(session.adjustment_reason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const val = parseFloat(adjustedWeight);
    if (!val || val <= 0 || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onAdjust(session.id, val, reason.trim());
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to adjust weight.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-1">Adjust Harvest Weight</h3>
        <p className="text-cult-light-gray text-sm mb-4">
          Original wet weight: <span className="text-cult-white">{formatWeight(session.wet_weight_grams)}</span>
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Adjusted Weight (grams) *</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={adjustedWeight}
              onChange={(e) => setAdjustedWeight(e.target.value)}
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>
          <div>
            <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Moisture loss correction"
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={!parseFloat(adjustedWeight) || !reason.trim() || saving}
            className="flex items-center gap-2 bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scale className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Adjustment'}
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

interface SessionRowProps {
  session: HarvestSession;
  onComplete: (s: HarvestSession) => void;
  onCancel: (s: HarvestSession) => void;
  onAdjust: (s: HarvestSession) => void;
  onViewBatch?: () => void;
}

function SessionRow({ session, onComplete, onCancel, onAdjust, onViewBatch }: SessionRowProps) {
  const strainName = session.plant_groups?.strains?.name ?? 'Unknown Strain';
  const groupNumber = session.plant_groups?.group_number ?? '—';
  const batchNumber = session.batch_registry?.batch_number;
  const displayWeight = session.adjusted_weight_grams ?? session.wet_weight_grams;
  const isAdjusted = session.adjusted_weight_grams !== null && session.adjusted_weight_grams !== undefined;

  return (
    <div className="border border-cult-medium-gray bg-cult-near-black hover:border-cult-lighter-gray transition-all">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-cult-white font-mono text-sm font-semibold">{groupNumber}</span>
              <ChevronRight className="w-3 h-3 text-cult-medium-gray flex-shrink-0" />
              <span className="text-cult-white text-sm truncate">{strainName}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-cult-light-gray text-xs">{formatDate(session.harvest_date)}</span>
              <span className="text-cult-medium-gray text-xs">·</span>
              <span className="text-cult-light-gray text-xs">
                {formatWeight(displayWeight)}
                {isAdjusted && <span className="text-amber-400 ml-1">(adjusted)</span>}
              </span>
              <span className="text-cult-medium-gray text-xs">·</span>
              <span className="text-cult-light-gray text-xs">{session.plant_count_harvested} plants</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {batchNumber && (
            <button
              onClick={onViewBatch}
              title="View batch in Batches module"
              className="flex items-center gap-1 text-xs bg-green-950 border border-green-700 text-green-400 px-2 py-0.5 font-mono hover:bg-green-900 transition-colors"
            >
              {batchNumber}
              {onViewBatch && <ExternalLink className="w-3 h-3 opacity-70" />}
            </button>
          )}

          {session.session_status === 'active' && (
            <>
              <button
                onClick={() => onComplete(session)}
                className="flex items-center gap-1.5 text-xs border border-green-700 text-green-400 px-3 py-1.5 hover:bg-green-950 transition-all uppercase tracking-wider font-semibold"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Complete
              </button>
              <button
                onClick={() => onCancel(session)}
                className="flex items-center gap-1.5 text-xs border border-red-700 text-red-400 px-3 py-1.5 hover:bg-red-950 transition-all uppercase tracking-wider font-semibold"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            </>
          )}

          {session.session_status === 'completed' && (
            <button
              onClick={() => onAdjust(session)}
              className="flex items-center gap-1.5 text-xs border border-cult-medium-gray text-cult-light-gray px-3 py-1.5 hover:border-cult-lighter-gray hover:text-cult-white transition-all uppercase tracking-wider font-semibold"
            >
              <Scale className="w-3.5 h-3.5" />
              Adjust Weight
            </button>
          )}

          {session.session_status === 'cancelled' && (
            <span className="text-xs text-red-400 uppercase tracking-wider">Cancelled</span>
          )}
        </div>
      </div>

      {session.notes && (
        <div className="px-4 pb-3">
          <p className="text-cult-medium-gray text-xs italic">{session.notes}</p>
        </div>
      )}
    </div>
  );
}

interface ConfirmActionModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmActionModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading }: ConfirmActionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-cult-light-gray text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40 ${confirmClass}`}
          >
            {loading ? 'Processing...' : confirmLabel}
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

interface HarvestSessionsListProps {
  onViewChange?: (view: string) => void;
}

export function HarvestSessionsList({ onViewChange }: HarvestSessionsListProps = {}) {
  const { sessions, loading, error, reload, completeSession, cancelSession, adjustWeight } = useHarvestSessions();

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showNewForm, setShowNewForm] = useState(false);
  const [completingSession, setCompletingSession] = useState<HarvestSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<HarvestSession | null>(null);
  const [adjustingSession, setAdjustingSession] = useState<HarvestSession | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeSessions = sessions.filter((s) => s.session_status === 'active');
  const completedSessions = sessions.filter((s) => s.session_status === 'completed');
  const cancelledSessions = sessions.filter((s) => s.session_status === 'cancelled');

  const tabSessions: Record<TabKey, HarvestSession[]> = {
    active: activeSessions,
    completed: completedSessions,
    cancelled: cancelledSessions,
  };

  async function handleComplete() {
    if (!completingSession) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await completeSession(completingSession.id);
      setCompletingSession(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete session.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancellingSession) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelSession(cancellingSession.id);
      setCancellingSession(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel session.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjustWeight(id: string, weight: number, reason: string) {
    await adjustWeight(id, weight, reason);
  }

  if (loading) {
    return <div className="p-6 text-cult-light-gray">Loading harvest sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Harvest Sessions</h1>
          <p className="text-cult-light-gray mt-2">Record harvests and create batches</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-all shadow-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Start Harvest
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {showNewForm && (
        <NewHarvestForm
          onSuccess={() => { setShowNewForm(false); reload(); }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div className="flex gap-0 border-b border-cult-medium-gray">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-cult-white text-cult-white'
                : 'border-transparent text-cult-medium-gray hover:text-cult-light-gray'
            }`}
          >
            {TAB_LABELS[tab]}
            <span className="ml-2 text-xs opacity-60">({tabSessions[tab].length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tabSessions[activeTab].length === 0 ? (
          <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
            <p className="text-cult-medium-gray text-sm uppercase tracking-wider">
              No {TAB_LABELS[activeTab].toLowerCase()} harvest sessions
            </p>
          </div>
        ) : (
          tabSessions[activeTab].map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onComplete={setCompletingSession}
              onCancel={setCancellingSession}
              onAdjust={setAdjustingSession}
              onViewBatch={onViewChange ? () => onViewChange('batches') : undefined}
            />
          ))
        )}
      </div>

      {completingSession && (
        <>
          {actionError && (
            <div className="fixed bottom-4 right-4 z-50 bg-red-950 border border-red-700 text-red-300 text-sm p-3 max-w-sm">
              {actionError}
            </div>
          )}
          <ConfirmActionModal
            title="Complete Harvest Session"
            message="Mark this harvest as complete? A batch registry entry will be created automatically for the strain. This action cannot be undone."
            confirmLabel="Complete Harvest"
            confirmClass="bg-green-700 text-white hover:bg-green-600"
            onConfirm={handleComplete}
            onCancel={() => { setCompletingSession(null); setActionError(null); }}
            loading={actionLoading}
          />
        </>
      )}

      {cancellingSession && (
        <>
          {actionError && (
            <div className="fixed bottom-4 right-4 z-50 bg-red-950 border border-red-700 text-red-300 text-sm p-3 max-w-sm">
              {actionError}
            </div>
          )}
          <ConfirmActionModal
            title="Cancel Harvest Session"
            message="Cancel this harvest session? This cannot be undone. The plant group will remain in its current state."
            confirmLabel="Cancel Harvest"
            confirmClass="bg-red-700 text-white hover:bg-red-600"
            onConfirm={handleCancel}
            onCancel={() => { setCancellingSession(null); setActionError(null); }}
            loading={actionLoading}
          />
        </>
      )}

      {adjustingSession && (
        <AdjustWeightModal
          session={adjustingSession}
          onSuccess={() => { setAdjustingSession(null); reload(); }}
          onCancel={() => setAdjustingSession(null)}
          onAdjust={handleAdjustWeight}
        />
      )}
    </div>
  );
}
