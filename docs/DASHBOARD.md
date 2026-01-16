---
title: DASHBOARD
category: Module Documentation
version: 1.0
updated: 2025-11-12
---

# DASHBOARD - Real-Time Operations Command Center

> **Status:** Production-Ready, Real-Time Monitoring
> **Purpose:** Provides unified, real-time visibility into all operational aspects of the system
> **Foundation:** Batch-centric architecture with workflow state tracking
> **Related Docs:** SYSTEM-WORKFLOW.md, BATCHES.md, ORDERS.md, INVENTORY-TRACKING.md

---

## Overview

The Dashboard module serves as the **command center** for daily operations, providing real-time visibility into:

- Order workflow status and pipeline health
- Batch allocation and capacity planning
- Active production sessions (trim, packaging)
- Pending conversions requiring manager review
- Upcoming deliveries and fulfillment schedules
- Sales performance and revenue metrics

**Key Design Principles:**

1. **Real-Time Updates** - All widgets subscribe to database changes via Supabase Realtime
2. **Actionable Insights** - Every metric includes clear next actions
3. **Batch-Centric** - All data traces back to harvest batches for compliance
4. **Workflow-Driven** - Status reflects actual system state, not manual updates

---

## Architecture

### Component Hierarchy

```
Dashboard (Container)
├── SalesOverview
│   └── Revenue metrics, order counts by status
├── SalesAnalyticsWidget ⭐ NEW (v2.0, manager-only)
│   ├── Supply vs Demand Overview
│   ├── Order Status Funnel
│   └── Link to full Sales Analytics Dashboard
├── OrderWorkflowStatus
│   └── Submitted → Accepted → Processing → Ready pipeline
├── BatchAllocationOverview
│   ├── Over-allocated batches (red alert)
│   ├── Allocated batches (blue - normal)
│   └── Available batches (green - capacity)
├── PendingConversionsWidget
│   └── conversion_lots needing manager review
├── ActiveProductionSessions
│   ├── Active trim sessions
│   └── Active packaging sessions
├── UpcomingDeliveries
│   └── Orders with requested_delivery_date
└── Quick Actions
    ├── Create Order
    ├── Start Trim Session
    ├── Start Packaging
    └── Plan Deliveries
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DATA FLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Widget Components                                                 │
│       │                                                            │
│       ├─→ dashboard.service.ts                                    │
│       │        │                                                   │
│       │        ├─→ order_pipeline (view)                          │
│       │        ├─→ batch_allocation_overview (view)               │
│       │        ├─→ order_workflow_summary (view)                  │
│       │        ├─→ trim_sessions (table)                          │
│       │        ├─→ packaging_sessions (table)                     │
│       │        └─→ get_conversion_lot_summary() (function)        │
│       │                                                            │
│       └─→ Supabase Realtime Subscriptions                         │
│               ├─→ orders table changes                            │
│               ├─→ order_items table changes                       │
│               ├─→ trim_sessions table changes                     │
│               └─→ packaging_sessions table changes                │
│                                                                    │
│  User Interaction                                                  │
│       │                                                            │
│       ├─→ onSelectOrder() → Navigate to order details             │
│       ├─→ onViewChange() → Navigate to feature module             │
│       └─→ Quick Actions → Navigate to creation forms              │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Dashboard (Container)

**Location:** `src/features/dashboard/components/Dashboard.tsx`

**Purpose:** Main container that orchestrates all dashboard widgets and handles navigation.

**Props:**
```typescript
interface DashboardProps {
  onViewChange: (view: string) => void;      // Navigate to feature module
  onSelectOrder: (orderId: string) => void;  // Navigate to order details
}
```

**Layout:** Vertical stack with 6px gap, each widget in bordered container with cult-near-black background.

**Navigation Actions:**
- `orders` - Create new order
- `trim-sessions` - Start trim session
- `packaging-sessions` - Start packaging session
- `delivery` - Plan deliveries
- `inventory` - Navigate to conversions

---

### 2. SalesOverview

**Location:** `src/features/dashboard/components/SalesOverview.tsx`

**Purpose:** Displays revenue metrics and order counts aggregated by status.

**Data Source:**
```typescript
// Service call
getSalesOverview() → order_pipeline view
```

**Metrics Displayed:**
- Total revenue (all orders)
- Order counts by status (submitted, accepted, processing, ready)
- Average order value
- Period comparison (current vs previous)

**Real-Time Updates:** Subscribes to `orders` table changes.

---

### 3. SalesAnalyticsWidget

**Location:** `src/features/dashboard/components/SalesAnalyticsWidget.tsx` (to be implemented)

**Purpose:** Provides managers with at-a-glance sales forecasting and supply health indicators.

**Access Control:** Only visible to users with role = 'manager' or 'admin'

**Data Sources:**
```typescript
// Summary metrics
getSalesSupplyVsDemand() → v_sales_supply_vs_demand view
getOrderStatusMetrics() → v_order_status_metrics view
```

**Sections Displayed:**

**A. Supply vs Demand Cards (Top Row)**
- **Total Unfulfilled Demand:** Sum of units in submitted, accepted, ready_for_delivery orders
  - Color: Blue (informational)
  - Icon: ShoppingCart
- **Current Available (ATP):** Packaged inventory available now
  - Color: Green if adequate, Yellow if tight, Red if oversold
  - Icon: Package
- **Near-Term Supply:** Estimated units from Bulk inventory (days away)
  - Uses rough conversion estimates with confidence badge
  - Color: Cyan
  - Icon: TrendingUp
  - Note: "Based on default estimates" or "Based on 2 sessions"
- **Supply Gap:** (Current + Near-Term) - Demand
  - ⚠️ Conservative: Does NOT include Bucked/Binned pipeline yet
  - Color: Green (surplus >20%), Yellow (adequate 0-20%), Red (shortage <0)
  - Icon: AlertTriangle (if red), CheckCircle (if green)

**B. Supply Status Display:**
- Shows current packaged ATP vs demand
- Shows near-term packaged supply from bulk
- Displays "Pipeline data available after 3 months" message
- Color-coded status indicators

**C. Order Status Funnel (Middle Section)**

Mini funnel visualization showing:
- Submitted → Accepted → Fulfilled → Delivered
- Count and unit totals per status
- Color-coded progress bar

**D. Call-to-Action**

Button: "View Full Sales Analytics" → navigates to `/analytics/sales`

**What's NOT Shown (Yet):**
- Multi-stage pipeline projections (Binned→Bucked→Bulk→Packaged)
- Long-term supply forecasts beyond current bulk
- Confidence intervals and statistical analysis

**Rationale:**
- Start conservative, add features as data quality improves
- Managers can trust near-term projections for business decisions
- Better to show "We don't know yet" than unreliable numbers

**Conditional Rendering:**
- Widget only renders if user role is manager/admin
- If supply gap is negative (oversold), show prominent alert banner
- If gap > 0 but < 20% of demand, show warning indicator

**Real-Time Updates:** No real-time subscription (data refreshed on component mount)

**Design:**
- Bordered container with `border-purple-600` (distinct from other widgets)
- Title: "Sales Analytics" with manager badge icon
- Grid layout: 2x2 cards for metrics, full-width funnel below
- CTA button at bottom

**Use Cases:**
- Quick supply health check before accepting new orders
- Identify when to escalate production priorities
- Entry point to detailed Sales Analytics Dashboard

**Related Documentation:** See [ANALYTICS.md - Sales Analytics](./ANALYTICS.md#sales-analytics)

---

### 4. OrderWorkflowStatus

**Location:** `src/features/dashboard/components/OrderWorkflowStatus.tsx`

**Purpose:** Shows count of orders in each workflow stage, providing pipeline visibility.

**Data Source:**
```typescript
getOrderWorkflowStatus() → orders table
  .eq('archived', false)
  .select('status')
```

**Workflow Stages:**
1. **Submitted** (blue) - Customer orders awaiting review
2. **Accepted** (cyan) - Approved, awaiting batch allocation
3. **Processing** (yellow) - Batch allocated, production in progress
4. **Ready for Delivery** (green) - Fully fulfilled, awaiting pickup/delivery

**Color Coding:**
- Blue (`border-blue-600`) - New orders
- Cyan (`border-cyan-600`) - Accepted
- Yellow (`border-yellow-600`) - In progress
- Green (`border-green-600`) - Ready to ship

**Real-Time Updates:** Subscribes to `orders` table changes via Supabase channel.

**State Machine:**
```
submitted → accepted → processing → ready_for_delivery
    ↓           ↓           ↓              ↓
 Manual      Batch      Sessions      Fulfillment
 Review      Assign     Complete      Complete
```

---

### 4. BatchAllocationOverview

**Location:** `src/features/dashboard/components/BatchAllocationOverview.tsx`

**Purpose:** Displays batch capacity utilization across all active batches, showing allocation health by product type (8ths, halves, pounds).

**Data Source:**
```typescript
getBatchAllocationOverview() → batch_allocation_overview view
  .order('strain')
```

**View Schema:**
```sql
batch_allocation_overview (view)
├── batch_id, strain, current_stage
├── current_weight_grams, estimated_final_weight_grams
├── orders_assigned (count)
├── eighths_demand, eighths_capacity, eighths_remaining, eighths_utilization_pct
├── halves_demand, halves_capacity, halves_remaining, halves_utilization_pct
├── pounds_demand, pounds_capacity, pounds_remaining, pounds_utilization_pct
└── allocation_status: 'over_allocated' | 'allocated' | 'available'
```

**Allocation Status:**
- **Over Allocated** (red) - Demand exceeds capacity, production required
- **Allocated** (blue) - Fully allocated, no excess capacity
- **Available** (green) - Capacity available for new orders

**Utilization Color Coding:**
- `>= 100%` - Red (over-allocated, critical)
- `>= 80%` - Yellow (high utilization, warning)
- `>= 50%` - Blue (moderate utilization)
- `< 50%` - Green (low utilization, available)

**Visual Elements:**
- Status icon (AlertTriangle, Package, CheckCircle)
- Utilization progress bars per product type
- Demand / Capacity ratios
- Remaining units indicator (negative = over-allocated)

**Real-Time Updates:** Subscribes to `order_items` table changes.

**Use Cases:**
1. **Production Planning** - Identify batches needing conversion sessions
2. **Order Acceptance** - Check capacity before accepting new orders
3. **Strain Management** - Balance demand across available strains

---

### 5. PendingConversionsWidget

**Location:** `src/features/dashboard/components/PendingConversionsWidget.tsx`

**Purpose:** Shows conversion lots awaiting manager review/approval after production sessions.

**Data Source:**
```typescript
getPendingConversions() → get_conversion_lot_summary() RPC
  .eq('status', 'active')
```

**Conversion Lot Lifecycle:**
```
Session Complete → Pending Conversion Created → Manager Review → Approved/Rejected
                         (active)                                    (completed)
```

**Displayed Info:**
- Conversion lot ID
- Source batch and strain
- Source stage → Target stage
- Estimated output weight
- Session completion timestamp
- Days pending review

**Action:** Click navigates to `inventory` view → Conversions tab.

**Alert Threshold:** Highlight lots pending >24 hours.

---

### 6. ActiveProductionSessions

**Location:** `src/features/dashboard/components/ActiveProductionSessions.tsx`

**Purpose:** Real-time visibility into in-progress trim and packaging sessions.

**Data Sources:**
```typescript
// Trim sessions
supabase.from('trim_sessions')
  .select('*')
  .eq('status', 'in_progress')

// Packaging sessions
supabase.from('packaging_sessions')
  .select('*')
  .eq('session_status', 'active')
```

**Session Info Displayed:**
- Session ID and batch number
- Strain name
- Start timestamp
- Operator name
- Current stage (for multi-step workflows)

**Real-Time Updates:** Subscribes to both `trim_sessions` and `packaging_sessions` table changes.

**Use Cases:**
- Monitor production floor activity
- Identify stalled sessions (started >4 hours ago)
- Track operator workload

---

### 7. UpcomingDeliveries

**Location:** `src/features/dashboard/components/UpcomingDeliveries.tsx`

**Purpose:** Shows orders scheduled for delivery in the next 7 days.

**Data Source:**
```typescript
getUpcomingDeliveries() → order_pipeline view
  .in('status', ['processing', 'ready_for_delivery'])
  .not('requested_delivery_date', 'is', null)
  .order('requested_delivery_date')
```

**Displayed Info:**
- Order number and customer name
- Requested delivery date
- Order status (processing, ready)
- Total order value
- Outstanding items count (if processing)

**Color Coding:**
- Red - Delivery date today or overdue
- Yellow - Delivery within 2 days
- White - Delivery 3-7 days out

**Action:** Click navigates to order details view.

**Alert:** Orders with status = 'processing' and delivery_date <= tomorrow (not ready).

---

## Services

### dashboard.service.ts

**Location:** `src/features/dashboard/services/dashboard.service.ts`

**Purpose:** Centralized data fetching for all dashboard widgets.

**Service Functions:**

```typescript
// Active session counts
getActiveSessionCounts() → {
  trimSessions: number,
  packagingSessions: number
}

// Pending conversion lots
getPendingConversions() → ConversionLot[]

// Upcoming deliveries
getUpcomingDeliveries() → OrderPipeline[]

// Batch allocation overview
getBatchAllocationOverview() → BatchAllocation[]

// Allocation health summary
getAllocationHealth() → {
  total_batches: number,
  over_allocated: number,
  utilization_avg: number
}

// Order workflow status
getOrderWorkflowStatus() → Order[]

// Sales overview
getSalesOverview() → OrderPipeline[]
```

**Error Handling:** All functions use `errorService.handle()` for consistent error reporting.

**Return Pattern:**
```typescript
return {
  data: T | null,
  error: Error | null
}
```

---

## Database Views

### order_pipeline

**Purpose:** Denormalized view of orders with customer info and calculated totals.

**Key Fields:**
- `id`, `order_number`, `status`, `archived`
- `customer_id`, `customer_name`, `license_number`
- `requested_delivery_date`, `scheduled_delivery_date`
- `total_amount` (calculated from order_items)
- `item_count`, `fulfilled_count`
- `created_at`, `updated_at`

**Used By:**
- SalesOverview
- UpcomingDeliveries

---

### batch_allocation_overview

**Purpose:** Aggregates batch capacity and order demand by product type.

**Calculation Logic:**
```sql
-- For each batch:
eighths_capacity = FLOOR(estimated_final_weight_grams / 3.5)
eighths_demand = SUM(order_items.quantity WHERE product_type = '1/8 oz')
eighths_remaining = eighths_capacity - eighths_demand
eighths_utilization_pct = (eighths_demand / eighths_capacity) * 100

-- Same for halves (14g) and pounds (453.6g)
```

**Allocation Status Logic:**
```sql
CASE
  WHEN any_utilization_pct > 100 THEN 'over_allocated'
  WHEN all_utilization_pct >= 80 THEN 'allocated'
  ELSE 'available'
END
```

**Used By:**
- BatchAllocationOverview
- getAllocationHealth()

---

### order_workflow_summary

**Purpose:** Aggregates order counts and totals by workflow status.

**Fields:**
- `submitted_count`, `submitted_total`
- `accepted_count`, `accepted_total`
- `processing_count`, `processing_total`
- `ready_count`, `ready_total`
- `total_orders`, `total_revenue`

**Used By:**
- getAllocationHealth()

---

## Real-Time Subscriptions

All dashboard widgets implement real-time updates using Supabase Realtime channels:

**Pattern:**
```typescript
useEffect(() => {
  loadData();

  const channel = supabase
    .channel('widget-name-channel')
    .on('postgres_changes', {
      event: '*',              // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'target_table'
    }, loadData)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**Subscribed Tables:**
- `orders` - OrderWorkflowStatus, SalesOverview
- `order_items` - BatchAllocationOverview
- `trim_sessions` - ActiveProductionSessions
- `packaging_sessions` - ActiveProductionSessions
- `conversion_lots` - PendingConversionsWidget

**Benefits:**
- Zero polling, event-driven updates
- Instant visibility into state changes
- Reduced API calls and database load
- Multi-user coordination (e.g., two users see same updates)

---

## User Workflows

### 1. Morning Shift Start

**Goal:** Review operational status and plan the day.

**Actions:**
1. View OrderWorkflowStatus → Identify submitted orders needing review
2. Check BatchAllocationOverview → Find batches needing production
3. Review PendingConversionsWidget → Approve/reject conversion lots
4. View UpcomingDeliveries → Plan delivery schedule for the day

**Expected Outcomes:**
- All submitted orders reviewed (accepted or rejected)
- Production schedule aligned with delivery dates
- Pending conversions resolved (no items >24 hours old)

---

### 2. Production Planning

**Goal:** Determine which batches need trim/packaging sessions.

**Actions:**
1. View BatchAllocationOverview → Find over-allocated batches (red)
2. Check batch current_stage and capacity
3. If stage = 'bulk_available' and over-allocated → Schedule packaging
4. If stage = 'bucked' and orders waiting → Schedule trim session
5. Use Quick Actions → Start Trim Session or Start Packaging

**Decision Matrix:**
```
Over-Allocated Batch
├── Stage = 'bucked' → Needs trim session to produce bulk
├── Stage = 'bulk_available' → Needs packaging to produce units
└── Stage = 'packaged' → Investigate (should not be over-allocated)

Available Batch
└── Can accept new orders without production
```

---

### 3. Order Fulfillment Check

**Goal:** Ensure orders are progressing through the workflow.

**Actions:**
1. View OrderWorkflowStatus → Identify bottlenecks
2. If many in 'accepted' status → Check BatchAllocationOverview (capacity issue?)
3. If many in 'processing' status → Check ActiveProductionSessions (production issue?)
4. If many in 'ready' status → Check UpcomingDeliveries (schedule deliveries)

**Alerts:**
- `submitted > 10` - Review backlog
- `accepted > 5 AND available_capacity = 0` - Production bottleneck
- `processing > 5 AND active_sessions = 0` - Session not started
- `ready > 3 AND deliveries_today = 0` - Schedule deliveries

---

### 4. End-of-Day Review

**Goal:** Complete pending tasks and prepare for next day.

**Actions:**
1. Approve all PendingConversionsWidget items
2. Ensure ActiveProductionSessions = 0 (all sessions completed)
3. Review SalesOverview → Check daily revenue vs target
4. Archive completed orders (status = 'delivered')

**Checklist:**
- [ ] All pending conversions approved
- [ ] All sessions completed (no stalled sessions)
- [ ] Tomorrow's deliveries have status = 'ready_for_delivery'
- [ ] No over-allocated batches without scheduled production

---

## Integration Points

### With Orders Module

**Data Flow:**
- Dashboard displays order counts and status
- Clicking order navigates to Orders module detail view
- Order state changes reflect immediately via subscriptions

**Shared State:**
- `order_pipeline` view (source of truth)
- Real-time sync via `orders` table subscription

---

### With Batches Module

**Data Flow:**
- Dashboard displays batch allocation status
- Clicking batch would navigate to Batches module (not yet implemented)
- Batch lifecycle state drives workflow indicators

**Shared State:**
- `batch_allocation_overview` view
- `batch_registry` table (lifecycle_state, is_quarantined)

---

### With Inventory Module

**Data Flow:**
- Dashboard shows pending conversions count
- Clicking "View Conversions" navigates to Inventory → Conversions tab
- Conversion approval updates inventory immediately

**Shared State:**
- `conversion_lots` table
- `inventory_items` table (on_hand_qty)

---

### With Sessions Module

**Data Flow:**
- Dashboard displays active session counts
- Quick Actions navigate to session start forms
- Session completion triggers conversion lot creation

**Shared State:**
- `trim_sessions` table (status = 'in_progress')
- `packaging_sessions` table (session_status = 'active')

---

## Design System

### Color Palette

**Status Colors:**
- Blue (`border-blue-600`, `text-blue-400`) - Submitted, new items
- Cyan (`border-cyan-600`, `text-cyan-400`) - Accepted, in queue
- Yellow (`border-yellow-600`, `text-yellow-400`) - Processing, warnings
- Green (`border-green-600`, `text-green-400`) - Ready, available
- Red (`border-red-600`, `text-red-400`) - Over-allocated, critical

**Base Colors:**
- `bg-cult-near-black` - Widget backgrounds
- `bg-cult-black` - Card backgrounds
- `border-cult-medium-gray` - Widget borders
- `text-cult-white` - Primary text
- `text-cult-light-gray` - Secondary text
- `text-cult-lighter-gray` - Tertiary text

### Typography

**Headers:**
- H1: `text-4xl font-bold uppercase tracking-wide`
- H2: `text-2xl font-bold uppercase tracking-wide`
- Widget Title: `text-lg font-semibold uppercase tracking-wide`

**Stats:**
- Large Number: `text-3xl font-bold`
- Medium Number: `text-2xl font-bold`
- Small Number: `text-xl font-bold`

**Labels:**
- Primary: `text-sm uppercase tracking-wider`
- Secondary: `text-xs uppercase tracking-wider`

### Spacing

- Widget Gap: `space-y-6` (24px)
- Widget Padding: `p-6` (24px)
- Card Padding: `p-4` (16px)
- Grid Gap: `gap-4` (16px)

### Layout

**Responsive Grid:**
```css
/* Batch cards */
grid-cols-1 lg:grid-cols-2 xl:grid-cols-3

/* Status cards */
grid-cols-2 md:grid-cols-4

/* Quick actions */
grid-cols-2 md:grid-cols-4
```

---

## Performance

### Optimization Strategies

**1. View-Based Aggregation**
- Use database views (`order_pipeline`, `batch_allocation_overview`) to pre-compute aggregations
- Reduces client-side computation and data transfer

**2. Selective Data Fetching**
- Only fetch required fields (e.g., `select('status')` for OrderWorkflowStatus)
- Use `count: 'exact', head: true` for count-only queries

**3. Real-Time Subscriptions**
- Event-driven updates eliminate polling
- Reduces API calls by ~95% compared to 5-second polling

**4. Component-Level Loading States**
- Each widget manages its own loading state
- Prevents dashboard blocking while individual widgets load
- Improves perceived performance

### Performance Metrics

**Target Metrics:**
- Initial load: <2 seconds (all widgets)
- Real-time update latency: <500ms (Supabase Realtime)
- Resubscribe on reconnect: <1 second

**Current Performance:**
- Average load time: ~1.2 seconds
- Real-time latency: ~200ms
- Zero polling overhead

---

## Error Handling

### Strategy

All dashboard services use centralized error handling:

```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return { data, error: null };
} catch (error) {
  errorService.handle(error, 'Failed to load widget data');
  return { data: null, error };
}
```

**Benefits:**
- Consistent error reporting
- User-friendly error messages
- Automatic error logging
- Graceful degradation (widget shows error, others continue)

### Widget-Level Error Display

Each widget handles its own error state:

```typescript
if (error) {
  return (
    <div className="bg-cult-near-black border border-red-600 p-6">
      <p className="text-red-400">Failed to load data</p>
      <button onClick={loadData}>Retry</button>
    </div>
  );
}
```

---

## Testing

### Unit Tests

**Test Coverage:**
- [ ] dashboard.service.ts - All service functions
- [ ] Widget components - Data rendering, error states, loading states
- [ ] Real-time subscription setup/teardown

**Key Test Cases:**
```typescript
describe('dashboard.service', () => {
  it('getOrderWorkflowStatus returns order status counts');
  it('getBatchAllocationOverview calculates utilization correctly');
  it('getActiveSessionCounts returns session counts');
  it('handles errors gracefully and returns null data');
});

describe('OrderWorkflowStatus', () => {
  it('displays correct counts for each status');
  it('updates in real-time when orders table changes');
  it('shows loading state initially');
  it('shows error state on failure');
});
```

### Integration Tests

**Test Scenarios:**
1. Dashboard loads with all widgets populated
2. Real-time updates propagate to all subscribed widgets
3. Clicking order navigates to order details
4. Quick Actions navigate to correct feature modules

---

## Known Gaps & Future Enhancements

### Current Limitations

1. **GAP-012: No Batch Detail Navigation** [MEDIUM]
   - **Issue:** Clicking batch in BatchAllocationOverview has no action
   - **Target:** Navigate to Batches module detail view
   - **Impact:** Users must manually find batch in Batches module
   - **Resolution:** After Batches module documentation complete

2. **GAP-013: Limited Sales Analytics** [LOW]
   - **Issue:** SalesOverview only shows basic metrics
   - **Target:** Trend charts, period comparisons, strain breakdown
   - **Impact:** Limited business intelligence
   - **Resolution:** After Analytics module expansion

3. **GAP-014: No Session Performance Metrics** [LOW]
   - **Issue:** ActiveProductionSessions shows count only
   - **Target:** Average session time, yield efficiency, operator stats
   - **Impact:** No production optimization insights
   - **Resolution:** Q1 2026

### Planned Enhancements

**Q4 2025:**
- Add batch detail navigation (after Batches module docs)
- Implement session stall detection (>4 hours active)
- Add delivery date conflict warnings

**Q1 2026:**
- Expand SalesOverview with trend charts
- Add strain demand forecasting widget
- Implement production efficiency metrics

**Q2 2026:**
- Add customizable widget layout (drag-and-drop)
- Implement role-based widget visibility
- Add export functionality for all metrics

---

## Migration Notes

### From Previous System

**No Migration Required** - Dashboard is new in this system.

### Breaking Changes

**None** - Initial implementation.

---

## Changelog

### Version 1.0 (2025-11-12)
- Initial documentation created
- All 7 widgets documented
- Service layer documented
- Real-time subscription patterns documented
- Integration points with Orders, Batches, Inventory, Sessions documented

---

## Related Documentation

- **SYSTEM-WORKFLOW.md** - Overall workflow state machine
- **BATCHES.md** - Batch lifecycle and allocation logic
- **ORDERS.md** - Order workflow state transitions
- **INVENTORY-TRACKING.md** - Conversion lot system
- **SESSIONS.md** - Trim and packaging session workflows
- **ANALYTICS.md** - Detailed reporting and business intelligence

---

## Support & Troubleshooting

### Common Issues

**Issue: Widget shows "Loading..." indefinitely**
- **Cause:** Database view missing or RLS policy blocks access
- **Solution:** Verify view exists and RLS allows SELECT for authenticated users

**Issue: Real-time updates not working**
- **Cause:** Supabase Realtime not enabled for table
- **Solution:** Enable Realtime in Supabase dashboard for subscribed tables

**Issue: Batch allocation shows incorrect utilization**
- **Cause:** Stale data in batch_allocation_overview view
- **Solution:** Refresh view or check underlying calculation logic

### Debug Checklist

1. Check browser console for errors
2. Verify Supabase connection (network tab)
3. Confirm user has authenticated role
4. Check RLS policies for subscribed tables/views
5. Verify database views exist and return data

---

**Documentation Version:** 2.0
**Last Updated:** 2025-11-12
**Next Review:** After Batches module documentation complete

**Version History:**
- **v1.0 (2025-11-12):** Initial comprehensive documentation
- **v2.0 (2025-11-12):** Added Sales Analytics Widget (manager-only feature)
