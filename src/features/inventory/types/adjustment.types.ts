/**
 * Inventory Adjustment Types
 *
 * Defines TypeScript types for individual inventory item adjustments.
 * Supports ad-hoc quantity corrections outside of formal audits.
 *
 * @module adjustment.types
 */

import { VarianceReason } from './variance.types';

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Quick Adjustment Request
 *
 * Data required to adjust a single inventory item
 */
export interface QuickAdjustmentRequest {
  inventory_item_id: string;
  new_qty: number;
  variance_reason: VarianceReason;
  notes: string;
}

/**
 * Adjustment Result
 *
 * Result of applying an adjustment
 */
export interface AdjustmentResult {
  success: boolean;
  movement_id?: string;
  variance_log_id?: string;
  old_qty: number;
  new_qty: number;
  variance_qty: number;
  variance_percentage: number;
  error?: string;
}

/**
 * Adjustment Validation Result
 *
 * Result of validating adjustment input
 */
export interface AdjustmentValidationResult {
  isValid: boolean;
  errors: {
    new_qty?: string;
    variance_reason?: string;
    notes?: string;
  };
}

// =====================================================
// UI STATE TYPES
// =====================================================

/**
 * Quick Adjustment Modal State
 *
 * State for the quick adjustment modal
 */
export interface QuickAdjustmentModalState {
  isOpen: boolean;
  inventoryItemId: string | null;

  // Current item data
  currentQty: number;
  packageId: string;
  productName: string;
  strain: string | null;
  batch: string | null;
  stage: string;
  unit: 'g' | 'unit';

  // Input values
  newQty: string;
  varianceReason: VarianceReason | '';
  notes: string;

  // Computed
  varianceQty: number;
  variancePercentage: number;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validation: AdjustmentValidationResult;
}

// =====================================================
// HISTORY TYPES
// =====================================================

/**
 * Adjustment History Entry
 *
 * Historical record of an adjustment
 */
export interface AdjustmentHistoryEntry {
  id: string;
  timestamp: string;
  inventory_item_id: string;
  package_id: string;
  product_name: string;
  old_qty: number;
  new_qty: number;
  variance_qty: number;
  variance_percentage: number;
  variance_reason: VarianceReason;
  notes: string;
  user_id: string;
  user_full_name: string | null;
  movement_id: string;
}

/**
 * Adjustment History Filters
 */
export interface AdjustmentHistoryFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  inventory_stage?: string;
  search?: string;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate adjustment input
 */
export function validateAdjustment(
  newQty: string,
  varianceReason: VarianceReason | '',
  notes: string,
  currentQty: number
): AdjustmentValidationResult {
  const errors: AdjustmentValidationResult['errors'] = {};

  // Validate new quantity
  const qty = parseFloat(newQty);
  if (isNaN(qty)) {
    errors.new_qty = 'Please enter a valid number';
  } else if (qty < 0) {
    errors.new_qty = 'Quantity cannot be negative';
  } else if (qty === currentQty) {
    errors.new_qty = 'New quantity must be different from current quantity';
  }

  // Validate variance reason
  if (!varianceReason) {
    errors.variance_reason = 'Variance reason is required';
  }

  // Validate notes
  if (!notes || notes.trim().length < 10) {
    errors.notes = 'Notes are required (minimum 10 characters)';
  } else if (varianceReason === 'other' && notes.trim().length < 20) {
    errors.notes = 'For "other" reason, please provide detailed notes (minimum 20 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Calculate variance from adjustment
 */
export function calculateVariance(currentQty: number, newQty: number): {
  varianceQty: number;
  variancePercentage: number;
} {
  const varianceQty = newQty - currentQty;
  const variancePercentage = currentQty === 0 ? 0 : ((varianceQty / currentQty) * 100);

  return {
    varianceQty,
    variancePercentage
  };
}

/**
 * Format adjustment summary for display
 */
export function formatAdjustmentSummary(
  currentQty: number,
  newQty: number,
  unit: 'g' | 'unit'
): string {
  const variance = calculateVariance(currentQty, newQty);
  const sign = variance.varianceQty >= 0 ? '+' : '';
  const unitLabel = unit === 'g' ? 'g' : (Math.abs(variance.varianceQty) === 1 ? 'unit' : 'units');

  return `${currentQty}${unit === 'g' ? 'g' : ' units'} → ${newQty}${unit === 'g' ? 'g' : ' units'} (${sign}${variance.varianceQty.toFixed(unit === 'g' ? 1 : 0)}${unit === 'g' ? 'g' : ' ' + unitLabel}, ${sign}${variance.variancePercentage.toFixed(1)}%)`;
}
