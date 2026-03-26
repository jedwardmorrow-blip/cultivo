import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Leaf, Plus, Trash2, Scale, AlertTriangle, CheckCircle, ChevronRight, Minus, Snowflake, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/shared/components';
import { supabase } from '@/lib/supabase';
import { useGrowRooms } from '../../hooks/useGrowRooms';
import { usePlantGroups } from '../../hooks/usePlantGroups';
import { useHarvestSessions } from '../../hooks/useHarvestSessions';
import { useDryRooms } from '../../hooks/useDryRooms';
import { useHarvestWeightEntries } from '../../hooks/useHarvestWeightEntries';
import { cultivationService } from '../../services';
import { isValidStrainAbbreviation } from '../../utils';
import { formatWeight } from '../../utils';
import { HarvestRoomSelect } from './HarvestRoomSelect';
import { HarvestReviewFinalize } from './HarvestReviewFinalize';
import type { GrowRoom, PlantGroup, HarvestSession, HarvestType } from '../../types';

type Step = 'select-room' | 'record-weights' | 'review';

export interface BatchGroup {
  batchRegistryId: string;
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string | null;
  groups: PlantGroup[];
  totalPlants: number;
  /** First group used as representative for session creation */
  representativeGroupId: string;
}

function groupByBatch(groups: PlantGroup[]): BatchGroup[] {
  const map = new Map<string, PlantGroup[]>();
  for (const g of groups) {
    const key = g.batch_registry_id ?? g.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return Array.from(map.entries()).map(([batchRegistryId, batchGroups]) => {
    const first = batchGroups[0];
    return {
      batchRegistryId,
      batchNumber: first.batch_registry?.batch_number ?? first.name ?? 'Unknown',
      strainName: first.strains?.name ?? 'Unknown Strain',
      strainAbbreviation: first.strains?.abbreviation ?? null,
      groups: batchGroups,
      totalPlants: batchGroups.reduce((sum, g) => sum + g.plant_count, 0),
      representativeGroupId: first.id,
    };
  });
}

interface HarvestWorkflowProps {
  onComplete: () => void;
  onCancel: () => void;
  /** Pre-select a room (for resuming an active room harvest) */
  initialRoomId?: string;
}

export function HarvestWorkflow({ onComplete, onCancel, initialRoomId }: HarvestWorkflowProps) {
  const { rooms } = useGrowRooms();
  const { groups } = usePlantGroups({ stage: 'flower' });
  const { createSession, finalizeHarvest, reload: reloadSessions } = useHarvestSessions();
  const { rooms: dryRooms } = useDryRooms();

  const [step, setStep] = useState<Step>('select-room');
  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  // Keyed by batchRegistryId → one session per batch
  const [batchSessionMap, setBatchSessionMap] = useState<Record<string, HarvestSession>>({});
  const [wasteMap, setWasteMap] = useState<Record<string, number>>({});
  const [batchTotals, setBatchTotals] = useState<Record<string, { weight: number; plants: number; flowerWeight: number; frozenWeight: number }>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);

  const flowerRooms = rooms
    .filter((r) => r.is_active && r.room_type === 'flower')
    .filter((r) => groups.some((g) => g.grow_room_id === r.id));

  // Auto-select room when resuming an active harvest
  useEffect(() => {
    if (initialRoomId && rooms.length > 0 && !selectedRoom) {
      const room = rooms.find((r) => r.id === initialRoomId);
      if (room) {
        setSelectedRoom(room);
        setStep('record-weights');
      }
    }
  }, [initialRoomId, rooms, selectedRoom]);

  const roomGroups = selectedRoom
    ? groups.filter((g) => g.grow_room_id === selectedRoom.id)
    : [];

  const batchGroups = groupByBatch(roomGroups);

  // Track plants already harvested in prior completed sessions per batch
  const [priorHarvestMap, setPriorHarvestMap] = useState<Record<string, number>>({});

  // Load existing active sessions, keyed by batch_registry_id
  // Also load completed + finalized sessions to calculate prior harvested plant counts
  const loadExistingSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [activeSessions, completedSessions, finalizedSessions] = await Promise.all([
        cultivationService.listHarvestSessions({ status: 'active' }),
        cultivationService.listHarvestSessions({ status: 'completed' }),
        cultivationService.listHarvestSessions({ status: 'finalized' }),
      ]);
      const map: Record<string, HarvestSession> = {};
      for (const s of activeSessions) {
        if (s.batch_registry_id) {
          map[s.batch_registry_id] = s;
        }
      }
      setBatchSessionMap(map);

      // Sum plant_count_harvested from completed AND finalized sessions per batch+room
      const priorMap: Record<string, number> = {};
      for (const s of [...completedSessions, ...finalizedSessions]) {
        if (s.batch_registry_id && selectedRoom && s.grow_room_id === selectedRoom.id) {
          priorMap[s.batch_registry_id] = (priorMap[s.batch_registry_id] ?? 0) + s.plant_count_harvested;
        }
      }
      setPriorHarvestMap(priorMap);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedRoom && roomGroups.length > 0) {
      loadExistingSessions();
    }
  }, [selectedRoom?.id, roomGroups.length, loadExistingSessions]);

  function handleSelectRoom(room: GrowRoom) {
    setSelectedRoom(room);
    setStep('record-weights');
  }

  // Create ONE session per batch using the first plant group as representative
  async function handleStartBatch(batchRegistryId: string): Promise<HarvestSession> {
    if (batchSessionMap[batchRegistryId]) return batchSessionMap[batchRegistryId];

    const batch = batchGroups.find((b) => b.batchRegistryId === batchRegistryId);
    if (!batch) throw new Error('Batch not found');

    if (!isValidStrainAbbreviation(batch.strainAbbreviation)) {
      throw new Error('Strain is missing a 3-letter abbreviation. Update in Products > Strains first.');
    }

    const session = await createSession({
      plant_group_id: batch.representativeGroupId,
      batch_registry_id: batchRegistryId,
      harvest_date: new Date().toISOString().slice(0, 10),
      wet_weight_grams: 0,
      plant_count_harvested: 0,
      grow_room_id: selectedRoom?.id ?? undefined,
    });
    setBatchSessionMap((prev) => ({ ...prev, [batchRegistryId]: session }));
    return session;
  }

  function handleWasteChange(batchRegistryId: string, grams: number) {
    setWasteMap((prev) => ({ ...prev, [batchRegistryId]: grams }));
  }

  const updateBatchTotals = useCallback((batchRegistryId: string, weight: number, plants: number, flowerWeight: number, frozenWeight: number) => {
    setBatchTotals((prev) => {
      const existing = prev[batchRegistryId];
      if (existing && existing.weight === weight && existing.plants === plants && existing.flowerWeight === flowerWeight && existing.frozenWeight === frozenWeight) return prev;
      return { ...prev, [batchRegistryId]: { weight, plants, flowerWeight, frozenWeight } };
    });
  }, []);

  // Finalize only selected batches
  async function handleFinalize(batchIds: string[], dryRoomId: string | null) {
    const sessionsToFinalize = batchIds
      .map((id) => batchSessionMap[id])
      .filter(Boolean);

    for (const session of sessionsToFinalize) {
      const waste = wasteMap[session.batch_registry_id ?? ''] || 0;
      if (waste > 0) {
        const { error } = await supabase
          .from('harvest_sessions')
          .update({ waste_grams: waste })
          .eq('id', session.id);
        if (error) throw new Error(error.message);
      }
      await finalizeHarvest(session.id, dryRoomId);
    }
    await reloadSessions();

    // If all batches in the room were finalized, complete
    const remainingActive = batchGroups.filter(
      (b) => batchSessionMap[b.batchRegistryId] && !batchIds.includes(b.batchRegistryId)
    );
    if (remainingActive.length === 0) {
      onComplete();
    } else {
      // Partial finalize — go back to weight recording for remaining
      await loadExistingSessions();
      setStep('record-weights');
    }
  }

  // Build batch-level summaries for review screen — include ALL batches, not just active
  const batchSummaries = batchGroups.map((batch) => {
    const session = batchSessionMap[batch.batchRegistryId] ?? null;
    const totals = batchTotals[batch.batchRegistryId] ?? { weight: 0, plants: 0, flowerWeight: 0, frozenWeight: 0 };
    const priorPlants = priorHarvestMap[batch.batchRegistryId] ?? 0;
    return {
      batch,
      session,
      totalWeight: totals.weight,
      totalPlants: totals.plants,
      flowerWeight: totals.flowerWeight,
      frozenWeight: totals.frozenWeight,
      wasteGrams: wasteMap[batch.batchRegistryId] ?? 0,
      priorHarvestedPlants: priorPlants,
      hasEntries: session !== null,
    };
  });

  const activeBatches = batchGroups.filter((b) => batchSessionMap[b.batchRegistryId]).length;
  const totalBatches = batchGroups.length;

  const stepLabels: Record<Step, string> = {
    'select-room': 'Select Room',
    'record-weights': 'Record Weights',
    'review': 'Review',
  };

  const stepKeys = Object.keys(stepLabels) as Step[];
  const currentStepIdx = stepKeys.indexOf(step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={step === 'select-room' ? onCancel : () => setStep(step === 'review' ? 'record-weights' : 'select-room')}
          className="flex items-center justify-center w-9 h-9 border border-cult-medium-gray text-cult-light-gray hover:text-cult-white hover:border-cult-lighter-gray transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-cult-white uppercase tracking-wide flex items-center gap-2">
            <Leaf className="w-5 h-5 text-cult-stage-harvest" />
            New Harvest
          </h2>
          <div className="flex items-center gap-1 mt-2">
            {Object.entries(stepLabels).map(([key, label], i) => (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && <span className="text-cult-medium-gray mx-1">/</span>}
                <span
                  className={`text-xs uppercase tracking-wider px-2 py-0.5 transition-colors ${
                    step === key
                      ? 'text-cult-white font-bold bg-cult-charcoal'
                      : i < currentStepIdx
                        ? 'text-cult-light-gray'
                        : 'text-cult-medium-gray'
                  }`}
                >
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {step === 'select-room' && (
        <HarvestRoomSelect
          flowerRooms={flowerRooms}
          groups={groups}
          onSelectRoom={handleSelectRoom}
        />
      )}

      {step === 'record-weights' && selectedRoom && (
        <div className="space-y-5">
          {/* Step 2 header */}
          <div className="border-l-2 border-cult-stage-harvest pl-4">
            <h2 className="text-xs text-cult-stage-harvest uppercase tracking-widest font-bold mb-1">
              Step 2 — Record Weights
            </h2>
            <p className="text-cult-silver text-sm">
              Weigh batches in{' '}
              <span className="text-cult-white font-mono font-bold">{selectedRoom.room_code}</span>
              <span className="text-cult-light-gray"> ({selectedRoom.name})</span>
              <span className="text-cult-lighter-gray"> · {totalBatches} batch{totalBatches !== 1 ? 'es' : ''}</span>
            </p>
            {activeBatches > 0 && activeBatches < totalBatches && (
              <p className="text-xs text-cult-stage-harvest mt-1">
                {activeBatches} of {totalBatches} batches started — you can review and finalize what&apos;s ready
              </p>
            )}
          </div>

          {loadingSessions ? (
            <div className="text-cult-light-gray text-sm py-8 text-center animate-pulse">
              Loading existing harvest sessions…
            </div>
          ) : (
          <div className="space-y-3">
            {batchGroups.map((batch) => (
              <BatchWeightCard
                key={batch.batchRegistryId}
                batch={batch}
                session={batchSessionMap[batch.batchRegistryId] ?? null}
                wasteGrams={wasteMap[batch.batchRegistryId] ?? 0}
                priorHarvestedPlants={priorHarvestMap[batch.batchRegistryId] ?? 0}
                onStartBatch={handleStartBatch}
                onWasteChange={handleWasteChange}
                onTotalsUpdate={updateBatchTotals}
              />
            ))}
          </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 pt-2">
            {activeBatches > 0 && (
              <Button
                onClick={() => setStep('review')}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Review {activeBatches === totalBatches ? 'All' : `${activeBatches}`} Batch{activeBatches !== 1 ? 'es' : ''}
              </Button>
            )}
            <button
              onClick={() => setStep('select-room')}
              className="px-6 py-3 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
            >
              Back
            </button>
            {activeBatches === 0 && (
              <span className="text-cult-lighter-gray text-xs ml-2">
                Start weighing at least one batch to continue
              </span>
            )}
          </div>
        </div>
      )}

      {step === 'review' && selectedRoom && (
        <HarvestReviewFinalize
          roomCode={selectedRoom.room_code}
          roomName={selectedRoom.name}
          batchSummaries={batchSummaries}
          dryRooms={dryRooms}
          onFinalize={handleFinalize}
          onBack={() => setStep('record-weights')}
        />
      )}
    </div>
  );
}

// ─── BATCH-LEVEL WEIGHT CARD ───
// One card per batch. Inline weight entry form. Shows total/remaining plants.

interface BatchWeightCardProps {
  batch: BatchGroup;
  session: HarvestSession | null;
  wasteGrams: number;
  priorHarvestedPlants: number;
  onStartBatch: (batchRegistryId: string) => Promise<HarvestSession>;
  onWasteChange: (batchRegistryId: string, grams: number) => void;
  onTotalsUpdate: (batchRegistryId: string, weight: number, plants: number, flowerWeight: number, frozenWeight: number) => void;
}

function BatchWeightCard({
  batch,
  session,
  wasteGrams,
  priorHarvestedPlants,
  onStartBatch,
  onWasteChange,
  onTotalsUpdate,
}: BatchWeightCardProps) {
  const sessionId = session?.id ?? null;
  const { entries, totalWeight, totalPlants, addEntry, updateEntry, removeEntry, reload, setEntries } = useHarvestWeightEntries(sessionId);

  // Form open state — decoupled from session existence
  const [formOpen, setFormOpen] = useState(!!session);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-open form when session is loaded (e.g. from loadExistingSessions)
  useEffect(() => {
    if (session) setFormOpen(true);
  }, [session?.id]);

  // Weight entry form state
  const [weight, setWeight] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [destination, setDestination] = useState<HarvestType>('flower');
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [showWaste, setShowWaste] = useState(wasteGrams > 0);

  // Inline edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editPlants, setEditPlants] = useState('');
  const [editDest, setEditDest] = useState<HarvestType>('flower');
  const [editSaving, setEditSaving] = useState(false);

  function startEdit(entry: { id: string; weight_grams: number; plant_count: number; destination: HarvestType | null }) {
    setEditingEntryId(entry.id);
    setEditWeight(String(entry.weight_grams));
    setEditPlants(String(entry.plant_count));
    setEditDest((entry.destination as HarvestType) ?? 'flower');
  }

  function cancelEdit() {
    setEditingEntryId(null);
  }

  async function saveEdit(entryId: string) {
    const w = parseFloat(editWeight);
    const p = parseInt(editPlants);
    if (!(w > 0) || !(p >= 1)) return;
    setEditSaving(true);
    try {
      await updateEntry(entryId, { weight_grams: w, plant_count: p, destination: editDest });
      setEditingEntryId(null);
    } catch {
      // stay in edit mode on failure
    } finally {
      setEditSaving(false);
    }
  }

  // Account for plants already harvested in prior completed sessions
  const cumulativePlants = priorHarvestedPlants + totalPlants;
  const remaining = batch.totalPlants - cumulativePlants;
  const progress = batch.totalPlants > 0 ? Math.min(100, Math.round((cumulativePlants / batch.totalPlants) * 100)) : 0;
  const isComplete = cumulativePlants >= batch.totalPlants;

  const parsedWeight = parseFloat(weight);
  const parsedPlants = parseInt(plantCount);
  const canAdd = parsedWeight > 0 && parsedPlants >= 1 && parsedPlants <= remaining && !saving;

  // Compute flower/frozen weights from entries
  const flowerWeight = entries.filter((e) => e.destination === 'flower' || e.destination === null).reduce((s, e) => s + Number(e.weight_grams), 0);
  const frozenWeight = entries.filter((e) => e.destination === 'fresh_frozen').reduce((s, e) => s + Number(e.weight_grams), 0);

  // Bubble totals up to parent
  useEffect(() => {
    onTotalsUpdate(batch.batchRegistryId, totalWeight, totalPlants, flowerWeight, frozenWeight);
  }, [batch.batchRegistryId, totalWeight, totalPlants, flowerWeight, frozenWeight, onTotalsUpdate]);

  // "Start Weighing" just opens the form — no DB write
  function handleStart() {
    setFormOpen(true);
  }

  // Session is created lazily on first entry
  async function handleAddEntry() {
    if (!canAdd) return;
    setSaving(true);
    setEntryError(null);
    setError(null);
    try {
      // Create session on first entry if it doesn't exist yet
      let currentSession = session;
      if (!currentSession) {
        setCreating(true);
        currentSession = await onStartBatch(batch.batchRegistryId);
        setCreating(false);
      }
      if (!session) {
        // Session was just created — hook's sessionId is still null so reload() would return empty.
        // Call service directly and manually set entries to avoid the race condition.
        const newEntry = await cultivationService.createHarvestWeightEntry({
          harvest_session_id: currentSession.id,
          weight_grams: parsedWeight,
          plant_count: parsedPlants,
          destination,
        });
        setEntries((prev) => [...prev, newEntry]);
      } else {
        await addEntry({ weight_grams: parsedWeight, plant_count: parsedPlants, destination });
      }
      setWeight('');
      setPlantCount('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add entry';
      if (!session) setError(msg);
      else setEntryError(msg);
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEntry(entryId: string) {
    try {
      await removeEntry(entryId);
    } catch {
      // silent
    }
  }

  const accentBorder = isComplete
    ? 'border-l-green-600'
    : formOpen || priorHarvestedPlants > 0
      ? 'border-l-cult-stage-harvest'
      : 'border-l-cult-charcoal';

  return (
    <div className={`border border-l-4 ${accentBorder} ${
      isComplete
        ? 'border-green-900/60 bg-green-950/10'
        : formOpen
          ? 'border-cult-lighter-gray bg-cult-graphite'
          : 'border-cult-charcoal bg-cult-near-black hover:border-cult-medium-gray'
    } p-5 transition-all`}>
      {/* Batch header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-cult-white font-mono text-base font-bold tracking-wide">{batch.batchNumber}</span>
            <span className="text-cult-silver text-base">{batch.strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-cult-light-gray text-xs">{batch.totalPlants} plants</span>
            {batch.groups.length > 1 && (
              <span className="text-cult-lighter-gray text-xs">({batch.groups.length} tables)</span>
            )}
            {totalWeight > 0 && (
              <>
                <span className="text-cult-medium-gray">·</span>
                <span className="text-cult-stage-harvest text-xs font-mono font-semibold">{formatWeight(totalWeight)} recorded</span>
              </>
            )}
            {frozenWeight > 0 && (
              <>
                <span className="text-cult-medium-gray">·</span>
                <span className="text-cyan-400 text-xs font-mono font-semibold flex items-center gap-1">
                  <Snowflake className="w-3 h-3" />
                  {formatWeight(frozenWeight)} FF
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isComplete && (
            <span className="flex items-center gap-1.5 bg-green-950/40 border border-green-800 text-green-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </span>
          )}
          {!isComplete && entries.length > 0 && (
            <span className="flex items-center gap-1.5 bg-cult-stage-harvest/10 border border-cult-stage-harvest/40 text-cult-stage-harvest text-xs font-bold uppercase tracking-wider px-2.5 py-1">
              Partial
            </span>
          )}
        </div>
      </div>

      {/* Progress bar — show when form is open or prior harvests exist */}
      {(formOpen || priorHarvestedPlants > 0) && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-cult-silver uppercase tracking-wider">
              <span className="text-cult-white font-mono font-semibold">{cumulativePlants}</span>
              <span className="text-cult-lighter-gray"> / {batch.totalPlants} plants weighed</span>
              {priorHarvestedPlants > 0 && <span className="text-cult-lighter-gray ml-1">({priorHarvestedPlants} prior)</span>}
              {remaining > 0 && <span className="text-cult-stage-harvest font-semibold ml-2">{remaining} remaining</span>}
            </span>
            <span className="text-xs text-cult-light-gray font-mono font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-cult-black h-2 overflow-hidden border border-cult-charcoal">
            <div
              className={`h-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-600' : 'bg-cult-stage-harvest'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Start weighing button — only show when form is closed and batch not complete */}
      {!formOpen && !isComplete && (
        <div className="mt-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={creating}
            className="flex items-center gap-2 text-xs border border-cult-medium-gray text-cult-silver px-4 py-2 hover:border-cult-stage-harvest hover:text-cult-stage-harvest transition-all uppercase tracking-wider font-bold"
          >
            <Scale className="w-4 h-4" />
            Start Weighing
          </button>
        </div>
      )}

      {/* Weight entries list */}
      {entries.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-cult-lighter-gray uppercase tracking-wider font-medium">
              Entries ({entries.length})
            </span>
          </div>
          <div className="space-y-1">
            {entries.map((entry, idx) => (
              editingEntryId === entry.id ? (
                /* ─── Inline edit mode ─── */
                <div
                  key={entry.id}
                  className="bg-cult-black border border-cult-stage-harvest/50 px-3 py-2"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-cult-lighter-gray uppercase tracking-wider mb-0.5">Weight (g)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        className="w-full bg-cult-near-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-cult-stage-harvest transition-colors"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-cult-lighter-gray uppercase tracking-wider mb-0.5">Plants</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editPlants}
                        onChange={(e) => setEditPlants(e.target.value)}
                        className="w-full bg-cult-near-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-cult-stage-harvest transition-colors"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-cult-lighter-gray uppercase tracking-wider mb-0.5">Dest</label>
                      <select
                        value={editDest}
                        onChange={(e) => setEditDest(e.target.value as HarvestType)}
                        className="w-full bg-cult-near-black border border-cult-medium-gray text-cult-white px-2 py-1.5 text-xs focus:outline-none focus:border-cult-stage-harvest uppercase tracking-wider transition-colors"
                      >
                        <option value="flower">Flower</option>
                        <option value="fresh_frozen">Frozen</option>
                      </select>
                    </div>
                    <button
                      onClick={() => saveEdit(entry.id)}
                      disabled={editSaving}
                      className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={editSaving}
                      className="p-1.5 text-cult-medium-gray hover:text-cult-lighter-gray transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Display mode ─── */
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-3 py-2 text-xs ${
                    idx % 2 === 0 ? 'bg-cult-black/60' : 'bg-cult-dark-gray/40'
                  } border border-cult-charcoal group`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-cult-lighter-gray font-mono text-xs w-4 text-right">{idx + 1}.</span>
                    <span className="text-cult-white font-mono font-semibold text-sm">{formatWeight(Number(entry.weight_grams))}</span>
                    <span className="text-cult-lighter-gray">·</span>
                    <span className="text-cult-silver">{entry.plant_count} plant{entry.plant_count !== 1 ? 's' : ''}</span>
                    {entry.destination && (
                      <span className={`text-xs px-1.5 py-0.5 uppercase tracking-wider font-bold border ${
                        entry.destination === 'fresh_frozen'
                          ? 'border-cyan-700 text-cyan-400 bg-cyan-950/30'
                          : 'border-green-700 text-green-400 bg-green-950/30'
                      }`}>
                        {entry.destination === 'fresh_frozen' ? 'FF' : 'FLW'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-cult-medium-gray hover:text-cult-stage-harvest transition-colors p-1 opacity-0 group-hover:opacity-100"
                      title="Edit entry"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="text-cult-medium-gray hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      title="Remove entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Inline weight entry form */}
      {formOpen && remaining > 0 && (
        <div className="mt-4 bg-cult-black/40 border border-cult-charcoal p-3">
          {entryError && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {entryError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1 font-medium">
                Weight (g)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-cult-stage-harvest transition-colors"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1 font-medium">
                Plants
              </label>
              <input
                type="number"
                min="1"
                max={remaining}
                step="1"
                value={plantCount}
                onChange={(e) => setPlantCount(e.target.value)}
                placeholder={String(Math.min(5, remaining))}
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-cult-stage-harvest transition-colors"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1 font-medium">
                Dest
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value as HarvestType)}
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-2 text-xs focus:outline-none focus:border-cult-stage-harvest uppercase tracking-wider transition-colors"
              >
                <option value="flower">Flower</option>
                <option value="fresh_frozen">Frozen</option>
              </select>
            </div>
            <Button
              onClick={handleAddEntry}
              disabled={!canAdd}
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {saving ? '...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Waste input — always visible when form is open, not gated on session */}
      {formOpen && entries.length > 0 && (
        <div className="mt-3">
          {!showWaste ? (
            <button
              onClick={() => setShowWaste(true)}
              className="flex items-center gap-1.5 text-xs text-cult-lighter-gray hover:text-cult-silver transition-colors uppercase tracking-wider"
            >
              <Plus className="w-3 h-3" />
              Add Waste
            </button>
          ) : (
            <div className="flex items-end gap-3 bg-cult-black/30 border border-cult-charcoal p-3">
              <div>
                <label className="block text-xs text-cult-lighter-gray uppercase tracking-wider mb-1 font-medium">
                  Waste (g) <span className="text-cult-medium-gray normal-case">— stems, leaves, etc.</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={wasteGrams || ''}
                  onChange={(e) => onWasteChange(batch.batchRegistryId, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-36 bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-cult-lighter-gray transition-colors"
                />
              </div>
              {wasteGrams === 0 && (
                <button
                  onClick={() => setShowWaste(false)}
                  className="text-cult-medium-gray hover:text-cult-lighter-gray transition-colors p-2"
                  title="Remove waste"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
