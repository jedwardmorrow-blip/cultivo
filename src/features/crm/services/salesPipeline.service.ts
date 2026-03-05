import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

export interface PipelineStageRow {
  batch_id: string;
  batch_number: string;
  strain: string;
  stage: string;
  sort_order: number;
  weight_grams: number;
  unit_count: number;
  available_weight_grams: number;
  item_count: number;
}

export interface DemandRow {
  strain: string;
  order_count: number;
  total_qty: number;
  total_revenue: number;
}

export interface BatchGradeRow {
  strain: string;
  grade_code: string | null;
  batch_count: number;
}

export interface InventoryCategoryRow {
  strain: string;
  category: string;
  total_qty: number;
  item_count: number;
}

export interface BatchDetailRow {
  id: string;
  batch_number: string;
  strain: string;
  harvest_date: string | null;
  lifecycle_state: string;
  created_at: string;
  grade_code: string | null;
  grade_label: string | null;
  thc_percentage: number | null;
}

export async function getPipelineStages(): Promise<{ data: PipelineStageRow[] | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('v_batch_stage_balances')
      .select('batch_id, batch_number, strain, stage, sort_order, weight_grams, unit_count, available_weight_grams, item_count')
      .not('stage', 'is', null)
      .order('strain')
      .order('batch_number')
      .order('sort_order');

    if (error) throw error;
    return { data: data as PipelineStageRow[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load pipeline stages');
    return { data: null, error };
  }
}

export async function getActiveDemand(): Promise<{ data: DemandRow[] | null; error: unknown }> {
  try {
    const { data, error } = await supabase.rpc('get_active_demand_by_strain');

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('order_items')
        .select(`
          strain,
          quantity,
          subtotal,
          order_id,
          orders!inner(id, status, archived, test_mode)
        `)
        .eq('is_sample', false);

      if (fallbackError) throw fallbackError;

      const strainMap = new Map<string, { order_ids: Set<string>; total_qty: number; total_revenue: number }>();
      for (const row of fallbackData || []) {
        const order = (row as any).orders;
        if (!order || order.archived || order.test_mode) continue;
        if (['delivered', 'cancelled'].includes(order.status)) continue;

        const strain = row.strain || 'Unknown';
        if (!strainMap.has(strain)) {
          strainMap.set(strain, { order_ids: new Set(), total_qty: 0, total_revenue: 0 });
        }
        const entry = strainMap.get(strain)!;
        entry.order_ids.add(row.order_id);
        entry.total_qty += Number(row.quantity) || 0;
        entry.total_revenue += Number(row.subtotal) || 0;
      }

      const result: DemandRow[] = [];
      for (const [strain, entry] of strainMap) {
        result.push({
          strain,
          order_count: entry.order_ids.size,
          total_qty: entry.total_qty,
          total_revenue: entry.total_revenue,
        });
      }
      return { data: result, error: null };
    }

    return { data: data as DemandRow[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load active demand');
    return { data: null, error };
  }
}

export async function getInventoryByCategory(): Promise<{ data: InventoryCategoryRow[] | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('strain, category, on_hand_qty')
      .gt('on_hand_qty', 0)
      .eq('test_mode', false);

    if (error) throw error;

    const map = new Map<string, Map<string, { total_qty: number; item_count: number }>>();
    for (const row of data || []) {
      const strain = row.strain || 'Unknown';
      if (!map.has(strain)) map.set(strain, new Map());
      const catMap = map.get(strain)!;
      const cat = row.category || 'other';
      if (!catMap.has(cat)) catMap.set(cat, { total_qty: 0, item_count: 0 });
      const entry = catMap.get(cat)!;
      entry.total_qty += Number(row.on_hand_qty) || 0;
      entry.item_count += 1;
    }

    const result: InventoryCategoryRow[] = [];
    for (const [strain, catMap] of map) {
      for (const [category, entry] of catMap) {
        result.push({ strain, category, ...entry });
      }
    }
    return { data: result, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load inventory categories');
    return { data: null, error };
  }
}

export async function getBatchGrades(): Promise<{ data: BatchGradeRow[] | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('batch_registry')
      .select('strain, quality_grade_id, lifecycle_state')
      .not('lifecycle_state', 'in', '("depleted","archived")');

    if (error) throw error;

    const { data: grades } = await supabase
      .from('quality_grades')
      .select('id, code')
      .eq('is_active', true);

    const gradeMap = new Map<string, string>();
    for (const g of grades || []) gradeMap.set(g.id, g.code);

    const strainGradeMap = new Map<string, Map<string, number>>();
    for (const row of data || []) {
      const strain = row.strain || 'Unknown';
      const code = row.quality_grade_id ? (gradeMap.get(row.quality_grade_id) || 'UNDEFINED') : 'UNDEFINED';
      if (!strainGradeMap.has(strain)) strainGradeMap.set(strain, new Map());
      const gMap = strainGradeMap.get(strain)!;
      gMap.set(code, (gMap.get(code) || 0) + 1);
    }

    const result: BatchGradeRow[] = [];
    for (const [strain, gMap] of strainGradeMap) {
      for (const [grade_code, batch_count] of gMap) {
        result.push({ strain, grade_code, batch_count });
      }
    }
    return { data: result, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load batch grades');
    return { data: null, error };
  }
}

export async function getBatchDetails(strain: string): Promise<{ data: BatchDetailRow[] | null; error: unknown }> {
  try {
    const { data: batches, error } = await supabase
      .from('batch_registry')
      .select('id, batch_number, strain, harvest_date, lifecycle_state, created_at, quality_grade_id')
      .eq('strain', strain)
      .not('lifecycle_state', 'in', '("depleted","archived")')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: grades } = await supabase
      .from('quality_grades')
      .select('id, code, label')
      .eq('is_active', true);

    const gradeMap = new Map<string, { code: string; label: string }>();
    for (const g of grades || []) gradeMap.set(g.id, { code: g.code, label: g.label });

    const batchIds = (batches || []).map(b => b.id);
    let thcMap = new Map<string, number>();
    if (batchIds.length > 0) {
      const { data: invItems } = await supabase
        .from('inventory_items')
        .select('batch_id, thc_percentage')
        .in('batch_id', batchIds)
        .not('thc_percentage', 'is', null)
        .gt('on_hand_qty', 0);

      for (const item of invItems || []) {
        if (item.thc_percentage && !thcMap.has(item.batch_id)) {
          thcMap.set(item.batch_id, Number(item.thc_percentage));
        }
      }
    }

    const result: BatchDetailRow[] = (batches || []).map(b => {
      const grade = b.quality_grade_id ? gradeMap.get(b.quality_grade_id) : null;
      return {
        id: b.id,
        batch_number: b.batch_number,
        strain: b.strain,
        harvest_date: b.harvest_date,
        lifecycle_state: b.lifecycle_state,
        created_at: b.created_at,
        grade_code: grade?.code || null,
        grade_label: grade?.label || null,
        thc_percentage: thcMap.get(b.id) || null,
      };
    });

    return { data: result, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load batch details');
    return { data: null, error };
  }
}
