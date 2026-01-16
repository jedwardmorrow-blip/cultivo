import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '../types';
import { getInventoryItems } from '@/features/inventory/services/inventory.service';

/**
 * Hook for fetching and managing packaging-eligible inventory
 *
 * Filters inventory to only show packages that:
 * - Are Bulk Flower or Bulk Smalls
 * - Have available_qty > 0 (after accounting for reservations)
 * - Are properly staged for packaging
 *
 * Subscribes to real-time inventory updates to reflect reservation changes
 */
export function usePackagingData() {
  const [inventoryPackages, setInventoryPackages] = useState<InventoryItem[]>([]);
  const [availableStrains, setAvailableStrains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventoryPackages = async () => {
    setLoading(true);
    const { data } = await getInventoryItems();
    const filteredData = (data || []).filter((pkg: any) => {
      const name = pkg.product_name?.toLowerCase() || '';
      return (
        (name.includes('bulk') && (name.includes('flower') || name.includes('smalls'))) &&
        (pkg.available_qty || 0) > 0
      );
    }).sort((a: any, b: any) => {
      const strainCompare = (a.strain || '').localeCompare(b.strain || '');
      if (strainCompare !== 0) return strainCompare;
      return (a.batch || '').localeCompare(b.batch || '');
    });

    setInventoryPackages(filteredData);
    const uniqueStrains = [...new Set(filteredData.map(pkg => pkg.strain).filter(Boolean) as string[])];
    setAvailableStrains(uniqueStrains.sort());
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryPackages();

    // Subscribe to inventory_items changes to reflect real-time reservations
    const subscription = supabase
      .channel('packaging_inventory_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items',
        filter: 'product_name=ilike.*Bulk*'
      }, () => {
        fetchInventoryPackages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    inventoryPackages,
    availableStrains,
    fetchInventoryPackages,
    loading
  };
}
