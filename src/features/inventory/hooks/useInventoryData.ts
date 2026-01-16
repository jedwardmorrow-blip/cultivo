import { useState, useEffect, useCallback } from 'react';
import type { InventoryItem, InventorySnapshot } from '../types';
import { getInventoryItems, getLatestSnapshot } from '../services/inventory.service';

/**
 * useInventoryData
 *
 * Fetches inventory items and snapshot metadata from Supabase.
 * Provides inventory data across all stages (binned, bucked, bulk, packaged).
 *
 * @param options - Optional configuration
 * @param options.includeEmpty - If true, includes packages with 0 quantity (default: false)
 * @returns {Object} inventoryItems - Array of all inventory items
 * @returns {Object|null} latestSnapshot - Most recent inventory snapshot metadata
 * @returns {boolean} loading - Loading state
 * @returns {Function} fetchInventory - Manual refresh function
 *
 * @example
 * // Default: excludes empty packages
 * const { inventoryItems, loading } = useInventoryData();
 *
 * // Include empty packages for admin views
 * const { inventoryItems, loading } = useInventoryData({ includeEmpty: true });
 */

export function useInventoryData(options?: { includeEmpty?: boolean }) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch inventory items with optional empty package filter
      const { data: items } = await getInventoryItems(options);

      // Fetch latest snapshot
      const { data: snapshot } = await getLatestSnapshot();

      setInventoryItems(items || []);
      setLatestSnapshot(snapshot);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setInventoryItems([]);
      setLatestSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [options?.includeEmpty]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    inventoryItems,
    latestSnapshot,
    loading,
    fetchInventory,
  };
}
