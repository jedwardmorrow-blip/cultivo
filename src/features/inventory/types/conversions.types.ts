/**
 * Inventory Conversion Management Types
 *
 * Defines TypeScript types for the inventory conversion workflow system.
 * This system manages the transition from completed production sessions
 * to final packaged inventory items, with manager approval and variance tracking.
 *
 * @module conversions.types
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Status of a pending conversion record
 */
export type ConversionStatus =
  | 'pending'      // Awaiting conversion
  | 'converting'   // Currently being converted by a manager
  | 'completed'    // Conversion finished, packages created
  | 'depleted';    // Fully converted, 0g remaining

/**
 * Status of an aggregated conversion lot
 */
export type ConversionLotStatus =
  | 'active'           // Has pending weight/units to convert
  | 'completed_today'  // Fully converted today, visible until midnight
  | 'depleted';        // Historical, no longer shown

/**
 * Finalization status for conversion packages
 * Tracks whether packages have been moved to live inventory
 */
export type FinalizationStatus =
  | 'pending'    // Package created but not yet in inventory
  | 'finalized'  // Package moved to inventory and active
  | 'voided';    // Package cancelled/rejected (audit only)

/**
 * Classification reasons for inventory variance
 * Required for all variance entries
 */
export type VarianceReason =
  | 'moisture_loss'      // Natural moisture evaporation
  | 'spillage'           // Accidental spillage during handling
  | 'measurement_error'  // Scale calibration or reading error
  | 'waste'             // Unusable material (stems, seeds, etc.)
  | 'theft_loss'        // Suspected theft or unexplained loss
  | 'other';            // Other reason (requires note)

/**
 * Human-readable labels for variance reasons
 */
export const VarianceReasonLabels: Record<VarianceReason, string> = {
  moisture_loss: 'Moisture Loss',
  spillage: 'Spillage',
  measurement_error: 'Measurement Error',
  waste: 'Waste',
  theft_loss: 'Theft/Loss',
  other: 'Other'
};

/**
 * Session type that created the pending conversion
 */
export type ConversionSessionType = 'trim' | 'packaging';

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

/**
 * Pending Conversion Record
 *
 * Represents a single session output awaiting conversion.
 * Created automatically when a trim or packaging session completes.
 * Multiple pending conversions are aggregated into conversion lots.
 */
export interface PendingConversion {
  id: string;

  // Session linkage
  session_id: string;
  session_type: ConversionSessionType;

  // Product information
  batch_id: string;
  product_id: string;

  // Weight/unit tracking
  original_weight: number | null;    // For bulk products
  original_units: number | null;     // For packaged products
  remaining_weight: number | null;   // Updated during partial conversions
  remaining_units: number | null;    // Updated during partial conversions

  // Status
  status: ConversionStatus;

  // Audit
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

/**
 * Conversion Lot Record
 *
 * Aggregates multiple pending conversions for the same batch and product.
 * Represents a single line item in the manager's conversion view.
 * Supports partial conversions where only some weight/units are processed.
 */
export interface ConversionLot {
  id: string;

  // Grouping keys
  batch_id: string;
  product_id: string;
  lot_date: string; // ISO date string

  // Aggregated totals
  total_weight: number | null;       // Sum of all pending conversions
  total_units: number | null;        // Sum of all pending conversions
  converted_weight: number | null;   // Already converted
  converted_units: number | null;    // Already converted
  remaining_weight: number | null;   // Still available
  remaining_units: number | null;    // Still available

  // Session tracking
  contributing_session_count: number;

  // Status
  status: ConversionLotStatus;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Conversion Package Record
 *
 * Represents a final package created during conversion.
 * Links back to the conversion lot and maintains traceability
 * to all source sessions that contributed to this package.
 */
export interface ConversionPackage {
  id: string;

  // Linkage
  conversion_lot_id: string | null; // Nullable for new manual finalization workflow
  aggregation_id: string | null;     // Stable ID matching pending_conversion_sessions.aggregation_id
  batch_id: string;
  product_id: string;

  // Package details
  package_id: string;  // Format: YYMMDD-STRAIN-01
  weight: number | null;
  units: number | null;

  // Inventory stage after conversion
  inventory_stage_id: string | null;

  // Traceability
  source_session_ids: string[]; // Array of session IDs

  // Finalization workflow (new)
  finalization_status: FinalizationStatus;
  finalized_at: string | null;
  finalized_by: string | null;

  // Audit
  created_at: string;
  created_by: string;
  packaged_at: string | null;
}

/**
 * Conversion Variance Log Record
 *
 * Tracks differences between expected and actual weights/units.
 * Requires manager acknowledgment and reason classification.
 * Immutable once created - provides audit trail for compliance.
 */
export interface ConversionVariance {
  id: string;

  // Linkage
  conversion_lot_id: string;
  batch_id: string;
  product_id: string;

  // Variance details
  expected_weight: number | null;
  actual_weight: number | null;
  weight_variance: number | null;    // Difference (positive or negative)

  expected_units: number | null;
  actual_units: number | null;
  unit_variance: number | null;

  // Classification (REQUIRED)
  variance_reason: VarianceReason;
  variance_note: string | null;

  // Acknowledgment
  acknowledged: boolean;
  acknowledged_by: string;
  acknowledged_at: string;
}

/**
 * Conversion Lock Record
 *
 * Prevents concurrent conversion of same lot by multiple managers.
 * Uses heartbeat mechanism with 30-minute auto-expiration.
 */
export interface ConversionLock {
  id: string;
  conversion_lot_id: string;
  locked_by: string;
  locked_at: string;
  last_heartbeat: string;
  expires_at: string;
}

// =====================================================
// VIEW TYPES (Enhanced with joins)
// =====================================================

/**
 * Conversion Lot Summary
 *
 * Enhanced view of conversion lot with batch, strain, and product details.
 * Includes lock status and user information.
 * This is the primary data structure for the manager conversion UI.
 */
export interface ConversionLotSummary {
  lot_id: string;

  // Batch details
  batch_id: string;
  batch_name: string;
  strain_name: string;
  strain_code: string;

  // Product details
  product_id: string;
  product_name: string;
  product_type: string;

  // Quantities
  total_weight: number | null;
  total_units: number | null;
  remaining_weight: number | null;
  remaining_units: number | null;

  // Metadata
  contributing_session_count: number;
  status: ConversionLotStatus;

  // Lock status
  is_locked: boolean;
  locked_by_user: string | null;
  locked_by_name: string | null;

  // Finalization status
  has_packages: boolean;           // True if packages have been created
  packages_finalized: boolean;     // True if packages moved to inventory
  package_count: number;           // Number of packages created
}

/**
 * Pending Conversion Detail
 *
 * Enhanced pending conversion with session and product details.
 * Used for displaying contributing sessions in conversion modal.
 */
export interface PendingConversionDetail extends PendingConversion {
  // Session details
  session_completed_at: string | null;
  session_completed_by_name: string | null;

  // Product details
  product_name: string;
  product_type: string;

  // Batch details
  batch_name: string;
  strain_name: string;
}

/**
 * Pending Conversion Session (Aggregated)
 *
 * Represents an aggregated group of completed sessions awaiting finalization.
 * Sessions with the same batch_id + product_id are combined into one row.
 * Returned by pending_conversion_sessions view.
 * Used in manual finalization workflow.
 *
 * NOTE: output_weight and output_units show REMAINING quantities after
 * subtracting already-packaged amounts from conversion_packages table.
 */
export interface PendingConversionSession {
  aggregation_id: string;      // Unique ID for this batch+product combination
  batch_id: string;
  batch_name: string;
  strain_id: string;
  strain_name: string;
  product_id: string | null;   // Null for packaging sessions
  product_name: string;
  session_type: 'trim' | 'packaging' | 'bucking';

  // Aggregated outputs (REMAINING after subtracting packaged amounts)
  output_weight: number | null;
  output_units: number | null;

  // Session aggregation metadata
  session_count: number;       // How many sessions aggregated
  session_ids: string[];       // Array of source session IDs
  first_completed_at: string;  // Earliest completion timestamp
  last_completed_at: string;   // Latest completion timestamp

  finalization_status: FinalizationStatus;
  has_partial_packages: boolean; // True if any packages have been created from this bucket
}

// =====================================================
// UI STATE TYPES
// =====================================================

/**
 * Package being created during conversion
 * Used in the conversion workflow UI
 */
export interface PackageInProgress {
  temp_id: string;        // Temporary ID for React key
  package_id: string;     // Generated package ID
  weight: number | null;  // For bulk products
  units: number | null;   // For packaged products
}

/**
 * Conversion workflow state
 * Manages the entire conversion process in the UI
 */
export interface ConversionWorkflowState {
  // Current lot being converted
  lot: ConversionLotSummary | null;

  // Contributing sessions (for reference display)
  contributingSessions: PendingConversionDetail[];

  // Packages being created
  packages: PackageInProgress[];

  // Running totals
  allocatedWeight: number;
  allocatedUnits: number;
  remainingWeight: number;
  remainingUnits: number;

  // Variance tracking
  hasVariance: boolean;
  varianceAmount: number;
  varianceReason: VarianceReason | null;
  varianceNote: string;
  varianceAcknowledged: boolean;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Lock state
  lockId: string | null;
  heartbeatInterval: NodeJS.Timeout | null;
}

/**
 * Package creation input for API calls
 */
export interface CreatePackageInput {
  package_id: string;
  weight?: number;
  units?: number;
}

/**
 * Complete conversion request payload
 */
export interface CompleteConversionRequest {
  conversion_lot_id: string;
  packages: CreatePackageInput[];
  variance?: {
    expected_weight?: number;
    actual_weight?: number;
    expected_units?: number;
    actual_units?: number;
    variance_reason: VarianceReason;
    variance_note?: string;
  };
}

/**
 * Packaged product confirmation input
 * For products that are counted in units (3.5g, 14g, 454g)
 */
export interface PackagedProductConfirmation {
  conversion_lot_id: string;
  expected_units: number;
  actual_units: number;
  package_id: string; // Single package ID for all units
  variance_reason?: VarianceReason;
  variance_note?: string;
}

/**
 * Consolidation options for conversion workflow
 * Allows manager to consolidate multiple session outputs into a single package
 */
export interface ConversionPackageOptions {
  consolidate: boolean;
  packages?: CreatePackageInput[];        // For individual packages (existing flow)
  consolidated?: {                        // For single consolidated package (new flow)
    package_id: string;
    weight?: number;
    units?: number;
    variance_reason?: VarianceReason;
    variance_notes?: string;
  };
}

/**
 * Consolidated package creation input
 * Used when manager wants to consolidate all session outputs into one package
 */
export interface ConsolidatedPackageInput {
  conversion_lot_id: string;
  package_id: string;
  weight?: number;           // For bulk products
  units?: number;            // For packaged products
  variance_reason?: VarianceReason;
  variance_notes?: string;
}

/**
 * Result from finalizing conversion packages to live inventory
 * Returns created inventory items and movements for audit trail
 */
export interface FinalizeConversionResult {
  success: boolean;
  inventory_items: string[];  // Created inventory item IDs
  movements: string[];        // Created movement IDs
  error?: string;
  lot_id?: string;            // Optional for backward compatibility
  packages_finalized: number;
}

/**
 * Input for voiding a conversion package
 * Used when manager rejects/cancels a pending package
 */
export interface VoidConversionInput {
  package_id: string;
  void_reason: string;        // Required explanation
  void_note?: string;         // Optional additional details
}

// =====================================================
// FILTER & SEARCH TYPES
// =====================================================

/**
 * Filters for conversion lot list
 */
export interface ConversionLotFilters {
  date?: string;              // ISO date string
  batch_id?: string;
  product_id?: string;
  strain_id?: string;
  status?: ConversionLotStatus[];
  search?: string;            // Search across batch/strain/product names
}

/**
 * Sort options for conversion lots
 */
export type ConversionLotSortField =
  | 'batch_name'
  | 'strain_name'
  | 'product_name'
  | 'total_weight'
  | 'total_units'
  | 'contributing_session_count'
  | 'status';

export interface ConversionLotSort {
  field: ConversionLotSortField;
  direction: 'asc' | 'desc';
}

// =====================================================
// STATISTICS TYPES
// =====================================================

/**
 * Summary statistics for conversion dashboard
 */
export interface ConversionStatistics {
  // Pending conversions
  pending_lot_count: number;
  pending_total_weight: number;
  pending_total_units: number;

  // Completed today
  completed_today_count: number;
  completed_today_weight: number;
  completed_today_units: number;

  // Variance tracking
  total_variance_today: number;
  variance_by_reason: Record<VarianceReason, number>;

  // Oldest pending
  oldest_pending_age_hours: number | null;
  oldest_pending_lot: ConversionLotSummary | null;
}

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * Conversion-specific error types
 */
export type ConversionErrorType =
  | 'lot_locked'              // Lot is locked by another user
  | 'invalid_weights'         // Weights don't add up correctly
  | 'variance_too_high'       // Variance exceeds acceptable threshold
  | 'missing_variance_reason' // Variance reason not provided
  | 'invalid_package_id'      // Package ID format invalid
  | 'duplicate_package_id'    // Package ID already exists
  | 'lot_depleted'           // No remaining weight/units to convert
  | 'concurrent_modification' // Lot was modified by another user
  | 'lock_expired';          // Lock expired during conversion

export interface ConversionError {
  type: ConversionErrorType;
  message: string;
  details?: Record<string, any>;
}

/**
 * Type guard to check if result is a ConversionError
 */
export function isConversionError(
  result: ConversionLock | ConversionError
): result is ConversionError {
  return 'type' in result && 'message' in result && !('id' in result);
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Type guard to check if product is bulk (weight-based)
 */
export function isBulkProduct(lot: ConversionLotSummary): boolean {
  return lot.total_weight !== null;
}

/**
 * Type guard to check if product is packaged (unit-based)
 */
export function isPackagedProduct(lot: ConversionLotSummary): boolean {
  return lot.total_units !== null;
}

/**
 * Calculate variance percentage
 */
export function calculateVariancePercentage(
  expected: number,
  actual: number
): number {
  if (expected === 0) return 0;
  return ((actual - expected) / expected) * 100;
}

/**
 * Format package ID
 */
export function formatPackageId(
  date: Date,
  strainCode: string,
  sequence: number
): string {
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const seq = sequence.toString().padStart(2, '0');

  return `${yy}${mm}${dd}-${strainCode}-${seq}`;
}

/**
 * Variance severity levels
 */
export type VarianceSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Get variance severity based on percentage
 */
export function getVarianceSeverity(percentage: number): VarianceSeverity {
  const abs = Math.abs(percentage);
  if (abs < 1) return 'low';
  if (abs < 3) return 'medium';
  if (abs < 5) return 'high';
  return 'critical';
}

/**
 * Get color class for variance severity
 */
export function getVarianceColorClass(severity: VarianceSeverity): string {
  switch (severity) {
    case 'low':
      return 'text-green-600 bg-green-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'high':
      return 'text-orange-600 bg-orange-50';
    case 'critical':
      return 'text-red-600 bg-red-50';
  }
}
