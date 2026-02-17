import { supabase } from '@/lib/supabase';
import { standardizeProductName, previewTransformations } from '@/lib/productNaming';
import type { InventoryItem, InventoryNamingValidation, NamingNormalizationResult } from '../types';

/**
 * Inventory Naming Service
 *
 * Handles product name standardization for inventory items to ensure consistency
 * with the products catalog naming convention.
 */

/**
 * Validate current inventory naming against standard conventions
 * Returns items that need updating
 */
export async function validateInventoryNaming(): Promise<InventoryNamingValidation[]> {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('id, package_id, product_name, category, strain, available_qty')
    .order('package_id');

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }

  if (!items || items.length === 0) {
    return [];
  }

  const validations: InventoryNamingValidation[] = items.map(item => {
    const standardized = standardizeProductName(
      item.product_name || '',
      item.category || '',
      item.strain || ''
    );

    const needsUpdate = standardized !== item.product_name;

    return {
      package_id: item.package_id,
      current_name: item.product_name || '',
      standardized_name: standardized,
      is_valid: !needsUpdate,
      needs_update: needsUpdate,
      category: item.category || '',
      strain: item.strain || ''
    };
  });

  return validations.filter(v => v.needs_update);
}

/**
 * Preview name transformations without applying changes
 */
export async function previewNamingTransformations() {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('package_id, product_name, category, strain')
    .order('category, strain');

  if (error) {
    console.error('Error fetching inventory for preview:', error);
    throw error;
  }

  if (!items) return [];

  return previewTransformations(items);
}

/**
 * Normalize all inventory product names to match standard convention
 */
export async function normalizeInventoryNames(): Promise<NamingNormalizationResult> {
  const validations = await validateInventoryNaming();

  if (validations.length === 0) {
    return {
      total_items: 0,
      updated_count: 0,
      skipped_count: 0,
      failed_count: 0,
      validations: [],
      errors: []
    };
  }

  let updated = 0;
  let failed = 0;
  const errors: Array<{ package_id: string; error: string }> = [];

  for (const validation of validations) {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ product_name: validation.standardized_name })
        .eq('package_id', validation.package_id);

      if (error) {
        console.error(`Error updating ${validation.package_id}:`, error);
        failed++;
        errors.push({
          package_id: validation.package_id,
          error: error.message
        });
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Exception updating ${validation.package_id}:`, err);
      failed++;
      errors.push({
        package_id: validation.package_id,
        error: (err as Error).message
      });
    }
  }

  return {
    total_items: validations.length,
    updated_count: updated,
    skipped_count: 0,
    failed_count: failed,
    validations,
    errors
  };
}

/**
 * Normalize a single inventory item's product name
 */
export async function normalizeSingleItemName(packageId: string): Promise<boolean> {
  const { data: item, error: fetchError } = await supabase
    .from('inventory_items')
    .select('product_name, category, strain')
    .eq('package_id', packageId)
    .maybeSingle();

  if (fetchError || !item) {
    console.error('Error fetching item:', fetchError);
    return false;
  }

  const standardized = standardizeProductName(
    item.product_name || '',
    item.category || '',
    item.strain || ''
  );

  if (standardized === item.product_name) {
    return true;
  }

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ product_name: standardized })
    .eq('package_id', packageId);

  if (updateError) {
    console.error('Error updating item:', updateError);
    return false;
  }

  return true;
}

/**
 * Validate inventory item naming during upload/import
 */
export function validateAndStandardizeImportItem(item: {
  product_name: string;
  category: string;
  strain: string;
}): { product_name: string; is_standardized: boolean } {
  if (!item.product_name || !item.category || !item.strain) {
    return { product_name: item.product_name, is_standardized: false };
  }

  const standardized = standardizeProductName(
    item.product_name,
    item.category,
    item.strain
  );

  return {
    product_name: standardized,
    is_standardized: standardized !== item.product_name
  };
}

/**
 * Get summary statistics about naming compliance
 */
export async function getNamingComplianceStats(): Promise<{
  total: number;
  compliant: number;
  non_compliant: number;
  compliance_rate: number;
}> {
  const validations = await validateInventoryNaming();
  const { data: allItems, error } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;

  const total = allItems?.length || 0;
  const nonCompliant = validations.length;
  const compliant = total - nonCompliant;

  return {
    total,
    compliant,
    non_compliant: nonCompliant,
    compliance_rate: total > 0 ? (compliant / total) * 100 : 100
  };
}
