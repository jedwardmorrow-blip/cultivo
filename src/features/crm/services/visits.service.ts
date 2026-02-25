import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { VisitSchedule, VisitScheduleInput } from '../types';

export async function getVisits(filters?: {
  customerId?: string;
  userId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    let query = supabase
      .from('crm_visit_schedule')
      .select(`
        *,
        customers:customer_id(name, dispensary_code),
        user_profiles:user_id(full_name)
      `)
      .order('visit_date', { ascending: true });

    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dateFrom) query = query.gte('visit_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('visit_date', filters.dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const visits: VisitSchedule[] = (data || []).map((row: any) => ({
      ...row,
      customer_name: row.customers?.name || 'Unknown',
      dispensary_code: row.customers?.dispensary_code || '',
      user_name: row.user_profiles?.full_name || null,
    }));

    return { data: visits, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load visits');
    return { data: null, error };
  }
}

export async function getVisitsByCustomer(customerId: string) {
  return getVisits({ customerId });
}

export async function getVisitsForMonth(year: number, month: number) {
  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return getVisits({ dateFrom, dateTo });
}

export async function scheduleVisit(input: VisitScheduleInput) {
  try {
    const { data, error } = await supabase
      .from('crm_visit_schedule')
      .insert([{
        customer_id: input.customer_id,
        user_id: input.user_id || null,
        visit_date: input.visit_date,
        visit_time_window: input.visit_time_window || null,
        visit_type: input.visit_type,
        location_notes: input.location_notes || null,
        status: 'scheduled',
      }])
      .select()
      .single();

    if (error) throw error;
    return { data: data as VisitSchedule, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to schedule visit');
    return { data: null, error };
  }
}

export async function completeVisit(visitId: string, outcomeNotes: string) {
  try {
    const { data: visit, error: fetchError } = await supabase
      .from('crm_visit_schedule')
      .select('*, customers:customer_id(name)')
      .eq('id', visitId)
      .single();

    if (fetchError) throw fetchError;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: activity, error: actError } = await supabase
      .from('customer_activity_log')
      .insert([{
        customer_id: visit.customer_id,
        user_id: user?.id || null,
        activity_type: 'visit',
        subject: `Visit completed: ${(visit.customers as any)?.name || 'Account'}`,
        body: outcomeNotes || null,
        completed: true,
        visit_id: visitId,
      }])
      .select()
      .single();

    if (actError) throw actError;

    const { error: updateError } = await supabase
      .from('crm_visit_schedule')
      .update({
        status: 'completed',
        outcome_notes: outcomeNotes,
        linked_activity_id: activity.id,
      })
      .eq('id', visitId);

    if (updateError) throw updateError;

    return { data: activity, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete visit');
    return { data: null, error };
  }
}

export async function rescheduleVisit(visitId: string, newDate: string) {
  try {
    const { data, error } = await supabase
      .from('crm_visit_schedule')
      .update({ visit_date: newDate, status: 'scheduled' })
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as VisitSchedule, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to reschedule visit');
    return { data: null, error };
  }
}

export async function cancelVisit(visitId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_visit_schedule')
      .update({ status: 'cancelled' })
      .eq('id', visitId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as VisitSchedule, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to cancel visit');
    return { data: null, error };
  }
}
