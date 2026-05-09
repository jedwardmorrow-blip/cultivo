import { useEffect, useMemo, useState } from 'react';
import type {
  CalendarRoom,
  StrainCultivationStats,
} from '@/features/production-planner/types';
import type { MotherLot } from './LabPlanCycleForm';

export interface CohortStrainEntry {
  strain_id: string;
  plant_count: number;
  mom_plant_group_id: string | null;
}

export interface CohortPlanResult {
  room_id: string;
  room_code: string;
  flower_start_date: string;
  clone_cut_date: string;
  veg_start_date: string;
  estimated_harvest_date: string;
  /** Average flowering time across the cohort, used for harvest projection. */
  flower_days: number;
  strains: Array<CohortStrainEntry & {
    strain_name: string;
    strain_abbrev: string;
    mom_strain_name: string | null;
    forecast_yield_grams: number;
  }>;
  total_plants: number;
  total_yield_grams: number;
}

interface LabPlanCohortFormProps {
  room: CalendarRoom;
  strainStats: StrainCultivationStats[];
  strainStatsById: Map<string, StrainCultivationStats>;
  motherLots: MotherLot[];
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

function strainAbbrev(stat: StrainCultivationStats | undefined, fallback: string): string {
  if (!stat) return fallback;
  const words = stat.strain_name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
}

interface StrainRow {
  /** Stable client id for React keys (not persisted). */
  rowId: string;
  strain_id: string;
  plant_count: number;
  mom_plant_group_id: string | null;
}

export function LabPlanCohortForm({
  room,
  strainStats,
  strainStatsById,
  motherLots,
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
  const [pricePerGram, setPricePerGram] = useState<number>(4.5);

  // Default plant count per strain row scales with room capacity. A 6-strain
  // cohort in a 360-cap room means ~60 plants per strain; 4-strain cohort
  // means ~90. Operators tune from there.
  const defaultPlantCount = (rowCount: number): number => {
    const cap = room.capacity_plants ?? 240;
    return Math.max(24, Math.floor(cap / Math.max(1, rowCount)));
  };

  const seedRow = (strainId: string, rowCount: number): StrainRow => {
    const moms = motherLots.filter(m => m.strain_id === strainId);
    return {
      rowId: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      strain_id: strainId,
      plant_count: defaultPlantCount(rowCount),
      mom_plant_group_id: moms[0]?.mom_plant_group_id ?? null,
    };
  };

  const [strainRows, setStrainRows] = useState<StrainRow[]>(() => {
    const seedStrain = initialStrainId ?? strainStats[0]?.strain_id ?? '';
    if (!seedStrain) return [];
    return [seedRow(seedStrain, 1)];
  });

  // Derived dates from flower start. Veg-days uses the cohort average so
  // the cohort's clone-cut math is one shared anchor (matching live
  // cycles.actual_flip_date semantics).
  const vegDaysAvg = useMemo(() => {
    if (strainRows.length === 0) return 21;
    const total = strainRows.reduce((s, r) => s + (strainStatsById.get(r.strain_id)?.veg_days_avg ?? 21), 0);
    return Math.round(total / strainRows.length);
  }, [strainRows, strainStatsById]);

  const flowerDaysAvg = useMemo(() => {
    if (strainRows.length === 0) return 63;
    const total = strainRows.reduce((s, r) => s + (strainStatsById.get(r.strain_id)?.flowering_time_days ?? 63), 0);
    return Math.round(total / strainRows.length);
  }, [strainRows, strainStatsById]);

  const derived = useMemo(() => {
    const start = new Date(flowerStart);
    if (Number.isNaN(start.getTime())) return null;
    const cloneCut = new Date(start);
    cloneCut.setDate(cloneCut.getDate() - vegDaysAvg - 14);
    const vegStart = new Date(start);
    vegStart.setDate(vegStart.getDate() - vegDaysAvg);
    const harvest = new Date(start);
    harvest.setDate(harvest.getDate() + flowerDaysAvg);
    return {
      cloneCut: isoDate(cloneCut),
      vegStart: isoDate(vegStart),
      flowerStart: isoDate(start),
      harvest: isoDate(harvest),
    };
  }, [flowerStart, vegDaysAvg, flowerDaysAvg]);

  const totalPlants = useMemo(
    () => strainRows.reduce((s, r) => s + (r.plant_count || 0), 0),
    [strainRows]
  );

  const perStrainForecast = useMemo(() => {
    return strainRows.map(r => {
      const stat = strainStatsById.get(r.strain_id);
      const yieldPerPlant = stat?.avg_wet_weight_per_plant_g ?? 720;
      const totalGrams = Math.round(yieldPerPlant * r.plant_count);
      return { rowId: r.rowId, totalGrams };
    });
  }, [strainRows, strainStatsById]);

  const totalYieldGrams = useMemo(
    () => perStrainForecast.reduce((s, p) => s + p.totalGrams, 0),
    [perStrainForecast]
  );

  const totalRevenue = useMemo(
    () => Math.round(totalYieldGrams * pricePerGram),
    [totalYieldGrams, pricePerGram]
  );

  // Strain options exclude already-selected strains so the dropdown does
  // not let the operator pick the same strain twice in one cohort. A
  // cohort with two rows of the same strain is structurally a single
  // batch; force consolidation.
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
      const rebalanced = prev.map(r => ({ ...r, plant_count: defaultPlantCount(newCount) }));
      return [...rebalanced, seedRow(next.strain_id, newCount)];
    });
  };

  const handleRemoveStrain = (rowId: string) => {
    setStrainRows(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(r => r.rowId !== rowId);
      const rebalanced = next.map(r => ({ ...r, plant_count: defaultPlantCount(next.length) }));
      return rebalanced;
    });
  };

  const handleStrainChange = (rowId: string, strainId: string) => {
    const moms = motherLots.filter(m => m.strain_id === strainId);
    setStrainRows(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      return {
        ...r,
        strain_id: strainId,
        mom_plant_group_id: moms[0]?.mom_plant_group_id ?? null,
      };
    }));
  };

  const handlePlantCountChange = (rowId: string, count: number) => {
    setStrainRows(prev => prev.map(r => r.rowId === rowId ? { ...r, plant_count: count } : r));
  };

  const handleMomChange = (rowId: string, momId: string) => {
    setStrainRows(prev => prev.map(r => r.rowId === rowId ? { ...r, mom_plant_group_id: momId || null } : r));
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
        const yieldPerPlant = stat?.avg_wet_weight_per_plant_g ?? 720;
        const mom = r.mom_plant_group_id
          ? motherLots.find(m => m.mom_plant_group_id === r.mom_plant_group_id)
          : null;
        return {
          strain_id: r.strain_id,
          plant_count: r.plant_count,
          mom_plant_group_id: r.mom_plant_group_id,
          strain_name: stat?.strain_name ?? r.strain_id,
          strain_abbrev: strainAbbrev(stat, r.strain_id.replace('s-', '').toUpperCase()),
          mom_strain_name: mom?.strain_name ?? null,
          forecast_yield_grams: Math.round(yieldPerPlant * r.plant_count),
        };
      }),
    };
    onFinalize(result);
  };

  return (
    <>
      <div className="plan-form-scrim" onClick={onCancel} aria-hidden />
      <div className="plan-form plan-form-cohort" role="dialog" aria-label="Plan a cohort">
        <div className="plan-form-stamp">
          <span className="serial">FIG. 04</span>
          <span className="sep">·</span>
          <span>Plan a Cohort</span>
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

          <div className="plan-form-row">
            <label className="cap">Price / g</label>
            <input
              className="plan-form-input num"
              type="number"
              step="0.10"
              min="0"
              value={pricePerGram}
              onChange={(e) => setPricePerGram(parseFloat(e.target.value) || 0)}
            />
            <span className="plan-form-help">forecast revenue input</span>
          </div>

          <div className="plan-form-cohort-strains">
            <div className="cohort-strains-head">
              <span className="cap strong">Cohort composition</span>
              <span className="cap mute">{totalPlants} total plants {overCapacity && <span className="warn"> · over capacity {room.capacity_plants}</span>}</span>
            </div>

            <div className="cohort-strain-rows">
              {strainRows.map((row, idx) => {
                const moms = motherLots.filter(m => m.strain_id === row.strain_id);
                const stat = strainStatsById.get(row.strain_id);
                const forecast = perStrainForecast.find(f => f.rowId === row.rowId)?.totalGrams ?? 0;
                return (
                  <div key={row.rowId} className="cohort-strain-row">
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

                    {moms.length > 0 ? (
                      <select
                        className="plan-form-input cohort-strain-mom"
                        value={row.mom_plant_group_id ?? ''}
                        onChange={(e) => handleMomChange(row.rowId, e.target.value)}
                      >
                        {moms.map((m) => (
                          <option key={m.mom_plant_group_id} value={m.mom_plant_group_id}>
                            {m.plant_count} mother{m.plant_count === 1 ? '' : 's'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="cohort-strain-mom-warn cap warn" title="No mothers in MOM-01 for this strain — external sourcing required">
                        external
                      </span>
                    )}

                    <span className="cohort-strain-forecast cap mute">
                      {fmtNum(forecast, ' g')}
                    </span>

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
            <div className="manifest-cap">Cohort Manifest</div>
            <div className="manifest-grid">
              <div className="manifest-row">
                <span className="cap">Room</span>
                <span className="num">{room.room_code}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Cohort label</span>
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
                <span className="cap">Veg days (avg)</span>
                <span className="num">{vegDaysAvg}d</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Flower days (avg)</span>
                <span className="num">{flowerDaysAvg}d</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Forecast yield</span>
                <span className="num">{fmtNum(totalYieldGrams, ' g')}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Forecast revenue</span>
                <span className="num">${totalRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="manifest-prose">
              <span className="cap mute">
                live mapping · posts to fn_plan_cycle once Phase 3 ships · cohort renders as one planning bar in the gantt
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
            Finalize cohort →
          </button>
        </div>
      </div>
    </>
  );
}

export default LabPlanCohortForm;
