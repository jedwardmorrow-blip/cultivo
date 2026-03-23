import { useMemo, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, ChevronDown } from 'lucide-react';
import { formatWeight } from '../../utils';
import type { HarvestMetricRow, StrainAggregate, RoomAggregate, HarvestTotals } from '../../hooks/useHarvestMetrics';

/* ── Default cost assumptions (editable in-panel) ─────────── */

const DEFAULT_LABOR_RATE = 18; // $/hr
const DEFAULT_HOURS_PER_HARVEST = 6;
const DEFAULT_DRY_ROOM_COST_PER_DAY = 25; // electricity, dehumidifiers
const DEFAULT_GROW_COST_PER_PLANT = 12; // nutrients, media, water

interface CostParams {
  laborRate: number;
  hoursPerHarvest: number;
  dryRoomCostPerDay: number;
  growCostPerPlant: number;
}

/* ── Derived cost interfaces ──────────────────────────────── */

interface StrainCost {
  strain_name: string;
  harvest_count: number;
  total_dry_grams: number;
  est_labor: number;
  est_grow: number;
  est_dry: number;
  est_total: number;
  cost_per_gram: number | null;
  cost_per_lb: number | null;
}

interface RoomCost {
  room_code: string;
  harvest_count: number;
  total_dry_grams: number;
  est_total: number;
  cost_per_gram: number | null;
}

/* ── Component ────────────────────────────────────────────── */

interface CostAnalysisProps {
  rows: HarvestMetricRow[];
  totals: HarvestTotals;
  strainAggregates: StrainAggregate[];
  roomAggregates: RoomAggregate[];
}

export function CostAnalysis({ rows, totals, strainAggregates, roomAggregates }: CostAnalysisProps) {
  const [params, setParams] = useState<CostParams>({
    laborRate: DEFAULT_LABOR_RATE,
    hoursPerHarvest: DEFAULT_HOURS_PER_HARVEST,
    dryRoomCostPerDay: DEFAULT_DRY_ROOM_COST_PER_DAY,
    growCostPerPlant: DEFAULT_GROW_COST_PER_PLANT,
  });
  const [showParams, setShowParams] = useState(false);

  /* ── Strain-level cost estimates ─────────────────────────── */

  const strainCosts = useMemo<StrainCost[]>(() => {
    return strainAggregates
      .map((s) => {
        const sRows = rows.filter(
          (r) => r.strain_name === s.strain_name && r.harvest_status === 'completed'
        );
        const estLabor = s.harvest_count * params.hoursPerHarvest * params.laborRate;
        const estGrow = s.total_plants * params.growCostPerPlant;
        const dryDays = sRows.reduce((sum, r) => sum + (r.days_in_dry ?? 0), 0);
        const estDry = dryDays * params.dryRoomCostPerDay;
        const estTotal = estLabor + estGrow + estDry;
        const hasDry = s.total_dry_grams > 0;

        return {
          strain_name: s.strain_name,
          harvest_count: s.harvest_count,
          total_dry_grams: s.total_dry_grams,
          est_labor: estLabor,
          est_grow: estGrow,
          est_dry: estDry,
          est_total: estTotal,
          cost_per_gram: hasDry ? Math.round((estTotal / s.total_dry_grams) * 100) / 100 : null,
          cost_per_lb: hasDry ? Math.round((estTotal / s.total_dry_grams) * 453.592 * 100) / 100 : null,
        };
      })
      .sort((a, b) => (a.cost_per_gram ?? 999) - (b.cost_per_gram ?? 999));
  }, [strainAggregates, rows, params]);

  /* ── Room-level cost estimates ───────────────────────────── */

  const roomCosts = useMemo<RoomCost[]>(() => {
    return roomAggregates
      .map((r) => {
        const rRows = rows.filter(
          (row) => row.grow_room_code === r.grow_room_code && row.harvest_status === 'completed'
        );
        const estLabor = r.harvest_count * params.hoursPerHarvest * params.laborRate;
        const estGrow = r.total_plants * params.growCostPerPlant;
        const dryDays = rRows.reduce((sum, row) => sum + (row.days_in_dry ?? 0), 0);
        const estDry = dryDays * params.dryRoomCostPerDay;
        const estTotal = estLabor + estGrow + estDry;
        const hasDry = r.total_dry_grams > 0;

        return {
          room_code: r.grow_room_code,
          harvest_count: r.harvest_count,
          total_dry_grams: r.total_dry_grams,
          est_total: estTotal,
          cost_per_gram: hasDry ? Math.round((estTotal / r.total_dry_grams) * 100) / 100 : null,
        };
      })
      .sort((a, b) => (a.cost_per_gram ?? 999) - (b.cost_per_gram ?? 999));
  }, [roomAggregates, rows, params]);

  /* ── Grand totals ────────────────────────────────────────── */

  const grandTotal = useMemo(() => {
    const labor = totals.harvest_count * params.hoursPerHarvest * params.laborRate;
    const grow = totals.total_plants * params.growCostPerPlant;
    const dryDays = rows
      .filter((r) => r.harvest_status === 'completed')
      .reduce((sum, r) => sum + (r.days_in_dry ?? 0), 0);
    const dry = dryDays * params.dryRoomCostPerDay;
    const total = labor + grow + dry;
    const hasDry = totals.total_dry_grams > 0;

    return {
      labor,
      grow,
      dry,
      total,
      costPerGram: hasDry ? Math.round((total / totals.total_dry_grams) * 100) / 100 : null,
      costPerLb: hasDry ? Math.round((total / totals.total_dry_grams) * 453.592 * 100) / 100 : null,
      costPerPlant: totals.total_plants > 0 ? Math.round(total / totals.total_plants * 100) / 100 : null,
    };
  }, [totals, rows, params]);

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Assumptions toggle */}
      <div className="bg-cult-near-black border border-cult-dark-gray">
        <button
          type="button"
          onClick={() => setShowParams(!showParams)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-cult-charcoal/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cult-medium-gray" />
            <span className="text-xs text-cult-medium-gray uppercase tracking-wider font-semibold">
              Cost Assumptions
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-cult-medium-gray transition-transform ${showParams ? '' : '-rotate-90'}`} />
        </button>

        {showParams && (
          <div className="border-t border-cult-dark-gray px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput label="Labor rate ($/hr)" value={params.laborRate} onChange={(v) => setParams((p) => ({ ...p, laborRate: v }))} />
            <ParamInput label="Hrs per harvest" value={params.hoursPerHarvest} onChange={(v) => setParams((p) => ({ ...p, hoursPerHarvest: v }))} />
            <ParamInput label="Dry room $/day" value={params.dryRoomCostPerDay} onChange={(v) => setParams((p) => ({ ...p, dryRoomCostPerDay: v }))} />
            <ParamInput label="Grow $/plant" value={params.growCostPerPlant} onChange={(v) => setParams((p) => ({ ...p, growCostPerPlant: v }))} />
          </div>
        )}
      </div>

      {/* Grand total cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CostCard label="Est. Total Cost" value={`$${grandTotal.total.toLocaleString()}`} sub={`${totals.harvest_count} harvests`} />
        <CostCard
          label="Cost / Gram (dry)"
          value={grandTotal.costPerGram != null ? `$${grandTotal.costPerGram.toFixed(2)}` : '—'}
          sub={grandTotal.costPerLb != null ? `$${grandTotal.costPerLb.toLocaleString()}/lb` : ''}
        />
        <CostCard label="Cost / Plant" value={grandTotal.costPerPlant != null ? `$${grandTotal.costPerPlant.toFixed(2)}` : '—'} sub={`${totals.total_plants} plants`} />
        <CostCard
          label="Cost Breakdown"
          value=""
          sub=""
          custom={
            <div className="space-y-1 mt-1">
              <CostBar label="Labor" amount={grandTotal.labor} total={grandTotal.total} color="bg-sky-500" />
              <CostBar label="Grow" amount={grandTotal.grow} total={grandTotal.total} color="bg-green-500" />
              <CostBar label="Dry" amount={grandTotal.dry} total={grandTotal.total} color="bg-amber-500" />
            </div>
          }
        />
      </div>

      {/* Strain cost efficiency */}
      {strainCosts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-cult-white uppercase tracking-wider">Cost Efficiency by Strain</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cult-dark-gray text-xs uppercase tracking-wider text-cult-medium-gray">
                  <th className="text-left py-2 px-3">Strain</th>
                  <th className="text-right py-2 px-3">Dry Weight</th>
                  <th className="text-right py-2 px-3">Est. Cost</th>
                  <th className="text-right py-2 px-3">$/gram</th>
                  <th className="text-right py-2 px-3">$/lb</th>
                </tr>
              </thead>
              <tbody>
                {strainCosts.map((sc, idx) => {
                  const isBest = idx === 0 && sc.cost_per_gram != null;
                  const isWorst = idx === strainCosts.length - 1 && sc.cost_per_gram != null && strainCosts.length > 1;
                  return (
                    <tr key={sc.strain_name} className="border-b border-cult-dark-gray/50 hover:bg-cult-near-black transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-cult-white font-semibold">{sc.strain_name}</span>
                          {isBest && (
                            <span className="flex items-center gap-0.5 text-xs text-green-400">
                              <TrendingDown className="w-3 h-3" /> lowest
                            </span>
                          )}
                          {isWorst && (
                            <span className="flex items-center gap-0.5 text-xs text-red-400">
                              <TrendingUp className="w-3 h-3" /> highest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-cult-light-gray">
                        {sc.total_dry_grams > 0 ? formatWeight(sc.total_dry_grams) : '—'}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-cult-light-gray">
                        ${sc.est_total.toLocaleString()}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-semibold text-cult-white">
                        {sc.cost_per_gram != null ? `$${sc.cost_per_gram.toFixed(2)}` : '—'}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-cult-light-gray">
                        {sc.cost_per_lb != null ? `$${sc.cost_per_lb.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room cost efficiency */}
      {roomCosts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-cult-white uppercase tracking-wider">Cost Efficiency by Room</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roomCosts.map((rc) => (
              <div key={rc.room_code} className="bg-cult-near-black border border-cult-dark-gray p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold text-cult-white">{rc.room_code}</span>
                  <span className="text-xs text-cult-medium-gray">{rc.harvest_count} harvests</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-cult-medium-gray uppercase tracking-wider">Est. Cost</div>
                    <div className="text-sm font-mono text-cult-light-gray">${rc.est_total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-cult-medium-gray uppercase tracking-wider">$/gram</div>
                    <div className="text-lg font-mono font-bold text-cult-white">
                      {rc.cost_per_gram != null ? `$${rc.cost_per_gram.toFixed(2)}` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-cult-medium-gray italic">
        Cost estimates are based on configurable assumptions and harvest data. Adjust assumptions above to refine projections.
        Actual costs may vary based on labor scheduling, utility rates, and supply chain factors.
      </p>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function ParamInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">{label}</label>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs text-center py-1.5 rounded-sm focus:outline-none focus:border-cult-accent"
      />
    </div>
  );
}

function CostCard({ label, value, sub, custom }: { label: string; value: string; sub: string; custom?: React.ReactNode }) {
  return (
    <div className="bg-cult-near-black border border-cult-dark-gray p-3">
      <div className="text-xs text-cult-medium-gray uppercase tracking-wider">{label}</div>
      {value && <div className="text-xl font-mono font-bold text-cult-white mt-1">{value}</div>}
      {sub && <div className="text-xs text-cult-light-gray mt-0.5">{sub}</div>}
      {custom}
    </div>
  );
}

function CostBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cult-light-gray w-10">{label}</span>
      <div className="flex-1 h-1.5 bg-cult-dark-gray rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-cult-medium-gray w-12 text-right">${amount.toLocaleString()}</span>
    </div>
  );
}
