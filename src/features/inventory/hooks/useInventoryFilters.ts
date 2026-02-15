import { useMemo } from 'react';
import type { InventoryItem, InventoryStats, BulkStats, PackagedStats, AllInventoryStats } from '../types';

/**
 * useInventoryFilters
 *
 * Filters and categorizes inventory items by stage (binned, bucked, bulk, packaged).
 * Calculates statistics for each stage and provides a unified view of all inventory.
 *
 * @param {InventoryItem[]} inventoryItems - All inventory items
 * @returns {Object} Filtered items and statistics for each stage, plus all items combined
 *
 * @example
 * const { allItems, binnedItems, bulkItems, packagedItems, bulkStats, allInventoryStats } = useInventoryFilters(items);
 */

/**
 * Determines which stage an inventory item belongs to based on its category field.
 *
 * @param {InventoryItem} item - The inventory item to categorize
 * @returns {'binned' | 'bucked' | 'bulk' | 'packaged' | null} The stage, or null if unknown
 */
export function getItemStage(item: InventoryItem): 'binned' | 'bucked' | 'bulk' | 'packaged' | null {
  const category = item.category?.toLowerCase() || '';
  const productName = item.product_name?.toLowerCase() || '';
  const sku = item.sku || '';

  // Check for packaged first (most specific)
  if (
    category.includes('prepack') ||
    category.includes('packaged') ||
    sku.includes('-000')
  ) {
    return 'packaged';
  }

  // Check for binned
  if (category.includes('binned') || productName.includes('binned')) {
    return 'binned';
  }

  // Check for bucked
  if (category.includes('bucked') || productName.includes('bucked')) {
    return 'bucked';
  }

  // Check for bulk
  if (
    category.includes('bulk') ||
    (productName.includes('bulk') && !productName.includes('bucked') && !productName.includes('binned'))
  ) {
    return 'bulk';
  }

  return null;
}

export function useInventoryFilters(inventoryItems: InventoryItem[]) {
  // Filter binned inventory
  const binnedItems = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        item.category?.toLowerCase().includes('binned') ||
        item.product_name?.toLowerCase().includes('binned')
    );
  }, [inventoryItems]);

  // Filter bucked inventory
  const buckedItems = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        item.category?.toLowerCase().includes('bucked') ||
        item.product_name?.toLowerCase().includes('bucked')
    );
  }, [inventoryItems]);

  // Filter bulk inventory
  const bulkItems = useMemo(() => {
    return inventoryItems.filter(
      (item) => {
        const category = item.category?.toLowerCase() || '';
        const productName = item.product_name?.toLowerCase() || '';
        return (
          category.includes('bulk') ||
          (productName.includes('bulk') &&
            !productName.includes('bucked') &&
            !productName.includes('binned'))
        );
      }
    );
  }, [inventoryItems]);

  // Filter packaged inventory
  const packagedItems = useMemo(() => {
    return inventoryItems.filter(
      (item) => {
        const category = item.category?.toLowerCase() || '';
        return (
          category.includes('prepack') ||
          category.includes('packaged') ||
          item.sku?.includes('-000')
        );
      }
    );
  }, [inventoryItems]);

  // Calculate binned stats
  const binnedStats: InventoryStats = useMemo(() => {
    const totalWeight = binnedItems.reduce(
      (sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0),
      0
    );
    const strains = new Set(binnedItems.map((item) => item.strain).filter(Boolean));

    return {
      totalPackages: binnedItems.length,
      totalWeight,
      strainCount: strains.size,
    };
  }, [binnedItems]);

  // Calculate bucked stats
  const buckedStats: InventoryStats = useMemo(() => {
    const totalWeight = buckedItems.reduce(
      (sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0),
      0
    );
    const strains = new Set(buckedItems.map((item) => item.strain).filter(Boolean));

    return {
      totalPackages: buckedItems.length,
      totalWeight,
      strainCount: strains.size,
    };
  }, [buckedItems]);

  // Calculate bulk stats
  const bulkStats: BulkStats = useMemo(() => {
    const flower = bulkItems
      .filter(
        (item) => {
          const category = item.category?.toLowerCase() || '';
          const productName = item.product_name?.toLowerCase() || '';
          return (
            category.includes('flower') &&
            category.includes('bulk') &&
            !productName.includes('smalls') &&
            !productName.includes('trim')
          );
        }
      )
      .reduce((sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0), 0);

    const smalls = bulkItems
      .filter((item) => item.product_name?.toLowerCase().includes('smalls'))
      .reduce((sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0), 0);

    const trim = bulkItems
      .filter(
        (item) => {
          const category = item.category?.toLowerCase() || '';
          const productName = item.product_name?.toLowerCase() || '';
          return category.includes('trim') || productName.includes('trim');
        }
      )
      .reduce((sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0), 0);

    return {
      totalPackages: bulkItems.length,
      flower,
      smalls,
      trim,
    };
  }, [bulkItems]);

  // Calculate packaged stats
  const packagedStats: PackagedStats = useMemo(() => {
    const totalUnits = packagedItems.reduce(
      (sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0),
      0
    );

    const total_3_5g = packagedItems
      .filter((item) => item.sku?.includes('-0003') || item.product_name?.includes('3.5g'))
      .reduce((sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0), 0);

    const total_14g = packagedItems
      .filter((item) => item.sku?.includes('-0002') || item.product_name?.includes('14g'))
      .reduce((sum, item) => sum + (parseFloat(item.available_qty?.toString() || '0') || 0), 0);

    return {
      totalUnits,
      total_3_5g,
      total_14g,
    };
  }, [packagedItems]);

  // All items combined (includes all stages)
  const allItems = useMemo(() => {
    return inventoryItems;
  }, [inventoryItems]);

  // Calculate comprehensive stats across all stages
  const allInventoryStats: AllInventoryStats = useMemo(() => {
    const totalPackages = inventoryItems.length;
    const totalWeight = inventoryItems.reduce(
      (sum, item) => {
        const stage = getItemStage(item);
        // Only count weight-based stages (binned, bucked, bulk)
        if (stage === 'binned' || stage === 'bucked' || stage === 'bulk') {
          return sum + (parseFloat(item.available_qty?.toString() || '0') || 0);
        }
        return sum;
      },
      0
    );
    const strains = new Set(inventoryItems.map((item) => item.strain).filter(Boolean));

    return {
      totalPackages,
      totalWeight,
      binnedCount: binnedItems.length,
      buckedCount: buckedItems.length,
      bulkCount: bulkItems.length,
      packagedCount: packagedItems.length,
      strainCount: strains.size,
    };
  }, [inventoryItems, binnedItems.length, buckedItems.length, bulkItems.length, packagedItems.length]);

  return {
    allItems,
    binnedItems,
    buckedItems,
    bulkItems,
    packagedItems,
    allInventoryStats,
    binnedStats,
    buckedStats,
    bulkStats,
    packagedStats,
  };
}
