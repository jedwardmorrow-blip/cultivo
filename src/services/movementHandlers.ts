import { inventoryMovementService } from './inventoryMovement.service';
import type { MovementResult } from '@/types/movement.types';

export async function recordReceipt(
  itemId: string,
  qty: number,
  notes?: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RECEIPT',
    dest_item_id: itemId,
    qty,
    unit: 'g',
    reason_code: 'initial_receipt',
    notes
  });
}

export async function recordConsumption(
  sourceItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking'
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'CONSUME',
    source_item_id: sourceItemId,
    qty,
    unit: 'g',
    reference_id: sessionId,
    reference_type: `${sessionType}_session`
  });
}

export async function recordProduction(
  destItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking'
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'PRODUCE',
    dest_item_id: destItemId,
    qty,
    unit: 'g',
    reference_id: sessionId,
    reference_type: `${sessionType}_session`
  });
}

export async function recordFulfillment(
  sourceItemId: string,
  qty: number,
  orderId: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'FULFILLMENT',
    source_item_id: sourceItemId,
    qty,
    unit: 'g',
    reference_id: orderId,
    reference_type: 'order'
  });
}

export async function recordReturn(
  itemId: string,
  qty: number,
  orderId: string,
  notes?: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RETURN',
    dest_item_id: itemId,
    qty,
    unit: 'g',
    reference_id: orderId,
    reference_type: 'order',
    notes
  });
}

export async function recordReservation(
  sourceItemId: string,
  qty: number,
  orderId: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RESERVE',
    source_item_id: sourceItemId,
    qty,
    unit: 'g',
    reference_id: orderId,
    reference_type: 'order'
  });
}

export async function recordRelease(
  itemId: string,
  qty: number,
  orderId: string,
  notes?: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RELEASE',
    dest_item_id: itemId,
    qty,
    unit: 'g',
    reference_id: orderId,
    reference_type: 'order',
    notes
  });
}

export async function recordAdjustment(
  itemId: string,
  newQty: number,
  reason: string,
  notes?: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'ADJUSTMENT',
    dest_item_id: itemId,
    qty: newQty,
    unit: 'g',
    reason_code: reason,
    reference_type: 'manual_adjustment',
    notes
  });
}

export async function recordReconciliation(
  itemId: string,
  countedQty: number,
  auditId: string,
  varianceReason?: string,
  notes?: string
): Promise<MovementResult> {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RECONCILIATION',
    dest_item_id: itemId,
    qty: countedQty,
    unit: 'g',
    reason_code: varianceReason,
    reference_id: auditId,
    reference_type: 'inventory_audit',
    notes
  });
}

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
