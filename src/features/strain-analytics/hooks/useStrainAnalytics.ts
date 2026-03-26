/**
 * useStrainAnalytics
 *
 * Single-query hook powered by the unified v_strain_analytics_summary view.
 * All strain data arrives pre-joined by strain_id — no client-side maps needed.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getStrainAnalyticsSummary } from '../services';
import type {
  StrainAnalyticsRow,
  StrainTableRow,
  StrainProfile,
  StrainFilters,
  SortField,
  SortDirection,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? null : n;
}

function calcDataCompleteness(row: StrainAnalyticsRow): number {
  let filled = 0;
  const total = 10;

  if (row.dominance_type) filled++;
  if (row.flowering_time_days) filled++;
  if (row.harvest_count && row.harvest_count > 0) filled++;
  if (parseNum(row.avg_big_bud_pct) !== null) filled++;
  if (parseNum(row.avg_thc_pct) !== null) filled++;
  if (row.conversion_sessions && row.conversion_sessions > 0) filled++;
  if (parseNum(row.demand_total_units) !== null && parseNum(row.demand_total_units)! > 0) filled++;
  if (row.total_session_count > 0) filled++;
  if (row.runway_days !== null) filled++;
  if (parseNum(row.total_cost_per_gram) !== null) filled++;

  return Math.round((filled / total) * 100);
}

// ── Row builders ─────────────────────────────────────────────────────────────

function buildTableRow(row: StrainAnalyticsRow): StrainTableRow {
  return {
    strain_id: row.strain_id,
    strain_name: row.strain_name,
    display_name: row.display_name,
    dominance_type: row.dominance_type,
    total_session_count: row.total_session_count,
    conversion_confidence: row.conversion_confidence,
    avg_big_bud_pct: parseNum(row.avg_big_bud_pct),
    avg_trim_g_per_hr: parseNum(row.avg_trim_g_per_hr),
    total_sellable_lbs: parseNum(row.total_sellable_lbs),
    runway_days: row.runway_days,
    runway_status: row.runway_status,
    demand_total_units: parseNum(row.demand_total_units),
    order_count: row.order_count,
    total_cost_per_gram: parseNum(row.total_cost_per_gram),
    true_margin_per_gram: parseNum(row.true_margin_per_gram),
    suggested_grade: row.suggested_grade,
    data_completeness: calcDataCompleteness(row),
  };
}

export function buildStrainProfile(row: StrainAnalyticsRow): StrainProfile {
  return {
    strain_id: row.strain_id,
    strain_name: row.strain_name,
    display_name: row.display_name,
    dominance_type: row.dominance_type,
    category: row.category,
    flowering_time_days: row.flowering_time_days,
    veg_days_avg: row.veg_days_avg,
    feed_group: row.feed_group,
    flowering_time_class: row.flowering_time_class,
    harvest_count: row.harvest_count,
    avg_wet_weight_per_plant_g: row.avg_wet_weight_per_plant_g,
    avg_wet_g_per_sqft: parseNum(row.avg_wet_g_per_sqft),
    last_harvest_date: row.last_harvest_date,
    avg_big_bud_pct: parseNum(row.avg_big_bud_pct),
    avg_small_bud_pct: parseNum(row.avg_small_bud_pct),
    avg_trim_pct: parseNum(row.avg_trim_pct),
    avg_waste_pct: parseNum(row.avg_waste_pct),
    avg_thc_pct: parseNum(row.avg_thc_pct),
    avg_total_terpenes_mg_g: parseNum(row.avg_total_terpenes_mg_g),
    coa_count: row.coa_count,
    suggested_grade: row.suggested_grade,
    grade_confidence: row.grade_confidence,
    trim_session_count: row.trim_session_count,
    avg_trim_g_per_hr: parseNum(row.avg_trim_g_per_hr),
    bucking_session_count: row.bucking_session_count,
    avg_bucking_kg_per_hr: parseNum(row.avg_bucking_kg_per_hr),
    packaging_session_count: row.packaging_session_count,
    total_session_count: row.total_session_count,
    conversion_confidence: row.conversion_confidence,
    avg_rosin_yield_pct: parseNum(row.avg_rosin_yield_pct),
    press_run_count: row.press_run_count,
    total_sellable_lbs: parseNum(row.total_sellable_lbs),
    total_pipeline_lbs: parseNum(row.total_pipeline_lbs),
    runway_days: row.runway_days,
    runway_status: row.runway_status,
    demand_total_units: parseNum(row.demand_total_units),
    order_count: row.order_count,
    total_cost_per_gram: parseNum(row.total_cost_per_gram),
    avg_revenue_per_gram: parseNum(row.avg_revenue_per_gram),
    true_margin_per_gram: parseNum(row.true_margin_per_gram),
    avg_variance_pct: parseNum(row.avg_variance_pct),
    variance_event_count: row.variance_event_count,
    most_common_variance_reason: row.most_common_variance_reason,
    inventory_item_count: row.inventory_item_count,
    graded_count: row.graded_count,
    pct_graded: parseNum(row.pct_graded),
    most_common_grade: row.most_common_grade,
    data_completeness: calcDataCompleteness(row),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStrainAnalytics() {
  const [rawData, setRawData] = useState<StrainAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Filters & sort
  const [filters, setFilters] = useState<StrainFilters>({
    search: '',
    dominance: null,
    runwayStatus: null,
    hasData: false,
  });
  const [sortField, setSortField] = useState<SortField>('strain_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getStrainAnalyticsSummary();
      if (fetchError) setError(fetchError);
      setRawData(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build table rows from unified data — no joins needed
  const tableRows = useMemo(
    (): StrainTableRow[] => rawData.map(buildTableRow),
    [rawData]
  );

  // Filter
  const filteredRows = useMemo(() => {
    let rows = tableRows;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.strain_name.toLowerCase().includes(q) ||
          r.display_name.toLowerCase().includes(q)
      );
    }

    if (filters.dominance) {
      rows = rows.filter((r) => r.dominance_type === filters.dominance);
    }

    if (filters.runwayStatus) {
      rows = rows.filter((r) => r.runway_status === filters.runwayStatus);
    }

    if (filters.hasData) {
      rows = rows.filter((r) => r.total_session_count > 0);
    }

    return rows;
  }, [tableRows, filters]);

  // Sort
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [filteredRows, sortField, sortDirection]);

  // Build a full profile for the detail panel
  const getStrainProfile = useCallback(
    (strainId: string): StrainProfile | null => {
      const row = rawData.find((r) => r.strain_id === strainId);
      if (!row) return null;
      return buildStrainProfile(row);
    },
    [rawData]
  );

  // Toggle sort
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    },
    [sortField]
  );

  // Summary stats
  const summary = useMemo(() => {
    const withData = tableRows.filter((r) => r.total_session_count > 0);
    const withCost = tableRows.filter((r) => r.total_cost_per_gram !== null);
    const withDemand = tableRows.filter((r) => (r.demand_total_units ?? 0) > 0);
    const critical = tableRows.filter(
      (r) => r.runway_status === 'critical' || r.runway_status === 'tight'
    );

    return {
      totalStrains: tableRows.length,
      strainsWithData: withData.length,
      strainsWithCost: withCost.length,
      strainsWithDemand: withDemand.length,
      strainsAtRisk: critical.length,
    };
  }, [tableRows]);

  return {
    rows: sortedRows,
    loading,
    error,
    summary,
    filters,
    setFilters,
    sortField,
    sortDirection,
    handleSort,
    getStrainProfile,
    reload: loadData,
  };
}
