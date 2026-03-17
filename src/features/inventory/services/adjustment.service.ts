/**
 * Inventory Adjustment Service
 *
 * Backend service for individual inventory item adjustments.
 * Handles ad-hoc quantity corrections with proper variance tracking.
 *
 * @module adjustment.service
 */

import { supabase } from '@/lib/supabase';
import type {
  QuickAdjustmentRequest,
  AdjustmentResult,
  AdjustmentHistoryEntry,
  AdjustmentHistoryFilters
} from '../types/adjustment.types';
import type { ProductStageRelation, UserRelation } from '@/types';
import { logVariance } from './varianceLog.service';
import { inventoryMovementService } from '@/services';

// =====================================================
// ADJUSTMENT OPERATIONS
// =====================================================

/**
 * Adjust inventory item quantity
 *
 * Creates ADJUSTMENT movement, updates on_hand_qty, and logs variance.
 */
export async function adjustInventoryItem(
  request: QuickAdjustmentRequest,
  _userId: string
): Promise<AdjustmentResult> {
  try {
    const { inventory_item_id, new_qty, variance_reason, notes } = request;

    // Step 1: Fetch current item state
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        package_id,
        product_name,
        strain,
        batch,
        on_hand_qty,
        unit,
        product_stage_id,
        product_stages!inner(name)
      `)
      .eq('id', inventory_item_id)
      .single();

    if (itemError) throw itemError;
    if (!item) throw new Error('Inventory item not found');

    const oldQty = item.on_hand_qty || 0;

    // Validate new quantity
    if (new_qty < 0) {
      throw new Error('New quantity cannot be negative');
    }

    if (new_qty === oldQty) {
      throw new Error('New quantity must be different from current quantity');
    }

    // Calculate variance
    const varianceQty = new_qty - oldQty;
    const variancePercentage = oldQty === 0 ? 0 : ((varianceQty / oldQty) * 100);

    // Step 2: Create ADJUSTMENT movement
    const movementResult = await inventoryMovementService.recordMovement({
      dest_item_id: inventory_item_id,
      movement_kind: 'ADJUSTMENT',
      qty: new_qty,
      unit: item.unit,
      reason_code: variance_reason,
      notes: `Manual adjustment: ${notes}`,
    });

    if (!movementResult.success || !movementResult.movement_id) {
      throw new Error(movementResult.error || 'Failed to create movement');
    }

    const movement = { id: movementResult.movement_id };

    // Step 3: Log variance (non-blocking — adjustment already applied)
    let varianceLogId: string | undefined;
    if (Math.abs(varianceQty) > 0) {
      try {
        const itemWithStage = item as typeof item & { product_stages: ProductStageRelation };
      const varianceEntry = await logVariance({
          source_type: 'manual_adjustment',
          source_id: movement.id,
          inventory_item_id: inventory_item_id,
          package_id: item.package_id,
          expected_qty: oldQty,
          actual_qty: new_qty,
          variance_qty: varianceQty,
          variance_percentage: variancePercentage,
          unit: item.unit,
          variance_reason: variance_reason,
          notes: notes,
          inventory_stage: itemWithStage.product_stages.name,
          strain: item.strain,
          batch: item.batch,
          product_name: item.product_name,
          movement_id: movement.id
        });

        varianceLogId = varianceEntry.id;
      } catch (varianceError) {
        // Variance logging failed but the adjustment itself succeeded.
        // Log the error but don't block the success response.
        console.error('Variance log failed (adjustment still applied):', varianceError);
      }
    }

    // Note: on_hand_qty is updated automatically by the inventory_movements trigger

    return {
      success: true,
      movement_id: movement.id,
      variance_log_id: varianceLogId,
      old_qty: oldQty,
      new_qty: new_qty,
      variance_qty: varianceQty,
      variance_percentage: variancePercentage
    };
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error';
    return {
      success: false,
      old_qty: 0,
      new_qty: 0,
      variance_qty: 0,
      variance_percentage: 0,
      error: message
    };
  }
}

/**
 * Validate adjustment before applying
 *
 * Checks permissions, item state, and validates input
 */
export async function validateAdjustment(
  inventoryItemId: string,
  newQty: number,
  userId: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Check user has manager or admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      errors.push('Unable to verify user permissions');
    } else if (!profile.is_active) {
      errors.push('User account is inactive');
    } else if (profile.role !== 'manager' && profile.role !== 'admin') {
      errors.push('Only managers and admins can adjust inventory');
    }

    // Check item exists and is not locked
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, on_hand_qty, product_stage_id')
      .eq('id', inventoryItemId)
      .single();

    if (itemError || !item) {
      errors.push('Inventory item not found');
    } else {
      // Check if item's stage is locked by an audit
      const { data: stageData } = await supabase
        .from('product_stages')
        .select('name')
        .eq('id', item.product_stage_id)
        .single();

      if (stageData) {
        const { data: lockData } = await supabase
          .rpc('fn_check_stage_locked', {
            stages: [stageData.name]
          });

        const lockResult = Array.isArray(lockData) ? lockData[0] : lockData;
        if (lockResult?.is_locked) {
          errors.push(`Cannot adjust: stage is locked by audit ${lockResult.audit_number}`);
        }
      }

      // Validate quantity
      if (newQty < 0) {
        errors.push('Quantity cannot be negative');
      }

      if (newQty === item.on_hand_qty) {
        errors.push('New quantity must be different from current quantity');
      }
    }
  } catch (error) {
    errors.push('Validation check failed');
    console.error('Validation error:', error);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// =====================================================
// ADJUSTMENT HISTORY
// =====================================================

/**
 * Get adjustment history with filters
 */
export async function getAdjustmentHistory(
  filters: AdjustmentHistoryFilters = {},
  limit = 100,
  offset = 0
): Promise<AdjustmentHistoryEntry[]> {
  try {
    // Build query for adjustments from variance_log
    let query = supabase
      .from('variance_log')
      .select(`
        id,
        timestamp,
        inventory_item_id,
        package_id,
        product_name,
        expected_qty,
        actual_qty,
        variance_qty,
        variance_percentage,
        variance_reason,
        notes,
        user_id,
        movement_id,
        user:user_profiles(full_name)
      `)
      .eq('source_type', 'manual_adjustment')
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date);
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.inventory_stage) {
      query = query.eq('inventory_stage', filters.inventory_stage);
    }

    if (filters.search) {
      query = query.or(`package_id.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    // Transform to adjustment history format
    return (data || []).map(entry => {
      const entryWithUser = entry as typeof entry & { user: UserRelation | null };
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        inventory_item_id: entry.inventory_item_id || '',
        package_id: entry.package_id,
        product_name: entry.product_name || '',
        old_qty: entry.expected_qty,
        new_qty: entry.actual_qty,
        variance_qty: entry.variance_qty,
        variance_percentage: entry.variance_percentage,
        variance_reason: entry.variance_reason,
        notes: entry.notes || '',
        user_id: entry.user_id || '',
        user_full_name: entryWithUser.user?.full_name || null,
        movement_id: entry.movement_id || ''
      };
    });
  } catch (error) {
    console.error('Error fetching adjustment history:', error);
    throw new Error(`Failed to fetch adjustment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get adjustment count for pagination
 */
export async function getAdjustmentCount(
  filters: AdjustmentHistoryFilters = {}
): Promise<number> {
  try {
    let query = supabase
      .from('variance_log')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', 'manual_adjustment');

    if (filters.start_date) query = query.gte('timestamp', filters.start_date);
    if (filters.end_date) query = query.lte('timestamp', filters.end_date);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.inventory_stage) query = query.eq('inventory_stage', filters.inventory_stage);
    if (filters.search) {
      query = query.or(`package_id.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting adjustment count:', error);
    return 0;
  }
}

/**
 * Get recent adjustments by user
 */
export async function getRecentAdjustmentsByUser(
  userId: string,
  limit = 10
): Promise<AdjustmentHistoryEntry[]> {
  return getAdjustmentHistory(
    { user_id: userId },
    limit,
    0
  );
}

/**
 * Get adjustments for specific inventory item
 */
export async function getAdjustmentsForItem(
  inventoryItemId: string
): Promise<AdjustmentHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('variance_log')
      .select(`
        id,
        timestamp,
        inventory_item_id,
        package_id,
        product_name,
        expected_qty,
        actual_qty,
        variance_qty,
        variance_percentage,
        variance_reason,
        notes,
        user_id,
        movement_id,
        user:user_profiles(full_name)
      `)
      .eq('source_type', 'manual_adjustment')
      .eq('inventory_item_id', inventoryItemId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => {
      const entryWithUser = entry as typeof entry & { user: UserRelation | null };
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        inventory_item_id: entry.inventory_item_id || '',
        package_id: entry.package_id,
        product_name: entry.product_name || '',
        old_qty: entry.expected_qty,
        new_qty: entry.actual_qty,
        variance_qty: entry.variance_qty,
        variance_percentage: entry.variance_percentage,
        variance_reason: entry.variance_reason,
        notes: entry.notes || '',
        user_id: entry.user_id || '',
        user_full_name: entryWithUser.user?.full_name || null,
        movement_id: entry.movement_id || ''
      };
    });
  } catch (error) {
    console.error('Error fetching adjustments for item:', error);
    throw new Error(`Failed to fetch adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
