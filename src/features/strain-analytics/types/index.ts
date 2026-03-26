/**
 * Strain Analytics Types
 *
 * Maps directly to the unified v_strain_analytics_summary view,
 * which joins all strain data server-side by strain_id.
 */

// ── Raw DB row from v_strain_analytics_summary ───────────────────────────────

export interface StrainAnalyticsRow {
  // Identity
  strain_id: string;
  strain_name: string;
  display_name: string;
  dominance_type: string | null;
  category: string | null;

  // Genetics (manual seed)
  flowering_time_days: number | null;
  veg_days_avg: number | null;
  feed_group: string | null;
  flowering_time_class: string | null;

  // Cultivation
  harvest_count: number | null;
  avg_wet_weight_per_plant_g: number | null;
  last_harvest_date: string | null;
  avg_wet_g_per_sqft: string | null;

  // Quality (trim allocation)
  avg_big_bud_pct: string | null;
  avg_small_bud_pct: string | null;
  avg_trim_pct: string | null;
  avg_waste_pct: string | null;

  // COA
  avg_thc_pct: string | null;
  avg_total_terpenes_mg_g: string | null;
  coa_count: number | null;

  // Throughput
  trim_session_count: number | null;
  avg_trim_g_per_hr: string | null;
  last_trim_date: string | null;
  bucking_session_count: number | null;
  avg_bucking_kg_per_hr: string | null;
  last_bucking_date: string | null;
  packaging_session_count: number | null;
  avg_units_per_hr: string | null;
  last_packaging_date: string | null;
  total_session_count: number;

  // Conversion
  conversion_confidence: string | null;
  conversion_sessions: number | null;

  // Rosin
  avg_rosin_yield_pct: string | null;
  press_run_count: number | null;

  // Inventory & demand
  total_sellable_lbs: string | null;
  total_pipeline_lbs: string | null;
  demand_total_units: string | null;
  demand_unassigned_units: string | null;
  order_count: number | null;
  runway_days: number | null;
  runway_status: string | null;

  // Economics
  total_cost_per_gram: string | null;
  avg_revenue_per_gram: string | null;
  true_margin_per_gram: string | null;
  labor_cost_per_gram: string | null;

  // Grade
  suggested_grade: string | null;
  grade_confidence: string | null;

  // Variance
  avg_variance_pct: string | null;
  variance_event_count: number | null;
  most_common_variance_reason: string | null;

  // Grading status
  inventory_item_count: number | null;
  graded_count: number | null;
  pct_graded: string | null;
  most_common_grade: string | null;
}

// ── Parsed profile (numeric values parsed from strings) ──────────────────────

export interface StrainProfile {
  strain_id: string;
  strain_name: string;
  display_name: string;
  dominance_type: string | null;
  category: string | null;
  flowering_time_days: number | null;
  veg_days_avg: number | null;
  feed_group: string | null;
  flowering_time_class: string | null;
  harvest_count: number | null;
  avg_wet_weight_per_plant_g: number | null;
  avg_wet_g_per_sqft: number | null;
  last_harvest_date: string | null;
  avg_big_bud_pct: number | null;
  avg_small_bud_pct: number | null;
  avg_trim_pct: number | null;
  avg_waste_pct: number | null;
  avg_thc_pct: number | null;
  avg_total_terpenes_mg_g: number | null;
  coa_count: number | null;
  suggested_grade: string | null;
  grade_confidence: string | null;
  trim_session_count: number | null;
  avg_trim_g_per_hr: number | null;
  bucking_session_count: number | null;
  avg_bucking_kg_per_hr: number | null;
  packaging_session_count: number | null;
  total_session_count: number;
  conversion_confidence: string | null;
  avg_rosin_yield_pct: number | null;
  press_run_count: number | null;
  total_sellable_lbs: number | null;
  total_pipeline_lbs: number | null;
  runway_days: number | null;
  runway_status: string | null;
  demand_total_units: number | null;
  order_count: number | null;
  total_cost_per_gram: number | null;
  avg_revenue_per_gram: number | null;
  true_margin_per_gram: number | null;
  avg_variance_pct: number | null;
  variance_event_count: number | null;
  most_common_variance_reason: string | null;
  inventory_item_count: number | null;
  graded_count: number | null;
  pct_graded: number | null;
  most_common_grade: string | null;
  data_completeness: number;
}

// ── Dashboard table row (lightweight subset) ─────────────────────────────────

export interface StrainTableRow {
  strain_id: string;
  strain_name: string;
  display_name: string;
  dominance_type: string | null;
  total_session_count: number;
  conversion_confidence: string | null;
  avg_big_bud_pct: number | null;
  avg_trim_g_per_hr: number | null;
  total_sellable_lbs: number | null;
  runway_days: number | null;
  runway_status: string | null;
  demand_total_units: number | null;
  order_count: number | null;
  total_cost_per_gram: number | null;
  true_margin_per_gram: number | null;
  suggested_grade: string | null;
  data_completeness: number;
}

// ── Sort & Filter ────────────────────────────────────────────────────────────

export type SortField =
  | 'strain_name'
  | 'total_session_count'
  | 'avg_big_bud_pct'
  | 'total_sellable_lbs'
  | 'runway_days'
  | 'demand_total_units'
  | 'true_margin_per_gram'
  | 'data_completeness';

export type SortDirection = 'asc' | 'desc';

export interface StrainFilters {
  search: string;
  dominance: string | null;
  runwayStatus: string | null;
  hasData: boolean;
}
