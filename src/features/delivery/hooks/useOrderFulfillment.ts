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
  // Line item financials + weight
  unit_price: number | null;
  subtotal: number | null;
  weight_per_unit_g: number | null;
  line_demand_g: number | null;
  is_sample: boolean;
  // Batch metadata
  batch_id: string | null;
  batch_number: string | null;
  batch_grade_code: string | null;
  batch_grade_label: string | null;
  batch_grade_color: string | null;
  coa_status: string | null;
  thc_percentage: number | null;
}

export interface OrderGroup {
  order_id: string;
  order_number: string;
  customer_name: string;
  urgency: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
  is_sample: boolean;
  order_total: number;
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
  // Batch metadata
  coa_status: string | null;
  thc_percentage: number | null;
  grade_code: string | null;
  grade_label: string | null;
  grade_color: string | null;
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
  flower_binned: 'Raw (binned)',
  smalls_binned: 'Raw (binned)',
  flower_bucked: 'Bucked',
  smalls_bucked: 'Bucked',
  flower_bulk: 'Flower — Ready to Pack',
  smalls_bulk: 'Smalls — Ready to Pack',
  trim_bulk: 'Trim / Shake',
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
  if (category.includes('bulk')) return 'Send to Pack';
  if (category.includes('packaged')) return 'Assign to Order';
  return null;
}

export type DispatchContext = 'order' | 'stock_build';

export function getProcessingStageForCategory(
  category: string,
  context: DispatchContext = 'order',
): string | null {
  if (category.includes('binned')) return 'buck';
  if (category.includes('bucked')) return 'trim_to_stock';
  if (category.includes('bulk')) return context === 'stock_build' ? 'pack_to_stock' : 'package_to_order';
  return null;
}

// ─── COA helpers ────────────────────────────────────────────────────────────

export const COA_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'COA Active', color: 'text-cult-success bg-cult-success-muted border-cult-success/30' },
  coa_received: { label: 'COA Received', color: 'text-cult-success bg-cult-success-muted border-cult-success/30' },
  testing_in_progress: { label: 'Testing', color: 'text-cult-info bg-cult-info-muted border-cult-info/30' },
  pending_sampling: { label: 'Pending Sample', color: 'text-cult-warning bg-cult-warning-muted border-cult-warning/30' },
  curing: { label: 'Curing', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
  coa_failed: { label: 'COA Failed', color: 'text-cult-danger bg-cult-danger-muted border-cult-danger/30' },
};

export const GRADE_COLOR_MAP: Record<string, string> = {
  CULT: 'text-cult-success bg-cult-success-muted border-cult-success/30',
  B: 'text-cult-info bg-cult-info-muted border-cult-info/30',
  C: 'text-cult-warning bg-cult-warning-muted border-cult-warning/30',
  D: 'text-cult-danger bg-cult-danger-muted border-cult-danger/30',
  UNDEFINED: 'text-gray-400 bg-gray-500/15 border-gray-500/30',
};

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
      // Fetch line items with batch metadata from the view
      const { data, error: fetchError } = await supabase
        .from('v_production_queue_by_order')
        .select(`
          order_id, order_number, order_item_id, customer_name,
          strain_name, format_label, quantity,
          units_assigned, units_remaining, urgency,
          requested_delivery_date, scheduled_delivery_date,
          unit_price, subtotal, weight_per_unit_g, line_demand_g, is_sample,
          batch_number, batch_quality_grade, batch_grade_code, batch_grade_color
        `)
        .gt('units_remaining', 0)
        .order('urgency');

      if (fetchError) throw fetchError;

      // Get batch_ids and COA/THC data for line items that have batches
      const orderItemIds = (data || []).map((r: any) => r.order_item_id);
      let batchMetaMap = new Map<string, { batch_id: string; coa_status: string | null; thc_percentage: number | null }>();

      if (orderItemIds.length > 0) {
        const { data: itemBatches } = await supabase
          .from('order_items')
          .select('id, batch_id')
          .in('id', orderItemIds)
          .not('batch_id', 'is', null);

        if (itemBatches && itemBatches.length > 0) {
          const batchIds = [...new Set(itemBatches.map((ib: any) => ib.batch_id).filter(Boolean))];

          // Fetch COA status from batch_registry
          const { data: batchData } = await supabase
            .from('batch_registry')
            .select('id, coa_status')
            .in('id', batchIds);

          // Fetch THC from certificates_of_analysis
          const { data: coaData } = await supabase
            .from('certificates_of_analysis')
            .select('batch_id, thc_percentage')
            .in('batch_id', batchIds);

          const coaMap = new Map((batchData || []).map((b: any) => [b.id, b.coa_status]));
          const thcMap = new Map((coaData || []).map((c: any) => [c.batch_id, c.thc_percentage]));

          for (const ib of (itemBatches || [])) {
            batchMetaMap.set(ib.id, {
              batch_id: ib.batch_id,
              coa_status: coaMap.get(ib.batch_id) ?? null,
              thc_percentage: thcMap.get(ib.batch_id) ? Number(thcMap.get(ib.batch_id)) : null,
            });
          }
        }
      }

      const lineItems: OrderLineItem[] = (data || []).map((row: any) => {
        const meta = batchMetaMap.get(row.order_item_id);
        return {
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
          unit_price: row.unit_price ? Number(row.unit_price) : null,
          subtotal: row.subtotal ? Number(row.subtotal) : null,
          weight_per_unit_g: row.weight_per_unit_g ? Number(row.weight_per_unit_g) : null,
          line_demand_g: row.line_demand_g ? Number(row.line_demand_g) : null,
          is_sample: row.is_sample ?? false,
          batch_id: meta?.batch_id ?? null,
          batch_number: row.batch_number ?? null,
          batch_grade_code: row.batch_grade_code ?? null,
          batch_grade_label: row.batch_quality_grade ?? null,
          batch_grade_color: row.batch_grade_color ?? null,
          coa_status: meta?.coa_status ?? null,
          thc_percentage: meta?.thc_percentage ?? null,
        };
      });

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
        const orderTotal = items.reduce((sum, i) => sum + (i.subtotal ?? 0), 0);
        return {
          order_id: orderId,
          order_number: first.order_number,
          customer_name: first.customer_name,
          urgency: worstUrgency(items),
          requested_delivery_date: first.requested_delivery_date,
          scheduled_delivery_date: first.scheduled_delivery_date,
          is_sample: first.is_sample,
          order_total: orderTotal,
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

// ─── Inventory fetch — filtered by batch if assigned, otherwise by strain ───

export async function fetchStrainInventory(
  strainName: string,
  batchId?: string | null,
): Promise<InventoryPackage[]> {
  let batchIds: string[];
  let batchMap: Map<string, string>;

  if (batchId) {
    // If a batch is assigned to the line item, only show that batch's inventory
    const { data: batch, error: bErr } = await supabase
      .from('batch_registry')
      .select('id, batch_number')
      .eq('id', batchId)
      .single();

    if (bErr || !batch) return [];
    batchIds = [batch.id];
    batchMap = new Map([[batch.id, batch.batch_number]]);
  } else {
    // No batch assigned — show all active batches for this strain
    const { data: batches, error: batchErr } = await supabase
      .from('batch_registry')
      .select('id, batch_number')
      .eq('strain', strainName)
      .eq('status', 'active');

    if (batchErr) throw batchErr;
    if (!batches || batches.length === 0) return [];

    batchIds = batches.map(b => b.id);
    batchMap = new Map(batches.map(b => [b.id, b.batch_number]));
  }

  // Fetch batch metadata (COA status, grade)
  const [{ data: batchMeta }, { data: coaData }, { data: gradeData }] = await Promise.all([
    supabase
      .from('batch_registry')
      .select('id, coa_status, quality_grade_id')
      .in('id', batchIds),
    supabase
      .from('certificates_of_analysis')
      .select('batch_id, thc_percentage')
      .in('batch_id', batchIds),
    supabase
      .from('quality_grades')
      .select('id, code, label, color_class'),
  ]);

  const coaStatusMap = new Map((batchMeta || []).map((b: any) => [b.id, { coa_status: b.coa_status, grade_id: b.quality_grade_id }]));
  const thcMap = new Map((coaData || []).map((c: any) => [c.batch_id, Number(c.thc_percentage)]));
  const gradeMap = new Map((gradeData || []).map((g: any) => [g.id, { code: g.code, label: g.label, color: g.color_class }]));

  // Get all inventory items for these batches with available stock
  const { data: items, error: itemErr } = await supabase
    .from('inventory_items')
    .select('id, package_id, batch_id, category, on_hand_qty, available_qty, reserved_qty, unit, status, room')
    .in('batch_id', batchIds)
    .gt('on_hand_qty', 0)
    .not('category', 'is', null);

  if (itemErr) throw itemErr;

  return (items || [])
    .map((item: any) => {
      const batchInfo = coaStatusMap.get(item.batch_id);
      const grade = batchInfo?.grade_id ? gradeMap.get(batchInfo.grade_id) : null;
      return {
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
        coa_status: batchInfo?.coa_status ?? null,
        thc_percentage: thcMap.get(item.batch_id) ?? null,
        grade_code: grade?.code ?? null,
        grade_label: grade?.label ?? null,
        grade_color: grade?.color ?? null,
      };
    })
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
