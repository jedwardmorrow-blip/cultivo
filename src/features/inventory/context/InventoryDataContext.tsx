import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { InventoryItem, InventorySnapshot } from '../types';
import { getInventoryItems, getLatestSnapshot } from '../services/inventory.service';
import { supabase } from '@/lib/supabase';

interface InventoryDataContextValue {
  inventoryItems: InventoryItem[];
  latestSnapshot: InventorySnapshot | null;
  loading: boolean;
  fetchInventory: (silent?: boolean) => Promise<void>;
}

const InventoryDataContext = createContext<InventoryDataContextValue | null>(null);

export function InventoryDataProvider({ children }: { children: ReactNode }) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: items } = await getInventoryItems();
      const { data: snapshot } = await getLatestSnapshot();
      setInventoryItems(items || []);
      setLatestSnapshot(snapshot);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setInventoryItems([]);
      setLatestSnapshot(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    const channel = supabase
      .channel('inventory-ctx-conversion-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversion_packages' }, () => {
        fetchInventory(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInventory]);

  useEffect(() => {
    const channel = supabase
      .channel('inventory-ctx-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchInventory(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInventory]);

  return (
    <InventoryDataContext.Provider value={{ inventoryItems, latestSnapshot, loading, fetchInventory }}>
      {children}
    </InventoryDataContext.Provider>
  );
}

export function useSharedInventoryData() {
  const context = useContext(InventoryDataContext);
  if (!context) {
    throw new Error('useSharedInventoryData must be used within InventoryDataProvider');
  }
  return context;
}
