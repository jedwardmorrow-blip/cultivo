/**
 * Inventory Movement Types
 *
 * Types for the event-driven inventory ledger system.
 * Movements are immutable audit trail entries that track all inventory changes.
 *
 * @see docs/EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md
 * @see docs/INVENTORY-TRACKING.md
 */

/**
 * Movement kinds (source of truth for inventory changes)
 */
export type MovementKind =
  | 'RECEIPT'              // Initial inventory receipt
  | 'CONSUME'              // Session consumes input (decrements on_hand)
  | 'PRODUCE'              // Session produces output (increments on_hand)
  | 'FULFILLMENT'          // Order fulfillment (decrements on_hand)
  | 'RETURN'               // Customer return (increments on_hand)
  | 'RESERVE'              // Soft allocation (decrements ATP only)
  | 'RELEASE'              // Release reserve (increments ATP only)
  | 'ADJUSTMENT'           // Manual adjustment (absolute, sets on_hand to qty)
  | 'RECONCILIATION';      // Physical count (absolute, sets on_hand to counted_qty)

/**
 * Reason codes for adjustments and reconciliations
 */
export type ReasonCode =
  // Adjustment reasons
  | 'breakage'
  | 'spillage'
  | 'quality_loss'
  | 'measurement_error'
  | 'manual_adjustment'
  | 'initial_receipt'
  // Reconciliation reasons (variance)
  | 'moisture_loss'
  | 'waste'
  | 'theft_loss'
  | 'other';

/**
 * Reference types for movements
 */
export type ReferenceType =
  | 'trim_session'
  | 'packaging_session'
  | 'bucking_session'
  | 'order'
  | 'inventory_audit'
  | 'manual_adjustment';

/**
 * Inventory movement record (database schema)
 */
export interface InventoryMovement {
  id?: string;
  movement_kind: MovementKind;
  source_item_id?: string | null;
  dest_item_id?: string | null;
  qty: number;
  unit: string;
  reason_code?: ReasonCode | string | null;
  reference_id?: string | null;
  reference_type?: ReferenceType | string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

/**
 * Movement creation payload
 */
export interface CreateMovementPayload {
  movement_kind: MovementKind;
  source_item_id?: string;
  dest_item_id?: string;
  qty: number;
  unit: string;
  reason_code?: ReasonCode | string;
  reference_id?: string;
  reference_type?: ReferenceType | string;
  notes?: string;
}

/**
 * Movement validation result
 */
export interface MovementValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Movement result (after creation)
 */
export interface MovementResult {
  success: boolean;
  movement_id?: string;
  error?: string;
}

/**
 * Movement history query options
 */
export interface MovementHistoryOptions {
  limit?: number;
  offset?: number;
  movement_kind?: MovementKind;
  start_date?: Date;
  end_date?: Date;
}

/**
 * Movement statistics
 */
export interface MovementStats {
  total_movements: number;
  by_kind: Array<{
    movement_kind: MovementKind;
    count: number;
    total_qty: number;
  }>;
  by_day: Array<{
    date: string;
    count: number;
    total_qty: number;
  }>;
}
