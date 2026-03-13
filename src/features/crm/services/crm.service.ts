import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import {
  formatAddressForGeocoding,
  updateCustomerGeocode,
} from '../../delivery/services/geocoding.service';
import type {
  AccountSummary,
  AccountInfoInput,
  AccountHealthDashboardItem,
  ChainLocationPerformance,
  CustomerContact,
  CustomerContactInput,
  CustomerActivity,
  CustomerActivityInput,
  CRMTask,
  DeliveryModel,
  MonthlyRevenue,
  SKUPerformance,
  RevenuePipelineItem,
  CRMDashboardStats,
  TopAccountByRange,
  ProspectPipelineItem,
  PipelineStage,
  VisitCadenceItem,
  RevenueTrackingItem,
  RevenueWeeklyItem,
  StoreScorecard,
  RevenueForecastItem,
} from '../types';

export async function getAccountSummaries() {
  try {
    const { data, error } = await supabase
      .from('crm_customer_summary')
      .select('*')
      .order('total_revenue', { ascending: false });

    if (error) throw error;
    return { data: data as AccountSummary[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account summaries');
    return { data: null, error };
  }
}

export async function getAccountById(id: string) {
  try {
    const { data, error } = await supabase
      .from('crm_customer_summary')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return { data: data as AccountSummary | null, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account details');
    return { data: null, error };
  }
}

export async function getChildAccounts(parentId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_customer_summary')
      .select('*')
      .eq('parent_customer_id', parentId)
      .order('name');

    if (error) throw error;
    return { data: data as AccountSummary[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load child accounts');
    return { data: null, error };
  }
}

export async function getAccountOrders(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total_amount, order_date,
        requested_delivery_date, scheduled_delivery_date, archived
      `)
      .eq('customer_id', customerId)
      .eq('test_mode', false)
      .order('order_date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account orders');
    return { data: null, error };
  }
}

export async function getAccountOrderItems(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id, order_id, quantity, unit_price, subtotal, strain, status,
        products(name, sku, type, product_category),
        orders!inner(customer_id, order_number, order_date, test_mode)
      `)
      .eq('orders.customer_id', customerId)
      .eq('orders.test_mode', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account order items');
    return { data: null, error };
  }
}

export async function getAccountContacts(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) throw error;
    return { data: data as CustomerContact[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load contacts');
    return { data: null, error };
  }
}

export async function createContact(input: CustomerContactInput) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return { data: data as CustomerContact, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create contact');
    return { data: null, error };
  }
}

export async function updateContact(id: string, updates: Partial<CustomerContactInput>) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CustomerContact, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update contact');
    return { data: null, error };
  }
}

export async function deleteContact(id: string) {
  try {
    const { error } = await supabase
      .from('customer_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to delete contact');
    return { error };
  }
}


export async function getAllContacts(searchQuery?: string) {
  try {
    let query = supabase
      .from('customer_contacts')
      .select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          city,
          state,
          account_type
        )
      `)
      .order('is_primary', { ascending: false })
      .order('name');

    if (searchQuery && searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data as (CustomerContact & { customer: { id: string; name: string; city: string; state: string; account_type: string } })[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load all contacts');
    return { data: null, error };
  }
}

export async function getActivityLog(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_activity_log')
      .select(`
        *,
        user_profiles:user_id(full_name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const activities: CustomerActivity[] = (data || []).map((row: any) => ({
      ...row,
      user_name: row.user_profiles?.full_name || 'Unknown',
    }));

    return { data: activities, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load activity log');
    return { data: null, error };
  }
}

export async function createActivity(input: CustomerActivityInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('customer_activity_log')
      .insert([{ ...input, user_id: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return { data: data as CustomerActivity, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to log activity');
    return { data: null, error };
  }
}

export async function getMonthlyRevenue(customerId?: string) {
  try {
    let query = supabase
      .from('crm_monthly_revenue_by_customer')
      .select('*')
      .order('month', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data as MonthlyRevenue[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load monthly revenue');
    return { data: null, error };
  }
}

export async function getSKUPerformance() {
  try {
    const { data, error } = await supabase
      .from('crm_sku_performance')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(50);

    if (error) throw error;
    return { data: data as SKUPerformance[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load SKU performance');
    return { data: null, error };
  }
}

export async function getRevenuePipeline() {
  try {
    const { data, error } = await supabase
      .from('crm_revenue_pipeline')
      .select('*');

    if (error) throw error;
    return { data: data as RevenuePipelineItem[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load revenue pipeline');
    return { data: null, error };
  }
}

export async function getDashboardStatsByRange(
  startDate: string,
  endDate: string
): Promise<{ data: CRMDashboardStats | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('crm_dashboard_stats_by_range', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;

    const raw = data as Record<string, number>;
    return {
      data: {
        periodRevenue: Number(raw.period_revenue) || 0,
        periodOrders: Number(raw.period_orders) || 0,
        periodAvgOrder: Number(raw.period_avg_order) || 0,
        prevPeriodRevenue: Number(raw.prev_period_revenue) || 0,
        prevPeriodOrders: Number(raw.prev_period_orders) || 0,
        prevPeriodAvgOrder: Number(raw.prev_period_avg_order) || 0,
        activeAccounts: Number(raw.active_accounts) || 0,
        totalAccounts: Number(raw.total_accounts) || 0,
        atRiskCount: Number(raw.at_risk_count) || 0,
        prospectCount: Number(raw.prospect_count) || 0,
        uniqueCustomersInPeriod: Number(raw.unique_customers_in_period) || 0,
        projectedMonthRevenue: Number(raw.projected_month_revenue) || 0,
        projectedMonthOrders: Number(raw.projected_month_orders) || 0,
      },
      error: null,
    };
  } catch (error) {
    errorService.handle(error, 'Failed to load CRM dashboard stats');
    return { data: null, error };
  }
}

export async function getTopAccountsByRange(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase.rpc('crm_top_accounts_by_range', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;

    const accounts: TopAccountByRange[] = (data || []).map((row: any) => ({
      ...row,
      period_revenue: Number(row.period_revenue) || 0,
      period_orders: Number(row.period_orders) || 0,
      period_avg_order: Number(row.period_avg_order) || 0,
      child_period_revenue: Number(row.child_period_revenue) || 0,
      child_period_orders: Number(row.child_period_orders) || 0,
      total_revenue: Number(row.total_revenue) || 0,
      days_since_last_order: row.days_since_last_order != null ? Number(row.days_since_last_order) : null,
    }));

    return { data: accounts, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load top accounts');
    return { data: null, error };
  }
}

export async function getSKUPerformanceByRange(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase.rpc('crm_sku_performance_by_range', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;

    const skus: SKUPerformance[] = (data || []).map((row: any) => ({
      ...row,
      order_count: Number(row.order_count) || 0,
      total_units_sold: Number(row.total_units_sold) || 0,
      total_revenue: Number(row.total_revenue) || 0,
      avg_unit_price: Number(row.avg_unit_price) || 0,
      unique_customers: Number(row.unique_customers) || 0,
      first_sold_date: null,
      last_sold_date: null,
    }));

    return { data: skus, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load SKU performance');
    return { data: null, error };
  }
}

export async function getAccountOrdersByRange(customerId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total_amount, order_date,
        requested_delivery_date, scheduled_delivery_date, archived
      `)
      .eq('customer_id', customerId)
      .eq('test_mode', false)
      .gte('order_date', startDate)
      .lte('order_date', endDate + 'T23:59:59')
      .order('order_date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account orders');
    return { data: null, error };
  }
}

export async function updateAccountStatus(customerId: string, status: string) {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ account_status: status, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update account status');
    return { error };
  }
}

export async function updateAccountTags(customerId: string, tags: string[]) {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ tags, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update account tags');
    return { error };
  }
}

export async function getChainLocationPerformance(parentId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_chain_location_performance')
      .select('*')
      .eq('parent_customer_id', parentId)
      .order('revenue', { ascending: false });

    if (error) throw error;
    return { data: data as ChainLocationPerformance[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load chain location performance');
    return { data: null, error };
  }
}

export async function getBatchMonthlyRevenue(accountIds: string[]): Promise<{ data: Map<string, number[]> | null; error: any }> {
  try {
    if (accountIds.length === 0) return { data: new Map(), error: null };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('crm_monthly_revenue_by_customer')
      .select('customer_id, month, monthly_revenue')
      .in('customer_id', accountIds)
      .gte('month', cutoff)
      .order('month', { ascending: true });

    if (error) throw error;

    const revenueMap = new Map<string, number[]>();

    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    accountIds.forEach((id) => {
      const accountData = (data || []).filter((r: any) => r.customer_id === id);
      const monthMap = new Map<string, number>();
      accountData.forEach((r: any) => {
        const monthKey = String(r.month).slice(0, 7);
        monthMap.set(monthKey, Number(r.monthly_revenue));
      });
      const values = months.map((m) => monthMap.get(m) || 0);
      revenueMap.set(id, values);
    });

    return { data: revenueMap, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load batch monthly revenue');
    return { data: null, error };
  }
}

export async function getPinnedNotes(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_activity_log')
      .select(`*, user_profiles:user_id(full_name)`)
      .eq('customer_id', customerId)
      .eq('pinned', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const notes = (data || []).map((row: any) => ({
      ...row,
      user_name: row.user_profiles?.full_name || 'Unknown',
    }));

    return { data: notes as CustomerActivity[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load pinned notes');
    return { data: null, error };
  }
}

export async function togglePinActivity(activityId: string, pinned: boolean) {
  try {
    const { error } = await supabase
      .from('customer_activity_log')
      .update({ pinned })
      .eq('id', activityId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to toggle pin');
    return { error };
  }
}

export async function getAccountSampleItems(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id, quantity, unit_price, subtotal, status, is_sample,
        products(name, type, product_category),
        orders!inner(id, order_number, order_date, status, customer_id, test_mode)
      `)
      .eq('orders.customer_id', customerId)
      .eq('orders.test_mode', false)
      .eq('is_sample', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load sample history');
    return { data: null, error };
  }
}

export async function updateDeliveryModel(customerId: string, deliveryModel: DeliveryModel) {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ delivery_model: deliveryModel, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update delivery model');
    return { error };
  }
}

export async function updateAccountInfo(
  customerId: string,
  input: AccountInfoInput,
  previousAccount: AccountSummary
) {
  try {
    const updateData: Record<string, unknown> = {
      name: input.name,
      contact_name: input.contact_name || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      postal_code: input.postal_code || null,
      delivery_address: input.address || null,
      delivery_city: input.city || null,
      delivery_state: input.state || 'AZ',
      delivery_postal_code: input.postal_code || null,
      license_name: input.license_name || null,
      license_number: input.license_number || null,
      ato_number: input.ato_number || null,
      default_payment_terms: input.default_payment_terms || null,
      preferred_delivery_day: input.preferred_delivery_day || null,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId);

    if (error) throw error;

    const addressChanged =
      input.address !== (previousAccount.delivery_address || previousAccount.address) ||
      input.city !== (previousAccount.delivery_city || previousAccount.city) ||
      input.state !== (previousAccount.delivery_state || previousAccount.state) ||
      input.postal_code !== (previousAccount.delivery_postal_code || previousAccount.postal_code);

    if (addressChanged) {
      await supabase
        .from('customers')
        .update({
          latitude: null,
          longitude: null,
          formatted_address: null,
          geocoded_at: null,
          geocoding_error: null,
        })
        .eq('id', customerId);

      if (input.address && input.city) {
        try {
          const addressToGeocode = formatAddressForGeocoding(
            input.address, input.city, input.state, input.postal_code,
            null, null, null, null
          );
          await updateCustomerGeocode(customerId, addressToGeocode);
        } catch {
          // Geocoding failure is non-blocking
        }
      }
    }

    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update account info');
    return { error };
  }
}

export async function getAccountHealthDashboard() {
  try {
    const { data, error } = await supabase
      .from('crm_account_health_dashboard')
      .select('*')
      .order('health_score', { ascending: true });

    if (error) throw error;

    const items: AccountHealthDashboardItem[] = (data || []).map((row: any) => ({
      ...row,
      health_score: Number(row.health_score) || 0,
      recency_score: Number(row.recency_score) || 0,
      frequency_score: Number(row.frequency_score) || 0,
      trend_score: Number(row.trend_score) || 0,
      engagement_score: Number(row.engagement_score) || 0,
      revenue_30d: Number(row.revenue_30d) || 0,
      revenue_90d: Number(row.revenue_90d) || 0,
      lifetime_revenue: Number(row.lifetime_revenue) || 0,
      avg_order_value_90d: Number(row.avg_order_value_90d) || 0,
    }));

    return { data: items, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account health dashboard');
    return { data: null, error };
  }
}

export async function getProspectPipeline() {
  try {
    const { data, error } = await supabase
      .from('crm_prospect_pipeline')
      .select('*');

    if (error) throw error;
    return { data: data as ProspectPipelineItem[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load prospect pipeline');
    return { data: null, error };
  }
}

export async function updatePipelineStage(customerId: string, stage: PipelineStage) {
  try {
    const { error } = await supabase
      .from('customers')
      .update({
        pipeline_stage: stage,
        pipeline_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('customer_activity_log').insert([{
      customer_id: customerId,
      user_id: user?.id,
      activity_type: 'note',
      subject: `Pipeline stage updated to ${stage.replace(/_/g, ' ')}`,
      body: null,
    }]);

    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update pipeline stage');
    return { error };
  }
}

export async function getVisitCadence(): Promise<{ data: VisitCadenceItem[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crm_visit_cadence')
      .select('*');

    if (error) throw error;
    return { data: (data || []) as VisitCadenceItem[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load visit cadence data');
    return { data: [], error };
  }
}

// Ã¢ÂÂÃ¢ÂÂ Revenue Tracking Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

export async function getRevenueTracking(): Promise<{ data: RevenueTrackingItem[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crm_revenue_tracking')
      .select('*')
      .order('lifetime_revenue', { ascending: false });

    if (error) throw error;

    const items: RevenueTrackingItem[] = (data || []).map((row: any) => ({
      ...row,
      current_month_realized: Number(row.current_month_realized) || 0,
      current_month_tentative: Number(row.current_month_tentative) || 0,
      current_month_unresolved: Number(row.current_month_unresolved) || 0,
      current_month_orders: Number(row.current_month_orders) || 0,
      prior_month_realized: Number(row.prior_month_realized) || 0,
      prior_month_orders: Number(row.prior_month_orders) || 0,
      mom_change_pct: row.mom_change_pct != null ? Number(row.mom_change_pct) : null,
      rolling_90d_realized: Number(row.rolling_90d_realized) || 0,
      rolling_90d_tentative: Number(row.rolling_90d_tentative) || 0,
      rolling_90d_order_count: Number(row.rolling_90d_order_count) || 0,
      lifetime_revenue: Number(row.lifetime_revenue) || 0,
      lifetime_order_count: Number(row.lifetime_order_count) || 0,
      total_unresolved_revenue: Number(row.total_unresolved_revenue) || 0,
      total_unresolved_orders: Number(row.total_unresolved_orders) || 0,
    }));

    return { data: items, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load revenue tracking');
    return { data: [], error };
  }
}

export async function getRevenueWeekly(): Promise<{ data: RevenueWeeklyItem[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crm_revenue_weekly')
      .select('*')
      .order('revenue_week', { ascending: false });

    if (error) throw error;

    const items: RevenueWeeklyItem[] = (data || []).map((row: any) => ({
      ...row,
      realized_revenue: Number(row.realized_revenue) || 0,
      tentative_revenue: Number(row.tentative_revenue) || 0,
      realized_orders: Number(row.realized_orders) || 0,
      tentative_orders: Number(row.tentative_orders) || 0,
    }));

    return { data: items, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load weekly revenue');
    return { data: [], error };
  }
}

// Ã¢ÂÂÃ¢ÂÂ Store Performance Scorecard Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

export async function getStoreScorecard(): Promise<{ data: StoreScorecard[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('crm_store_scorecard')
      .select('*')
      .order('lifetime_revenue', { ascending: false });

    if (error) throw error;

    const items: StoreScorecard[] = (data || []).map((row: any) => ({
      ...row,
      health_score: Number(row.health_score) || 0,
      revenue_30d: Number(row.revenue_30d) || 0,
      revenue_90d: Number(row.revenue_90d) || 0,
      lifetime_revenue: Number(row.lifetime_revenue) || 0,
      avg_order_value_90d: Number(row.avg_order_value_90d) || 0,
      orders_30d: Number(row.orders_30d) || 0,
      orders_90d: Number(row.orders_90d) || 0,
      product_types_purchased: Number(row.product_types_purchased) || 0,
      distinct_skus_purchased: Number(row.distinct_skus_purchased) || 0,
      visit_compliance_pct: Number(row.visit_compliance_pct) || 0,
      open_task_count: Number(row.open_task_count) || 0,
      tasks_completed_30d: Number(row.tasks_completed_30d) || 0,
      visits_30d: Number(row.visits_30d) || 0,
    }));

    return { data: items, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load store scorecard');
    return { data: [], error };
  }
}

// Ã¢ÂÂÃ¢ÂÂ Automated Task Engine Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

export async function getTaskSummary(filters?: {
  status?: string;
  taskType?: string;
  triggerSource?: string;
  priority?: string;
}): Promise<{ data: CRMTask[]; error: any }> {
  try {
    let query = supabase
      .from('crm_task_summary')
      .select('*')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.taskType) query = query.eq('task_type', filters.taskType);
    if (filters?.triggerSource) query = query.eq('trigger_source', filters.triggerSource);
    if (filters?.priority) query = query.eq('priority', filters.priority);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []) as CRMTask[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load task summary');
    return { data: [], error };
  }
}

export async function completeTask(taskId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to complete task');
    return { error };
  }
}

export async function dismissTask(taskId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: 'auto_closed', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to dismiss task');
    return { error };
  }
}

export async function runTaskEngine(): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('crm-task-engine', {
      method: 'POST',
      body: {},
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to run task engine');
    return { data: null, error };
  }
}

// Ã¢ÂÂÃ¢ÂÂ Revenue Forecasting Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

