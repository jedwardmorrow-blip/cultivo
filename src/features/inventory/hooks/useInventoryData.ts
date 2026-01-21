import { useState, useEffect, useCallback } from 'react';
import type { InventoryItem, InventorySnapshot } from '../types';
import { getInventoryItems, getLatestSnapshot } from '../services/inventory.service';
import { supabase } from '@/lib/supabase';

/**
 * useInventoryData
 *
 * Fetches inventory items and snapshot metadata from Supabase with real-time updates.
 * Provides inventory data across all stages (binned, bucked, bulk, packaged).
 * Automatically refreshes when conversions are finalized or inventory is modified.
 *
 * @param options - Optional configuration
 * @param options.includeEmpty - If true, includes packages with 0 quantity (default: false)
 * @returns {Object} inventoryItems - Array of all inventory items
 * @returns {Object|null} latestSnapshot - Most recent inventory snapshot metadata
 * @returns {boolean} loading - Loading state
 * @returns {Function} fetchInventory - Manual refresh function
 *
 * @example
 * // Default: excludes empty packages, auto-updates on changes
 * const { inventoryItems, loading } = useInventoryData();
 *
 * // Include empty packages for admin views
 * const { inventoryItems, loading } = useInventoryData({ includeEmpty: true });
 */

export function useInventoryData(options?: { includeEmpty?: boolean }) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

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
      if (!silent) {
        setLoading(false);
      }
    }
  }, [options?.includeEmpty]);

  // Initial fetch
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Real-time subscription to conversion_packages table
  // (when conversions are finalized, new inventory packages are created)
  useEffect(() => {
    const channel = supabase
      .channel('inventory-conversion-packages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversion_packages',
        },
        (payload) => {
          console.log('Conversion package change detected, refreshing inventory:', payload);
          fetchInventory(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to conversion packages real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to conversion packages updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  // Real-time subscription to inventory_items table
  // (for direct inventory changes: adjustments, audits, etc.)
  useEffect(() => {
    const channel = supabase
      .channel('inventory-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
        },
        (payload) => {
          console.log('Inventory item change detected, refreshing inventory:', payload);
          fetchInventory(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to inventory items real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to inventory items updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  return {
    inventoryItems,
    latestSnapshot,
    loading,
    fetchInventory,
  };
}
