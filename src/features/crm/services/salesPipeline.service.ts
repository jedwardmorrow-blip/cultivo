import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

export interface SalesDashboardRow {
  strain: string;
  grade_code: string;
  grade_color: string;
  sellable_grams: number;
  sellable_flower_grams: number;
  sellable_smalls_grams: number;
  packaged_units: number;
  pipeline_grams: number;
  pipeline_binned_grams: number;
  pipeline_bucked_grams: number;
  byproduct_grams: number;
  total_sellable: number;
  demand_orders: number;
  demand_units: number;
  demand_value: number;
  health_status: string;
  health_sort: number;
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

export async function getSalesDashboard(): Promise<{ data: SalesDashboardRow[] | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('v_sales_dashboard')
      .select('*');

    if (error) throw error;
    return { data: data as SalesDashboardRow[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load sales dashboard');
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
    const thcMap = new Map<string, number>();
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
