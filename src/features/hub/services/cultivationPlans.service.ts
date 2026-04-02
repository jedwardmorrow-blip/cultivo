import { supabase } from '@/lib/supabase';
import type { CultivationPlan, CultivationPlanInput } from '@/types';

export async function createCultivationPlan(data: CultivationPlanInput): Promise<CultivationPlan> {
  const { data: result, error } = await supabase
    .from('cultivation_plans')
    .insert({
      room_id: data.room_id,
      strain_id: data.strain_id ?? null,
      feed_program_id: data.feed_program_id ?? null,
      plan_name: data.plan_name ?? null,
      plan_status: data.plan_status ?? 'draft',
      planned_plant_count: data.planned_plant_count ?? null,
      planned_clone_count: data.planned_clone_count ?? null,
      clone_date: data.clone_date ?? null,
      veg_start_date: data.veg_start_date ?? null,
      flower_date: data.flower_date ?? null,
      harvest_date: data.harvest_date ?? null,
      dry_date: data.dry_date ?? null,
      clone_days: data.clone_days ?? null,
      veg_days: data.veg_days ?? null,
      flower_days: data.flower_days ?? null,
      dry_days: data.dry_days ?? null,
      turnaround_days: data.turnaround_days ?? null,
      projected_wet_weight_g: data.projected_wet_weight_g ?? null,
      projected_dry_weight_g: data.projected_dry_weight_g ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return result as CultivationPlan;
}

export async function createPlanSnapshot(planId: string, snapshotData: unknown): Promise<void> {
  const { error } = await supabase
    .from('cultivation_plan_snapshots')
    .insert({
      plan_id: planId,
      snapshot_data: snapshotData,
      snapshot_reason: 'edit',
    });
  if (error) throw error;
}

export async function updateCultivationPlan(id: string, updates: Partial<CultivationPlan>): Promise<CultivationPlan> {
  const { data: result, error } = await supabase
    .from('cultivation_plans')
    .update({
      strain_id: updates.strain_id ?? null,
      feed_program_id: updates.feed_program_id ?? null,
      plan_name: updates.plan_name ?? null,
      plan_status: updates.plan_status ?? 'draft',
      planned_plant_count: updates.planned_plant_count ?? null,
      planned_clone_count: updates.planned_clone_count ?? null,
      clone_date: updates.clone_date ?? null,
      veg_start_date: updates.veg_start_date ?? null,
      flower_date: updates.flower_date ?? null,
      harvest_date: updates.harvest_date ?? null,
      dry_date: updates.dry_date ?? null,
      clone_days: updates.clone_days ?? null,
      veg_days: updates.veg_days ?? null,
      flower_days: updates.flower_days ?? null,
      dry_days: updates.dry_days ?? null,
      turnaround_days: updates.turnaround_days ?? null,
      projected_wet_weight_g: updates.projected_wet_weight_g ?? null,
      projected_dry_weight_g: updates.projected_dry_weight_g ?? null,
      notes: updates.notes ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as CultivationPlan;
}

export async function cancelCultivationPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('cultivation_plans')
    .update({ plan_status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}
