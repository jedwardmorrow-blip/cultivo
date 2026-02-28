import type { VarianceReason } from './variance.types';

export interface RebalanceRequest {
  source_item_id: string;
  dest_item_id: string;
  transfer_qty: number;
  reason_code: VarianceReason;
  notes?: string;
}

export interface RebalanceResult {
  success: boolean;
  source_movement_id?: string;
  dest_movement_id?: string;
  variance_log_id?: string;
  source_before: number;
  source_after: number;
  dest_before: number;
  dest_after: number;
  transfer_qty: number;
  unit: string;
  error?: string;
}

export interface RebalanceValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
