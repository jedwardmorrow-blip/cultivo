/**
 * Command Center — Cultivation operational hub
 *
 * Design system: Liquid Glass + Bento Grid
 * Philosophy: "Less enterprise SaaS, more Tesla touchscreen"
 * See context DB: cultops_design_philosophy, design_language_master
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, ClipboardList, AlertTriangle, Plus,
  CheckCircle2, Clock, ChevronLeft, X,
} from 'lucide-react';
import { useRoomOperationalState, type RoomOperationalState } from '../hooks/useRoomOperationalState';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useFeedProgramRecipe } from '../hooks/useFeedProgramRecipe';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { cultivationService } from '../services';
import { getTaskTypeConfig } from '../types';
import type { DailyTaskInstance, PlantGroup, RoomTable, SplitAndMoveInput, SplitAndMoveMultiInput, StrainCount } from '../types';
import type { SectionOccupancy } from '../types';
import type { TaskCardData } from './TaskCard';
import { TaskCompletionForm } from './TaskCompletionForm';
import { MoveToRoomModal } from './MoveToRoomModal';
import { todayIso } from '../utils/dateUtils';

// ═══════════════════════════════════════════════════════════════
// Design tokens — Liquid Glass
// ═══════════════════════════════════════════════════════════════

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_ELEVATED = 'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
const GLASS_TILE = 'rounded-2xl border border-white/[0.07] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]';
const GLASS_HOVER = 'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
const GLASS_EMPTY = 'rounded-2xl border border-white/[0.04] bg-white/[0.02]';

// Page background gradient — gives glass something to blur against
const PAGE_BG = 'bg-gradient-to-br from-[#0a0f0a] via-[#080a08] to-[#060808]';

// Brand gold accent
const GOLD = '#D4A843';

// Stage color mapping — room type drives the glass tint
const STAGE_COLORS: Record<string, { base: string; glow: string }> = {
  flower: { base: '#F43F5E', glow: 'rgba(244,63,94,' },   // rose
  veg:    { base: '#10B981', glow: 'rgba(16,185,129,' },   // emerald
  clone:  { base: '#0EA5E9', glow: 'rgba(14,165,233,' },   // sky
  mother: { base: '#F59E0B', glow: 'rgba(245,158,11,' },   // amber
  mixed:  { base: '#8B5CF6', glow: 'rgba(139,92,246,' },   // purple
};

function getStageColor(roomType: string) {
  return STAGE_COLORS[roomType] ?? STAGE_COLORS.mixed;
}

function statusColor(urgency: number): string {
  if (urgency >= 3) return '#ef4444';
  if (urgency >= 2) return '#f59e0b';
  if (urgency >= 1) return '#eab308';
  return '#10b981';
}

function statusRingStyle(urgency: number, isEmpty: boolean, roomType?: string): React.CSSProperties {
  if (isEmpty) return { borderColor: 'rgba(255,255,255,0.06)' };
  // Use stage color for calm rooms, urgency color for attention rooms
  const color = urgency >= 2 ? statusColor(urgency) : getStageColor(roomType ?? 'mixed').base;
  return {
    borderColor: color,
    boxShadow: urgency >= 3
      ? `0 0 14px ${color}90, 0 0 40px ${color}35, inset 0 0 10px ${color}20`
      : urgency >= 2
        ? `0 0 12px ${color}70, 0 0 30px ${color}25`
        : `0 0 8px ${color}40, 0 0 20px ${color}15`,
  };
}

// Tile glass tint — room type colors the glass surface
function tileBg(roomType: string, urgency: number, isEmpty: boolean): string {
  if (isEmpty) return 'rgba(255,255,255,0.012)';
  const stage = getStageColor(roomType);
  if (urgency >= 3) return 'rgba(239,68,68,0.08)';
  if (urgency >= 2) return 'rgba(245,158,11,0.06)';
  return `${stage.glow}0.04)`;
}

// Tile border — tinted by stage
function tileBorder(roomType: string, urgency: number, isEmpty: boolean): string {
  if (isEmpty) return 'rgba(255,255,255,0.03)';
  if (urgency >= 3) return 'rgba(239,68,68,0.2)';
  if (urgency >= 2) return 'rgba(245,158,11,0.15)';
  const stage = getStageColor(roomType);
  return `${stage.glow}0.1)`;
}

// Stagger animation variants
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const tileVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const expandVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

// ═══════════════════════════════════════════════════════════════
// SCREEN 1: Bento Room Tile
// ═══════════════════════════════════════════════════════════════

function RoomTile({ state, tasks, onClick }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  onClick: () => void;
}) {
  const isEmpty = state.occupancy_status === 'empty';
  const color = statusColor(state.urgency_score);
  const stage = getStageColor(state.room_type);
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const harvestDays = state.section_days_to_harvest ?? state.days_to_harvest;
  const roomTasks = tasks.filter(t => t.room_id === state.room_id);
  const doneTasks = roomTasks.filter(t => t.status === 'completed').length;
  const isLarge = state.urgency_score >= 2;

  return (
    <motion.button
      variants={tileVariants}
      type="button"
      onClick={isEmpty ? undefined : onClick}
      className={`${isEmpty ? GLASS_EMPTY : GLASS_TILE} ${isEmpty ? '' : GLASS_HOVER} text-left transition-all duration-300 active:scale-[0.97] ${
        isLarge ? 'col-span-2 row-span-2' : ''
      } relative overflow-hidden group`}
      style={{
        minHeight: isLarge ? '220px' : '130px',
        backgroundColor: tileBg(state.room_type, state.urgency_score, isEmpty),
        borderColor: tileBorder(state.room_type, state.urgency_score, isEmpty),
        cursor: isEmpty ? 'default' : 'pointer',
      }}
    >
      {/* Ambient glow — stage-colored light bleeding through glass */}
      {!isEmpty && (() => {
        const glowColor = state.urgency_score >= 2 ? color : stage.base;
        return (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              width: isLarge ? '160px' : '100px',
              height: isLarge ? '160px' : '100px',
              background: `radial-gradient(circle, ${glowColor}${isLarge ? '22' : '15'} 0%, ${glowColor}06 45%, transparent 70%)`,
              filter: 'blur(12px)',
            }}
          />
        );
      })()}

      <div className="relative p-4 flex flex-col h-full">
        {/* Header: code + status ring */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Status ring — stage-colored for calm, urgency-colored for alerts */}
            <div
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500"
              style={statusRingStyle(state.urgency_score, isEmpty, state.room_type)}
            >
              {state.urgency_score >= 3 && (
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {state.urgency_score < 3 && !isEmpty && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.urgency_score >= 2 ? color : stage.base, opacity: 0.7 }} />
              )}
            </div>
            <div>
              <span className="font-mono text-base font-bold text-white tracking-wide">{state.room_code}</span>
              <span className="text-[10px] uppercase tracking-widest ml-2" style={{ color: `${stage.base}80` }}>{state.room_type}</span>
            </div>
          </div>

          {/* Day counter */}
          {dayCount != null && (
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>D{dayCount}</span>
          )}
        </div>

        {/* Middle: plant info */}
        {!isEmpty && (
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold font-mono" style={{ color: GOLD }}>{state.total_plants}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">
              plants · {state.strain_count} strains
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="mt-3 flex-1 flex items-center">
            <span className="text-sm text-white/20">Empty</span>
          </div>
        )}

        {/* Footer: harvest + tasks */}
        {!isEmpty && (
          <div className="flex items-end justify-between mt-auto pt-3">
            {/* Harvest countdown */}
            {state.room_type === 'flower' && harvestDays != null ? (
              <span className={`text-xs font-medium ${
                harvestDays <= 0 ? 'text-red-400' : harvestDays <= 7 ? 'text-amber-400' : 'text-white/40'
              }`}>
                {harvestDays <= 0 ? `${Math.abs(harvestDays)}d overdue` : `${harvestDays}d to harvest`}
              </span>
            ) : (
              <span />
            )}

            {/* Task progress */}
            {roomTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {roomTasks.map((t, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: t.status === 'completed' ? '#10b981' :
                          t.status === 'in_progress' ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30 font-mono">{doneTasks}/{roomTasks.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Strain chips — large tiles only */}
        {isLarge && !isEmpty && state.strain_names && state.strain_names.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {state.strain_names.slice(0, 6).map(s => (
              <span key={s} className="text-[10px] text-white/50 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                {s}
              </span>
            ))}
            {state.strain_names.length > 6 && (
              <span className="text-[10px] text-white/30">+{state.strain_names.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Attention Strip
// ═══════════════════════════════════════════════════════════════

function AttentionStrip({ opsRooms, onRoomClick }: {
  opsRooms: RoomOperationalState[];
  onRoomClick: (code: string) => void;
}) {
  const items = useMemo(() => {
    return opsRooms
      .filter(r => r.urgency_score >= 1)
      .sort((a, b) => b.urgency_score - a.urgency_score)
      .map(r => {
        const harvestDays = r.section_days_to_harvest ?? r.days_to_harvest;
        let message = '';
        if (harvestDays !== null && harvestDays <= 0) message = `${Math.abs(harvestDays)}d overdue`;
        else if (harvestDays !== null && harvestDays <= 7) message = `Harvest in ${harvestDays}d`;
        else if (r.days_in_stage && r.days_in_stage > 30 && r.room_type === 'veg') message = `${r.days_in_stage}d in veg`;
        else if (r.urgency_score >= 2) message = 'Needs attention';
        else message = 'Watch';
        return { code: r.room_code, message, urgency: r.urgency_score };
      });
  }, [opsRooms]);

  if (items.length === 0) return null;

  return (
    <div className={`${GLASS} py-2.5 px-4 flex items-center gap-4 overflow-x-auto scrollbar-hide`}>
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      {items.map(item => (
        <button
          key={item.code}
          type="button"
          onClick={() => onRoomClick(item.code)}
          className="flex items-center gap-2 text-xs whitespace-nowrap hover:opacity-80 transition-opacity active:scale-95"
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(item.urgency) }} />
          <span className="font-mono font-semibold text-white">{item.code}</span>
          <span className={item.urgency >= 3 ? 'text-red-400' : 'text-amber-400'}>{item.message}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 2: Expanded Room View
// ═══════════════════════════════════════════════════════════════

function ExpandedRoomView({ state, tasks, groups, rooms, onUpdateTaskStatus, onCompleteWithLog, onAssignWorker, onMoveToRoom, onSplitAndMove, onSplitAndMoveMultiple, onBack }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  groups: PlantGroup[];
  rooms: Array<{ id: string; name: string; room_code: string; room_type: string; is_active: boolean; capacity_plants: number | null; created_at: string; created_by: string | null }>;
  onUpdateTaskStatus: (id: string, status: string) => void;
  onCompleteWithLog: (taskId: string, refTable: string, refId: string, duration: string | null) => void;
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
  onMoveToRoom: (groupId: string, toRoomId: string) => Promise<void>;
  onSplitAndMove: (input: SplitAndMoveInput) => Promise<void>;
  onSplitAndMoveMultiple: (input: SplitAndMoveMultiInput) => Promise<void>;
  onBack: () => void;
}) {
  const roomTasks = useMemo(() => tasks.filter(t => t.room_id === state.room_id), [tasks, state.room_id]);
  const roomGroups = useMemo(() => groups.filter(g => g.grow_room_id === state.room_id && g.growth_stage !== 'harvested'), [groups, state.room_id]);
  const [completingTask, setCompletingTask] = useState<DailyTaskInstance | null>(null);
  const [movingGroup, setMovingGroup] = useState<PlantGroup | null>(null);
  const [movingBatchGroups, setMovingBatchGroups] = useState<PlantGroup[] | undefined>(undefined);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const { staff: activeStaff } = useActiveStaff();
  const doneTasks = roomTasks.filter(t => t.status === 'completed').length;
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const harvestDays = state.section_days_to_harvest ?? state.days_to_harvest;
  const color = statusColor(state.urgency_score);
  const stage = getStageColor(state.room_type);
  const headerColor = state.urgency_score >= 2 ? color : stage.base;

  return (
    <motion.div {...expandVariants} className="space-y-4">
      {/* Room header */}
      <div className={`${GLASS_ELEVATED} p-5 relative overflow-hidden`}
        style={{ borderColor: `${headerColor}20` }}
      >
        {/* Background glow — stage-colored light through header glass */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${headerColor}18 0%, ${headerColor}06 40%, transparent 65%)`,
            filter: 'blur(16px)',
          }}
        />

        <div className="relative flex items-center gap-5">
          <button type="button" onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>

          {/* Status ring */}
          <div
            className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center"
            style={statusRingStyle(state.urgency_score, false, state.room_type)}
          >
            <span className="text-sm font-mono font-bold text-white">
              {state.room_type === 'flower' ? 'F' : state.room_type === 'veg' ? 'V' : state.room_type[0].toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-white">{state.room_code}</span>
              <span className="text-xs uppercase tracking-widest text-white/30">{state.room_type}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
              <span>{state.total_plants} plants</span>
              <span>{state.strain_count} strains</span>
              {dayCount != null && <span>Day {dayCount}</span>}
              {harvestDays != null && (
                <span className={harvestDays <= 0 ? 'text-red-400 font-medium' : harvestDays <= 7 ? 'text-amber-400' : ''}>
                  {harvestDays <= 0 ? `${Math.abs(harvestDays)}d overdue` : `${harvestDays}d to harvest`}
                </span>
              )}
            </div>
          </div>

          {/* Task counter */}
          <div className="text-right">
            <span className="text-3xl font-bold font-mono" style={{ color: GOLD }}>{doneTasks}/{roomTasks.length}</span>
            <p className="text-[10px] text-white/25 uppercase tracking-wider">tasks</p>
          </div>
        </div>
      </div>

      {/* Bento content grid — cards swap into main panel on tap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Left column (3/5) — main content area ── */}
        <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
          <AnimatePresence mode="wait">
            {focusedCard ? (
              <motion.div
                key={`main-${focusedCard}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`${GLASS} p-5 h-full flex flex-col`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
                    {focusedCard === 'room-layout' && 'Room Layout'}
                    {focusedCard === 'plant-groups' && `Plant Groups (${roomGroups.length})`}
                    {focusedCard === 'feed-recipe' && 'Feed Recipe'}
                    {focusedCard === 'room-info' && 'Room Info'}
                    {focusedCard === 'strains' && 'Strains'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFocusedCard(null)}
                    className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-3 h-3" /> Tasks
                  </button>
                </div>

                {focusedCard === 'room-layout' && (
                  <div className="flex-1 flex flex-col">
                    <RoomGrid roomId={state.room_id} inline expanded />
                  </div>
                )}
                {focusedCard === 'feed-recipe' && <FeedCardContent state={state} />}
                {focusedCard === 'room-info' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Plants', value: state.total_plants },
                      { label: 'Groups', value: state.plant_group_count },
                      { label: 'Day', value: dayCount ?? '—' },
                      { label: 'Strains', value: state.strain_count },
                      ...(state.earliest_flip_date ? [{ label: 'Flipped', value: state.earliest_flip_date }] : []),
                      ...(state.section_projected_harvest ? [{ label: 'Harvest', value: state.section_projected_harvest }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.04]">
                        <div className="text-[9px] text-white/20 uppercase tracking-wider">{label}</div>
                        <div className="text-lg font-semibold text-white/90 mt-1">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {focusedCard === 'strains' && state.strain_names && (
                  <div className="flex flex-wrap gap-2">
                    {state.strain_names.map(s => (
                      <span key={s} className="text-sm text-white/60 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">{s}</span>
                    ))}
                  </div>
                )}
                {focusedCard === 'plant-groups' && (
                  <div className="space-y-2">
                    {roomGroups.map(g => {
                      const batchNum = g.batch_registry?.batch_number;
                      const strainName = g.strains?.name ?? 'Unknown';
                      return (
                        <div key={g.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] group">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {batchNum && <span className="text-sm font-mono text-white/70">{batchNum}</span>}
                              <span className="text-xs text-white/30 uppercase">{g.growth_stage}</span>
                            </div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {strainName} · {g.plant_count} plants
                              {g.room_tables && <span> · T{g.room_tables.table_number}</span>}
                              {g.room_sections && <span> {g.room_sections.section_label}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const batchId = g.batch_registry_id;
                              const batchGroups = batchId ? roomGroups.filter(rg => rg.batch_registry_id === batchId) : undefined;
                              setMovingGroup(g);
                              setMovingBatchGroups(batchGroups && batchGroups.length > 1 ? batchGroups : undefined);
                            }}
                            className="text-xs text-white/25 hover:text-white/50 px-3 py-1.5 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Move
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="main-tasks"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`${GLASS} p-5 h-full`}
              >
                <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-4">Today's Tasks</h3>
                <TaskChecklist
                  tasks={roomTasks}
                  onUpdateStatus={onUpdateTaskStatus}
                  onOpenCompletion={(task) => setCompletingTask(task)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right column (2/5) — info cards, always visible ── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Tasks card (shows when a card is focused, lets you get back) */}
          {focusedCard && (
            <button
              type="button"
              onClick={() => setFocusedCard(null)}
              className={`${GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
            >
              <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Today's Tasks</h3>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>{roomTasks.filter(t => t.status === 'completed').length}/{roomTasks.length} done</span>
                {roomTasks.filter(t => t.status === 'in_progress').length > 0 && (
                  <span className="text-amber-400">{roomTasks.filter(t => t.status === 'in_progress').length} active</span>
                )}
              </div>
            </button>
          )}

          {/* Room Layout */}
          <button
            type="button"
            onClick={() => setFocusedCard(focusedCard === 'room-layout' ? null : 'room-layout')}
            className={`${focusedCard === 'room-layout' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
          >
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Room Layout</h3>
            {focusedCard !== 'room-layout' && <RoomGrid roomId={state.room_id} compact />}
            {focusedCard === 'room-layout' && <div className="text-[10px] text-white/20">Viewing in main panel</div>}
          </button>

          {/* Plant Groups */}
          {roomGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'plant-groups' ? null : 'plant-groups')}
              className={`${focusedCard === 'plant-groups' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
            >
              <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">
                Plant Groups <span className="text-white/15">({roomGroups.length})</span>
              </h3>
              {focusedCard !== 'plant-groups' && (
                <div className="space-y-1 max-h-[80px] overflow-hidden">
                  {roomGroups.slice(0, 3).map(g => (
                    <div key={g.id} className="text-[10px] text-white/40">
                      {g.batch_registry?.batch_number ?? g.strains?.name} · {g.plant_count}p
                    </div>
                  ))}
                  {roomGroups.length > 3 && <div className="text-[10px] text-white/20">+{roomGroups.length - 3} more</div>}
                </div>
              )}
              {focusedCard === 'plant-groups' && <div className="text-[10px] text-white/20">Viewing in main panel</div>}
            </button>
          )}

          {/* Feed Recipe */}
          <button
            type="button"
            onClick={() => setFocusedCard(focusedCard === 'feed-recipe' ? null : 'feed-recipe')}
            className={`${focusedCard === 'feed-recipe' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
          >
            {focusedCard !== 'feed-recipe' && <FeedCard state={state} />}
            {focusedCard === 'feed-recipe' && (
              <>
                <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Feed Recipe</h3>
                <div className="text-[10px] text-white/20">Viewing in main panel</div>
              </>
            )}
          </button>

          {/* Room Info */}
          <button
            type="button"
            onClick={() => setFocusedCard(focusedCard === 'room-info' ? null : 'room-info')}
            className={`${focusedCard === 'room-info' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
          >
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Room Info</h3>
            {focusedCard !== 'room-info' && (
              <div className="flex gap-4 text-xs text-white/40">
                <span>{state.total_plants}p</span>
                <span>{state.plant_group_count}g</span>
                <span>Day {dayCount ?? '—'}</span>
              </div>
            )}
            {focusedCard === 'room-info' && <div className="text-[10px] text-white/20">Viewing in main panel</div>}
          </button>

          {/* Strains */}
          {state.strain_names && state.strain_names.length > 0 && (
            <button
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'strains' ? null : 'strains')}
              className={`${focusedCard === 'strains' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-4 w-full text-left transition-all active:scale-[0.98]`}
            >
              <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Strains</h3>
              {focusedCard !== 'strains' && (
                <div className="flex flex-wrap gap-1">
                  {state.strain_names.slice(0, 4).map(s => (
                    <span key={s} className="text-[10px] text-white/40 px-2 py-0.5 rounded-full bg-white/5">{s}</span>
                  ))}
                  {state.strain_names.length > 4 && <span className="text-[10px] text-white/20">+{state.strain_names.length - 4}</span>}
                </div>
              )}
              {focusedCard === 'strains' && <div className="text-[10px] text-white/20">Viewing in main panel</div>}
            </button>
          )}
        </div>
      </div>

      {/* Task Completion Form modal */}
      {completingTask && (
        <TaskCompletionForm
          task={completingTask as unknown as TaskCardData}
          roomId={state.room_id}
          staffOptions={activeStaff?.map(s => ({ id: s.id, first_name: s.first_name })) ?? []}
          onAssignWorker={async (taskId, staffId) => { await onAssignWorker(taskId, staffId); }}
          onComplete={(refTable, refId, duration) => {
            onCompleteWithLog(completingTask.id, refTable, refId, duration);
            setCompletingTask(null);
          }}
          onNavigateHarvest={() => { /* TODO: inline harvest flow */ }}
          onNavigateClone={() => { /* TODO: inline clone flow */ }}
          onClose={() => setCompletingTask(null)}
        />
      )}

      {/* Move Plant Group modal */}
      {movingGroup && (
        <MoveToRoomModal
          group={movingGroup}
          groups={movingBatchGroups}
          rooms={rooms as any}
          onMove={async (toRoomId) => {
            await onMoveToRoom(movingGroup.id, toRoomId);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onSplitAndMove={async (input) => {
            await onSplitAndMove(input);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onSplitAndMoveMultiple={async (input) => {
            await onSplitAndMoveMultiple(input);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onCancel={() => {
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
        />
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Task Checklist
// ═══════════════════════════════════════════════════════════════

function TaskChecklist({ tasks, onUpdateStatus, onOpenCompletion }: {
  tasks: DailyTaskInstance[];
  onUpdateStatus: (id: string, status: string) => void;
  onOpenCompletion: (task: DailyTaskInstance) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, skipped: 3 };
    return [...tasks].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [tasks]);

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/20">No tasks scheduled today</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-1" variants={containerVariants} initial="hidden" animate="show">
      {sorted.map(task => {
        const config = getTaskTypeConfig(task.task_type);
        const isExpanded = expandedId === task.id;

        return (
          <motion.div key={task.id} variants={tileVariants}>
            {/* Task row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 text-left group"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.status === 'pending') onUpdateStatus(task.id, 'in_progress');
                  else if (task.status === 'in_progress') onUpdateStatus(task.id, 'completed');
                }}
                className="flex-shrink-0 active:scale-90 transition-transform duration-200"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : task.status === 'in_progress' ? (
                  <motion.div
                    className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20"
                    animate={{ borderColor: ['#f59e0b', '#fbbf24', '#f59e0b'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-white/15 group-hover:border-white/30 transition-colors" />
                )}
              </button>

              {/* Color accent */}
              <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />

              {/* Label */}
              <span className={`text-sm flex-1 transition-colors ${
                task.status === 'completed' ? 'text-white/25 line-through' :
                task.status === 'skipped' ? 'text-white/20 line-through' :
                'text-white/80'
              }`}>
                {config.label}
              </span>

              {/* Status hint */}
              {task.status === 'pending' && (
                <span className="text-[10px] text-white/15 opacity-0 group-hover:opacity-100 transition-opacity">tap to start</span>
              )}
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <TaskExpandedDetail task={task} onUpdateStatus={onUpdateStatus} onOpenCompletion={onOpenCompletion} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function TaskExpandedDetail({ task, onUpdateStatus, onOpenCompletion }: {
  task: DailyTaskInstance;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenCompletion: (task: DailyTaskInstance) => void;
}) {
  const hasForm = ['ipm_spray', 'batch_tank_mix', 'defoliation', 'cleaning', 'scouting', 'training', 'custom', 'saturation_check', 'irrigation_audit'].includes(task.task_type);

  return (
    <div className="ml-11 mb-2 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">{getTaskTypeConfig(task.task_type).label}</span>
        <div className="flex gap-2">
          {task.status === 'pending' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors active:scale-95"
            >
              Start
            </button>
          )}
          {(task.status === 'pending' || task.status === 'in_progress') && hasForm && (
            <button
              type="button"
              onClick={() => onOpenCompletion(task)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors active:scale-95"
            >
              Complete with Log
            </button>
          )}
          {(task.status === 'pending' || task.status === 'in_progress') && !hasForm && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'completed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors active:scale-95"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {task.notes && <p className="text-xs text-white/40">{task.notes}</p>}

      {task.task_type === 'batch_tank_mix' && <InlineTankMixRecipe />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Feed / Recipe Cards
// ═══════════════════════════════════════════════════════════════

function InlineTankMixRecipe() {
  const { recipe, loading } = useFeedProgramRecipe('flower', 60);

  if (loading) return <div className="h-16 rounded-lg bg-white/5 animate-pulse" />;
  if (!recipe) return <p className="text-[10px] text-white/20">No feed program configured.</p>;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/50">{recipe.program_name} · W{recipe.week_number}</span>
        {recipe.targets.target_ec && (
          <span className="text-xs font-mono text-emerald-400">EC {recipe.targets.target_ec}</span>
        )}
      </div>
      {recipe.entries.map((entry, i) => (
        <div key={i} className="flex justify-between text-[11px] py-1 px-2 rounded-lg bg-white/[0.03]">
          <span className="text-white/40">{entry.product.name}</span>
          <span className="text-white/60 font-mono">{entry.ml_per_gal} mL/gal</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Room Grid — table/section layout with occupancy
// ═══════════════════════════════════════════════════════════════

function RoomGrid({ roomId, compact, inline, expanded }: { roomId: string; compact?: boolean; inline?: boolean; expanded?: boolean }) {
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [occupancy, setOccupancy] = useState<Map<string, SectionOccupancy>>(new Map());
  const [loading, setLoading] = useState(true);

  useState(() => {
    Promise.all([
      cultivationService.listRoomTables(roomId),
      cultivationService.getSectionOccupancy(roomId),
    ]).then(([t, o]) => {
      setTables(t);
      setOccupancy(o);
    }).finally(() => setLoading(false));
  });

  const sortedTables = useMemo(() =>
    [...tables].filter(t => t.sections.length > 0).sort((a, b) => a.table_number - b.table_number),
    [tables]
  );

  const sectionLabels = useMemo(() => {
    const labels = new Set<string>();
    sortedTables.forEach(t => t.sections.forEach(s => labels.add(s.section_label)));
    return [...labels].sort();
  }, [sortedTables]);

  if (loading) return compact ? <div className="h-12 rounded-lg bg-white/[0.02] animate-pulse" /> : <div className={`${inline ? '' : GLASS + ' p-4'} h-32 animate-pulse`} />;
  if (sortedTables.length === 0) return compact ? <div className="text-[10px] text-white/20">No tables configured</div> : null;

  return (
    <div className={`${expanded ? 'flex-1 flex flex-col' : ''}`}>
      {!compact && !inline && <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">Room Layout</h3>}
      <div
        className={`grid ${expanded ? 'gap-1.5 flex-1' : 'gap-1'}`}
        style={{
          gridTemplateColumns: `32px repeat(${sectionLabels.length}, 1fr)`,
          ...(expanded ? { gridTemplateRows: `auto repeat(${sortedTables.length}, 1fr)` } : {}),
        }}
      >
        {/* Column headers */}
        <div />
        {sectionLabels.map(label => (
          <div key={label} className="text-center text-[9px] font-mono text-white/20 py-1">{label}</div>
        ))}

        {/* Rows */}
        {sortedTables.map(table => (
          <>
            <div key={`label-${table.table_number}`} className="flex items-center justify-center text-[9px] font-mono text-white/20">
              T{table.table_number}
            </div>
            {sectionLabels.map(sLabel => {
              const section = table.sections.find(s => s.section_label === sLabel);
              if (!section) {
                return <div key={`${table.table_number}-${sLabel}`} className={`${expanded ? 'min-h-[48px]' : 'min-h-[36px]'} rounded-lg bg-white/[0.02]`} />;
              }
              const occ = occupancy.get(section.id);
              const hasPlants = occ && occ.total_plants > 0;

              return (
                <div
                  key={`${table.table_number}-${sLabel}`}
                  className={`${compact ? 'min-h-[24px]' : expanded ? 'min-h-[48px]' : 'min-h-[36px]'} rounded-lg flex flex-col items-center justify-center ${
                    hasPlants
                      ? 'bg-emerald-500/8 border border-emerald-500/15'
                      : 'bg-white/[0.02] border border-white/[0.04]'
                  }`}
                >
                  {hasPlants && (
                    <>
                      <span className="text-[10px] font-mono text-emerald-400/70 font-bold">{occ.total_plants}</span>
                      {occ.strain_counts.slice(0, 2).map(s => (
                        <span key={s.abbreviation} className="text-[7px] text-white/25 leading-tight">{s.abbreviation}</span>
                      ))}
                      {occ.strain_counts.length > 2 && (
                        <span className="text-[7px] text-white/15">+{occ.strain_counts.length - 2}</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function FeedCardContent({ state }: { state: RoomOperationalState }) {
  const stage = state.dominant_stage ?? state.room_type;
  const days = state.days_since_flip ?? state.days_in_stage ?? 0;
  const { recipe, loading } = useFeedProgramRecipe(stage, days);

  if (loading) return <div className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />;
  if (!recipe) return <p className="text-[10px] text-white/20">No feed program configured.</p>;

  return (
    <>
      <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">Feed Recipe</h3>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/60">{recipe.program_name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{recipe.phase} · W{recipe.week_number}</span>
          {recipe.targets.target_ec && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              EC {recipe.targets.target_ec}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {recipe.entries.map((entry, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/20 font-mono w-3">{entry.mixing_order}</span>
              <span className="text-xs text-white/60">{entry.product.name}</span>
            </div>
            <span className="text-xs font-mono text-white/80">{entry.ml_per_gal}</span>
          </div>
        ))}
      </div>
      {recipe.targets.target_ph_min && recipe.targets.target_ph_max && (
        <div className="flex gap-4 mt-3 text-[10px] text-white/25">
          <span>pH {recipe.targets.target_ph_min}–{recipe.targets.target_ph_max}</span>
          {recipe.targets.target_ppm_500 && <span>PPM {recipe.targets.target_ppm_500}</span>}
        </div>
      )}
    </>
  );
}

function FeedCard({ state }: { state: RoomOperationalState }) {
  return <FeedCardContent state={state} />;
}

// ═══════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════

function GlassSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`${GLASS} animate-pulse ${i < 2 ? 'col-span-2 row-span-2' : ''}`}
            style={{ minHeight: i < 2 ? '200px' : '120px' }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Quick Add Task Modal — 3 taps: type → person → done
// ═══════════════════════════════════════════════════════════════

const QUICK_ADD_TYPES = ['batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning', 'training', 'maintenance', 'custom'] as const;

function QuickAddTask({ roomId, roomCode, staff, onAdd, onClose }: {
  roomId: string;
  roomCode: string;
  staff: Array<{ id: string; first_name: string }>;
  onAdd: (input: { room_id: string; task_type: string; task_date: string; assigned_to?: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'type' | 'assign'>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAssign(staffId: string | null) {
    if (!selectedType) return;
    setSaving(true);
    try {
      await onAdd({
        room_id: roomId,
        task_type: selectedType,
        task_date: todayIso(),
        assigned_to: staffId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-sm ${GLASS_ELEVATED} p-5 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {step === 'type' ? `Add task to ${roomCode}` : 'Assign to'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {step === 'type' && (
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ADD_TYPES.map(type => {
              const config = getTaskTypeConfig(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setSelectedType(type); setStep('assign'); }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 text-left"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                  <span className="text-xs text-white/70">{config.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 'assign' && (
          <div className="space-y-2">
            {/* Skip assignment option */}
            <button
              type="button"
              onClick={() => handleAssign(null)}
              disabled={saving}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 text-left"
            >
              <span className="text-xs text-white/40">Skip — leave unassigned</span>
            </button>
            {/* Staff list */}
            {staff.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAssign(s.id)}
                disabled={saving}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/60">
                  {s.first_name[0]}
                </div>
                <span className="text-sm text-white/70">{s.first_name}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Command Center
// ═══════════════════════════════════════════════════════════════

export function CommandCenter() {
  const { rooms: opsRooms, loading } = useRoomOperationalState();
  const { rooms: growRooms } = useGrowRooms();
  const { groups: allGroups, moveToRoom, splitAndMoveToRoom, splitAndMoveMultipleToRoom } = usePlantGroups({ stage: 'active' });
  const today = todayIso();
  const { tasks, updateStatus, completeWithLog, assignWorker, createTask } = useDailyTasks(today);
  const { staff: allStaff } = useActiveStaff();
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const selectedRoom = useMemo(
    () => selectedRoomCode ? opsRooms.find(r => r.room_code === selectedRoomCode) ?? null : null,
    [selectedRoomCode, opsRooms]
  );

  // Sort: urgent first, then by room code
  const sortedRooms = useMemo(() => {
    return [...opsRooms].sort((a, b) => {
      if (b.urgency_score !== a.urgency_score) return b.urgency_score - a.urgency_score;
      return a.room_code.localeCompare(b.room_code);
    });
  }, [opsRooms]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const handleRoomClick = useCallback((code: string) => {
    setSelectedRoomCode(code);
  }, []);

  const handleUpdateTaskStatus = useCallback((taskId: string, status: string) => {
    updateStatus(taskId, status as DailyTaskInstance['status']);
  }, [updateStatus]);

  if (loading) return <GlassSkeleton />;

  return (
    <div className={`min-h-screen ${PAGE_BG}`}>
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-base font-semibold text-white">Command Center</h1>
            <p className="text-[11px] text-white/30">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className={`${GLASS} px-3 py-1.5 flex items-center gap-2`}>
          <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-sm font-semibold text-white">{completedTasks}/{totalTasks}</span>
          <span className="text-[10px] text-white/30">done</span>
        </div>
      </div>

      {/* Attention strip */}
      <AttentionStrip opsRooms={opsRooms} onRoomClick={handleRoomClick} />

      {/* Main content */}
      <AnimatePresence mode="wait">
        {selectedRoom ? (
          <ExpandedRoomView
            key={`room-${selectedRoomCode}`}
            state={selectedRoom}
            tasks={tasks}
            groups={allGroups}
            rooms={growRooms}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onCompleteWithLog={(taskId, refTable, refId, duration) => completeWithLog(taskId, refTable, refId, duration)}
            onAssignWorker={async (taskId, staffId) => { await assignWorker(taskId, staffId); }}
            onMoveToRoom={async (groupId, toRoomId) => { await moveToRoom(groupId, toRoomId); }}
            onSplitAndMove={async (input) => { await splitAndMoveToRoom(input); }}
            onSplitAndMoveMultiple={async (input) => { await splitAndMoveMultipleToRoom(input); }}
            onBack={() => setSelectedRoomCode(null)}
          />
        ) : (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {sortedRooms.map(room => (
              <RoomTile
                key={room.room_id}
                state={room}
                tasks={tasks}
                onClick={() => handleRoomClick(room.room_code)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating add button — visible when a room is selected */}
      {selectedRoom && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center transition-colors active:scale-90 z-40"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Quick Add modal */}
      <AnimatePresence>
        {showQuickAdd && selectedRoom && (
          <QuickAddTask
            roomId={selectedRoom.room_id}
            roomCode={selectedRoom.room_code}
            staff={allStaff?.map(s => ({ id: s.id, first_name: s.first_name })) ?? []}
            onAdd={async (input) => { await createTask(input); }}
            onClose={() => setShowQuickAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
