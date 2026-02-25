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

| Table | Purpose |
|---|---|
| `customer_contacts` | Multiple contacts per account |
| `customer_price_lists` | Per-customer pricing overrides |
| `customer_activity_log` | Sales interaction tracking |
| `sales_rep_assignments` | Rep-to-account linkage |

### New Views the CRM Creates

| View | Purpose |
|---|---|
| `crm_customer_summary` | Aggregated account metrics |
| `crm_monthly_revenue_by_customer` | Revenue trends per account |
| `crm_sku_performance` | Product performance analytics |
| `crm_revenue_pipeline` | Open order value by customer |

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
    customer_contacts       (NEW)
    customer_price_lists    (NEW)
    customer_activity_log   (NEW)
    sales_rep_assignments   (NEW)
    crm_customer_summary    (NEW view)
    crm_monthly_revenue_by_customer (NEW view)
```

## Type System Integration

### Canonical Types (already exist in `@/types`)
- `Customer`, `CustomerInsert`, `CustomerUpdate`
- `Order`, `OrderInsert`, `OrderUpdate`
- `OrderItem`
- `Product`

### New CRM Types (in `src/features/crm/types/`)
- `CustomerContact` - contact record
- `CustomerPriceOverride` - price list entry
- `CustomerActivity` - activity log entry
- `SalesRepAssignment` - rep assignment
- `CRMDashboardStats` - dashboard aggregate data
- `AccountSummary` - extended customer with computed fields
- `AccountType` - 'direct' | 'hub_parent' | 'hub_child'
- `AccountStatus` - 'active' | 'inactive' | 'prospect' | 'churned'

## Navigation Integration

### sectionNavigation.ts Changes
New section added:
```typescript
{
  id: 'crm',
  label: 'CRM',
  icon: Users,
  defaultView: 'crm-dashboard',
  items: [
    { id: 'crm-dashboard', label: 'Sales Dashboard', icon: BarChart3 },
    { id: 'crm-accounts', label: 'Accounts', icon: Building2 },
  ],
}
```

### App.tsx Changes
New cases in `renderView()`:
```typescript
case 'crm-dashboard':
  return <CRMDashboard onViewChange={handleViewChange} />;
case 'crm-accounts':
  return <AccountsList onViewChange={handleViewChange} />;
case 'crm-account-detail':
  return <AccountDetail accountId={selectedAccountId} onViewChange={handleViewChange} />;
```

## Data Safety Considerations

1. All new tables have RLS enabled with authenticated-user policies
2. New columns on `customers` are all nullable or have defaults -- no risk to existing data
3. `parent_customer_id` FK has ON DELETE SET NULL to prevent cascade issues
4. Denormalized fields (`last_order_date`, `lifetime_revenue`) are computed from existing data, not user-editable
5. Existing order creation flow is unaffected -- new columns are optional
