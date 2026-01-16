import { useCallback } from 'react';
import { useTestMode } from '@/contexts/TestModeContext';

/**
 * Hook for validation with test mode bypass support
 *
 * Provides utilities to validate operations with automatic test mode bypass
 * and audit trail logging.
 *
 * @example
 * ```tsx
 * function OrderForm() {
 *   const { validateWithBypass } = useTestModeValidation();
 *
 *   const handleSubmit = async () => {
 *     const result = await validateWithBypass(
 *       'create_order',
 *       'inventory_availability',
 *       async () => {
 *         // Normal validation logic
 *         if (availableQty < requestedQty) {
 *           return {
 *             valid: false,
 *             error: 'Insufficient inventory'
 *           };
 *         }
 *         return { valid: true };
 *       },
 *       { product: 'GSC 3.5g', requested: 100, available: 10 }
 *     );
 *
 *     if (result.valid) {
 *       // Proceed with order creation
 *     }
 *   };
 * }
 * ```
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  bypassed?: boolean;
}

export function useTestModeValidation() {
  const { isTestMode, logBypass } = useTestMode();

  /**
   * Validate with automatic test mode bypass
   *
   * @param action - Action being performed (e.g., 'create_order', 'mark_ready')
   * @param validation - Validation being bypassed (e.g., 'inventory_check', 'batch_allocation')
   * @param validator - Function that performs normal validation
   * @param context - Additional context for audit log
   * @returns Validation result
   */
  const validateWithBypass = useCallback(
    async (
      action: string,
      validation: string,
      validator: () => Promise<ValidationResult> | ValidationResult,
      context?: Record<string, unknown>
    ): Promise<ValidationResult> => {
      // If test mode is enabled, bypass validation
      if (isTestMode) {
        // Log the bypass
        await logBypass(action, validation, {
          ...context,
          message: `Test mode: Bypassed ${validation}`
        });

        return {
          valid: true,
          bypassed: true
        };
      }

      // Normal validation in production mode
      try {
        const result = await validator();
        return result;
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Validation failed'
        };
      }
    },
    [isTestMode, logBypass]
  );

  /**
   * Validate inventory availability with test mode bypass
   *
   * Convenience method for common inventory validation
   */
  const validateInventoryAvailable = useCallback(
    async (
      productId: string,
      productName: string,
      requestedQty: number,
      availableQty: number
    ): Promise<ValidationResult> => {
      return validateWithBypass(
        'check_inventory',
        'on_hand_quantity_check',
        () => {
          if (availableQty < requestedQty) {
            return {
              valid: false,
              error: `Insufficient inventory for ${productName}: ${availableQty}g available, ${requestedQty}g requested`
            };
          }
          return { valid: true };
        },
        {
          product_id: productId,
          product_name: productName,
          requested_qty: requestedQty,
          available_qty: availableQty
        }
      );
    },
    [validateWithBypass]
  );

  /**
   * Validate batch allocation with test mode bypass
   *
   * Convenience method for batch allocation validation
   */
  const validateBatchAllocation = useCallback(
    async (
      orderId: string,
      hasAllocations: boolean
    ): Promise<ValidationResult> => {
      return validateWithBypass(
        'mark_ready_for_delivery',
        'batch_allocation_required',
        () => {
          if (!hasAllocations) {
            return {
              valid: false,
              error: 'Order must have batch allocations before marking ready for delivery'
            };
          }
          return { valid: true };
        },
        {
          order_id: orderId,
          has_allocations: hasAllocations
        }
      );
    },
    [validateWithBypass]
  );

  return {
    isTestMode,
    validateWithBypass,
    validateInventoryAvailable,
    validateBatchAllocation
  };
}
