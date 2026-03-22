import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Button } from '@/shared/components';
import { supabase } from '@/lib/supabase';
import { useGrowRooms } from '../../hooks/useGrowRooms';
import { usePlantGroups } from '../../hooks/usePlantGroups';
import { useHarvestSessions } from '../../hooks/useHarvestSessions';
import { useDryRooms } from '../../hooks/useDryRooms';
import { cultivationService } from '../../services';
import { isValidStrainAbbreviation } from '../../utils';
import { HarvestRoomSelect } from './HarvestRoomSelect';
import { PlantGroupWeightCard } from './HarvestWeightRecorder';
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
    };
  });
}

interface HarvestWorkflowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function HarvestWorkflow({ onComplete, onCancel }: HarvestWorkflowProps) {
  const { rooms } = useGrowRooms();
  const { groups } = usePlantGroups({ stage: 'flower' });
  const { createSession, finalizeHarvest, reload: reloadSessions } = useHarvestSessions();
  const { rooms: dryRooms } = useDryRooms();

  const [step, setStep] = useState<Step>('select-room');
  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  const [sessionMap, setSessionMap] = useState<Record<string, HarvestSession>>({});
  const [wasteMap, setWasteMap] = useState<Record<string, number>>({});
  const [weightTotals, setWeightTotals] = useState<Record<string, { weight: number; plants: number; flowerWeight: number; frozenWeight: number }>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);

  const flowerRooms = rooms
    .filter((r) => r.is_active && r.room_type === 'flower')
    .filter((r) => groups.some((g) => g.grow_room_id === r.id));

  const roomGroups = selectedRoom
    ? groups.filter((g) => g.grow_room_id === selectedRoom.id)
    : [];

  // Group plant groups by batch for consolidated harvest cards
  const batchGroups = groupByBatch(roomGroups);

  const loadExistingSessions = useCallback(async (roomGroupIds: string[]) => {
    if (roomGroupIds.length === 0) return;
    setLoadingSessions(true);
    try {
      const allSessions = await cultivationService.listHarvestSessions({ status: 'active' });
      const map: Record<string, HarvestSession> = {};
      for (const s of allSessions) {
        if (roomGroupIds.includes(s.plant_group_id)) {
          map[s.plant_group_id] = s;
        }
      }
      setSessionMap(map);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom && roomGroups.length > 0) {
      loadExistingSessions(roomGroups.map((g) => g.id));
    }
  }, [selectedRoom?.id, roomGroups.length, loadExistingSessions]);

  function handleSelectRoom(room: GrowRoom) {
    setSelectedRoom(room);
    setStep('record-weights');
  }



  // Create sessions for ALL plant groups in a batch at once (skips groups that already have one)
  async function handleBatchCreateSessions(batchRegistryId: string): Promise<HarvestSession> {
    const batch = batchGroups.find((b) => b.batchRegistryId === batchRegistryId);
    if (!batch) throw new Error('Batch not found');

    if (!isValidStrainAbbreviation(batch.strainAbbreviation)) {
      throw new Error('Strain is missing a 3-letter abbreviation. Update in Products > Strains first.');
    }

    let firstSession: HarvestSession | null = null;
    const batchId = batch.batchRegistryId;

    for (const group of batch.groups) {
      // Skip groups that already have an active session (prevents duplicates)
      if (sessionMap[group.id]) {
        if (!firstSession) firstSession = sessionMap[group.id];
        continue;
      }
      const session = await createSession({
        plant_group_id: group.id,
        batch_registry_id: batchId,
        harvest_date: new Date().toISOString().slice(0, 10),
        wet_weight_grams: 0,
        plant_count_harvested: 0,
        grow_room_id: selectedRoom?.id ?? undefined,
      });
      setSessionMap((prev) => ({ ...prev, [group.id]: session }));
      if (!firstSession) firstSession = session;
    }

    return firstSession!;
  }

  // Legacy per-group session creation (used by weight card internally)
  async function handleCreateSession(groupId: string): Promise<HarvestSession> {
    // Return existing session if one already exists (prevents duplicates)
    if (sessionMap[groupId]) return sessionMap[groupId];

    const group = groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Plant group not found');

    if (!isValidStrainAbbreviation(group.strains?.abbreviation)) {
      throw new Error('Strain is missing a 3-letter abbreviation. Update in Products > Strains first.');
    }

    const session = await createSession({
      plant_group_id: groupId,
      batch_registry_id: group.batch_registry_id ?? group.id,
      harvest_date: new Date().toISOString().slice(0, 10),
      wet_weight_grams: 0,
      plant_count_harvested: 0,
      grow_room_id: selectedRoom?.id ?? undefined,
    });
    setSessionMap((prev) => ({ ...prev, [groupId]: session }));
    return session;
  }

  function handleWasteChange(groupId: string, grams: number) {
    setWasteMap((prev) => ({ ...prev, [groupId]: grams }));
  }

  const updateWeightTotals = useCallback((groupId: string, weight: number, plants: number, flowerWeight: number, frozenWeight: number) => {
    setWeightTotals((prev) => {
      const existing = prev[groupId];
      if (existing && existing.weight === weight && existing.plants === plants && existing.flowerWeight === flowerWeight && existing.frozenWeight === frozenWeight) return prev;
      return { ...prev, [groupId]: { weight, plants, flowerWeight, frozenWeight } };
    });
  }, []);

  async function handleFinalize(dryRoomId: string | null) {
    const sessionsToFinalize = Object.values(sessionMap);
    for (const session of sessionsToFinalize) {
      const waste = wasteMap[session.plant_group_id] || 0;
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

  // Build summaries per underlying group (HarvestReviewFinalize expects per-group)
  const groupSummaries = roomGroups
    .filter((g) => sessionMap[g.id])
    .map((group) => {
      const session = sessionMap[group.id];
      const totals = weightTotals[group.id] ?? { weight: 0, plants: 0, flowerWeight: 0, frozenWeight: 0 };
      return {
        group,
        session,
        totalWeight: totals.weight,
        totalPlants: totals.plants,
        flowerWeight: totals.flowerWeight,
        frozenWeight: totals.frozenWeight,
        wasteGrams: wasteMap[group.id] ?? 0,
      };
    });

  const activeBatches = batchGroups.filter((b) =>
    b.groups.some((g) => sessionMap[g.id])
  ).length;

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
              Record weights for plant groups in{' '}
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
                sessionMap={sessionMap}
                wasteMap={wasteMap}
                onBatchCreateSessions={handleBatchCreateSessions}
                onCreateSession={handleCreateSession}
                onWasteChange={handleWasteChange}
                onTotalsUpdate={updateWeightTotals}
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
          groupSummaries={groupSummaries}
          dryRooms={dryRooms}
          onFinalize={handleFinalize}
          onBack={() => setStep('record-weights')}
        />
      )}
    </div>
  );
}

// ─── BATCH-LEVEL WEIGHT CARD ───
// Renders one consolidated card per batch, with individual PlantGroupWeightCards inside

interface BatchWeightCardProps {
  batch: BatchGroup;
  sessionMap: Record<string, HarvestSession>;
  wasteMap: Record<string, number>;
  onBatchCreateSessions: (batchRegistryId: string) => Promise<HarvestSession>;
  onCreateSession: (groupId: string) => Promise<HarvestSession>;
  onWasteChange: (groupId: string, grams: number) => void;
  onTotalsUpdate: (groupId: string, weight: number, plants: number) => void;
}

function BatchWeightCard({
  batch,
  sessionMap,
  wasteMap,
  onBatchCreateSessions,
  onCreateSession,
  onWasteChange,
  onTotalsUpdate,
}: BatchWeightCardProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnySessions = batch.groups.some((g) => sessionMap[g.id]);
  const allHaveSessions = batch.groups.every((g) => sessionMap[g.id]);

  async function handleStartAll() {
    setCreating(true);
    setError(null);
    try {
      await onBatchCreateSessions(batch.batchRegistryId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start harvest');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Single consolidated card for the batch */}
      <div className="border border-cult-medium-gray bg-cult-near-black p-4 space-y-3">
        {/* Batch header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-cult-white font-mono text-sm font-semibold">{batch.batchNumber}</span>
              <span className="text-cult-white text-sm truncate">{batch.strainName}</span>
            </div>
            <span className="text-cult-medium-gray text-xs">{batch.totalPlants} plants total</span>
            {batch.groups.length > 1 && (
              <span className="text-cult-medium-gray text-xs ml-2">
                ({batch.groups.length} tables)
              </span>
            )}
          </div>
        </div>

        {/* Start weighing button — creates sessions for all groups in batch */}
        {!allHaveSessions && (
          <div>
            {error && (
              <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-2">
                {error}
              </div>
            )}
            <button
              onClick={handleStartAll}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all disabled:opacity-50"
            >
              <Leaf className="w-3.5 h-3.5" />
              {creating ? 'Starting...' : 'Start Weighing'}
            </button>
          </div>
        )}

        {/* Individual plant group weight cards — shown after sessions are created */}
        {allHaveSessions && (
          <div className="space-y-2">
            {batch.groups.map((group) => (
              <GroupWeightCardWithTotals
                key={group.id}
                group={group}
                harvestSession={sessionMap[group.id] ?? null}
                onCreateSession={onCreateSession}
                wasteGrams={wasteMap[group.id] ?? 0}
                onWasteChange={onWasteChange}
                onTotalsUpdate={onTotalsUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PER-GROUP WEIGHT TRACKING (inside a batch card) ───
// Tracks totals for a single plant group's session

interface GroupWeightCardWithTotalsProps {
  group: PlantGroup;
  harvestSession: HarvestSession | null;
  onCreateSession: (groupId: string) => Promise<HarvestSession>;
  wasteGrams: number;
  onWasteChange: (groupId: string, grams: number) => void;
  onTotalsUpdate: (groupId: string, weight: number, plants: number, flowerWeight: number, frozenWeight: number) => void;
}

function GroupWeightCardWithTotals({
  group,
  harvestSession,
  onCreateSession,
  wasteGrams,
  onWasteChange,
  onTotalsUpdate,
}: GroupWeightCardWithTotalsProps) {
  const sessionId = harvestSession?.id ?? null;
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalPlants, setTotalPlants] = useState(0);
  const [flowerWeight, setFlowerWeight] = useState(0);
  const [frozenWeight, setFrozenWeight] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setTotalWeight(0);
      setTotalPlants(0);
      setFlowerWeight(0);
      setFrozenWeight(0);
      return;
    }
    let cancelled = false;
    cultivationService.listHarvestWeightEntries(sessionId).then((entries) => {
      if (cancelled) return;
      setTotalWeight(entries.reduce((s, e) => s + Number(e.weight_grams), 0));
      setTotalPlants(entries.reduce((s, e) => s + e.plant_count, 0));
      setFlowerWeight(entries.filter((e) => e.destination === 'flower').reduce((s, e) => s + Number(e.weight_grams), 0));
      setFrozenWeight(entries.filter((e) => e.destination === 'fresh_frozen').reduce((s, e) => s + Number(e.weight_grams), 0));
    });
    return () => { cancelled = true; };
  }, [sessionId, refreshKey]);

  useEffect(() => {
    onTotalsUpdate(group.id, totalWeight, totalPlants, flowerWeight, frozenWeight);
  }, [group.id, totalWeight, totalPlants, flowerWeight, frozenWeight, onTotalsUpdate]);

  function handleSessionCreated() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <PlantGroupWeightCard
      group={group}
      harvestSession={harvestSession}
      onSessionCreated={handleSessionCreated}
      onCreateSession={onCreateSession}
      wasteGrams={wasteGrams}
      onWasteChange={onWasteChange}
    />
  );
}
