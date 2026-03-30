import { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Plus, ChevronRight, Calendar, Leaf, Scissors, Sprout, Warehouse, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STAGE_HEX } from '@/features/production-planner/types';

// ═══════════════════════════════════════════════════════════════
// Pipeline Planner — cultivation cycle planning hub
// Plan clone/flip/harvest dates across all rooms, see labor
// collisions, mother room demand, and inventory projections.
// ═══════════════════════════════════════════════════════════════

interface CultivationPlan {
  id: string;
  room_id: string;
  strain_id: string | null;
  batch_id: string | null;
  feed_program_id: string | null;
  plan_name: string | null;
  plan_status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  planned_plant_count: number | null;
  planned_clone_count: number | null;
  clone_date: string | null;
  veg_start_date: string | null;
  flower_date: string | null;
  harvest_date: string | null;
  dry_date: string | null;
  clone_days: number | null;
  veg_days: number | null;
  flower_days: number | null;
  dry_days: number | null;
  turnaround_days: number | null;
  actual_clone_date: string | null;
  actual_veg_start_date: string | null;
  actual_flower_date: string | null;
  actual_harvest_date: string | null;
  actual_dry_date: string | null;
  mother_plant_group_id: string | null;
  projected_wet_weight_g: number | null;
  projected_dry_weight_g: number | null;
  projected_packaged_weight_g: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RoomInfo {
  id: string;
  room_code: string;
  name: string;
  room_type: string;
  capacity_plants: number | null;
}

interface StrainInfo {
  id: string;
  name: string;
  display_name: string | null;
  flowering_time_days: number | null;
  veg_days_avg: number | null;
  feed_group: string | null;
}

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, clone: 1, veg: 2, flower: 3, mixed: 4 };

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-cult-charcoal/60', text: 'text-cult-medium-gray', border: 'border-cult-dark-gray/40' },
  scheduled: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/30' },
  active: { bg: 'bg-green-950/40', text: 'text-green-400', border: 'border-green-800/30' },
  completed: { bg: 'bg-cult-charcoal/30', text: 'text-cult-dark-gray', border: 'border-cult-dark-gray/30' },
  cancelled: { bg: 'bg-red-950/20', text: 'text-red-400/50', border: 'border-red-800/20' },
};

// ═══ Timeline constants ═══
const DAY_WIDTH = 6;
const ROW_HEIGHT = 56;
const LABEL_WIDTH = 140;
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 20;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toDate(s: string | null): Date | null {
  return s ? new Date(s + 'T12:00:00') : null;
}

export function PipelinePlanner() {
  const [plans, setPlans] = useState<CultivationPlan[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [strains, setStrains] = useState<StrainInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'flower'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    const [plansRes, roomsRes, strainsRes] = await Promise.all([
      supabase.from('cultivation_plans').select('*').not('plan_status', 'eq', 'cancelled').order('flower_date', { ascending: true }),
      supabase.from('grow_rooms').select('id, room_code, name, room_type, capacity_plants').eq('is_active', true),
      supabase.from('strains').select('id, name, display_name, flowering_time_days, veg_days_avg, feed_group').eq('is_active', true),
    ]);
    setPlans((plansRes.data ?? []) as CultivationPlan[]);
    setRooms((roomsRes.data ?? []) as RoomInfo[]);
    setStrains((strainsRes.data ?? []) as StrainInfo[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = getMonday(today);
    d.setDate(d.getDate() - WEEKS_BEFORE * 7);
    return d;
  }, [today]);
  const totalDays = (WEEKS_BEFORE + WEEKS_AFTER) * 7;
  const todayX = daysBetween(startDate, today) * DAY_WIDTH;

  // Group rooms by type, sorted
  const sortedRooms = useMemo(() =>
    [...rooms].sort((a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)),
    [rooms]
  );

  // Filter to flower rooms for the main planner view
  const plannerRooms = useMemo(() => {
    if (filter === 'flower') return sortedRooms.filter((r) => r.room_type === 'flower');
    return sortedRooms;
  }, [sortedRooms, filter]);

  // Plans grouped by room
  const plansByRoom = useMemo(() => {
    const map = new Map<string, CultivationPlan[]>();
    for (const plan of plans) {
      if (filter === 'active' && plan.plan_status === 'completed') continue;
      const existing = map.get(plan.room_id) ?? [];
      existing.push(plan);
      map.set(plan.room_id, existing);
    }
    return map;
  }, [plans, filter]);

  // Strain lookup
  const strainMap = useMemo(() => {
    const map = new Map<string, StrainInfo>();
    for (const s of strains) map.set(s.id, s);
    return map;
  }, [strains]);

  // Week markers for timeline header
  const weeks = useMemo(() => {
    const result: { x: number; date: Date; label: string; isMonthStart: boolean }[] = [];
    for (let w = 0; w < WEEKS_BEFORE + WEEKS_AFTER; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      result.push({
        x: w * 7 * DAY_WIDTH,
        date: d,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isMonthStart: d.getDate() <= 7,
      });
    }
    return result;
  }, [startDate]);

  // Stats
  const activeCount = plans.filter((p) => p.plan_status === 'active').length;
  const scheduledCount = plans.filter((p) => p.plan_status === 'scheduled').length;
  const draftCount = plans.filter((p) => p.plan_status === 'draft').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cult-medium-gray text-sm">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-cult-near-black">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cult-dark-gray/40">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold text-cult-white tracking-wide">Pipeline Planner</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick stats */}
          <div className="flex items-center gap-4 mr-4 text-xs">
            <span className="text-green-400">{activeCount} active</span>
            <span className="text-blue-400">{scheduledCount} scheduled</span>
            <span className="text-cult-medium-gray">{draftCount} draft</span>
          </div>
          {/* Filter */}
          <div className="flex items-center gap-1 bg-cult-charcoal/40 rounded-sm p-0.5">
            {(['active', 'all', 'flower'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                  filter === f
                    ? 'bg-cult-charcoal text-cult-white'
                    : 'text-cult-medium-gray hover:text-cult-light-gray'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'all' ? 'All' : 'Flower'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>
          {/* Timeline header */}
          <div className="sticky top-0 z-20 flex bg-cult-near-black border-b border-cult-dark-gray/40">
            <div className="flex-shrink-0 bg-cult-near-black" style={{ width: LABEL_WIDTH }} />
            <div className="relative flex-1" style={{ height: 36 }}>
              {weeks.map((w, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-cult-dark-gray/20"
                  style={{ left: w.x }}
                >
                  <span className={`pl-1 text-[10px] ${w.isMonthStart ? 'text-cult-light-gray font-semibold' : 'text-cult-dark-gray'}`}>
                    {w.label}
                  </span>
                </div>
              ))}
              {/* Today line */}
              <div
                className="absolute top-0 h-full w-px bg-violet-500/60"
                style={{ left: todayX }}
              />
            </div>
          </div>

          {/* Room rows */}
          {plannerRooms.map((room) => {
            const roomPlans = plansByRoom.get(room.id) ?? [];
            return (
              <div key={room.id} className="flex border-b border-cult-dark-gray/20 hover:bg-cult-charcoal/10">
                {/* Room label */}
                <div
                  className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-cult-dark-gray/20"
                  style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STAGE_HEX[room.room_type] ?? '#6B7280' }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-cult-white truncate">{room.room_code || room.name}</div>
                    <div className="text-[10px] text-cult-dark-gray capitalize">{room.room_type}</div>
                  </div>
                </div>

                {/* Timeline bars */}
                <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                  {/* Background grid */}
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-cult-dark-gray/10"
                      style={{ left: w.x }}
                    />
                  ))}
                  {/* Today line */}
                  <div
                    className="absolute top-0 h-full w-px bg-violet-500/20"
                    style={{ left: todayX }}
                  />

                  {/* Plan bars */}
                  {roomPlans.map((plan) => {
                    const strain = plan.strain_id ? strainMap.get(plan.strain_id) : null;
                    const planStart = toDate(plan.clone_date ?? plan.veg_start_date ?? plan.flower_date);
                    const planEnd = toDate(plan.dry_date ?? plan.harvest_date ?? plan.flower_date);
                    if (!planStart || !planEnd) return null;

                    const x = daysBetween(startDate, planStart) * DAY_WIDTH;
                    const width = Math.max(daysBetween(planStart, planEnd) * DAY_WIDTH, 20);
                    const statusStyle = STATUS_STYLES[plan.plan_status] ?? STATUS_STYLES.draft;

                    // Stage segments within the bar
                    const cloneStart = toDate(plan.clone_date);
                    const vegStart = toDate(plan.veg_start_date);
                    const flowerStart = toDate(plan.flower_date);
                    const harvestStart = toDate(plan.harvest_date);

                    return (
                      <div
                        key={plan.id}
                        className={`absolute top-2 bottom-2 rounded-sm border ${statusStyle.border} overflow-hidden cursor-pointer hover:brightness-125 transition-all`}
                        style={{ left: Math.max(x, 0), width }}
                        title={`${strain?.display_name ?? strain?.name ?? 'No strain'} — ${plan.plan_status}\n${plan.planned_plant_count ?? '?'} plants`}
                      >
                        {/* Stage color segments */}
                        {cloneStart && vegStart && (
                          <div
                            className="absolute top-0 bottom-0 opacity-40"
                            style={{
                              left: 0,
                              width: daysBetween(cloneStart, vegStart) * DAY_WIDTH,
                              backgroundColor: STAGE_HEX.clone,
                            }}
                          />
                        )}
                        {vegStart && flowerStart && (
                          <div
                            className="absolute top-0 bottom-0 opacity-40"
                            style={{
                              left: (vegStart && cloneStart ? daysBetween(cloneStart, vegStart) : 0) * DAY_WIDTH,
                              width: daysBetween(vegStart, flowerStart) * DAY_WIDTH,
                              backgroundColor: STAGE_HEX.veg,
                            }}
                          />
                        )}
                        {flowerStart && harvestStart && (
                          <div
                            className="absolute top-0 bottom-0 opacity-40"
                            style={{
                              left: (flowerStart && cloneStart ? daysBetween(cloneStart, flowerStart) : 0) * DAY_WIDTH,
                              width: daysBetween(flowerStart, harvestStart) * DAY_WIDTH,
                              backgroundColor: STAGE_HEX.flower,
                            }}
                          />
                        )}

                        {/* Label */}
                        <div className="relative z-10 flex items-center h-full px-2">
                          <span className="text-[10px] font-semibold text-cult-white truncate">
                            {strain?.display_name ?? strain?.name ?? plan.plan_name ?? '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state for rooms with no plans */}
                  {roomPlans.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-cult-dark-gray/40 italic">No plans</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
