import { useEffect, useState, useMemo, useCallback } from 'react';
import type { CalendarRoom, CalendarPlannedEntry, StrainCultivationStats } from '@/features/production-planner/types';
import { LabGantt } from './LabGantt';
import { LabRoomDrawer } from './LabRoomDrawer';
import { LabPlanCycleForm } from './LabPlanCycleForm';
import type { Batch } from './planner-mock';
import { useLabPlannerData } from './useLabPlannerData';
import './lab-tokens.css';

type ViewMode = 'current' | 'planning';

type CanvasMode = 'deep' | 'marketing';

interface Kpi {
  label: string;
  value: string;
  trend?: string;
  tone?: 'gold' | 'alarm' | 'ink' | 'dim';
  spark?: number[];
  onClick?: () => void;
}

interface SeedObservation {
  status: 'ok' | 'warn' | 'bad';
  entity: string;
  context: string;
  badge?: { text: string; tone: 'ok' | 'warn' | 'bad' };
  cta?: string;
}

function formatWeekOf(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatLiveTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Fake but plausible 12-week sparkline. Lab-fixture only. */
function makeSpark(seed: number, n = 12): number[] {
  const out: number[] = [];
  let v = 50;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280) * 2 - 1;
    v = Math.max(10, Math.min(90, v + r * 12));
    out.push(v);
  }
  return out;
}

function sparkPath(values: number[], width = 80, height = 14): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const dx = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * dx;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Sparkline seeds — kept stable so the visual doesn't jitter on re-render. */
const SPARK_SEEDS = {
  harvest: 13,
  afs: 27,
  demand: 91,
  rooms: 54,
  cycles: 78,
  status: 120,
};

function CogBadge({ size = 60 }: { size?: number }) {
  const r = size / 2;
  const teeth = 12;
  const innerR = r * 0.62;
  const cogPoints: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r * 0.95 : r * 0.78;
    cogPoints.push(`${r + Math.cos(angle) * radius},${r + Math.sin(angle) * radius}`);
  }
  return (
    <svg className="cog-badge" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <polygon points={cogPoints.join(' ')} fill="var(--pv4-navy)" stroke="var(--lab-gold)" strokeWidth="0.6" />
      <circle cx={r} cy={r} r={innerR} fill="var(--pv4-navy)" stroke="var(--lab-ink)" strokeWidth="1" />
      <circle cx={r} cy={r} r={innerR * 0.85} fill="none" stroke="var(--lab-ink)" strokeWidth="0.5" opacity="0.5" />
      <circle cx={r} cy={r} r={size * 0.07} fill="var(--lab-alarm)" />
    </svg>
  );
}

export function LabProductionPlanner() {
  const [canvas, setCanvas] = useState<CanvasMode>('deep');
  const [hoveredStrainId, setHoveredStrainId] = useState<string | null>(null);
  const [selectedStrainId, setSelectedStrainId] = useState<string | null>(null);
  const [hoveredBatchId, setHoveredBatchId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const data = useLabPlannerData();
  const batches: Batch[] = data.batches;
  const rooms: CalendarRoom[] = data.rooms;
  const strainStats = data.strainStats;
  const motherLots = data.motherLots;

  const today = useMemo(() => new Date(), []);
  const liveTime = useMemo(() => formatLiveTime(today), [today]);
  const weekOf = useMemo(() => formatWeekOf(today), [today]);

  // Planned cycles are local state — committed plans persist across data
  // refreshes. Initial value reads through the hook so mock and live
  // share the same starting shape (empty in both cases today).
  const [plannedByRoom, setPlannedByRoom] = useState<Record<string, CalendarPlannedEntry[]>>(data.plannedByRoom);
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const strainStatsById = useMemo(() => {
    const m = new Map<string, StrainCultivationStats>();
    for (const s of strainStats) m.set(s.strain_id, s);
    return m;
  }, [strainStats]);

  const [drawerRoomId, setDrawerRoomId] = useState<string | null>(null);
  const drawerRoom = useMemo(
    () => rooms.find((r) => r.room_id === drawerRoomId) ?? null,
    [rooms, drawerRoomId]
  );

  // Plan-form modal: which room to plan into, and (optional) seed a strain.
  const [planFormRoom, setPlanFormRoom] = useState<CalendarRoom | null>(null);

  // Last-finalized confirmation banner. Mode 'persisted' = wrote to
  // planned_cycles in prod, 'local' = client-state-only (mock/fallback),
  // 'error' = service write failed and the optimistic entry was rolled back.
  const [lastFinalized, setLastFinalized] = useState<
    | { strain: string; room: string; mode: 'persisted' | 'local' | 'error'; message?: string }
    | null
  >(null);

  // When the live fetch completes (or a refresh fires), seed local
  // plannedByRoom with the canonical server state. Local edits in
  // mock/fallback mode are not affected because data.plannedByRoom
  // there comes from MOCK_PLANNED and is stable.
  useEffect(() => {
    setPlannedByRoom(data.plannedByRoom);
  }, [data.plannedByRoom]);

  const handleRoomClick = useCallback((room: CalendarRoom) => {
    setDrawerRoomId(room.room_id);
    setSelectedStrainId(null);
  }, []);

  const handleStrainSelect = useCallback(
    (id: string | null) => {
      if (id === null || id === '') {
        setSelectedStrainId(null);
        return;
      }
      setSelectedStrainId(id);
      if (!drawerRoomId) {
        const room = rooms.find((r) => r.strains.some((s) => s.strain_id === id));
        if (room) setDrawerRoomId(room.room_id);
      }
    },
    [drawerRoomId, rooms]
  );

  const handlePlanCycle = useCallback((room: CalendarRoom) => {
    // Queue-aware anchor: when the operator clicks PLAN A CYCLE on a
    // flower room, anchor flower-start to the predecessor's harvest
    // end + 3d turnover. Predecessor = the latest flower segment that
    // lives in this room across all active batches and committed
    // plans. If the room has no predecessor (never used or all
    // history older than today), flowerStart defaults to today + 32d
    // (clone phase + veg phase) so the operator is planning from a
    // cut-today starting point rather than calendar arithmetic.
    if (room.room_type === 'flower') {
      let latestEndISO: string | null = null;
      for (const b of batches) {
        for (const s of b.segments) {
          if (s.stage !== 'flower') continue;
          if (s.room_id !== room.room_id) continue;
          if (!latestEndISO || s.end > latestEndISO) latestEndISO = s.end;
        }
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let anchorDate: Date;
      let prefillReason: string;
      if (latestEndISO && new Date(latestEndISO) > today) {
        anchorDate = new Date(latestEndISO);
        anchorDate.setDate(anchorDate.getDate() + 3);
        prefillReason = `Anchored to ${room.room_code} predecessor harvest ${new Date(latestEndISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} + 3d turnover`;
      } else {
        anchorDate = new Date(today);
        anchorDate.setDate(anchorDate.getDate() + 32);
        prefillReason = `${room.room_code} has no upcoming predecessor, anchoring to today + 32d (clone + veg pipeline)`;
      }
      setPlanFormPrefill({
        initialFlowerStart: anchorDate.toISOString().slice(0, 10),
        prefillReason,
      });
    }
    setPlanFormRoom(room);
  }, [batches]);

  // Mother-row Cut Clones flow: pick first idle flower room as the
  // destination and pre-fill the form with the mother's strain. The
  // flower-start defaults to today + (vegDays + 14) so cut_clones
  // lands on today in the Manifest panel.
  const handleCutClones = useCallback(
    (motherRoom: CalendarRoom) => {
      const destination =
        rooms.find((r) => r.room_type === 'flower' && r.total_plants === 0) ??
        rooms.find((r) => r.room_type === 'flower');
      if (!destination) return;
      const motherStrain = motherRoom.strains?.[0];
      const stats = motherStrain
        ? strainStats.find((s) => s.strain_id === motherStrain.strain_id)
        : strainStats[0];
      const today = new Date();
      const flowerStart = new Date(today);
      const offset = (stats?.veg_days_avg ?? 14) + 14;
      flowerStart.setDate(flowerStart.getDate() + offset);
      setPlanFormPrefill({
        initialStrainId: stats?.strain_id,
        initialFlowerStart: flowerStart.toISOString().slice(0, 10),
        prefillReason: `Cut from ${motherRoom.room_code} · ${stats?.strain_name ?? 'in-house genetics'}`,
      });
      setPlanFormRoom(destination);
    },
    [rooms, strainStats]
  );

  const handleDrawerClose = useCallback(() => {
    setDrawerRoomId(null);
    setSelectedStrainId(null);
  }, []);

  // Inline-edit on a planned bar: update plant count and/or flower start
  // (estimated harvest auto-derived). Lab-mock only — no service write.
  const handleCycleEdit = useCallback(
    (
      roomId: string,
      cycleId: string,
      patch: { planned_plant_count?: number; flower_start_date?: string }
    ) => {
      setPlannedByRoom((prev) => {
        const list = prev[roomId];
        if (!list) return prev;
        const next = list.map((c) => {
          if (c.id !== cycleId) return c;
          const updated = { ...c, ...patch };
          // If start date moved, recompute harvest based on flower-time class.
          if (patch.flower_start_date) {
            const stat = strainStatsById.get(c.strain_id);
            const flowerDays = stat?.flowering_time_days ?? 63;
            const harvest = new Date(patch.flower_start_date);
            harvest.setDate(harvest.getDate() + flowerDays);
            updated.estimated_harvest_date = harvest.toISOString().slice(0, 10);
          }
          return updated;
        });
        return { ...prev, [roomId]: next };
      });
    },
    [strainStatsById]
  );

  // Harvest-date overrides keyed by batch_id. Drag commits write here.
  const [harvestOverrides, setHarvestOverrides] = useState<Record<string, string>>({});

  const handleHarvestShift = useCallback(
    (batchId: string, newHarvestISO: string) => {
      setHarvestOverrides((prev) => ({ ...prev, [batchId]: newHarvestISO }));
    },
    []
  );

  const handleBatchSelect = useCallback(
    (id: string | null) => {
      setSelectedBatchId(id);
      if (id) {
        const b = batches.find((b) => b.batch_id === id);
        if (b) {
          setDrawerRoomId(b.current_room_id);
          setSelectedStrainId(b.strain_id);
        }
      } else {
        setSelectedStrainId(null);
      }
    },
    [batches]
  );

  const flowerDaysByStrain = useCallback(
    (strainId: string): number => {
      return strainStatsById.get(strainId)?.flowering_time_days ?? 63;
    },
    [strainStatsById]
  );

  const handlePlannedShift = useCallback(
    (roomId: string, cycleId: string, newFlowerStartISO: string) => {
      setPlannedByRoom((prev) => {
        const list = prev[roomId];
        if (!list) return prev;
        const next = list.map((c) => {
          if (c.id !== cycleId) return c;
          const flowerDays = flowerDaysByStrain(c.strain_id);
          const harvest = new Date(newFlowerStartISO);
          harvest.setDate(harvest.getDate() + flowerDays);
          // Shift veg + clone-cut by the same delta so the shape preserves
          const oldStart = new Date(c.flower_start_date);
          const newStart = new Date(newFlowerStartISO);
          const dayShift = Math.round((newStart.getTime() - oldStart.getTime()) / 86400000);
          const shiftISO = (iso: string | null): string | null => {
            if (!iso) return iso;
            const d = new Date(iso);
            d.setDate(d.getDate() + dayShift);
            return d.toISOString().slice(0, 10);
          };
          return {
            ...c,
            flower_start_date: newFlowerStartISO,
            estimated_harvest_date: harvest.toISOString().slice(0, 10),
            veg_start_date: shiftISO(c.veg_start_date),
            clone_cut_date: shiftISO(c.clone_cut_date),
          };
        });
        return { ...prev, [roomId]: next };
      });
    },
    [flowerDaysByStrain]
  );

  const handleCycleDelete = useCallback((roomId: string, cycleId: string) => {
    setPlannedByRoom((prev) => {
      const list = prev[roomId];
      if (!list) return prev;
      const next = list.filter((c) => c.id !== cycleId);
      return { ...prev, [roomId]: next };
    });
  }, []);

  // Plan-form prefill (used by Seed CTA "PLAN SUCCESSOR →").
  const [planFormPrefill, setPlanFormPrefill] = useState<{
    initialStrainId?: string;
    initialFlowerStart?: string;
    prefillReason?: string;
  } | null>(null);

  const handleFinalize = useCallback(
    async (entry: CalendarPlannedEntry, roomId: string, roomCode: string) => {
      // Optimistic insert. The entry id from the form is a synthetic
      // `lab-${Date.now()}` that the server will replace with a uuid on
      // refresh; that's fine because refresh wipes plannedByRoom and
      // reseeds from the canonical timeline.
      setPlannedByRoom((prev) => {
        const list = prev[roomId] ?? [];
        return { ...prev, [roomId]: [...list, entry] };
      });
      setPlanFormRoom(null);
      setViewMode('planning');

      if (data.source === 'live') {
        try {
          // Dynamic import keeps the demo bundle free of supabase deps.
          const { plannedCyclesService } = await import('@/features/production-planner/services/plannedCyclesService');
          await plannedCyclesService.create({
            strain_id: entry.strain_id,
            target_room_id: roomId,
            planned_plant_count: entry.planned_plant_count,
            flower_start_date: entry.flower_start_date,
            estimated_harvest_date: entry.estimated_harvest_date,
            clone_cut_date: entry.clone_cut_date,
            veg_start_date: entry.veg_start_date,
            forecast_yield_grams: entry.forecast_yield_grams,
            forecast_price_per_gram: entry.forecast_price_per_gram,
          });
          setLastFinalized({ strain: entry.strain_name, room: roomCode, mode: 'persisted' });
          await data.refresh();
        } catch (err: any) {
          // Roll back the optimistic entry.
          setPlannedByRoom((prev) => {
            const list = prev[roomId] ?? [];
            return { ...prev, [roomId]: list.filter((c) => c.id !== entry.id) };
          });
          setLastFinalized({
            strain: entry.strain_name,
            room: roomCode,
            mode: 'error',
            message: err?.message ?? 'Save failed',
          });
        }
      } else {
        setLastFinalized({ strain: entry.strain_name, room: roomCode, mode: 'local' });
      }
      window.setTimeout(() => setLastFinalized(null), 4500);
    },
    [data]
  );

  // ── DERIVED KPI tiles ─────────────────────────────────────────
  // All six tiles derive from the live batch + plan + override state so
  // finalizing a plan or dragging a harvest visibly cascades through the
  // surface.
  const kpis = useMemo<Kpi[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active flower batches with effective harvest date (override applied).
    type BatchRef = { batch_id: string; strain_name: string; room_code: string; harvest: Date; yield_g: number };
    const activeFlower: BatchRef[] = [];
    for (const b of batches) {
      if (b.current_stage !== 'flower') continue;
      const flowerSeg = b.segments.find((s) => s.stage === 'flower');
      if (!flowerSeg) continue;
      const overrideISO = harvestOverrides[b.batch_id];
      const harvestISO = overrideISO ?? flowerSeg.end;
      const room = rooms.find((r) => r.room_id === b.current_room_id);
      activeFlower.push({
        batch_id: b.batch_id,
        strain_name: b.strain_name,
        room_code: room?.room_code ?? '?',
        harvest: new Date(harvestISO),
        yield_g: b.forecast_yield_grams ?? flowerSeg.plant_count * 720,
      });
    }
    activeFlower.sort((a, b) => a.harvest.getTime() - b.harvest.getTime());

    // Cohort-aware harvest events: batches sharing (current_room_id, YYMMDD)
    // are one operator-real harvest event (one trim crew session), not N
    // distinct events. The KPI strip honors that math instead of counting
    // batch rows.
    type HarvestEvent = {
      cohort_key: string;
      room_code: string;
      harvest: Date;
      batch_count: number;
      total_yield_g: number;
    };
    const eventsByKey = new Map<string, HarvestEvent>();
    for (const b of batches) {
      if (b.current_stage !== 'flower') continue;
      const flowerSeg = b.segments.find((s) => s.stage === 'flower');
      if (!flowerSeg) continue;
      const harvestISO = harvestOverrides[b.batch_id] ?? flowerSeg.end;
      const harvest = new Date(harvestISO);
      const room = rooms.find((r) => r.room_id === b.current_room_id);
      const yieldG = b.forecast_yield_grams ?? flowerSeg.plant_count * 720;
      const m = b.batch_code.match(/^(\d{6})/);
      const key = `${b.current_room_id}:${m?.[1] ?? b.batch_id}`;
      const existing = eventsByKey.get(key);
      if (existing) {
        existing.batch_count++;
        existing.total_yield_g += yieldG;
        if (harvest < existing.harvest) existing.harvest = harvest;
      } else {
        eventsByKey.set(key, {
          cohort_key: key,
          room_code: room?.room_code ?? '?',
          harvest,
          batch_count: 1,
          total_yield_g: yieldG,
        });
      }
    }
    const harvestEvents = Array.from(eventsByKey.values()).sort(
      (a, b) => a.harvest.getTime() - b.harvest.getTime()
    );

    // 1. HARVEST WINDOW (cohort-aware)
    const next = harvestEvents[0];
    const harvestDays = next ? Math.round((next.harvest.getTime() - today.getTime()) / 86400000) : null;

    // 2. AVAILABLE FOR SALE — sum forecast yield across cohort harvest
    //    events in the next 30 days. Trend rephrased to "N events · M
    //    batches in 30d" so a single multi-batch trim day is not
    //    overstated as N independent harvests.
    const horizon30 = new Date(today);
    horizon30.setDate(horizon30.getDate() + 30);
    const eventsIn30 = harvestEvents.filter((e) => e.harvest <= horizon30);
    const afsGrams = eventsIn30.reduce((sum, e) => sum + e.total_yield_g, 0);
    const batchesIn30 = eventsIn30.reduce((sum, e) => sum + e.batch_count, 0);

    // 3. UNMATCHED DEMAND — strains with unassigned demand
    const unmatched = strainStats.filter((s) => (s.demand_unassigned_units ?? 0) > 0);

    // 4. ROOMS READY — flower rooms with zero plants
    const readyRooms = rooms.filter((r) => r.room_type === 'flower' && r.total_plants === 0);
    const totalFlower = rooms.filter((r) => r.room_type === 'flower').length;

    // 5. CYCLES PLANNED — plannedByRoom entry count
    const allPlanned = Object.values(plannedByRoom).flat();
    const committed = allPlanned.filter((p) => p.status === 'committed').length;
    const draft = allPlanned.filter((p) => p.status === 'draft').length;

    // 6. WEEK STATUS — derived from harvest delays + stuck cohorts +
    //    planning state. Stuck-cohort detection mirrors the LabGantt
    //    urgency engine: drying-stage batches with clone-cut date more
    //    than 100 days ago are stuck (lifecycle_state never advanced
    //    out of drying / data hygiene smell). Aggregated by cohort key
    //    so a 23-batch stuck cohort counts as one operational alarm,
    //    not 23.
    const horizon100Ago = new Date(today);
    horizon100Ago.setDate(horizon100Ago.getDate() - 100);
    const stuckCohortKeys = new Set<string>();
    let stuckBatchTotal = 0;
    for (const b of batches) {
      if (b.current_stage !== 'drying') continue;
      const cutDate = new Date(b.clone_cut_date);
      if (cutDate > horizon100Ago) continue;
      stuckBatchTotal++;
      const m = b.batch_code.match(/^(\d{6})/);
      const key = `${b.current_room_id}:${m?.[1] ?? b.batch_id}`;
      stuckCohortKeys.add(key);
    }
    const stuckCohortCount = stuckCohortKeys.size;

    const overdueDrags = Object.entries(harvestOverrides).filter(([batchId, iso]) => {
      const original = batches.find((b) => b.batch_id === batchId)?.segments.find((s) => s.stage === 'flower')?.end;
      if (!original) return false;
      const delta = Math.round((new Date(iso).getTime() - new Date(original).getTime()) / 86400000);
      return delta > 3;
    });
    let statusLabel = 'OK';
    let statusTrend = 'no blocked rooms';
    let statusTone: Kpi['tone'] = 'ink';
    if (stuckCohortCount > 0) {
      statusLabel = 'ALARM';
      statusTrend = `${stuckCohortCount} ${stuckCohortCount === 1 ? 'cohort' : 'cohorts'} stuck >100d (${stuckBatchTotal} batches)`;
      statusTone = 'alarm' as const;
    } else if (overdueDrags.length > 0) {
      statusLabel = 'WARN';
      statusTrend = `${overdueDrags.length} harvest shifted`;
      statusTone = 'gold' as const;
    } else if (allPlanned.length === 0 && readyRooms.length >= 4) {
      statusLabel = 'PLAN';
      statusTrend = `${readyRooms.length} rooms idle, no plans`;
      statusTone = 'gold' as const;
    }

    return [
      {
        label: 'Harvest Window',
        value: harvestDays !== null ? `${harvestDays}d` : '—',
        trend: next
          ? `next harvest ${next.room_code}${next.batch_count > 1 ? ` · ${next.batch_count} batches` : ''}`
          : 'no active flower',
        spark: makeSpark(SPARK_SEEDS.harvest),
      },
      {
        label: 'Available For Sale',
        value: afsGrams > 0 ? Math.round(afsGrams / 1000).toLocaleString() + ' kg' : '—',
        trend: eventsIn30.length === 0
          ? 'no harvests in 30d'
          : eventsIn30.length === 1
            ? `1 harvest event · ${batchesIn30} ${batchesIn30 === 1 ? 'batch' : 'batches'} in 30d`
            : `${eventsIn30.length} harvest events · ${batchesIn30} batches in 30d`,
        spark: makeSpark(SPARK_SEEDS.afs),
      },
      {
        label: 'Unmatched Demand',
        value: unmatched.length > 0 ? String(unmatched.length) : '0',
        trend: unmatched.length > 0
          ? `${unmatched.slice(0, 2).map((s) => s.strain_name.split(' ')[0]).join(', ')}${unmatched.length > 2 ? '…' : ''}`
          : 'all strains matched',
        spark: makeSpark(SPARK_SEEDS.demand),
        onClick: unmatched.length > 0 ? () => {
          const strain = unmatched[0];
          const destination =
            rooms.find((r) => r.room_type === 'flower' && r.total_plants === 0) ??
            rooms.find((r) => r.room_type === 'flower');
          if (!destination) return;
          const stats = strainStatsById.get(strain.strain_id) ?? null;
          const flowerStart = new Date(today);
          const offset = (stats?.veg_days_avg ?? 14) + 14;
          flowerStart.setDate(flowerStart.getDate() + offset);
          setPlanFormPrefill({
            initialStrainId: strain.strain_id,
            initialFlowerStart: flowerStart.toISOString().slice(0, 10),
            prefillReason: `${strain.strain_name} demand unassigned, plan a cycle to fill`,
          });
          setPlanFormRoom(destination);
        } : undefined,
      },
      {
        label: 'Rooms Ready',
        value: `${readyRooms.length} / ${totalFlower}`,
        trend: readyRooms.length > 0
          ? readyRooms.slice(0, 2).map((r) => r.room_code).join(' + ') + (readyRooms.length > 2 ? '…' : '')
          : 'no idle rooms',
        spark: makeSpark(SPARK_SEEDS.rooms),
      },
      {
        label: 'Cycles Planned',
        value: String(allPlanned.length),
        trend: `${committed} committed · ${draft} draft`,
        spark: makeSpark(SPARK_SEEDS.cycles),
      },
      {
        label: 'Week Status',
        value: statusLabel,
        trend: statusTrend,
        tone: statusTone,
        spark: makeSpark(SPARK_SEEDS.status),
      },
    ];
  }, [batches, rooms, plannedByRoom, harvestOverrides, strainStats, strainStatsById]);

  // ── DERIVED Monthly production roll-up ─────────────────────────
  // 12 months forward from today's month. Each batch contributes its
  // forecast_yield_grams to the YYYY-MM bucket of its harvest date
  // (flower segment end, or harvest override when present).
  // Mirrors file 2's Pivot sheet — Production by month/strain — at
  // the operator surface so the demo viewer doesn't need to open a
  // separate report to see throughput cadence.
  const monthlyProduction = useMemo(() => {
    type MonthContribution = {
      batch_code: string;
      strain_name: string;
      room_code: string;
      harvest_iso: string;
      harvest_label: string;
      grams: number;
    };
    type MonthBucket = {
      key: string;       // YYYY-MM
      label: string;     // "MAY"
      year: number;
      year_short: string; // "26"
      harvest_count: number;
      total_grams: number;
      contributions: MonthContribution[];
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets: MonthBucket[] = [];
    const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthLabels[d.getMonth()],
        year: d.getFullYear(),
        year_short: String(d.getFullYear()).slice(2),
        harvest_count: 0,
        total_grams: 0,
        contributions: [],
      });
    }
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
    const roomById = new Map(rooms.map((r) => [r.room_id, r]));
    for (const b of batches) {
      const flowerSeg = b.segments.find((s) => s.stage === 'flower');
      if (!flowerSeg) continue;
      const harvestISO = harvestOverrides[b.batch_id] ?? flowerSeg.end;
      const d = new Date(harvestISO);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      const grams = b.forecast_yield_grams ?? flowerSeg.plant_count * 720;
      bucket.harvest_count++;
      bucket.total_grams += grams;
      bucket.contributions.push({
        batch_code: b.batch_code.split(' ')[0],
        strain_name: b.strain_name,
        room_code: roomById.get(flowerSeg.room_id)?.room_code ?? flowerSeg.room_id,
        harvest_iso: harvestISO,
        harvest_label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        grams,
      });
    }
    for (const bucket of buckets) {
      bucket.contributions.sort((a, b) => a.harvest_iso.localeCompare(b.harvest_iso));
    }
    return buckets;
  }, [batches, rooms, harvestOverrides]);

  const monthlyMaxGrams = useMemo(
    () => Math.max(1, ...monthlyProduction.map((m) => m.total_grams)),
    [monthlyProduction]
  );

  // ── DERIVED Seed observations ──────────────────────────────────
  // Each observation carries an action callback so the gold dotted CTA
  // actually does something. PLAN SUCCESSOR opens the form pre-filled;
  // OPEN STRAIN opens the drawer for the batch in question.
  type SeedAction = { cta: string; onClick: () => void };
  type SeedObs = SeedObservation & { action?: SeedAction };

  const seedObservations = useMemo<SeedObs[]>(() => {
    const out: SeedObs[] = [];

    // Find an active flower batch close to harvest with no successor planned.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon14 = new Date(today);
    horizon14.setDate(horizon14.getDate() + 21);

    const harvestSoon = batches
      .filter((b) => b.current_stage === 'flower')
      .map((b) => {
        const flowerSeg = b.segments.find((s) => s.stage === 'flower');
        if (!flowerSeg) return null;
        const harvestISO = harvestOverrides[b.batch_id] ?? flowerSeg.end;
        const harvestDate = new Date(harvestISO);
        const daysOut = Math.round((harvestDate.getTime() - today.getTime()) / 86400000);
        return { batch: b, harvestISO, harvestDate, daysOut, room: rooms.find((r) => r.room_id === b.current_room_id) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.harvestDate <= horizon14)
      .sort((a, b) => a.daysOut - b.daysOut);

    const gap = harvestSoon.find((h) => {
      const successorPlanned = Object.values(plannedByRoom).flat().some((p) => p.strain_id === h.batch.strain_id);
      return !successorPlanned;
    });

    if (gap) {
      const succRoomId = rooms.find((r) => r.room_type === 'veg' && r.total_plants === 0)?.room_id;
      const succRoom = rooms.find((r) => r.room_id === succRoomId);
      // Successor flower-start = predecessor harvest + 3d turnover
      const succFlowerStart = new Date(gap.harvestDate);
      succFlowerStart.setDate(succFlowerStart.getDate() + 3);
      const succFlowerStartISO = succFlowerStart.toISOString().slice(0, 10);
      out.push({
        status: 'bad',
        entity: `${gap.batch.strain_name.toUpperCase()} · ${gap.room?.room_code ?? '?'}`,
        context: `projected harvest ${gap.harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, no planned successor — ${succRoom?.room_code ?? 'VEG slot'} opens with no occupant.`,
        badge: { text: 'PLAN GAP', tone: 'bad' },
        cta: 'PLAN SUCCESSOR →',
        action: succRoom
          ? {
              cta: 'PLAN SUCCESSOR →',
              onClick: () => {
                setPlanFormPrefill({
                  initialStrainId: gap.batch.strain_id,
                  initialFlowerStart: succFlowerStartISO,
                  prefillReason: `Successor for ${gap.batch.strain_name} (${gap.room?.room_code}) harvesting ${gap.harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                });
                setPlanFormRoom(succRoom);
              },
            }
          : undefined,
      });
    }

    // Stuck cohort alarm — drying-stage batches more than 100d past
    // their clone-cut date. Real backend data-hygiene signal that also
    // surfaces the WEEK STATUS alarm context.
    const horizon100Ago = new Date(today);
    horizon100Ago.setDate(horizon100Ago.getDate() - 100);
    const stuckBatches = batches.filter((b) => {
      if (b.current_stage !== 'drying') return false;
      return new Date(b.clone_cut_date) <= horizon100Ago;
    });
    if (stuckBatches.length > 0) {
      const sample = stuckBatches[0];
      const stuckRoom = rooms.find((r) => r.room_id === sample.current_room_id);
      const cohortKeys = new Set<string>();
      for (const b of stuckBatches) {
        const m = b.batch_code.match(/^(\d{6})/);
        cohortKeys.add(`${b.current_room_id}:${m?.[1] ?? b.batch_id}`);
      }
      out.push({
        status: 'bad',
        entity: `${stuckRoom?.room_code ?? sample.current_room_id} · ${sample.strain_name.toUpperCase()}`,
        context: `${stuckBatches.length} batch${stuckBatches.length === 1 ? '' : 'es'} in ${cohortKeys.size} cohort${cohortKeys.size === 1 ? '' : 's'} stuck more than 100d in drying, operator action required to release.`,
        badge: { text: 'STUCK', tone: 'bad' },
        cta: 'OPEN BATCH →',
        action: {
          cta: 'OPEN BATCH →',
          onClick: () => {
            setDrawerRoomId(sample.current_room_id);
            setSelectedBatchId(sample.batch_id);
          },
        },
      });
    }

    // Mother room readiness — surface the next cutback window so the
    // operator can plan cuts on cadence. Sostanza file 2 specifies a
    // 16d cadence; we read days_in_stage off the genetics library.
    const CUTBACK_CADENCE = 16;
    const motherRoom = rooms.find((r) => r.room_type === 'mother' && r.strains && r.strains.length > 0);
    if (motherRoom && motherRoom.strains) {
      const days = motherRoom.strains
        .map((s) => s.days_in_stage)
        .filter((d): d is number => typeof d === 'number');
      if (days.length > 0) {
        const minDays = Math.min(...days);
        const ready = days.filter((d) => d >= CUTBACK_CADENCE).length;
        if (ready > 0) {
          out.push({
            status: 'warn',
            entity: motherRoom.room_code,
            context: `${ready} mother strain${ready === 1 ? '' : 's'} past the ${CUTBACK_CADENCE}d cutback cadence, cuts can be taken today`,
            badge: { text: 'READY TO CUT', tone: 'warn' },
          });
        } else if (CUTBACK_CADENCE - minDays <= 7) {
          const nextDays = CUTBACK_CADENCE - minDays;
          out.push({
            status: 'ok',
            entity: motherRoom.room_code,
            context: `${motherRoom.total_plants} mothers in rotation, next cutback in ${nextDays}d on the ${CUTBACK_CADENCE}d cadence`,
            badge: { text: `CUT IN ${nextDays}d`, tone: 'ok' },
          });
        }
      }
    }

    // Idle flower with no demand pressure — surface only when the
    // UNMATCHED DEMAND KPI tile is silent, otherwise the tile (which
    // is itself clickable and pre-fills the same plan-cycle flow)
    // already covers the case. Avoids the metric/observation
    // duplication that reads as the system saying the same thing twice.
    const idleFlower = rooms.find((r) => r.room_type === 'flower' && r.total_plants === 0);
    const unmatched = strainStats.filter((s) => (s.demand_unassigned_units ?? 0) > 0);
    if (idleFlower && unmatched.length === 0) {
      out.push({
        status: 'ok',
        entity: idleFlower.room_code,
        context: `flower room open, no unmatched demand pressure — capacity available for next cycle`,
        badge: { text: 'OPEN', tone: 'ok' },
      });
    }

    // Scheduling collisions — for each flower room, find consecutive
    // flower segments that overlap (next batch starts before prior
    // batch finishes). Surface the most imminent collision as a SEED
    // observation; consolidate the rest into a "+N more" suffix so a
    // multi-collision schedule does not flood the row with 6 separate
    // observations. CTA opens the conflict room's drawer so the
    // operator can decide which batch to shift.
    type Collision = {
      roomCode: string;
      roomId: string;
      overlapDays: number;
      overlapStart: Date;
      laterBatch: typeof batches[number];
      earlierBatch: typeof batches[number];
    };
    const collisions: Collision[] = [];
    for (const room of rooms) {
      if (room.room_type !== 'flower') continue;
      const segs: Array<{ start: Date; end: Date; batch: typeof batches[number] }> = [];
      for (const b of batches) {
        const fs = b.segments.find(s => s.stage === 'flower' && s.room_id === room.room_id);
        if (!fs) continue;
        segs.push({ start: new Date(fs.start), end: new Date(fs.end), batch: b });
      }
      segs.sort((a, b) => a.start.getTime() - b.start.getTime());
      for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1];
        const curr = segs[i];
        const gapMs = curr.start.getTime() - prev.end.getTime();
        if (gapMs >= 0) continue;
        collisions.push({
          roomCode: room.room_code,
          roomId: room.room_id,
          overlapDays: Math.round(-gapMs / 86400000),
          overlapStart: curr.start,
          laterBatch: curr.batch,
          earlierBatch: prev.batch,
        });
      }
    }
    if (collisions.length > 0) {
      collisions.sort((a, b) => a.overlapStart.getTime() - b.overlapStart.getTime());
      const head = collisions[0];
      const more = collisions.length - 1;
      const dateLabel = head.overlapStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const moreSuffix = more > 0 ? `, +${more} more across the schedule` : '';
      out.push({
        status: 'bad',
        entity: `${head.roomCode} · ${head.laterBatch.batch_code.split(' ')[0]} vs ${head.earlierBatch.batch_code.split(' ')[0]}`,
        context: `${head.overlapDays}d overlap on ${dateLabel}, batch ${head.laterBatch.batch_code.split(' ')[0]} wants the room before batch ${head.earlierBatch.batch_code.split(' ')[0]} finishes${moreSuffix}`,
        badge: { text: `OVERLAP ${head.overlapDays}d`, tone: 'bad' },
        cta: 'OPEN ROOM →',
        action: {
          cta: 'OPEN ROOM →',
          onClick: () => {
            setDrawerRoomId(head.roomId);
            setSelectedBatchId(head.laterBatch.batch_id);
          },
        },
      });
    }

    return out;
  }, [batches, rooms, plannedByRoom, harvestOverrides, strainStats]);

  const isDemoFixture = data.source === 'sostanza';
  const canvasClass =
    canvas === 'marketing' ? 'canvas-marketing' : '';

  return (
    <div className={`lab-prod-planner ${canvasClass}`.trim()}>
      {/* ── Masthead ──────────────────────────────────────────────── */}
      <div className="masthead">
        <div className="wordmark-block">
          <CogBadge size={60} />
          <div className="wordmark-text">
            <div className="wordmark">
              CULTIVATION<span className="dot">.</span>
            </div>
            {!isDemoFixture && (
              <div className="wordmark-sub">
                Operational Bureau No. 26
              </div>
            )}
          </div>
        </div>

        <div className="masthead-meta">
          <span className="live">
            <span className="dot-pulse-wrap" aria-hidden>
              <span className="dot-pulse-core" />
            </span>
            <span>SYSTEM LIVE</span>
          </span>
          <span>{liveTime}</span>
          {!isDemoFixture && (
            <div className="canvas-toggle" role="tablist" aria-label="Canvas mode">
              <button
                role="tab"
                aria-selected={canvas === 'deep'}
                className={canvas === 'deep' ? 'active' : ''}
                onClick={() => setCanvas('deep')}
              >
                Deep
              </button>
              <button
                role="tab"
                aria-selected={canvas === 'marketing'}
                className={canvas === 'marketing' ? 'active' : ''}
                onClick={() => setCanvas('marketing')}
              >
                Marketing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Serial plate ──────────────────────────────────────────── */}
      <div className="serial-plate" role="banner">
        <div className="stamp">
          <span className="serial">FIG. 01</span>
          <span className="sep">·</span>
          <span>Production Planner</span>
          <span className="sep">·</span>
          <span>{data.source === 'sostanza' ? 'Sostanza' : 'Cult Cannabis'}</span>
          <span className="sep">·</span>
          <span>Week of {weekOf}</span>
        </div>
        <div className="stamp">
          {data.loading ? (
            <span className="quarantine-pill" title="Fetching live data from production…">
              Loading…
            </span>
          ) : data.source === 'live' ? (
            <span
              className="data-source-pill live"
              title={`Loaded from production (fonreynkfeqywshijqpi) at ${data.loadedAt.toLocaleTimeString()}. ${batches.length} batches in scope (cultivation/drying). Quarantine pills mark fields without operator capture per the cultivo_planner_data_lineage doctrine.`}
            >
              Live · Cult Cannabis · {data.loadedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          ) : data.source === 'sostanza' ? (
            <span
              className="data-source-pill live"
              title={`Sostanza demo fixture. ${batches.length} batches across 4 flower rooms in continuous Pink Kush rotation. Cycle parameters mirror the Master Production Planning Schedule.`}
            >
              Sostanza · Demo Fixture · {batches.length} batches
            </span>
          ) : data.source === 'fallback' ? (
            <span
              className="quarantine-pill"
              title={`Live fetch failed${data.error ? `: ${data.error}` : ''}. Showing mock fixture. Sign in or fix the connection to load real data.`}
            >
              Fallback · Mock Fixture
            </span>
          ) : (
            <span
              className="quarantine-pill"
              title="This surface is operating on a mock fixture per the cultivo_planner_data_lineage doctrine. No values are operator-captured. Drop ?mock=1 to attempt the live wire."
            >
              Mock Fixture
            </span>
          )}
          {!isDemoFixture && (
            <>
              <span className="sep">·</span>
              <span>Bureau Product No. 01</span>
              <span className="sep">·</span>
              <span>CC-B</span>
            </>
          )}
        </div>
      </div>

      {/* ── KPI strip (Treatment A · hairline grid) ─────────────── */}
      <div className="kpi-strip" role="region" aria-label="Planner KPIs">
        {kpis.map((k) => {
          const path = k.spark ? sparkPath(k.spark) : '';
          const last = k.spark ? k.spark[k.spark.length - 1] : 0;
          const min = k.spark ? Math.min(...k.spark) : 0;
          const max = k.spark ? Math.max(...k.spark) : 1;
          const cy = k.spark ? 14 - ((last - min) / Math.max(1, max - min)) * 14 : 0;
          return (
            <div
              className={`kpi${k.onClick ? ' is-clickable' : ''}`}
              key={k.label}
              role={k.onClick ? 'button' : undefined}
              tabIndex={k.onClick ? 0 : undefined}
              onClick={k.onClick}
              onKeyDown={k.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') k.onClick!(); } : undefined}
              title={k.onClick ? `${k.label}: click to plan a cycle from ${k.trend ?? 'this signal'}` : undefined}
            >
              <div className="kpi-cap">{k.label}</div>
              <div className={`kpi-num ${k.tone ?? ''}`.trim()}>{k.value}</div>
              {k.trend && <div className="kpi-trend">{k.trend}</div>}
              {k.spark && (
                <svg className="kpi-spark" viewBox="0 0 80 14" preserveAspectRatio="none" aria-hidden>
                  <path d={path} />
                  <circle cx={80} cy={cy} r={1.6} />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Seed inline synthesis row ────────────────────────────── */}
      <div className="seed-row" role="region" aria-label="Seed observations">
        <div className="seed-label">
          <span className="seed-glyph" aria-hidden />
          <span>SEED · planner</span>
        </div>
        <div className="seed-body">
          {seedObservations.map((obs, i) => (
            <div className="seed-obs" key={i}>
              <span className={`seed-dot dot-${obs.status === 'bad' ? 'alarm' : obs.status}`} aria-hidden />
              <div className="seed-primary">
                <div className="seed-entity">{obs.entity}</div>
                <div className="seed-context">{obs.context}</div>
              </div>
              {obs.badge && (
                <span className={`seed-badge ${obs.badge.tone}`}>{obs.badge.text}</span>
              )}
              {obs.cta && (
                <span
                  className="seed-cta"
                  role={obs.action ? 'button' : undefined}
                  tabIndex={obs.action ? 0 : undefined}
                  onClick={obs.action?.onClick}
                  onKeyDown={(e) => { if (obs.action && (e.key === 'Enter' || e.key === ' ')) obs.action.onClick(); }}
                  style={obs.action ? { cursor: 'pointer' } : undefined}
                >
                  {obs.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FIG. 02 · Gantt body ─────────────────────────────────── */}
      <div className="serial-plate gantt-fig-plate">
        <div className="stamp">
          <span className="serial">FIG. 02</span>
          <span className="sep">·</span>
          <span>Sector Grid</span>
          <span className="sep">·</span>
          <span>{rooms.length} Rooms</span>
          <span className="sep">·</span>
          <span>{viewMode === 'planning' ? '30 Weeks · 4 Back / 26 Forward' : '20 Weeks · 4 Back / 16 Forward'}</span>
        </div>
        <div className="stamp">
          <div className="canvas-toggle view-mode-toggle" role="tablist" aria-label="View mode">
            <button
              role="tab"
              aria-selected={viewMode === 'current'}
              className={viewMode === 'current' ? 'active' : ''}
              onClick={() => setViewMode('current')}
            >
              Current
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'planning'}
              className={viewMode === 'planning' ? 'active' : ''}
              onClick={() => setViewMode('planning')}
            >
              Planning
            </button>
          </div>
        </div>
      </div>

      <div className="planner-legend cap mono" role="note" aria-label="Surface affordances">
        <span className="planner-legend-label">LEGEND</span>
        <span className="planner-legend-sep">·</span>
        <span>click any room or batch to open detail</span>
        <span className="planner-legend-sep">·</span>
        <span>drag a flower-bar edge to shift harvest</span>
        <span className="planner-legend-sep">·</span>
        <span>plan a cycle on empty rooms</span>
      </div>

      {lastFinalized && (
        <div
          className={`finalize-banner ${lastFinalized.mode === 'error' ? 'alarm' : ''}`}
          role="status"
        >
          <span className="serial">
            {lastFinalized.mode === 'error' ? 'SAVE FAILED' : 'FINALIZED'}
          </span>
          <span className="sep">·</span>
          <span>
            <span className="strong">{lastFinalized.strain}</span>{' '}
            {lastFinalized.mode === 'error' ? 'rolled back from' : 'planned into'} {lastFinalized.room}
          </span>
          {lastFinalized.mode === 'persisted' && (
            <span className="cap mute">written to planned_cycles · live</span>
          )}
          {lastFinalized.mode === 'local' && (
            <span className="cap mute">added to planning view · client only</span>
          )}
          {lastFinalized.mode === 'error' && lastFinalized.message && (
            <span className="cap mute" title={lastFinalized.message}>
              {lastFinalized.message.length > 60 ? lastFinalized.message.slice(0, 57) + '...' : lastFinalized.message}
            </span>
          )}
          <button className="banner-x" onClick={() => setLastFinalized(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <LabGantt
        rooms={rooms}
        batches={batches}
        plannedByRoom={plannedByRoom}
        viewMode={viewMode}
        hoveredBatchId={hoveredBatchId}
        selectedBatchId={selectedBatchId}
        onBatchHover={setHoveredBatchId}
        onBatchSelect={handleBatchSelect}
        onRoomClick={handleRoomClick}
        onPlanCycle={handlePlanCycle}
        onCutClones={handleCutClones}
        onCycleEdit={handleCycleEdit}
        onCycleDelete={handleCycleDelete}
        harvestOverrides={harvestOverrides}
        flowerDaysByStrain={flowerDaysByStrain}
        onHarvestShift={handleHarvestShift}
        onPlannedShift={handlePlannedShift}
      />

      {/* ── Production Calendar — 12 months forward (file 2 Pivot) ─ */}
      <section className="production-calendar" aria-label="Monthly production roll-up">
        <header className="production-calendar-header">
          <span className="serial">PRODUCTION CALENDAR</span>
          <span className="sep">·</span>
          <span className="cap mute">12 months forward</span>
          <span className="cap mute" style={{ marginLeft: 'auto' }}>
            Total{' '}
            {(
              monthlyProduction.reduce((s, m) => s + m.total_grams, 0) / 1000
            ).toFixed(0)}{' '}
            kg ·{' '}
            {monthlyProduction.reduce((s, m) => s + m.harvest_count, 0)} harvests
          </span>
        </header>
        <div className="production-calendar-grid">
          {monthlyProduction.map((m, i) => {
            const heightPct = m.total_grams > 0
              ? Math.max(8, (m.total_grams / monthlyMaxGrams) * 100)
              : 0;
            const kg = m.total_grams / 1000;
            return (
              <div
                key={m.key}
                className={`month-cell ${m.harvest_count === 0 ? 'is-empty' : ''} ${i === 0 ? 'is-current' : ''}`}
                title={
                  m.harvest_count === 0
                    ? `${m.label} ${m.year_short} · no projected harvests`
                    : [
                        `${m.label} ${m.year_short} · ${m.harvest_count} harvest${m.harvest_count === 1 ? '' : 's'} · projected ${kg.toFixed(1)} kg`,
                        '',
                        ...m.contributions.map(
                          (c) => `${c.harvest_label}  ${c.batch_code} · ${c.room_code} · ${c.strain_name} · ${(c.grams / 1000).toFixed(1)} kg`
                        ),
                      ].join('\n')
                }
              >
                <div className="month-bar-track" aria-hidden>
                  <div className="month-bar-fill" style={{ height: `${heightPct}%` }} />
                </div>
                <div className="month-cell-foot">
                  <span className="month-label cap mono">
                    {m.label} {m.year_short}
                  </span>
                  <span className="month-kg display">
                    {m.harvest_count === 0 ? '—' : `${kg.toFixed(1)} kg`}
                  </span>
                  <span className="month-trend cap mute">
                    {m.harvest_count === 0
                      ? ''
                      : `${m.harvest_count} harvest${m.harvest_count === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <LabRoomDrawer
        room={drawerRoom}
        rooms={rooms}
        batches={batches}
        selectedBatchId={selectedBatchId}
        strainStatsById={strainStatsById}
        motherLots={motherLots}
        onClose={handleDrawerClose}
        onSelectBatch={(id) => setSelectedBatchId(id === '' ? null : id)}
        onPlanCycle={(room) => {
          setDrawerRoomId(null);
          handlePlanCycle(room);
        }}
      />

      {planFormRoom && (
        <LabPlanCycleForm
          room={planFormRoom}
          strainStats={strainStats}
          strainStatsById={strainStatsById}
          motherLots={motherLots}
          initialStrainId={planFormPrefill?.initialStrainId}
          initialFlowerStart={planFormPrefill?.initialFlowerStart}
          prefillReason={planFormPrefill?.prefillReason}
          onCancel={() => {
            setPlanFormRoom(null);
            setPlanFormPrefill(null);
          }}
          onFinalize={(entry, roomId, roomCode) => {
            handleFinalize(entry, roomId, roomCode);
            setPlanFormPrefill(null);
          }}
        />
      )}
    </div>
  );
}

export default LabProductionPlanner;
