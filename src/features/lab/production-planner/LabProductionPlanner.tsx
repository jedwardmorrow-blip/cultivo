import { useState, useMemo, useCallback } from 'react';
import type { CalendarRoom, CalendarPlannedEntry, StrainCultivationStats } from '@/features/production-planner/types';
import { LabGantt } from './LabGantt';
import { LabRoomDrawer } from './LabRoomDrawer';
import { LabPlanCycleForm } from './LabPlanCycleForm';
import type { MotherLot } from './LabPlanCycleForm';
import { MOCK_ROOMS, MOCK_PLANNED, MOCK_STRAIN_STATS, MOCK_BATCHES } from './planner-mock';
import type { Batch } from './planner-mock';
import './lab-tokens.css';

type ViewMode = 'current' | 'planning';

type CanvasMode = 'deep' | 'marketing' | 'paper';

interface Kpi {
  label: string;
  value: string;
  trend?: string;
  tone?: 'gold' | 'alarm' | 'ink' | 'dim';
  spark?: number[];
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

  const batches: Batch[] = MOCK_BATCHES;
  const today = useMemo(() => new Date(), []);
  const liveTime = useMemo(() => formatLiveTime(today), [today]);
  const weekOf = useMemo(() => formatWeekOf(today), [today]);

  const rooms: CalendarRoom[] = MOCK_ROOMS;

  // Planned cycles are now lifted into state so plan-create / inline-edit
  // mutations are visible on the Gantt without a refresh.
  const [plannedByRoom, setPlannedByRoom] = useState<Record<string, CalendarPlannedEntry[]>>(MOCK_PLANNED);
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  const strainStats = MOCK_STRAIN_STATS;

  // Mother lots: one per strain in the MOM-01 mother room.
  // Per cultivo_planner_data_lineage doctrine, all of Cult Cannabis's mock
  // mothers are flagged as synthetic (back-filled planted_date 2026-04-03).
  const motherLots: MotherLot[] = useMemo(() => {
    const motherRoom = rooms.find((r) => r.room_type === 'mother');
    if (!motherRoom) return [];
    return motherRoom.strains.map((s) => ({
      mom_plant_group_id: s.strain_id, // mock: one mom-group per strain
      strain_id: s.strain_id,
      strain_name: s.strain_name,
      plant_count: s.plant_count,
      synthetic: true,
    }));
  }, [rooms]);
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

  // Last-finalized confirmation banner.
  const [lastFinalized, setLastFinalized] = useState<{ strain: string; room: string } | null>(null);

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
    setPlanFormRoom(room);
  }, []);

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
    (entry: CalendarPlannedEntry, roomId: string, roomCode: string) => {
      setPlannedByRoom((prev) => {
        const list = prev[roomId] ?? [];
        return { ...prev, [roomId]: [...list, entry] };
      });
      setLastFinalized({ strain: entry.strain_name, room: roomCode });
      setPlanFormRoom(null);
      setViewMode('planning');
      // Auto-clear the confirmation after a few seconds.
      window.setTimeout(() => setLastFinalized(null), 4500);
    },
    []
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

    // 1. HARVEST WINDOW
    const next = activeFlower[0];
    const harvestDays = next ? Math.round((next.harvest.getTime() - today.getTime()) / 86400000) : null;

    // 2. AVAILABLE FOR SALE — sum forecast yield for harvests in next 30 days
    const horizon30 = new Date(today);
    horizon30.setDate(horizon30.getDate() + 30);
    const afsGrams = activeFlower
      .filter((b) => b.harvest <= horizon30)
      .reduce((acc, b) => acc + b.yield_g, 0);

    // 3. UNMATCHED DEMAND — strains with unassigned demand
    const unmatched = strainStats.filter((s) => (s.demand_unassigned_units ?? 0) > 0);

    // 4. ROOMS READY — flower rooms with zero plants
    const readyRooms = rooms.filter((r) => r.room_type === 'flower' && r.total_plants === 0);
    const totalFlower = rooms.filter((r) => r.room_type === 'flower').length;

    // 5. CYCLES PLANNED — plannedByRoom entry count
    const allPlanned = Object.values(plannedByRoom).flat();
    const committed = allPlanned.filter((p) => p.status === 'committed').length;
    const draft = allPlanned.filter((p) => p.status === 'draft').length;

    // 6. WEEK STATUS — derived from harvest delays + planning state
    const overdueDrags = Object.entries(harvestOverrides).filter(([batchId, iso]) => {
      const original = batches.find((b) => b.batch_id === batchId)?.segments.find((s) => s.stage === 'flower')?.end;
      if (!original) return false;
      const delta = Math.round((new Date(iso).getTime() - new Date(original).getTime()) / 86400000);
      return delta > 3;
    });
    let statusLabel = 'OK';
    let statusTrend = 'no blocked rooms';
    let statusTone: Kpi['tone'] = 'ink';
    if (overdueDrags.length > 0) {
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
        trend: next ? `next harvest ${next.room_code}` : 'no active flower',
        spark: makeSpark(SPARK_SEEDS.harvest),
      },
      {
        label: 'Available For Sale',
        value: afsGrams > 0 ? Math.round(afsGrams / 1000).toLocaleString() + ' kg' : '—',
        trend: `${activeFlower.filter((b) => b.harvest <= horizon30).length} harvests in 30d`,
        spark: makeSpark(SPARK_SEEDS.afs),
      },
      {
        label: 'Unmatched Demand',
        value: unmatched.length > 0 ? String(unmatched.length) : '0',
        trend: unmatched.length > 0
          ? `${unmatched.slice(0, 2).map((s) => s.strain_name.split(' ')[0]).join(', ')}${unmatched.length > 2 ? '…' : ''}`
          : 'all strains matched',
        spark: makeSpark(SPARK_SEEDS.demand),
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
  }, [batches, rooms, plannedByRoom, harvestOverrides, strainStats]);

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

    // Idle strain — pick any active batch's strain that hasn't been touched in a while.
    const ehBatch = batches.find((b) => b.strain_name === "Earth's Healing");
    if (ehBatch) {
      out.push({
        status: 'warn',
        entity: ehBatch.strain_name.toUpperCase(),
        context: 'cooled 28 days idle; mother room has 4 rootable cuts ready, last replant lined up vs avg.',
        badge: { text: 'IDLE 28d', tone: 'warn' },
        cta: 'OPEN STRAIN →',
        action: {
          cta: 'OPEN STRAIN →',
          onClick: () => {
            setDrawerRoomId(ehBatch.current_room_id);
            setSelectedBatchId(ehBatch.batch_id);
          },
        },
      });
    }

    // Paced strain — Story Long Distance current cycle covers projected pull.
    const sldBatch = batches.find((b) => b.strain_name === 'Story Long Distance');
    if (sldBatch) {
      out.push({
        status: 'ok',
        entity: sldBatch.strain_name.toUpperCase(),
        context: 'demand +14% MoM, mother count holds at 6, current cycle pacing covers projected pull.',
        badge: { text: 'PACED', tone: 'ok' },
        cta: 'OPEN STRAIN →',
        action: {
          cta: 'OPEN STRAIN →',
          onClick: () => {
            setDrawerRoomId(sldBatch.current_room_id);
            setSelectedBatchId(sldBatch.batch_id);
          },
        },
      });
    }

    return out;
  }, [batches, rooms, plannedByRoom, harvestOverrides]);

  const canvasClass =
    canvas === 'marketing' ? 'canvas-marketing' :
    canvas === 'paper' ? 'canvas-paper' : '';

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
            <div className="wordmark-sub">
              Operational Bureau No. 26 · Phoenix · Berlin
            </div>
          </div>
        </div>

        <div className="masthead-meta">
          <span className="live">
            <span className="dot-pulse-wrap" aria-hidden>
              <span className="dot-pulse" />
              <span className="dot-pulse-core" />
            </span>
            <span>SYSTEM LIVE</span>
          </span>
          <span>{liveTime}</span>
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
            <button
              role="tab"
              aria-selected={canvas === 'paper'}
              className={canvas === 'paper' ? 'active' : ''}
              onClick={() => setCanvas('paper')}
            >
              Paper
            </button>
          </div>
        </div>
      </div>

      {/* ── Serial plate ──────────────────────────────────────────── */}
      <div className="serial-plate" role="banner">
        <div className="stamp">
          <span className="serial">FIG. 01</span>
          <span className="sep">·</span>
          <span>Production Planner</span>
          <span className="sep">·</span>
          <span>Cult Cannabis</span>
          <span className="sep">·</span>
          <span>Week of {weekOf}</span>
        </div>
        <div className="stamp">
          <span
            className="quarantine-pill"
            title="This surface is operating on a mock fixture per the cultivo_planner_data_lineage doctrine. No values are operator-captured. Real-data wire is the next milestone."
          >
            Mock Fixture
          </span>
          <span className="sep">·</span>
          <span>Bureau Product No. 01</span>
          <span className="sep">·</span>
          <span>CC-B</span>
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
            <div className="kpi" key={k.label}>
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

      {lastFinalized && (
        <div className="finalize-banner" role="status">
          <span className="serial">FINALIZED</span>
          <span className="sep">·</span>
          <span>
            <span className="strong">{lastFinalized.strain}</span> planned into {lastFinalized.room}
          </span>
          <span className="cap mute">added to planning view</span>
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
        onCycleEdit={handleCycleEdit}
        onCycleDelete={handleCycleDelete}
        harvestOverrides={harvestOverrides}
        flowerDaysByStrain={flowerDaysByStrain}
        onHarvestShift={handleHarvestShift}
        onPlannedShift={handlePlannedShift}
      />

      <LabRoomDrawer
        room={drawerRoom}
        rooms={rooms}
        batches={batches}
        selectedBatchId={selectedBatchId}
        strainStatsById={strainStatsById}
        onClose={handleDrawerClose}
        onSelectBatch={(id) => setSelectedBatchId(id === '' ? null : id)}
        onPlanCycle={(room) => {
          setDrawerRoomId(null);
          setPlanFormRoom(room);
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
