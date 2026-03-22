import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Scale, ChevronRight, AlertTriangle, ExternalLink, Wind, Home, BarChart3, Snowflake, Leaf } from 'lucide-react';
import { Button } from '@/shared/components';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { formatWeight, formatDate } from '../utils';
import { HarvestWorkflow } from './harvest';
import { HarvestMetricsDashboard } from './harvest-metrics';
import type { HarvestSession } from '../types';

type TabKey = 'active' | 'completed' | 'cancelled';

const TAB_LABELS: Record<TabKey, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

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
          <Button
            onClick={handleSave}
            disabled={!parseFloat(adjustedWeight) || !reason.trim() || saving}
            size="sm"
            icon={<Scale className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : 'Save Adjustment'}
          </Button>
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
  const batchNumber = session.batch_registry?.batch_number;
  const displayWeight = session.adjusted_weight_grams ?? session.wet_weight_grams;
  const isAdjusted = session.adjusted_weight_grams !== null && session.adjusted_weight_grams !== undefined;
  const growRoomCode = session.grow_rooms?.room_code;
  
  const hasFreshFrozen = session.harvest_weight_entries?.some(e => e.destination === 'fresh_frozen');
  const hasFlower = session.harvest_weight_entries?.some(e => e.destination === 'flower');
  const uniqueDryRooms = Array.from(new Set(
    (session.harvest_weight_entries?.map(e => e.dry_rooms?.room_code).filter(Boolean) as string[])
  )).sort();

  return (
    <div className="border border-cult-medium-gray bg-cult-near-black hover:border-cult-lighter-gray transition-all">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-cult-white font-mono text-sm font-semibold">{batchNumber ?? '—'}</span>
              <ChevronRight className="w-3 h-3 text-cult-medium-gray flex-shrink-0" />
              <span className="text-cult-white text-sm truncate">{strainName}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-cult-light-gray text-xs">{formatDate(session.harvest_date)}</span>
              <span className="text-cult-medium-gray text-xs">·</span>
              <span className="text-cult-light-gray text-xs">
                {formatWeight(displayWeight)}
                {isAdjusted && <span className="text-amber-400 ml-1">(adjusted)</span>}
              </span>
              {session.waste_grams != null && (
                <>
                  <span className="text-cult-medium-gray text-xs">·</span>
                  <span className="text-cult-medium-gray text-xs">
                    waste: {formatWeight(session.waste_grams)}
                    {displayWeight > 0 && (
                      <span className="ml-1 opacity-70">({Math.round((session.waste_grams / displayWeight) * 100)}%)</span>
                    )}
                  </span>
                </>
              )}
              <span className="text-cult-medium-gray text-xs">·</span>
              <span className="text-cult-light-gray text-xs">{session.plant_count_harvested} plants</span>

              {growRoomCode && (
                <span className="flex items-center gap-1 text-[10px] bg-rose-950 border border-rose-800 text-rose-400 px-1.5 py-0.5 font-mono">
                  <Home className="w-2.5 h-2.5" />
                  {growRoomCode}
                </span>
              )}
              {uniqueDryRooms.map(room => (
                <span key={room} className="flex items-center gap-1 text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 font-mono">
                  <Wind className="w-2.5 h-2.5" />
                  {room}
                </span>
              ))}
              {hasFreshFrozen && (
                <span className="flex items-center gap-1 text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                  <Snowflake className="w-2.5 h-2.5" />
                  {hasFlower ? 'Split: FF' : 'Fresh Frozen'}
                </span>
              )}
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

// Group active + completed sessions by room for the Active tab
interface RoomHarvestGroup {
  roomId: string;
  roomCode: string;
  roomName: string;
  activeSessions: HarvestSession[];
  completedSessions: HarvestSession[];
  totalWeight: number;
  totalPlants: number;
  batchCount: number;
  lastActivity: string;
}

function groupSessionsByRoom(sessions: HarvestSession[]): RoomHarvestGroup[] {
  const map = new Map<string, { active: HarvestSession[]; completed: HarvestSession[] }>();
  for (const s of sessions) {
    if (s.session_status !== 'active' && s.session_status !== 'completed') continue;
    const roomId = s.grow_room_id;
    if (!roomId) continue;
    if (!map.has(roomId)) map.set(roomId, { active: [], completed: [] });
    const group = map.get(roomId)!;
    if (s.session_status === 'active') group.active.push(s);
    else group.completed.push(s);
  }

  // Only include rooms that have at least one active session OR recent completed sessions
  // (rooms with only completed sessions and no active are "done")
  return Array.from(map.entries())
    .filter(([, g]) => g.active.length > 0 || g.completed.length > 0)
    .map(([roomId, g]) => {
      const allSessions = [...g.active, ...g.completed];
      const firstSession = allSessions[0];
      const uniqueBatches = new Set(allSessions.map((s) => s.batch_registry_id).filter(Boolean));
      const totalWeight = g.completed.reduce((sum, s) => sum + (s.adjusted_weight_grams ?? s.wet_weight_grams), 0);
      const totalPlants = g.completed.reduce((sum, s) => sum + s.plant_count_harvested, 0);
      const lastActivity = allSessions.reduce((latest, s) => {
        const d = s.completed_at ?? s.created_at;
        return d > latest ? d : latest;
      }, '');

      return {
        roomId,
        roomCode: firstSession.grow_rooms?.room_code ?? '—',
        roomName: firstSession.grow_rooms?.name ?? '',
        activeSessions: g.active,
        completedSessions: g.completed,
        totalWeight,
        totalPlants,
        batchCount: uniqueBatches.size,
        lastActivity,
      };
    })
    .sort((a, b) => a.roomCode.localeCompare(b.roomCode));
}

export function HarvestSessionsList() {
  const navigate = useNavigate();
  const { sessions, loading, error, reload, completeSession, cancelSession, adjustWeight } = useHarvestSessions();

  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [resumeRoomId, setResumeRoomId] = useState<string | undefined>();
  const [showMetrics, setShowMetrics] = useState(false);
  const [completingSession, setCompletingSession] = useState<HarvestSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<HarvestSession | null>(null);
  const [adjustingSession, setAdjustingSession] = useState<HarvestSession | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>('');

  const activeSessions = sessions.filter((s) => s.session_status === 'active');
  const completedSessions = sessions.filter((s) => s.session_status === 'completed');
  const cancelledSessions = sessions.filter((s) => s.session_status === 'cancelled');

  // Room-grouped view for Active tab
  // Show rooms with active sessions OR completed-but-not-finalized sessions
  // (rooms stay "active" until the whole room is finalized via Review & Finalize)
  const roomGroups = groupSessionsByRoom(sessions);
  const activeRoomGroups = roomGroups;

  const tabSessions: Record<TabKey, HarvestSession[]> = {
    active: activeSessions,
    completed: completedSessions,
    cancelled: cancelledSessions,
  };

  const uniqueRoomCodes = Array.from(
    new Set(
      sessions
        .map((s) => s.grow_rooms?.room_code)
        .filter((code): code is string => !!code)
    )
  ).sort();

  const filteredSessions = roomFilter
    ? tabSessions[activeTab].filter((s) => s.grow_rooms?.room_code === roomFilter)
    : tabSessions[activeTab];

  function handleResumeRoom(roomId: string) {
    setResumeRoomId(roomId);
    setShowWorkflow(true);
  }

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
    return <div className="p-6 text-cult-light-gray">Loading harvests...</div>;
  }

  if (showWorkflow) {
    return (
      <HarvestWorkflow
        onComplete={() => { setShowWorkflow(false); setResumeRoomId(undefined); reload(); }}
        onCancel={() => { setShowWorkflow(false); setResumeRoomId(undefined); }}
        initialRoomId={resumeRoomId}
      />
    );
  }

  if (showMetrics) {
    return <HarvestMetricsDashboard onBack={() => setShowMetrics(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Harvests</h1>
          <p className="text-cult-light-gray mt-2">Record harvests by room and create batches</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowMetrics(true)}
            variant="secondary"
            size="sm"
            icon={<BarChart3 className="w-4 h-4" />}
          >
            Metrics
          </Button>
          <Button
            onClick={() => setShowWorkflow(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Start Harvest
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
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
              <span className="ml-2 text-xs opacity-60">({tab === 'active' ? activeRoomGroups.length : tabSessions[tab].length})</span>
            </button>
          ))}
        </div>

        {uniqueRoomCodes.length > 1 && (
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-1.5 text-xs focus:outline-none focus:border-cult-lighter-gray uppercase tracking-wider"
          >
            <option value="">All Rooms</option>
            {uniqueRoomCodes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        {activeTab === 'active' ? (
          // Room-level grouping for active harvests
          activeRoomGroups.length === 0 ? (
            <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
              <p className="text-cult-medium-gray text-sm uppercase tracking-wider">
                No active harvests
              </p>
              <p className="text-cult-medium-gray text-xs mt-2">
                Click <span className="text-cult-light-gray">+ Start Harvest</span> to begin harvesting a room.
              </p>
            </div>
          ) : (
            activeRoomGroups.map((roomGroup) => (
              <button
                key={roomGroup.roomId}
                onClick={() => handleResumeRoom(roomGroup.roomId)}
                className="w-full text-left border border-cult-medium-gray bg-cult-near-black hover:border-cult-lighter-gray transition-all group"
              >
                <div className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-950 border border-green-800 flex-shrink-0">
                      <Leaf className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-cult-white font-mono text-sm font-semibold">{roomGroup.roomCode}</span>
                        <span className="text-cult-medium-gray text-sm">{roomGroup.roomName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-cult-light-gray text-xs">{roomGroup.batchCount} batch{roomGroup.batchCount !== 1 ? 'es' : ''}</span>
                        {roomGroup.totalPlants > 0 && (
                          <>
                            <span className="text-cult-medium-gray text-xs">·</span>
                            <span className="text-cult-light-gray text-xs">{roomGroup.totalPlants} plants harvested</span>
                          </>
                        )}
                        {roomGroup.totalWeight > 0 && (
                          <>
                            <span className="text-cult-medium-gray text-xs">·</span>
                            <span className="text-cult-light-gray text-xs">{formatWeight(roomGroup.totalWeight)} recorded</span>
                          </>
                        )}
                        {roomGroup.completedSessions.length > 0 && (
                          <>
                            <span className="text-cult-medium-gray text-xs">·</span>
                            <span className="text-green-400 text-xs">{roomGroup.completedSessions.length} batch{roomGroup.completedSessions.length !== 1 ? 'es' : ''} done</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-cult-medium-gray uppercase tracking-wider group-hover:text-cult-light-gray transition-colors">
                      {roomGroup.activeSessions.length > 0 ? 'Continue' : 'Resume'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>
            ))
          )
        ) : (
          // Per-session rows for Completed / Cancelled tabs
          filteredSessions.length === 0 ? (
            <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
              <p className="text-cult-medium-gray text-sm uppercase tracking-wider">
                No {TAB_LABELS[activeTab].toLowerCase()} harvests
                {roomFilter && ` in ${roomFilter}`}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onComplete={setCompletingSession}
                onCancel={setCancellingSession}
                onAdjust={setAdjustingSession}
                onViewBatch={() => navigate('/batches')}
              />
            ))
          )
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
            title="Complete Harvest"
            message="Mark this harvest as complete? A batch registry entry will be created automatically for the strain. This action cannot be undone."
            confirmLabel="Complete"
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
            title="Cancel Harvest"
            message="Cancel this harvest? This cannot be undone. The plant group will remain in its current state."
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
