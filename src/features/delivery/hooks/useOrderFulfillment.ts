import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderLineItem {
  order_id: string;
  order_number: string;
  order_item_id: string;
  customer_name: string;
  strain_name: string;
  format_label: string;
  quantity: number;
  units_assigned: number;
  units_remaining: number;
  urgency: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
}

export interface OrderGroup {
  order_id: string;
  order_number: string;
  customer_name: string;
  urgency: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
  line_items: OrderLineItem[];
  total_items: number;
  assigned_items: number;
  processing_items: number;
}

export interface InventoryPackage {
  id: string;
  package_id: string;
  batch_id: string;
  batch_number: string;
  category: string;
  on_hand_qty: number;
  available_qty: number;
  reserved_qty: number;
  unit: string;
  stage_label: string;
  status: string;
  room: string | null;
}

export interface DispatchItemStatus {
  id: string;
  batch_registry_id: string;
  order_item_id: string | null;
  processing_stage: string;
  treatment_type: string;
  status: string;
  quantity_g: number | null;
  batch_number: string;
}

// ─── Stage derivation ───────────────────────────────────────────────────────

const CATEGORY_TO_STAGE: Record<string, string> = {
  flower_binned: 'Bin (raw)',
  smalls_binned: 'Bin (raw)',
  flower_bucked: 'Bucked',
  smalls_bucked: 'Bucked',
  flower_bulk: 'Bulk (trimmed)',
  smalls_bulk: 'Bulk (trimmed)',
  trim_bulk: 'Trim bulk',
  flower_packaged: 'Packaged',
  smalls_packaged: 'Packaged',
};

export function getStageLabel(category: string): string {
  return CATEGORY_TO_STAGE[category] ?? category;
}

export function getStageSortOrder(category: string): number {
  if (category.includes('binned')) return 0;
  if (category.includes('bucked')) return 1;
  if (category.includes('bulk')) return 2;
  if (category.includes('packaged')) return 3;
  return 4;
}

export function getNextAction(category: string): string | null {
  if (category.includes('binned')) return 'Send to Bucking';
  if (category.includes('bucked')) return 'Send to Trim';
  if (category.includes('bulk')) return 'Send to Packaging';
  if (category.includes('packaged')) return 'Assign to Order';
  return null;
}

export function getProcessingStageForCategory(category: string): string | null {
  if (category.includes('binned')) return 'buck';
  if (category.includes('bucked')) return 'trim_to_stock';
  if (category.includes('bulk')) return 'package_to_order';
  return null;
}

// ─── Urgency helpers ────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<string, number> = {
  overdue: 0,
  urgent: 1,
  soon: 2,
  normal: 3,
  no_date: 4,
};

function worstUrgency(items: OrderLineItem[]): string {
  let worst = 'no_date';
  for (const item of items) {
    if ((URGENCY_ORDER[item.urgency] ?? 4) < (URGENCY_ORDER[worst] ?? 4)) {
      worst = item.urgency;
    }
  }
  return worst;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOrderFulfillment() {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('v_production_queue_by_order')
        .select(`
          order_id, order_number, order_item_id, customer_name,
          strain_name, format_label, quantity,
          units_assigned, units_remaining, urgency,
          requested_delivery_date, scheduled_delivery_date
        `)
        .gt('units_remaining', 0)
        .order('urgency');

      if (fetchError) throw fetchError;

      const lineItems: OrderLineItem[] = (data || []).map((row: any) => ({
        order_id: row.order_id,
        order_number: row.order_number,
        order_item_id: row.order_item_id,
        customer_name: row.customer_name,
        strain_name: row.strain_name,
        format_label: row.format_label,
        quantity: row.quantity,
        units_assigned: row.units_assigned,
        units_remaining: row.units_remaining,
        urgency: row.urgency,
        requested_delivery_date: row.requested_delivery_date,
        scheduled_delivery_date: row.scheduled_delivery_date,
      }));

      // Group by order
      const orderMap = new Map<string, OrderLineItem[]>();
      for (const item of lineItems) {
        const existing = orderMap.get(item.order_id) || [];
        existing.push(item);
        orderMap.set(item.order_id, existing);
      }

      const grouped: OrderGroup[] = Array.from(orderMap.entries()).map(([orderId, items]) => {
        const first = items[0];
        const assigned = items.filter(i => i.units_remaining === 0).length;
        return {
          order_id: orderId,
          order_number: first.order_number,
          customer_name: first.customer_name,
          urgency: worstUrgency(items),
          requested_delivery_date: first.requested_delivery_date,
          scheduled_delivery_date: first.scheduled_delivery_date,
          line_items: items,
          total_items: items.length,
          assigned_items: assigned,
          processing_items: items.length - assigned,
        };
      });

      // Sort: overdue first, then urgent, then by date
      grouped.sort((a, b) => {
        const ua = URGENCY_ORDER[a.urgency] ?? 4;
        const ub = URGENCY_ORDER[b.urgency] ?? 4;
        if (ua !== ub) return ua - ub;
        const da = a.requested_delivery_date ?? '9999';
        const db = b.requested_delivery_date ?? '9999';
        return da.localeCompare(db);
      });

      setOrders(grouped);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
      console.error('useOrderFulfillment error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Real-time: refresh when dispatch items or order items change
    const channel = supabase
      .channel('order_fulfillment_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_dispatch_items' }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_assignments' }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return { orders, loading, error, reload: fetchOrders };
}

// ─── Inventory fetch for a strain ───────────────────────────────────────────

export async function fetchStrainInventory(strainName: string): Promise<InventoryPackage[]> {
  // Get batch IDs that match this strain
  const { data: batches, error: batchErr } = await supabase
    .from('batch_registry')
    .select('id, batch_number')
    .eq('strain', strainName)
    .eq('status', 'active');

  if (batchErr) throw batchErr;
  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map(b => b.id);
  const batchMap = new Map(batches.map(b => [b.id, b.batch_number]));

  // Get all inventory items for these batches with available stock
  const { data: items, error: itemErr } = await supabase
    .from('inventory_items')
    .select('id, package_id, batch_id, category, on_hand_qty, available_qty, reserved_qty, unit, status, room')
    .in('batch_id', batchIds)
    .gt('on_hand_qty', 0)
    .not('category', 'is', null);

  if (itemErr) throw itemErr;

  return (items || [])
    .map((item: any) => ({
      id: item.id,
      package_id: item.package_id || item.id,
      batch_id: item.batch_id,
      batch_number: batchMap.get(item.batch_id) || '',
      category: item.category,
      on_hand_qty: item.on_hand_qty,
      available_qty: item.available_qty ?? item.on_hand_qty,
      reserved_qty: item.reserved_qty ?? 0,
      unit: item.unit || 'g',
      stage_label: getStageLabel(item.category),
      status: item.status || 'available',
      room: item.room,
    }))
    .sort((a, b) => getStageSortOrder(a.category) - getStageSortOrder(b.category));
}

// ─── Dispatch items for an order ────────────────────────────────────────────

export async function fetchOrderDispatchItems(orderItemIds: string[]): Promise<DispatchItemStatus[]> {
  if (orderItemIds.length === 0) return [];

  const { data, error } = await supabase
    .from('production_dispatch_items')
    .select(`
      id, batch_registry_id, order_item_id, processing_stage, treatment_type,
      status, quantity_g,
      batch_registry!inner(batch_number)
    `)
    .in('order_item_id', orderItemIds)
    .in('status', ['pending', 'in_progress']);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    batch_registry_id: row.batch_registry_id,
    order_item_id: row.order_item_id,
    processing_stage: row.processing_stage,
    treatment_type: row.treatment_type,
    status: row.status,
    quantity_g: row.quantity_g,
    batch_number: row.batch_registry?.batch_number ?? '',
  }));
}
