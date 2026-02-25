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
- `delivery_model` (text, default 'direct_to_each') - 'direct_to_each' | 'hub_and_spoke' (Phase 2.5)

### CRM Analytics Views

#### `crm_customer_summary`
One row per customer with aggregated stats:
- Total orders, total revenue, avg order value
- First/last order dates, days since last order
- Account status, account type
- Top strains purchased
- `delivery_model`, `child_total_revenue`, `child_total_orders` (Phase 2.5)

#### `crm_chain_location_performance` (Phase 2.5)
Per-child-location metrics for hub parents with revenue share %, health labels, and revenue ranking. See [CRM-SUB-ACCOUNTS.md](./CRM-SUB-ACCOUNTS.md) for full schema.

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

## Sales Activity Management (Phase 2)

Phase 2 adds task tracking, visit scheduling, account health scoring, and product deep-dive analytics to the CRM module.

### New Tables

#### `crm_tasks`
Actionable follow-up items linked to customer accounts. Each task has a type, priority, due date, and status.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `customer_id` | uuid, FK -> customers | YES | Account the task relates to |
| `assigned_user_id` | uuid, FK -> user_profiles | no | Sales rep assigned; null = unassigned |
| `task_type` | text | YES | `callback`, `visit_reminder`, `sample_drop`, `reorder_prompt`, `general` |
| `title` | text | YES | Short description |
| `description` | text | no | Extended notes |
| `due_date` | date | YES | When this task should be completed |
| `priority` | text | YES | `low`, `medium`, `high`, `urgent` (default `medium`) |
| `status` | text | YES | `open`, `in_progress`, `completed`, `cancelled` (default `open`) |
| `completed_at` | timestamptz | no | Set on completion |
| `related_activity_id` | uuid, FK -> customer_activity_log | no | Optional back-reference to the activity that spawned this task |
| `created_at` | timestamptz | auto | `default now()` |
| `updated_at` | timestamptz | auto | `default now()` |

**Task Lifecycle:**
```
  open ──> in_progress ──> completed
    │           │
    │           └──> cancelled
    └──> cancelled
    │
    └──(snooze: push due_date forward)──> open (same task, new due_date)
```

**Rules:**
1. `completed_at` is set automatically when `status` changes to `completed`
2. Completing a task auto-creates a `customer_activity_log` entry with `activity_type = 'follow_up'` and `linked_task_id` back-reference
3. Snoozing updates `due_date` but does not change `status`
4. Tasks are never deleted; cancelled tasks remain for audit trail

#### `crm_visit_schedule`
Planned account visits with time window, type classification, and outcome capture.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `customer_id` | uuid, FK -> customers | YES | Account being visited |
| `user_id` | uuid, FK -> user_profiles | no | Sales rep conducting the visit |
| `visit_date` | date | YES | Scheduled date |
| `visit_time_window` | text | no | e.g. "Morning", "Afternoon", "10am-12pm" |
| `visit_type` | text | YES | `check_in`, `sample_drop`, `new_pitch`, `relationship` |
| `location_notes` | text | no | Where to meet, parking instructions, etc. |
| `status` | text | YES | `scheduled`, `completed`, `cancelled`, `rescheduled` (default `scheduled`) |
| `outcome_notes` | text | no | Filled on completion |
| `linked_activity_id` | uuid, FK -> customer_activity_log | no | Auto-set on completion |
| `created_at` | timestamptz | auto | `default now()` |
| `updated_at` | timestamptz | auto | `default now()` |

**Visit Lifecycle:**
```
  scheduled ──> completed
      │
      ├──> cancelled
      │
      └──> rescheduled ──> scheduled (new visit_date)
```

**Rules:**
1. Completing a visit auto-creates a `customer_activity_log` entry with `activity_type = 'visit'` and `visit_id` back-reference
2. Rescheduling updates `visit_date` and sets `status` back to `scheduled`
3. Visits are drag-and-drop reschedulable on the visit calendar

### Columns Added to `customer_activity_log`
- `linked_task_id` (uuid, FK -> crm_tasks, nullable) - back-reference when activity was auto-created by task completion
- `visit_id` (uuid, FK -> crm_visit_schedule, nullable) - back-reference when activity was auto-created by visit completion

### New Views

#### `crm_account_scores`
Computed health score for each customer account, evaluated on read (not stored).

| Field | Type | Notes |
|-------|------|-------|
| `customer_id` | uuid | PK from customers |
| `customer_name` | text | |
| `dispensary_code` | text | |
| `health_score` | numeric | 0-100, higher = healthier |
| `health_label` | text | `healthy` (75-100), `cooling` (50-74), `at_risk` (25-49), `dormant` (0-24) |
| `days_since_last_order` | integer | |
| `order_frequency_30d` | integer | Orders in last 30 days |
| `order_frequency_90d` | integer | Orders in last 90 days |
| `revenue_trend` | text | `growing`, `stable`, `declining`, `inactive` |
| `open_task_count` | integer | Unresolved tasks |
| `last_visit_date` | date | Most recent completed visit |

**Scoring Formula:**
- Recency (40%): Days since last order, scaled 0-40 (0 days = 40, 60+ days = 0)
- Frequency (25%): Orders in last 90 days, scaled 0-25 (6+ = 25, 0 = 0)
- Revenue trend (20%): Compare last 60 day revenue to prior 60 days (growing = 20, stable = 15, declining = 5, inactive = 0)
- Engagement (15%): Based on open tasks resolved + visits in last 30 days (2+ activities = 15, 1 = 10, 0 = 5; no tasks/visits ever = 0)

#### `crm_product_mix_by_customer`
Per-customer product breakdown aggregated from order history.

| Field | Type | Notes |
|-------|------|-------|
| `customer_id` | uuid | |
| `customer_name` | text | |
| `product_id` | uuid | |
| `product_name` | text | |
| `product_type` | text | |
| `product_category` | text | |
| `strain` | text | |
| `total_units` | integer | Total units ordered |
| `total_revenue` | numeric | |
| `avg_unit_price` | numeric | |
| `first_order_date` | date | |
| `last_order_date` | date | |
| `order_count` | integer | Number of orders containing this product |

### Frontend Architecture (Phase 2 Additions)

```
src/features/crm/
  components/
    SalesQueue.tsx              # Daily action center (tasks + visits)
    VisitCalendar.tsx           # Monthly visit calendar with drag-and-drop
    AccountProductMix.tsx       # Product deep-dive tab in account detail
    AccountDeliveryHistory.tsx  # Delivery history timeline in account detail
    AccountHealthBadge.tsx      # Health score pill for headers/tables
  hooks/
    useSalesQueue.ts            # Task + visit data for current user
    useVisitCalendar.ts         # Visit schedule for calendar view
    useAccountDeepDive.ts       # Product mix + delivery history for account
    useTaskManager.ts           # Task CRUD with filtering
```

### Navigation (Phase 2 Additions)

```
CRM Section:
  - crm-dashboard      (Sales Dashboard)       [existing]
  - crm-queue          (My Queue)              [NEW]
  - crm-visit-calendar (Visit Calendar)        [NEW]
  - crm-accounts       (Accounts)              [existing]
  - crm-account-detail (Account Detail)        [existing, enhanced]
```

### Key Design Decisions (Phase 2)

6. **Task and Visit auto-logging:** Completing a task or visit auto-creates a `customer_activity_log` entry with back-reference. Single source of truth for account timeline; no manual double-entry.

7. **Health scores as a VIEW, not stored columns:** Computed on read via Postgres view rather than stored/updated. Always fresh, no sync issues, acceptable performance with <100 customer accounts.

8. **Visit Calendar follows DistributionCalendar pattern:** Same monthly grid + drag-and-drop + real-time subscriptions + modal details. Consistency reduces maintenance burden and onboarding time.

9. **Product deep-dive is a VIEW, not a materialized table:** Aggregated from `order_items` + `orders` + `products` on read. Data is always current and requires no refresh triggers.

### Key Design Decisions (Phase 2.5)

10. **Delivery model on customers, not a separate table:** Simple text column (`direct_to_each` | `hub_and_spoke`) on the existing customers table. Only hub parents need this value; direct accounts default to `direct_to_each`. No junction table needed since the delivery model is a property of the customer, not a many-to-many relationship.

11. **Chain performance as a VIEW with revenue share %:** The `crm_chain_location_performance` view computes per-child metrics, revenue share percentages, health labels, and revenue rankings in a single query. Using CTEs (child_stats -> parent_totals -> final join) ensures correct percentages and avoids N+1 queries in the UI.

## Implementation Phases

### Phase 1 (Complete)
- Database migrations for all new tables and columns
- CRM analytics views
- Frontend feature module skeleton
- Sales Dashboard with live data
- Accounts list page
- Account Detail page with sub-accounts
- Navigation integration

### Phase 2 (Complete)
- `crm_tasks` and `crm_visit_schedule` tables with RLS
- `crm_account_scores` and `crm_product_mix_by_customer` views
- `linked_task_id` and `visit_id` columns on `customer_activity_log`
- Sales Queue (My Queue) daily action center
- Visit Calendar with drag-and-drop scheduling
- Account Product Mix deep-dive tab
- Account Delivery History panel
- Account Health Badge integration
- Enhanced Activity Log with task/visit linking

### Phase 2.5 (Complete)
- `delivery_model` column on customers table
- `crm_chain_location_performance` view with revenue share, health labels, ranking
- Enhanced `crm_customer_summary` with delivery_model, child_total_revenue, child_total_orders
- Accounts list: expand/collapse chain rows, combined revenue sort, child search bubbling
- Account header: delivery model badge, chain-level metrics for hub parents
- SubAccountsPanel: per-child health badges, revenue share progress bars, top performer callout
- Dashboard: hub_child exclusion, combined revenue for hub parents, CHAIN badge

### Phase 3 (Future)
- Per-customer price list management
- Revenue trend charts (requires chart library)
- Sales rep performance dashboard
- Export/reporting capabilities
- Automated at-risk account alerts/notifications
