import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type {
  AccountSummary,
  ChainLocationPerformance,
  CustomerContact,
  CustomerContactInput,
  CustomerActivity,
  CustomerActivityInput,
  DeliveryModel,
  MonthlyRevenue,
  SKUPerformance,
  RevenuePipelineItem,
  CRMDashboardStats,
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

export async function getDashboardStats(): Promise<{ data: CRMDashboardStats | null; error: any }> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [summaryResult, monthlyResult] = await Promise.all([
      supabase.from('crm_customer_summary').select('id, total_revenue, order_count, account_status, days_since_last_order'),
      supabase
        .from('orders')
        .select('id, total_amount')
        .eq('test_mode', false)
        .eq('archived', false)
        .gte('order_date', monthStart),
    ]);

    if (summaryResult.error) throw summaryResult.error;
    if (monthlyResult.error) throw monthlyResult.error;

    const accounts = summaryResult.data || [];
    const monthlyOrders = monthlyResult.data || [];

    const totalRevenue = accounts.reduce((sum, a) => sum + Number(a.total_revenue || 0), 0);
    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const activeAccounts = accounts.filter(a => a.account_status === 'active').length;
    const prospectCount = accounts.filter(a => a.account_status === 'prospect').length;
    const atRiskCount = accounts.filter(a =>
      a.account_status === 'active' && a.days_since_last_order !== null && a.days_since_last_order > 30
    ).length;
    const ordersThisMonth = monthlyOrders.length;
    const avgOrderValue = ordersThisMonth > 0 ? monthlyRevenue / ordersThisMonth : 0;

    return {
      data: {
        totalRevenue,
        monthlyRevenue,
        activeAccounts,
        totalAccounts: accounts.length,
        ordersThisMonth,
        avgOrderValue,
        atRiskCount,
        prospectCount,
      },
      error: null,
    };
  } catch (error) {
    errorService.handle(error, 'Failed to load CRM dashboard stats');
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
