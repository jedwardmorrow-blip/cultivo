import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Target, Plus, X, ChevronRight, ChevronLeft, Calendar, Leaf, Scissors,
  Sprout, Warehouse, AlertTriangle, Check, Trash2, Copy, Eye, EyeOff,
  Zap, Clock, TrendingUp, Flower2, Droplets, Save, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STAGE_HEX } from '@/features/production-planner/types';
import type { CultivationPlan } from '@/types';
import {
  createCultivationPlan,
  createPlanSnapshot,
  updateCultivationPlan,
  cancelCultivationPlan,
} from '@/features/hub/services';

// ═══════════════════════════════════════════════════════════════
// Pipeline Planner — cultivation cycle planning hub
// Plan clone/flip/harvest dates across all rooms, see labor
// collisions, mother room demand, and inventory projections.
// ═══════════════════════════════════════════════════════════════

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
  clone_days_avg: number | null;
  dry_days_avg: number | null;
  feed_group: string | null;
  avg_yield_per_plant_g: number | null;
}

interface FeedProgram {
  id: string;
  name: string;
}

// ═══ Constants ═══
const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, clone: 1, veg: 2, flower: 3, mixed: 4 };
const DAY_WIDTH = 6;
const ROW_HEIGHT = 56;
const LABEL_WIDTH = 160;
const HEATMAP_HEIGHT = 32;
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 20;

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; barBg: string }> = {
  draft: { bg: 'bg-cult-charcoal/60', text: 'text-cult-medium-gray', border: 'border-cult-dark-gray/40', barBg: 'rgba(107,114,128,0.25)' },
  scheduled: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/30', barBg: 'rgba(59,130,246,0.2)' },
  active: { bg: 'bg-green-950/40', text: 'text-green-400', border: 'border-green-800/30', barBg: 'rgba(16,185,129,0.25)' },
  completed: { bg: 'bg-cult-charcoal/30', text: 'text-cult-dark-gray', border: 'border-cult-dark-gray/30', barBg: 'rgba(107,114,128,0.15)' },
  cancelled: { bg: 'bg-red-950/20', text: 'text-red-400/50', border: 'border-red-800/20', barBg: 'rgba(239,68,68,0.1)' },
};

const STATUS_OPTIONS: PlanStatus[] = ['draft', 'scheduled', 'active', 'completed', 'cancelled'];

// ═══ Date helpers ═══
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

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatShort(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ═══ Auto-cascade: compute milestone dates from a start date + strain durations ═══
function cascadeDates(
  startField: 'clone_date' | 'veg_start_date' | 'flower_date',
  startValue: string,
  strain: StrainInfo | null,
  overrides: Partial<CultivationPlan>,
): Partial<CultivationPlan> {
  const cloneDays = overrides.clone_days ?? strain?.clone_days_avg ?? 14;
  const vegDays = overrides.veg_days ?? strain?.veg_days_avg ?? 28;
  const flowerDays = overrides.flower_days ?? strain?.flowering_time_days ?? 63;
  const dryDays = overrides.dry_days ?? strain?.dry_days_avg ?? 14;
  const start = new Date(startValue + 'T12:00:00');

  const result: Partial<CultivationPlan> = {
    clone_days: cloneDays,
    veg_days: vegDays,
    flower_days: flowerDays,
    dry_days: dryDays,
  };

  if (startField === 'clone_date') {
    result.clone_date = startValue;
    const vegStart = addDays(start, cloneDays);
    result.veg_start_date = toISO(vegStart);
    const flowerStart = addDays(vegStart, vegDays);
    result.flower_date = toISO(flowerStart);
    const harvest = addDays(flowerStart, flowerDays);
    result.harvest_date = toISO(harvest);
    result.dry_date = toISO(addDays(harvest, dryDays));
  } else if (startField === 'veg_start_date') {
    result.veg_start_date = startValue;
    result.clone_date = toISO(addDays(start, -cloneDays));
    const flowerStart = addDays(start, vegDays);
    result.flower_date = toISO(flowerStart);
    const harvest = addDays(flowerStart, flowerDays);
    result.harvest_date = toISO(harvest);
    result.dry_date = toISO(addDays(harvest, dryDays));
  } else {
    result.flower_date = startValue;
    result.veg_start_date = toISO(addDays(start, -vegDays));
    result.clone_date = toISO(addDays(start, -(vegDays + cloneDays)));
    const harvest = addDays(start, flowerDays);
    result.harvest_date = toISO(harvest);
    result.dry_date = toISO(addDays(harvest, dryDays));
  }

  return result;
}

// ═══ Labor heatmap: count milestone events per day ═══
const MILESTONE_KEYS = ['clone_date', 'veg_start_date', 'flower_date', 'harvest_date', 'dry_date'] as const;
const HEAVY_TASK_DAYS = new Set(['flower_date', 'harvest_date']); // flip & harvest are labor-heavy

function buildHeatmap(plans: CultivationPlan[], startDate: Date, totalDays: number): number[] {
  const heat = new Array(totalDays).fill(0);
  for (const plan of plans) {
    if (plan.plan_status === 'cancelled' || plan.plan_status === 'completed') continue;
    for (const key of MILESTONE_KEYS) {
      const d = toDate(plan[key]);
      if (!d) continue;
      const idx = daysBetween(startDate, d);
      if (idx >= 0 && idx < totalDays) {
        heat[idx] += HEAVY_TASK_DAYS.has(key) ? 3 : 1;
      }
    }
  }
  return heat;
}

// ═══ Empty plan template ═══
function emptyPlan(roomId: string): Partial<CultivationPlan> {
  return {
    room_id: roomId,
    strain_id: null,
    batch_id: null,
    feed_program_id: null,
    plan_name: null,
    plan_status: 'draft',
    planned_plant_count: null,
    planned_clone_count: null,
    clone_date: null,
    veg_start_date: null,
    flower_date: null,
    harvest_date: null,
    dry_date: null,
    clone_days: null,
    veg_days: null,
    flower_days: null,
    dry_days: null,
    turnaround_days: 3,
    projected_wet_weight_g: null,
    projected_dry_weight_g: null,
    notes: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// PLAN FORM — shared between create & edit
// ═══════════════════════════════════════════════════════════════
interface PlanFormProps {
  plan: Partial<CultivationPlan>;
  rooms: RoomInfo[];
  strains: StrainInfo[];
  feedPrograms: FeedProgram[];
  strainMap: Map<string, StrainInfo>;
  onChange: (updates: Partial<CultivationPlan>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  isEdit: boolean;
}

function PlanForm({ plan, rooms, strains, feedPrograms, strainMap, onChange, onSave, onCancel, onDelete, saving, isEdit }: PlanFormProps) {
  const selectedStrain = plan.strain_id ? strainMap.get(plan.strain_id) ?? null : null;

  const handleStrainChange = (strainId: string) => {
    const strain = strainMap.get(strainId) ?? null;
    const updates: Partial<CultivationPlan> = { strain_id: strainId || null };
    if (strain) {
      updates.clone_days = strain.clone_days_avg ?? 14;
      updates.veg_days = strain.veg_days_avg ?? 28;
      updates.flower_days = strain.flowering_time_days ?? 63;
      updates.dry_days = strain.dry_days_avg ?? 14;
      if (strain.avg_yield_per_plant_g && plan.planned_plant_count) {
        updates.projected_wet_weight_g = Math.round(strain.avg_yield_per_plant_g * plan.planned_plant_count);
      }
      // Re-cascade if we already have a flower_date
      if (plan.flower_date) {
        Object.assign(updates, cascadeDates('flower_date', plan.flower_date, strain, updates));
      }
    }
    onChange(updates);
  };

  const handleDateAnchor = (field: 'clone_date' | 'veg_start_date' | 'flower_date', value: string) => {
    if (!value) { onChange({ [field]: null }); return; }
    const cascaded = cascadeDates(field, value, selectedStrain, plan);
    onChange(cascaded);
  };

  const handleDurationChange = (field: 'clone_days' | 'veg_days' | 'flower_days' | 'dry_days', value: number) => {
    const updates: Partial<CultivationPlan> = { [field]: value };
    // Re-cascade from the earliest set date
    const anchor = plan.clone_date ? 'clone_date' : plan.veg_start_date ? 'veg_start_date' : plan.flower_date ? 'flower_date' : null;
    if (anchor && plan[anchor]) {
      Object.assign(updates, cascadeDates(anchor, plan[anchor]!, selectedStrain, { ...plan, ...updates }));
    }
    onChange(updates);
  };

  const handlePlantCount = (count: number) => {
    const updates: Partial<CultivationPlan> = { planned_plant_count: count };
    if (selectedStrain?.avg_yield_per_plant_g) {
      updates.projected_wet_weight_g = Math.round(selectedStrain.avg_yield_per_plant_g * count);
    }
    onChange(updates);
  };

  const inputClass = 'w-full bg-cult-charcoal/60 border border-cult-dark-gray/40 rounded px-2.5 py-1.5 text-sm text-cult-white focus:outline-none focus:border-violet-500/50';
  const labelClass = 'text-[11px] font-semibold text-cult-medium-gray uppercase tracking-wider mb-1';

  return (
    <div className="space-y-4">
      {/* Room + Strain row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={labelClass}>Room</div>
          <select
            value={plan.room_id ?? ''}
            onChange={(e) => onChange({ room_id: e.target.value })}
            className={inputClass}
            disabled={isEdit}
          >
            <option value="">Select room...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.room_code || r.name} ({r.room_type})</option>
            ))}
          </select>
        </div>
        <div>
          <div className={labelClass}>Strain</div>
          <select
            value={plan.strain_id ?? ''}
            onChange={(e) => handleStrainChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select strain...</option>
            {strains.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name || s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Plan name + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={labelClass}>Plan Name (optional)</div>
          <input
            type="text"
            value={plan.plan_name ?? ''}
            onChange={(e) => onChange({ plan_name: e.target.value || null })}
            placeholder="e.g. Spring Run 1"
            className={inputClass}
          />
        </div>
        <div>
          <div className={labelClass}>Status</div>
          <select
            value={plan.plan_status ?? 'draft'}
            onChange={(e) => onChange({ plan_status: e.target.value as PlanStatus })}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration controls */}
      <div>
        <div className={`${labelClass} flex items-center gap-2`}>
          <Clock className="w-3 h-3" /> Stage Durations (days)
          {selectedStrain && <span className="text-violet-400 font-normal normal-case">— from {selectedStrain.display_name || selectedStrain.name}</span>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {([
            ['clone_days', 'Clone'],
            ['veg_days', 'Veg'],
            ['flower_days', 'Flower'],
            ['dry_days', 'Dry'],
          ] as const).map(([field, label]) => (
            <div key={field}>
              <div className="text-[10px] text-cult-dark-gray mb-0.5">{label}</div>
              <input
                type="number"
                min={1}
                value={plan[field] ?? ''}
                onChange={(e) => handleDurationChange(field, parseInt(e.target.value) || 0)}
                className={inputClass + ' text-center'}
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Date anchors */}
      <div>
        <div className={`${labelClass} flex items-center gap-2`}>
          <Calendar className="w-3 h-3" /> Milestone Dates
          <span className="text-cult-dark-gray font-normal normal-case">— set one, rest cascade</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {([
            ['clone_date', 'Clone', true],
            ['veg_start_date', 'Veg Start', true],
            ['flower_date', 'Flip', true],
            ['harvest_date', 'Harvest', false],
            ['dry_date', 'Dry End', false],
          ] as const).map(([field, label, isAnchor]) => (
            <div key={field}>
              <div className={`text-[10px] mb-0.5 ${isAnchor ? 'text-violet-400' : 'text-cult-dark-gray'}`}>
                {label} {isAnchor && '●'}
              </div>
              <input
                type="date"
                value={plan[field as keyof CultivationPlan] as string ?? ''}
                onChange={(e) => {
                  if (isAnchor) {
                    handleDateAnchor(field as 'clone_date' | 'veg_start_date' | 'flower_date', e.target.value);
                  } else {
                    onChange({ [field]: e.target.value || null });
                  }
                }}
                className={inputClass + ' text-xs'}
              />
            </div>
          ))}
        </div>
        <div className="text-[10px] text-cult-dark-gray mt-1">● = anchor point — setting this recalculates all other dates</div>
      </div>

      {/* Plant counts + yield projection */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className={labelClass}>Plant Count</div>
          <input
            type="number"
            min={0}
            value={plan.planned_plant_count ?? ''}
            onChange={(e) => handlePlantCount(parseInt(e.target.value) || 0)}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div>
          <div className={labelClass}>Clone Count</div>
          <input
            type="number"
            min={0}
            value={plan.planned_clone_count ?? ''}
            onChange={(e) => onChange({ planned_clone_count: parseInt(e.target.value) || null })}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div>
          <div className={labelClass}>Feed Program</div>
          <select
            value={plan.feed_program_id ?? ''}
            onChange={(e) => onChange({ feed_program_id: e.target.value || null })}
            className={inputClass}
          >
            <option value="">None</option>
            {feedPrograms.map((fp) => (
              <option key={fp.id} value={fp.id}>{fp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yield projections */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className={labelClass}>Proj. Wet (g)</div>
          <input
            type="number"
            min={0}
            value={plan.projected_wet_weight_g ?? ''}
            onChange={(e) => onChange({ projected_wet_weight_g: parseInt(e.target.value) || null })}
            className={inputClass}
            placeholder="auto"
          />
        </div>
        <div>
          <div className={labelClass}>Proj. Dry (g)</div>
          <input
            type="number"
            min={0}
            value={plan.projected_dry_weight_g ?? ''}
            onChange={(e) => onChange({ projected_dry_weight_g: parseInt(e.target.value) || null })}
            className={inputClass}
            placeholder="—"
          />
        </div>
        <div>
          <div className={labelClass}>Turnaround (days)</div>
          <input
            type="number"
            min={0}
            value={plan.turnaround_days ?? ''}
            onChange={(e) => onChange({ turnaround_days: parseInt(e.target.value) || null })}
            className={inputClass}
            placeholder="3"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className={labelClass}>Notes</div>
        <textarea
          value={plan.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value || null })}
          className={inputClass + ' h-16 resize-none'}
          placeholder="Any notes for this cycle..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-cult-dark-gray/30">
        <div>
          {onDelete && (
            <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-cult-medium-gray hover:text-cult-white rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !plan.room_id}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE BAR — individual plan bar on the Gantt
// ═══════════════════════════════════════════════════════════════
interface TimelineBarProps {
  plan: CultivationPlan;
  strain: StrainInfo | null;
  startDate: Date;
  onClick: () => void;
  isSelected: boolean;
}

function TimelineBar({ plan, strain, startDate, onClick, isSelected }: TimelineBarProps) {
  const planStart = toDate(plan.clone_date ?? plan.veg_start_date ?? plan.flower_date);
  const planEnd = toDate(plan.dry_date ?? plan.harvest_date ?? plan.flower_date);
  if (!planStart || !planEnd) return null;

  const x = daysBetween(startDate, planStart) * DAY_WIDTH;
  const width = Math.max(daysBetween(planStart, planEnd) * DAY_WIDTH, 24);
  const statusStyle = STATUS_STYLES[plan.plan_status] ?? STATUS_STYLES.draft;

  const cloneStart = toDate(plan.clone_date);
  const vegStart = toDate(plan.veg_start_date);
  const flowerStart = toDate(plan.flower_date);
  const harvestStart = toDate(plan.harvest_date);
  const dryEnd = toDate(plan.dry_date);

  const totalSpan = planEnd.getTime() - planStart.getTime();
  const pct = (d: Date) => totalSpan > 0 ? ((d.getTime() - planStart.getTime()) / totalSpan) * 100 : 0;

  return (
    <div
      className={`absolute top-2 bottom-2 rounded-sm border overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'border-violet-400 ring-1 ring-violet-400/40 z-10' : statusStyle.border + ' hover:brightness-125'
      }`}
      style={{ left: Math.max(x, 0), width }}
      onClick={onClick}
      title={`${strain?.display_name ?? strain?.name ?? plan.plan_name ?? 'Unnamed'} — ${plan.plan_status}\n${plan.planned_plant_count ?? '?'} plants\nFlip: ${formatShort(plan.flower_date)} → Harvest: ${formatShort(plan.harvest_date)}`}
    >
      {/* Stage color segments */}
      {cloneStart && vegStart && (
        <div
          className="absolute top-0 bottom-0 opacity-40"
          style={{ left: '0%', width: `${pct(vegStart)}%`, backgroundColor: STAGE_HEX.clone }}
        />
      )}
      {vegStart && flowerStart && (
        <div
          className="absolute top-0 bottom-0 opacity-40"
          style={{ left: `${pct(vegStart)}%`, width: `${pct(flowerStart) - pct(vegStart)}%`, backgroundColor: STAGE_HEX.veg }}
        />
      )}
      {flowerStart && harvestStart && (
        <div
          className="absolute top-0 bottom-0 opacity-40"
          style={{ left: `${pct(flowerStart)}%`, width: `${pct(harvestStart) - pct(flowerStart)}%`, backgroundColor: STAGE_HEX.flower }}
        />
      )}
      {harvestStart && dryEnd && (
        <div
          className="absolute top-0 bottom-0 opacity-30"
          style={{ left: `${pct(harvestStart)}%`, width: `${pct(dryEnd) - pct(harvestStart)}%`, backgroundColor: '#6B7280' }}
        />
      )}

      {/* Label */}
      <div className="relative z-10 flex items-center h-full px-2">
        <span className="text-[10px] font-semibold text-cult-white truncate">
          {strain?.display_name ?? strain?.name ?? plan.plan_name ?? '—'}
        </span>
        {plan.planned_plant_count && (
          <span className="ml-1 text-[9px] text-cult-light-gray/60 flex-shrink-0">
            {plan.planned_plant_count}p
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function PipelinePlanner() {
  const [plans, setPlans] = useState<CultivationPlan[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [strains, setStrains] = useState<StrainInfo[]>([]);
  const [feedPrograms, setFeedPrograms] = useState<FeedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'flower'>('active');
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Panel state
  const [panelMode, setPanelMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingPlan, setEditingPlan] = useState<Partial<CultivationPlan>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [plansRes, roomsRes, strainsRes, feedRes] = await Promise.all([
      supabase.from('cultivation_plans').select('*').not('plan_status', 'eq', 'cancelled').order('flower_date', { ascending: true }),
      supabase.from('grow_rooms').select('id, room_code, name, room_type, capacity_plants').eq('is_active', true),
      supabase.from('strains').select('id, name, display_name, flowering_time_days, veg_days_avg, clone_days_avg, dry_days_avg, feed_group, avg_yield_per_plant_g').eq('is_active', true),
      supabase.from('feed_programs').select('id, name').eq('is_active', true),
    ]);
    setPlans((plansRes.data ?? []) as CultivationPlan[]);
    setRooms((roomsRes.data ?? []) as RoomInfo[]);
    setStrains((strainsRes.data ?? []) as StrainInfo[]);
    setFeedPrograms((feedRes.data ?? []) as FeedProgram[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll to today on mount
  useEffect(() => {
    if (!loading && timelineRef.current) {
      const todayPos = WEEKS_BEFORE * 7 * DAY_WIDTH - 200;
      timelineRef.current.scrollLeft = Math.max(0, todayPos);
    }
  }, [loading]);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = getMonday(today);
    d.setDate(d.getDate() - WEEKS_BEFORE * 7);
    return d;
  }, [today]);
  const totalDays = (WEEKS_BEFORE + WEEKS_AFTER) * 7;
  const todayX = daysBetween(startDate, today) * DAY_WIDTH;

  const sortedRooms = useMemo(() =>
    [...rooms].sort((a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)),
    [rooms]
  );

  const plannerRooms = useMemo(() => {
    if (filter === 'flower') return sortedRooms.filter((r) => r.room_type === 'flower');
    return sortedRooms;
  }, [sortedRooms, filter]);

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

  const strainMap = useMemo(() => {
    const map = new Map<string, StrainInfo>();
    for (const s of strains) map.set(s.id, s);
    return map;
  }, [strains]);

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

  // Heatmap data
  const heatmap = useMemo(() => buildHeatmap(plans, startDate, totalDays), [plans, startDate, totalDays]);
  const maxHeat = useMemo(() => Math.max(...heatmap, 1), [heatmap]);

  // Gap detection per room
  const roomGaps = useMemo(() => {
    const gaps = new Map<string, { startX: number; width: number; days: number }[]>();
    for (const room of plannerRooms) {
      const roomPlans = (plansByRoom.get(room.id) ?? [])
        .filter((p) => p.plan_status !== 'cancelled' && p.plan_status !== 'completed')
        .sort((a, b) => {
          const aDate = toDate(a.dry_date ?? a.harvest_date);
          const bDate = toDate(b.dry_date ?? b.harvest_date);
          return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
        });
      const roomGapList: { startX: number; width: number; days: number }[] = [];
      for (let i = 0; i < roomPlans.length - 1; i++) {
        const endDate = toDate(roomPlans[i].dry_date ?? roomPlans[i].harvest_date);
        const nextStart = toDate(roomPlans[i + 1].clone_date ?? roomPlans[i + 1].veg_start_date ?? roomPlans[i + 1].flower_date);
        if (endDate && nextStart) {
          const gapDays = daysBetween(endDate, nextStart);
          if (gapDays > 7) {
            const sx = daysBetween(startDate, endDate) * DAY_WIDTH;
            roomGapList.push({ startX: sx, width: gapDays * DAY_WIDTH, days: gapDays });
          }
        }
      }
      if (roomGapList.length > 0) gaps.set(room.id, roomGapList);
    }
    return gaps;
  }, [plannerRooms, plansByRoom, startDate]);

  // Stats
  const activeCount = plans.filter((p) => p.plan_status === 'active').length;
  const scheduledCount = plans.filter((p) => p.plan_status === 'scheduled').length;
  const draftCount = plans.filter((p) => p.plan_status === 'draft').length;

  const upcomingHarvests = useMemo(() => {
    const now = new Date();
    const twoWeeks = addDays(now, 14);
    return plans
      .filter((p) => {
        const hd = toDate(p.harvest_date);
        return hd && hd >= now && hd <= twoWeeks && p.plan_status !== 'cancelled' && p.plan_status !== 'completed';
      })
      .sort((a, b) => (a.harvest_date ?? '').localeCompare(b.harvest_date ?? ''));
  }, [plans]);

  const totalProjectedWet = useMemo(() =>
    plans
      .filter((p) => p.plan_status === 'active' || p.plan_status === 'scheduled')
      .reduce((sum, p) => sum + (p.projected_wet_weight_g ?? 0), 0),
    [plans]
  );

  // ═══ CRUD ═══
  const handleCreate = () => {
    const defaultRoom = plannerRooms.find((r) => r.room_type === 'flower') ?? plannerRooms[0];
    setEditingPlan(emptyPlan(defaultRoom?.id ?? ''));
    setPanelMode('create');
    setSelectedPlanId(null);
  };

  const handleEdit = (plan: CultivationPlan) => {
    setEditingPlan({ ...plan });
    setPanelMode('edit');
    setSelectedPlanId(plan.id);
  };

  const handleClosePanel = () => {
    setPanelMode('closed');
    setEditingPlan({});
    setSelectedPlanId(null);
  };

  const handleSave = async () => {
    if (!editingPlan.room_id) return;
    setSaving(true);
    try {
      if (panelMode === 'create') {
        const created = await createCultivationPlan(editingPlan);
        setPlans((prev) => [...prev, created]);
      } else if (panelMode === 'edit' && selectedPlanId) {
        // Snapshot before updating
        const original = plans.find((p) => p.id === selectedPlanId);
        if (original) {
          await createPlanSnapshot(selectedPlanId, original);
        }
        const updated = await updateCultivationPlan(selectedPlanId, editingPlan);
        setPlans((prev) => prev.map((p) => p.id === selectedPlanId ? updated : p));
      }
      handleClosePanel();
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      await cancelCultivationPlan(selectedPlanId);
      setPlans((prev) => prev.filter((p) => p.id !== selectedPlanId));
      handleClosePanel();
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = (plan: CultivationPlan) => {
    const flowerDate = toDate(plan.flower_date);
    const turnaround = plan.turnaround_days ?? 3;
    const dryEnd = toDate(plan.dry_date ?? plan.harvest_date);
    let newFlowerDate: string | null = null;
    if (dryEnd && plan.flower_days) {
      const nextStart = addDays(dryEnd, turnaround);
      newFlowerDate = toISO(nextStart);
    }

    const dupe = emptyPlan(plan.room_id);
    dupe.strain_id = plan.strain_id;
    dupe.feed_program_id = plan.feed_program_id;
    dupe.planned_plant_count = plan.planned_plant_count;
    dupe.planned_clone_count = plan.planned_clone_count;
    dupe.clone_days = plan.clone_days;
    dupe.veg_days = plan.veg_days;
    dupe.flower_days = plan.flower_days;
    dupe.dry_days = plan.dry_days;
    dupe.turnaround_days = plan.turnaround_days;
    dupe.plan_name = plan.plan_name ? plan.plan_name + ' (copy)' : null;

    if (newFlowerDate) {
      const strain = plan.strain_id ? strainMap.get(plan.strain_id) ?? null : null;
      Object.assign(dupe, cascadeDates('flower_date', newFlowerDate, strain, dupe));
    }

    setEditingPlan(dupe);
    setPanelMode('create');
    setSelectedPlanId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cult-medium-gray text-sm">Loading pipeline...</div>
      </div>
    );
  }

  const panelOpen = panelMode !== 'closed';

  return (
    <div className="h-full flex flex-col bg-cult-near-black">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-cult-dark-gray/40">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-bold text-cult-white tracking-wide">Pipeline Planner</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick stats */}
          <div className="flex items-center gap-4 mr-2 text-xs">
            <span className="text-green-400">{activeCount} active</span>
            <span className="text-blue-400">{scheduledCount} scheduled</span>
            <span className="text-cult-medium-gray">{draftCount} draft</span>
            {totalProjectedWet > 0 && (
              <span className="text-amber-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {(totalProjectedWet / 453.592).toFixed(1)} lbs proj.
              </span>
            )}
          </div>

          {/* Heatmap toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`p-1.5 rounded transition-colors ${showHeatmap ? 'text-amber-400 bg-amber-950/30' : 'text-cult-dark-gray hover:text-cult-medium-gray'}`}
            title="Toggle labor heatmap"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>

          {/* Filter */}
          <div className="flex items-center gap-1 bg-cult-charcoal/40 rounded-sm p-0.5">
            {(['active', 'all', 'flower'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                  filter === f
                    ? 'bg-cult-charcoal text-cult-white'
                    : 'text-cult-medium-gray hover:text-cult-light-gray'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'all' ? 'All' : 'Flower'}
              </button>
            ))}
          </div>

          {/* Create */}
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Plan
          </button>
        </div>
      </div>

      {/* Upcoming harvests banner */}
      {upcomingHarvests.length > 0 && (
        <div className="px-6 py-1.5 bg-amber-950/20 border-b border-amber-800/20 flex items-center gap-3">
          <Scissors className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[11px] text-amber-300">
            Upcoming harvests ({upcomingHarvests.length}):
            {upcomingHarvests.slice(0, 4).map((p) => {
              const s = p.strain_id ? strainMap.get(p.strain_id) : null;
              return ` ${s?.display_name ?? s?.name ?? 'Unknown'} ${formatShort(p.harvest_date)}`;
            }).join(' · ')}
            {upcomingHarvests.length > 4 && ` +${upcomingHarvests.length - 4} more`}
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-auto" ref={timelineRef}>
          <div style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>
            {/* Timeline header */}
            <div className="sticky top-0 z-20 flex bg-cult-near-black border-b border-cult-dark-gray/40">
              <div className="flex-shrink-0 bg-cult-near-black border-r border-cult-dark-gray/20" style={{ width: LABEL_WIDTH }}>
                <div className="h-9 flex items-center px-3">
                  <span className="text-[10px] font-semibold text-cult-dark-gray uppercase tracking-wider">Rooms</span>
                </div>
              </div>
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
                <div className="absolute top-0 h-full w-px bg-violet-500/60" style={{ left: todayX }}>
                  <span className="absolute -top-0 left-1 text-[8px] text-violet-400 font-bold">TODAY</span>
                </div>
              </div>
            </div>

            {/* Labor heatmap row */}
            {showHeatmap && (
              <div className="flex border-b border-amber-800/20 bg-cult-near-black">
                <div
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-cult-dark-gray/20"
                  style={{ width: LABEL_WIDTH, height: HEATMAP_HEIGHT }}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400">Labor Load</span>
                </div>
                <div className="relative flex-1" style={{ height: HEATMAP_HEIGHT }}>
                  {heatmap.map((val, i) => {
                    if (val === 0) return null;
                    const intensity = Math.min(val / maxHeat, 1);
                    const color = intensity > 0.6 ? 'rgba(239,68,68,' : intensity > 0.3 ? 'rgba(251,191,36,' : 'rgba(74,222,128,';
                    return (
                      <div
                        key={i}
                        className="absolute bottom-0"
                        style={{
                          left: i * DAY_WIDTH,
                          width: DAY_WIDTH,
                          height: `${Math.max(intensity * 100, 15)}%`,
                          backgroundColor: color + (0.3 + intensity * 0.4) + ')',
                        }}
                      />
                    );
                  })}
                  <div className="absolute top-0 h-full w-px bg-violet-500/20" style={{ left: todayX }} />
                </div>
              </div>
            )}

            {/* Room rows */}
            {plannerRooms.map((room) => {
              const roomPlans = plansByRoom.get(room.id) ?? [];
              const gaps = roomGaps.get(room.id) ?? [];

              return (
                <div key={room.id} className="flex border-b border-cult-dark-gray/20 hover:bg-cult-charcoal/10">
                  {/* Room label */}
                  <div
                    className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-cult-dark-gray/20 cursor-pointer hover:bg-cult-charcoal/20"
                    style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
                    onClick={handleCreate}
                    title={`Click to add plan to ${room.room_code || room.name}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STAGE_HEX[room.room_type] ?? '#6B7280' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-cult-white truncate">{room.room_code || room.name}</div>
                      <div className="text-[10px] text-cult-dark-gray capitalize flex items-center gap-1">
                        {room.room_type}
                        {room.capacity_plants && <span>· {room.capacity_plants} cap</span>}
                      </div>
                    </div>
                    {roomPlans.length > 0 && (
                      <span className="text-[9px] text-cult-dark-gray bg-cult-charcoal/60 px-1 py-0.5 rounded">
                        {roomPlans.length}
                      </span>
                    )}
                  </div>

                  {/* Timeline bars */}
                  <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                    {/* Background grid */}
                    {weeks.map((w, i) => (
                      <div key={i} className="absolute top-0 h-full border-l border-cult-dark-gray/10" style={{ left: w.x }} />
                    ))}
                    <div className="absolute top-0 h-full w-px bg-violet-500/20" style={{ left: todayX }} />

                    {/* Gap indicators */}
                    {gaps.map((gap, i) => (
                      <div
                        key={`gap-${i}`}
                        className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full border border-dashed border-amber-600/30 bg-amber-950/10 flex items-center justify-center"
                        style={{ left: gap.startX, width: gap.width }}
                        title={`${gap.days}d gap — room idle`}
                      >
                        <span className="text-[8px] text-amber-500/50">{gap.days}d</span>
                      </div>
                    ))}

                    {/* Plan bars */}
                    {roomPlans.map((plan) => (
                      <TimelineBar
                        key={plan.id}
                        plan={plan}
                        strain={plan.strain_id ? strainMap.get(plan.strain_id) ?? null : null}
                        startDate={startDate}
                        onClick={() => handleEdit(plan)}
                        isSelected={selectedPlanId === plan.id}
                      />
                    ))}

                    {/* Empty state */}
                    {roomPlans.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-cult-dark-gray/40 italic">No plans — click to add</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty rooms message */}
            {plannerRooms.length === 0 && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center text-cult-medium-gray">
                  <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No rooms found. Add rooms in Cultivation settings first.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        {panelOpen && (
          <div className="w-[420px] flex-shrink-0 border-l border-cult-dark-gray/40 bg-cult-near-black overflow-y-auto">
            <div className="px-4 py-3 border-b border-cult-dark-gray/30 flex items-center justify-between">
              <h2 className="text-sm font-bold text-cult-white">
                {panelMode === 'create' ? 'New Cultivation Plan' : 'Edit Plan'}
              </h2>
              <div className="flex items-center gap-1">
                {panelMode === 'edit' && selectedPlanId && (
                  <button
                    onClick={() => {
                      const plan = plans.find((p) => p.id === selectedPlanId);
                      if (plan) handleDuplicate(plan);
                    }}
                    className="p-1.5 text-cult-medium-gray hover:text-cult-white rounded transition-colors"
                    title="Duplicate as next cycle"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={handleClosePanel} className="p-1.5 text-cult-medium-gray hover:text-cult-white rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <PlanForm
                plan={editingPlan}
                rooms={rooms}
                strains={strains}
                feedPrograms={feedPrograms}
                strainMap={strainMap}
                onChange={(updates) => setEditingPlan((prev) => ({ ...prev, ...updates }))}
                onSave={handleSave}
                onCancel={handleClosePanel}
                onDelete={panelMode === 'edit' ? handleDelete : undefined}
                saving={saving}
                isEdit={panelMode === 'edit'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
