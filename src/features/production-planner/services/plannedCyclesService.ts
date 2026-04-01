import { supabase } from '@/lib/supabase';
import type {
  PlannedCycle,
  CreatePlannedCycleInput,
  UpdatePlannedCycleInput,
  PlannedCycleTimelineRow,
} from '../types';

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
