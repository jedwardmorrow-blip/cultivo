import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Leaf } from 'lucide-react';
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
import type { GrowRoom, PlantGroup, HarvestSession } from '../../types';

type Step = 'select-room' | 'record-weights' | 'review';

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
  const [weightTotals, setWeightTotals] = useState<Record<string, { weight: number; plants: number }>>({});

  const flowerRooms = rooms
    .filter((r) => r.is_active && r.room_type === 'flower')
    .filter((r) => groups.some((g) => g.grow_room_id === r.id));

  const roomGroups = selectedRoom
    ? groups.filter((g) => g.grow_room_id === selectedRoom.id)
    : [];

  const loadExistingSessions = useCallback(async (roomGroupIds: string[]) => {
    if (roomGroupIds.length === 0) return;
    const allSessions = await cultivationService.listHarvestSessions({ status: 'active' });
    const map: Record<string, HarvestSession> = {};
    for (const s of allSessions) {
      if (roomGroupIds.includes(s.plant_group_id)) {
        map[s.plant_group_id] = s;
      }
    }
    setSessionMap(map);
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

  async function handleCreateSession(groupId: string): Promise<HarvestSession> {
    const group = groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Plant group not found');

    if (!isValidStrainAbbreviation(group.strains?.abbreviation)) {
      throw new Error('Strain is missing a 3-letter abbreviation. Update in Products > Strains first.');
    }

    const session = await createSession({
      plant_group_id: groupId,
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

  const updateWeightTotals = useCallback((groupId: string, weight: number, plants: number) => {
    setWeightTotals((prev) => {
      const existing = prev[groupId];
      if (existing && existing.weight === weight && existing.plants === plants) return prev;
      return { ...prev, [groupId]: { weight, plants } };
    });
  }, []);

  async function handleFinalize(dryRoomId: string) {
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

  const groupSummaries = roomGroups
    .filter((g) => sessionMap[g.id])
    .map((group) => {
      const session = sessionMap[group.id];
      const totals = weightTotals[group.id] ?? { weight: 0, plants: 0 };
      return {
        group,
        session,
        totalWeight: totals.weight,
        totalPlants: totals.plants,
        wasteGrams: wasteMap[group.id] ?? 0,
      };
    });

  const activeSessions = Object.keys(sessionMap).length;

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

          <div className="space-y-3">
            {roomGroups.map((group) => (
              <PlantGroupWeightCardWithTotals
                key={group.id}
                group={group}
                harvestSession={sessionMap[group.id] ?? null}
                onCreateSession={handleCreateSession}
                wasteGrams={wasteMap[group.id] ?? 0}
                onWasteChange={handleWasteChange}
                onTotalsUpdate={updateWeightTotals}
              />
            ))}
          </div>

          {activeSessions > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-cult-surface transition-all text-sm"
              >
                Review & Finalize
              </button>
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

interface PlantGroupWeightCardWithTotalsProps {
  group: PlantGroup;
  harvestSession: HarvestSession | null;
  onCreateSession: (groupId: string) => Promise<HarvestSession>;
  wasteGrams: number;
  onWasteChange: (groupId: string, grams: number) => void;
  onTotalsUpdate: (groupId: string, weight: number, plants: number) => void;
}

function PlantGroupWeightCardWithTotals({
  group,
  harvestSession,
  onCreateSession,
  wasteGrams,
  onWasteChange,
  onTotalsUpdate,
}: PlantGroupWeightCardWithTotalsProps) {
  const sessionId = harvestSession?.id ?? null;
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalPlants, setTotalPlants] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setTotalWeight(0);
      setTotalPlants(0);
      return;
    }
    let cancelled = false;
    cultivationService.listHarvestWeightEntries(sessionId).then((entries) => {
      if (cancelled) return;
      setTotalWeight(entries.reduce((s, e) => s + Number(e.weight_grams), 0));
      setTotalPlants(entries.reduce((s, e) => s + e.plant_count, 0));
    });
    return () => { cancelled = true; };
  }, [sessionId, refreshKey]);

  useEffect(() => {
    onTotalsUpdate(group.id, totalWeight, totalPlants);
  }, [group.id, totalWeight, totalPlants, onTotalsUpdate]);

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
