import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useHarvestSessions,
  useBinningSessions,
  useDryRooms,
} from '../hooks';
import { HarvestWorkflow } from './harvest';
import { binningSessionsService as binningService } from '../services/binningSessions.service';
import type { HarvestSession, DryRoom } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

function timeAgoLabel(dateStr: string): string {
  const d = daysAgo(dateStr);
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function getStrainName(s: HarvestSession): string {
  return s.plant_groups?.strains?.name ?? 'Unknown';
}

function getRoomCode(s: HarvestSession): string {
  return s.plant_groups?.grow_rooms?.room_code ?? s.grow_rooms?.room_code ?? '—';
}

function getWetWeight(s: HarvestSession): number {
  return s.adjusted_weight_grams ?? s.wet_weight_grams ?? 0;
}

// ─── Component ───────────────────────────────────────────────────────

export function HarvestPipeline() {
  const {
    sessions: harvestSessions,
    loading: harvestLoading,
    finalizeHarvest,
    reload: reloadHarvests,
  } = useHarvestSessions();

  const {
    unbinnedHarvests,
    loading: binningLoading,
    createSession: createBinningSession,
    reload: reloadBinning,
  } = useBinningSessions();

  const { activeRooms, loading: roomsLoading } = useDryRooms();

  const [showHarvestWorkflow, setShowHarvestWorkflow] = useState(false);
  const [routePopoverId, setRoutePopoverId] = useState<string | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [dryRoomContents, setDryRoomContents] = useState<Map<string, HarvestSession[]>>(new Map());
  const [showCompleted, setShowCompleted] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // ─── Incoming harvests: active + unbinned completed/finalized ──────

  const activeHarvests = harvestSessions.filter(
    (s) => s.session_status === 'active'
  );

  // Combine: active harvests (not yet completed) + finalized harvests not yet in binning
  const incomingHarvests = [
    ...activeHarvests,
    ...unbinnedHarvests,
  ];

  // ─── Dry room contents ─────────────────────────────────────────────

  const loadDryRoomContents = useCallback(async () => {
    if (activeRooms.length === 0) return;
    const map = new Map<string, HarvestSession[]>();
    for (const room of activeRooms) {
      try {
        const harvests = await binningService.listHarvestSessionsByDryRoom(room.id);
        map.set(room.id, harvests);
      } catch {
        map.set(room.id, []);
      }
    }
    setDryRoomContents(map);
  }, [activeRooms]);

  useEffect(() => {
    loadDryRoomContents();
  }, [loadDryRoomContents, reloadTrigger]);

  // ─── Completed harvests (last 30 days) ─────────────────────────────

  const completedHarvests = harvestSessions.filter((s) => {
    if (s.session_status !== 'finalized' && s.session_status !== 'completed') return false;
    const d = daysAgo(s.harvest_date);
    return d <= 30;
  });

  // ─── Actions ───────────────────────────────────────────────────────

  async function handleRouteToRoom(harvestId: string, dryRoomId: string) {
    try {
      await finalizeHarvest(harvestId, dryRoomId);
      setRoutePopoverId(null);
      setReloadTrigger((t) => t + 1);
      await Promise.all([reloadHarvests(), reloadBinning()]);
    } catch (e) {
      console.error('Failed to route harvest:', e);
    }
  }

  async function handleStartBinning(harvest: HarvestSession, dryRoomId: string) {
    try {
      await createBinningSession({
        harvest_session_id: harvest.id,
        dry_room_id: dryRoomId,
        batch_registry_id: harvest.batch_registry_id,
        bin_date: new Date().toISOString().split('T')[0],
      });
      setReloadTrigger((t) => t + 1);
      await Promise.all([reloadHarvests(), reloadBinning()]);
    } catch (e) {
      console.error('Failed to start binning:', e);
    }
  }

  const loading = harvestLoading || binningLoading || roomsLoading;

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Harvests &amp; Drying
          </h1>
          <p className="text-xs text-white/40 mt-0.5">Dry rooms and active harvests</p>
        </div>
        <button
          onClick={() => setShowHarvestWorkflow(true)}
          className="rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/20 px-4 py-2 text-xs font-medium active:scale-95 transition-transform"
        >
          + Start Harvest
        </button>
      </div>

      {/* ─── Harvest Workflow Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showHarvestWorkflow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HarvestWorkflow onClose={() => setShowHarvestWorkflow(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Section 1: INCOMING ─────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">
          Incoming
        </h2>

        {loading ? (
          <div className="text-[10px] text-white/15">Loading...</div>
        ) : incomingHarvests.length === 0 ? (
          <div className="text-[10px] text-white/15">No pending harvests</div>
        ) : (
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {incomingHarvests.map((harvest) => (
              <motion.div
                key={harvest.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 flex items-center gap-3 relative"
              >
                <div className="w-2 h-8 rounded-full bg-amber-500/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/60">{getRoomCode(harvest)}</span>
                    <span className="text-xs text-white/40">{getStrainName(harvest)}</span>
                  </div>
                  <div className="text-[10px] text-white/25 mt-0.5">
                    {gramsToLbs(getWetWeight(harvest))} lbs &middot; {timeAgoLabel(harvest.harvest_date)}
                  </div>
                </div>

                {harvest.session_status === 'active' ? (
                  <span className="text-[10px] px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300/60 border border-amber-500/10">
                    In Progress
                  </span>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setRoutePopoverId(routePopoverId === harvest.id ? null : harvest.id)
                      }
                      className="text-[10px] px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20 active:scale-95 transition-transform whitespace-nowrap"
                    >
                      Route to Dry Room &rarr;
                    </button>

                    {/* Dry room popover */}
                    <AnimatePresence>
                      {routePopoverId === harvest.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 min-w-[140px]"
                        >
                          {activeRooms.map((room) => (
                            <button
                              key={room.id}
                              onClick={() => handleRouteToRoom(harvest.id, room.id)}
                              className="w-full text-left text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors"
                            >
                              {room.room_code}
                            </button>
                          ))}
                          {activeRooms.length === 0 && (
                            <div className="text-[10px] text-white/20 px-3 py-2">No dry rooms</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ─── Section 2: DRY ROOMS ────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">
          Dry Rooms
        </h2>

        <AnimatePresence mode="wait">
          {expandedRoomId ? (
            <ExpandedDryRoom
              key="expanded"
              room={activeRooms.find((r) => r.id === expandedRoomId)!}
              contents={dryRoomContents.get(expandedRoomId) ?? []}
              onBack={() => setExpandedRoomId(null)}
              onStartBinning={(harvest) =>
                handleStartBinning(harvest, expandedRoomId)
              }
            />
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {activeRooms.map((room, i) => {
                const contents = dryRoomContents.get(room.id) ?? [];
                const hasContents = contents.length > 0;
                const totalWetGrams = contents.reduce(
                  (sum, h) => sum + getWetWeight(h),
                  0
                );
                const capacityLbs = room.capacity_lbs ?? 0;
                const totalWetLbs = totalWetGrams / 453.592;
                const capacityPct = capacityLbs > 0 ? Math.min(100, (totalWetLbs / capacityLbs) * 100) : 0;

                // Unique strains
                const strains = contents.map((h) => ({
                  name: getStrainName(h),
                  daysHanging: daysAgo(h.harvest_date),
                }));

                if (hasContents) {
                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setExpandedRoomId(room.id)}
                      className="col-span-2 row-span-2 rounded-2xl border bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-5 cursor-pointer active:scale-[0.97] transition-transform"
                      style={{
                        borderColor: '#8B5CF640',
                        boxShadow: '0 0 20px #8B5CF615',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xl font-bold text-white/80">
                          {room.room_code}
                        </span>
                      </div>

                      {/* Capacity bar */}
                      {capacityLbs > 0 && (
                        <div className="mb-4">
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500/60 transition-all"
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-white/25 mt-1">
                            {Math.round(capacityPct)}% capacity
                          </div>
                        </div>
                      )}

                      {/* Strains hanging */}
                      <div className="space-y-1.5 mb-3">
                        {strains.map((s, j) => (
                          <div key={j} className="flex items-center justify-between">
                            <span className="text-xs text-white/60">{s.name}</span>
                            <span className="text-[10px] text-white/25">
                              Day {s.daysHanging} hanging
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer summary */}
                      <div className="text-[10px] text-white/25">
                        {strains.length} strain{strains.length !== 1 ? 's' : ''} &middot;{' '}
                        {gramsToLbs(totalWetGrams)} lbs wet
                      </div>
                    </motion.div>
                  );
                }

                // Empty room
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="col-span-1 rounded-2xl border-dashed border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col items-center justify-center min-h-[120px]"
                  >
                    <span className="font-mono text-sm font-bold text-white/30 mb-1">
                      {room.room_code}
                    </span>
                    <span className="text-xs text-white/20">Available</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ─── Section 3: COMPLETED ────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1 active:scale-95 transition-transform"
        >
          Completed (last 30 days)
          <span className="text-white/20">{showCompleted ? '▾' : '▸'}</span>
        </button>

        <AnimatePresence>
          {showCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {completedHarvests.length === 0 ? (
                <div className="text-[10px] text-white/15">No completed harvests in the last 30 days</div>
              ) : (
                <div className="space-y-1">
                  {completedHarvests.map((h) => {
                    const wetG = getWetWeight(h);
                    const batchNum = h.batch_registry?.batch_number ?? '—';
                    return (
                      <div
                        key={h.id}
                        className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 flex items-center gap-3 text-[10px]"
                      >
                        <span className="text-white/50 font-medium">{getStrainName(h)}</span>
                        <span className="text-white/25">{batchNum}</span>
                        <span className="text-white/25">{gramsToLbs(wetG)} lbs wet</span>
                        <span className="text-white/20 ml-auto">
                          {new Date(h.harvest_date).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Expanded Dry Room Detail
// ═══════════════════════════════════════════════════════════════════════

function ExpandedDryRoom({
  room,
  contents,
  onBack,
  onStartBinning,
}: {
  room: DryRoom;
  contents: HarvestSession[];
  onBack: () => void;
  onStartBinning: (harvest: HarvestSession) => void;
}) {
  const capacityLbs = room.capacity_lbs ?? 0;
  const totalWetGrams = contents.reduce((sum, h) => sum + getWetWeight(h), 0);
  const totalWetLbs = totalWetGrams / 453.592;
  const capacityPct = capacityLbs > 0 ? Math.min(100, (totalWetLbs / capacityLbs) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <button
        onClick={onBack}
        className="text-xs text-white/40 hover:text-white/60 active:scale-95 transition-all"
      >
        &larr; Back
      </button>

      <div
        className="rounded-2xl border bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-5"
        style={{
          borderColor: '#8B5CF640',
          boxShadow: '0 0 20px #8B5CF615',
        }}
      >
        <h2 className="font-mono text-xl font-bold text-white/80 mb-1">{room.room_code}</h2>

        {capacityLbs > 0 && (
          <div className="mb-4">
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500/60 transition-all"
                style={{ width: `${capacityPct}%` }}
              />
            </div>
            <div className="text-[10px] text-white/25 mt-1">
              {gramsToLbs(totalWetGrams)} / {capacityLbs} lbs &middot; {Math.round(capacityPct)}% capacity
            </div>
          </div>
        )}

        {contents.length === 0 ? (
          <div className="text-xs text-white/20 py-4 text-center">No material hanging</div>
        ) : (
          <div className="space-y-3">
            {contents.map((harvest) => (
              <div
                key={harvest.id}
                className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70 font-medium">
                    {getStrainName(harvest)}
                  </span>
                  <span className="text-[10px] text-white/25">
                    Day {daysAgo(harvest.harvest_date)} hanging
                  </span>
                </div>
                <div className="text-[10px] text-white/25 mb-3">
                  Harvested from {getRoomCode(harvest)} &middot;{' '}
                  {new Date(harvest.harvest_date).toLocaleDateString()} &middot;{' '}
                  {gramsToLbs(getWetWeight(harvest))} lbs wet
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => alert('Dry weight recording coming soon.')}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/40 border border-white/[0.06] active:scale-95 transition-transform"
                  >
                    Record Dry Weight
                  </button>
                  <button
                    onClick={() => onStartBinning(harvest)}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 active:scale-95 transition-transform"
                  >
                    Start Binning
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
