/**
 * Supabase Type Extensions
 *
 * Extends auto-generated database types with:
 * - Join relation shapes (for .select('*, relation(*)') queries)
 * - Fields added after last `supabase gen types` run
 * - RPC function type signatures
 * - Realtime payload types
 *
 * When database.types.ts is regenerated, many of these extensions
 * can be removed. Until then, they prevent `as any` casts.
 *
 * Created: 2026-03-17 (Session 56 - Type Safety Cleanup)
 */

import type { Database } from '../lib/database/database.types';
import type { Strain } from './product.types';
import type { ComplianceHeader, BatchComplianceInfo, DistributedToInfo, CoversheetItemSummary } from './coversheet.types';
import type { PendingConversion } from '../features/inventory/types/conversions.types';

// ============================================================
// Join Relation Shapes
// Used when Supabase queries include .select('*, relation(*)')
// ============================================================

/** Product with joined stage, type, and strain relations */
export interface ProductWithRelations {
  id: string;
  name: string;
  sku: string | null;
  type: string | null;
  strain: string | null;
  stage_id: string | null;
  type_id: string | null;
  strain_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Joined from product_stages */
  stage?: { id: string; name: string; display_name?: string } | null;
  /** Joined from product_types */
  product_type?: { id: string; name: string } | null;
  /** Joined from strains */
  strain_info?: Strain | null;
}

/** Lightweight name-only relation shapes for inline joins */
export interface NameRelation {
  name: string;
}

export interface NameAbbrevRelation {
  name: string;
  abbreviation?: string | null;
}

export interface CustomerRelation {
  name: string;
  license_number?: string | null;
}

export interface ProductRelation {
  name: string;
  type?: string | null;
  strain?: string | null;
}

/** Product with joined strains relation (name-only) */
export interface ProductWithStrainRelation {
  id: string;
  name: string;
  type: string | null;
  strain: string | null;
  pricing_unit: string | null;
  product_category: string | null;
  strain_id: string | null;
  strains?: StrainRelation | null;
}

export interface UserRelation {
  full_name: string | null;
}

export interface ProductStageRelation {
  name: string;
  display_name?: string;
}

export interface BatchRelation {
  batch_number: string;
}

export interface StrainRelation {
  name: string;
  abbreviation?: string | null;
}

// ============================================================
// Extended Row Types (fields added after last type generation)
// ============================================================

/** Order with is_sample flag (added post-type-gen) */
export interface OrderExtended extends Database['public']['Tables']['orders']['Row'] {
  is_sample?: boolean;
}

/** Inventory item with quality_grade_id (added post-type-gen) */
export interface InventoryItemExtended extends Database['public']['Tables']['inventory_items']['Row'] {
  quality_grade_id?: string | null;
}

/** Order with joined customer relation */
export interface OrderWithCustomer extends OrderExtended {
  customers?: CustomerRelation | null;
}

/** Order item with joined product relation */
export interface OrderItemWithProduct {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  is_sample: boolean;
  products?: ProductRelation | null;
}

// ============================================================
// Inventory Service Types
// ============================================================

/** Inventory item with joined product_stages relation */
export interface InventoryItemWithStage extends InventoryItemExtended {
  product_stages?: ProductStageRelation | null;
}

/** Inventory item with joined batch + stage relations */
export interface InventoryItemWithBatchAndStage extends InventoryItemExtended {
  batches?: BatchRelation | null;
  product_stages?: ProductStageRelation | null;
}

/** Inventory movement log entry with user join */
export interface MovementLogWithUser {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity_grams: number;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
  user?: UserRelation | null;
}

// ============================================================
// Audit Types
// ============================================================

export type AuditStatus = 'initiated' | 'in_progress' | 'completed' | 'cancelled';

export interface AuditRelation {
  id: string;
  status: AuditStatus;
}

export interface AuditLineWithAudit {
  id: string;
  audit_id: string;
  inventory_item_id: string;
  expected_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  status: string;
  notes: string | null;
  audit?: AuditRelation | null;
}

// ============================================================
// Session Types (pending_conversions is a view, not a column)
// ============================================================

// PendingConversion is defined in features/inventory/types/conversions.types (re-exported via @/types)

/** Trim/Packaging session with pending conversions join */
export interface SessionWithConversions {
  pending_conversions?: PendingConversion[] | null;
}

// ============================================================
// CRM Types
// ============================================================

/** CRM task with computed/joined fields that shouldn't be sent on update */
export interface CRMTaskComputedFields {
  customer_name?: string;
  dispensary_code?: string;
  assigned_user_name?: string;
  is_overdue?: boolean;
  days_overdue?: number | null;
}

// ============================================================
// Coversheet Insert Types
// Coversheets store JSONB columns that need typed inserts
// ============================================================

export interface CoversheetPrecomputedFields {
  compliance_header: ComplianceHeader;
  batch_compliance_data: BatchComplianceInfo[];
  distributed_to_data: DistributedToInfo;
  package_manifest_data: unknown[];
  items_summary?: CoversheetItemSummary[];
}

// ============================================================
// Dashboard / Chart Types
// ============================================================

/** Plant group with joined strain relation */
export interface PlantGroupWithStrain {
  id: string;
  strain_id: string | null;
  strains?: NameRelation | null;
  [key: string]: unknown;
}

// ============================================================
// Realtime Payload Types
// ============================================================

export interface OrderItemPayload {
  order_id?: string;
  [key: string]: unknown;
}

// ============================================================
// RPC Function Type Declarations
// ============================================================

export interface RPCFunctions {
  calculate_batch_projection: {
    Args: { p_batch_id: string; p_target_stage: string; p_yield_pct?: number };
    Returns: unknown;
  };
  check_batch_over_allocation: {
    Args: { p_batch_id: string };
    Returns: unknown;
  };
  get_batch_coa_data: {
    Args: { p_batch_id: string };
    Returns: unknown;
  };
  validate_label_coa_requirement: {
    Args: { p_batch_id: string };
    Returns: unknown;
  };
}

// ============================================================
// Window Extensions
// ============================================================

declare global {
  interface Window {
    __errorService?: unknown;
  }
}

// ============================================================
// Utility Types
// ============================================================

/** Safe record type for dynamic property access (replaces `as any` in Object.values) */
export type SearchableRecord = Record<string, unknown>;

/** Sortable record for dynamic field access */
export type SortableRecord = Record<string, string | number | boolean | null | undefined>;
