import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Leaf, Plus, Trash2, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
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

interface BatchGroup {
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
  // Also load completed sessions to calculate prior harvested plant counts
  const loadExistingSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [activeSessions, completedSessions] = await Promise.all([
        cultivationService.listHarvestSessions({ status: 'active' }),
        cultivationService.listHarvestSessions({ status: 'completed' }),
      ]);
      const map: Record<string, HarvestSession> = {};
      for (const s of activeSessions) {
        if (s.batch_registry_id) {
          map[s.batch_registry_id] = s;
        }
      }
      setBatchSessionMap(map);

      // Sum plant_count_harvested from completed sessions per batch+room
      const priorMap: Record<string, number> = {};
      for (const s of completedSessions) {
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

  async function handleFinalize(dryRoomId: string | null) {
    const sessionsToFinalize = Object.values(batchSessionMap);
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
    onComplete();
  }

  // Build batch-level summaries for review screen
  const batchSummaries = batchGroups
    .filter((b) => batchSessionMap[b.batchRegistryId])
    .map((batch) => {
      const session = batchSessionMap[batch.batchRegistryId];
      const totals = batchTotals[batch.batchRegistryId] ?? { weight: 0, plants: 0, flowerWeight: 0, frozenWeight: 0 };
      return {
        batch,
        session,
        totalWeight: totals.weight,
        totalPlants: totals.plants,
        flowerWeight: totals.flowerWeight,
        frozenWeight: totals.frozenWeight,
        wasteGrams: wasteMap[batch.batchRegistryId] ?? 0,
      };
    });

  const activeBatches = batchGroups.filter((b) => batchSessionMap[b.batchRegistryId]).length;

  const stepLabels: Record<Step, string> = {
    'select-room': 'Select Room',
    'record-weights': 'Record Weights',
    'review': 'Review & Finalize',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={step === 'select-room' ? onCancel : () => setStep(step === 'review' ? 'record-weights' : 'select-room')}
          className="text-cult-medium-gray hover:text-cult-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-cult-white uppercase tracking-wide flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            New Harvest
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {Object.entries(stepLabels).map(([key, label], i) => (
              <span key={key} className="flex items-center gap-2">
                {i > 0 && <span className="text-cult-dark-gray">/</span>}
                <span
                  className={`text-xs uppercase tracking-wider ${
                    step === key
                      ? 'text-cult-white font-semibold'
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
        <div className="space-y-4">
          <div>
            <h2 className="text-xs text-cult-light-gray uppercase tracking-widest font-semibold mb-1">
              Step 2
            </h2>
            <p className="text-cult-light-gray text-sm">
              Record weights by batch in{' '}
              <span className="text-cult-white font-mono">{selectedRoom.room_code}</span>
              <span className="text-cult-medium-gray"> ({selectedRoom.name})</span>
            </p>
          </div>

          {loadingSessions ? (
            <div className="text-cult-medium-gray text-sm py-8 text-center">
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

          {activeBatches > 0 && (
            <div className="flex gap-3">
              <Button
                onClick={() => setStep('review')}
              >
                Review & Finalize
              </Button>
              <button
                onClick={() => setStep('select-room')}
                className="px-6 py-3 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
              >
                Back
              </button>
            </div>
          )}
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
  const { entries, totalWeight, totalPlants, addEntry, removeEntry, reload } = useHarvestWeightEntries(sessionId);

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
      // addEntry uses the hook's sessionId, which updates when session prop changes.
      // But since state update is async, we need to call the service directly for the first entry.
      if (!session) {
        // Session was just created — addEntry won't work yet because sessionId is still null.
        // Call service directly with the new session id.
        await cultivationService.createHarvestWeightEntry({
          harvest_session_id: currentSession.id,
          weight_grams: parsedWeight,
          plant_count: parsedPlants,
          destination,
        });
        await reload();
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

  return (
    <div className={`border ${isComplete ? 'border-green-800 bg-green-950/20' : 'border-cult-medium-gray bg-cult-near-black'} p-4`}>
      {/* Batch header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-cult-white font-mono text-sm font-semibold">{batch.batchNumber}</span>
            <span className="text-cult-white text-sm truncate">{batch.strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cult-medium-gray text-xs">{batch.totalPlants} plants</span>
            {batch.groups.length > 1 && (
              <span className="text-cult-medium-gray text-xs">({batch.groups.length} tables)</span>
            )}
            {totalWeight > 0 && (
              <>
                <span className="text-cult-medium-gray text-xs">|</span>
                <span className="text-cult-light-gray text-xs font-mono">{formatWeight(totalWeight)} recorded</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isComplete && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </span>
          )}
        </div>
      </div>

      {/* Progress bar — show when form is open or prior harvests exist */}
      {(formOpen || priorHarvestedPlants > 0) && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-cult-medium-gray uppercase tracking-wider">
              {cumulativePlants} / {batch.totalPlants} plants weighed
              {priorHarvestedPlants > 0 && <span className="text-cult-medium-gray ml-1">({priorHarvestedPlants} prior)</span>}
              {remaining > 0 && <span className="text-cult-light-gray ml-1">({remaining} remaining)</span>}
            </span>
            <span className="text-[10px] text-cult-medium-gray">{progress}%</span>
          </div>
          <div className="w-full bg-cult-black h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-600' : 'bg-cult-white'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Start weighing button — only show when form is closed and batch not complete */}
      {!formOpen && !isComplete && (
        <div className="mt-3">
          {error && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={creating}
            className="flex items-center gap-1.5 text-xs border border-cult-medium-gray text-cult-light-gray px-3 py-1.5 hover:border-cult-lighter-gray hover:text-cult-white transition-all uppercase tracking-wider font-semibold"
          >
            <Scale className="w-3.5 h-3.5" />
            Start Weighing
          </button>
        </div>
      )}

      {/* Weight entries list */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-cult-black border border-cult-dark-gray px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-cult-white font-mono">{formatWeight(Number(entry.weight_grams))}</span>
                <span className="text-cult-medium-gray">|</span>
                <span className="text-cult-light-gray">{entry.plant_count} plant{entry.plant_count !== 1 ? 's' : ''}</span>
                {entry.destination && (
                  <span className={`text-[9px] px-1 py-0.5 uppercase tracking-wider font-bold border ${entry.destination === 'fresh_frozen' ? 'border-cyan-800 text-cyan-400' : 'border-green-800 text-green-400'}`}>
                    {entry.destination === 'fresh_frozen' ? 'FF' : 'FLW'}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemoveEntry(entry.id)}
                className="text-cult-medium-gray hover:text-red-400 transition-colors p-0.5"
                title="Remove entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline weight entry form */}
      {formOpen && remaining > 0 && (
        <div className="mt-3">
          {entryError && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {entryError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
                Weight (g)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
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
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
                Dest
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value as HarvestType)}
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2 py-1.5 text-xs focus:outline-none focus:border-cult-lighter-gray uppercase"
              >
                <option value="flower">Flower</option>
                <option value="fresh_frozen">Frozen</option>
              </select>
            </div>
            <Button
              onClick={handleAddEntry}
              disabled={!canAdd}
              size="xs"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {saving ? '...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Waste input */}
      {session && (
        <div className="mt-3">
          <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
            Waste (g) - optional
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={wasteGrams || ''}
            onChange={(e) => onWasteChange(batch.batchRegistryId, parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-32 bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
      )}
    </div>
  );
}
