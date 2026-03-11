export type AccountType = 'direct' | 'hub_parent' | 'hub_child';
export type AccountStatus = 'active' | 'inactive' | 'prospect' | 'churned';
export type ActivityType = 'call' | 'email' | 'visit' | 'sample' | 'note' | 'follow_up';
export type DeliveryModel = 'direct_to_each' | 'hub_and_spoke';
export type ChainHealthLabel = 'healthy' | 'cooling' | 'at_risk' | 'dormant' | 'no_orders';
export type PipelineStage = 'lead' | 'contacted' | 'meeting_set' | 'sample_sent' | 'negotiating' | 'closed_won' | 'closed_lost';

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
  address: string | null;
  postal_code: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  ato_number: string | null;
  credit_limit: number | null;
  account_credit_balance: number | null;
  notes: string | null;
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
  delivery_model: DeliveryModel;
  child_total_revenue: number;
  child_total_orders: number;
  pipeline_stage: PipelineStage | null;
  pipeline_updated_at: string | null;
}

export interface AccountInfoInput {
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  license_name: string | null;
  license_number: string | null;
  ato_number: string | null;
  default_payment_terms: string | null;
  preferred_delivery_day: string | null;
  notes: string | null;
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
  standard_price?: number | null;
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
  pinned: boolean;
  created_at: string;
  user_name?: string;
  linked_task_id?: string | null;
  linked_order_id?: string | null;
  visit_id?: string | null;
}

export interface CustomerActivityInput {
  customer_id: string;
  activity_type: ActivityType;
  subject: string;
  body?: string;
  follow_up_date?: string;
  linked_task_id?: string;
  linked_order_id?: string;
  visit_id?: string;
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
  periodRevenue: number;
  periodOrders: number;
  periodAvgOrder: number;
  prevPeriodRevenue: number;
  prevPeriodOrders: number;
  prevPeriodAvgOrder: number;
  activeAccounts: number;
  totalAccounts: number;
  atRiskCount: number;
  prospectCount: number;
  uniqueCustomersInPeriod: number;
  projectedMonthRevenue: number;
  projectedMonthOrders: number;
}

export interface TopAccountByRange {
  id: string;
  name: string;
  dispensary_code: string;
  account_type: string;
  account_status: string;
  parent_customer_id: string | null;
  period_revenue: number;
  period_orders: number;
  period_avg_order: number;
  last_order_in_period: string | null;
  child_period_revenue: number;
  child_period_orders: number;
  total_revenue: number;
  days_since_last_order: number | null;
}

export type TaskType = 'general' | 'visit_follow_up' | 'reorder_reminder' | 'prospect_advancement' | 'visit_overdue';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'completed' | 'auto_closed' | 'expired';
export type TriggerSource = 'manual' | 'auto';

export interface CRMTask {
  id: string;
  customer_id: string;
  assigned_user_id: string | null;
  task_type: TaskType;
  title: string;
  description: string | null;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  related_activity_id: string | null;
  trigger_source: TriggerSource;
  trigger_key: string | null;
  focus_today: boolean;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  dispensary_code?: string;
  assigned_user_name?: string;
  is_overdue?: boolean;
  days_overdue?: number;
}

export interface CRMTaskInput {
  customer_id: string;
  assigned_user_id?: string;
  task_type: TaskType;
  title: string;
  description?: string;
  due_date: string;
  priority?: TaskPriority;
}

export type VisitType = 'check_in' | 'sample_drop' | 'new_pitch' | 'relationship';
export type VisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface VisitSchedule {
  id: string;
  customer_id: string;
  user_id: string | null;
  visit_date: string;
  visit_time_window: string | null;
  visit_type: VisitType;
  location_notes: string | null;
  status: VisitStatus;
  outcome_notes: string | null;
  linked_activity_id: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  dispensary_code?: string;
  user_name?: string;
}

export interface VisitScheduleInput {
  customer_id: string;
  user_id?: string;
  visit_date: string;
  visit_time_window?: string;
  visit_type: VisitType;
  location_notes?: string;
}

export interface AccountHealthScore {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  health_score: number;
  health_label: 'healthy' | 'cooling' | 'at_risk' | 'dormant';
  days_since_last_order: number | null;
  order_frequency_30d: number;
  order_frequency_90d: number;
  revenue_trend: 'growing' | 'stable' | 'declining' | 'inactive';
  open_task_count: number;
  last_visit_date: string | null;
}

export interface AccountHealthDashboardItem {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  account_type: AccountType;
  account_status: AccountStatus;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  health_score: number;
  health_label: 'healthy' | 'cooling' | 'at_risk' | 'dormant';
  recency_score: number;
  frequency_score: number;
  trend_score: number;
  engagement_score: number;
  days_since_last_order: number | null;
  orders_30d: number;
  orders_90d: number;
  revenue_30d: number;
  revenue_90d: number;
  lifetime_revenue: number;
  avg_order_value_90d: number;
  revenue_trend: 'growing' | 'stable' | 'declining' | 'inactive';
  open_task_count: number;
  tasks_completed_30d: number;
  oldest_overdue_task: string | null;
  last_visit_date: string | null;
  visits_30d: number;
  next_scheduled_visit: string | null;
  last_activity_at: string | null;
}

export interface CustomerProductMix {
  customer_id: string;
  customer_name: string;
  product_id: string;
  product_name: string;
  product_type: string;
  product_category: string;
  strain: string | null;
  total_units: number;
  total_revenue: number;
  avg_unit_price: number;
  first_order_date: string | null;
  last_order_date: string | null;
  order_count: number;
}

export interface CRMCalendarOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  requested_delivery_date: string;
  total_amount: number;
  status: string;
  item_count: number;
}

export interface ChainLocationPerformance {
  child_id: string;
  child_name: string;
  child_code: string;
  parent_customer_id: string;
  parent_name: string;
  parent_code: string;
  delivery_model: DeliveryModel;
  city: string | null;
  state: string | null;
  account_status: string;
  order_count: number;
  revenue: number;
  avg_order_value: number;
  last_order_date: string | null;
  days_since_last_order: number | null;
  revenue_share_pct: number;
  health_label: ChainHealthLabel;
  revenue_rank: number;
}

export interface ProspectPipelineItem {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  account_status: AccountStatus;
  pipeline_stage: PipelineStage | null;
  pipeline_updated_at: string | null;
  created_at: string;
  notes: string | null;
  tags: string[];
  days_in_stage: number;
  stage_order: number;
  task_count: number;
  open_task_count: number;
  last_activity_at: string | null;
}

// ── Revenue Tracking ──────────────────────────────────────────────
export interface RevenueTrackingItem {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  current_month_realized: number;
  current_month_tentative: number;
  current_month_unresolved: number;
  current_month_orders: number;
  prior_month_realized: number;
  prior_month_orders: number;
  mom_change_pct: number | null;
  rolling_90d_realized: number;
  rolling_90d_tentative: number;
  rolling_90d_order_count: number;
  lifetime_revenue: number;
  lifetime_order_count: number;
  first_order_date: string | null;
  last_order_date: string | null;
  total_unresolved_revenue: number;
  total_unresolved_orders: number;
}

export interface RevenueWeeklyItem {
  customer_id: string;
  customer_name: string;
  revenue_week: string;
  realized_revenue: number;
  tentative_revenue: number;
  realized_orders: number;
  tentative_orders: number;
}

export type AccountTier = 'top_10' | 'mid_tier' | 'tail' | 'prospect';
export type ComplianceStatus = 'on_track' | 'due_soon' | 'overdue' | 'never_visited' | 'scheduled';

export interface VisitCadenceItem {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  account_type: AccountType;
  account_status: AccountStatus;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  lifetime_revenue: number;
  last_order_date: string | null;
  days_since_last_order: number | null;
  revenue_rank: number;
  account_tier: AccountTier;
  required_frequency_days: number;
  frequency_label: string;
  last_completed_visit: string | null;
  days_since_last_visit: number | null;
  next_scheduled_visit: string | null;
  visits_completed_30d: number;
  visits_completed_7d: number;
  upcoming_scheduled: number;
  total_visits_completed: number;
  last_visit_outcome: string | null;
  compliance_status: ComplianceStatus;
  days_until_due: number;
  compliance_pct_30d: number;
}

// ── Store Performance Scorecard ────────────────────────────────────
export type OrderFrequencyLabel = 'high' | 'medium' | 'low' | 'none';
export type ProductMixLabel = 'full' | 'moderate' | 'narrow' | 'none';

export interface StoreScorecard {
  customer_id: string;
  customer_name: string;
  dispensary_code: string;
  account_type: AccountType;
  account_status: AccountStatus;
  city: string | null;
  state: string | null;
  tags: string[];
  health_score: number;
  health_label: 'healthy' | 'cooling' | 'at_risk' | 'dormant';
  revenue_30d: number;
  revenue_90d: number;
  lifetime_revenue: number;
  avg_order_value_90d: number;
  revenue_trend: 'growing' | 'stable' | 'declining' | 'inactive';
  orders_30d: number;
  orders_90d: number;
  days_since_last_order: number | null;
  order_frequency_label: OrderFrequencyLabel;
  product_types_purchased: number;
  distinct_skus_purchased: number;
  product_mix_label: ProductMixLabel;
  visit_compliance_status: string;
  visit_compliance_pct: number;
  days_since_last_visit: number | null;
  last_completed_visit: string | null;
  account_tier: AccountTier | null;
  visit_frequency_required: string | null;
  open_task_count: number;
  tasks_completed_30d: number;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  last_visit_date: string | null;
  visits_30d: number;
  last_activity_at: string | null;
}

// ── Revenue Forecasting ──────────────────────────────────────────
export type ForecastType = 'reorder' | 'pipeline';
export type ForecastConfidence = 'high' | 'medium' | 'low' | 'none' | 'prospect';

