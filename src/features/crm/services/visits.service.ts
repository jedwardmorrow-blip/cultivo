import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { VisitSchedule, VisitScheduleInput, CRMCalendarOrder } from '../types';
import type { CustomerRelation } from '@/types';

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
    const customerRelation = visit.customers as CustomerRelation | undefined;
    const { data: activity, error: actError } = await supabase
      .from('customer_activity_log')
      .insert([{
        customer_id: visit.customer_id,
        user_id: user?.id || null,
        activity_type: 'visit',
        subject: `Visit completed: ${customerRelation?.name || 'Account'}`,
        body: outcomeNotes || null,
        completed: true,
        visit_id: visitId,
      }])
      .select()
      .single();

    if (actError) throw actError;

    // Set visit_date to today so the cadence view counts this visit
    // in the 30-day compliance window (view filters on visit_date, not completed_at).
    const today = new Date().toISOString().split('T')[0];
    const { error: updateError } = await supabase
      .from('crm_visit_schedule')
      .update({
        status: 'completed',
        outcome_notes: outcomeNotes,
        linked_activity_id: activity.id,
        visit_date: today,
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

export async function getOrdersForCRMCalendar(year: number, month: number): Promise<{ data: CRMCalendarOrder[]; error: any }> {
  try {
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        requested_delivery_date,
        total_amount,
        status,
        customers:customer_id(name),
        order_items(id)
      `)
      .gte('requested_delivery_date', dateFrom)
      .lte('requested_delivery_date', dateTo)
      .eq('archived', false)
      .neq('status', 'cancelled');

    if (error) throw error;

    const orders: CRMCalendarOrder[] = (data || []).map((row: any) => ({
      id: row.id,
      order_number: row.order_number,
      customer_id: row.customer_id,
      customer_name: row.customers?.name || 'Unknown',
      requested_delivery_date: row.requested_delivery_date,
      total_amount: Number(row.total_amount || 0),
      status: row.status,
      item_count: Array.isArray(row.order_items) ? row.order_items.length : 0,
    }));

    return { data: orders, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load calendar orders');
    return { data: [], error };
  }
}
