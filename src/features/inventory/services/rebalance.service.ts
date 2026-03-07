import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '../types';
import type { RebalanceRequest, RebalanceResult, RebalanceValidation } from '../types/rebalance.types';

export async function validateRebalance(
  sourceItem: InventoryItem,
  destItem: InventoryItem,
  amount: number
): Promise<RebalanceValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (sourceItem.id === destItem.id) {
    errors.push('Source and destination must be different items');
  }

  if (amount <= 0) {
    errors.push('Transfer amount must be greater than zero');
  }

  if (amount > (sourceItem.on_hand_qty || 0)) {
    errors.push(`Transfer amount (${amount}) exceeds source quantity (${sourceItem.on_hand_qty || 0})`);
  }

  const sourceUnit = sourceItem.unit || 'g';
  const destUnit = destItem.unit || 'g';
  if (sourceUnit !== destUnit) {
    errors.push(`Unit mismatch: source is ${sourceUnit}, destination is ${destUnit}`);
  }

  if (errors.length === 0 && amount > (sourceItem.on_hand_qty || 0) * 0.5) {
    warnings.push(`Transferring more than 50% of the source quantity`);
  }

  return { is_valid: errors.length === 0, errors, warnings };
}

export async function executeRebalance(request: RebalanceRequest): Promise<RebalanceResult> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      return { success: false, error: 'User not authenticated', source_before: 0, source_after: 0, dest_before: 0, dest_after: 0, transfer_qty: 0, unit: '' };
    }

    const { data, error } = await supabase.rpc('fn_rebalance_inventory_weight', {
      p_source_item_id: request.source_item_id,
      p_dest_item_id: request.dest_item_id,
      p_transfer_qty: request.transfer_qty,
      p_user_id: userId,
      p_reason_code: request.reason_code,
      p_notes: request.notes || null,
    });

    if (error) {
      throw new Error(`Rebalance failed: ${error.message}`);
    }

    return {
      success: data?.success || false,
      source_movement_id: data?.source_movement_id,
      dest_movement_id: data?.dest_movement_id,
      variance_log_id: data?.variance_log_id,
      source_before: data?.source_before || 0,
      source_after: data?.source_after || 0,
      dest_before: data?.dest_before || 0,
      dest_after: data?.dest_after || 0,
      transfer_qty: data?.transfer_qty || 0,
      unit: data?.unit || '',
      error: data?.error,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      source_before: 0,
      source_after: 0,
      dest_before: 0,
      dest_after: 0,
      transfer_qty: 0,
      unit: '',
    };
  }
}
