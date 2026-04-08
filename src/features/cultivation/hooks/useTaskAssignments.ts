import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTableSubscription } from '@/shared/hooks/useTableSubscription';
import type { TaskAssignment, TaskAssignmentRole } from '../types';

/**
 * Multi-person task assignment hook.
 * Manages crew assignments for a set of tasks (by date or by staff member).
 * Subscribes to realtime changes on task_assignments.
 */

interface UseTaskAssignmentsOptions {
  /** Load assignments for all tasks on this date */
  taskDate?: string;
  /** Load assignments for a specific staff member (Worker View) */
  staffId?: string;
  /** Load assignments for specific task IDs */
  taskIds?: string[];
}

export function useTaskAssignments(options: UseTaskAssignmentsOptions = {}) {
  const { taskDate, staffId, taskIds } = options;
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('task_assignments')
        .select('*, staff:staff_id(id, first_name, last_name)')
        .order('created_at', { ascending: true });

      if (taskIds && taskIds.length > 0) {
        query = query.in('task_id', taskIds);
      } else if (staffId) {
        query = query.eq('staff_id', staffId);
      } else if (taskDate) {
        // Join through daily_task_instances to filter by date
        const { data: taskRows } = await supabase
          .from('daily_task_instances')
          .select('id')
          .eq('task_date', taskDate);
        const ids = (taskRows ?? []).map((t) => t.id);
        if (ids.length === 0) {
          setAssignments([]);
          setLoading(false);
          return;
        }
        query = query.in('task_id', ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAssignments((data ?? []) as TaskAssignment[]);
    } catch (err) {
      console.error('[useTaskAssignments] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [taskDate, staffId, taskIds]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when task_assignments changes
  useTableSubscription('task_assignments', load);

  /** Get assignments for a specific task */
  const getForTask = useCallback(
    (taskId: string) => assignments.filter((a) => a.task_id === taskId),
    [assignments],
  );

  /** Get lead for a specific task */
  const getLeadForTask = useCallback(
    (taskId: string) => assignments.find((a) => a.task_id === taskId && a.role === 'lead') ?? null,
    [assignments],
  );

  /** Assign a staff member to a task. First assignment = lead, subsequent = crew. */
  async function assignToTask(taskId: string, newStaffId: string): Promise<void> {
    const existing = assignments.filter((a) => a.task_id === taskId);
    const alreadyAssigned = existing.find((a) => a.staff_id === newStaffId);

    if (alreadyAssigned) {
      // Already assigned — remove them
      await supabase.from('task_assignments').delete().eq('id', alreadyAssigned.id);
      // If they were lead, promote first remaining crew to lead
      if (alreadyAssigned.role === 'lead') {
        const nextCrew = existing.find((a) => a.staff_id !== newStaffId && a.role === 'crew');
        if (nextCrew) {
          await supabase.from('task_assignments').update({ role: 'lead' }).eq('id', nextCrew.id);
        }
      }
    } else {
      // New assignment — lead if first, crew otherwise
      const role: TaskAssignmentRole = existing.length === 0 ? 'lead' : 'crew';
      await supabase.from('task_assignments').insert({ task_id: taskId, staff_id: newStaffId, role });
    }
    await load();
  }

  /** Double-click: promote a crew member to lead (demote current lead) */
  async function promoteToLead(taskId: string, newLeadStaffId: string): Promise<void> {
    const existing = assignments.filter((a) => a.task_id === taskId);
    const currentLead = existing.find((a) => a.role === 'lead');
    const target = existing.find((a) => a.staff_id === newLeadStaffId);

    if (!target || target.role === 'lead') return; // already lead or not assigned

    // Demote current lead to crew
    if (currentLead) {
      await supabase.from('task_assignments').update({ role: 'crew' }).eq('id', currentLead.id);
    }
    // Promote target to lead
    await supabase.from('task_assignments').update({ role: 'lead' }).eq('id', target.id);
    await load();
  }

  /** Toggle activity: I'm In / Step Out */
  async function toggleActivity(taskId: string, actingStaffId: string): Promise<void> {
    const assignment = assignments.find(
      (a) => a.task_id === taskId && a.staff_id === actingStaffId,
    );
    if (!assignment) return;

    if (assignment.is_active) {
      // Step out
      await supabase
        .from('task_assignments')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('id', assignment.id);
    } else {
      // I'm in
      await supabase
        .from('task_assignments')
        .update({ is_active: true, joined_at: new Date().toISOString() })
        .eq('id', assignment.id);
    }
    await load();
  }

  return {
    assignments,
    loading,
    refetch: load,
    getForTask,
    getLeadForTask,
    assignToTask,
    promoteToLead,
    toggleActivity,
  };
}
