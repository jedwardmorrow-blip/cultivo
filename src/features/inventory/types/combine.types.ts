/**
 * Combine Packages Types
 *
 * Type definitions for the inventory package combination feature.
 * Enables combining multiple packages into a single consolidated package.
 */

/**
 * Request to combine multiple inventory packages
 */
export interface CombinePackagesRequest {
  source_package_ids: string[];      // UUIDs of packages to combine
  new_package_id: string;            // Package ID for combined result
  variance_reason?: VarianceReason;  // Reason if qty doesn't match exactly
  notes?: string;                    // Additional notes
}

/**
 * Result of combining packages
 */
export interface CombineResult {
  success: boolean;
  new_package_id: string;
  new_item_id: string;
  combined_qty: number;
  unit: string;
  source_package_count: number;
  expected_qty: number;
  variance_qty: number;
  variance_percentage: number;
  batch_id: string;
  product_id: string;
  strain: string;
  product_name: string;
  error?: string;
  error_detail?: string;
}

/**
 * Validation result for package combination
 */
export interface CombineValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings?: string[];
  can_proceed: boolean;
  summary?: CombineSummary;
}

/**
 * Summary of what will be combined
 */
export interface CombineSummary {
  total_packages: number;
  total_qty: number;
  unit: string;
  batch_number: string;
  product_name: string;
  stage_name: string;
  strain: string;
  packages: CombinePackageSummary[];
}

/**
 * Summary of individual package in combination
 */
export interface CombinePackageSummary {
  id: string;
  package_id: string;
  qty: number;
  unit: string;
}

/**
 * History entry for combine operations
 */
export interface CombineHistoryEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_full_name: string | null;
  new_package_id: string;
  source_package_count: number;
  combined_qty: number;
  expected_qty: number;
  variance_qty: number;
  variance_percentage: number;
  unit: string;
  variance_reason: VarianceReason | null;
  notes: string | null;
  batch_number: string;
  strain: string;
  product_name: string;
  stage_name: string;
}

/**
 * Filters for combine history query
 */
export interface CombineHistoryFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  batch_id?: string;
  strain?: string;
  stage?: string;
  search?: string;  // Search in package IDs or notes
}

/**
 * Variance reason enum for combine operations
 */
export type VarianceReason =
  | 'moisture_loss'
  | 'spillage'
  | 'measurement_error'
  | 'waste'
  | 'theft_loss'
  | 'other';

/**
 * Selected package for combination (UI state)
 */
export interface SelectedPackage {
  id: string;
  package_id: string;
  on_hand_qty: number;
  unit: string;
  batch_id: string;
  batch_number: string;
  product_id: string;
  product_name: string;
  product_stage_id: string;
  stage_name: string;
  strain: string;
}

/**
 * Combine workflow state
 */
export interface CombineWorkflowState {
  step: CombineStep;
  selected_packages: SelectedPackage[];
  new_package_id: string;
  validation: CombineValidationResult | null;
  variance_reason: VarianceReason | null;
  variance_note: string;
  is_loading: boolean;
  error: string | null;
}

/**
 * Steps in combine workflow
 */
export type CombineStep =
  | 'select_packages'    // Select 2+ packages to combine
  | 'generate_id'        // Auto-generate or enter new package ID
  | 'confirm_variance'   // Review and confirm variance if any
  | 'completing'         // Processing combination
  | 'complete';          // Success screen

/**
 * Props for CombinePackagesModal
 */
export interface CombinePackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  preselected_packages?: SelectedPackage[];
}
