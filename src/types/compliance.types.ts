/**
 * Compliance Domain Types
 *
 * Covers inventory audits (R9-18-314 30-day reconciliation workflow)
 * and per-batch chemical additive tracking.
 *
 * DB dependencies: CUL-359 (DBA — schema + RPC deployment required)
 *   - inventory_audits: new columns for period reconciliation
 *   - inventory_audit_status: view for badge status
 *   - get_audit_period_summary(): RPC for period balances
 *   - batch_chemical_additives: new table
 */

// ─── Inventory Audit ─────────────────────────────────────────────────────────

export type AuditClockStatus = 'current' | 'warning' | 'overdue';

export type InventoryAuditStatus = 'completed' | 'flagged' | 'cancelled';

export interface InventoryAudit {
  id: string;
  audit_number: string;
  period_start: string;       // ISO date
  period_end: string;         // ISO date
  auditor_id: string | null;
  auditor_name: string | null;
  beginning_inventory_g: number | null;
  acquisitions_g: number | null;
  harvests_g: number | null;
  sales_g: number | null;
  transfers_g: number | null;
  testing_submissions_g: number | null;
  disposals_g: number | null;
  calculated_ending_balance_g: number | null;
  physical_ending_inventory_g: number | null;
  variance_g: number | null;
  variance_explanation: string | null;
  corrective_action: string | null;
  status: InventoryAuditStatus;
  completed_at: string | null;
  created_at: string | null;
}

export interface InventoryAuditInsert {
  audit_number?: string;
  period_start: string;
  period_end: string;
  auditor_id?: string | null;
  beginning_inventory_g?: number | null;
  acquisitions_g?: number | null;
  harvests_g?: number | null;
  sales_g?: number | null;
  transfers_g?: number | null;
  testing_submissions_g?: number | null;
  disposals_g?: number | null;
  calculated_ending_balance_g?: number | null;
  physical_ending_inventory_g: number;
  variance_g?: number | null;
  variance_explanation?: string | null;
  corrective_action?: string | null;
  status: InventoryAuditStatus;
}

// Return type from get_audit_period_summary() RPC
export interface AuditPeriodSummary {
  beginning_inventory_g: number;
  acquisitions_g: number;
  harvests_g: number;
  sales_g: number;
  transfers_g: number;
  testing_submissions_g: number;
  disposals_g: number;
  calculated_ending_balance_g: number;
  last_audit_end_date: string | null;
}

// Row from inventory_audit_status view
export interface InventoryAuditStatusView {
  days_since_last_audit: number | null;
  last_audit_completed_at: string | null;
  audit_clock_status: AuditClockStatus;
}

// ─── Audit Line Items (per-batch reconciliation — CUL-384) ──────────────────

export type AuditVarianceStatus =
  | 'within_scale_tolerance'
  | 'requires_explanation'
  | 'flagged'
  | 'resolved';

export interface AuditLineItem {
  id: string;
  audit_id: string;
  batch_id: string | null;
  product_name: string;
  expected_qty: number;
  actual_qty: number;
  variance_g: number;             // GENERATED STORED: actual_qty - expected_qty
  variance_status: AuditVarianceStatus;
  explanation: string | null;
  corrective_action: string | null;
  criminal_activity_flag: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuditLineItemInsert {
  audit_id: string;
  batch_id?: string | null;
  product_name: string;
  expected_qty: number;
  actual_qty: number;
}

export interface AuditLineItemUpdate {
  actual_qty?: number;
  explanation?: string | null;
  corrective_action?: string | null;
  criminal_activity_flag?: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  variance_status?: AuditVarianceStatus;
}

// ─── Batch Chemical Additives ────────────────────────────────────────────────

export type ChemicalAdditiveType = 'pesticide' | 'herbicide' | 'fertilizer' | 'other';

export interface BatchChemicalAdditive {
  id: string;
  batch_id: string;
  ipm_log_id: string | null;        // links to ipm_spray_log if pre-populated
  additive_type: ChemicalAdditiveType;
  product_name: string;
  active_ingredient: string | null;
  application_date: string;         // ISO date
  rate_applied: string | null;
  application_method: string | null;
  applicator: string | null;
  epa_reg_number: string | null;
  phi_days: number | null;          // pre-harvest interval
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BatchChemicalAdditiveInsert {
  batch_id: string;
  ipm_log_id?: string | null;
  additive_type: ChemicalAdditiveType;
  product_name: string;
  active_ingredient?: string | null;
  application_date: string;
  rate_applied?: string | null;
  application_method?: string | null;
  applicator?: string | null;
  epa_reg_number?: string | null;
  phi_days?: number | null;
  notes?: string | null;
}

export type BatchChemicalAdditiveUpdate = Partial<Omit<BatchChemicalAdditiveInsert, 'batch_id'>>;
