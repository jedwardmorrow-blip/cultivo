import type { Database } from '../lib/database/database.types';

// Core batch types from database
export type BatchRegistry = Database['public']['Tables']['batch_registry']['Row'];
export type BatchRegistryInsert = Database['public']['Tables']['batch_registry']['Insert'];
export type BatchRegistryUpdate = Database['public']['Tables']['batch_registry']['Update'];

// Legacy aliases for backward compatibility
export type Batch = BatchRegistry;
export type BatchInsert = BatchRegistryInsert;
export type BatchUpdate = BatchRegistryUpdate;

// Batch stage tracking from database
export type BatchStageTracking = Database['public']['Tables']['batch_stage_tracking']['Row'];
export type BatchStageTrackingInsert = Database['public']['Tables']['batch_stage_tracking']['Insert'];
export type BatchStageTrackingUpdate = Database['public']['Tables']['batch_stage_tracking']['Update'];

// Extended batch stage tracking with computed fields for application use
export interface BatchStageTrackingExtended extends BatchStageTracking {
  available_qty?: number; // Alias for available_weight_grams
  reserved_qty?: number; // For future use
  allocated_qty?: number; // Alias for allocated_weight_grams
  atp_qty?: number; // Available to Promise - computed field
}

// Batch projection for planning
export interface BatchProjection {
  batch_id: string;
  batch_number: string;
  strain: string;
  current_stage: BatchStage;
  projected_yield: number;
  estimated_completion: string;
}

export interface BatchProjectionInput {
  batch_id: string;
  strain?: string; // Optional strain for filtering
  source_stage?: string; // Added for compatibility
  target_stage: BatchStage;
  expected_yield_percentage?: number;
}

export interface BatchProjectionResult {
  batch_id: string;
  projected_output_qty: number;
  projected_weight: number; // Alias for projected_output_qty
  estimated_date: string;
  confidence_level: 'low' | 'medium' | 'high';
}

// Label types
export type LabelType = 'internal' | 'compliance' | 'customer';

// Batch allocation
export interface BatchAllocation {
  id: string;
  batch_id: string;
  order_id: string;
  product_stage_id: string;
  quantity_allocated: number;
  created_at: string;
}

export interface BatchAllocationSummary {
  batch_id: string;
  batch_number: string;
  strain: string;
  total_available: number;
  total_allocated: number;
  total_reserved: number;
  atp: number;
  allocation_percentage: number;
  over_allocation_warning_threshold: number;
  over_allocation_critical_threshold: number;
  stages: BatchStageTrackingExtended[];
}

// Batch with COA status
export interface BatchWithCOAStatus extends BatchRegistry {
  batch_id: string; // Explicit batch_id for clarity
  batch_status: string;
  coa_status: 'active' | 'inactive' | 'pending' | 'none';
  coa_active: boolean;
  coa_url?: string;
  coa_upload_date?: string;
  can_generate_labels: boolean;
  thc_percentage?: number | null;
  cbd_percentage?: number | null;
  pdf_file_path?: string | null;
}

// Batch stage allocation status
export interface BatchStageAllocationStatus {
  batch_id: string;
  stage: BatchStage;
  stage_display_name: string;
  on_hand_qty: number;
  reserved_qty: number;
  allocated_qty: number;
  available_qty: number;
  available_weight_grams: number; // Alias for available_qty
  allocated_weight_grams: number; // Alias for allocated_qty
  over_allocation: number;
  over_allocation_grams: number; // Alias for over_allocation
  stage_allocation_percentage: number;
  is_over_allocated: boolean;
  warning_level: AllocationWarningLevel;
  allocation_warning_level: AllocationWarningLevel; // Alias
  over_allocation_warning_threshold: number;
  over_allocation_critical_threshold: number;
}

// Batch over-allocation check
export interface BatchOverAllocationCheck {
  is_over_allocated: boolean;
  warnings: BatchAllocationWarning[];
  total_over_allocation: number;
}

// Batch COA summary (lightweight version for batch queries)
export interface BatchCOASummary {
  batch_id: string;
  batch_number: string;
  strain: string;
  has_coa: boolean;
  coa_id?: string;
  coa_active?: boolean;
  can_ship: boolean;
}

// Label printing validation for batch COA
export interface BatchLabelValidation {
  can_print: boolean;
  batch_id: string;
  has_active_coa: boolean;
  blocking_reason?: string;
}

// Batch allocation with details
export interface BatchAllocationWithDetails extends BatchAllocation {
  batch_number: string;
  strain: string;
  product_name: string;
  order_number: string;
  customer_name: string;
}

// Input types for creating/updating
export interface CreateBatchInput {
  batch_number: string;
  strain: string;
  strain_id?: string;
  harvest_date?: string;
  room?: string;
  initial_weight_grams?: number;
  notes?: string;
}

export interface UpdateBatchInput {
  strain?: string;
  strain_id?: string;
  harvest_date?: string;
  room?: string;
  status?: string;
  lifecycle_state?: string;
  is_quarantined?: boolean;
  quarantine_reason?: string;
  notes?: string;
}

export interface CreateBatchStageInput {
  batch_id: string;
  stage: BatchStage;
  quantity_grams: number;
}

export interface UpdateBatchStageInput {
  weight_grams?: number;
  allocated_weight_grams?: number;
  location?: string | null;
}

export interface CreateBatchAllocationInput {
  batch_id: string;
  order_id: string;
  product_stage_id: string;
  quantity_allocated: number;
}

export interface UpdateBatchAllocationInput {
  quantity_allocated?: number;
  status?: string;
}

// Batch allocation warning
export interface BatchAllocationWarning {
  batch_id: string;
  batch_number: string;
  strain: string;
  stage: BatchStage;
  stage_display_name: string;
  available_quantity: number;
  allocated_quantity: number;
  over_allocation: number;
  percentage_over: number;
  message: string;
}

// Batch stage enum
export type BatchStage =
  | 'binned'
  | 'bucked'
  | 'bulk'
  | 'packaged'
  | 'smalls'
  | 'trim';

// Allocation warning level
export type AllocationWarningLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'warning';
