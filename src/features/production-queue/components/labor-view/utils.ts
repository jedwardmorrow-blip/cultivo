import type { StrainFormatRow } from '../../types';
import {
  STAGES, STAGE_ORDER, URGENCY_RANK,
  type Pipeline, type CoverageState, type ShortfallInfoG, type StrainAggregate,
} from './constants';

// ─── Formatting ─────────────────────────────────────────────────────────────

export function fmtPct(n: number): string {
  return n >= 100 ? '100%' : n < 1 && n > 0 ? '<1%' : `${Math.round(n)}%`;
}

// ─── Pipeline Math ──────────────────────────────────────────────────────────

/** Estimate output weight from a stage after loss */
export function estOutputG(weightG: number, lossPct: number, hurdles: number): number {
  const effectiveLoss = lossPct * hurdles * 0.35 + lossPct * 0.65;
  return weightG * (1 - effectiveLoss / 100);
}

/** Total estimated output weight from the full pipeline */
export function calcTotalEstG(pipeline: Pipeline, lossPct: number): number {
  return STAGE_ORDER.reduce((sum, key) => {
    const wG = pipeline[key].weightG;
    if (wG === 0 && key !== 'packaged') return sum;
    if (key === 'packaged') return sum + wG;
    return sum + estOutputG(wG, lossPct, STAGES[key].hurdles);
  }, 0);
}

export function getCoverage(
  readyG: number,
  totalEstG: number,
  demandG: number,
): { state: CoverageState; label: string } {
  if (demandG <= 0) return { state: 'surplus', label: 'Covered' };
  const ratio = totalEstG / demandG;
  if (ratio >= 1.15) return { state: 'surplus', label: 'Surplus' };
  if (ratio >= 0.90) return { state: 'tight', label: 'Tight' };
  return { state: 'deficit', label: 'Deficit' };
}

export function calcShortfallG(
  demandG: number,
  totalEstG: number,
  lossPct: number,
): ShortfallInfoG | null {
  const shortG = demandG - totalEstG;
  if (shortG <= 0) return null;
  const lossMultiplier = 1 / (1 - lossPct / 100);
  const bulkWeightNeeded = Math.ceil(shortG);
  const trimWeightNeeded = Math.ceil(bulkWeightNeeded * lossMultiplier);
  const buckWeightNeeded = Math.ceil(trimWeightNeeded * lossMultiplier);
  return { shortG, bulkWeightNeeded, trimWeightNeeded, buckWeightNeeded };
}

// ─── Labor Tag (compact action label for a strain) ──────────────────────────

export interface LaborTag {
  label: string;
  color: string;
}

export function getLaborTag(pipeline: Pipeline, totalDemandG: number, lossPct: number): LaborTag {
  const totalEstG = calcTotalEstG(pipeline, lossPct);
  const shortfall = calcShortfallG(totalDemandG, totalEstG, lossPct);
  const readyG = pipeline.packaged.weightG;
  const readyPct = totalDemandG > 0 ? (readyG / totalDemandG) * 100 : 0;

  if (shortfall) return { label: `Short ~${fmtW(shortfall.bulkWeightNeeded)}`, color: 'text-cult-danger' };
  if (pipeline.binned.weightG > 0) return { label: `Buck ${fmtW(pipeline.binned.weightG)} first`, color: 'text-orange-400' };
  if (pipeline.bucked.weightG > 0) return { label: `Trim ${fmtW(pipeline.bucked.weightG)}`, color: 'text-cult-warning' };
  if (pipeline.bulk.weightG > 0) return { label: `Package ${fmtW(pipeline.bulk.weightG)}`, color: 'text-cult-info' };
  if (readyPct >= 100) return { label: 'Ship it', color: 'text-cult-success' };
  return { label: '', color: '' };
}

// Inline weight formatter (avoids import for compact use)
function fmtW(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

// ─── Group StrainFormatRows → StrainAggregates ──────────────────────────────

export function groupByStrain(rows: StrainFormatRow[]): StrainAggregate[] {
  const map = new Map<string, StrainAggregate>();

  // Helper: Supabase returns Postgres `numeric` columns as strings.
  // We must coerce to number to avoid string concatenation in arithmetic.
  const n = (v: unknown): number => Number(v) || 0;

  for (const row of rows) {
    const key = row.strain_id ?? row.strain_name;
    let agg = map.get(key);

    if (!agg) {
      const bulkG = n(row.ready_flower_g) + n(row.ready_smalls_g);
      agg = {
        strainId: row.strain_id,
        strainName: row.strain_name,
        urgency: row.urgency,
        formats: [],
        totalDemandG: 0,
        totalOrderedG: 0,
        pipeline: {
          packaged: { weightG: n(row.already_packaged_g), unitCount: n(row.already_packaged_units) },
          bulk:     { weightG: bulkG },
          trimming: { weightG: n(row.ready_trim_g) },
          bucked:   { weightG: n(row.pipeline_bucked_g) },
          binned:   { weightG: n(row.pipeline_binned_g) },
        },
        orderCount: 0,
        earliestDelivery: row.earliest_delivery_date,
        confidence: row.confidence,
        conversionSessions: n(row.conversion_sessions),
      };
      map.set(key, agg);
    }

    // Pick worst urgency
    if ((URGENCY_RANK[row.urgency] ?? 4) < (URGENCY_RANK[agg.urgency] ?? 4)) {
      agg.urgency = row.urgency;
    }
    // Pick earliest delivery
    if (row.earliest_delivery_date && (!agg.earliestDelivery || row.earliest_delivery_date < agg.earliestDelivery)) {
      agg.earliestDelivery = row.earliest_delivery_date;
    }

    const demandG = n(row.total_units_needed) * n(row.weight_per_unit_g);
    const orderedG = n(row.total_units_ordered) * n(row.weight_per_unit_g);
    agg.formats.push({
      formatLabel: row.format_label,
      productCategory: row.product_category,
      weightPerUnitG: n(row.weight_per_unit_g),
      unitsOrdered: n(row.total_units_ordered),
      unitsAssigned: n(row.total_units_assigned),
      unitsNeeded: n(row.total_units_needed),
      demandG,
    });
    agg.totalDemandG += demandG;
    agg.totalOrderedG += orderedG;
    agg.orderCount += n(row.order_count);
  }

  return Array.from(map.values());
}

// ─── Build order lookup by strain ───────────────────────────────────────────

import type { OrderLineItem } from '../../types';

export function buildOrdersByStrain(byOrder: OrderLineItem[]): Map<string, OrderLineItem[]> {
  const map = new Map<string, OrderLineItem[]>();
  for (const o of byOrder) {
    const key = o.strain_id ?? '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  for (const [, items] of map) {
    items.sort((a, b) => {
      const da = a.requested_delivery_date ?? '9999';
      const db = b.requested_delivery_date ?? '9999';
      return da.localeCompare(db);
    });
  }
  return map;
}
