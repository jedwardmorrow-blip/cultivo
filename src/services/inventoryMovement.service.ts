import { supabase } from '@/lib/supabase';
import type {
  InventoryMovement,
  CreateMovementPayload,
  MovementResult,
  MovementValidationResult,
  MovementHistoryOptions,
  MovementStats,
  MovementKind
} from '@/types/movement.types';

/**
 * Inventory Movement Service
 *
 * Centralized service for recording all inventory movements.
 * Implements the event-driven ledger pattern where all inventory changes
 * flow through immutable movement records.
 *
 * @see docs/EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md
 * @see docs/INVENTORY-TRACKING.md
 *
 * @example
 * ```typescript
 * // Record a production movement
 * const result = await inventoryMovementService.recordMovement({
 *   movement_kind: 'PRODUCE',
 *   dest_item_id: 'item-123',
 *   qty: 1000,
 *   unit: 'g',
 *   reference_id: 'session-456',
 *   reference_type: 'packaging_session'
 * });
 * ```
 */
class InventoryMovementService {
  /**
   * Record an inventory movement
   *
   * Validates the movement, inserts into ledger, and returns result.
   * In the future, triggers will automatically update inventory_items.on_hand_qty.
   *
   * @param payload - Movement data
   * @returns Movement result with ID or error
   */
  async recordMovement(
    payload: CreateMovementPayload
  ): Promise<MovementResult> {
    try {
      const validation = this.validateMovement(payload);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Insert movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          movement_kind: payload.movement_kind,
          source_item_id: payload.source_item_id || null,
          dest_item_id: payload.dest_item_id || null,
          qty: payload.qty,
          unit: payload.unit,
          reason_code: payload.reason_code || null,
          reference_id: payload.reference_id || null,
          reference_type: payload.reference_type || null,
          notes: payload.notes || null
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        movement_id: data.id
      };
    } catch (error) {
      console.error('Failed to record movement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate movement before recording
   *
   * Ensures required fields are present based on movement kind.
   *
   * @param payload - Movement data
   * @returns Validation result
   */
  validateMovement(payload: CreateMovementPayload): MovementValidationResult {
    // CONSUME, FULFILLMENT, RESERVE require source_item_id
    if (['CONSUME', 'FULFILLMENT', 'RESERVE'].includes(payload.movement_kind)) {
      if (!payload.source_item_id) {
        return {
          valid: false,
          error: `${payload.movement_kind} requires source_item_id`
        };
      }
    }

    // RECEIPT, PRODUCE, RETURN, RELEASE, ADJUSTMENT, RECONCILIATION require dest_item_id
    if (
      ['RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION'].includes(
        payload.movement_kind
      )
    ) {
      if (!payload.dest_item_id) {
        return {
          valid: false,
          error: `${payload.movement_kind} requires dest_item_id`
        };
      }
    }

    // Quantity must be positive
    if (payload.qty <= 0) {
      return {
        valid: false,
        error: 'Movement quantity must be positive'
      };
    }

    // Unit is required
    if (!payload.unit) {
      return {
        valid: false,
        error: 'Unit is required'
      };
    }

    return { valid: true };
  }

  /**
   * Get movement history for an inventory item
   *
   * @param itemId - Inventory item ID
   * @param options - Query options
   * @returns Array of movements
   */
  async getMovementHistory(
    itemId: string,
    options: MovementHistoryOptions = {}
  ): Promise<InventoryMovement[]> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .or(`source_item_id.eq.${itemId},dest_item_id.eq.${itemId}`)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.movement_kind) {
        query = query.eq('movement_kind', options.movement_kind);
      }

      if (options.start_date) {
        query = query.gte('created_at', options.start_date.toISOString());
      }

      if (options.end_date) {
        query = query.lte('created_at', options.end_date.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to fetch movement history:', error);
      return [];
    }
  }

  /**
   * Calculate current on_hand_qty from movements
   *
   * Used for reconciliation and verification.
   * Replays all movements to calculate current quantity.
   *
   * @param itemId - Inventory item ID
   * @returns Calculated on_hand quantity
   */
  async calculateOnHandFromMovements(itemId: string): Promise<number> {
    const movements = await this.getMovementHistory(itemId, { limit: 10000 });

    let total = 0;
    let lastAbsolute = 0;

    // Process movements in chronological order (oldest first)
    const chronological = [...movements].reverse();

    for (const movement of chronological) {
      switch (movement.movement_kind) {
        case 'ADJUSTMENT':
        case 'RECONCILIATION':
          // Absolute values - set to qty directly
          lastAbsolute = movement.qty;
          total = lastAbsolute;
          break;

        case 'RECEIPT':
        case 'PRODUCE':
        case 'RETURN':
        case 'RELEASE':
          // Increment movements
          if (movement.dest_item_id === itemId) {
            total += movement.qty;
          }
          break;

        case 'CONSUME':
        case 'FULFILLMENT':
        case 'RESERVE':
          // Decrement movements
          if (movement.source_item_id === itemId) {
            total -= movement.qty;
          }
          break;
      }
    }

    return Math.max(0, total); // Ensure non-negative
  }

  /**
   * Get movement statistics
   *
   * @param itemId - Optional inventory item ID
   * @param days - Number of days to include
   * @returns Movement statistics
   */
  async getMovementStats(itemId?: string, days: number = 30): Promise<MovementStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('inventory_movements')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (itemId) {
        query = query.or(`source_item_id.eq.${itemId},dest_item_id.eq.${itemId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const movements = data || [];

      // Calculate statistics
      const by_kind = this.groupByKind(movements);
      const by_day = this.groupByDay(movements);

      return {
        total_movements: movements.length,
        by_kind,
        by_day
      };
    } catch (error) {
      console.error('Failed to fetch movement stats:', error);
      return {
        total_movements: 0,
        by_kind: [],
        by_day: []
      };
    }
  }

  /**
   * Verify inventory item quantity matches ledger
   *
   * Compares current on_hand_qty with calculated quantity from movements.
   *
   * @param itemId - Inventory item ID
   * @returns Discrepancy (positive = more in ledger, negative = less in ledger)
   */
  async verifyInventoryQuantity(itemId: string): Promise<{
    current_qty: number;
    ledger_qty: number;
    discrepancy: number;
    matches: boolean;
  }> {
    try {
      // Get current on_hand_qty
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('on_hand_qty')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      const current_qty = item.on_hand_qty || 0;

      // Calculate from movements
      const ledger_qty = await this.calculateOnHandFromMovements(itemId);

      const discrepancy = ledger_qty - current_qty;

      return {
        current_qty,
        ledger_qty,
        discrepancy,
        matches: Math.abs(discrepancy) < 0.01 // Allow for floating point errors
      };
    } catch (error) {
      console.error('Failed to verify inventory quantity:', error);
      throw error;
    }
  }

  // Helper methods

  private groupByKind(movements: InventoryMovement[]): Array<{
    movement_kind: MovementKind;
    count: number;
    total_qty: number;
  }> {
    const grouped = movements.reduce((acc, movement) => {
      const kind = movement.movement_kind;
      if (!acc[kind]) {
        acc[kind] = { count: 0, total_qty: 0 };
      }
      acc[kind].count += 1;
      acc[kind].total_qty += movement.qty;
      return acc;
    }, {} as Record<MovementKind, { count: number; total_qty: number }>);

    return Object.entries(grouped)
      .map(([kind, stats]) => ({
        movement_kind: kind as MovementKind,
        ...stats
      }))
      .sort((a, b) => b.count - a.count);
  }

  private groupByDay(movements: InventoryMovement[]): Array<{
    date: string;
    count: number;
    total_qty: number;
  }> {
    const grouped = movements.reduce((acc, movement) => {
      const date = movement.created_at?.split('T')[0] || 'unknown';
      if (!acc[date]) {
        acc[date] = { count: 0, total_qty: 0 };
      }
      acc[date].count += 1;
      acc[date].total_qty += movement.qty;
      return acc;
    }, {} as Record<string, { count: number; total_qty: number }>);

    return Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        ...stats
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const inventoryMovementService = new InventoryMovementService();
