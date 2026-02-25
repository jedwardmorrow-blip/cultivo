# CRM Integration Map

## Purpose

Documents how the CRM module connects to every existing feature in the CULT system. Used to guide AI build sessions and ensure new CRM work does not break existing functionality.

## Database Dependency Map

### Tables the CRM Reads From

| Table | Purpose in CRM | Key Columns Used |
|---|---|---|
| `customers` | Core account data | id, name, dispensary_code, contact_name, email, phone, address, city, state, license_number, license_name, latitude, longitude |
| `orders` | Order history, revenue calculation | id, order_number, customer_id, status, order_date, total_amount, requested_delivery_date, archived, test_mode |
| `order_items` | Line-item detail for SKU analytics | id, order_id, product_id, quantity, unit_price, subtotal, strain, status |
| `products` | Product catalog for price lists, SKU analytics | id, name, sku, type, product_category, strain |
| `invoices` | Payment tracking per account | id, invoice_number, order_id, customer_id, status, total_amount, payment_terms, due_date |
| `user_profiles` | Sales rep assignment | id, email, full_name, role, is_active |
| `delivery_routes` | Delivery history per account | id, customer stops, scheduled_date |
| `delivery_schedule` | Upcoming deliveries | order references, scheduled dates |

### Views the CRM Reads From

| View | Purpose in CRM |
|---|---|
| `order_pipeline` | Order status overview, revenue tracking |
| `monthly_sku_deliveries` | SKU delivery analytics by month |
| `orders_by_delivery_month` | Monthly order grouping |
| `pending_invoices` | Outstanding payment tracking |
| `order_demand_by_sku` | Demand forecasting per product |
| `order_workflow_summary` | Fulfillment status overview |
| `order_age_metrics` | Order aging for at-risk alerts |

### New Tables the CRM Owns

| Table | Purpose | Phase |
|---|---|---|
| `customer_contacts` | Multiple contacts per account | 1 |
| `customer_price_lists` | Per-customer pricing overrides | 1 |
| `customer_activity_log` | Sales interaction tracking (+ `linked_task_id`, `visit_id` in Phase 2) | 1+2 |
| `sales_rep_assignments` | Rep-to-account linkage | 1 |
| `crm_tasks` | Follow-up tasks with type, priority, due date, status | 2 |
| `crm_visit_schedule` | Planned account visits with outcome tracking | 2 |

### New Views the CRM Creates

| View | Purpose | Phase |
|---|---|---|
| `crm_customer_summary` | Aggregated account metrics | 1 |
| `crm_monthly_revenue_by_customer` | Revenue trends per account | 1 |
| `crm_sku_performance` | Product performance analytics | 1 |
| `crm_revenue_pipeline` | Open order value by customer | 1 |
| `crm_account_scores` | Health score computed from recency/frequency/trend/engagement | 2 |
| `crm_product_mix_by_customer` | Per-customer product breakdown from order history | 2 |
| `crm_chain_location_performance` | Per-child-location metrics with revenue share %, health labels, ranking | 2.5 |

## Frontend Integration Points

### Orders Module (`src/features/orders/`)
- **CRM -> Orders**: Account detail page links to order creation with customer pre-selected
- **CRM -> Orders**: "View Order" from account order history navigates to OrderDetailsView
- **Orders -> CRM**: Order creation flow pulls customer data (already exists)
- **Shared**: Both modules use `Customer` type from `@/types`

### Inventory Module (`src/features/inventory/`)
- **CRM -> Inventory**: Dashboard shows available packaged inventory counts
- **Shared**: CRM SKU analytics references same product/strain data as inventory

### Delivery Module (`src/features/delivery/`)
- **CRM -> Delivery**: Account detail shows delivery history and upcoming deliveries
- **Shared**: Uses same geocoded customer addresses for route context
- **Shared**: `delivery_routes` and `delivery_schedule` tables referenced by both

### Invoicing (`src/features/orders/components/InvoiceManagement.tsx`)
- **CRM -> Invoicing**: Account detail shows outstanding invoices
- **CRM -> Invoicing**: Revenue calculations use invoice status for payment tracking

### Batches Module (`src/features/batches/`)
- **Indirect**: Batch COA status shown in order fulfillment context

### Analytics Module (`src/features/analytics/`)
- **CRM -> Analytics**: CRM dashboard extends analytics patterns
- **Shared**: Both use `errorService` pattern for data fetching
- **Shared**: Both reference `order_pipeline` view

### Settings Module (`src/features/settings/`)
- **CRM -> Settings**: User management provides sales rep data for assignment
- **Shared**: User profiles used for activity log attribution

### Customers Module (`src/features/customers/`)
- **CRM extends Customers**: CRM builds on the existing `customersService`
- **CRM uses**: `useCustomers` hook, `CustomerForm` component patterns
- **Migration path**: CRM Account Detail replaces basic customer edit for sales use cases

## Service Layer Dependencies

```
crm.service.ts
  imports from:
    @/lib/supabase          (Supabase client)
    @/services/error.service (Error handling)
  queries:
    customers               (with new CRM columns)
    orders                  (customer order history)
    order_items             (line item detail)
    products                (SKU data)
    invoices                (payment status)
    delivery_schedule        (Phase 2 - delivery history per account)
    customer_contacts       (Phase 1)
    customer_price_lists    (Phase 1)
    customer_activity_log   (Phase 1+2 - with linked_task_id, visit_id)
    sales_rep_assignments   (Phase 1)
    crm_tasks               (Phase 2)
    crm_visit_schedule      (Phase 2)
    crm_customer_summary    (Phase 1 view)
    crm_monthly_revenue_by_customer (Phase 1 view)
    crm_account_scores      (Phase 2 view)
    crm_product_mix_by_customer (Phase 2 view)
    crm_chain_location_performance (Phase 2.5 view)
```

## Type System Integration

### Canonical Types (already exist in `@/types`)
- `Customer`, `CustomerInsert`, `CustomerUpdate`
- `Order`, `OrderInsert`, `OrderUpdate`
- `OrderItem`
- `Product`

### New CRM Types (in `src/features/crm/types/`)

**Phase 1:**
- `CustomerContact` - contact record
- `CustomerPriceOverride` - price list entry
- `CustomerActivity` - activity log entry
- `SalesRepAssignment` - rep assignment
- `CRMDashboardStats` - dashboard aggregate data
- `AccountSummary` - extended customer with computed fields
- `AccountType` - 'direct' | 'hub_parent' | 'hub_child'
- `AccountStatus` - 'active' | 'inactive' | 'prospect' | 'churned'

**Phase 2:**
- `TaskType` - 'callback' | 'visit_reminder' | 'sample_drop' | 'reorder_prompt' | 'general'
- `TaskPriority` - 'low' | 'medium' | 'high' | 'urgent'
- `TaskStatus` - 'open' | 'in_progress' | 'completed' | 'cancelled'
- `CRMTask` - task record with joined customer_name, assigned_user_name
- `CRMTaskInput` - create/update input
- `VisitType` - 'check_in' | 'sample_drop' | 'new_pitch' | 'relationship'
- `VisitStatus` - 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
- `VisitSchedule` - visit record with joined customer_name, user_name
- `VisitScheduleInput` - scheduling input
- `AccountHealthScore` - computed health score from crm_account_scores view
- `CustomerProductMix` - per-customer product breakdown from crm_product_mix_by_customer view

**Phase 2.5:**
- `DeliveryModel` - 'direct_to_each' | 'hub_and_spoke'
- `ChainHealthLabel` - 'healthy' | 'cooling' | 'at_risk' | 'dormant' | 'no_orders'
- `ChainLocationPerformance` - per-child location metrics with revenue share, health label, ranking

## Navigation Integration

### sectionNavigation.ts Changes
CRM section with Phase 2 additions:
```typescript
{
  id: 'crm',
  label: 'CRM',
  icon: Users,
  defaultView: 'crm-dashboard',
  items: [
    { id: 'crm-dashboard', label: 'Sales Dashboard', icon: BarChart3 },
    { id: 'crm-queue', label: 'My Queue', icon: ClipboardList },       // Phase 2
    { id: 'crm-visit-calendar', label: 'Visit Calendar', icon: CalendarDays }, // Phase 2
    { id: 'crm-accounts', label: 'Accounts', icon: Building2 },
  ],
}
```

### App.tsx Changes
View cases including Phase 2:
```typescript
case 'crm-dashboard':
  return <CRMDashboard onViewChange={handleViewChange} />;
case 'crm-queue':
  return <SalesQueue onViewChange={handleViewChange} />;              // Phase 2
case 'crm-visit-calendar':
  return <VisitCalendar />;                                            // Phase 2
case 'crm-accounts':
  return <AccountsList onViewChange={handleViewChange} />;
// crm-account-detail:{id} handled in default case
```

## Data Safety Considerations

1. All new tables have RLS enabled with authenticated-user policies
2. New columns on `customers` are all nullable or have defaults -- no risk to existing data
3. `parent_customer_id` FK has ON DELETE SET NULL to prevent cascade issues
4. Denormalized fields (`last_order_date`, `lifetime_revenue`) are computed from existing data, not user-editable
5. Existing order creation flow is unaffected -- new columns are optional
