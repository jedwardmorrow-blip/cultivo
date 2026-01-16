/**
 * Inventory Variance Types
 *
 * Defines types for tracking and managing inventory variances from audits.
 * Variances represent discrepancies between expected and actual quantities.
 *
 * @module variance.types
 */

import { Database } from '@/lib/database/database.types';

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

/**
 * Variance Log Record
 *
 * Records a variance discovered during an audit or adjustment.
 */
export type VarianceLog = Database['public']['Tables']['inventory_variance_log']['Row'];
export type VarianceLogInsert = Database['public']['Tables']['inventory_variance_log']['Insert'];
export type VarianceLogUpdate = Database['public']['Tables']['inventory_variance_log']['Update'];

// =====================================================
// VARIANCE TYPES & REASONS
// =====================================================

/**
 * Variance Reason Categories
 */
export type VarianceReason =
  | 'shrinkage'
  | 'waste'
  | 'damage'
  | 'theft'
  | 'measurement_error'
  | 'data_entry_error'
  | 'packaging_loss'
  | 'found_inventory'
  | 'other';

/**
 * Variance Severity Levels
 */
export type VarianceSeverity = 'low' | 'medium' | 'high' | 'critical';

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Variance Record Request
 *
 * Data for creating a new variance log entry
 */
export interface VarianceRecordRequest {
  inventory_id: string;
  audit_session_id?: string;
  expected_qty: number;
  actual_qty: number;
  variance_qty: number;
  variance_percentage: number;
  reason: VarianceReason;
  notes?: string;
}

/**
 * Variance Summary
 *
 * Aggregated variance statistics
 */
export interface VarianceSummary {
  total_variances: number;
  total_variance_amount: number;
  average_variance_percentage: number;
  by_reason: Record<VarianceReason, number>;
  by_severity: Record<VarianceSeverity, number>;
}

// =====================================================
// VIEW/EXTENDED TYPES
// =====================================================

/**
 * Variance Record with Details
 *
 * Enhanced variance record with computed fields
 */
export interface VarianceRecord {
  id: string;
  inventory_id: string;
  audit_session_id?: string;
  package_id?: string;
  product_name?: string;
  strain?: string;
  expected_qty: number;
  actual_qty: number;
  variance_qty: number;
  variance_percentage: number;
  reason: VarianceReason;
  notes?: string;
  created_at: string;
  created_by?: string;
}

/**
 * Variance with Severity
 *
 * Variance record with computed severity level
 */
export interface VarianceWithSeverity extends VarianceRecord {
  severity: VarianceSeverity;
  requires_investigation: boolean;
}

// =====================================================
// FILTER & SEARCH TYPES
// =====================================================

/**
 * Variance Log Filters
 */
export interface VarianceLogFilters {
  inventory_id?: string;
  audit_session_id?: string;
  start_date?: string;
  end_date?: string;
  reason?: VarianceReason[];
  severity?: VarianceSeverity[];
  min_variance_percentage?: number;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate variance severity based on percentage
 */
export function calculateVarianceSeverity(variancePercentage: number): VarianceSeverity {
  const abs = Math.abs(variancePercentage);
  if (abs < 1) return 'low';
  if (abs < 3) return 'medium';
  if (abs < 5) return 'high';
  return 'critical';
}

/**
 * Check if variance requires investigation
 */
export function requiresInvestigation(variancePercentage: number): boolean {
  return Math.abs(variancePercentage) >= 5;
}

/**
 * Get color class for variance display
 */
export function getVarianceColor(severity: VarianceSeverity): string {
  switch (severity) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'critical':
      return 'text-red-600';
  }
}
