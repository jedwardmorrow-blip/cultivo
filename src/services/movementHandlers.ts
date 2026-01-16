import { inventoryMovementService } from './inventoryMovement.service';
import type { MovementResult } from '@/types/movement.types';

/**
 * Movement Type Handlers
 *
 * Convenience functions for recording specific types of inventory movements.
 * These provide type-safe wrappers around the inventory movement service.
 *
 * @see docs/EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md
 *
 * @example
 * ```typescript
 * // Record production from packaging session
 * await recordProduction(
 *   'item-123',
 *   350, // 350g
 *   'session-456',
 *   'packaging'
 * );
 * ```
 */

/**
 * Record inventory receipt (initial stock)
 *
 * Used when inventory first enters the system.
 *
 * @param itemId - Destination inventory item ID
 * @param qty - Quantity received
 * @param notes - Optional notes about the receipt
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordReceipt(
  itemId: string,
  qty: number,
  notes?: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'RECEIPT',
      dest_item_id: itemId,
      qty,
      unit: 'g',
      reason_code: 'initial_receipt',
      notes
    },
    isTestMode
  );
}

/**
 * Record session consumption (input used)
 *
 * Used when a session consumes inventory as input.
 *
 * @param sourceItemId - Source inventory item ID
 * @param qty - Quantity consumed
 * @param sessionId - Session ID
 * @param sessionType - Type of session
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordConsumption(
  sourceItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking',
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'CONSUME',
      source_item_id: sourceItemId,
      qty,
      unit: 'g',
      reference_id: sessionId,
      reference_type: `${sessionType}_session`
    },
    isTestMode
  );
}

/**
 * Record session production (output created)
 *
 * Used when a session produces inventory as output.
 *
 * @param destItemId - Destination inventory item ID
 * @param qty - Quantity produced
 * @param sessionId - Session ID
 * @param sessionType - Type of session
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordProduction(
  destItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking',
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'PRODUCE',
      dest_item_id: destItemId,
      qty,
      unit: 'g',
      reference_id: sessionId,
      reference_type: `${sessionType}_session`
    },
    isTestMode
  );
}

/**
 * Record order fulfillment (inventory shipped)
 *
 * Used when inventory is shipped to fulfill an order.
 *
 * @param sourceItemId - Source inventory item ID
 * @param qty - Quantity fulfilled
 * @param orderId - Order ID
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordFulfillment(
  sourceItemId: string,
  qty: number,
  orderId: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'FULFILLMENT',
      source_item_id: sourceItemId,
      qty,
      unit: 'g',
      reference_id: orderId,
      reference_type: 'order'
    },
    isTestMode
  );
}

/**
 * Record customer return (inventory returned)
 *
 * Used when inventory is returned by a customer.
 *
 * @param itemId - Destination inventory item ID
 * @param qty - Quantity returned
 * @param orderId - Original order ID
 * @param notes - Optional notes about the return
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordReturn(
  itemId: string,
  qty: number,
  orderId: string,
  notes?: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'RETURN',
      dest_item_id: itemId,
      qty,
      unit: 'g',
      reference_id: orderId,
      reference_type: 'order',
      notes
    },
    isTestMode
  );
}

/**
 * Record inventory reservation (soft allocation)
 *
 * Used when inventory is reserved for an order but not yet shipped.
 * Affects ATP (Available to Promise) but not on_hand_qty.
 *
 * @param sourceItemId - Source inventory item ID
 * @param qty - Quantity reserved
 * @param orderId - Order ID
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordReservation(
  sourceItemId: string,
  qty: number,
  orderId: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'RESERVE',
      source_item_id: sourceItemId,
      qty,
      unit: 'g',
      reference_id: orderId,
      reference_type: 'order'
    },
    isTestMode
  );
}

/**
 * Record reservation release (cancel soft allocation)
 *
 * Used when a reservation is cancelled and inventory becomes available again.
 * Affects ATP (Available to Promise) but not on_hand_qty.
 *
 * @param itemId - Destination inventory item ID
 * @param qty - Quantity released
 * @param orderId - Order ID
 * @param notes - Optional notes about the release
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordRelease(
  itemId: string,
  qty: number,
  orderId: string,
  notes?: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'RELEASE',
      dest_item_id: itemId,
      qty,
      unit: 'g',
      reference_id: orderId,
      reference_type: 'order',
      notes
    },
    isTestMode
  );
}

/**
 * Record manual adjustment
 *
 * Used for manual inventory corrections.
 * Sets on_hand_qty to the specified value (absolute).
 *
 * @param itemId - Inventory item ID
 * @param newQty - New quantity (absolute value)
 * @param reason - Reason for adjustment
 * @param notes - Optional notes about the adjustment
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordAdjustment(
  itemId: string,
  newQty: number,
  reason: string,
  notes?: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'ADJUSTMENT',
      dest_item_id: itemId,
      qty: newQty,
      unit: 'g',
      reason_code: reason,
      reference_type: 'manual_adjustment',
      notes
    },
    isTestMode
  );
}

/**
 * Record physical count reconciliation
 *
 * Used after a physical inventory audit.
 * Sets on_hand_qty to the counted value (absolute).
 *
 * @param itemId - Inventory item ID
 * @param countedQty - Physically counted quantity
 * @param auditId - Audit session ID
 * @param varianceReason - Reason for variance (if any)
 * @param notes - Optional notes about the reconciliation
 * @param isTestMode - Test mode bypass flag
 * @returns Movement result
 */
export async function recordReconciliation(
  itemId: string,
  countedQty: number,
  auditId: string,
  varianceReason?: string,
  notes?: string,
  isTestMode: boolean = false
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement(
    {
      movement_kind: 'RECONCILIATION',
      dest_item_id: itemId,
      qty: countedQty,
      unit: 'g',
      reason_code: varianceReason,
      reference_id: auditId,
      reference_type: 'inventory_audit',
      notes
    },
    isTestMode
  );
}

/**
 * Batch record multiple movements (transaction-like)
 *
 * Records multiple movements in sequence.
 * If any movement fails, returns error.
 *
 * @param movements - Array of movement handler functions
 * @returns Combined movement result
 */
export async function recordBatchMovements(
  movements: Array<() => Promise<MovementResult>>
): Promise<MovementResult> {
  const results: string[] = [];

  for (const movementFn of movements) {
    const result = await movementFn();

    if (!result.success) {
      return {
        success: false,
        error: `Batch failed at movement ${results.length + 1}: ${result.error}`
      };
    }

    if (result.movement_id) {
      results.push(result.movement_id);
    }
  }

  return {
    success: true,
    movement_id: results.join(',')
  };
}
