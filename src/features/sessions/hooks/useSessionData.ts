import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { InventoryItem, ConsolidatedPackages } from '../types';

export function useSessionData() {
  const [buckedPackages, setBuckedPackages] = useState<InventoryItem[]>([]);
  const [availableStrains, setAvailableStrains] = useState<string[]>([]);
  const [consolidatedPackages, setConsolidatedPackages] = useState<ConsolidatedPackages>({});

  useEffect(() => {
    fetchBuckedPackages();
    fetchConsolidatedPackages();
  }, []);

  const fetchBuckedPackages = async () => {
    try {
      // Fetch inventory items with strain relationship via FK
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          strain:strains(id, name, abbreviation)
        `)
        .ilike('product_name', '%bucked%')
        .gt('available_qty', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch bucked packages:', error);
        setBuckedPackages([]);
        setAvailableStrains([]);
        return;
      }

      // Filter items that have valid strain data (defensive check)
      // Ensure we only include complete, valid entries
      const buckedData = (data || [])
        .filter((item: any) =>
          item &&                           // Item exists
          typeof item === 'object' &&       // Is an object
          item.strain &&                    // Has strain join
          item.strain.name &&               // Strain has name
          item.batch_id &&                  // Has batch_id
          item.package_id &&                // Has package_id
          typeof item.on_hand_qty === 'number' // Has numeric quantity
        )
        .sort((a: any, b: any) =>
          (a.strain?.name || '').localeCompare(b.strain?.name || '')
        );

      setBuckedPackages(buckedData);

      // Extract unique strain names from joined strain data
      const strains = Array.from(
        new Set(
          buckedData
            .map((p: any) => p.strain?.name)
            .filter(Boolean) as string[]
        )
      ).sort();

      setAvailableStrains(strains);
    } catch (error) {
      console.error('Error fetching bucked packages:', error);
      setBuckedPackages([]);
      setAvailableStrains([]);
    }
  };

  const fetchConsolidatedPackages = async () => {
    const { data, error } = await supabase
      .from('trim_sessions')
      .select(`
        id,
        consolidated_packages:consolidated_packages(package_id, product_type)
      `)
      .eq('session_status', 'completed')
      .not('consolidated_package_id', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const packages: ConsolidatedPackages = {};
      data.forEach((source: any) => {
        const pkg = source.consolidated_packages;
        if (pkg) {
          if (pkg.product_type === 'Flower') packages.flower = pkg.package_id;
          else if (pkg.product_type === 'Smalls') packages.smalls = pkg.package_id;
          else if (pkg.product_type === 'Trim') packages.trim = pkg.package_id;
        }
      });
      setConsolidatedPackages(packages);
    }
  };

  return {
    buckedPackages,
    availableStrains,
    consolidatedPackages,
    fetchBuckedPackages,
  };
}
