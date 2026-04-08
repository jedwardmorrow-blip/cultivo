/**
 * Harvests & Drying Pipeline — Bento Split Layout
 *
 * Left (3/5): Incoming harvests grouped by room as accordion cards
 * Right (2/5): Dry room spatial tiles (always visible)
 * Design: Liquid Glass, stage-colored (amber incoming, violet drying)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Package } from 'lucide-react';
import {
  useHarvestSessions,
  useBinningSessions,
  useDryRooms,
} from '../hooks';
import { HarvestWorkflow } from './harvest';
import { binningSessionsService as binningService } from '../services/binningSessions.service';
import { BinEntryWorkspace } from './BinEntryWorkspace';
import { useBinEntryLabel, type BinLabelContext } from '../hooks/useBinEntryLabel';
import { supabase } from '@/lib/supabase';
import { formatWeight } from '../utils';
import type { HarvestSession } from '../types';

// ─── Design tokens ──────────────────────────────────────────────────

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_NESTED = 'rounded-xl bg-white/[0.04] border border-white/[0.06]';

const AMBER_GLOW = {
  borderColor: 'rgba(245,158,11,0.25)',
  boxShadow: '0 0 16px rgba(245,158,11,0.08)',
};

const VIOLET_GLOW = {
  borderColor: 'rgba(139,92,246,0.3)',
  boxShadow: '0 0 16px rgba(139,92,246,0.1)',
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Helpers ────────────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────

interface RoomGroup {
  roomCode: string;
  harvests: HarvestSession[];
  totalWeight: number;
  harvestDate: string;
  hasActive: boolean;
}

// ═════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════

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
  const [expandedRoomCode, setExpandedRoomCode] = useState<string | null>(null);
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<Set<string>>(new Set());
  const [expandedDryRoomId, setExpandedDryRoomId] = useState<string | null>(null);
  const [dryRoomContents, setDryRoomContents] = useState<Map<string, HarvestSession[]>>(new Map());
  const [showCompleted, setShowCompleted] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [routing, setRouting] = useState(false);

  // ─── Incoming harvests ─────────────────────────────────────────────

  const activeHarvests = harvestSessions.filter(
    (s) => s.session_status === 'active'
  );

  const incomingHarvests = useMemo(() => [
    ...activeHarvests,
    ...unbinnedHarvests,
  ], [activeHarvests, unbinnedHarvests]);

  // Group by room
  const roomGroups: RoomGroup[] = useMemo(() => {
    const map = new Map<string, HarvestSession[]>();
    for (const h of incomingHarvests) {
      const code = getRoomCode(h);
      const existing = map.get(code) ?? [];
      existing.push(h);
      map.set(code, existing);
    }
    return Array.from(map.entries()).map(([roomCode, harvests]) => ({
      roomCode,
      harvests,
      totalWeight: harvests.reduce((sum, h) => sum + getWetWeight(h), 0),
      harvestDate: harvests[0]?.harvest_date ?? '',
      hasActive: harvests.some(h => h.session_status === 'active'),
    })).sort((a, b) => a.roomCode.localeCompare(b.roomCode));
  }, [incomingHarvests]);

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

  // ─── Completed ─────────────────────────────────────────────────────

  const completedHarvests = harvestSessions.filter((s) => {
    if (s.session_status !== 'finalized' && s.session_status !== 'completed') return false;
    return daysAgo(s.harvest_date) <= 30;
  });

  // ─── Actions ───────────────────────────────────────────────────────

  async function handleRouteSelected(dryRoomId: string) {
    if (selectedHarvestIds.size === 0 || routing) return;
    setRouting(true);
    try {
      for (const harvestId of selectedHarvestIds) {
        const harvest = incomingHarvests.find(h => h.id === harvestId);
        if (!harvest) continue;

        if (harvest.session_status === 'active') {
          // Active harvest — finalize it (sets weights, routes to dry room)
          await finalizeHarvest(harvestId, dryRoomId);
        } else {
          // Already finalized — just route flower entries to the dry room
          await supabase
            .from('harvest_weight_entries')
            .update({ location_id: dryRoomId })
            .eq('harvest_session_id', harvestId)
            .eq('destination', 'flower');
        }
      }
      setSelectedHarvestIds(new Set());
      setExpandedRoomCode(null);
      setReloadTrigger((t) => t + 1);
      await Promise.all([reloadHarvests(), reloadBinning()]);
    } catch (e) {
      console.error('Failed to route harvests:', e);
    } finally {
      setRouting(false);
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

  function toggleHarvestSelection(id: string) {
    setSelectedHarvestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRoomExpand(roomCode: string) {
    if (expandedRoomCode === roomCode) {
      setExpandedRoomCode(null);
      setSelectedHarvestIds(new Set());
    } else {
      setExpandedRoomCode(roomCode);
      setSelectedHarvestIds(new Set());
    }
  }

  const loading = harvestLoading || binningLoading || roomsLoading;
  const hasSelections = selectedHarvestIds.size > 0;

  // ═════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Harvests &amp; Drying
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            {incomingHarvests.length} incoming &middot; {activeRooms.filter(r => (dryRoomContents.get(r.id) ?? []).length > 0).length} rooms active
          </p>
        </div>
        <button
          onClick={() => setShowHarvestWorkflow(true)}
          className="rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/20 px-4 py-2.5 text-xs font-medium active:scale-95 transition-transform"
        >
          + Start Harvest
        </button>
      </div>

      {/* Harvest Workflow Modal */}
      <AnimatePresence>
        {showHarvestWorkflow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HarvestWorkflow
              onComplete={() => {
                setShowHarvestWorkflow(false);
                setReloadTrigger((t) => t + 1);
                Promise.all([reloadHarvests(), reloadBinning()]);
              }}
              onCancel={() => setShowHarvestWorkflow(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bento Split: Incoming (3/5) + Dry Rooms (2/5) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Left: Incoming Harvests — room accordion */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Incoming
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : roomGroups.length === 0 ? (
            <div className={`${GLASS} p-8 text-center`}>
              <p className="text-sm text-white/30">No pending harvests</p>
              <p className="text-[10px] text-white/15 mt-1">Harvests appear here after they&apos;re started in Command Center.</p>
            </div>
          ) : (
            <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="visible">
              {roomGroups.map((group) => {
                const isExpanded = expandedRoomCode === group.roomCode;
                const routedCount = group.harvests.filter(h => h.session_status === 'finalized').length;
                const totalCount = group.harvests.length;
                const progressPct = totalCount > 0 ? (routedCount / totalCount) * 100 : 0;

                return (
                  <motion.div key={group.roomCode} variants={fadeUp}>
                    {/* Room card — collapsed */}
                    <button
                      type="button"
                      onClick={() => toggleRoomExpand(group.roomCode)}
                      className={`w-full text-left ${GLASS} p-5 transition-all duration-300 active:scale-[0.98] ${
                        isExpanded ? 'ring-1 ring-amber-500/20' : ''
                      }`}
                      style={AMBER_GLOW}
                    >
                      <div className="flex items-center gap-3">
                        {/* Amber accent bar */}
                        <div className="w-1.5 self-stretch rounded-full bg-amber-500/40 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-white/70">{group.roomCode}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300/70">
                              {totalCount} strain{totalCount !== 1 ? 's' : ''}
                            </span>
                            {group.hasActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 animate-pulse">
                                In Progress
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-white/40">{gramsToLbs(group.totalWeight)} lbs</span>
                            <span className="text-[10px] text-white/25">{timeAgoLabel(group.harvestDate)}</span>
                          </div>
                        </div>

                        {/* Progress bar (how many routed) */}
                        {progressPct > 0 && progressPct < 100 && (
                          <div className="w-16 flex-shrink-0">
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <ChevronDown className={`w-4 h-4 text-white/20 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded: strain list with selection */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 pb-1 space-y-1">
                            {group.harvests.map((harvest) => {
                              const isSelected = selectedHarvestIds.has(harvest.id);
                              const isActive = harvest.session_status === 'active';
                              const weight = getWetWeight(harvest);

                              return (
                                <button
                                  key={harvest.id}
                                  type="button"
                                  onClick={() => !isActive && toggleHarvestSelection(harvest.id)}
                                  disabled={isActive}
                                  className={`w-full flex items-center gap-3 px-4 py-3 ${GLASS_NESTED} transition-all duration-200 text-left ${
                                    isActive ? 'opacity-40' :
                                    isSelected ? 'bg-amber-500/10 border-amber-500/20' :
                                    'hover:bg-white/[0.06]'
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                    isActive ? 'border border-white/10' :
                                    isSelected ? 'bg-amber-500/30 border border-amber-400/40' :
                                    'border border-white/15'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-amber-300" />}
                                  </div>

                                  <span className="text-sm text-white/70 flex-1">{getStrainName(harvest)}</span>
                                  <span className="text-xs text-white/30 tabular-nums">{gramsToLbs(weight)} lbs</span>

                                  {isActive && (
                                    <span className="text-[9px] text-amber-300/60 uppercase tracking-wider">weighing</span>
                                  )}
                                </button>
                              );
                            })}

                            {/* Bulk action bar */}
                            <AnimatePresence>
                              {hasSelections && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  className="flex items-center justify-between p-3 mt-1 rounded-xl bg-violet-500/10 border border-violet-500/20"
                                >
                                  <span className="text-xs text-violet-300/80">
                                    {selectedHarvestIds.size} selected &middot; Tap a dry room to route &rarr;
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHarvestIds(new Set())}
                                    className="text-[10px] text-white/30 hover:text-white/50 transition-colors px-2"
                                  >
                                    Clear
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Completed (last 30 days) */}
          <div className="mt-6">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-[10px] font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-transform"
            >
              Completed (last 30 days)
              <span className="text-white/15">{showCompleted ? '▾' : '▸'}</span>
            </button>

            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  {completedHarvests.length === 0 ? (
                    <p className="text-[10px] text-white/15">No completed harvests in the last 30 days</p>
                  ) : (
                    <div className="space-y-1">
                      {completedHarvests.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 flex items-center gap-3 text-[10px]"
                        >
                          <span className="text-white/50 font-medium">{getStrainName(h)}</span>
                          <span className="text-white/25">{h.batch_registry?.batch_number ?? '—'}</span>
                          <span className="text-white/25">{gramsToLbs(getWetWeight(h))} lbs wet</span>
                          <span className="text-white/20 ml-auto">
                            {new Date(h.harvest_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Dry Room Tiles (always visible) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Dry Rooms
          </h2>

          <div className="space-y-3">
            {activeRooms.map((room, i) => {
              const contents = dryRoomContents.get(room.id) ?? [];
              const hasContents = contents.length > 0;
              const totalWetGrams = contents.reduce((sum, h) => sum + getWetWeight(h), 0);
              const capacityLbs = room.capacity_lbs ?? 0;
              const totalWetLbs = totalWetGrams / 453.592;
              const capacityPct = capacityLbs > 0 ? Math.min(100, (totalWetLbs / capacityLbs) * 100) : 0;
              const isExpanded = expandedDryRoomId === room.id;

              const strains = contents.map((h) => ({
                name: getStrainName(h),
                daysHanging: daysAgo(h.harvest_date),
                harvest: h,
              }));

              if (hasContents) {
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (hasSelections) {
                          handleRouteSelected(room.id);
                        } else {
                          setExpandedDryRoomId(isExpanded ? null : room.id);
                        }
                      }}
                      className={`w-full text-left ${GLASS} p-5 transition-all duration-300 active:scale-[0.98] ${
                        hasSelections ? 'ring-1 ring-violet-400/30 animate-pulse' : ''
                      }`}
                      style={VIOLET_GLOW}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-lg font-bold text-white/80">{room.room_code}</span>
                        <span className="text-[10px] text-violet-300/50">{strains.length} strain{strains.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Capacity bar */}
                      {capacityLbs > 0 && (
                        <div className="mb-3">
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500/60 transition-all duration-500"
                              style={{ width: `${capacityPct}%` }}
                            />
                          </div>
                          <div className="text-[9px] text-white/20 mt-1 tabular-nums">
                            {gramsToLbs(totalWetGrams)} / {capacityLbs} lbs &middot; {Math.round(capacityPct)}%
                          </div>
                        </div>
                      )}

                      {/* Strain list */}
                      <div className="space-y-1">
                        {strains.slice(0, isExpanded ? strains.length : 3).map((s, j) => (
                          <div key={j} className="flex items-center justify-between">
                            <span className="text-xs text-white/50">{s.name}</span>
                            <span className="text-[10px] text-white/20 tabular-nums">Day {s.daysHanging}</span>
                          </div>
                        ))}
                        {!isExpanded && strains.length > 3 && (
                          <span className="text-[10px] text-white/15">+{strains.length - 3} more</span>
                        )}
                      </div>

                      {hasSelections && (
                        <div className="mt-3 text-center text-[10px] text-violet-300/70 font-medium uppercase tracking-wider">
                          {routing ? 'Routing...' : 'Tap to Route Here'}
                        </div>
                      )}
                    </button>

                    {/* Expanded detail — progressive harvest cards */}
                    <AnimatePresence>
                      {isExpanded && !hasSelections && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-2">
                            {strains.map((s, j) => (
                              <DryRoomHarvestCard
                                key={s.harvest.id}
                                harvest={s.harvest}
                                strainName={s.name}
                                daysHanging={s.daysHanging}
                                dryRoomId={room.id}
                                onStartBinning={handleStartBinning}
                                onBinningComplete={async () => {
                                  setReloadTrigger((t) => t + 1);
                                  await Promise.all([reloadHarvests(), reloadBinning()]);
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }

              // Empty / available room
              return (
                <motion.button
                  key={room.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => hasSelections && handleRouteSelected(room.id)}
                  className={`w-full rounded-2xl border-dashed border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col items-center justify-center min-h-[100px] transition-all duration-300 ${
                    hasSelections
                      ? 'border-violet-400/30 bg-violet-500/[0.03] ring-1 ring-violet-400/15 animate-pulse cursor-pointer active:scale-[0.98]'
                      : ''
                  }`}
                >
                  <span className="font-mono text-sm font-bold text-white/30 mb-0.5">{room.room_code}</span>
                  <span className="text-[10px] text-white/15">
                    {hasSelections ? 'Tap to Route Here' : 'Available'}
                  </span>
                </motion.button>
              );
            })}

            {activeRooms.length === 0 && !loading && (
              <div className={`${GLASS} p-6 text-center`}>
                <p className="text-xs text-white/25">No dry rooms configured</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// DryRoomHarvestCard — States: hanging → binning → done
// Dry weight is derived from bin entry totals on session completion.
// ═════════════════════════════════════════════════════════════════════

function DryRoomHarvestCard({
  harvest,
  strainName,
  daysHanging,
  dryRoomId,
  onStartBinning,
  onBinningComplete,
}: {
  harvest: HarvestSession;
  strainName: string;
  daysHanging: number;
  dryRoomId: string;
  onStartBinning: (harvest: HarvestSession, dryRoomId: string) => Promise<void>;
  onBinningComplete: () => Promise<void>;
}) {
  const wetWeight = getWetWeight(harvest);
  const batchNumber = harvest.batch_registry?.batch_number ?? '—';
  const harvestDate = harvest.harvest_date;

  const [binningSessionId, setBinningSessionId] = useState<string | null>(null);
  const [showBinning, setShowBinning] = useState(false);
  const [startingBinning, setStartingBinning] = useState(false);

  // Check for existing binning session on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('binning_sessions')
        .select('id, session_status')
        .eq('harvest_session_id', harvest.id)
        .not('session_status', 'eq', 'cancelled')
        .limit(1);
      if (data && data.length > 0) {
        setBinningSessionId(data[0].id);
        if (data[0].session_status === 'active') setShowBinning(true);
      }
    })();
  }, [harvest.id]);

  const isBinningComplete = binningSessionId !== null && !showBinning;

  const labelContext: BinLabelContext | null = strainName !== 'Unknown'
    ? { strain: strainName, batchNumber, harvestDate }
    : null;

  // Stable service callbacks — must not be inline arrows or BinEntryWorkspace
  // will infinitely re-fetch (listBinEntries is a useCallback dep there).
  const stableListBinEntries = useCallback(
    (id: string) => binningService.listBinEntries(id),
    []
  );
  const stableAddBinEntry = useCallback(
    (input: { binning_session_id: string; bin_weight_grams: number; notes?: string }) =>
      binningService.createBinEntry(input),
    []
  );
  const stableRemoveBinEntry = useCallback(
    (id: string) => binningService.deleteBinEntry(id),
    []
  );
  const handleBinningComplete = useCallback(async () => {
    if (!binningSessionId) return;
    await binningService.completeBinningSession(binningSessionId);
    setShowBinning(false);
    await onBinningComplete();
  }, [binningSessionId, onBinningComplete]);

  const handleBinningCancel = useCallback(async () => {
    if (!binningSessionId) return;
    await binningService.cancelBinningSession(binningSessionId);
    setBinningSessionId(null);
    setShowBinning(false);
  }, [binningSessionId]);

  async function handleStartBinningClick() {
    if (binningSessionId) {
      setShowBinning(true);
      return;
    }
    setStartingBinning(true);
    try {
      await onStartBinning(harvest, dryRoomId);
      const { data } = await supabase
        .from('binning_sessions')
        .select('id')
        .eq('harvest_session_id', harvest.id)
        .not('session_status', 'eq', 'cancelled')
        .limit(1);
      if (data && data.length > 0) {
        setBinningSessionId(data[0].id);
        setShowBinning(true);
      }
    } finally {
      setStartingBinning(false);
    }
  }

  const borderColor = isBinningComplete
    ? 'rgba(16,185,129,0.25)'
    : showBinning
    ? 'rgba(139,92,246,0.3)'
    : 'rgba(255,255,255,0.06)';

  return (
    <div
      className={`${GLASS_NESTED} p-4 space-y-3 transition-all duration-300`}
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-white/70 font-medium">{strainName}</span>
          <span className="text-[10px] text-white/20 ml-2 font-mono">{batchNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {isBinningComplete && (
            <span className="text-[9px] px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 uppercase tracking-wider font-bold">
              Binned
            </span>
          )}
          <span className="text-[10px] text-white/20 tabular-nums">Day {daysHanging}</span>
        </div>
      </div>

      {/* Wet weight reference */}
      <div className="text-[10px] text-white/30">
        Wet: <span className="text-white/50 font-mono">{gramsToLbs(wetWeight)} lbs</span>
      </div>

      {/* Binning workspace */}
      {showBinning && binningSessionId && (
        <BinEntryWorkspace
          sessionId={binningSessionId}
          listBinEntries={stableListBinEntries}
          addBinEntry={stableAddBinEntry}
          removeBinEntry={stableRemoveBinEntry}
          onComplete={handleBinningComplete}
          onCancel={handleBinningCancel}
          wetWeight={wetWeight}
          labelContext={labelContext}
        />
      )}

      {/* Action */}
      {!showBinning && !isBinningComplete && (
        <button
          type="button"
          onClick={handleStartBinningClick}
          disabled={startingBinning}
          className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-30"
        >
          <Package className="w-3 h-3" />
          {startingBinning ? 'Starting...' : binningSessionId ? 'Continue Binning' : 'Start Binning'}
        </button>
      )}
    </div>
  );
}
