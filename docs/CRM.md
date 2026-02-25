# CRM Module - Dispensary Account Management

## Overview

The CRM module provides a centralized hub for managing dispensary accounts, tracking sales performance, monitoring order history, and managing customer relationships. It builds directly on the existing `customers`, `orders`, `order_items`, `invoices`, and `delivery_*` tables.

## Current State (Pre-CRM)

### Existing Data Assets
- **38 dispensary accounts** in `customers` table with addresses, geocoding, license info
- **126+ orders** across 7 months (Aug 2025 - Feb 2026), ~$559K tracked revenue
- **200+ products** organized by stage/type/strain with SKU tracking
- **Full delivery infrastructure**: routes, drivers, vehicles, schedules, manifests, coversheets
- **Invoicing system**: line items, tax, payment terms, status tracking
- **70+ database views** including `order_pipeline`, `monthly_sku_deliveries`, `order_demand_by_sku`

### What Was Missing
- No account hierarchy for hub deliveries (Sol Flower, Earth's Healing)
- Contact data stored as comma-delimited strings in single text fields
- No per-customer pricing (different dispensaries pay different rates)
- No sales activity tracking (calls, visits, samples, follow-ups)
- No sales rep assignment to accounts
- No CRM-specific dashboards or account detail views
- No revenue analytics at the account level

## Database Schema

### New Tables

#### `customer_contacts`
Multiple contacts per dispensary account (buyers, compliance officers, operations managers).
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers)
- `name` (text, NOT NULL)
- `title` (text) - e.g., "Buyer", "Compliance Officer"
- `email` (text)
- `phone` (text)
- `is_primary` (boolean, default false)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

#### `customer_price_lists`
Per-customer pricing overrides (e.g., Earth's Healing gets $30/unit smalls vs standard $40).
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers)
- `product_id` (uuid, FK -> products)
- `custom_price` (numeric, NOT NULL)
- `effective_date` (date, default CURRENT_DATE)
- `expires_at` (date, nullable)
- `notes` (text)
- `created_at` (timestamptz)

#### `customer_activity_log`
CRM activity tracking for sales interactions.
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers)
- `user_id` (uuid, FK -> user_profiles)
- `activity_type` (text: 'call' | 'email' | 'visit' | 'sample' | 'note' | 'follow_up')
- `subject` (text, NOT NULL)
- `body` (text)
- `follow_up_date` (date, nullable)
- `completed` (boolean, default false)
- `created_at` (timestamptz)

#### `sales_rep_assignments`
Links sales reps (user_profiles) to customer accounts.
- `id` (uuid, PK)
- `customer_id` (uuid, FK -> customers)
- `user_id` (uuid, FK -> user_profiles)
- `role` (text: 'primary' | 'secondary')
- `assigned_at` (timestamptz, default now())

### Columns Added to `customers`
- `parent_customer_id` (uuid, self-referential FK, nullable) - for sub-account hierarchy
- `account_type` (text, default 'direct') - 'direct' | 'hub_parent' | 'hub_child'
- `account_status` (text, default 'active') - 'active' | 'inactive' | 'prospect' | 'churned'
- `default_payment_terms` (text, default 'Net 30')
- `preferred_delivery_day` (text, nullable)
- `credit_limit` (numeric, nullable)
- `last_order_date` (timestamptz, denormalized)
- `lifetime_revenue` (numeric, default 0, denormalized)
- `tags` (text[], default '{}')

### CRM Analytics Views

#### `crm_customer_summary`
One row per customer with aggregated stats:
- Total orders, total revenue, avg order value
- First/last order dates, days since last order
- Account status, account type
- Top strains purchased

#### `crm_monthly_revenue_by_customer`
Monthly revenue breakdown per customer for trend analysis.

#### `crm_sku_performance`
SKU-level analytics: units sold, revenue, unique customers, avg price.

#### `crm_revenue_pipeline`
Open orders by customer with expected delivery dates and total value.

## Frontend Architecture

### Feature Module: `src/features/crm/`

```
src/features/crm/
  index.ts                    # Barrel exports
  components/
    index.ts
    CRMDashboard.tsx          # Main sales dashboard
    AccountsList.tsx          # Account listing with search/sort/filter
    AccountDetail.tsx         # Single account detail page
    AccountHeader.tsx         # Account name, status, type badges
    AccountOrderHistory.tsx   # Order history table for account
    AccountRevenueChart.tsx   # Monthly revenue chart for account
    AccountContacts.tsx       # Contact cards with actions
    AccountActivityLog.tsx    # Activity timeline
    AccountPriceList.tsx      # Custom pricing overrides
    SubAccountsPanel.tsx      # Hub child locations list
    RevenueStatsCards.tsx     # Revenue overview stat cards
    TopAccountsTable.tsx      # Sortable top accounts
    AtRiskAccounts.tsx        # Accounts not ordering recently
    SKUPerformanceGrid.tsx    # Top SKU analytics
    ActivityLogModal.tsx      # Modal for logging new activity
    PriceListModal.tsx        # Modal for editing price overrides
  services/
    index.ts
    crm.service.ts            # Main CRM data service
  hooks/
    index.ts
    useCRMDashboard.ts        # Dashboard data loading
    useAccountDetail.ts       # Single account with related data
    useAccountOrders.ts       # Order history for account
    useActivityLog.ts         # Activity log CRUD
    usePriceList.ts           # Price list management
  types/
    index.ts
    crm.types.ts              # CRM-specific types
```

### Navigation Integration

New "CRM" section added to `sectionNavigation.ts`:
```
CRM Section:
  - crm-dashboard    (Sales Dashboard)
  - crm-accounts     (Accounts)
  - crm-account-detail (Account Detail - navigated to from list)
```

### View Integration in App.tsx

New cases in `renderView()`:
- `crm-dashboard` -> `<CRMDashboard />`
- `crm-accounts` -> `<AccountsList />`
- `crm-account-detail` -> `<AccountDetail />`

## Key Design Decisions

1. **Denormalized revenue fields** on `customers` table (`last_order_date`, `lifetime_revenue`) for fast dashboard queries. Updated via database trigger on order status changes.

2. **Sub-account hierarchy** uses self-referential FK (`parent_customer_id`) rather than a separate accounts table, to preserve backwards compatibility with existing order creation flows.

3. **Price lists** are per-product-per-customer, not tiered/volume-based, matching the current simple pricing model in order_items.

4. **Activity log** is user-attributed (FK to user_profiles) for accountability.

5. **No separate CRM auth** - uses existing role-based auth from user_profiles.

## Integration Points

| Existing Feature | CRM Connection |
|---|---|
| Orders module | Account pages link to order creation; order history per account |
| Inventory | Available stock shown in account context |
| Delivery/Routing | Delivery schedule links to accounts; uses geocoded addresses |
| Invoicing | Invoice generation from account pages; payment tracking |
| Coversheets/Manifests | Compliance docs linked via orders |
| Batch/COA | COA documents attached to orders for compliance |
| Product catalog | Price list management references products table |
| Analytics | Revenue analytics extend existing dashboard patterns |

## Implementation Phases

### Phase 1 (Current)
- Database migrations for all new tables and columns
- CRM analytics views
- Frontend feature module skeleton
- Sales Dashboard with live data
- Accounts list page
- Account Detail page with sub-accounts
- Navigation integration

### Phase 2 (Future)
- Activity log with follow-up reminders
- Per-customer price list management
- Revenue trend charts (requires chart library)
- Automated at-risk account alerts
- Sales rep performance dashboard
- Export/reporting capabilities
