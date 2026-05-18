import { useState, useMemo, useRef, useEffect } from 'react';
import { AlertTriangle, Calendar, Plus, Sprout } from 'lucide-react';
import { useProductionPlanner, WEEKS_AFTER_CURRENT, WEEKS_AFTER_PLANNING } from '../hooks/useProductionPlanner';
import { RoomDetailCard } from './RoomDetailCard';
import { StrainStatsPanel } from './StrainStatsPanel';
import { PlannedCycleBar } from './PlannedCycleBar';
import { PlannedCycleForm } from './PlannedCycleForm';
import { ForecastSummaryPanel } from './ForecastSummaryPanel';
import { STAGE_HEX } from '../types';
import type { CalendarRoom, CalendarRoomStrain, StrainCultivationStats, CalendarPlannedEntry, MotherBatchGroupRow } from '../types';
import {
  ROOM_TYPE_DOT,
  ROOM_TYPE_LEFT_BORDER,
} from '@/features/cultivation/constants/stageColors';

const DAY_WIDTH = 8;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 120;
const HEADER_HEIGHT = 52;
const WEEKS_BEFORE = 4;
const DEFAULT_FLOWER_DAYS = 63;
const TURNOVER_DAYS = 3;
const MAX_GAP_SUGGESTIONS = 6;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDaysDate(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface WeekMarker {
  x: number;
  date: Date;
  label: string;
  isMonthStart: boolean;
}

interface CohortRenderBar {
  key: string;
  label: string;
  stage: string;
  plantCount: number;
  strainCount: number;
  startDate: Date;
  endDate: Date;
  daysInStage: number | null;
  isSynthetic: boolean;
  isQuarantined: boolean;
  strains: CalendarRoomStrain[];
}

interface FlowerGapSuggestion {
  key: string;
  room: CalendarRoom;
  start: Date;
  end: Date;
  days: number;
  source: 'open' | 'between' | 'after';
}

function buildCohortBars(room: CalendarRoom): CohortRenderBar[] {
  const groups = new Map<string, CohortRenderBar>();

  for (const strain of room.strains) {
    if (!strain.earliest_planted_date) continue;
    const key = strain.cohort_key ?? strain.batch_id ?? strain.strain_id;
    const startDate = new Date(strain.earliest_planted_date);
    const endDate = strain.estimated_harvest_date
      ? new Date(strain.estimated_harvest_date)
      : new Date(startDate.getTime() + 88 * 86400000);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        label: strain.cohort_label ?? strain.batch_code ?? strain.strain_name,
        stage: strain.growth_stage,
        plantCount: strain.plant_count,
        strainCount: 1,
        startDate,
        endDate,
        daysInStage: strain.days_in_stage,
        isSynthetic: Boolean(strain.is_synthetic),
        isQuarantined: Boolean(strain.is_quarantined),
        strains: [strain],
      });
      continue;
    }

    if (startDate < existing.startDate) existing.startDate = startDate;
    if (endDate > existing.endDate) existing.endDate = endDate;
    existing.plantCount += strain.plant_count;
    existing.strainCount += 1;
    existing.isSynthetic = existing.isSynthetic || Boolean(strain.is_synthetic);
    existing.isQuarantined = existing.isQuarantined || Boolean(strain.is_quarantined);
    existing.strains.push(strain);
  }

  return Array.from(groups.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function findFlowerCycleGaps(rooms: CalendarRoom[], today: Date, horizonEnd: Date): FlowerGapSuggestion[] {
  const earliestStart = startOfDay(today);
  const latestEnd = startOfDay(horizonEnd);
  const suggestions: FlowerGapSuggestion[] = [];

  for (const room of rooms) {
    if (room.room_type !== 'flower') continue;

    const intervals = [
      ...buildCohortBars(room).map((cohort) => ({
        start: startOfDay(cohort.startDate),
        end: startOfDay(cohort.endDate),
      })),
      ...(room.plannedCycles ?? []).map((plan) => ({
        start: startOfDay(new Date(plan.flower_start_date)),
        end: startOfDay(new Date(plan.estimated_harvest_date)),
      })),
    ]
      .filter((interval) => interval.end >= earliestStart && interval.start <= latestEnd)
      .map((interval) => ({
        start: interval.start < earliestStart ? earliestStart : interval.start,
        end: interval.end > latestEnd ? latestEnd : interval.end,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let cursor = earliestStart;
    let gapIndex = 0;

    for (const interval of intervals) {
      const gapStart = cursor;
      const gapEnd = addDaysDate(interval.start, -TURNOVER_DAYS);
      const gapDays = daysBetween(gapStart, gapEnd);
      if (gapDays >= DEFAULT_FLOWER_DAYS) {
        suggestions.push({
          key: `${room.room_id}-${gapIndex}`,
          room,
          start: gapStart,
          end: gapEnd,
          days: gapDays,
          source: cursor.getTime() === earliestStart.getTime() ? 'open' : 'between',
        });
        gapIndex++;
      }

      const nextCursor = addDaysDate(interval.end, TURNOVER_DAYS);
      if (nextCursor > cursor) cursor = nextCursor;
    }

    const finalGapDays = daysBetween(cursor, latestEnd);
    if (finalGapDays >= DEFAULT_FLOWER_DAYS) {
      suggestions.push({
        key: `${room.room_id}-${gapIndex}`,
        room,
        start: cursor,
        end: latestEnd,
        days: finalGapDays,
        source: intervals.length === 0 ? 'open' : 'after',
      });
    }
  }

  return suggestions
    .sort((a, b) => a.start.getTime() - b.start.getTime() || b.days - a.days || a.room.room_code.localeCompare(b.room.room_code))
    .slice(0, MAX_GAP_SUGGESTIONS);
}

export function ProductionPlannerView() {
  const {
    rooms,
    strainStats,
    strainStatsById,
    motherBatchGroups,
    harvestAlerts,
    loading,
    error,
    reload,
    reloadPlanned,
    viewMode,
    setViewMode,
  } = useProductionPlanner();

  const [selectedRoom, setSelectedRoom] = useState<CalendarRoom | null>(null);
  const [selectedStrain, setSelectedStrain] = useState<StrainCultivationStats | null>(null);
  const [planFormRoom, setPlanFormRoom] = useState<CalendarRoom | null>(null);
  const [editingCycle, setEditingCycle] = useState<CalendarPlannedEntry | null>(null);
  const [planFormFlowerStart, setPlanFormFlowerStart] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weeksAfter = viewMode === 'planning' ? WEEKS_AFTER_PLANNING : WEEKS_AFTER_CURRENT;
  const defaultPlanRoom = useMemo(() => {
    if (selectedRoom && selectedRoom.room_type !== 'mother') return selectedRoom;

    const flowerRooms = rooms.filter((room) => room.room_type === 'flower');
    return (
      flowerRooms.find((room) => room.total_plants === 0) ??
      flowerRooms[0] ??
      rooms.find((room) => room.room_type !== 'mother') ??
      rooms[0] ??
      null
    );
  }, [rooms, selectedRoom]);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = getMonday(today);
    d.setDate(d.getDate() - WEEKS_BEFORE * 7);
    return d;
  }, [today]);
  const totalDays = (WEEKS_BEFORE + weeksAfter) * 7;
  const totalWidth = totalDays * DAY_WIDTH;
  const horizonEnd = useMemo(() => addDaysDate(startDate, totalDays), [startDate, totalDays]);

  const todayX = daysBetween(startDate, today) * DAY_WIDTH;
  const flowerGaps = useMemo(
    () => findFlowerCycleGaps(rooms, today, horizonEnd),
    [horizonEnd, rooms, today]
  );

  const weeks = useMemo<WeekMarker[]>(() => {
    const result: WeekMarker[] = [];
    for (let w = 0; w < WEEKS_BEFORE + weeksAfter; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      result.push({
        x: w * 7 * DAY_WIDTH,
        date: d,
        label: formatShortDate(d),
        isMonthStart: d.getDate() <= 7,
      });
    }
    return result;
  }, [startDate, weeksAfter]);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = todayX - scrollRef.current.clientWidth / 3;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [todayX, loading]);

  function handleRoomClick(room: CalendarRoom) {
    setSelectedStrain(null);
    setSelectedRoom(room);
  }

  function handleStrainClick(strainId: string) {
    const stats = strainStatsById.get(strainId);
    if (stats) setSelectedStrain(stats);
  }

  function handleBack() {
    if (selectedStrain) {
      setSelectedStrain(null);
    } else {
      setSelectedRoom(null);
    }
  }

  function openPlanForm(room: CalendarRoom | null, flowerStartDate?: string | null) {
    if (!room) return;
    setViewMode('planning');
    setEditingCycle(null);
    setPlanFormFlowerStart(flowerStartDate ?? null);
    setPlanFormRoom(room);
  }

  function handlePlanCycleClick() {
    openPlanForm(defaultPlanRoom);
  }

  function handleAddPlan(room: CalendarRoom, e: React.MouseEvent) {
    e.stopPropagation();
    openPlanForm(room);
  }

  function handleBarClick(entry: CalendarPlannedEntry) {
    // Find the room that owns this entry to pass into the form
    const ownerRoom = rooms.find((r) =>
      r.plannedCycles?.some((p) => p.id === entry.id)
    );
    if (ownerRoom) {
      setEditingCycle(entry);
      setPlanFormFlowerStart(null);
      setPlanFormRoom(ownerRoom);
    }
  }

  function handleFormSave() {
    setPlanFormRoom(null);
    setEditingCycle(null);
    setPlanFormFlowerStart(null);
    reloadPlanned();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-cult-stage-flower mb-4">{error}</p>
        <button onClick={reload} className="px-4 py-2 bg-cult-accent text-cult-bg rounded font-medium">
          Retry
        </button>
      </div>
    );
  }

  const showPanel = selectedRoom !== null;
  const panelContent = selectedStrain ? (
    <StrainStatsPanel strain={selectedStrain} onBack={handleBack} />
  ) : selectedRoom ? (
    <RoomDetailCard room={selectedRoom} onStrainClick={handleStrainClick} onClose={() => setSelectedRoom(null)} />
  ) : null;

  return (
    <div className={`flex min-h-0 flex-col h-full font-sans ${viewMode === 'planning' ? 'pb-16' : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-cult-border sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Calendar className="w-5 h-5 text-cult-accent" />
          <h1 className="text-xl font-bold text-cult-text-primary">Production Planner</h1>
          <span className="text-sm text-cult-text-muted">
            {rooms.length} rooms &middot; {rooms.reduce((s, r) => s + r.total_plants, 0)} plants
          </span>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={handlePlanCycleClick}
            disabled={!defaultPlanRoom}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-cult-accent bg-cult-accent px-3 py-1.5 text-xs font-bold text-cult-bg transition-colors hover:bg-cult-accent/90 disabled:cursor-not-allowed disabled:border-cult-border disabled:bg-cult-surface disabled:text-cult-text-muted"
            title={defaultPlanRoom ? `Plan cycle in ${defaultPlanRoom.room_code}` : 'No grow room available to plan'}
          >
            <Plus className="h-3.5 w-3.5" />
            Plan a Cycle
          </button>

          {/* View mode toggle */}
          <div className="flex shrink-0 items-center gap-1 bg-cult-surface border border-cult-border rounded p-1">
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                viewMode === 'current'
                  ? 'bg-cult-accent text-cult-bg'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              Current State
            </button>
            <button
              onClick={() => setViewMode('planning')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                viewMode === 'planning'
                  ? 'bg-cult-accent text-cult-bg'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              Planning Mode
            </button>
          </div>
        </div>
      </div>

      {/* Planning mode banner */}
      {viewMode === 'planning' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 bg-cult-surface border-b border-cult-border text-xs text-cult-text-secondary">
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-dashed border-cult-accent bg-cult-accent/20 flex-shrink-0" />
            <span className="truncate">
              Planning Mode · 26-week horizon · select a room, use row PLAN controls, or start here
            </span>
          </div>
          <button
            type="button"
            onClick={handlePlanCycleClick}
            disabled={!defaultPlanRoom}
            className="inline-flex items-center gap-1.5 whitespace-nowrap border border-cult-accent/70 bg-cult-accent/15 px-2.5 py-1 text-[11px] font-bold text-cult-accent transition-colors hover:bg-cult-accent hover:text-cult-bg disabled:cursor-not-allowed disabled:border-cult-border disabled:bg-cult-surface disabled:text-cult-text-muted"
            title={defaultPlanRoom ? `Plan cycle in ${defaultPlanRoom.room_code}` : 'No grow room available to plan'}
          >
            <Plus className="h-3 w-3" />
            Plan a Cycle
            {defaultPlanRoom && (
              <span className="font-medium text-current/70">
                {defaultPlanRoom.room_code}
              </span>
            )}
          </button>
        </div>
      )}

      {motherBatchGroups.length > 0 && (
        <MotherBatchGroupSummary groups={motherBatchGroups} />
      )}

      {/* Harvest Alerts */}
      {harvestAlerts.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-cult-surface border-b border-cult-border">
          <div className="h-6 w-1.5 bg-cult-stage-harvest rounded-sm flex-shrink-0" />
          <AlertTriangle className="w-4 h-4 text-cult-stage-harvest flex-shrink-0" />
          <div className="flex gap-4 overflow-x-auto text-sm">
            {harvestAlerts.map((a, i) => (
              <span key={i} className="whitespace-nowrap text-cult-text-primary">
                <span className="font-semibold">{a.room_code}</span>
                <span className="text-cult-text-secondary mx-1">{a.strain_name}</span>
                <span className="font-medium">
                  {a.days_until === 0 ? 'today' : `${a.days_until}d`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content: calendar + optional panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="relative" style={{ width: LABEL_WIDTH + totalWidth, minHeight: HEADER_HEIGHT + rooms.length * ROW_HEIGHT }}>
              {/* Week headers */}
              <div className="sticky top-0 z-10 flex bg-cult-bg border-b border-cult-border" style={{ height: HEADER_HEIGHT }}>
                <div className="flex-shrink-0 border-r border-cult-border bg-cult-bg" style={{ width: LABEL_WIDTH }} />
                <div className="relative" style={{ width: totalWidth }}>
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-l ${w.isMonthStart ? 'border-cult-border-strong' : 'border-cult-border/50'}`}
                      style={{ left: w.x }}
                    >
                      <span className={`absolute top-1 left-1 text-xs ${w.isMonthStart ? 'text-cult-text-primary font-semibold' : 'text-cult-text-muted'}`}>
                        {w.label}
                      </span>
                    </div>
                  ))}
                  {/* Today marker header */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-cult-accent z-20" style={{ left: todayX }} />
                </div>
              </div>

              {/* Room rows */}
              {rooms.map((room, rowIdx) => {
                const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
                const isSelected = selectedRoom?.room_id === room.room_id;
                const cohortBars = buildCohortBars(room);

                return (
                  <div
                    key={room.room_id}
                    className={`absolute flex border-b border-cult-border/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cult-surface-raised' : 'hover:bg-cult-surface/60'
                    }`}
                    style={{ top: y, height: ROW_HEIGHT, width: LABEL_WIDTH + totalWidth }}
                    onClick={() => handleRoomClick(room)}
                  >
                    {/* Room label */}
                    <div
                      className={`flex-shrink-0 flex items-center gap-2 px-3 border-r border-cult-border/50 border-l-4 ${ROOM_TYPE_LEFT_BORDER[room.room_type] ?? ''}`}
                      style={{ width: LABEL_WIDTH }}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ROOM_TYPE_DOT[room.room_type] ?? 'bg-cult-border'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-cult-text-primary truncate">{room.room_code}</div>
                        <div className="text-[10px] text-cult-text-muted">{room.total_plants}p &middot; {room.strain_count}s</div>
                      </div>
                      {/* + button (planning mode only) */}
                      {viewMode === 'planning' && (
                        <button
                          onClick={(e) => handleAddPlan(room, e)}
                          className="flex-shrink-0 inline-flex h-6 items-center gap-1 border border-cult-accent/50 bg-cult-accent/15 px-1.5 text-[10px] font-bold uppercase text-cult-accent transition-colors hover:bg-cult-accent hover:text-cult-bg"
                          title={`Add planned cycle to ${room.room_name}`}
                          aria-label={`Plan cycle in ${room.room_name}`}
                        >
                          <Plus className="w-3 h-3" />
                          Plan
                        </button>
                      )}
                    </div>

                    {/* Timeline area */}
                    <div className="relative flex-1" style={{ width: totalWidth }}>
                      {/* Actual strain cycle bars */}
                      {cohortBars.map((cohort, sIdx) => {
                        const barStart = daysBetween(startDate, cohort.startDate) * DAY_WIDTH;
                        const barWidth = Math.max(daysBetween(cohort.startDate, cohort.endDate) * DAY_WIDTH, 18);
                        const barY = 5 + sIdx * 14;
                        const color = STAGE_HEX[cohort.stage] ?? '#6B7280';

                        if (barY + 11 > ROW_HEIGHT) return null;

                        const titleParts = [
                          `${cohort.label} — ${cohort.plantCount}p`,
                          cohort.strainCount > 1 ? `${cohort.strainCount} strains` : cohort.strains[0]?.strain_name,
                          cohort.stage,
                          cohort.daysInStage !== null ? `${cohort.daysInStage}d` : null,
                          cohort.isSynthetic ? 'projected date' : null,
                          cohort.isQuarantined ? 'quarantined confidence' : null,
                        ].filter(Boolean);

                        return (
                          <button
                            type="button"
                            key={cohort.key}
                            className="absolute cursor-pointer rounded-sm opacity-85 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cult-accent focus:ring-offset-1 focus:ring-offset-cult-bg transition-opacity overflow-hidden"
                            style={{
                              left: Math.max(barStart, 0),
                              top: barY,
                              width: barWidth,
                              height: 11,
                              backgroundColor: color,
                              border: cohort.isQuarantined
                                ? '1px solid rgba(255, 255, 255, 0.75)'
                                : cohort.isSynthetic
                                  ? '1px dashed rgba(255, 255, 255, 0.65)'
                                  : undefined,
                            }}
                            title={titleParts.join(' · ')}
                            aria-label={`Open ${cohort.label} cohort details`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRoomClick(room);
                            }}
                          >
                            <span className="absolute left-0 top-0 h-full w-1 bg-cult-bg/70" aria-hidden="true" />
                            {cohort.strainCount > 1 && barWidth >= 42 && (
                              <span className="absolute right-1 top-0 text-[8px] leading-[11px] font-mono font-bold text-cult-bg/90">
                                {cohort.strainCount}S
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Planned cycle ghost bars (planning mode only) */}
                      {viewMode === 'planning' &&
                        (room.plannedCycles ?? []).map((plan, pIdx) => {
                          const barY = 5 + (cohortBars.length + pIdx) * 14;
                          if (barY + 8 > ROW_HEIGHT) return null;
                          return (
                            <PlannedCycleBar
                              key={plan.id}
                              entry={plan}
                              startDate={startDate}
                              dayWidth={DAY_WIDTH}
                              top={barY}
                              onClick={handleBarClick}
                            />
                          );
                        })}

                      {/* Today line */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-cult-accent/60 z-10" style={{ left: todayX }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="w-[420px] flex-shrink-0 border-l border-cult-border overflow-y-auto bg-cult-bg">
            {panelContent}
          </div>
        )}
      </div>

      {/* Bottom planning panels */}
      {viewMode === 'planning' && (
        <>
          <FlowerCycleGapsPanel
            gaps={flowerGaps}
            onPlan={(gap) => openPlanForm(gap.room, toISODate(gap.start))}
          />
          <ForecastSummaryPanel />
        </>
      )}

      {/* Planned cycle form modal */}
      {planFormRoom && (
        <PlannedCycleForm
          room={planFormRoom}
          strainStats={strainStats}
          motherBatchGroups={motherBatchGroups}
          initialFlowerStartDate={planFormFlowerStart}
          editing={editingCycle}
          onSave={handleFormSave}
          onClose={() => { setPlanFormRoom(null); setEditingCycle(null); setPlanFormFlowerStart(null); }}
        />
      )}
    </div>
  );
}

function MotherBatchGroupSummary({ groups }: { groups: MotherBatchGroupRow[] }) {
  const activeGroups = groups.filter((group) => group.active_plant_count > 0);
  const activePlants = activeGroups.reduce((sum, group) => sum + group.active_plant_count, 0);
  const strainCount = new Set(activeGroups.map((group) => group.strain_id)).size;
  const sourceCount = activeGroups.filter((group) => group.source_cycle_id || group.source_batch_registry_id).length;
  const sample = activeGroups
    .slice()
    .sort((a, b) => b.active_plant_count - a.active_plant_count)
    .slice(0, 4);

  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-cult-surface border-b border-cult-border text-xs">
      <Sprout className="w-4 h-4 text-cult-stage-mother flex-shrink-0" />
      <div className="flex items-center gap-2 text-cult-text-primary flex-shrink-0">
        <span className="font-semibold">Mother Groups</span>
        <span className="text-cult-text-muted">
          {activeGroups.length} groups · {activePlants} moms · {strainCount} strains
        </span>
      </div>
      {sourceCount < activeGroups.length && (
        <span className="text-cult-text-muted flex-shrink-0">
          {activeGroups.length - sourceCount} unlinked
        </span>
      )}
      <div className="flex gap-2 overflow-x-auto min-w-0">
        {sample.map((group) => (
          <span
            key={group.mother_batch_group_key}
            className="whitespace-nowrap rounded border border-cult-border bg-cult-bg px-2 py-0.5 text-cult-text-secondary"
            title={`${group.strain_name} · ${group.active_plant_count} active moms`}
          >
            <span className="font-medium text-cult-text-primary">{group.strain_name}</span>
            <span className="text-cult-text-muted ml-1">
              {group.source_cycle_code || group.source_batch_number || group.room_code || 'lineage pending'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FlowerCycleGapsPanel({
  gaps,
  onPlan,
}: {
  gaps: FlowerGapSuggestion[];
  onPlan: (gap: FlowerGapSuggestion) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-cult-border bg-cult-bg px-6 py-2 shadow-2xl flex-shrink-0">
      <div className="flex items-center gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 text-cult-accent" />
          <span className="text-xs font-semibold text-cult-text-primary">Flower Cycle Gaps</span>
          <span className="text-[11px] text-cult-text-muted">{gaps.length} fit</span>
        </div>

        {gaps.length === 0 ? (
          <span className="text-[11px] text-cult-text-muted whitespace-nowrap">
            No {DEFAULT_FLOWER_DAYS}d flower windows in horizon
          </span>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            {gaps.map((gap) => (
              <button
                key={gap.key}
                type="button"
                onClick={() => onPlan(gap)}
                className="flex-shrink-0 border border-cult-border bg-cult-surface px-2.5 py-1 text-left transition-colors hover:border-cult-accent hover:bg-cult-surface-raised focus:outline-none focus:ring-2 focus:ring-cult-accent focus:ring-offset-1 focus:ring-offset-cult-bg"
                title={`Plan a flower cycle in ${gap.room.room_name} from ${formatShortDate(gap.start)} to ${formatShortDate(gap.end)}`}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cult-text-primary">
                  {gap.room.room_code}
                  <span className="text-cult-accent">{gap.days}d</span>
                </span>
                <span className="block text-[10px] text-cult-text-muted">
                  {formatShortDate(gap.start)} to {formatShortDate(gap.end)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductionPlannerView;
