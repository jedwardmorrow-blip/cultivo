import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type OmnibarResultType = 'package' | 'batch' | 'strain' | 'sku';

export interface OmnibarResult {
  type: OmnibarResultType;
  id: string;
  /** For packages, this is the parent batch_id (for drawer routing) */
  batchId?: string;
  title: string;
  subtitle: string;
  meta?: string;
}

/**
 * Cross-entity search for the Inventory Command Center omnibar.
 * Queries packages, batches, strains, and SKUs in parallel with 200ms debounce.
 */
export function useOmnibarSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmnibarResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const trimmed = q.trim();

      try {
        const [pkgRes, batchRes, strainRes, skuRes] = await Promise.all([
          // Packages by package_id prefix
          supabase
            .from('internal_packaged_inventory')
            .select('id, package_id, batch_id, on_hand_qty, products(name, sku)')
            .ilike('package_id', `${trimmed}%`)
            .gt('on_hand_qty', 0)
            .limit(5),

          // Batches by batch_code prefix
          supabase
            .from('v_batch_lifecycle')
            .select('batch_id, batch_code, strain_name, lifecycle_state')
            .ilike('batch_code', `${trimmed}%`)
            .limit(5),

          // Strains by name or abbreviation (fuzzy contains)
          supabase
            .from('strains')
            .select('id, name, abbreviation, category')
            .or(`name.ilike.%${trimmed}%,abbreviation.ilike.%${trimmed}%`)
            .limit(5),

          // SKUs by sku prefix
          supabase
            .from('products')
            .select('id, name, sku')
            .ilike('sku', `${trimmed}%`)
            .eq('is_active', true)
            .limit(5),
        ]);

        const mapped: OmnibarResult[] = [];

        // Packages
        (pkgRes.data ?? []).forEach((p: any) => {
          mapped.push({
            type: 'package',
            id: p.id,
            batchId: p.batch_id,
            title: p.package_id,
            subtitle: p.products?.name ?? 'Unknown product',
            meta: `${p.on_hand_qty} units`,
          });
        });

        // Batches
        (batchRes.data ?? []).forEach((b: any) => {
          mapped.push({
            type: 'batch',
            id: b.batch_id,
            batchId: b.batch_id,
            title: b.batch_code,
            subtitle: b.strain_name,
            meta: b.lifecycle_state,
          });
        });

        // Strains
        (strainRes.data ?? []).forEach((s: any) => {
          mapped.push({
            type: 'strain',
            id: s.id,
            title: s.name,
            subtitle: s.abbreviation ? `${s.abbreviation} · ${s.category ?? ''}` : s.category ?? '',
          });
        });

        // SKUs
        (skuRes.data ?? []).forEach((p: any) => {
          mapped.push({
            type: 'sku',
            id: p.id,
            title: p.sku ?? p.name,
            subtitle: p.name,
          });
        });

        setResults(mapped);
      } catch (err) {
        console.error('[useOmnibarSearch] Failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, results, loading, search, clear };
}
