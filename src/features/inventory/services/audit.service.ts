/**
 * Audit Service
 *
 * Backend service for inventory audit operations.
 * Handles audit lifecycle management, line item updates, and completion.
 *
 * @module audit.service
 */

import { supabase } from '@/lib/supabase';
import { getCategoryFromProductName } from './conversions.service';
import type {
  InventoryAudit,
  InventoryAuditLine,
  AuditInitiationRequest,
  AuditInitiationResponse,
  AuditLineUpdateRequest,
  AddPackageToAuditRequest,
  AuditCompletionSummary,
  AuditCancellationRequest,
  AuditWithStats,
  AuditHistoryFilters,
  ActiveAuditInfo,
  StageLockStatus
} from '../types';
import type { ProductStageRelation, AuditRelation, AuditStatus } from '@/types';

// =====================================================
// AUDIT LIFECYCLE
// =====================================================

/**
 * Initiate a new inventory audit
 *
 * Creates audit record, generates audit number, captures inventory snapshot,
 * and creates audit lines for all packages in selected stages.
 */
export async function initiateAudit(
  request: AuditInitiationRequest,
  userId: string
): Promise<AuditInitiationResponse> {
  try {
    // Step 1: Check for stage locks
    const lockStatus = await checkStageLocked(request.selected_stages);
    if (lockStatus.is_locked) {
      throw new Error(`Cannot start audit: stages are locked by ${lockStatus.audit_number}`);
    }

    // Step 2: Generate audit number
    const { data: auditNumberData, error: auditNumberError } = await supabase
      .rpc('fn_generate_audit_number');

    if (auditNumberError) throw auditNumberError;
    const auditNumber = auditNumberData as string;

    // Step 3: Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('inventory_audits')
      .insert({
        audit_number: auditNumber,
        status: 'initiated',
        selected_stages: request.selected_stages,
        notes: request.notes,
        initiated_by: userId,
        is_locked: false
      })
      .select()
      .single();

    if (auditError) throw auditError;

    // Step 4: Fetch inventory items for selected stages
    const { data: inventoryItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        package_id,
        product_name,
        strain,
        batch,
        room,
        on_hand_qty,
        unit,
        product_stage_id,
        product_stages!inner(display_name)
      `)
      .in('product_stages.display_name', request.selected_stages)
      .gt('on_hand_qty', 0)
      .order('product_stages.display_name')
      .order('strain')
      .order('package_id');

    if (itemsError) throw itemsError;

    // Step 5: Create audit lines
    const auditLines = inventoryItems.map((item, index) => {
      const itemWithStage = item as typeof item & { product_stages: ProductStageRelation };
      return {
        audit_id: audit.id,
        inventory_item_id: item.id,
        package_id: item.package_id,
        product_name: item.product_name,
        strain: item.strain,
        batch: item.batch,
        room: item.room,
        stage: itemWithStage.product_stages.display_name,
        expected_qty: item.on_hand_qty,
        unit: item.unit,
        line_order: index + 1
      };
    });

    const { error: linesError } = await supabase
      .from('inventory_audit_lines')
      .insert(auditLines);

    if (linesError) throw linesError;

    // Step 6: Update audit with totals
    await supabase
      .from('inventory_audits')
      .update({
        total_packages: inventoryItems.length
      })
      .eq('id', audit.id);

    return {
      audit_id: audit.id,
      audit_number: auditNumber,
      total_packages: inventoryItems.length,
      selected_stages: request.selected_stages
    };
  } catch (error) {
    console.error('Error initiating audit:', error);
    throw new Error(`Failed to initiate audit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get audit by ID with statistics
 */
export async function getAuditById(auditId: string): Promise<AuditWithStats | null> {
  try {
    const { data: audit, error: auditError } = await supabase
      .from('inventory_audits')
      .select('*')
      .eq('id', auditId)
      .single();

    if (auditError) throw auditError;
    if (!audit) return null;

    // Get line statistics
    const { data: lines, error: linesError } = await supabase
      .from('inventory_audit_lines')
      .select('id, confirmed, variance_qty')
      .eq('audit_id', auditId);

    if (linesError) throw linesError;

    const totalLines = lines?.length || 0;
    const confirmedLines = lines?.filter(l => l.confirmed).length || 0;
    const linesWithVariance = lines?.filter(l => l.variance_qty && l.variance_qty !== 0).length || 0;
    const progressPercentage = totalLines === 0 ? 0 : Math.round((confirmedLines / totalLines) * 100);

    return {
      ...audit,
      total_lines: totalLines,
      confirmed_lines: confirmedLines,
      unconfirmed_lines: totalLines - confirmedLines,
      lines_with_variance: linesWithVariance,
      progress_percentage: progressPercentage
    };
  } catch (error) {
    console.error('Error fetching audit:', error);
    throw new Error(`Failed to fetch audit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get currently active audit (in_progress status)
 */
export async function getActiveAudit(): Promise<ActiveAuditInfo | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_audits')
      .select('*')
      .in('status', ['initiated', 'in_progress'])
      .order('initiated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      audit_id: data.id,
      audit_number: data.audit_number,
      status: data.status as AuditStatus,
      initiated_by: data.initiated_by || '',
      initiated_at: data.initiated_at || '',
      selected_stages: data.selected_stages,
      is_locked: data.is_locked || false
    };
  } catch (error) {
    console.error('Error fetching active audit:', error);
    return null;
  }
}

/**
 * Get all audit lines for an audit
 */
export async function getAuditLines(auditId: string): Promise<InventoryAuditLine[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_audit_lines')
      .select('*')
      .eq('audit_id', auditId)
      .order('line_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit lines:', error);
    throw new Error(`Failed to fetch audit lines: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================
// AUDIT LINE UPDATES
// =====================================================

/**
 * Update audit line with actual quantity
 */
export async function updateAuditLine(
  request: AuditLineUpdateRequest
): Promise<InventoryAuditLine> {
  try {
    const { line_id, actual_qty, variance_reason, variance_notes } = request;

    // Fetch line to calculate variance
    const { data: line, error: fetchError } = await supabase
      .from('inventory_audit_lines')
      .select('*, audit:inventory_audits!inner(status)')
      .eq('id', line_id)
      .single();

    if (fetchError) throw fetchError;
    if (!line) throw new Error('Audit line not found');

    // Check audit is in progress
    const auditData = line.audit as unknown as AuditRelation;
    if (auditData.status !== 'in_progress' && auditData.status !== 'initiated') {
      throw new Error('Cannot update audit line: audit is not in progress');
    }

    // Calculate variance
    const varianceQty = actual_qty - line.expected_qty;
    const requiresReason = Math.abs(varianceQty) > 0;

    // Validate variance reason if needed
    if (requiresReason && !variance_reason) {
      throw new Error('Variance reason is required when actual quantity differs from expected');
    }

    // Update line
    const { data: updatedLine, error: updateError } = await supabase
      .from('inventory_audit_lines')
      .update({
        actual_qty,
        variance_reason: requiresReason ? variance_reason : null,
        variance_notes: variance_notes || null,
        confirmed: true,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', line_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedLine;
  } catch (error) {
    console.error('Error updating audit line:', error);
    throw new Error(`Failed to update audit line: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add newly discovered package to audit
 */
export async function addPackageToAudit(
  request: AddPackageToAuditRequest
): Promise<InventoryAuditLine> {
  try {
    // Step 1: Check audit status
    const { data: audit, error: auditError } = await supabase
      .from('inventory_audits')
      .select('status, total_packages')
      .eq('id', request.audit_id)
      .single();

    if (auditError) throw auditError;
    if (audit.status !== 'in_progress' && audit.status !== 'initiated') {
      throw new Error('Cannot add package: audit is not in progress');
    }

    // Step 2: Check if package already exists in inventory
    const { data: existingItem } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('package_id', request.package_id)
      .maybeSingle();

    let inventoryItemId: string | null = existingItem?.id || null;

    // Step 3: Create inventory item if doesn't exist
    if (!inventoryItemId) {
      const { data: stageData, error: stageError } = await supabase
        .from('product_stages')
        .select('id')
        .eq('display_name', request.stage)
        .single();

      if (stageError) throw stageError;

      let batchId: string | null = null;
      if (request.batch) {
        const { data: batchData } = await supabase
          .from('batch_registry')
          .select('id')
          .eq('batch_number', request.batch)
          .eq('status', 'active')
          .maybeSingle();
        batchId = batchData?.id || null;
      }

      const { data: newItem, error: createError } = await supabase
        .from('inventory_items')
        .insert({
          package_id: request.package_id,
          product_name: request.product_name,
          strain: request.strain,
          batch: request.batch,
          batch_id: batchId,
          room: request.room,
          product_stage_id: stageData.id,
          on_hand_qty: request.actual_qty,
          unit: request.unit,
          category: getCategoryFromProductName(request.product_name)
        })
        .select('id')
        .single();

      if (createError) throw createError;
      inventoryItemId = newItem.id;
    }

    // Step 4: Get next line order
    const { data: maxOrderData } = await supabase
      .from('inventory_audit_lines')
      .select('line_order')
      .eq('audit_id', request.audit_id)
      .order('line_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.line_order || 0) + 1;

    // Step 5: Create audit line
    const { data: auditLine, error: lineError } = await supabase
      .from('inventory_audit_lines')
      .insert({
        audit_id: request.audit_id,
        inventory_item_id: inventoryItemId,
        package_id: request.package_id,
        product_name: request.product_name,
        strain: request.strain,
        batch: request.batch,
        room: request.room,
        stage: request.stage,
        expected_qty: 0, // New discovery, expected was 0
        actual_qty: request.actual_qty,
        unit: request.unit,
        variance_reason: request.variance_reason,
        variance_notes: request.variance_notes,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        line_order: nextOrder
      })
      .select()
      .single();

    if (lineError) throw lineError;

    // Step 6: Update audit total
    await supabase
      .from('inventory_audits')
      .update({
        total_packages: (audit.total_packages || 0) + 1
      })
      .eq('id', request.audit_id);

    return auditLine;
  } catch (error) {
    console.error('Error adding package to audit:', error);
    throw new Error(`Failed to add package: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================
// AUDIT COMPLETION
// =====================================================

/**
 * Complete audit and apply all adjustments
 */
export async function completeAudit(
  auditId: string,
  userId: string
): Promise<AuditCompletionSummary> {
  try {
    // Validate audit is ready for completion
    const audit = await getAuditById(auditId);
    if (!audit) throw new Error('Audit not found');

    if (audit.status !== 'in_progress' && audit.status !== 'initiated') {
      throw new Error('Audit is not in progress');
    }

    if (audit.unconfirmed_lines > 0) {
      throw new Error(`Cannot complete audit: ${audit.unconfirmed_lines} lines are not confirmed`);
    }

    // Call database function to apply adjustments
    const { data, error } = await supabase
      .rpc('fn_apply_audit_adjustments', {
        p_audit_id: auditId,
        p_user_id: userId
      });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    return {
      audit_id: auditId,
      audit_number: audit.audit_number,
      adjustments_applied: result.adjustments_applied || 0,
      variance_logs_created: result.variance_logs_created || 0,
      completed_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error completing audit:', error);
    throw new Error(`Failed to complete audit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancel audit
 */
export async function cancelAudit(
  request: AuditCancellationRequest,
  userId: string
): Promise<void> {
  try {
    const { audit_id, cancellation_reason } = request;

    // Validate audit status
    const { data: audit, error: fetchError } = await supabase
      .from('inventory_audits')
      .select('status')
      .eq('id', audit_id)
      .single();

    if (fetchError) throw fetchError;
    if (audit.status === 'completed') {
      throw new Error('Cannot cancel completed audit');
    }

    // Update audit status
    const { error: updateError } = await supabase
      .from('inventory_audits')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason,
        is_locked: false
      })
      .eq('id', audit_id);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error cancelling audit:', error);
    throw new Error(`Failed to cancel audit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================
// STAGE LOCKING
// =====================================================

/**
 * Check if stages are locked
 */
export async function checkStageLocked(
  stages: string[]
): Promise<StageLockStatus> {
  try {
    const { data, error } = await supabase
      .rpc('fn_check_stage_locked', {
        stages
      });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    return {
      is_locked: result?.is_locked || false,
      locked_by_audit: result?.locked_by_audit || null,
      audit_number: result?.audit_number || null
    };
  } catch (error) {
    console.error('Error checking stage lock:', error);
    return {
      is_locked: false,
      locked_by_audit: null,
      audit_number: null
    };
  }
}

/**
 * Lock stages for audit
 */
export async function lockStages(auditId: string, stages: string[]): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('fn_lock_inventory_stages', {
        p_audit_id: auditId,
        p_stages: stages
      });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error locking stages:', error);
    throw new Error(`Failed to lock stages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Unlock stages for audit
 */
export async function unlockStages(auditId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('fn_unlock_inventory_stages', {
        p_audit_id: auditId
      });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error unlocking stages:', error);
    throw new Error(`Failed to unlock stages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================
// AUDIT HISTORY
// =====================================================

/**
 * Get audit history with filters
 */
export async function getAuditHistory(
  filters: AuditHistoryFilters = {}
): Promise<InventoryAudit[]> {
  try {
    let query = supabase
      .from('inventory_audits')
      .select('*')
      .order('initiated_at', { ascending: false });

    // Apply filters
    if (filters.start_date) {
      query = query.gte('initiated_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('initiated_at', filters.end_date);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.initiated_by) {
      query = query.eq('initiated_by', filters.initiated_by);
    }

    if (filters.search) {
      query = query.ilike('audit_number', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit history:', error);
    throw new Error(`Failed to fetch audit history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
