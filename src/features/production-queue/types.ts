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

/** v_production_queue_by_strain — one row per strain + format combo (v4) */
export interface StrainFormatRow {
  strain_id: string | null;
  strain_name: string;
  format_label: string;
  demand_unit: string | null;
  weight_per_unit_g: number;
  product_category: string;
  // v4: assignment-aware demand columns
  total_units_ordered: number;
  total_units_assigned: number;
  total_units_needed: number; // remaining = ordered - assigned
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

// ─── Batch Plan types (strain-level planning layer) ─────────────────────────

/** One row from v_production_queue_batch_planning — one batch with stage + demand context */
export interface BatchPlanData {
  batch_id: string;
  batch_number: string;
  strain_id: string;
  strain_name: string;
  batch_status: string;
  // Stage breakdown (grams)
  binned_g: number;
  bucked_g: number;
  bulk_g: number;
  packaged_g: number;
  trim_g: number;
  total_weight_g: number;
  total_available_g: number;
  // Current allocations
  allocated_order_items: number;
  total_allocated_g: number;
  allocated_order_numbers: string[] | null;
  // Capacity estimates
  est_eighths_from_bulk: number;
  est_lbs_from_bulk: number;
  // Strain-level demand summary
  strain_units_needed: number;
  strain_demand_g: number;
  strain_order_count: number;
  strain_urgency: Urgency | 'no_date';
}

/** Props for the strain-level BatchPlanExpansion container */
export interface BatchPlanProps {
  strainId: string;
  strainName: string;
  /** ALL orders for this strain (all formats) */
  orderItems: OrderLineItem[];
  onClose: () => void;
}

/** A single batch_allocations row (for display within a batch card) */
export interface BatchAllocation {
  id: string;
  batch_id: string;
  order_item_id: string;
  allocation_stage: string;
  allocated_weight_grams: number;
  projected_final_weight_grams: number | null;
  status: string;
  notes: string | null;
  // Joined fields
  order_number?: string;
  customer_name?: string;
  order_item_quantity?: number;
  format_label?: string;
}

// ─── Batch Assign types ─────────────────────────────────────────────────────

/** A single draft assignment: one package → one order item, pending confirmation */
export interface AssignmentDraft {
  /** Temp ID for React key / removal */
  draftId: string;
  packageId: string;
  packageLabel: string; // e.g. "PKG-001" display label
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  quantityToAssign: number;
  /** Max the package can provide (available_qty at draft time) */
  packageAvailableQty: number;
  /** Max the order item still needs */
  orderItemRemainingQty: number;
}

/** Summary shown on the preview/confirm step */
export interface BatchAssignPreview {
  drafts: AssignmentDraft[];
  totalPackagesUsed: number;
  totalOrderItemsTouched: number;
  totalUnitsAssigned: number;
}

/** Props passed to the BatchAssignPanel when opened for a strain+format row */
export interface BatchAssignContext {
  strainId: string | null;
  strainName: string;
  formatLabel: string;
  productCategory: string;
  /** The matching order line items that need this strain+format, sorted FIFO */
  orderItems: OrderLineItem[];
}
