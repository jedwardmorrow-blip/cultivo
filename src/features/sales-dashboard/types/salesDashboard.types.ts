export type SupplyHealthStatus = 'critical' | 'low' | 'warning' | 'healthy';

export interface StrainSupplyDemand {
  strain: string;
  sellable_flower_grams: number;
  sellable_smalls_grams: number;
  packaged_units: number;
  pipeline_grams: number;
  byproduct_grams: number;
  demand_packaged_units: number;
  demand_bulk_flower_qty: number;
  demand_bulk_smalls_qty: number;
  total_demand_revenue: number;
  total_orders: number;
  supply_health: SupplyHealthStatus;
}

export interface DashboardTotals {
  sellable_flower_grams: number;
  sellable_smalls_grams: number;
  packaged_units: number;
  pipeline_grams: number;
  byproduct_grams: number;
  total_sellable_grams: number;
  active_demand_revenue: number;
  active_orders: number;
}

export interface HealthDistribution {
  low: number;
  healthy: number;
  warning: number;
  critical: number;
}

export interface DashboardSummary {
  totals: DashboardTotals;
  health_distribution: HealthDistribution;
  strain_count: {
    total: number;
    with_active_demand: number;
    supply_only: number;
  };
}

export interface InventoryCategory {
  category: string;
  display_label: string;
  display_group: 'sellable' | 'pipeline' | 'byproduct';
  total_grams?: number;
  total_units?: number;
  item_count: number;
}

export interface SupplyHealthDefinition {
  label: string;
  color: string;
  description: string;
}

export interface GradeDefinition {
  code: string;
  label: string;
  color: string;
  tailwind_bg: string;
  tailwind_text: string;
  tailwind_border: string;
}

export interface SalesDashboardData {
  summary: DashboardSummary;
  inventory_categories: InventoryCategory[];
  supply_demand_by_strain: StrainSupplyDemand[];
  supply_health_definitions: Record<SupplyHealthStatus, SupplyHealthDefinition>;
  grade_system: {
    grades: GradeDefinition[];
    note: string;
  };
}

export const SUPPLY_HEALTH_COLORS: Record<SupplyHealthStatus, string> = {
  critical: '#ef4444',
  low: '#f97316',
  warning: '#eab308',
  healthy: '#22c55e',
};

export const DISPLAY_GROUP_COLORS = {
  sellable: {
    flower: '#22c55e',
    smalls: '#4ade80',
    packaged: '#86efac',
  },
  pipeline: '#3b82f6',
  byproduct: '#f59e0b',
};
