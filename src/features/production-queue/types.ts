// Production Queue View types
// Maps to the 3 Supabase views: v_production_queue_strain_summary,
// v_production_queue_by_strain, v_production_queue_by_order

export type Urgency = 'overdue' | 'urgent' | 'soon' | 'normal' | 'no_date';
// v3 stock_status values from by_strain view: 'no_stock' | 'needs_processing' | 'ready'
// v2 stock_status values still used by strain_summary view: 'no_stock' | 'partial' | 'can_fill' | 'available'
export type StockStatus = 'no_stock' | 'needs_processing' | 'ready' | 'partial' | 'can_fill' | 'available';
export type ProductCategory = 'All' | 'Flower' | 'Smalls' | 'Fresh Frozen' | 'Preroll' | 'Trim';

/** v_production_queue_strain_summary — one row per strain */
export interface StrainSummary {
  strain_id: string | null;
  strain_name: string;
  total_demand_g: number;
  total_demand_lbs: number;
  available_g: number;
  available_lbs: number;
  fill_rate_pct: number;
  order_count: number;
  line_item_count: number;
  earliest_delivery: string | null;
  urgency: Urgency;
  stock_status: StockStatus;
}

/** v_production_queue_by_strain — one row per strain + format combo (v3) */
export interface StrainFormatRow {
  strain_id: string | null;
  strain_name: string;
  format_label: string;
  demand_unit: string | null;
  weight_per_unit_g: number;
  product_category: string;
  total_units_needed: number;
  total_demand_g: number;
  total_demand_lbs: number;
  order_count: number;
  // v3 inventory breakdown (replaces strain_available_g / strain_available_lbs)
  ready_flower_g: number;
  ready_smalls_g: number;
  ready_trim_g: number;
  ready_lbs: number;
  pipeline_bucked_g: number;
  pipeline_binned_g: number;
  pipeline_lbs: number;
  already_packaged_units: number;
  already_packaged_g: number;
  stock_status: StockStatus;
  earliest_delivery_date: string | null;
  urgency: Urgency;
}

/** v_production_queue_by_order — one row per order line item */
export interface OrderLineItem {
  order_id: string;
  order_number: string;
  order_status: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
  is_sample: boolean;
  customer_name: string;
  customer_id: string;
  order_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  demand_unit: string | null;
  item_status: string;
  strain_id: string | null;
  strain_name: string;
  format_label: string;
  weight_per_unit_g: number;
  line_demand_g: number;
  product_id: string;
  product_name: string;
  product_category: string;
  urgency: Urgency;
  delivery_notes: string | null;
  // Batch fields (null when no batch assigned to this line item)
  batch_number: string | null;
  batch_lifecycle_state: string | null;
  batch_status: string | null;
  batch_quarantined: boolean | null;
  batch_harvest_date: string | null;
  batch_quality_grade: string | null;
  batch_grade_code: string | null;
  batch_grade_color: string | null;
  batch_stage_label: string | null;
}

export type ProductionQueueTab = 'by-strain' | 'by-order' | 'summary';
export type DeliveryDateFilter = 'all' | 'overdue' | 'this-week' | 'next-week';
