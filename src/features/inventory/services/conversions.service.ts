/**
 * Inventory Conversions Service - Hybrid Architecture
 *
 * Simplified conversion workflow that queries session outputs directly
 * and uses conversion_packages.finalization_status for workflow tracking.
 *
 * @module conversions.service
 */

import { supabase } from '@/lib/supabase';
import {
  ConversionPackage,
  CreatePackageInput,
  VarianceReason,
  ConsolidatedPackageInput,
  FinalizeConversionResult,
  PendingConversionSession,
  FinalizationStatus,
} from '@/types';
import { inventoryMovementService, errorService } from '@/services';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function parseNetWeightFromProductName(productName: string): number | null {
  const match = productName.match(/(\d+\.?\d*)g/);
  return match ? parseFloat(match[1]) : null;
}

let stageIdCache: Record<string, string> | null = null;

async function getStageIdMap(): Promise<Record<string, string>> {
  if (stageIdCache) return stageIdCache;

  const { data, error } = await supabase
    .from('product_stages')
    .select('id, name')
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to load product stages: ${error?.message || 'no data'}`);
  }

  stageIdCache = {};
  for (const stage of data) {
    stageIdCache[stage.name] = stage.id;
  }
  return stageIdCache;
}

/**
 * Map product name to correct product_stage_id via database lookup (cached).
 *
 * Stage Progression: Binned -> Bucked -> Trimmed -> Packaged
 *
 * Product Stage Mapping:
 * - "Bulk Flower (Bucked)" -> Bucked stage
 * - "Bucked - [Strain] - Flower" -> Bucked stage
 * - "Bulk - [Strain] - Flower" -> Trimmed stage
 * - "Bulk - [Strain] - Smalls" -> Trimmed stage
 * - "1lb Flower/Smalls - [Strain]" (454g) -> Packaged stage
 * - "Packaged - [Strain] - 3.5g/14g" -> Packaged stage
 */
export async function getProductStageIdFromProductName(productName: string): Promise<string> {
  const stages = await getStageIdMap();
  const lower = productName.toLowerCase();

  if (lower.includes('bucked') && stages['Bucked']) {
    return stages['Bucked'];
  }

  if (lower.includes('binned') && stages['Binned']) {
    return stages['Binned'];
  }

  if ((lower.includes('packaged') || lower.includes('1lb') || lower.includes('454')) && stages['Packaged']) {
    return stages['Packaged'];
  }

  if (lower.includes('bulk') && stages['Trimmed']) {
    return stages['Trimmed'];
  }

  return stages['Trimmed'] || Object.values(stages)[0];
}

/**
 * Map product name to category for inventory UI filtering
 *
 * The inventory UI uses the category field to determine which tab to display items in.
 * This field is REQUIRED for packages to be visible in the inventory views.
 *
 * Category Mapping:
 * - "Binned" products → 'Binned' category
 * - "Bucked" products → 'Bucked' category
 * - "Bulk" or "Trimmed" products → 'Bulk' category
 * - "Packaged" products → 'Packaged' category
 *
 * @param productName - The product name from session output
 * @returns Category string for inventory_items.category field
 */
export function getCategoryFromProductName(productName: string): string {
  const lower = productName.toLowerCase();

  // Check in order of specificity
  if (lower.includes('binned')) {
    return 'Binned';
  }

  if (lower.includes('bucked')) {
    return 'Bucked';
  }

  // Packaged must be checked before Bulk to avoid "Bulk" false positives
  if (lower.includes('packaged') || lower.includes('1lb') || lower.includes('454')) {
    return 'Packaged';
  }

  // Bulk and Trimmed map to same category
  if (lower.includes('bulk') || lower.includes('trimmed')) {
    return 'Bulk';
  }

  // Default to Bulk (safest for visibility)
  return 'Bulk';
}

// =====================================================
// MANUAL FINALIZATION WORKFLOW
// =====================================================

/**
 * Get aggregated sessions awaiting finalization
 * Queries pending_conversion_sessions view
 * Returns aggregated sessions grouped by batch + product
 * Multiple sessions with same batch+product appear as single row
 */
export async function getPendingConversions(_date?: string): Promise<PendingConversionSession[]> {
  const { data, error } = await supabase
    .from('pending_conversion_sessions')
    .select('*')
    .order('last_completed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending conversions: ${error.message}`);
  }

  return data || [];
}

/**
 * Finalize aggregated sessions to conversion packages
 * Calls finalize_session_aggregated RPC which marks all sessions with
 * matching batch_id + product_name as finalized
 * Creates conversion_packages with finalization_status='finalized'
 *
 * Simplified architecture (2026-01-16): Uses product_name instead of product_id,
 * eliminating fragile product lookups and matching the simplified VIEW architecture.
 */
export async function finalizeConversion(params: {
  batch_id: string;
  product_id: string | null;
  product_name: string;
  session_type: 'trim' | 'packaging' | 'bucking';
  session_ids: string[];
  aggregation_id: string;
  packages: CreatePackageInput[];
  inventory_stage_id?: string;
  output_weight?: number | null;
  output_units?: number | null;
}): Promise<ConversionPackage[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Architecture Decision #9: Partial Conversion Support
  // Only call the finalization RPC when ALL remaining output is accounted for.
  // For partial conversions, skip the RPC so sessions remain in 'pending' status
  // and the VIEW continues to display them with reduced remaining weight.
  // See: ARCHITECTURE-DECISIONS.md #9
  const totalPackageWeight = params.packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
  const totalPackageUnits = params.packages.reduce((sum, pkg) => sum + (pkg.units || 0), 0);

  const isFullFinalization = (() => {
    if (params.output_weight != null && params.output_weight > 0) {
      return totalPackageWeight >= params.output_weight - 0.5;
    }
    if (params.output_units != null && params.output_units > 0) {
      return totalPackageUnits >= params.output_units;
    }
    return true;
  })();

  // Step 1: Only mark sessions as finalized for FULL conversion
  // For partial conversions, sessions stay in 'pending' so the VIEW keeps showing them
  if (isFullFinalization) {
    const { error: rpcError } = await supabase.rpc('finalize_session_aggregated', {
      p_batch_id: params.batch_id,
      p_product_name: params.product_name,
      p_session_type: params.session_type,
    });

    if (rpcError) {
      throw new Error(`Failed to finalize sessions: ${rpcError.message}`);
    }
  }

  // Step 2: Create packages with finalized status
  // Use helper to determine correct stage from product_name
  const correctStageId = await getProductStageIdFromProductName(params.product_name);

  const packagesToInsert = params.packages.map((pkg) => ({
    batch_id: params.batch_id,
    product_id: params.product_id,
    aggregation_id: params.aggregation_id,  // Link to aggregation for traceability
    package_id: pkg.package_id,
    weight: pkg.weight || null,
    units: pkg.units || null,
    inventory_stage_id: correctStageId,
    source_session_ids: isFullFinalization
      ? params.session_ids
      : [params.session_ids[0]],
    finalization_status: 'finalized' as FinalizationStatus,
    finalized_at: new Date().toISOString(),
    finalized_by: userId,
    created_by: userId,
  }));

  const { data: createdPackages, error } = await supabase
    .from('conversion_packages')
    .insert(packagesToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to create packages: ${error.message}`);
  }

  // Step 3: Create inventory_items for each finalized package
  if (createdPackages && createdPackages.length > 0) {
    // Get batch info for strain name and batch number
    const { data: batchData, error: batchError } = await supabase
      .from('batch_registry')
      .select('batch_number, strain_id, strains(name)')
      .eq('id', params.batch_id)
      .single();

    if (batchError) {
      throw new Error(`Failed to fetch batch data: ${batchError.message}`);
    }

    // Validate batch data exists
    if (!batchData) {
      throw new Error(`Batch not found: ${params.batch_id}`);
    }

    // Validate required batch fields
    if (!batchData.batch_number) {
      throw new Error(`Batch ${params.batch_id} missing batch_number`);
    }

    if (!batchData.strain_id) {
      throw new Error(`Batch ${params.batch_id} missing strain_id. All batches must have a strain.`);
    }

    // Use product_name directly from params (captured at session completion)
    const productName = params.product_name;
    const strainName = batchData?.strains?.name || 'Unknown Strain';
    const batchNumber = batchData.batch_number;

    // Pre-resolve stage and category outside the map (stage lookup is async)
    const inventoryStageId = await getProductStageIdFromProductName(productName);
    const inventoryCategory = getCategoryFromProductName(productName);

    // Create inventory_items for each package
    const inventoryItems = createdPackages.map((pkg) => {
      const quantity = pkg.weight != null ? pkg.weight : (pkg.units ?? 0);
      return {
        package_id: pkg.package_id,
        batch_id: pkg.batch_id,
        batch_number: batchNumber,
        batch: batchNumber,
        strain_id: batchData.strain_id,
        strain: strainName,
        product_stage_id: inventoryStageId,
        product_name: productName,
        category: inventoryCategory,
        net_weight: parseNetWeightFromProductName(productName),
        on_hand_qty: quantity,
        available_qty: quantity,
        reserved_qty: 0,
        unit: pkg.weight != null ? 'g' : 'unit',
        status: 'available',
        package_date: new Date().toISOString().split('T')[0],
      };
    });

    const { error: inventoryError } = await supabase
      .from('inventory_items')
      .insert(inventoryItems);

    if (inventoryError) {
      throw new Error(`Failed to create inventory items: ${inventoryError.message}`);
    }

    // Step 3.5: Validate ATP consistency for all created items
    // After PRODUCE trigger runs, verify: available_qty = on_hand_qty - reserved_qty

    for (const item of inventoryItems) {
      const { data: invItem, error: checkError } = await supabase
        .from('inventory_items')
        .select('package_id, on_hand_qty, available_qty, reserved_qty')
        .eq('package_id', item.package_id)
        .single();

      if (checkError || !invItem) {
        console.error(`[finalizeConversion] ATP check failed - could not find item: ${item.package_id}`);
        continue;
      }

      const expectedAvailableQty = invItem.on_hand_qty - (invItem.reserved_qty || 0);
      const actualAvailableQty = invItem.available_qty;

      if (Math.abs(expectedAvailableQty - actualAvailableQty) > 0.01) {
        const atpError = `ATP VIOLATION: ${invItem.package_id} - Expected available_qty=${expectedAvailableQty}, Got=${actualAvailableQty} (on_hand=${invItem.on_hand_qty}, reserved=${invItem.reserved_qty})`;
        console.error(`[finalizeConversion] ${atpError}`);
        errorService.handle(new Error(atpError), 'ATP consistency check failed');
      }
    }

    // Step 4: Create inventory movements for audit trail
    const movementErrors: string[] = [];

    for (const pkg of createdPackages) {
      // Get the inventory_item id
      const { data: invItem, error: invItemError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('package_id', pkg.package_id)
        .single();

      if (invItemError) {
        const errorMsg = `Could not find inventory item for package ${pkg.package_id}: ${invItemError.message}`;
        console.error(`[finalizeConversion] ${errorMsg}`);
        movementErrors.push(errorMsg);
        continue;
      }

      if (!invItem) {
        const errorMsg = `Inventory item not found for package ${pkg.package_id}`;
        console.error(`[finalizeConversion] ${errorMsg}`);
        movementErrors.push(errorMsg);
        continue;
      }

      const movementResult = await inventoryMovementService.recordMovement({
        movement_kind: 'PRODUCE',
        dest_item_id: invItem.id,
        qty: pkg.weight != null ? pkg.weight : (pkg.units ?? 0),
        unit: pkg.weight != null ? 'g' : 'unit',
        reason_code: 'session_finalization',
        notes: `Finalized from ${params.session_ids.length} ${params.session_type} session(s)`,
      });

      if (!movementResult.success) {
        const errorMsg = `Failed to create movement for package ${pkg.package_id}: ${movementResult.error}`;
        console.error(`[finalizeConversion] ${errorMsg}`);
        movementErrors.push(errorMsg);
      }
    }

    // If any movements failed, log warning but don't fail the entire operation
    // Inventory items were successfully created, movements are for audit trail
    if (movementErrors.length > 0) {
      console.error('[finalizeConversion] Some movements failed to create:', movementErrors);
    }
  }

  return createdPackages || [];
}

/**
 * Void aggregated conversion sessions
 * Calls void_session_aggregated RPC which marks all sessions with
 * matching batch_id + product_name as voided
 * Prevents package creation for these sessions
 *
 * Simplified architecture (2026-01-16): Uses product_name instead of product_id,
 * eliminating fragile product lookups and matching the simplified VIEW architecture.
 */
export async function voidConversion(params: {
  batch_id: string;
  product_name: string;  // Changed from product_id to product_name
  session_type: 'trim' | 'packaging' | 'bucking';
  void_reason: string;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  if (!params.void_reason || params.void_reason.trim() === '') {
    throw new Error('Void reason is required');
  }

  // Call RPC to void all matching sessions (using product_name)
  const { error } = await supabase.rpc('void_session_aggregated', {
    p_batch_id: params.batch_id,
    p_product_name: params.product_name,  // Changed from product_id to product_name
    p_session_type: params.session_type,
    p_reason: params.void_reason,
  });

  if (error) {
    throw new Error(`Failed to void sessions: ${error.message}`);
  }
}

// =====================================================
// SESSION CONTRIBUTION QUERIES
// =====================================================

export interface SessionContribution {
  id: string;
  completed_at: string;
  operator_name: string;
  output_weight: number | null;
  output_units: number | null;
  source_package_id: string | null;
}

/**
 * Fetch per-session contribution details for the breakdown panel.
 * Queries the appropriate session table based on session_type.
 */
export async function getSessionContributions(
  sessionIds: string[],
  sessionType: 'trim' | 'packaging' | 'bucking'
): Promise<SessionContribution[]> {
  if (!sessionIds || sessionIds.length === 0) return [];

  if (sessionType === 'trim') {
    const { data, error } = await supabase
      .from('trim_sessions')
      .select('id, completed_at, trimmer_name, big_buds_grams, small_buds_grams, package_id')
      .in('id', sessionIds)
      .order('completed_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch trim contributions: ${error.message}`);

    return (data || []).map((s) => ({
      id: s.id,
      completed_at: s.completed_at,
      operator_name: s.trimmer_name,
      output_weight: (s.big_buds_grams || 0) + (s.small_buds_grams || 0),
      output_units: null,
      source_package_id: s.package_id || null,
    }));
  }

  if (sessionType === 'bucking') {
    const { data, error } = await supabase
      .from('bucking_sessions')
      .select('id, completed_at, bucker_name, output_weight_grams, binned_package_id')
      .in('id', sessionIds)
      .order('completed_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch bucking contributions: ${error.message}`);

    return (data || []).map((s) => ({
      id: s.id,
      completed_at: s.completed_at,
      operator_name: s.bucker_name,
      output_weight: s.output_weight_grams,
      output_units: null,
      source_package_id: s.binned_package_id || null,
    }));
  }

  // packaging
  const { data, error } = await supabase
    .from('packaging_sessions')
    .select('id, completed_at, packager_name, units_3_5g, units_14g, units_454g, ending_weight, package_id')
    .in('id', sessionIds)
    .order('completed_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch packaging contributions: ${error.message}`);

  return (data || []).map((s) => {
    const totalUnits = (s.units_3_5g || 0) + (s.units_14g || 0) + (s.units_454g || 0);
    return {
      id: s.id,
      completed_at: s.completed_at,
      operator_name: s.packager_name,
      output_weight: totalUnits === 0 ? (s.ending_weight || null) : null,
      output_units: totalUnits > 0 ? totalUnits : null,
      source_package_id: s.package_id || null,
    };
  });
}

// =====================================================
// CONVERSION SUMMARY QUERIES
// =====================================================

/**
 * Get conversion summary from database view
 * Shows all completed sessions grouped by batch+product with quantities
 */
export async function getConversionSummary(date?: string) {
  let query = supabase
    .from('conversion_summary_view')
    .select('*')
    .order('session_date', { ascending: false });

  if (date) {
    query = query.eq('session_date', date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch conversion summary: ${error.message}`);
  }

  return data || [];
}

/**
 * Get conversion history with package details
 */
export async function getConversionHistory(filters?: {
  batch_id?: string;
  strain?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase
    .from('conversion_history_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }

  if (filters?.strain) {
    query = query.eq('strain', filters.strain);
  }

  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch conversion history: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// PACKAGE ID GENERATION
// =====================================================

/**
 * Generate next sequential package ID for a batch
 * Format: YYMMDD-STRAIN-01
 */
export async function generateNextPackageId(batchId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_next_package_id', {
    p_batch_id: batchId,
  });

  if (error) {
    throw new Error(`Failed to generate package ID: ${error.message}`);
  }

  return data;
}

/**
 * Generate multiple sequential package IDs
 */
export async function generatePackageIds(batchId: string, count: number): Promise<string[]> {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const id = await generateNextPackageId(batchId);
    ids.push(id);
  }

  return ids;
}

// =====================================================
// VARIANCE CALCULATION & LOGGING
// =====================================================

/**
 * Calculate variance between expected and actual amounts
 */
export function calculateVariance(
  expected: number,
  actual: number
): {
  variance: number;
  percentage: number;
  isShortage: boolean;
} {
  const variance = actual - expected;
  const percentage = expected === 0 ? 0 : (variance / expected) * 100;

  return {
    variance,
    percentage,
    isShortage: variance < 0,
  };
}

/**
 * Log a conversion variance to the canonical variance_log table.
 * Uses source_type='session_conversion' so it appears in variance reports.
 */
export async function logVariance(data: {
  batch_id: string;
  batch_name: string;
  strain_name: string;
  product_name: string;
  expected_weight?: number;
  actual_weight?: number;
  variance_reason: VarianceReason;
  variance_note?: string;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const expected = data.expected_weight ?? 0;
  const actual = data.actual_weight ?? 0;
  const varianceQty = actual - expected;
  const variancePct = expected === 0 ? 0 : (varianceQty / expected) * 100;

  const { error } = await supabase
    .from('variance_log')
    .insert({
      source_type: 'session_conversion',
      source_id: data.batch_id,
      package_id: data.batch_name,
      expected_qty: expected,
      actual_qty: actual,
      variance_qty: varianceQty,
      variance_percentage: Math.round(variancePct * 100) / 100,
      unit: 'g',
      variance_reason: data.variance_reason,
      notes: data.variance_note || null,
      strain: data.strain_name,
      batch: data.batch_name,
      product_name: data.product_name,
      user_id: userId,
    });

  if (error) {
    throw new Error(`Failed to log variance: ${error.message}`);
  }
}

/**
 * Get variance history for a specific batch or package
 */
export async function getVariances(filters?: {
  batch_id?: string;
  package_id?: string;
}): Promise<ConversionVariance[]> {
  let query = supabase
    .from('conversion_variance_log')
    .select('*')
    .order('acknowledged_at', { ascending: false });

  if (filters?.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }

  if (filters?.package_id) {
    query = query.eq('package_id', filters.package_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch variances: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// PACKAGE CREATION (AUDIT TABLE)
// =====================================================

/**
 * Create conversion packages in audit table
 * This is the insert-only record of what was created
 *
 * @param finalization_status - Optional status (defaults to 'pending' for manual workflow)
 */
export async function createConversionPackages(
  packages: CreatePackageInput[],
  metadata: {
    batch_id: string;
    product_id: string;
    source_session_ids: string[];
    finalization_status?: FinalizationStatus;
  }
): Promise<ConversionPackage[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Fetch product details to get stage_id
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('stage_id')
    .eq('id', metadata.product_id)
    .single();

  if (productError) {
    console.error('Could not fetch product stage_id:', productError);
  }

  const finalizationStatus = metadata.finalization_status || 'pending';
  const now = new Date().toISOString();

  // Create packages in audit table
  const packagesToInsert = packages.map((pkg) => ({
    batch_id: metadata.batch_id,
    product_id: metadata.product_id,
    package_id: pkg.package_id,
    weight: pkg.weight || null,
    units: pkg.units || null,
    inventory_stage_id: product?.stage_id || null,
    source_session_ids: metadata.source_session_ids,
    finalization_status: finalizationStatus,
    finalized_at: finalizationStatus === 'finalized' ? now : null,
    finalized_by: finalizationStatus === 'finalized' ? userId : null,
    created_by: userId,
  }));

  const { data: createdPackages, error } = await supabase
    .from('conversion_packages')
    .insert(packagesToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to create conversion packages: ${error.message}`);
  }

  return createdPackages || [];
}

/**
 * Create a single consolidated package
 * Used when manager consolidates multiple session outputs
 *
 * @param finalization_status - Optional status (defaults to 'pending')
 */
export async function createConsolidatedPackage(
  input: ConsolidatedPackageInput & { finalization_status?: FinalizationStatus }
): Promise<ConversionPackage> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Fetch product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('stage_id')
    .eq('id', input.product_id)
    .single();

  if (productError) {
    console.error('Could not fetch product stage_id:', productError);
  }

  const finalizationStatus = input.finalization_status || 'pending';
  const now = new Date().toISOString();

  // Create single consolidated package
  const { data: createdPackage, error } = await supabase
    .from('conversion_packages')
    .insert({
      batch_id: input.batch_id,
      product_id: input.product_id,
      package_id: input.package_id,
      weight: input.weight || null,
      units: input.units || null,
      inventory_stage_id: product?.stage_id || null,
      source_session_ids: input.source_session_ids || [],
      finalization_status: finalizationStatus,
      finalized_at: finalizationStatus === 'finalized' ? now : null,
      finalized_by: finalizationStatus === 'finalized' ? userId : null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create consolidated package: ${error.message}`);
  }

  if (input.variance_reason && (input.weight || input.units)) {
    const { data: batchInfo } = await supabase
      .from('batch_registry')
      .select('batch_number, strains(name)')
      .eq('id', input.batch_id)
      .maybeSingle();

    const { data: productInfo } = await supabase
      .from('products')
      .select('name')
      .eq('id', input.product_id)
      .maybeSingle();

    await logVariance({
      batch_id: input.batch_id,
      batch_name: batchInfo?.batch_number || input.batch_id,
      strain_name: batchInfo?.strains?.name || 'Unknown',
      product_name: productInfo?.name || 'Unknown',
      expected_weight: input.expected_weight,
      actual_weight: input.weight,
      variance_reason: input.variance_reason,
      variance_note: input.variance_notes,
    });
  }

  return createdPackage;
}

/**
 * Finalize conversion packages to live inventory
 * Creates inventory_items that are immediately available
 * Conversions section serves as the review/approval step
 */
export async function finalizeConversionPackages(
  packageIds: string[]
): Promise<FinalizeConversionResult> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get packages from audit table
    const { data: packages, error: packagesError } = await supabase
      .from('conversion_packages')
      .select('*')
      .in('package_id', packageIds);

    if (packagesError || !packages || packages.length === 0) {
      throw new Error('No packages found');
    }

    // Check if any already exist in inventory
    const { data: existingItems } = await supabase
      .from('inventory_items')
      .select('package_id')
      .in('package_id', packageIds);

    if (existingItems && existingItems.length > 0) {
      throw new Error(
        `Packages already finalized: ${existingItems.map(i => i.package_id).join(', ')}`
      );
    }

    // Fetch product, batch, stage, and type details for all packages
    const productIds = [...new Set(packages.map(p => p.product_id))];
    const batchIds = [...new Set(packages.map(p => p.batch_id))];

    const { data: products } = await supabase
      .from('products')
      .select('id, name, stage_id, strain_id, type_id, sku')
      .in('id', productIds);

    const { data: batches } = await supabase
      .from('batch_registry')
      .select('id, batch_number, strain_id')
      .in('id', batchIds);

    const { data: strains } = await supabase
      .from('strains')
      .select('id, name');

    const stageIds = [...new Set(products?.map(p => p.stage_id).filter(Boolean) || [])];
    const typeIds = [...new Set(products?.map(p => p.type_id).filter(Boolean) || [])];

    const { data: stages } = await supabase
      .from('product_stages')
      .select('id, name')
      .in('id', stageIds);

    const { data: types } = await supabase
      .from('product_types')
      .select('id, name')
      .in('id', typeIds);

    // Create lookup maps
    const productMap = new Map(products?.map(p => [p.id, p]) || []);
    const batchMap = new Map(batches?.map(b => [b.id, b]) || []);
    const strainMap = new Map(strains?.map(s => [s.id, s.name]) || []);
    const stageMap = new Map(stages?.map(s => [s.id, s.name]) || []);
    const typeMap = new Map(types?.map(t => [t.id, t.name]) || []);

    const createdInventoryItems: string[] = [];

    // Create inventory items
    for (const pkg of packages) {
      const product = productMap.get(pkg.product_id);
      const batch = batchMap.get(pkg.batch_id);

      if (!product || !batch) {
        console.error(`Missing product or batch for package ${pkg.package_id}`);
        continue;
      }

      const strainName = strainMap.get(batch.strain_id) || 'Unknown';
      const stageName = stageMap.get(product.stage_id) || 'Unknown';
      const typeName = typeMap.get(product.type_id) || 'Flower';

      const quantity = pkg.weight != null ? pkg.weight : (pkg.units ?? 0);
      const unit = pkg.weight != null ? 'g' : 'unit';
      const category = stageName;
      const productName = `${stageName} - ${strainName} - ${typeName}`;

      const { data: inventoryItem, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
          package_id: pkg.package_id,
          batch_id: pkg.batch_id,
          batch_number: batch.batch_number,
          batch: batch.batch_number,
          strain_id: batch.strain_id,
          strain: strainName,
          product_stage_id: product.stage_id,
          product_name: productName,
          category: category,
          net_weight: parseNetWeightFromProductName(productName),
          sku: product.sku,
          on_hand_qty: quantity,
          available_qty: quantity,
          unit: unit,
          package_date: new Date().toISOString().split('T')[0],
          status: 'available',
        })
        .select('id')
        .single();

      if (itemError) {
        console.error('Failed to create inventory item:', itemError);
        continue;
      }

      if (inventoryItem) {
        createdInventoryItems.push(inventoryItem.id);
      }
    }

    return {
      success: true,
      inventory_items: createdInventoryItems,
      movements: [], // Movements tracked separately via inventory system
      packages_finalized: createdInventoryItems.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to finalize conversion packages:', errorMessage);
    return {
      success: false,
      inventory_items: [],
      movements: [],
      error: errorMessage,
      packages_finalized: 0,
    };
  }
}

/**
 * Get all packages from audit table
 */
export async function getPackages(filters?: {
  batch_id?: string;
  product_id?: string;
  package_id?: string;
}): Promise<ConversionPackage[]> {
  let query = supabase
    .from('conversion_packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }

  if (filters?.product_id) {
    query = query.eq('product_id', filters.product_id);
  }

  if (filters?.package_id) {
    query = query.eq('package_id', filters.package_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch packages: ${error.message}`);
  }

  return data || [];
}
