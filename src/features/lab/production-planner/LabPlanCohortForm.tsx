import { useEffect, useMemo, useState } from 'react';
import type {
  CalendarRoom,
  StrainCultivationStats,
} from '@/features/production-planner/types';
import type { Batch, MotherBatchGroup, MotherHealth, CycleConfig } from './planner-mock';
import type { MotherLot } from './LabPlanCycleForm';

/**
 * Operator's allocation from a single Mother Batch Group for one strain.
 * The form may pull cuts from multiple MBGs for the same strain when
 * one group's available cuts are insufficient.
 */
export interface MomAllocation {
  group_prefix: string;
  /** Individual mom ids contributing cuts (subset of moms in group with this strain). */
  mom_ids: string[];
  /** Estimated cuts drawn from this group for this strain. */
  cuts_drawn: number;
}

export interface CohortStrainEntry {
  strain_id: string;
  plant_count: number;
  /** Operator-input cuts to take. Default = plant_count, operator can adjust. */
  cuts_to_take: number;
  /** Empty array = external sourcing (no in-house mom). */
  mom_allocations: MomAllocation[];
}

export interface CohortPlanResult {
  room_id: string;
  room_code: string;
  flower_start_date: string;
  clone_cut_date: string;
  veg_start_date: string;
  estimated_harvest_date: string;
  flower_days: number;
  strains: Array<CohortStrainEntry & {
    strain_name: string;
    strain_abbrev: string;
    forecast_yield_grams: number;
  }>;
  total_plants: number;
  total_yield_grams: number;
}

interface LabPlanCohortFormProps {
  room: CalendarRoom;
  strainStats: StrainCultivationStats[];
  strainStatsById: Map<string, StrainCultivationStats>;
  /** Legacy flat mom list. Used for sostanza-mode and live fallback. */
  motherLots: MotherLot[];
  /** Mother batch groups. Form prefers this when populated. */
  motherBatchGroups: MotherBatchGroup[];
  /** All existing batches in the planner; used to compute pipeline window. */
  existingBatches: Batch[];
  /** Cycle constants for derivation; tenant-configurable in live mode. */
  cycleConfig: CycleConfig;
  initialStrainId?: string;
  initialFlowerStart?: string;
  prefillReason?: string;
  onCancel: () => void;
  onFinalize: (cohort: CohortPlanResult) => void;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n).toLocaleString()}${suffix}`;
}

function fmtKg(grams: number): string {
  return `${(grams / 1000).toFixed(1)} kg`;
}

function fmtPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—';
  return `${Math.round(pct * 100)}%`;
}

function strainAbbrev(stat: StrainCultivationStats | undefined, fallback: string): string {
  if (!stat) return fallback;
  const words = stat.strain_name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const HEALTH_LABEL: Record<MotherHealth, string> = {
  healthy: 'healthy',
  declining: 'declining',
  needs_replacement: 'needs replacement',
};

interface StrainRow {
  /** Stable client id for React keys (not persisted). */
  rowId: string;
  strain_id: string;
  plant_count: number;
  cuts_to_take: number;
  /** Selected MBG group_prefixes for this strain. Empty = external. */
  selected_mbg_prefixes: string[];
  expanded: boolean;
}

export function LabPlanCohortForm({
  room,
  strainStats,
  strainStatsById,
  motherLots,
  motherBatchGroups,
  existingBatches,
  cycleConfig,
  initialStrainId,
  initialFlowerStart,
  prefillReason,
  onCancel,
  onFinalize,
}: LabPlanCohortFormProps) {
  const today = useMemo(() => new Date(), []);

  const defaultFlowerStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 56);
    return isoDate(d);
  }, [today]);

  const [flowerStart, setFlowerStart] = useState<string>(initialFlowerStart ?? defaultFlowerStart);

  // Default plant count per strain row scales with room capacity.
  const defaultPlantCount = (rowCount: number): number => {
    const cap = room.capacity_plants ?? 88;
    return Math.max(8, Math.floor(cap / Math.max(1, rowCount)));
  };

  // Find MBGs that hold non-retired moms of a given strain.
  const mbgsForStrain = (strainId: string): MotherBatchGroup[] => {
    return motherBatchGroups.filter(mbg =>
      mbg.moms.some(m => m.strain_id === strainId && !m.retired)
    );
  };

  // Compute cuts available across selected MBGs for a strain.
  const cutsAvailableInSelection = (
    strainId: string,
    selectedPrefixes: string[],
    cutsPerSession: number
  ): number => {
    let total = 0;
    for (const mbg of motherBatchGroups) {
      if (!selectedPrefixes.includes(mbg.group_prefix)) continue;
      for (const mom of mbg.moms) {
        if (mom.strain_id !== strainId || mom.retired) continue;
        const remainingRotations = Math.max(0, mom.cuts_max_rotations - mom.cuts_taken_lifetime);
        total += remainingRotations * cutsPerSession;
      }
    }
    return total;
  };

  const seedRow = (strainId: string, rowCount: number): StrainRow => {
    const availableMbgs = mbgsForStrain(strainId);
    const defaultCount = defaultPlantCount(rowCount);
    return {
      rowId: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      strain_id: strainId,
      plant_count: defaultCount,
      cuts_to_take: defaultCount,
      // Default-pick the first MBG with this strain. Operator can adjust.
      selected_mbg_prefixes: availableMbgs.length > 0 ? [availableMbgs[0].group_prefix] : [],
      expanded: false,
    };
  };

  const [strainRows, setStrainRows] = useState<StrainRow[]>(() => {
    const seedStrain = initialStrainId ?? strainStats[0]?.strain_id ?? '';
    if (!seedStrain) return [];
    return [seedRow(seedStrain, 1)];
  });

  // Cycle math anchors. Use cycleConfig (tenant-configurable in live mode).
  const totalPlants = useMemo(
    () => strainRows.reduce((s, r) => s + (r.plant_count || 0), 0),
    [strainRows]
  );

  const flowerDaysAvg = useMemo(() => {
    if (strainRows.length === 0) return cycleConfig.flower_days;
    const total = strainRows.reduce(
      (s, r) => s + (strainStatsById.get(r.strain_id)?.flowering_time_days ?? cycleConfig.flower_days),
      0
    );
    return Math.round(total / strainRows.length);
  }, [strainRows, strainStatsById, cycleConfig]);

  const derived = useMemo(() => {
    const start = new Date(flowerStart);
    if (Number.isNaN(start.getTime())) return null;
    // Use cycleConfig for clone+veg duration anchors.
    const cloneCut = new Date(start);
    cloneCut.setDate(cloneCut.getDate() - cycleConfig.veg_days - cycleConfig.clone_days);
    const vegStart = new Date(start);
    vegStart.setDate(vegStart.getDate() - cycleConfig.veg_days);
    const harvest = new Date(start);
    harvest.setDate(harvest.getDate() + flowerDaysAvg);
    return {
      cloneCut: isoDate(cloneCut),
      vegStart: isoDate(vegStart),
      flowerStart: isoDate(start),
      harvest: isoDate(harvest),
    };
  }, [flowerStart, flowerDaysAvg, cycleConfig]);

  // Yield math: per-strain yield = strain.avg_wet_g_per_sqft × room_sqft × (strain_share).
  // Falls back to per-plant math if room.square_footage is null.
  const perStrainYield = useMemo(() => {
    const sqft = room.square_footage ?? null;
    return strainRows.map(r => {
      const stat = strainStatsById.get(r.strain_id);
      const yieldPerSqft = stat?.avg_wet_g_per_sqft ?? 65;
      const yieldPerPlant = stat?.avg_wet_weight_per_plant_g ?? 260;
      const share = totalPlants > 0 ? r.plant_count / totalPlants : 0;
      const grams = sqft !== null
        ? Math.round(yieldPerSqft * sqft * share)
        : Math.round(yieldPerPlant * r.plant_count);
      return { rowId: r.rowId, grams, yieldPerSqft };
    });
  }, [strainRows, strainStatsById, totalPlants, room.square_footage]);

  const totalYieldGrams = useMemo(
    () => perStrainYield.reduce((s, p) => s + p.grams, 0),
    [perStrainYield]
  );

  // Pipeline: kg of each strain coming down between today and the
  // planned harvest date. Excludes the batch group being planned. Uses
  // sqft-share math against existing batches' rooms.
  const pipelineByStrain = useMemo(() => {
    const out = new Map<string, { grams: number; contributing_groups: Array<{ prefix: string; room: string; harvest: string; grams: number }> }>();
    if (!derived) return out;
    const todayISO = isoDate(today);
    const harvestISO = derived.harvest;
    // Group existing batches by (room_id, YYMMDD prefix) to compute per-group plant-share.
    type GroupKey = string;
    const groupBatches = new Map<GroupKey, Batch[]>();
    for (const b of existingBatches) {
      const flowerSeg = b.segments.find(s => s.stage === 'flower');
      if (!flowerSeg) continue;
      const prefix = b.batch_code.match(/^(\d{6})/)?.[1];
      if (!prefix) continue;
      const key = `${flowerSeg.room_id}|${prefix}`;
      const list = groupBatches.get(key) ?? [];
      list.push(b);
      groupBatches.set(key, list);
    }
    for (const [key, group] of groupBatches) {
      const flowerSegs = group.map(b => b.segments.find(s => s.stage === 'flower')).filter(Boolean);
      if (flowerSegs.length === 0) continue;
      const harvestEnd = flowerSegs[0]!.end;
      // Include groups whose harvest falls in [today, target_harvest].
      if (harvestEnd < todayISO || harvestEnd > harvestISO) continue;
      // For each strain in the group, compute its grams using sqft-share.
      const groupTotalPlants = group.reduce((s, b) => s + (b.segments.find(seg => seg.stage === 'flower')?.plant_count ?? 0), 0);
      if (groupTotalPlants === 0) continue;
      // Find the room sqft (match by room_id).
      const [roomId] = key.split('|');
      // Locate sqft on the room — we only have CalendarRoom in props for the target room, not all rooms.
      // For pipeline calc, approximate per-batch yield using avg_wet_weight_per_plant_g (still strain-aware).
      // Future: pass all rooms in to enable strict sqft-share math here.
      for (const b of group) {
        const stat = strainStatsById.get(b.strain_id);
        const flowerSeg = b.segments.find(s => s.stage === 'flower');
        if (!flowerSeg) continue;
        const yieldPerPlant = stat?.avg_wet_weight_per_plant_g ?? 260;
        const grams = Math.round(yieldPerPlant * flowerSeg.plant_count);
        const cur = out.get(b.strain_id) ?? { grams: 0, contributing_groups: [] };
        cur.grams += grams;
        // De-dupe by (group prefix + room) so we record one entry per cohort, not per strain row.
        // Track per-strain contribution within that cohort.
        const cohortRoomLabel = (b as any).current_room_id || roomId;
        cur.contributing_groups.push({
          prefix: b.batch_code.match(/^(\d{6})/)?.[1] ?? '',
          room: flowerSeg.room_id,
          harvest: flowerSeg.end,
          grams,
        });
        out.set(b.strain_id, cur);
      }
    }
    return out;
  }, [existingBatches, derived, strainStatsById, today]);

  const totalPipelineKg = useMemo(() => {
    let total = 0;
    for (const [, v] of pipelineByStrain) total += v.grams;
    return total;
  }, [pipelineByStrain]);

  // Strain options exclude already-selected strains.
  const availableStrainsForRow = (rowId: string): StrainCultivationStats[] => {
    const otherSelected = new Set(strainRows.filter(r => r.rowId !== rowId).map(r => r.strain_id));
    return strainStats.filter(s => !otherSelected.has(s.strain_id));
  };

  const handleAddStrain = () => {
    const taken = new Set(strainRows.map(r => r.strain_id));
    const next = strainStats.find(s => !taken.has(s.strain_id));
    if (!next) return;
    setStrainRows(prev => {
      const newCount = prev.length + 1;
      const rebalanced = prev.map(r => ({
        ...r,
        plant_count: defaultPlantCount(newCount),
        cuts_to_take: defaultPlantCount(newCount),
      }));
      return [...rebalanced, seedRow(next.strain_id, newCount)];
    });
  };

  const handleRemoveStrain = (rowId: string) => {
    setStrainRows(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(r => r.rowId !== rowId);
      const rebalanced = next.map(r => ({
        ...r,
        plant_count: defaultPlantCount(next.length),
        cuts_to_take: defaultPlantCount(next.length),
      }));
      return rebalanced;
    });
  };

  const handleStrainChange = (rowId: string, strainId: string) => {
    const availableMbgs = mbgsForStrain(strainId);
    setStrainRows(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      return {
        ...r,
        strain_id: strainId,
        selected_mbg_prefixes: availableMbgs.length > 0 ? [availableMbgs[0].group_prefix] : [],
      };
    }));
  };

  const handlePlantCountChange = (rowId: string, count: number) => {
    setStrainRows(prev => prev.map(r => r.rowId === rowId
      ? { ...r, plant_count: count, cuts_to_take: Math.max(count, r.cuts_to_take) }
      : r
    ));
  };

  const handleCutsChange = (rowId: string, cuts: number) => {
    setStrainRows(prev => prev.map(r => r.rowId === rowId ? { ...r, cuts_to_take: cuts } : r));
  };

  const handleToggleMBG = (rowId: string, prefix: string) => {
    setStrainRows(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      const next = r.selected_mbg_prefixes.includes(prefix)
        ? r.selected_mbg_prefixes.filter(p => p !== prefix)
        : [...r.selected_mbg_prefixes, prefix];
      return { ...r, selected_mbg_prefixes: next };
    }));
  };

  const handleToggleExpand = (rowId: string) => {
    setStrainRows(prev => prev.map(r => r.rowId === rowId ? { ...r, expanded: !r.expanded } : r));
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const overCapacity = (room.capacity_plants ?? Infinity) < totalPlants;
  const canFinalize =
    !!derived &&
    strainRows.length > 0 &&
    strainRows.every(r => r.plant_count > 0 && r.strain_id) &&
    !overCapacity;

  const handleFinalize = () => {
    if (!canFinalize || !derived) return;
    const result: CohortPlanResult = {
      room_id: room.room_id,
      room_code: room.room_code,
      flower_start_date: derived.flowerStart,
      clone_cut_date: derived.cloneCut,
      veg_start_date: derived.vegStart,
      estimated_harvest_date: derived.harvest,
      flower_days: flowerDaysAvg,
      total_plants: totalPlants,
      total_yield_grams: totalYieldGrams,
      strains: strainRows.map(r => {
        const stat = strainStatsById.get(r.strain_id);
        const yieldEntry = perStrainYield.find(p => p.rowId === r.rowId);
        const cutsPerSession = stat?.cuts_per_session_per_mom ?? 65;
        const allocations: MomAllocation[] = r.selected_mbg_prefixes.map(prefix => {
          const mbg = motherBatchGroups.find(g => g.group_prefix === prefix);
          if (!mbg) return { group_prefix: prefix, mom_ids: [], cuts_drawn: 0 };
          const moms = mbg.moms.filter(m => m.strain_id === r.strain_id && !m.retired);
          const cutsAvail = moms.reduce(
            (s, m) => s + Math.max(0, m.cuts_max_rotations - m.cuts_taken_lifetime) * cutsPerSession,
            0
          );
          return {
            group_prefix: prefix,
            mom_ids: moms.map(m => m.id),
            cuts_drawn: Math.min(r.cuts_to_take, cutsAvail),
          };
        });
        return {
          strain_id: r.strain_id,
          plant_count: r.plant_count,
          cuts_to_take: r.cuts_to_take,
          mom_allocations: allocations,
          strain_name: stat?.strain_name ?? r.strain_id,
          strain_abbrev: strainAbbrev(stat, r.strain_id.replace('s-', '').toUpperCase()),
          forecast_yield_grams: yieldEntry?.grams ?? 0,
        };
      }),
    };
    onFinalize(result);
  };

  // Pipeline kg for one strain in the planning window.
  const pipelineFor = (strainId: string) => pipelineByStrain.get(strainId);

  return (
    <>
      <div className="plan-form-scrim" onClick={onCancel} aria-hidden />
      <div className="plan-form plan-form-cohort" role="dialog" aria-label="Plan a batch group">
        <div className="plan-form-stamp">
          <span className="serial">FIG. 04</span>
          <span className="sep">·</span>
          <span>Plan a Batch Group</span>
          <span className="sep">·</span>
          <span className="strong">{room.room_code}</span>
          <span className="sep">·</span>
          <span>{room.room_type}</span>
          <span className="sep">·</span>
          <span className="cap mute">{strainRows.length} {strainRows.length === 1 ? 'strain' : 'strains'}</span>
          <button className="plan-form-x" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="plan-form-body">
          {prefillReason && (
            <div className="plan-form-prefill" role="note">
              <span className="cap">From Seed</span>
              <span>{prefillReason}</span>
            </div>
          )}

          <div className="plan-form-row">
            <label className="cap">Flower start</label>
            <input
              className="plan-form-input num"
              type="date"
              value={flowerStart}
              onChange={(e) => setFlowerStart(e.target.value)}
            />
            <span className="plan-form-help">
              shared anchor · clone-cut {derived?.cloneCut ?? '—'} · harvest {derived?.harvest ?? '—'}
            </span>
          </div>

          <div className="plan-form-cohort-strains">
            <div className="cohort-strains-head">
              <span className="cap strong">Batch group composition</span>
              <span className="cap mute">
                {totalPlants} total plants
                {room.square_footage ? ` · ${room.square_footage} sqft room` : ''}
                {overCapacity && <span className="warn"> · over capacity {room.capacity_plants}</span>}
              </span>
            </div>

            <div className="cohort-strain-rows">
              {strainRows.map((row, idx) => {
                const stat = strainStatsById.get(row.strain_id);
                const yieldEntry = perStrainYield.find(p => p.rowId === row.rowId);
                const cutsPerSession = stat?.cuts_per_session_per_mom ?? 65;
                const cutsAvailable = cutsAvailableInSelection(
                  row.strain_id,
                  row.selected_mbg_prefixes,
                  cutsPerSession
                );
                const cutsShortfall = row.cuts_to_take > cutsAvailable;
                const availableMbgs = mbgsForStrain(row.strain_id);
                const pipeline = pipelineFor(row.strain_id);

                return (
                  <div key={row.rowId} className={`cohort-strain-row ${row.expanded ? 'is-expanded' : ''}`}>
                    <div className="cohort-strain-row-main">
                      <div className="cohort-strain-row-num cap mute">{String(idx + 1).padStart(2, '0')}</div>

                      <select
                        className="plan-form-input cohort-strain-select"
                        value={row.strain_id}
                        onChange={(e) => handleStrainChange(row.rowId, e.target.value)}
                      >
                        {availableStrainsForRow(row.rowId).map((s) => (
                          <option key={s.strain_id} value={s.strain_id}>
                            {s.strain_name}
                          </option>
                        ))}
                      </select>

                      <input
                        className="plan-form-input num cohort-strain-plants"
                        type="number"
                        min="1"
                        max={room.capacity_plants ?? 9999}
                        value={row.plant_count}
                        onChange={(e) => handlePlantCountChange(row.rowId, parseInt(e.target.value, 10) || 0)}
                        aria-label="plant count"
                      />

                      <span className="cohort-strain-mbg-summary cap mute" title="Mother batch groups selected for this strain">
                        {row.selected_mbg_prefixes.length === 0
                          ? <span className="warn">external</span>
                          : `${row.selected_mbg_prefixes.length} MBG · ~${cutsAvailable} cuts`}
                      </span>

                      <span className="cohort-strain-forecast cap mute">
                        {fmtNum(yieldEntry?.grams ?? 0, ' g')}
                      </span>

                      <button
                        type="button"
                        className="cohort-strain-expand"
                        onClick={() => handleToggleExpand(row.rowId)}
                        aria-label={row.expanded ? 'Collapse details' : 'Expand details'}
                        title={row.expanded ? 'Collapse' : 'Expand details'}
                      >
                        {row.expanded ? '▾' : '▸'}
                      </button>

                      <button
                        type="button"
                        className="cohort-strain-remove"
                        onClick={() => handleRemoveStrain(row.rowId)}
                        disabled={strainRows.length <= 1}
                        aria-label={`Remove ${stat?.strain_name ?? 'strain'}`}
                        title="Remove strain"
                      >
                        ×
                      </button>
                    </div>

                    {row.expanded && (
                      <div className="cohort-strain-row-detail">
                        {/* Cuts target row */}
                        <div className="strain-detail-section">
                          <div className="strain-detail-cap cap mono">Cuts to take</div>
                          <div className="strain-detail-body">
                            <input
                              className="plan-form-input num"
                              type="number"
                              min="1"
                              value={row.cuts_to_take}
                              onChange={(e) => handleCutsChange(row.rowId, parseInt(e.target.value, 10) || 0)}
                              aria-label="cuts to take"
                              style={{ width: 80 }}
                            />
                            <span className="strain-detail-hint">
                              implied {row.plant_count} plants at historical rates
                              {stat?.historical_rooting_success_rate && stat?.historical_veg_to_flower_survival_rate && (
                                <> · {fmtPct(stat.historical_rooting_success_rate)} rooting × {fmtPct(stat.historical_veg_to_flower_survival_rate)} survival → ~{Math.ceil(row.plant_count / (stat.historical_rooting_success_rate * stat.historical_veg_to_flower_survival_rate))} cuts at historical avg</>
                              )}
                              <span className="strain-detail-info-tag">info only</span>
                            </span>
                          </div>
                        </div>

                        {/* Mother batch group selector */}
                        <div className="strain-detail-section">
                          <div className="strain-detail-cap cap mono">Source moms</div>
                          {availableMbgs.length === 0 ? (
                            <div className="strain-detail-body">
                              <span className="warn cap">No mother batch group for {stat?.strain_name}</span>
                              <span className="strain-detail-hint">External clone vendor sourcing required</span>
                            </div>
                          ) : (
                            <div className="strain-detail-mbgs">
                              {availableMbgs.map(mbg => {
                                const moms = mbg.moms.filter(m => m.strain_id === row.strain_id && !m.retired);
                                const groupCutsAvail = moms.reduce(
                                  (s, m) => s + Math.max(0, m.cuts_max_rotations - m.cuts_taken_lifetime) * cutsPerSession,
                                  0
                                );
                                const isSelected = row.selected_mbg_prefixes.includes(mbg.group_prefix);
                                return (
                                  <div key={mbg.group_prefix} className={`mbg-card ${isSelected ? 'is-selected' : ''}`}>
                                    <label className="mbg-card-head">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleMBG(row.rowId, mbg.group_prefix)}
                                      />
                                      <span className="mbg-card-label cap mono">{mbg.group_prefix}</span>
                                      <span className="mbg-card-source mute">from {mbg.source_flower_room_code}</span>
                                      <span className="mbg-card-counts cap mute">
                                        {moms.length} {moms.length === 1 ? 'mom' : 'moms'} · ~{groupCutsAvail} cuts available
                                      </span>
                                    </label>
                                    <div className="mbg-card-moms">
                                      {moms.map(mom => {
                                        const ageDays = daysAgo(mom.planted_date) ?? 0;
                                        const lastCutDays = daysAgo(mom.last_cut_date);
                                        const remainingRot = Math.max(0, mom.cuts_max_rotations - mom.cuts_taken_lifetime);
                                        return (
                                          <div key={mom.id} className="mbg-mom-row">
                                            <span className={`mom-health-pill mom-health-${mom.health}`}>
                                              {HEALTH_LABEL[mom.health]}
                                            </span>
                                            <span className="mom-id mono">{mom.id.split('-').slice(-1)[0]}</span>
                                            <span className="mom-stat cap mute">
                                              {ageDays}d old
                                            </span>
                                            <span className="mom-stat cap mute">
                                              {lastCutDays !== null ? `last cut ${lastCutDays}d ago` : 'no cuts taken'}
                                            </span>
                                            <span className="mom-stat cap mute">
                                              {remainingRot} of {mom.cuts_max_rotations} rotations left
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                              {cutsShortfall && (
                                <div className="mbg-shortfall warn cap">
                                  ⚠ Selected MBGs offer ~{cutsAvailable} cuts; you need {row.cuts_to_take}. Add another MBG, accept partial coverage, or adjust cuts target.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Strain stats */}
                        <div className="strain-detail-section">
                          <div className="strain-detail-cap cap mono">Strain stats</div>
                          <div className="strain-detail-grid">
                            <div className="strain-stat">
                              <span className="cap mute">Yield</span>
                              <span className="num">{fmtNum(stat?.avg_wet_g_per_sqft, ' g/sqft')}</span>
                            </div>
                            <div className="strain-stat">
                              <span className="cap mute">Flower</span>
                              <span className="num">{stat?.flowering_time_days ?? '—'}d</span>
                            </div>
                            <div className="strain-stat">
                              <span className="cap mute">Demand</span>
                              <span className="num">
                                {fmtNum(stat?.demand_total_units)}u
                                {stat?.demand_unassigned_units != null && stat.demand_unassigned_units > 0 && (
                                  <span className="mute"> ({stat.demand_unassigned_units} unassigned)</span>
                                )}
                              </span>
                            </div>
                            <div className="strain-stat">
                              <span className="cap mute">Cuts/session</span>
                              <span className="num">~{cutsPerSession}</span>
                            </div>
                          </div>
                        </div>

                        {/* Per-strain pipeline */}
                        <div className="strain-detail-section">
                          <div className="strain-detail-cap cap mono">Pipeline · today → harvest</div>
                          <div className="strain-detail-body">
                            {!pipeline || pipeline.grams === 0 ? (
                              <span className="strain-detail-hint mute">
                                No {stat?.strain_name} batch groups harvest in this window
                              </span>
                            ) : (
                              <div className="strain-pipeline-block">
                                <div className="num">{fmtKg(pipeline.grams)} of {stat?.strain_name} coming down</div>
                                <div className="strain-detail-hint mute">
                                  {pipeline.contributing_groups.map((g, gi) => (
                                    <span key={gi}>
                                      {gi > 0 && <span> · </span>}
                                      {g.prefix} ({g.harvest}, {fmtKg(g.grams)})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="cohort-add-strain"
              onClick={handleAddStrain}
              disabled={strainRows.length >= strainStats.length}
            >
              + Add strain
            </button>
          </div>

          <div className="plan-form-manifest">
            <div className="manifest-cap">Batch Group Manifest</div>
            <div className="manifest-grid">
              <div className="manifest-row">
                <span className="cap">Room</span>
                <span className="num">{room.room_code} {room.square_footage ? `· ${room.square_footage} sqft` : ''}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Batch group label</span>
                <span className="num">{room.room_code}-{(derived?.cloneCut ?? '').replace(/-/g, '').slice(2)}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Strain count</span>
                <span className="num">{strainRows.length}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Total plants</span>
                <span className="num">{totalPlants}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Cut clones</span>
                <span className="num">{derived?.cloneCut ?? '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Veg start</span>
                <span className="num">{derived?.vegStart ?? '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Flower start</span>
                <span className="num">{derived?.flowerStart ?? '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Harvest (avg)</span>
                <span className="num">{derived?.harvest ?? '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Clone+veg days</span>
                <span className="num">{cycleConfig.clone_days + cycleConfig.veg_days}d</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Flower days (avg)</span>
                <span className="num">{flowerDaysAvg}d</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Forecast yield</span>
                <span className="num">{fmtKg(totalYieldGrams)}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Pipeline · today → harvest</span>
                <span className="num">{fmtKg(totalPipelineKg)}</span>
              </div>
            </div>
            {totalPipelineKg > 0 && (
              <div className="manifest-pipeline-breakdown">
                <span className="cap mute">Coming down between today and your harvest:</span>
                <div className="pipeline-strain-list">
                  {Array.from(pipelineByStrain.entries())
                    .filter(([, v]) => v.grams > 0)
                    .sort((a, b) => b[1].grams - a[1].grams)
                    .map(([strainId, v]) => {
                      const sName = strainStatsById.get(strainId)?.strain_name ?? strainId;
                      return (
                        <span key={strainId} className="pipeline-strain-pill">
                          <span className="cap mono">{sName}</span>
                          <span className="num mono">{fmtKg(v.grams)}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="manifest-prose">
              <span className="cap mute">
                live mapping · posts to fn_plan_cycle once Phase 3 ships · batch group renders as one planning bar in the gantt
              </span>
            </div>
          </div>
        </div>

        <div className="plan-form-actions">
          <button className="plan-form-btn ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="plan-form-btn primary"
            type="button"
            disabled={!canFinalize}
            onClick={handleFinalize}
          >
            Finalize batch group →
          </button>
        </div>
      </div>
    </>
  );
}

export default LabPlanCohortForm;
