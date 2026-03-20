/**
 * Combine Packages Service
 *
 * Backend service for combining multiple inventory packages into a single package.
 * Handles validation, combination logic, variance tracking, and history.
 *
 * @module combine.service
 */

import { supabase } from '@/lib/supabase';
import type {
  CombinePackagesRequest,
  CombineResult,
  CombineValidationResult,
  CombineSummary,
  CombineHistoryEntry,
  CombineHistoryFilters,
  SelectedPackage,
  VarianceReason
} from '../types/combine.types';
import type { BatchRelation, ProductStageRelation, UserRelation } from '@/types';

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate packages for combination
 *
 * Checks that packages are compatible for combining:
 * - Same batch
 * - Same product
 * - Same stage
 * - All have quantity > 0
 * - Minimum 2 packages
 */
export async function validatePackagesForCombine(
  packageIds: string[]
): Promise<CombineValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check minimum count
    if (packageIds.length < 2) {
      errors.push('At least 2 packages required for combination');
      return {
        is_valid: false,
        errors,
        warnings,
        can_proceed: false
      };
    }

    // Fetch all packages
    const { data: packages, error: fetchError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        package_id,
        batch_id,
        product_id,
        product_stage_id,
        on_hand_qty,
        unit,
        strain,
        product_name,
        batches!inner(batch_number),
        product_stages!inner(name)
      `)
      .in('id', packageIds);

    if (fetchError) throw fetchError;
    if (!packages || packages.length === 0) {
      errors.push('No packages found with provided IDs');
      return {
        is_valid: false,
        errors,
        warnings,
        can_proceed: false
      };
    }

    // Check all packages found
    if (packages.length !== packageIds.length) {
      errors.push(`${packageIds.length} packages requested, only ${packages.length} found`);
    }

    const firstPackage = packages[0];
    const batch_id = firstPackage.batch_id;
    const product_id = firstPackage.product_id;
    const product_stage_id = firstPackage.product_stage_id;
    const unit = firstPackage.unit;

    let total_qty = 0;

    // Validate each package
    for (const pkg of packages) {
      // Check quantity
      if (pkg.on_hand_qty <= 0) {
        errors.push(`Package ${pkg.package_id} has zero or negative quantity`);
      }

      // Check batch match
      if (pkg.batch_id !== batch_id) {
        errors.push(`Package ${pkg.package_id} has different batch (${pkg.batch_id} vs ${batch_id})`);
      }

      // Check product match
      if (pkg.product_id !== product_id) {
        errors.push(`Package ${pkg.package_id} has different product`);
      }

      // Check stage match
      if (pkg.product_stage_id !== product_stage_id) {
        errors.push(`Package ${pkg.package_id} has different stage`);
      }

      // Check unit match
      if (pkg.unit !== unit) {
        errors.push(`Package ${pkg.package_id} has different unit (${pkg.unit} vs ${unit})`);
      }

      total_qty += pkg.on_hand_qty;
    }

    // Build summary
    const firstWithRelations = firstPackage as typeof firstPackage & {
      batches: BatchRelation;
      product_stages: ProductStageRelation;
    };
    const summary: CombineSummary = {
      total_packages: packages.length,
      total_qty,
      unit,
      batch_number: firstWithRelations.batches.batch_number,
      product_name: firstPackage.product_name,
      stage_name: firstWithRelations.product_stages.name,
      strain: firstPackage.strain,
      packages: packages.map(pkg => ({
        id: pkg.id,
        package_id: pkg.package_id,
        qty: pkg.on_hand_qty,
        unit: pkg.unit
      }))
    };

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      can_proceed: errors.length === 0,
      summary
    };
  } catch (error) {
    console.error('Error validating packages:', error);
    errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      is_valid: false,
      errors,
      warnings,
      can_proceed: false
    };
  }
}

// =====================================================
// COMBINATION
// =====================================================

/**
 * Combine inventory packages
 *
 * Calls database function to combine packages with proper movement tracking
 */
export async function combineInventoryPackages(
  request: CombinePackagesRequest
): Promise<CombineResult> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
        new_package_id: request.new_package_id,
        new_item_id: '',
        combined_qty: 0,
        unit: '',
        source_package_count: request.source_package_ids.length,
        expected_qty: 0,
        variance_qty: 0,
        variance_percentage: 0,
        batch_id: '',
        product_id: '',
        strain: '',
        product_name: ''
      };
    }

    // Call database function
    const { data, error } = await supabase.rpc('fn_combine_inventory_packages', {
      p_source_package_ids: request.source_package_ids,
      p_new_package_id: request.new_package_id,
      p_user_id: userId,
      p_variance_reason: request.variance_reason || null,
      p_notes: request.notes || null
    });

    if (error) {
      throw new Error(`Failed to combine packages: ${error.message}`);
    }

    // Parse result
    const result: CombineResult = {
      success: data.success || false,
      new_package_id: data.new_package_id || request.new_package_id,
      new_item_id: data.new_item_id || '',
      combined_qty: data.combined_qty || 0,
      unit: data.unit || '',
      source_package_count: data.source_package_count || 0,
      expected_qty: data.expected_qty || 0,
      variance_qty: data.variance_qty || 0,
      variance_percentage: data.variance_percentage || 0,
      batch_id: data.batch_id || '',
      product_id: data.product_id || '',
      strain: data.strain || '',
      product_name: data.product_name || '',
      error: data.error,
      error_detail: data.error_detail
    };

    return result;
  } catch (error) {
    console.error('Error combining packages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      new_package_id: request.new_package_id,
      new_item_id: '',
      combined_qty: 0,
      unit: '',
      source_package_count: request.source_package_ids.length,
      expected_qty: 0,
      variance_qty: 0,
      variance_percentage: 0,
      batch_id: '',
      product_id: '',
      strain: '',
      product_name: ''
    };
  }
}

// =====================================================
// PACKAGE ID GENERATION
// =====================================================

/**
 * Generate suggested package ID for combined package
 *
 * Format: {batch_prefix}-COMBINED-{timestamp}
 * Example: 251110-GSC-COMBINED-001
 */
export async function generateCombinedPackageId(
  batch_id: string
): Promise<string> {
  try {
    // Get batch number
    const { data: batch, error: batchError } = await supabase
      .from('batch_registry')
      .select('batch_number')
      .eq('id', batch_id)
      .single();

    if (batchError || !batch) {
      throw new Error('Batch not found');
    }

    // Find next available number
    const pattern = `${batch.batch_number}-COMBINED-%`;
    const { data: existing, error: existError } = await supabase
      .from('inventory_items')
      .select('package_id')
      .like('package_id', pattern)
      .order('package_id', { ascending: false })
      .limit(1);

    if (existError) {
      throw existError;
    }

    let nextNumber = 1;
    if (existing && existing.length > 0) {
      // Extract number from last package ID
      const lastId = existing[0].package_id;
      const match = lastId.match(/-COMBINED-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `${batch.batch_number}-COMBINED-${paddedNumber}`;
  } catch (error) {
    console.error('Error generating package ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-6);
    return `COMBINED-${timestamp}`;
  }
}

// =====================================================
// HISTORY
// =====================================================

/**
 * Get combine history with filters
 *
 * Queries variance_log for combine_packages entries
 */
export async function getCombineHistory(
  filters: CombineHistoryFilters = {},
  limit = 100,
  offset = 0
): Promise<CombineHistoryEntry[]> {
  try {
    let query = supabase
      .from('variance_log')
      .select(`
        id,
        timestamp,
        user_id,
        package_id,
        expected_qty,
        actual_qty,
        variance_qty,
        variance_percentage,
        unit,
        variance_reason,
        notes,
        strain,
        batch,
        product_name,
        inventory_stage,
        user:user_profiles(full_name)
      `)
      .eq('source_type', 'combine_packages')
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date);
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.batch_id) {
      query = query.eq('batch', filters.batch_id);
    }

    if (filters.strain) {
      query = query.ilike('strain', `%${filters.strain}%`);
    }

    if (filters.stage) {
      query = query.eq('inventory_stage', filters.stage);
    }

    if (filters.search) {
      query = query.or(`package_id.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    // Transform to history entries
    return (data || []).map(entry => {
      const entryWithUser = entry as typeof entry & { user: UserRelation | null };
      // Parse source_package_count from notes if available
      const sourceCountMatch = entry.notes?.match(/Combined from (\d+) source packages/);
      const source_package_count = sourceCountMatch ? parseInt(sourceCountMatch[1], 10) : 0;

      return {
        id: entry.id,
        timestamp: entry.timestamp,
        user_id: entry.user_id || '',
        user_full_name: entryWithUser.user?.full_name || null,
        new_package_id: entry.package_id,
        source_package_count,
        combined_qty: entry.actual_qty,
        expected_qty: entry.expected_qty,
        variance_qty: entry.variance_qty,
        variance_percentage: entry.variance_percentage,
        unit: entry.unit,
        variance_reason: entry.variance_reason as VarianceReason | null,
        notes: entry.notes || null,
        batch_number: entry.batch || '',
        strain: entry.strain || '',
        product_name: entry.product_name || '',
        stage_name: entry.inventory_stage || ''
      };
    });
  } catch (error) {
    console.error('Error fetching combine history:', error);
    throw new Error(`Failed to fetch combine history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get count of combine history entries
 */
export async function getCombineHistoryCount(
  filters: CombineHistoryFilters = {}
): Promise<number> {
  try {
    let query = supabase
      .from('variance_log')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', 'combine_packages');

    if (filters.start_date) query = query.gte('timestamp', filters.start_date);
    if (filters.end_date) query = query.lte('timestamp', filters.end_date);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.batch_id) query = query.eq('batch', filters.batch_id);
    if (filters.strain) query = query.ilike('strain', `%${filters.strain}%`);
    if (filters.stage) query = query.eq('inventory_stage', filters.stage);
    if (filters.search) {
      query = query.or(`package_id.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting combine count:', error);
    return 0;
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Fetch full package details for combining
 */
export async function getPackagesForCombine(
  packageIds: string[]
): Promise<SelectedPackage[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        id,
        package_id,
        on_hand_qty,
        unit,
        batch_id,
        product_id,
        product_stage_id,
        strain,
        product_name,
        batches!inner(batch_number),
        product_stages!inner(name)
      `)
      .in('id', packageIds)
      .gt('on_hand_qty', 0);

    if (error) throw error;

    return (data || []).map(pkg => {
      const pkgWithRelations = pkg as typeof pkg & {
        batches: BatchRelation;
        product_stages: ProductStageRelation;
      };
      return {
        id: pkg.id,
        package_id: pkg.package_id,
        on_hand_qty: pkg.on_hand_qty,
        unit: pkg.unit,
        batch_id: pkg.batch_id,
        batch_number: pkgWithRelations.batches.batch_number,
        product_id: pkg.product_id,
        product_name: pkg.product_name,
        product_stage_id: pkg.product_stage_id,
        stage_name: pkgWithRelations.product_stages.name,
        strain: pkg.strain
      };
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw new Error(`Failed to fetch packages: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
