import { useEffect, useState } from 'react';
import type { InventoryItem } from '../types';
import { getInventoryItems } from '@/features/inventory/services/inventory.service';

export const AVAILABLE_BUCKERS = ['Laura', 'Sam', 'Viana', 'Roxy', 'Justin', 'Greg', 'Andrew', 'Leo'];

export function useBuckingData() {
  const [binnedPackages, setBinnedPackages] = useState<InventoryItem[]>([]);
  const [availableStrains, setAvailableStrains] = useState<string[]>([]);

  const fetchBinnedPackages = async () => {
    const { data } = await getInventoryItems();
    const binnedData = (data || []).filter((item: any) =>
      item.product_name?.toLowerCase().includes('binned') &&
      item.available_qty > 0
    ).sort((a: any, b: any) => (a.strain || '').localeCompare(b.strain || ''));

    setBinnedPackages(binnedData);
    const uniqueStrains = [...new Set(binnedData.map(pkg => pkg.strain).filter(Boolean) as string[])];
    setAvailableStrains(uniqueStrains.sort());
  };

  useEffect(() => {
    fetchBinnedPackages();
  }, []);

  return {
    binnedPackages,
    availableStrains,
    fetchBinnedPackages
  };
}
