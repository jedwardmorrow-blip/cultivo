import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProcessingStage = 'buck' | 'trim_to_stock' | 'package_to_order';
export type TreatmentType =
  | 'hand_trim_jars'
  | 'machine_trim_flower'
  | 'machine_trim_bulk'
  | 'hand_spin_solid_spinner'
  | 'machine_smalls_drum'
  | 'jar_pack'
  | 'mylar_pack'
  | 'bulk_wholesale';

export type DispatchStatus = 'queued' | 'in_progress' | 'complete' | 'cancelled';

export interface DispatchItem {
  id: string;
  batch_registry_id: string;
  order_item_id: string | null;
  delivery_route_id: string | null;
  processing_stage: ProcessingStage;
  treatment_type: TreatmentType;
  quantity_g: number | null;
  quantity_units_target: number | null;
  quantity_units_completed: number | null;
  priority: number;
  status: DispatchStatus;
  ready_by: string | null;
  assigned_staff_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined from batch_registry
  batch_number: string;
  strain: string;
  lifecycle_state: string;
  room: string | null;
  // Joined from order_items (when package_to_order)
  order_number: string | null;
  customer_name: string | null;
}

export interface SupplyTote {
  batch_id: string;
  batch_number: string;
  strain: string;
  lifecycle_state: string;
  room: string | null;
  // Inventory quantities at each stage
  binned_g: number;
  bucked_g: number;
  bulk_available_g: number;
  packaged_units: number;
  total_available_g: number;
  is_quarantined: boolean;
  coa_status: string | null;
}

export interface DemandLine {
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

export interface CreateDispatchPayload {
  batch_registry_id: string;
  order_item_id?: string;
  processing_stage: ProcessingStage;
  treatment_type: TreatmentType;
  quantity_g?: number;
  quantity_units_target?: number;
  priority: number;
  ready_by?: string;
}

// ─── Label maps ─────────────────────────────────────────────────────────────

export const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  buck: 'Buck',
  trim_to_stock: 'Trim to Stock',
  package_to_order: 'Package to Order',
};

export const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  hand_trim_jars: 'Hand Trim → Jars',
  machine_trim_flower: 'Machine Trim → Flower',
  machine_trim_bulk: 'Machine Trim → Bulk',
  hand_spin_solid_spinner: 'Hand Spin (Solid Spinner)',
  machine_smalls_drum: 'Machine Smalls Drum',
  jar_pack: 'Jar Pack',
  mylar_pack: 'Mylar Pack',
  bulk_wholesale: 'Bulk Wholesale',
};

// Treatment types available per processing stage
export const STAGE_TREATMENTS: Record<ProcessingStage, TreatmentType[]> = {
  buck: ['hand_spin_solid_spinner', 'machine_smalls_drum'],
  trim_to_stock: ['hand_trim_jars', 'machine_trim_flower', 'machine_trim_bulk'],
  package_to_order: ['jar_pack', 'mylar_pack', 'bulk_wholesale'],
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProductionDispatch() {
  const [dispatched, setDispatched] = useState<DispatchItem[]>([]);
  const [supply, setSupply] = useState<SupplyTote[]>([]);
  const [demand, setDemand] = useState<DemandLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dispatchRes, batchRes, demandRes] = await Promise.all([
        // Dispatched items (queued + in_progress) joined with batch + order context
        supabase
          .from('production_dispatch_items')
          .select(`
            id, batch_registry_id, order_item_id, delivery_route_id,
            processing_stage, treatment_type, quantity_g,
            quantity_units_target, quantity_units_completed,
            priority, status, ready_by, assigned_staff_id,
            created_by_user_id, created_at, updated_at,
            batch_registry!inner(batch_number, strain, lifecycle_state, room)
          `)
          .in('status', ['queued', 'in_progress'])
          .order('priority', { ascending: true }),

        // Active batches with inventory breakdown for supply panel
        supabase
          .from('batch_registry')
          .select(`
            id, batch_number, strain, lifecycle_state, room, is_quarantined, coa_status,
            inventory_items!batch_id(on_hand_qty, category)
          `)
          .eq('status', 'active')
          .in('lifecycle_state', ['drying', 'bucked', 'in_trim', 'bulk_available', 'in_packaging'])
          .order('batch_number'),

        // Open demand from production queue view
        supabase
          .from('v_production_queue_by_order')
          .select(`
            order_id, order_number, order_item_id, customer_name,
            strain_name, format_label, quantity,
            units_assigned, units_remaining, urgency,
            requested_delivery_date, scheduled_delivery_date
          `)
          .gt('units_remaining', 0)
          .order('urgency'),
      ]);

      if (dispatchRes.error) throw dispatchRes.error;
      if (demandRes.error) throw demandRes.error;

      // Shape dispatched items
      const items: DispatchItem[] = (dispatchRes.data || []).map((row: any) => ({
        id: row.id,
        batch_registry_id: row.batch_registry_id,
        order_item_id: row.order_item_id,
        delivery_route_id: row.delivery_route_id,
        processing_stage: row.processing_stage as ProcessingStage,
        treatment_type: row.treatment_type as TreatmentType,
        quantity_g: row.quantity_g,
        quantity_units_target: row.quantity_units_target,
        quantity_units_completed: row.quantity_units_completed,
        priority: row.priority,
        status: row.status as DispatchStatus,
        ready_by: row.ready_by,
        assigned_staff_id: row.assigned_staff_id,
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        batch_number: row.batch_registry?.batch_number ?? '',
        strain: row.batch_registry?.strain ?? '',
        lifecycle_state: row.batch_registry?.lifecycle_state ?? '',
        room: row.batch_registry?.room ?? null,
        order_number: null,
        customer_name: null,
      }));
      setDispatched(items);

      // Shape supply totes — aggregate inventory_items by category per batch
      const totes: SupplyTote[] = (batchRes.data || []).map((b: any) => {
        const inv: { on_hand_qty: number; category: string }[] = b.inventory_items || [];
        const sumCat = (...prefixes: string[]) =>
          inv.filter((i) => prefixes.some((p) => i.category?.startsWith(p))).reduce((acc, i) => acc + (Number(i.on_hand_qty) || 0), 0);

        const binned_g = sumCat('flower_binned');
        const bucked_g = sumCat('flower_bucked', 'smalls_bucked');
        const bulk_available_g = sumCat('flower_bulk', 'smalls_bulk', 'trim_bulk');
        const packaged_g = sumCat('flower_packaged');

        return {
          batch_id: b.id,
          batch_number: b.batch_number,
          strain: b.strain,
          lifecycle_state: b.lifecycle_state,
          room: b.room,
          binned_g,
          bucked_g,
          bulk_available_g,
          packaged_units: Math.floor(packaged_g / 3.5),
          total_available_g: binned_g + bucked_g + bulk_available_g,
          is_quarantined: b.is_quarantined,
          coa_status: b.coa_status,
        };
      });
      setSupply(totes);

      // Shape demand
      const demandLines: DemandLine[] = (demandRes.data || []).map((row: any) => ({
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
      setDemand(demandLines);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatch data');
      console.error('useProductionDispatch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('production_dispatch_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_dispatch_items' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const createDispatchItem = useCallback(async (payload: CreateDispatchPayload): Promise<{ error: string | null }> => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('production_dispatch_items').insert({
        batch_registry_id: payload.batch_registry_id,
        order_item_id: payload.order_item_id ?? null,
        processing_stage: payload.processing_stage,
        treatment_type: payload.treatment_type,
        quantity_g: payload.quantity_g ?? null,
        quantity_units_target: payload.quantity_units_target ?? null,
        priority: payload.priority,
        status: 'queued',
        ready_by: payload.ready_by ?? null,
      });
      if (error) return { error: error.message };
      await fetchAll();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to create dispatch item' };
    } finally {
      setSubmitting(false);
    }
  }, [fetchAll]);

  const stats = {
    queued: dispatched.filter((d) => d.status === 'queued').length,
    inProgress: dispatched.filter((d) => d.status === 'in_progress').length,
    totalDemandLines: demand.length,
    supplyBatches: supply.length,
  };

  return {
    dispatched,
    supply,
    demand,
    loading,
    error,
    submitting,
    stats,
    reload: fetchAll,
    createDispatchItem,
  };
}
