import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { CRMTask, CRMTaskInput } from '../types';

export async function getTasks(filters?: {
  status?: string;
  customerId?: string;
  assignedUserId?: string;
  priority?: string;
  dueBefore?: string;
  dueAfter?: string;
}) {
  try {
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        customers:customer_id(name, dispensary_code),
        user_profiles:assigned_user_id(full_name)
      `)
      .order('due_date', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters?.assignedUserId) query = query.eq('assigned_user_id', filters.assignedUserId);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.dueBefore) query = query.lte('due_date', filters.dueBefore);
    if (filters?.dueAfter) query = query.gte('due_date', filters.dueAfter);

    const { data, error } = await query;
    if (error) throw error;

    const tasks: CRMTask[] = (data || []).map((row: any) => ({
      ...row,
      customer_name: row.customers?.name || 'Unknown',
      dispensary_code: row.customers?.dispensary_code || '',
      assigned_user_name: row.user_profiles?.full_name || null,
    }));

    return { data: tasks, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load tasks');
    return { data: null, error };
  }
}

export async function getTasksByCustomer(customerId: string) {
  return getTasks({ customerId });
}

export async function getOpenTasks() {
  try {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        customers:customer_id(name, dispensary_code),
        user_profiles:assigned_user_id(full_name)
      `)
      .in('status', ['open', 'in_progress'])
      .order('due_date', { ascending: true });

    if (error) throw error;

    const tasks: CRMTask[] = (data || []).map((row: any) => ({
      ...row,
      customer_name: row.customers?.name || 'Unknown',
      dispensary_code: row.customers?.dispensary_code || '',
      assigned_user_name: row.user_profiles?.full_name || null,
    }));

    return { data: tasks, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load open tasks');
    return { data: null, error };
  }
}

export async function createTask(input: CRMTaskInput) {
  try {
    const { data, error } = await supabase
      .from('crm_tasks')
      .insert([{
        customer_id: input.customer_id,
        assigned_user_id: input.assigned_user_id || null,
        task_type: input.task_type,
        title: input.title,
        description: input.description || null,
        due_date: input.due_date,
        priority: input.priority || 'medium',
        status: 'open',
      }])
      .select()
      .single();

    if (error) throw error;
    return { data: data as CRMTask, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create task');
    return { data: null, error };
  }
}

export async function updateTask(id: string, updates: Partial<CRMTask>) {
  try {
    const { id: _id, created_at: _ca, customer_name: _cn, dispensary_code: _dc, assigned_user_name: _aun, ...cleanUpdates } = updates as any;
    const { data, error } = await supabase
      .from('crm_tasks')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CRMTask, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update task');
    return { data: null, error };
  }
}

export async function completeTask(taskId: string) {
  try {
    const { data: task, error: fetchError } = await supabase
      .from('crm_tasks')
      .select('*, customers:customer_id(name)')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('crm_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (updateError) throw updateError;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: activity, error: actError } = await supabase
      .from('customer_activity_log')
      .insert([{
        customer_id: task.customer_id,
        user_id: user?.id || null,
        activity_type: 'follow_up',
        subject: `Task completed: ${task.title}`,
        body: task.description || null,
        completed: true,
        linked_task_id: taskId,
      }])
      .select()
      .single();

    if (actError) throw actError;

    return { data: activity, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete task');
    return { data: null, error };
  }
}

export async function snoozeTask(taskId: string, days: number) {
  try {
    const { data: task, error: fetchError } = await supabase
      .from('crm_tasks')
      .select('due_date')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    const currentDue = new Date(task.due_date);
    currentDue.setDate(currentDue.getDate() + days);
    const newDueDate = currentDue.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('crm_tasks')
      .update({ due_date: newDueDate, status: 'open' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CRMTask, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to snooze task');
    return { data: null, error };
  }
}

export async function cancelTask(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CRMTask, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to cancel task');
    return { data: null, error };
  }
}
