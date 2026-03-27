import { supabase } from '@/lib/supabase';
import type {
  BatchRegistry,
  BatchStageTracking,
  BatchProjection,
  BatchAllocation,
  BatchAllocationSummary,
  BatchWithCOAStatus,
  BatchStageAllocationStatus,
  BatchOverAllocationCheck,
  BatchCOASummary,
  BatchLabelValidation,
  BatchAllocationWithDetails,
  CreateBatchInput,
  UpdateBatchInput,
  CreateBatchStageInput,
  UpdateBatchStageInput,
  CreateBatchAllocationInput,
  UpdateBatchAllocationInput,
  BatchProjectionInput,
  BatchProjectionResult,
  BatchAllocationWarning,
  BatchStage
} from '@/types/batch.types';
import type { Database } from '@/lib/database/database.types';

type LabelType = Database['public']['Tables']['label_types']['Row'];

/**
 * Fetches all batch records
 *
 * @returns Promise<BatchRegistry[]> - All batches ordered by creation date (newest first)
 */
export async function fetchAllBatches(): Promise<BatchRegistry[]> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetches active batch records
 *
 * @returns Promise<BatchRegistry[]> - Active batches ordered by batch number
 */
export async function fetchActiveBatches(): Promise<BatchRegistry[]> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('*')
    .eq('status', 'active')
    .order('batch_number');

  if (error) throw error;
  return data || [];
}

/**
 * Fetches a single batch by UUID
 *
 * @param id - Batch UUID
 * @returns Promise<BatchRegistry | null> - Batch record or null
 */
export async function fetchBatchById(id: string): Promise<BatchRegistry | null> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetches a batch by batch number
 *
 * @param batchNumber - Batch number (e.g., "240515")
 * @returns Promise<BatchRegistry | null> - Batch record or null
 */
export async function fetchBatchByNumber(batchNumber: string): Promise<BatchRegistry | null> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('*')
    .eq('batch_number', batchNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a new batch record
 *
 * @param input - Batch creation data
 * @returns Promise<BatchRegistry> - Created batch record
 * @note initial_weight_grams is optional - may be added later during bucking
 */
export async function createBatch(input: CreateBatchInput): Promise<BatchRegistry> {
  const { data, error } = await supabase
    .from('batch_registry')
    .insert({
      ...input,
      status: 'active',
      lifecycle_state: 'clone'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing batch record
 *
 * @param id - Batch UUID
 * @param input - Fields to update
 * @returns Promise<BatchRegistry> - Updated batch record
 */
export async function updateBatch(id: string, input: UpdateBatchInput): Promise<BatchRegistry> {
  const { data, error } = await supabase
    .from('batch_registry')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a batch record
 *
 * @param id - Batch UUID
 * @returns Promise<void>
 */
export async function deleteBatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('batch_registry')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetches all stage tracking records for a batch
 *
 * @param batchId - Batch UUID
 * @returns Promise<BatchStageTracking[]> - Stage tracking records ordered by stage
 */
export async function fetchBatchStageTracking(batchId: string): Promise<BatchStageTracking[]> {
  const { data, error} = await supabase
    .from('batch_stage_tracking')
    .select('*')
    .eq('batch_id', batchId)
    .order('stage');

  if (error) throw error;
  return data || [];
}

/**
 * Fetches a specific stage tracking record for a batch
 *
 * @param batchId - Batch UUID
 * @param stage - Stage name (e.g., 'bulk', 'packaged')
 * @returns Promise<BatchStageTracking | null> - Stage record or null
 */
export async function fetchBatchStageByStage(
  batchId: string,
  stage: BatchStage
): Promise<BatchStageTracking | null> {
  const { data, error } = await supabase
    .from('batch_stage_tracking')
    .select('*')
    .eq('batch_id', batchId)
    .eq('stage', stage)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a new batch stage tracking record
 *
 * @param input - Stage tracking data
 * @returns Promise<BatchStageTracking> - Created stage record
 */
export async function createBatchStage(input: CreateBatchStageInput): Promise<BatchStageTracking> {
  const { data, error } = await supabase
    .from('batch_stage_tracking')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a batch stage tracking record
 *
 * @param batchId - Batch UUID
 * @param stage - Stage name
 * @param input - Fields to update
 * @returns Promise<BatchStageTracking> - Updated stage record
 */
export async function updateBatchStage(
  batchId: string,
  stage: BatchStage,
  input: UpdateBatchStageInput
): Promise<BatchStageTracking> {
  const { data, error } = await supabase
    .from('batch_stage_tracking')
    .update(input)
    .eq('batch_id', batchId)
    .eq('stage', stage)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates or updates a batch stage tracking record
 *
 * @param input - Stage tracking data
 * @returns Promise<BatchStageTracking> - Upserted stage record
 */
export async function upsertBatchStage(input: CreateBatchStageInput): Promise<BatchStageTracking> {
  const { data, error } = await supabase
    .from('batch_stage_tracking')
    .upsert(input, {
      onConflict: 'batch_id,stage'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches batch allocation summary for all batches
 *
 * @returns Promise<BatchAllocationSummary[]> - Allocation summaries ordered by batch number
 */
export async function fetchBatchAllocationSummary(): Promise<BatchAllocationSummary[]> {
  const { data, error } = await supabase
    .from('batch_allocation_summary')
    .select('*')
    .order('batch_number')
    .returns<BatchAllocationSummary[]>();

  if (error) throw error;
  return data || [];
}

/**
 * Fetches batch allocation summary for a specific batch
 *
 * @param batchId - Batch UUID
 * @returns Promise<BatchAllocationSummary | null> - Allocation summary or null
 */
export async function fetchBatchAllocationSummaryById(
  batchId: string
): Promise<BatchAllocationSummary | null> {
  const { data, error } = await supabase
    .from('batch_allocation_summary')
    .select('*')
    .eq('batch_id', batchId)
    .returns<BatchAllocationSummary>()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetches all batches with COA status
 *
 * @returns Promise<BatchWithCOAStatus[]> - Batches with COA attachment status
 */
export async function fetchBatchWithCOAStatus(): Promise<BatchWithCOAStatus[]> {
  const { data, error } = await supabase
    .from('batch_with_coa_status')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<BatchWithCOAStatus[]>();

  if (error) throw error;
  return data || [];
}

/**
 * Fetches a batch with COA status by batch number
 *
 * @param batchNumber - Batch number
 * @returns Promise<BatchWithCOAStatus | null> - Batch with COA status or null
 */
export async function fetchBatchWithCOAStatusByNumber(
  batchNumber: string
): Promise<BatchWithCOAStatus | null> {
  const { data, error } = await supabase
    .from('batch_with_coa_status')
    .select('*')
    .eq('batch_number', batchNumber)
    .returns<BatchWithCOAStatus>()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetches allocation status for all batch stages
 *
 * @returns Promise<BatchStageAllocationStatus[]> - Stage allocation statuses
 */
export async function fetchBatchStageAllocationStatus(): Promise<BatchStageAllocationStatus[]> {
  const { data, error } = await supabase
    .from('batch_stage_allocation_status')
    .select('*')
    .order('batch_number')
    .returns<BatchStageAllocationStatus[]>();

  if (error) throw error;
  return data || [];
}

/**
 * Fetches allocation status for all stages of a specific batch
 *
 * @param batchId - Batch UUID
 * @returns Promise<BatchStageAllocationStatus[]> - Stage allocation statuses for batch
 */
export async function fetchBatchStageAllocationStatusByBatch(
  batchId: string
): Promise<BatchStageAllocationStatus[]> {
  const { data, error } = await supabase
    .from('batch_stage_allocation_status')
    .select('*')
    .eq('batch_id', batchId)
    .order('stage')
    .returns<BatchStageAllocationStatus[]>();

  if (error) throw error;
  return data || [];
}

/**
 * Fetches all active label types
 *
 * @returns Promise<LabelType[]> - Active label types ordered by name
 */
export async function fetchLabelTypes(): Promise<LabelType[]> {
  const { data, error } = await supabase
    .from('label_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Fetches a label type by code
 *
 * @param code - Label type code
 * @returns Promise<LabelType | null> - Label type or null
 */
export async function fetchLabelTypeByCode(code: string): Promise<LabelType | null> {
  const { data, error } = await supabase
    .from('label_types')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a new batch allocation
 *
 * @param input - Allocation data
 * @returns Promise<BatchAllocation> - Created allocation record
 * @description Also updates batch stage allocation tracking
 */
export async function createBatchAllocation(
  input: CreateBatchAllocationInput
): Promise<BatchAllocation> {
  // Map application types to database types
  const dbInput = {
    batch_id: input.batch_id,
    order_item_id: input.order_id,
    allocation_stage: input.product_stage_id,
    allocated_weight_grams: input.quantity_allocated
  };

  const { data, error } = await supabase
    .from('batch_allocations')
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  await updateBatchStageAllocation(
    input.batch_id,
    input.product_stage_id as BatchStage,
    input.quantity_allocated
  );

  // Map database row back to application type
  return {
    id: data.id,
    batch_id: data.batch_id,
    order_id: data.order_item_id,
    product_stage_id: data.allocation_stage,
    quantity_allocated: data.allocated_weight_grams,
    created_at: data.created_at || new Date().toISOString()
  };
}

/**
 * Updates an existing batch allocation
 *
 * @param id - Allocation UUID
 * @param input - Fields to update
 * @returns Promise<BatchAllocation> - Updated allocation
 */
export async function updateBatchAllocation(
  id: string,
  input: UpdateBatchAllocationInput
): Promise<BatchAllocation> {
  // Map application types to database types
  const dbInput: any = {};
  if (input.quantity_allocated !== undefined) {
    dbInput.allocated_weight_grams = input.quantity_allocated;
  }
  if (input.status !== undefined) {
    dbInput.status = input.status;
  }

  const { data, error } = await supabase
    .from('batch_allocations')
    .update(dbInput)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Map database row back to application type
  return {
    id: data.id,
    batch_id: data.batch_id,
    order_id: data.order_item_id,
    product_stage_id: data.allocation_stage,
    quantity_allocated: data.allocated_weight_grams,
    created_at: data.created_at || new Date().toISOString()
  };
}

/**
 * Deletes a batch allocation
 *
 * @param id - Allocation UUID
 * @returns Promise<void>
 * @description Also updates batch stage allocation tracking
 */
export async function deleteBatchAllocation(id: string): Promise<void> {
  const allocation = await fetchBatchAllocationById(id);
  if (!allocation) return;

  const { error } = await supabase
    .from('batch_allocations')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await updateBatchStageAllocation(
    allocation.batch_id,
    allocation.product_stage_id as BatchStage,
    -allocation.quantity_allocated
  );
}

/**
 * Fetches all batch allocations for an order item
 *
 * @param orderItemId - Order item UUID
 * @returns Promise<BatchAllocationWithDetails[]> - Allocations with batch details
 */
export async function fetchBatchAllocationsByOrderItem(
  orderItemId: string
): Promise<BatchAllocationWithDetails[]> {
  const { data, error } = await supabase
    .from('batch_allocations')
    .select(`
      *,
      batch:batch_registry(
        id,
        batch_number,
        strain,
        coa_id
      )
    `)
    .eq('order_item_id', orderItemId)
    .order('created_at', { ascending: false })
    .returns<BatchAllocationWithDetails[]>();

  if (error) throw error;
  return data || [];
}

export async function fetchBatchAllocationsByBatch(batchId: string): Promise<BatchAllocation[]> {
  const { data, error } = await supabase
    .from('batch_allocations')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map database rows to application type
  return (data || []).map(row => ({
    id: row.id,
    batch_id: row.batch_id,
    order_id: row.order_item_id,
    product_stage_id: row.allocation_stage,
    quantity_allocated: row.allocated_weight_grams,
    created_at: row.created_at || new Date().toISOString()
  }));
}

export async function fetchBatchAllocationById(id: string): Promise<BatchAllocation | null> {
  const { data, error } = await supabase
    .from('batch_allocations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Map database row to application type
  return {
    id: data.id,
    batch_id: data.batch_id,
    order_id: data.order_item_id,
    product_stage_id: data.allocation_stage,
    quantity_allocated: data.allocated_weight_grams,
    created_at: data.created_at || new Date().toISOString()
  };
}

async function updateBatchStageAllocation(
  batchId: string,
  stage: BatchStage,
  weightChange: number
): Promise<void> {
  const currentStage = await fetchBatchStageByStage(batchId, stage);

  if (currentStage) {
    const newAllocated = currentStage.allocated_weight_grams + weightChange;
    await updateBatchStage(batchId, stage, {
      allocated_weight_grams: Math.max(0, newAllocated)
    });
  }
}

export async function calculateBatchProjection(
  input: BatchProjectionInput
): Promise<BatchProjectionResult> {
  // @ts-expect-error RPC not in generated types
  const { data, error } = await supabase.rpc('calculate_batch_projection', {
    p_batch_id: input.batch_id,
    p_target_stage: input.target_stage,
    p_expected_yield_percentage: input.expected_yield_percentage || 85
  }) as { data: number | null; error: any };

  if (error) throw error;

  const projectedWeight = data || 0;

  return {
    batch_id: input.batch_id,
    projected_output_qty: projectedWeight,
    projected_weight: projectedWeight,
    estimated_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    confidence_level: 'medium'
  };
}

export async function checkBatchOverAllocation(
  batchId: string,
  stage?: BatchStage
): Promise<BatchOverAllocationCheck> {
  // @ts-expect-error RPC not in generated types
  const { data, error } = await supabase.rpc('check_batch_over_allocation', {
    p_batch_id: batchId,
    p_stage: stage || null
  }) as { data: any; error: any };

  if (error) throw error;

  // Default response if no data
  if (!data) {
    return {
      is_over_allocated: false,
      warnings: [],
      total_over_allocation: 0
    };
  }

  return data as BatchOverAllocationCheck;
}

/**
 * Fetches COA data for a batch
 *
 * @param batchNumber - Batch number (e.g., "250106-GSC")
 * @returns Promise<BatchCOASummary | null> - COA data or null if not found
 */
export async function getBatchCOAData(batchNumber: string): Promise<BatchCOASummary | null> {
  // @ts-expect-error RPC not in generated types
  const { data, error } = await supabase.rpc('get_batch_coa_data', {
    p_batch_number: batchNumber
  }) as { data: any; error: any };

  if (error) throw error;
  if (!data) return null;

  const result = Array.isArray(data) ? data[0] : data;
  return result ? (result as BatchCOASummary) : null;
}

/**
 * Validates whether a batch has required COA for label generation
 *
 * @param batchNumber - Batch number
 * @param labelTypeCode - Label type code (e.g., 'compliance', 'customer')
 * @returns Promise<BatchLabelValidation> - Validation result with blocking reason if any
 */
export async function validateLabelCOARequirement(
  batchNumber: string,
  labelTypeCode: string
): Promise<BatchLabelValidation> {
  // @ts-expect-error RPC not in generated types
  const { data, error } = await supabase.rpc('validate_label_coa_requirement', {
    p_batch_number: batchNumber,
    p_label_type_code: labelTypeCode
  }) as { data: any; error: any };

  if (error) throw error;

  if (!data) {
    return {
      can_print: false,
      batch_id: '',
      has_active_coa: false,
      blocking_reason: 'Validation failed'
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result as BatchLabelValidation;
}

/**
 * Quarantines a batch and logs the event
 *
 * @param batchId - Batch UUID
 * @param reason - Reason for quarantine (required)
 * @param userId - User ID applying quarantine
 * @returns Promise<BatchRegistry> - Updated batch record
 * @description Blocks all processing and fulfillment operations on the batch
 */
export async function quarantineBatch(
  batchId: string,
  reason: string,
  userId?: string
): Promise<BatchRegistry> {
  const batch = await updateBatch(batchId, {
    is_quarantined: true,
    quarantine_reason: reason
  });

  await logBatchEvent(batchId, 'quarantined', reason, userId);

  return batch;
}

/**
 * Releases a batch from quarantine and logs the event
 *
 * @param batchId - Batch UUID
 * @param notes - Notes explaining resolution
 * @param userId - User ID releasing quarantine
 * @returns Promise<BatchRegistry> - Updated batch record
 * @description Restores normal processing workflow for the batch
 */
export async function releaseQuarantine(
  batchId: string,
  notes: string,
  userId?: string
): Promise<BatchRegistry> {
  const batch = await updateBatch(batchId, {
    is_quarantined: false
  });

  await logBatchEvent(batchId, 'quarantine_released', notes, userId);

  return batch;
}

/**
 * Logs a batch production history event
 *
 * @param batchId - Batch UUID
 * @param eventType - Type of event (e.g., 'batch_created', 'quarantined')
 * @param notes - Event notes or description
 * @param userId - User ID who triggered the event
 * @returns Promise<void>
 * @description Creates immutable audit trail entry
 */
export async function logBatchEvent(
  batchId: string,
  eventType: string,
  notes?: string,
  userId?: string
): Promise<void> {
  const { error } = await supabase
    .from('batch_production_history')
    .insert({
      batch_id: batchId,
      operation_type: eventType,
      notes,
      session_id: userId // Map user_id to session_id field
    });

  if (error) throw error;
}

/**
 * Fetches batch production history for a batch
 *
 * @param batchId - Batch UUID
 * @returns Promise<any[]> - Production history events ordered by timestamp
 * @description Returns complete audit trail for the batch
 */
export async function fetchBatchProductionHistory(batchId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('batch_production_history')
    .select('*')
    .eq('batch_id', batchId)
    .order('event_timestamp', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Validates whether a lifecycle state transition is allowed
 *
 * @param currentState - Current lifecycle state
 * @param targetState - Target lifecycle state
 * @returns boolean - True if transition is valid
 * @description Enforces state machine rules from BATCHES.md
 */
/**
 * Validates whether a lifecycle state transition is allowed.
 *
 * Two production paths diverge at harvest:
 *   Flower:  clone → veg → flower → drying → bucking → trimming → bulk → packaging → packaged → depleted → archived
 *   FF/Lab:  clone → veg → flower → fresh_frozen → lab → depleted → archived
 *
 * Quarantine is a boolean flag (is_quarantined), not a lifecycle state.
 */
export function validateLifecycleTransition(
  currentState: string,
  targetState: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    // Cultivation
    'clone': ['veg', 'archived'],
    'veg': ['flower', 'archived'],
    'flower': ['drying', 'fresh_frozen', 'archived'],
    // Flower path
    'drying': ['bucking', 'flower'],
    'bucking': ['trimming', 'drying'],
    'trimming': ['bulk', 'bucking'],
    'bulk': ['packaging', 'trimming'],
    'packaging': ['packaged', 'bulk'],
    'packaged': ['depleted'],
    // FF / Lab path
    'fresh_frozen': ['lab', 'depleted'],
    'lab': ['depleted'],
    // Terminal
    'depleted': ['archived'],
  };

  return validTransitions[currentState]?.includes(targetState) || false;
}

/**
 * Fetches batches that are over-allocated
 *
 * @returns Promise<BatchAllocationWarning[]> - Over-allocation warnings
 */
export async function fetchOverAllocatedBatches(): Promise<BatchAllocationWarning[]> {
  const summaries = await fetchBatchAllocationSummary();

  const warnings: BatchAllocationWarning[] = [];

  for (const summary of summaries) {
    const warningThreshold = summary.over_allocation_warning_threshold || 100;

    if (summary.allocation_percentage >= warningThreshold) {
      const stages = await fetchBatchStageAllocationStatusByBatch(summary.batch_id);

      for (const stage of stages) {
        if (stage.is_over_allocated || stage.stage_allocation_percentage >= warningThreshold) {
          warnings.push({
            batch_id: summary.batch_id,
            batch_number: summary.batch_number,
            strain: summary.strain,
            stage: stage.stage,
            stage_display_name: stage.stage_display_name,
            available_quantity: stage.available_qty,
            allocated_quantity: stage.allocated_qty,
            over_allocation: stage.over_allocation,
            percentage_over: stage.stage_allocation_percentage,
            message: `${stage.stage} is ${stage.stage_allocation_percentage.toFixed(1)}% allocated (${stage.over_allocation.toFixed(1)}g over)`
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Fetches batches that require COA attachment
 *
 * @returns Promise<BatchWithCOAStatus[]> - Batches without COAs
 */
export async function fetchBatchesRequiringCOA(): Promise<BatchWithCOAStatus[]> {
  const batches = await fetchBatchWithCOAStatus();
  return batches.filter(b => b.coa_status === 'none' && b.batch_status === 'active');
}

export async function createBatchProjection(
  batchId: string,
  sourceStage: string,
  sourceWeight: number,
  targetStage: string,
  projectedWeight: number,
  notes?: string
): Promise<BatchProjection> {
  const { data, error } = await supabase
    .from('batch_projections')
    .insert({
      batch_id: batchId,
      source_stage: sourceStage,
      source_weight_grams: sourceWeight,
      target_stage: targetStage,
      projected_weight_grams: projectedWeight,
      notes
    })
    .select()
    .returns<BatchProjection>()
    .single();

  if (error) throw error;

  return data as BatchProjection;
}

export async function updateBatchProjectionActual(
  projectionId: string,
  actualWeight: number
): Promise<BatchProjection> {
  const projection = await fetchBatchProjectionById(projectionId);
  if (!projection) throw new Error('Projection not found');

  // Calculate variance based on the database row
  const dbProjection = projection as BatchProjection & { projected_weight_grams?: number };
  const projectedWeight = dbProjection.projected_weight_grams || 0;
  const variance = projectedWeight > 0
    ? ((actualWeight - projectedWeight) / projectedWeight) * 100
    : 0;

  const { data, error } = await supabase
    .from('batch_projections')
    .update({
      actual_weight_grams: actualWeight,
      variance_percentage: variance
    })
    .eq('id', projectionId)
    .select()
    .returns<BatchProjection>()
    .single();

  if (error) throw error;

  return data as BatchProjection;
}

async function fetchBatchProjectionById(id: string): Promise<BatchProjection | null> {
  const { data, error } = await supabase
    .from('batch_projections')
    .select('*')
    .eq('id', id)
    .returns<BatchProjection>()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const batchService = {
  fetchAllBatches,
  fetchActiveBatches,
  fetchBatchById,
  fetchBatchByNumber,
  createBatch,
  updateBatch,
  deleteBatch,
  fetchBatchStageTracking,
  fetchBatchStageByStage,
  createBatchStage,
  updateBatchStage,
  upsertBatchStage,
  fetchBatchAllocationSummary,
  fetchBatchAllocationSummaryById,
  fetchBatchWithCOAStatus,
  fetchBatchWithCOAStatusByNumber,
  fetchBatchStageAllocationStatus,
  fetchBatchStageAllocationStatusByBatch,
  fetchLabelTypes,
  fetchLabelTypeByCode,
  createBatchAllocation,
  updateBatchAllocation,
  deleteBatchAllocation,
  fetchBatchAllocationsByOrderItem,
  fetchBatchAllocationsByBatch,
  fetchBatchAllocationById,
  calculateBatchProjection,
  checkBatchOverAllocation,
  getBatchCOAData,
  validateLabelCOARequirement,
  fetchOverAllocatedBatches,
  fetchBatchesRequiringCOA,
  createBatchProjection,
  updateBatchProjectionActual,
  quarantineBatch,
  releaseQuarantine,
  logBatchEvent,
  fetchBatchProductionHistory,
  validateLifecycleTransition
};
