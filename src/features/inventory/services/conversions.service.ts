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
  ConversionVariance,
  CreatePackageInput,
  VarianceReason,
  ConsolidatedPackageInput,
  FinalizeConversionResult,
  PendingConversionSession,
  VoidConversionInput,
  FinalizationStatus,
} from '@/types';
import { inventoryMovementService } from '@/services';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Map product name to correct product_stage_id
 *
 * Stage Progression: Binned → Bucked → Trimmed → Packaged
 *
 * Product Stage Mapping:
 * - "Bulk Flower (Bucked)" → Bucked stage (temporary session output)
 * - "Bucked - [Strain] - Flower" → Bucked stage
 * - "Bulk - [Strain] - Flower" → Trimmed stage (ready for packaging/bulk sale)
 * - "Bulk - [Strain] - Smalls" → Trimmed stage (ready for packaging/bulk sale)
 * - "1lb Flower/Smalls - [Strain]" (454g) → Packaged stage (bulk packages)
 * - "Packaged - [Strain] - 3.5g/14g" → Packaged stage (consumer units)
 */
export function getProductStageIdFromProductName(productName: string): string {
  const lower = productName.toLowerCase();

  // Bucked stage (session output before trim)
  if (lower.includes('bucked')) {
    return '35d07a66-851d-4b2d-be18-290b03b91d2d'; // Bucked
  }

  // Binned stage
  if (lower.includes('binned')) {
    return 'c360e356-eb78-4512-8777-ee47c328157d'; // Binned
  }

  // Packaged stage (includes 1lb/454g bulk packages AND consumer units)
  // Must check this BEFORE Trimmed to avoid "Bulk" false positives
  if (lower.includes('packaged') || lower.includes('1lb') || lower.includes('454')) {
    return '323ee0fe-1342-4b26-9379-c373f3cabbb9'; // Packaged
  }

  // Trimmed stage (includes "Bulk" products)
  // "Bulk - [Strain] - Flower" and "Bulk - [Strain] - Smalls"
  if (lower.includes('bulk')) {
    return '30be0d52-a3b2-482d-a462-1803054cf792'; // Trimmed
  }

  // Default to Trimmed if unclear
  return '30be0d52-a3b2-482d-a462-1803054cf792'; // Trimmed
}

/**
 * Calculate remaining weight/units for a batch + product combination
 * Original output (from sessions) - already packaged (from conversion_packages)
 * Supports partial finalization workflow
 *
 * @deprecated This function is redundant after the 2026-01-15 Part 4 fix.
 * The pending_conversion_sessions VIEW now calculates remaining quantities at the
 * database level: (SUM(session_output) - COALESCE(SUM(packaged), 0)).
 *
 * Components should use session.output_weight / session.output_units directly
 * from PendingConversionSession objects instead of calling this service function.
 *
 * This function is kept temporarily for backward compatibility but should be
 * removed in a future refactor. It performs redundant database queries and
 * can produce incorrect results due to aggregation_id mismatches.
 *
 * See: docs/AI-BUILD-SESSION-CHECKLIST.md Part 6 for details.
 *
 * @param batchId - Batch registry ID
 * @param productId - Product ID (may not match VIEW-generated product_id)
 * @param sessionType - Type of conversion session
 * @param aggregationId - PREFERRED: Stable aggregation_id from VIEW (batch+product+session_type)
 */
export async function getRemainingQuantity(
  batchId: string,
  productId: string | null,
  sessionType: 'trim' | 'packaging' | 'bucking',
  aggregationId?: string
): Promise<{ remaining_weight: number | null; remaining_units: number | null }> {
  console.log('[getRemainingQuantity] Called with:', { batchId, productId, sessionType, aggregationId });

  // Step 1: Get original output from pending_conversion_sessions view
  // PREFER aggregation_id for reliable matching (product_id is dynamically generated in VIEW)
  let pendingQuery = supabase
    .from('pending_conversion_sessions')
    .select('output_weight, output_units, aggregation_id, product_id, product_name')
    .eq('batch_id', batchId)
    .eq('session_type', sessionType);

  // Use aggregation_id if available (most reliable)
  if (aggregationId) {
    pendingQuery = pendingQuery.eq('aggregation_id', aggregationId);
    console.log('[getRemainingQuantity] Filtering by aggregation_id:', aggregationId);
  }
  // Fallback to product_id filtering (less reliable due to dynamic generation)
  else if (productId !== null) {
    pendingQuery = pendingQuery.eq('product_id', productId);
    console.log('[getRemainingQuantity] Filtering by product_id:', productId);
  } else {
    pendingQuery = pendingQuery.is('product_id', null);
    console.log('[getRemainingQuantity] Filtering by product_id IS NULL');
  }

  const { data: pending, error: pendingError } = await pendingQuery;

  if (pendingError) {
    console.error('[getRemainingQuantity] Error fetching pending conversions:', pendingError);
    return { remaining_weight: null, remaining_units: null };
  }

  console.log('[getRemainingQuantity] Found pending conversions:', pending);

  if (!pending || pending.length === 0) {
    return { remaining_weight: null, remaining_units: null };
  }

  // Aggregate total original output
  const originalWeight = pending.reduce((sum, p) => sum + (p.output_weight || 0), 0);
  const originalUnits = pending.reduce((sum, p) => sum + (p.output_units || 0), 0);

  // Step 2: Get already packaged amounts from conversion_packages
  // Use aggregation_id for reliable matching (same as pending_conversion_sessions)
  let packagesQuery = supabase
    .from('conversion_packages')
    .select('weight, units, aggregation_id, product_id')
    .eq('batch_id', batchId)
    .in('finalization_status', ['pending', 'finalized']);

  // Use aggregation_id if available (most reliable)
  if (aggregationId) {
    packagesQuery = packagesQuery.eq('aggregation_id', aggregationId);
    console.log('[getRemainingQuantity] Filtering packages by aggregation_id:', aggregationId);
  }
  // Fallback to product_id filtering
  else if (productId !== null) {
    packagesQuery = packagesQuery.eq('product_id', productId);
    console.log('[getRemainingQuantity] Filtering packages by product_id:', productId);
  } else {
    packagesQuery = packagesQuery.is('product_id', null);
    console.log('[getRemainingQuantity] Filtering packages by product_id IS NULL');
  }

  const { data: packages, error: packagesError } = await packagesQuery;

  if (packagesError) {
    console.error('[getRemainingQuantity] Error fetching conversion packages:', packagesError);
    return {
      remaining_weight: originalWeight > 0 ? originalWeight : null,
      remaining_units: originalUnits > 0 ? originalUnits : null,
    };
  }

  console.log('[getRemainingQuantity] Found packages:', packages);

  // Sum already packaged amounts
  const packagedWeight = (packages || []).reduce((sum, p) => sum + (p.weight || 0), 0);
  const packagedUnits = (packages || []).reduce((sum, p) => sum + (p.units || 0), 0);

  const remaining = {
    remaining_weight: originalWeight > 0 ? originalWeight - packagedWeight : null,
    remaining_units: originalUnits > 0 ? originalUnits - packagedUnits : null,
  };

  console.log('[getRemainingQuantity] Calculation:', {
    originalWeight,
    originalUnits,
    packagedWeight,
    packagedUnits,
    remaining
  });

  // Calculate remaining
  return remaining;
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
export async function getPendingConversions(date?: string): Promise<PendingConversionSession[]> {
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
  product_id: string | null;   // Kept for conversion_packages compatibility
  product_name: string;          // NEW: Product name from session (e.g., "Bulk Flower (Bucked)")
  session_type: 'trim' | 'packaging' | 'bucking';
  session_ids: string[];        // All session IDs being finalized
  aggregation_id: string;       // Stable aggregation ID from pending_conversion_sessions
  packages: CreatePackageInput[];
  inventory_stage_id?: string;
}): Promise<ConversionPackage[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Step 1: Call RPC to mark all sessions as finalized (using product_name)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('finalize_session_aggregated', {
    p_batch_id: params.batch_id,
    p_product_name: params.product_name,  // Changed from product_id to product_name
    p_session_type: params.session_type,
  });

  if (rpcError) {
    throw new Error(`Failed to finalize sessions: ${rpcError.message}`);
  }

  // Step 2: Create packages with finalized status
  // Use helper to determine correct stage from product_name
  const correctStageId = getProductStageIdFromProductName(params.product_name);

  const packagesToInsert = params.packages.map((pkg) => ({
    batch_id: params.batch_id,
    product_id: params.product_id,
    aggregation_id: params.aggregation_id,  // Link to aggregation for traceability
    package_id: pkg.package_id,
    weight: pkg.weight || null,
    units: pkg.units || null,
    inventory_stage_id: correctStageId,
    source_session_ids: params.session_ids,  // All aggregated session IDs
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

    console.log('[finalizeConversion] Creating inventory items:', {
      packageCount: createdPackages.length,
      strainName,
      batchNumber,
      productName,
      strainId: batchData.strain_id,
    });

    // Create inventory_items for each package
    const inventoryItems = createdPackages.map((pkg) => {
      const quantity = pkg.weight || pkg.units || 0;
      // Use helper to map product name to correct stage
      const correctStageId = getProductStageIdFromProductName(productName);
      return {
        package_id: pkg.package_id,
        batch_id: pkg.batch_id,
        batch_number: batchNumber,
        strain_id: batchData.strain_id,
        strain: strainName,
        product_stage_id: correctStageId,
        product_name: productName,
        on_hand_qty: 0, // Let PRODUCE movement trigger set this (prevents double-counting)
        available_qty: quantity, // ATP field - set directly per architecture
        unit: pkg.weight ? 'g' : 'unit',
        status: 'Available',
        package_date: new Date().toISOString().split('T')[0],
      };
    });

    console.log('[finalizeConversion] Inserting inventory items:', inventoryItems);

    const { error: inventoryError } = await supabase
      .from('inventory_items')
      .insert(inventoryItems);

    if (inventoryError) {
      throw new Error(`Failed to create inventory items: ${inventoryError.message}`);
    }

    console.log('[finalizeConversion] Successfully created inventory items');

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
        qty: pkg.weight || pkg.units || 0,
        unit: pkg.weight ? 'g' : 'unit',
        reason_code: 'finalized_conversion',
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
      console.warn('[finalizeConversion] Some movements failed to create:', movementErrors);
      console.warn('[finalizeConversion] Inventory items created successfully, but audit trail incomplete');
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
 * Log a variance with required reason and acknowledgment
 */
export async function logVariance(data: {
  batch_id: string;
  product_id?: string;
  package_id?: string;
  expected_weight?: number;
  actual_weight?: number;
  expected_units?: number;
  actual_units?: number;
  variance_reason: VarianceReason;
  variance_note?: string;
}): Promise<ConversionVariance> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const weight_variance = data.expected_weight && data.actual_weight
    ? data.actual_weight - data.expected_weight
    : null;

  const unit_variance = data.expected_units && data.actual_units
    ? data.actual_units - data.expected_units
    : null;

  const { data: result, error } = await supabase
    .from('conversion_variance_log')
    .insert({
      batch_id: data.batch_id,
      product_id: data.product_id || null,
      package_id: data.package_id || null,
      expected_weight: data.expected_weight || null,
      actual_weight: data.actual_weight || null,
      weight_variance,
      expected_units: data.expected_units || null,
      actual_units: data.actual_units || null,
      unit_variance,
      variance_reason: data.variance_reason,
      variance_note: data.variance_note || null,
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log variance: ${error.message}`);
  }

  return result;
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
    console.warn('Could not fetch product stage_id:', productError);
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
    console.warn('Could not fetch product stage_id:', productError);
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

  // Log variance if provided
  if (input.variance_reason && (input.weight || input.units)) {
    await logVariance({
      batch_id: input.batch_id,
      product_id: input.product_id,
      package_id: input.package_id,
      expected_weight: input.expected_weight,
      actual_weight: input.weight,
      expected_units: input.expected_units,
      actual_units: input.units,
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

      const quantity = pkg.weight || pkg.units || 0;
      const unit = pkg.weight ? 'g' : 'unit';
      const category = stageName;
      const productName = `${stageName} - ${strainName} - ${typeName}`;

      const { data: inventoryItem, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
          package_id: pkg.package_id,
          batch_id: pkg.batch_id,
          batch_number: batch.batch_number,
          strain_id: batch.strain_id,
          product_stage_id: product.stage_id,
          product_name: productName,
          category: category,
          sku: product.sku,
          on_hand_qty: quantity,
          available_qty: quantity, // Immediately available after finalization
          unit: unit,
          package_date: new Date().toISOString().split('T')[0],
          status: 'Available',
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
