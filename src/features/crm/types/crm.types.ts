export type AccountType = 'direct' | 'hub_parent' | 'hub_child';
export type AccountStatus = 'active' | 'inactive' | 'prospect' | 'churned';
export type ActivityType = 'call' | 'email' | 'visit' | 'sample' | 'note' | 'follow_up';

export interface AccountSummary {
  id: string;
  name: string;
  dispensary_code: string;
  account_type: AccountType;
  account_status: AccountStatus;
  parent_customer_id: string | null;
  city: string | null;
  state: string | null;
  tags: string[];
  default_payment_terms: string | null;
  preferred_delivery_day: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_name: string | null;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  first_order_date: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;
  completed_orders: number;
  open_orders: number;
  open_order_value: number;
  contact_count: number;
  child_account_count: number;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerContactInput {
  customer_id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CustomerPriceOverride {
  id: string;
  customer_id: string;
  product_id: string;
  custom_price: number;
  effective_date: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  product_name?: string;
  product_sku?: string;
}

export interface CustomerActivity {
  id: string;
  customer_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  subject: string;
  body: string | null;
  follow_up_date: string | null;
  completed: boolean;
  created_at: string;
  user_name?: string;
}

export interface CustomerActivityInput {
  customer_id: string;
  activity_type: ActivityType;
  subject: string;
  body?: string;
  follow_up_date?: string;
}

export interface SalesRepAssignment {
  id: string;
  customer_id: string;
  user_id: string;
  role: 'primary' | 'secondary';
  assigned_at: string;
  user_name?: string;
  user_email?: string;
}

export interface MonthlyRevenue {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  month: string;
  order_count: number;
  monthly_revenue: number;
  cumulative_revenue: number;
}

export interface SKUPerformance {
  product_id: string;
  product_name: string;
  sku: string | null;
  product_type: string;
  product_category: string;
  strain: string | null;
  order_count: number;
  total_units_sold: number;
  total_revenue: number;
  avg_unit_price: number;
  unique_customers: number;
  first_sold_date: string | null;
  last_sold_date: string | null;
}

export interface RevenuePipelineItem {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  order_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  order_date: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
}

export interface CRMDashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeAccounts: number;
  totalAccounts: number;
  ordersThisMonth: number;
  avgOrderValue: number;
  atRiskCount: number;
  prospectCount: number;
}
