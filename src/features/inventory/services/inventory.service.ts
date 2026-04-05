import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

/**
 * Inventory Service
 *
 * Centralized service for all inventory database operations.
 */

/**
 * Fetches all inventory items from the database
 *
 * @param options - Optional configuration
 * @param options.includeEmpty - If true, includes packages with 0 quantity (default: false)
 * @returns Promise<{ data: InventoryItem[] | null; error: any }>
 * @example
 * // Default: excludes empty packages
 * const { data, error } = await getInventoryItems();
 *
 * // Include empty packages for audit/admin views
 * const { data, error } = await getInventoryItems({ includeEmpty: true });
 */
export async function getInventoryItems(options?: { includeEmpty?: boolean }) {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*');

    // By default, filter out empty packages
    if (!options?.includeEmpty) {
      query = query.gt('on_hand_qty', 0);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load inventory items');
    return { data: null, error };
  }
}

/**
 * Fetches all inventory items without a row cap — for audit/export paths only
 */
export async function getInventoryItemsForExport(options?: { includeEmpty?: boolean }) {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*');

    if (!options?.includeEmpty) {
      query = query.gt('on_hand_qty', 0);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to export inventory items');
    return { data: null, error };
  }
}

/**
 * Fetches the most recent inventory snapshot from CSV import
 *
 * @returns Promise<{ data: InventorySnapshot | null; error: any }>
 * @description Used to track inventory state at specific points in time
 * @example
 * const { data: snapshot, error } = await getLatestSnapshot();
 * if (snapshot) {
 *   console.log(`Latest snapshot from: ${snapshot.import_date}`);
 * }
 */
export async function getLatestSnapshot() {
  try {
    const { data, error } = await supabase
      .from('inventory_snapshots')
      .select('*')
      .order('import_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load latest snapshot');
    return { data: null, error };
  }
}

/**
 * Searches inventory items by strain name, package ID, or batch ID
 *
 * @param searchTerm - Search query string (case-insensitive)
 * @returns Promise<{ data: InventoryItem[] | null; error: any }>
 * @description Performs fuzzy search across strain name (via FK join), package_id, and batch_id fields
 * @example
 * const { data, error } = await searchInventory('GSC');
 * // Returns all items matching 'GSC' in strain, package, or batch ID
 */
export async function searchInventory(searchTerm: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        strain:strains(id, name, abbreviation)
      `)
      .or(`package_id.ilike.%${searchTerm}%,batch_id.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to search inventory');
    return { data: null, error };
  }
}

/**
 * Creates a new inventory snapshot record from CSV import
 *
 * @param snapshotData - Snapshot metadata including import_date, source_file, notes
 * @returns Promise<{ data: InventorySnapshot | null; error: any }>
 * @description Creates audit trail for inventory imports
 * @example
 * const snapshot = await createInventorySnapshot({
 *   import_date: new Date().toISOString(),
 *   source_file: 'inventory_2025_11_12.csv',
 *   notes: 'Weekly inventory update'
 * });
 */
export async function createInventorySnapshot(snapshotData: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_snapshots')
      .insert(snapshotData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create inventory snapshot');
    return { data: null, error };
  }
}

/**
 * Bulk inserts multiple inventory items in a single transaction
 *
 * @param items - Array of inventory item objects to insert
 * @returns Promise<{ data: InventoryItem[] | null; error: any }>
 * @description Used during CSV imports to efficiently insert large batches
 * @example
 * const items = [
 *   { package_id: 'PKG-001', strain_name: 'GSC', quantity_grams: 1000, ... },
 *   { package_id: 'PKG-002', strain_name: 'GG4', quantity_grams: 500, ... }
 * ];
 * const { data, error } = await bulkInsertInventoryItems(items);
 */
export async function bulkInsertInventoryItems(items: any[]) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(items)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to bulk insert inventory items');
    return { data: null, error };
  }
}

/**
 * Fetches a single inventory item by its package ID
 *
 * @param packageId - Unique package identifier (e.g., '251112-GSC-BF-001')
 * @returns Promise<{ data: InventoryItem | null; error: any }>
 * @description Uses maybeSingle() to return null if package not found (no error)
 * @example
 * const { data: item, error } = await getInventoryItemByPackageId('251112-GSC-BF-001');
 * if (item) {
 *   console.log(`Found: ${item.strain_name}, ${item.quantity_grams}g`);
 * }
 */
export async function getInventoryItemByPackageId(packageId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('package_id', packageId)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load inventory item');
    return { data: null, error };
  }
}

/**
 * Saves internal label
 */
export async function saveInternalLabel(labelData: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_internal_labels')
      .insert(labelData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to save internal label');
    return { data: null, error };
  }
}

/**
 * Fetches internal labels for inventory item
 */
export async function getInternalLabels(inventoryItemId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_internal_labels')
      .select('*')
      .eq('inventory_item_id', inventoryItemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load internal labels');
    return { data: null, error };
  }
}

/**
 * Fetches inventory items available for conversion with optional stage filtering
 *
 * @param stage - Optional stage filter: 'bulk', 'bucked', or 'binned'
 * @returns Promise<{ data: InventoryItem[] | null; error: any }>
 * @description Returns only items with available_qty > 0, filtered by processing stage
 * @example
 * // Get all bulk items available for conversion
 * const { data: bulkItems } = await getConversionLots('bulk');
 *
 * // Get all available items (no filter)
 * const { data: allItems } = await getConversionLots();
 */
export async function getConversionLots(stage?: string) {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*')
      .gt('available_qty', 0);

    // Filter by stage if provided
    if (stage) {
      if (stage === 'bulk') {
        query = query.in('category', ['Flower - Bulk', 'Trim - Bulk']);
      } else if (stage === 'bucked') {
        query = query.eq('category', 'Flower - Bucked');
      } else if (stage === 'binned') {
        query = query.eq('category', 'Flower - Binned');
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load conversion lots');
    return { data: null, error };
  }
}

/**
 * Fetches projected inventory requirements based on pending orders
 *
 * @returns Promise<{ data: ProjectedRequirement[] | null; error: any }>
 * @description Queries projected_inventory_requirements view for production planning
 * @example
 * const { data: requirements, error } = await getInventoryRequirements();
 * // Shows what inventory is needed to fulfill outstanding orders
 * requirements.forEach(req => {
 *   console.log(`${req.strain}: ${req.total_needed}g by ${req.earliest_delivery_date}`);
 * });
 */
export async function getInventoryRequirements() {
  try {
    const { data, error } = await supabase
      .from('projected_inventory_requirements')
      .select('*')
      .order('earliest_delivery_date', { ascending: true, nullsFirst: false })
      .order('strain', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load inventory requirements');
    return { data: null, error };
  }
}
