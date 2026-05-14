import { supabase } from '@/lib/supabase';
import type {
  PlannedCycle,
  CreatePlannedCycleInput,
  PlanCycleRpcInput,
  PlanCycleWriteResult,
  UpdatePlannedCycleInput,
  PlannedCycleTimelineRow,
} from '../types';

function isMissingRpcError(error: { code?: string; message?: string; details?: string | null }): boolean {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes('pgrst202') ||
    text.includes('could not find the function') ||
    text.includes('function public.fn_plan_cycle') ||
    text.includes('schema cache');
}

export const plannedCyclesService = {
  /** Fetch all non-cancelled/non-completed planned cycles as timeline rows */
  async getTimeline(): Promise<PlannedCycleTimelineRow[]> {
    const { data, error } = await supabase
      .from('v_planned_cycles_timeline')
      .select('*');
    if (error) throw error;
    return (data ?? []) as PlannedCycleTimelineRow[];
  },

  /** Insert a new planned cycle row */
  async create(input: CreatePlannedCycleInput): Promise<PlannedCycle> {
    const { data, error } = await supabase
      .from('planned_cycles')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data as PlannedCycle;
  },

  /**
   * Preferred live planner writer. Tries the cycles-unification RPC first,
   * then degrades to planned_cycles while the DB rollout is still in flight.
   */
  async planCycle(input: PlanCycleRpcInput): Promise<PlanCycleWriteResult> {
    const { data, error } = await supabase.rpc('fn_plan_cycle', {
      p_room_id: input.room_id,
      p_planned_flip_date: input.planned_flip_date,
      p_strains: input.strains,
      p_planned_strains: input.planned_strains ?? null,
      p_target_yield_g_per_m2: input.target_yield_g_per_m2 ?? null,
    });

    if (!error) {
      return { mode: 'rpc', data };
    }

    if (!isMissingRpcError(error)) {
      throw error;
    }

    const fallbackRows = Array.isArray(input.legacyFallback)
      ? input.legacyFallback
      : [input.legacyFallback];
    const { data: legacy, error: legacyError } = await supabase
      .from('planned_cycles')
      .insert(fallbackRows)
      .select('*')
      .returns<PlannedCycle[]>();
    if (legacyError) throw legacyError;
    return { mode: 'legacy', data: legacy ?? [] };
  },

  /** Update an existing planned cycle */
  async update(id: string, input: UpdatePlannedCycleInput): Promise<PlannedCycle> {
    const { data, error } = await supabase
      .from('planned_cycles')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PlannedCycle;
  },

  /** Delete a planned cycle */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('planned_cycles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
