/**
 * HarvestWorkflow — 3-step harvest wizard (Glass Design System)
 *
 * Step 1: Select Room → Step 2: Record Weights → Step 3: Review & Finalize
 * Each batch gets a card with inline line-item weight entry.
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Leaf, Plus, Trash2, Scale, AlertTriangle, CheckCircle, ChevronRight, Minus, Snowflake, Pencil, Check, X } from 'lucide-react';
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

// ─── Glass tokens ───────────────────────────────────────────────────

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_NESTED = 'rounded-xl bg-white/[0.04] border border-white/[0.06]';

// ─── Types ──────────────────────────────────────────────────────────

type Step = 'select-room' | 'record-weights' | 'review';

export interface BatchGroup {
  batchRegistryId: string;
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string | null;
  groups: PlantGroup[];
  totalPlants: number;
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

// ─── Main Component ─────────────────────────────────────────────────

interface HarvestWorkflowProps {
  onComplete: () => void;
  onCancel: () => void;
  initialRoomId?: string;
}

export function HarvestWorkflow({ onComplete, onCancel, initialRoomId }: HarvestWorkflowProps) {
  const { rooms } = useGrowRooms();
  const { groups } = usePlantGroups({ stage: 'flower' });
  const { createSession, finalizeHarvest, reload: reloadSessions } = useHarvestSessions();
  const { rooms: dryRooms } = useDryRooms();

  const [step, setStep] = useState<Step>('select-room');
  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  const [batchSessionMap, setBatchSessionMap] = useState<Record<string, HarvestSession>>({});
  const [wasteMap, setWasteMap] = useState<Record<string, number>>({});
  const [batchTotals, setBatchTotals] = useState<Record<string, { weight: number; plants: number; flowerWeight: number; frozenWeight: number }>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);

  const flowerRooms = rooms
    .filter((r) => r.is_active && r.room_type === 'flower')
    .filter((r) => groups.some((g) => g.grow_room_id === r.id));

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
  const [priorHarvestMap, setPriorHarvestMap] = useState<Record<string, number>>({});

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
        if (s.batch_registry_id) map[s.batch_registry_id] = s;
      }
      setBatchSessionMap(map);

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
    if (selectedRoom && roomGroups.length > 0) loadExistingSessions();
  }, [selectedRoom?.id, roomGroups.length, loadExistingSessions]);

  function handleSelectRoom(room: GrowRoom) {
    setSelectedRoom(room);
    setStep('record-weights');
  }

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

  async function handleFinalize(batchIds: string[], dryRoomId: string | null) {
    const sessionsToFinalize = batchIds.map((id) => batchSessionMap[id]).filter(Boolean);
    for (const session of sessionsToFinalize) {
      const waste = wasteMap[session.batch_registry_id ?? ''] || 0;
      if (waste > 0) {
        await supabase.from('harvest_sessions').update({ waste_grams: waste }).eq('id', session.id);
      }
      await finalizeHarvest(session.id, dryRoomId);
    }
    await reloadSessions();
    const remainingActive = batchGroups.filter(
      (b) => batchSessionMap[b.batchRegistryId] && !batchIds.includes(b.batchRegistryId)
    );
    if (remainingActive.length === 0) {
      onComplete();
    } else {
      await loadExistingSessions();
      setStep('record-weights');
    }
  }

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
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/[0.2] transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-amber-400" />
            New Harvest
          </h2>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-2">
            {Object.entries(stepLabels).map(([key, label], i) => (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/10 mx-1">/</span>}
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg transition-colors ${
                    step === key
                      ? 'text-white/80 font-bold bg-white/10'
                      : i < currentStepIdx
                        ? 'text-white/40'
                        : 'text-white/20'
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
        <HarvestRoomSelect flowerRooms={flowerRooms} groups={groups} onSelectRoom={handleSelectRoom} />
      )}

      {step === 'record-weights' && selectedRoom && (
        <div className="space-y-5">
          <div className="pl-4" style={{ borderLeftWidth: 2, borderLeftColor: 'rgba(245,158,11,0.4)' }}>
            <h2 className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold mb-1">
              Step 2 — Record Weights
            </h2>
            <p className="text-sm text-white/50">
              Weigh batches in{' '}
              <span className="text-white/80 font-mono font-bold">{selectedRoom.room_code}</span>
              <span className="text-white/40"> ({selectedRoom.name})</span>
              <span className="text-white/30"> · {totalBatches} batch{totalBatches !== 1 ? 'es' : ''}</span>
            </p>
            {activeBatches > 0 && activeBatches < totalBatches && (
              <p className="text-[10px] text-amber-400/70 mt-1">
                {activeBatches} of {totalBatches} batches started — review and finalize what's ready
              </p>
            )}
          </div>

          {loadingSessions ? (
            <div className="text-white/30 text-sm py-8 text-center">
              <div className="glass-skeleton h-24 rounded-2xl mb-3" />
              <div className="glass-skeleton h-24 rounded-2xl" />
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
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/20 px-5 py-3 text-xs font-semibold uppercase tracking-wider active:scale-95 transition-all"
              >
                Review {activeBatches === totalBatches ? 'All' : `${activeBatches}`} Batch{activeBatches !== 1 ? 'es' : ''}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setStep('select-room')}
              className="rounded-xl bg-white/[0.05] border border-white/[0.1] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40 hover:bg-white/[0.08] hover:text-white/60 active:scale-95 transition-all"
            >
              Back
            </button>
            {activeBatches === 0 && (
              <span className="text-white/20 text-[10px] ml-2">
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

// ═══════════════════════════════════════════════════════════════════
// BatchWeightCard — per-batch weight entry with inline form
// ═══════════════════════════════════════════════════════════════════

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
  const { entries, totalWeight, totalPlants, addEntry, updateEntry, removeEntry, setEntries } = useHarvestWeightEntries(sessionId);

  const [formOpen, setFormOpen] = useState(!!session);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weight, setWeight] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [destination, setDestination] = useState<HarvestType>('flower');
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [showWaste, setShowWaste] = useState(wasteGrams > 0);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editPlants, setEditPlants] = useState('');
  const [editDest, setEditDest] = useState<HarvestType>('flower');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { if (session) setFormOpen(true); }, [session?.id]);

  function startEdit(entry: { id: string; weight_grams: number; plant_count: number; destination: HarvestType | null }) {
    setEditingEntryId(entry.id);
    setEditWeight(String(entry.weight_grams));
    setEditPlants(String(entry.plant_count));
    setEditDest((entry.destination as HarvestType) ?? 'flower');
  }

  async function saveEdit(entryId: string) {
    const w = parseFloat(editWeight);
    const p = parseInt(editPlants);
    if (!(w > 0) || !(p >= 1)) return;
    setEditSaving(true);
    try {
      await updateEntry(entryId, { weight_grams: w, plant_count: p, destination: editDest });
      setEditingEntryId(null);
    } catch { /* stay in edit mode */ }
    finally { setEditSaving(false); }
  }

  const cumulativePlants = priorHarvestedPlants + totalPlants;
  const remaining = batch.totalPlants - cumulativePlants;
  const progress = batch.totalPlants > 0 ? Math.min(100, Math.round((cumulativePlants / batch.totalPlants) * 100)) : 0;
  const isComplete = cumulativePlants >= batch.totalPlants;

  const parsedWeight = parseFloat(weight);
  const parsedPlants = parseInt(plantCount);
  const canAdd = parsedWeight > 0 && parsedPlants >= 1 && parsedPlants <= remaining && !saving;

  const flowerWeight = entries.filter((e) => e.destination === 'flower' || e.destination === null).reduce((s, e) => s + Number(e.weight_grams), 0);
  const frozenWeight = entries.filter((e) => e.destination === 'fresh_frozen').reduce((s, e) => s + Number(e.weight_grams), 0);

  useEffect(() => {
    onTotalsUpdate(batch.batchRegistryId, totalWeight, totalPlants, flowerWeight, frozenWeight);
  }, [batch.batchRegistryId, totalWeight, totalPlants, flowerWeight, frozenWeight, onTotalsUpdate]);

  function handleStart() { setFormOpen(true); }

  async function handleAddEntry() {
    if (!canAdd) return;
    setSaving(true);
    setEntryError(null);
    setError(null);
    try {
      let currentSession = session;
      if (!currentSession) {
        setCreating(true);
        currentSession = await onStartBatch(batch.batchRegistryId);
        setCreating(false);
      }
      if (!session) {
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
    try { await removeEntry(entryId); } catch { /* silent */ }
  }

  return (
    <div
      className={`${GLASS} p-5 transition-all duration-300 ${
        isComplete ? 'border-emerald-500/20' :
        formOpen ? 'border-amber-500/15' : ''
      }`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: isComplete ? 'rgba(16,185,129,0.4)' : formOpen || priorHarvestedPlants > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Batch header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-mono text-sm font-bold">{batch.batchNumber}</span>
            <span className="text-sm text-white/60">{batch.strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-white/30">{batch.totalPlants} plants</span>
            {batch.groups.length > 1 && (
              <span className="text-[10px] text-white/20">({batch.groups.length} tables)</span>
            )}
            {totalWeight > 0 && (
              <>
                <span className="text-white/10">·</span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">{formatWeight(totalWeight)} recorded</span>
              </>
            )}
            {frozenWeight > 0 && (
              <>
                <span className="text-white/10">·</span>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold flex items-center gap-1">
                  <Snowflake className="w-3 h-3" />
                  {formatWeight(frozenWeight)} FF
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isComplete && (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </span>
          )}
          {!isComplete && entries.length > 0 && (
            <span className="rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
              Partial
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(formOpen || priorHarvestedPlants > 0) && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30">
              <span className="text-white/60 font-mono font-semibold">{cumulativePlants}</span>
              <span className="text-white/20"> / {batch.totalPlants} plants weighed</span>
              {priorHarvestedPlants > 0 && <span className="text-white/20 ml-1">({priorHarvestedPlants} prior)</span>}
              {remaining > 0 && <span className="text-amber-400/70 font-semibold ml-2">{remaining} remaining</span>}
            </span>
            <span className="text-[10px] text-white/30 font-mono font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-emerald-500/60' : 'bg-amber-500/60'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Start weighing button */}
      {!formOpen && !isComplete && (
        <div className="mt-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={creating}
            className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/[0.08] hover:text-white/60 active:scale-95 transition-all"
          >
            <Scale className="w-4 h-4" />
            Start Weighing
          </button>
        </div>
      )}

      {/* Weight entries list */}
      {entries.length > 0 && (
        <div className="mt-4">
          <span className="text-[10px] text-white/20 uppercase tracking-wider">
            Entries ({entries.length})
          </span>
          <div className="mt-1.5 space-y-1">
            {entries.map((entry, idx) => (
              editingEntryId === entry.id ? (
                /* Inline edit mode */
                <div key={entry.id} className={`${GLASS_NESTED} p-3`}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[9px] text-white/20 uppercase tracking-wider mb-0.5">Weight (g)</label>
                      <input type="number" min="0.1" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-1.5 text-sm text-white font-mono" />
                    </div>
                    <div className="w-20">
                      <label className="block text-[9px] text-white/20 uppercase tracking-wider mb-0.5">Plants</label>
                      <input type="number" min="1" step="1" value={editPlants} onChange={(e) => setEditPlants(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-1.5 text-sm text-white font-mono" />
                    </div>
                    <div className="w-24">
                      <label className="block text-[9px] text-white/20 uppercase tracking-wider mb-0.5">Dest</label>
                      <select value={editDest} onChange={(e) => setEditDest(e.target.value as HarvestType)}
                        className="w-full glass-input rounded-lg px-2 py-1.5 text-[10px] text-white uppercase tracking-wider">
                        <option value="flower">Flower</option>
                        <option value="fresh_frozen">Frozen</option>
                      </select>
                    </div>
                    <button onClick={() => saveEdit(entry.id)} disabled={editSaving} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingEntryId(null)} disabled={editSaving} className="p-1.5 text-white/20 hover:text-white/40 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs group ${
                    idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/15 font-mono text-[10px] w-4 text-right">{idx + 1}.</span>
                    <span className="text-white/80 font-mono font-semibold">{formatWeight(Number(entry.weight_grams))}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-white/50">{entry.plant_count} plant{entry.plant_count !== 1 ? 's' : ''}</span>
                    {entry.destination && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-lg uppercase tracking-wider font-bold border ${
                        entry.destination === 'fresh_frozen'
                          ? 'border-cyan-500/20 text-cyan-400 bg-cyan-500/10'
                          : 'border-emerald-500/20 text-emerald-300 bg-emerald-500/10'
                      }`}>
                        {entry.destination === 'fresh_frozen' ? 'FF' : 'FLW'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(entry)} className="text-white/10 hover:text-amber-400 transition-colors p-1 opacity-0 group-hover:opacity-100"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleRemoveEntry(entry.id)} className="text-white/10 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Inline weight entry form */}
      {formOpen && remaining > 0 && (
        <div className={`mt-4 ${GLASS_NESTED} p-3`}>
          {entryError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {entryError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Weight (g)</label>
              <input type="number" min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 1200"
                className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-white/15" />
            </div>
            <div className="w-24">
              <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Plants</label>
              <input type="number" min="1" max={remaining} step="1" value={plantCount} onChange={(e) => setPlantCount(e.target.value)} placeholder={String(Math.min(5, remaining))}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-white/15" />
            </div>
            <div className="w-28">
              <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Dest</label>
              <select value={destination} onChange={(e) => setDestination(e.target.value as HarvestType)}
                className="w-full glass-input rounded-xl px-2.5 py-2.5 text-[10px] text-white uppercase tracking-wider">
                <option value="flower">Flower</option>
                <option value="fresh_frozen">Frozen</option>
              </select>
            </div>
            <button
              onClick={handleAddEntry}
              disabled={!canAdd}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/20 px-4 py-2.5 text-xs font-semibold active:scale-95 transition-all disabled:opacity-20"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Waste input */}
      {formOpen && entries.length > 0 && (
        <div className="mt-3">
          {!showWaste ? (
            <button onClick={() => setShowWaste(true)} className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-white/40 transition-colors uppercase tracking-wider">
              <Plus className="w-3 h-3" /> Add Waste
            </button>
          ) : (
            <div className={`flex items-end gap-3 ${GLASS_NESTED} p-3`}>
              <div>
                <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">
                  Waste (g) <span className="normal-case text-white/15">— stems, leaves, etc.</span>
                </label>
                <input type="number" min="0" step="0.1" value={wasteGrams || ''} onChange={(e) => onWasteChange(batch.batchRegistryId, parseFloat(e.target.value) || 0)} placeholder="0"
                  className="w-36 glass-input rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-white/15" />
              </div>
              {wasteGrams === 0 && (
                <button onClick={() => setShowWaste(false)} className="text-white/15 hover:text-white/30 transition-colors p-2"><Minus className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
