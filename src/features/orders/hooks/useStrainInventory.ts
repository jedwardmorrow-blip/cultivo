import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StrainInventorySummary {
  strain: string;
  active_batch_count: number;
  packaged_units_available: number;
  bulk_flower_grams: number;
  bulk_smalls_grams: number;
  bulk_trim_grams: number;
  bucked_grams: number;
  total_available_grams: number;
  most_recent_harvest: string | null;
  has_active_batches: boolean;
}

export interface BatchStageDetail {
  batch_id: string;
  batch_number: string;
  strain: string;
  lifecycle_state: string;
  harvest_date: string | null;
  stage: string;
  allocated_weight_grams: number;
  available_weight_grams: number;
  // Enriched fields from batch_availability_enriched view
  grade_code: string | null;
  grade_label: string | null;
  grade_color: string | null;
  has_coa: boolean;
  thc_percentage: number | null;
  thca_percentage: number | null;
  total_cannabinoids: number | null;
  coa_pass_fail: string | null;
}

export interface CustomerStrainHistory {
  strain: string;
  total_quantity: number;
  last_order_date: string;
  order_count: number;
}

export interface CustomerProductHistory {
  product_id: string;
  total_quantity: number;
  last_order_date: string;
  order_count: number;
}

// ─── useStrainInventorySummary ───────────────────────────────────────────────

export function useStrainInventorySummary() {
  const [strains, setStrains] = useState<StrainInventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('strain_inventory_summary')
        .select('*')
        .order('strain');

      if (fetchError) throw fetchError;

      setStrains((data || []).map((row: any) => ({
        strain: row.strain,
        active_batch_count: Number(row.active_batch_count),
        packaged_units_available: Number(row.packaged_units_available),
        bulk_flower_grams: Number(row.bulk_flower_grams),
        bulk_smalls_grams: Number(row.bulk_smalls_grams),
        bulk_trim_grams: Number(row.bulk_trim_grams),
        bucked_grams: Number(row.bucked_grams),
        total_available_grams: Number(row.total_available_grams),
        most_recent_harvest: row.most_recent_harvest,
        has_active_batches: row.has_active_batches,
      })));
    } catch (err: any) {
      console.error('Error fetching strain inventory:', err);
      setError(err.message || 'Failed to load strain inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { strains, loading, error, refresh };
}

// ─── useStrainBatchAvailability ──────────────────────────────────────────────

export function useStrainBatchAvailability(strain: string | null) {
  const [batches, setBatches] = useState<BatchStageDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!strain) {
      setBatches([]);
      return;
    }

    async function fetchBatches() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('batch_availability_enriched')
          .select('*')
          .eq('strain', strain)
          .order('stage')
          .order('harvest_date');

        if (error) throw error;

        const mapped = (data || []).map((row: any) => ({
          batch_id: row.batch_id,
          batch_number: row.batch_number || '',
          strain: row.strain || strain,
          lifecycle_state: row.lifecycle_state || '',
          harvest_date: row.harvest_date || null,
          stage: row.stage,
          allocated_weight_grams: Number(row.allocated_weight_grams),
          available_weight_grams: Number(row.available_weight_grams),
          grade_code: row.grade_code || null,
          grade_label: row.grade_label || null,
          grade_color: row.grade_color || null,
          has_coa: row.has_coa || false,
          thc_percentage: row.thc_percentage != null ? Number(row.thc_percentage) : null,
          thca_percentage: row.thca_percentage != null ? Number(row.thca_percentage) : null,
          total_cannabinoids: row.total_cannabinoids != null ? Number(row.total_cannabinoids) : null,
          coa_pass_fail: row.coa_pass_fail || null,
        }));

        setBatches(mapped);
      } catch (err) {
        console.error('Error fetching batch availability:', err);
        setBatches([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBatches();
  }, [strain]);

  return { batches, loading };
}

// ─── useCustomerOrderHistory ─────────────────────────────────────────────────

export function useCustomerOrderHistory(customerId: string | null) {
  const [strainHistory, setStrainHistory] = useState<Map<string, CustomerStrainHistory>>(new Map());
  const [productHistory, setProductHistory] = useState<Map<string, CustomerProductHistory>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setStrainHistory(new Map());
      setProductHistory(new Map());
      return;
    }

    async function fetchHistory() {
      setLoading(true);
      try {
        // Get order items for this customer's orders in the last 90 days
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            product_id,
            quantity,
            strain,
            created_at,
            orders!inner(
              customer_id,
              created_at
            )
          `)
          .eq('orders.customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Build strain history map
        const strainMap = new Map<string, CustomerStrainHistory>();
        const productMap = new Map<string, CustomerProductHistory>();

        for (const item of (data || [])) {
          const strain = item.strain;
          const productId = item.product_id;
          const orderDate = (item.orders as any)?.created_at || item.created_at;

          // Strain-level aggregation
          if (strain) {
            const existing = strainMap.get(strain);
            if (existing) {
              existing.total_quantity += Number(item.quantity);
              existing.order_count += 1;
              if (orderDate > existing.last_order_date) {
                existing.last_order_date = orderDate;
              }
            } else {
              strainMap.set(strain, {
                strain,
                total_quantity: Number(item.quantity),
                last_order_date: orderDate,
                order_count: 1,
              });
            }
          }

          // Product-level aggregation
          if (productId) {
            const existing = productMap.get(productId);
            if (existing) {
              existing.total_quantity += Number(item.quantity);
              existing.order_count += 1;
              if (orderDate > existing.last_order_date) {
                existing.last_order_date = orderDate;
              }
            } else {
              productMap.set(productId, {
                product_id: productId,
                total_quantity: Number(item.quantity),
                last_order_date: orderDate,
                order_count: 1,
              });
            }
          }
        }

        setStrainHistory(strainMap);
        setProductHistory(productMap);
      } catch (err) {
        console.error('Error fetching customer order history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [customerId]);

  return { strainHistory, productHistory, loading };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDaysAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 90) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ─── Types: Demand Pressure ─────────────────────────────────────────────────

export interface PendingOrderDetail {
  order_id: string;
  customer_name: string;
  status: string;
  quantity: number;
  product_name: string;
  product_category: string;
  size_label: string;
  weight_grams: number;
}

export interface SizeBreakdownItem {
  size_label: string;
  unit_count: number;
  weight_grams: number;
}

export interface StrainDemandPressure {
  strain: string;
  pending_order_count: number;
  total_committed_quantity: number;
  total_committed_weight_grams: number;
  pending_order_details: PendingOrderDetail[];
  size_breakdown: SizeBreakdownItem[];
}

// ─── useStrainDemandPressure ────────────────────────────────────────────────

export function useStrainDemandPressure() {
  const [demandMap, setDemandMap] = useState<Map<string, StrainDemandPressure>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDemand() {
      try {
        const { data, error } = await supabase
          .from('strain_demand_pressure')
          .select('*');

        if (error) throw error;

        const map = new Map<string, StrainDemandPressure>();
        for (const row of (data || [])) {
          // Aggregate size_breakdown by size_label (view returns per-line-item, we need totals)
          const rawBreakdown: any[] = row.size_breakdown || [];
          const sizeMap = new Map<string, SizeBreakdownItem>();
          for (const entry of rawBreakdown) {
            const key = entry.size_label || 'Other';
            const existing = sizeMap.get(key);
            if (existing) {
              existing.unit_count += Number(entry.unit_count);
              existing.weight_grams += Number(entry.weight_grams);
            } else {
              sizeMap.set(key, {
                size_label: key,
                unit_count: Number(entry.unit_count),
                weight_grams: Number(entry.weight_grams),
              });
            }
          }

          map.set(row.strain, {
            strain: row.strain,
            pending_order_count: Number(row.pending_order_count),
            total_committed_quantity: Number(row.total_committed_quantity),
            total_committed_weight_grams: Number(row.total_committed_weight_grams || 0),
            pending_order_details: (row.pending_order_details || []).map((d: any) => ({
              order_id: d.order_id,
              customer_name: d.customer_name || 'Unknown',
              status: d.status,
              quantity: Number(d.quantity),
              product_name: d.product_name,
              product_category: d.product_category || '',
              size_label: d.size_label || 'Other',
              weight_grams: Number(d.weight_grams || 0),
            })),
            size_breakdown: Array.from(sizeMap.values()).sort((a, b) => b.weight_grams - a.weight_grams),
          });
        }
        setDemandMap(map);
      } catch (err) {
        console.error('Error fetching demand pressure:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDemand();
  }, []);

  return { demandMap, loading };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAvailabilityLevel(summary: StrainInventorySummary): 'high' | 'medium' | 'low' | 'out' {
  if (summary.total_available_grams === 0) return 'out';
  if (summary.packaged_units_available > 20 || summary.total_available_grams > 2000) return 'high';
  if (summary.packaged_units_available > 5 || summary.total_available_grams > 500) return 'medium';
  return 'low';
}
