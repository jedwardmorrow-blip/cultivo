import { useEffect, useMemo, useState } from 'react';
import type {
  CalendarRoom,
  CalendarPlannedEntry,
  StrainCultivationStats,
} from '@/features/production-planner/types';

interface MotherLot {
  /** Stand-in for plant_groups.id; mock uses strain_id as a single-mom-per-strain key. */
  mom_plant_group_id: string;
  strain_id: string;
  strain_name: string;
  plant_count: number;
  /** True if the mother's planted_date / stage data is back-filled, not operator-captured. */
  synthetic?: boolean;
}

interface LabPlanCycleFormProps {
  room: CalendarRoom;
  strainStats: StrainCultivationStats[];
  strainStatsById: Map<string, StrainCultivationStats>;
  /** All mother lots available in the facility, used to filter by strain. */
  motherLots: MotherLot[];
  /** Optional pre-fill (used by Seed CTA `PLAN SUCCESSOR →`). */
  initialStrainId?: string;
  initialFlowerStart?: string;
  /** Optional title override displayed under FIG. 04 stamp. */
  prefillReason?: string;
  onCancel: () => void;
  onFinalize: (entry: CalendarPlannedEntry, roomId: string, roomCode: string) => void;
}

export type { MotherLot };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n).toLocaleString()}${suffix}`;
}

export function LabPlanCycleForm({
  room,
  strainStats,
  strainStatsById,
  motherLots,
  initialStrainId,
  initialFlowerStart,
  prefillReason,
  onCancel,
  onFinalize,
}: LabPlanCycleFormProps) {
  const today = useMemo(() => new Date(), []);

  // Default flower start = today + 56d. Roughly 8 weeks out so the
  // derived clone-cut date lands today or in the future, not in the past.
  const defaultFlowerStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 56);
    return isoDate(d);
  }, [today]);

  const defaultStrain = initialStrainId ?? strainStats[0]?.strain_id ?? '';
  const defaultPlantCount = Math.min(192, room.capacity_plants ?? 192);

  const [strainId, setStrainId] = useState<string>(defaultStrain);
  const [plantCount, setPlantCount] = useState<number>(defaultPlantCount);
  const [flowerStart, setFlowerStart] = useState<string>(initialFlowerStart ?? defaultFlowerStart);
  const [pricePerGram, setPricePerGram] = useState<number>(4.5);
  const [momPlantGroupId, setMomPlantGroupId] = useState<string>('');

  const stats = strainStatsById.get(strainId) ?? null;

  // Mothers available for the chosen strain. If none, the form should warn
  // and offer "external sourcing" as the explicit alternative.
  const availableMothers = useMemo(
    () => motherLots.filter((m) => m.strain_id === strainId),
    [motherLots, strainId]
  );

  // Reset / auto-pick mother when strain changes.
  useEffect(() => {
    if (availableMothers.length === 0) {
      setMomPlantGroupId('');
    } else if (!availableMothers.some((m) => m.mom_plant_group_id === momPlantGroupId)) {
      setMomPlantGroupId(availableMothers[0].mom_plant_group_id);
    }
  }, [availableMothers, momPlantGroupId]);

  const selectedMother = availableMothers.find((m) => m.mom_plant_group_id === momPlantGroupId) ?? null;

  // Derived dates from flower start.
  const derived = useMemo(() => {
    const start = new Date(flowerStart);
    if (Number.isNaN(start.getTime())) return null;
    const flowerDays = stats?.flowering_time_days ?? 63;
    const vegDays = stats?.veg_days_avg ?? 21;
    const cloneCut = new Date(start);
    cloneCut.setDate(cloneCut.getDate() - vegDays - 14);
    const vegStart = new Date(start);
    vegStart.setDate(vegStart.getDate() - vegDays);
    const harvest = new Date(start);
    harvest.setDate(harvest.getDate() + flowerDays);
    return {
      cloneCut: isoDate(cloneCut),
      vegStart: isoDate(vegStart),
      flowerStart: isoDate(start),
      harvest: isoDate(harvest),
      flowerDays,
      vegDays,
    };
  }, [flowerStart, stats]);

  // Forecast yield + revenue.
  const forecast = useMemo(() => {
    if (!stats || !derived) return null;
    const yieldPerPlant = stats.avg_wet_weight_per_plant_g ?? 720;
    const totalGrams = Math.round(yieldPerPlant * plantCount);
    const revenue = Math.round(totalGrams * pricePerGram);
    return { totalGrams, revenue };
  }, [stats, derived, plantCount, pricePerGram]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const canFinalize =
    !!stats &&
    !!derived &&
    plantCount > 0 &&
    plantCount <= (room.capacity_plants ?? 9999);

  const handleFinalize = () => {
    if (!canFinalize || !stats || !derived || !forecast) return;
    const entry: CalendarPlannedEntry = {
      id: `lab-${Date.now()}`,
      strain_id: stats.strain_id,
      strain_name: stats.strain_name,
      planned_plant_count: plantCount,
      clone_cut_date: derived.cloneCut,
      veg_start_date: derived.vegStart,
      flower_start_date: derived.flowerStart,
      estimated_harvest_date: derived.harvest,
      status: 'committed',
      forecast_yield_grams: forecast.totalGrams,
      forecast_price_per_gram: pricePerGram,
    };
    onFinalize(entry, room.room_id, room.room_code);
  };

  return (
    <>
      <div className="plan-form-scrim" onClick={onCancel} aria-hidden />
      <div className="plan-form" role="dialog" aria-label="Plan a cycle">
        <div className="plan-form-stamp">
          <span className="serial">FIG. 04</span>
          <span className="sep">·</span>
          <span>Plan a Cycle</span>
          <span className="sep">·</span>
          <span className="strong">{room.room_code}</span>
          <span className="sep">·</span>
          <span>{room.room_type}</span>
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
            <label className="cap">Strain</label>
            <select
              className="plan-form-input"
              value={strainId}
              onChange={(e) => setStrainId(e.target.value)}
            >
              {strainStats.map((s) => (
                <option key={s.strain_id} value={s.strain_id}>
                  {s.strain_name}
                </option>
              ))}
            </select>
          </div>

          <div className="plan-form-row">
            <label className="cap">Mother</label>
            {availableMothers.length > 0 ? (
              <select
                className="plan-form-input"
                value={momPlantGroupId}
                onChange={(e) => setMomPlantGroupId(e.target.value)}
              >
                {availableMothers.map((m) => (
                  <option key={m.mom_plant_group_id} value={m.mom_plant_group_id}>
                    {m.strain_name} · {m.plant_count} mother{m.plant_count === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="plan-form-no-mother">
                <span>No mothers in MOM-01</span>
                <span className="cap warn">external source required</span>
              </div>
            )}
            {selectedMother && (
              <span className={`plan-form-help ${selectedMother.synthetic ? 'synthetic' : ''}`}>
                {selectedMother.plant_count} mother{selectedMother.plant_count === 1 ? '' : 's'} on hand
                {selectedMother.synthetic && <span className="quarantine-pill" title="Mother establishment date is back-filled, not operator-captured">model</span>}
              </span>
            )}
          </div>

          <div className="plan-form-row">
            <label className="cap">Plants</label>
            <input
              className="plan-form-input num"
              type="number"
              min="1"
              max={room.capacity_plants ?? 9999}
              value={plantCount}
              onChange={(e) => setPlantCount(parseInt(e.target.value, 10) || 0)}
            />
            <span className="plan-form-help">
              Capacity {room.capacity_plants ?? '—'}
              {plantCount > (room.capacity_plants ?? 9999) && <span className="warn"> · over capacity</span>}
            </span>
          </div>

          <div className="plan-form-row">
            <label className="cap">Flower start</label>
            <input
              className="plan-form-input num"
              type="date"
              value={flowerStart}
              onChange={(e) => setFlowerStart(e.target.value)}
            />
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

          {/* Manifest — pre-commit summary */}
          <div className="plan-form-manifest">
            <div className="manifest-cap">Manifest</div>
            <div className="manifest-grid">
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
                <span className="cap">Harvest</span>
                <span className="num">{derived?.harvest ?? '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Veg days</span>
                <span className="num">{derived ? `${derived.vegDays}d` : '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Flower days</span>
                <span className="num">{derived ? `${derived.flowerDays}d` : '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Forecast yield</span>
                <span className="num">{forecast ? fmtNum(forecast.totalGrams, ' g') : '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Forecast revenue</span>
                <span className="num">{forecast ? fmtMoney(forecast.revenue) : '—'}</span>
              </div>
              <div className="manifest-row">
                <span className="cap">Mother lineage</span>
                <span className="num">
                  {selectedMother ? `${selectedMother.strain_name} · in-house` : 'external'}
                </span>
              </div>
            </div>
            <div className="manifest-prose">
              {stats && derived && forecast ? (
                <>
                  Cut <span className="num">{plantCount}</span> clones of <span className="strong">{stats.strain_name}</span> on{' '}
                  <span className="num">{derived.cloneCut}</span>, transplant to veg <span className="num">{derived.vegStart}</span>,
                  flip to flower <span className="num">{derived.flowerStart}</span>, harvest <span className="num">{derived.harvest}</span>.
                  Forecast yield <span className="num">{fmtNum(forecast.totalGrams, ' g')}</span> at{' '}
                  <span className="num">${pricePerGram}/g</span> = <span className="num">{fmtMoney(forecast.revenue)}</span>.
                </>
              ) : (
                <span className="cap mute">Pick a strain and start date to see the manifest</span>
              )}
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
            Finalize →
          </button>
        </div>
      </div>
    </>
  );
}

export default LabPlanCycleForm;
