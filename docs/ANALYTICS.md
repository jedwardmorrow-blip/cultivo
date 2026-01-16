---
title: ANALYTICS
category: Analytics & Reporting
version: 2.0
updated: 2025-11-12
---

# ANALYTICS - Performance Metrics & Business Intelligence

> **Status:** Production-Ready with Sales Analytics (v2.0)
> **Purpose:** Provides operational analytics, production metrics, and sales forecasting
> **Foundation:** Batch-centric tracking enables strain-level conversion analysis and traceability
> **Related Docs:** DASHBOARD.md, ORDERS.md, SESSIONS.md, INVENTORY-TRACKING.md

---

## TABLE OF CONTENTS

1. [Purpose](#purpose)
2. [Architecture Overview](#architecture-overview)
3. [Production Analytics](#production-analytics)
4. [Sales Analytics](#sales-analytics) ⭐ **NEW in v2.0**
5. [Database Views](#database-views)
6. [Service Layer](#service-layer)
7. [User Workflows](#user-workflows)
8. [Key Rules](#key-rules)
9. [Implementation Status](#implementation-status)

---

## Purpose

The Analytics module provides **three core capabilities** for operational decision-making:

### 1. Production Performance Tracking
- Worker productivity metrics (trimmers, packagers)
- Daily production summaries for inventory system entry
- End-of-day consolidated package reports
- Strain conversion rate analysis

### 2. Sales Analytics & Forecasting
- Inventory projections based on in-process batches
- Order demand vs available supply analysis
- Strain-specific 6-month historical conversion rates
- Order status funnel and fulfillment metrics
- Sales velocity and days-of-supply calculations

### 3. Business Intelligence
- Revenue metrics and order value tracking
- Throughput trends over time
- Conversion efficiency identification
- Bottleneck analysis for operations optimization

**Primary Users:**
- **Operations Managers:** Daily production reporting, worker productivity
- **Sales Managers:** Supply forecasting, order acceptance decisions
- **Business Owners:** Revenue metrics, efficiency trends
- **Post-Production Staff:** Daily entry checklists (Dutchie integration)

---

## Architecture Overview

### Component Hierarchy

```
Analytics Module
├── Production Analytics
│   ├── AnalyticsDashboard
│   │   └── Date range productivity metrics
│   ├── ProductionSummary
│   │   └── Daily completed sessions report
│   └── EODSummary
│       └── Consolidated packages for inventory entry
│
├── Sales Analytics ⭐ NEW
│   └── SalesAnalyticsDashboard (manager-only)
│       ├── Supply vs Demand Overview
│       ├── Strain-Level Projections
│       ├── Order Status Funnel
│       ├── Sales Velocity Metrics
│       └── Conversion Rate Insights
│
└── Shared Services
    ├── analytics.service.ts (production)
    └── salesAnalytics.service.ts (sales forecasting)
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                       ANALYTICS DATA FLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  UI Components                                                     │
│       │                                                            │
│       ├─→ analytics.service.ts                                    │
│       │   ├─→ daily_throughput_summary (view)                    │
│       │   ├─→ strain_conversion_analysis (view)                  │
│       │   ├─→ consolidated_packages (view)                       │
│       │   └─→ consolidated_package_sources (view)                │
│       │                                                            │
│       └─→ salesAnalytics.service.ts ⭐ NEW                        │
│           ├─→ v_strain_conversion_rates_6mo (view)               │
│           ├─→ v_in_process_inventory_projection (view)           │
│           ├─→ v_sales_order_demand_by_product (view)             │
│           ├─→ v_sales_supply_vs_demand (view)                    │
│           └─→ v_order_status_metrics (view)                      │
│                                                                    │
│  Data Sources                                                      │
│       ├─→ trim_sessions (completed)                              │
│       ├─→ packaging_sessions (completed)                         │
│       ├─→ orders (all statuses)                                  │
│       ├─→ order_items (demand calculation)                       │
│       ├─→ inventory_items (ATP, on-hand quantities)              │
│       ├─→ batch_registry (in-process batches)                    │
│       └─→ conversions (expected yield percentages)               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Production Analytics

### 1. Analytics Dashboard

**Location:** `src/features/analytics/components/AnalyticsDashboard.tsx`

**Purpose:** Provides date-range productivity analysis for operations managers.

**Features:**
- Date range selector (default: last 30 days)
- Worker productivity metrics:
  - Average trimmer speed (grams/hour)
  - Average packager speed (units/hour)
  - Total weight processed
  - Total units produced
- Worker type breakdown (trimmer vs packager stats)
- Strain conversion analysis
- Loading states and error handling

**Data Sources:**
- `daily_throughput_summary` view (worker productivity by date)
- `strain_conversion_analysis` view (conversion rates by strain)

**Use Cases:**
- Performance reviews (worker productivity trends)
- Capacity planning (throughput analysis)
- Process improvement (conversion efficiency identification)
- Payroll verification (productivity validation)

---

### 2. Production Summary

**Location:** `src/features/analytics/components/ProductionSummary.tsx`

**Purpose:** Daily production report for Dutchie inventory system data entry.

**Features:**
- Single date picker (default: today)
- Completed session counts:
  - Trim sessions (with pending entry count)
  - Packaging sessions (with pending entry count)
- Output totals:
  - Total flower (grams)
  - Total smalls (grams)
  - Total trim (grams)
  - Total 3.5g units
  - Total 14g units
  - Total 454g units
- Print functionality (window.print())
- Print-optimized CSS styling
- Pending entry indicators (orange alerts)

**Data Sources:**
- `trim_sessions` table (filtered by date, status='completed')
- `packaging_sessions` table (filtered by date, status='completed')

**Workflow:**
1. At end of shift, operations staff opens Production Summary
2. Selects date (defaults to today)
3. Reviews completed sessions and totals
4. Prints report for physical records
5. Enters totals into Dutchie inventory system
6. Marks sessions as entered (if needed)

**Use Cases:**
- Daily Dutchie data entry checklist
- Shift handoff documentation
- Physical record keeping (compliance)
- Variance investigation (if totals don't match expectations)

---

### 3. EOD Summary (End of Day)

**Location:** `src/features/analytics/components/EODSummary.tsx`

**Purpose:** Consolidated package report for end-of-day inventory management.

**Features:**
- Single date picker (default: today)
- Hierarchical display:
  - Strain groups (expandable/collapsible)
  - Package details (expandable per strain)
  - Source session tracking (shows contributing sessions)
- Summary statistics:
  - Total packages
  - Total strains
  - Total weight (bulk only)
  - Total units (packaged only)
- Print functionality
- Lazy loading (fetches sources on expand)
- Print-friendly layout

**Data Sources:**
- `consolidated_packages` view (packages created on selected date)
- `consolidated_package_sources` view (session contributions)

**Workflow:**
1. At end of day, manager opens EOD Summary
2. Reviews all consolidated packages created today
3. Expands strain groups to see package details
4. Clicks package to see which sessions contributed
5. Prints report for inventory records
6. Uses report to create inventory entries in Dutchie

**Use Cases:**
- End-of-day inventory consolidation review
- Traceability verification (which sessions contributed to each package)
- Batch tracking documentation
- Physical inventory reconciliation

---

## Sales Analytics

> **NEW in v2.0** - Manager-facing sales forecasting and supply planning

### 1. Sales Analytics Dashboard

**Location:** `src/features/analytics/components/SalesAnalyticsDashboard.tsx` (to be implemented)

**Purpose:** Provides sales managers with inventory projections, demand analysis, and supply gap identification.

**Access Control:** Manager role required

**Features:**

#### Section A: Supply vs Demand Overview

**Top-level metrics cards:**
- Total Unfulfilled Demand (units ordered, not yet fulfilled)
- Current Available (ATP, immediately available packaged inventory)
- Projected Available (estimated packaged units from in-process batches)
- Supply Gap (positive = surplus, negative = shortage)

**Visual Indicators:**
- 🟢 Green: Surplus > 20% (ample supply)
- 🟡 Yellow: Surplus 0-20% (adequate but tight)
- 🔴 Red: Shortage (negative gap, oversold)

**Use Case:** Quick at-a-glance view to determine if new orders can be accepted.

---

#### Section B: Strain-Level Projections

**Primary interface:** Expandable table grouped by strain

**Columns:**
- Strain name
- Product breakdown (3.5g, 14g, 454g units)
- Current demand (unfulfilled orders)
- Current supply (packaged ATP)
- Projected supply (from in-process batches)
- Supply gap (surplus or shortage)

**Expandable Detail View:**

When strain row expanded, shows in-process supply:

```
Strain: Girl Scout Cookies
├─ Products:
│  ├─ GSC 3.5g: Demand: 500 | Current: 200 | Projected: +400 | Gap: +100
│  ├─ GSC 14g:  Demand: 100 | Current: 50  | Projected: +80  | Gap: +30
│  └─ GSC 454g: Demand: 10  | Current: 5   | Projected: +8   | Gap: +3
├─ Near-Term Supply (Days Away):
│  └─ Bulk: 15kg → ~428 units (28.5 u/kg, ⭐ high confidence)
├─ Future Pipeline (Not Yet Available):
│  └─ ⚠️ Multi-stage projections require 3+ months of data
└─ Total Projected: +428 units (conservative)
```

**Why This Approach:**
- Managers can trust Bulk→Packaged projections for immediate decisions
- Packaging happens quickly (days), so estimates proven or disproven fast
- Long-term pipeline hidden until sufficient data exists
- Conservative projections prevent over-commitment

**Features:**
- Confidence badges (high/medium/low) based on 6-month historical data
- Batch IDs on hover (traceability)
- Alert icons for oversold strains
- Filter by strain or product type
- Sort by gap (largest shortage first)

**Use Cases:**
- Order acceptance decisions (can we fulfill this order?)
- Sales team guidance (which products to promote)
- Production planning (which strains need priority processing)
- Customer communication (realistic lead times)

---

#### Section C: Order Status Funnel

**Visual funnel display:**
- Submitted: 25 orders (1,250 units)
- Accepted: 18 orders (950 units) - Avg 2.3 days in status
- Fulfilled: 12 orders (600 units) - Avg 5.1 days in status
- Delivered: 8 orders (400 units) - Avg 1.2 days in status

**Metrics:**
- Overall fulfillment rate: 67%
- Allocation rate: 89%
- Average order cycle time: 8.6 days

**Use Cases:**
- Bottleneck identification (which status has longest dwell time)
- Process improvement (target slow stages)
- Customer expectations (realistic delivery timeframes)

---

#### Section D: Sales Velocity

**Metrics:**
- Units sold (last 7 days)
- Units sold (last 30 days)
- Average per week
- Top-selling strain (percentage of volume)
- Days of supply remaining (based on velocity)

**Use Cases:**
- Demand forecasting (trend analysis)
- Inventory planning (how long will current supply last)
- Marketing optimization (promote slow-moving products)

---

#### Section E: Conversion Rate Insights

**Purpose:** Manager tool to review 6-month historical conversion rates.

**Table Display:**

| Strain | Binned→Bucked | Bucked→Bulk | Bulk→Packaged | Sample Size | Confidence |
|--------|---------------|-------------|---------------|-------------|------------|
| GSC    | 80% (±3%)     | 75% (±2%)   | 28.5 u/kg     | 45 sessions | ⭐ High    |
| GG4    | 78% (±5%)     | 72% (±4%)   | 26.8 u/kg     | 12 sessions | 🟡 Medium  |
| WW     | 82% (±8%)     | N/A         | 30.1 u/kg     | 3 sessions  | 🟠 Low     |

**Features:**
- Click row to see detailed historical session data
- Flag for strains with insufficient data (sample_size < 5)
- Export button for operations review
- Standard deviation shown (±%)

**Use Cases:**
- Process improvement (identify low-converting strains)
- Projection accuracy validation (compare to expected rates)
- Training (show new staff historical performance)
- Forecasting refinement (update expected_percentage in conversions table)

---

### 2. Projection Methodology

#### Hybrid Approach: Actionable Near-Term + Conservative Long-Term

**Philosophy:** Show what managers can trust for business decisions.

**Tier 1: Certain Data (No Estimates)**
- **Current ATP:** Exact packaged inventory on hand
- **Committed:** Exact allocated quantities from orders
- **Available:** ATP minus committed (simple math)

**Tier 2: Near-Term Projections (Use Rough Estimates with Confidence Badges)**
- **Bulk → Packaged:** Use rough conversion rates from conversions table
  - Show confidence indicator: "Based on default estimates" or "Based on 2 sessions"
  - Actionable because packaging happens in days, not weeks
  - Manager sees result quickly, minimal risk

**Tier 3: Long-Term Pipeline (Skip Until Data Exists)**
- ❌ Do NOT show Binned → Packaged projections yet
- Add placeholder: "Pipeline projections available after 3 months of conversion data"
- Or simply exclude this section for now
- Rationale: Multi-step projections compound errors, unreliable for commitments

**Confidence Scoring (Updated):**
- ⭐ High: Direct conversion (Bulk→Packaged) with sample_size >= 10
- 🟡 Medium: Direct conversion with sample_size >= 5
- 🟠 Low: Direct conversion with sample_size < 5 (use expected_percentage)
- ⚠️ Not Available: Multi-step conversions (insufficient data)

---

#### 6-Month Historical Conversion Rate Calculation

**Formula:**
```
For each strain and direct stage transition:
  1. Query completed sessions from last 6 months
  2. Calculate actual output / input ratio per session
  3. Average ratios across all sessions
  4. Calculate standard deviation
  5. Count sample size
  6. Assign confidence score:
     - High: sample_size >= 10
     - Medium: sample_size >= 5
     - Low: sample_size < 5
```

**Fallback Strategy:**
- If sample_size < 3, use expected_percentage from conversions table
- Display warning badge to manager
- Encourage more production sessions to improve accuracy

**Database View:** `v_strain_conversion_rates_6mo`

**Important:** Initially only calculate for direct conversions (Bulk→Packaged). Multi-stage conversions require 3-6 months of data collection.

---

#### Inventory Projection Calculation (Conservative)

**Formula (Phase 1):**
```
Projected Packaged Units =
  Current Packaged ATP +
  (Bulk × Bulk→Packaged Rate)
```

**Example:**
```
Strain: Girl Scout Cookies
Current Packaged: 200 units (ATP)

Near-Term Supply (Days Away):
- Bulk: 15,000g × 28.5 units/kg = 427.5 units

Total Projected: 200 + 427.5 = 627.5 units (conservative)
```

**Future Enhancement (Phase 2 - After 3-6 Months):**
```
Projected Packaged Units =
  Current Packaged ATP +
  (Bulk × Bulk→Packaged Rate) +
  (Bucked × Bucked→Bulk Rate × Bulk→Packaged Rate) +
  (Binned × Binned→Bucked Rate × Bucked→Bulk Rate × Bulk→Packaged Rate)
```

**Confidence Handling:**
- High confidence: Use calculated rate
- Medium confidence: Use calculated rate, show warning
- Low confidence: Use expected_percentage, show alert
- Not Available: Hide multi-stage projections entirely

**Database View:** `v_in_process_inventory_projection`

---

#### Demand Calculation

**Formula:**
```
Total Demand = SUM(order_items.quantity)
WHERE order.status IN ('submitted', 'accepted', 'ready_for_delivery')
  AND order.archived = false
  AND order.cancelled = false
GROUP BY product_id, strain_id
```

**Rationale:**
- Submitted: Pending manager acceptance
- Accepted: Accepted but not yet fulfilled
- Ready for delivery: Fulfilled but not yet delivered

**Excluded Statuses:**
- Delivered: Already fulfilled
- Archived: Historical records
- Cancelled: No longer needed

**Database View:** `v_sales_order_demand_by_product`

---

#### Supply Gap Analysis

**Formula:**
```
Supply Gap = (Current ATP + Projected) - Total Demand

Status:
- oversold: gap < 0 (negative, need more inventory)
- adequate: gap >= 0 AND gap < 20% of demand
- surplus: gap >= 20% of demand
```

**Days of Supply:**
```
Days of Supply = (Current ATP + Projected) / (30-day velocity / 30)
```

**Database View:** `v_sales_supply_vs_demand`

---

### 3. Future Enhancement: Full Pipeline Projections

**Target Timeline:** After 3-6 months of conversion data

**Requirements:**
- Minimum 10 sessions per strain per conversion type
- Standard deviation < 10% (consistent process)
- Validation against actual outcomes

**What Will Be Added:**
- Bucked → Bulk → Packaged multi-step projections
- Binned → full chain projections
- Statistical confidence intervals
- Prediction accuracy tracking

**Rationale:**
Multi-stage projections multiply errors at each conversion step. For example:
- Binned → Bucked: 80% yield (±10%) = 0.72 to 0.88 range
- × Bucked → Bulk: 75% yield (±10%) = 0.54 to 0.77 range (43% uncertainty)
- × Bulk → Packaged: 28.5 u/kg = Final range too wide for business decisions

**Current State:**
- Phase 1: Near-term projections only (Bulk→Packaged)
- Collecting baseline conversion data
- Monitoring process consistency

**Next Steps:**
1. Collect 3 months of conversion data per strain
2. Analyze standard deviation and consistency
3. Build multi-stage projection views
4. Validate projections against actual outcomes
5. Roll out full pipeline visibility

---

## Database Views

### Production Analytics Views

#### 1. daily_throughput_summary

**Purpose:** Worker productivity metrics aggregated by date and worker type.

**Schema:**
```sql
CREATE VIEW daily_throughput_summary AS
SELECT
  metric_date,
  worker_type,           -- 'trimmer' or 'packager'
  total_workers,
  total_weight_grams,
  total_units,
  total_minutes,
  avg_grams_per_hour,   -- productivity (trimmers)
  avg_units_per_hour,   -- productivity (packagers)
  total_sessions
FROM [aggregated session data]
GROUP BY metric_date, worker_type;
```

**Usage:** AnalyticsDashboard

---

#### 2. strain_conversion_analysis

**Purpose:** Conversion efficiency analysis by strain over time.

**Schema:**
```sql
CREATE VIEW strain_conversion_analysis AS
SELECT
  strain,
  from_stage,
  to_stage,
  actual_percentage,
  expected_percentage,
  variance_percentage,
  performance_status     -- 'above', 'on_target', 'below'
FROM [conversion tracking data];
```

**Usage:** AnalyticsDashboard

---

#### 3. consolidated_packages

**Purpose:** Daily consolidated package records for EOD reporting.

**Schema:**
```sql
CREATE VIEW consolidated_packages AS
SELECT
  id,
  package_id,
  package_date,
  strain,
  strain_abbreviation,
  product_stage,
  product_type,
  total_weight_grams,
  total_units,
  room,
  session_type,
  session_count,
  source_session_ids,
  created_at
FROM [package consolidation data]
WHERE package_date = :selected_date;
```

**Usage:** EODSummary

---

#### 4. consolidated_package_sources

**Purpose:** Track which sessions contributed to each consolidated package.

**Schema:**
```sql
CREATE VIEW consolidated_package_sources AS
SELECT
  id,
  consolidated_package_id,
  session_id,
  session_type,
  session_date,
  contribution_weight_grams,
  contribution_units
FROM [package source tracking];
```

**Usage:** EODSummary (lazy-loaded on expand)

---

### Sales Analytics Views

#### 5. v_strain_conversion_rates_6mo

**Purpose:** Calculate 6-month rolling average conversion rates per strain.

**Schema:**
```sql
CREATE VIEW v_strain_conversion_rates_6mo AS
SELECT
  strain_id,
  strain_name,
  from_stage,
  to_stage,
  avg_conversion_rate,
  stddev_conversion_rate,
  sample_size,
  confidence,            -- 'high', 'medium', 'low'
  date_range_start,
  date_range_end
FROM [6-month historical session analysis]
WHERE session_date >= CURRENT_DATE - INTERVAL '6 months'
  AND session_status = 'completed'
GROUP BY strain_id, from_stage, to_stage;
```

**Confidence Logic:**
- High: sample_size >= 10
- Medium: sample_size >= 5 AND sample_size < 10
- Low: sample_size < 5

**Fallback:** If sample_size < 3, use expected_percentage from conversions table.

**Usage:** SalesAnalyticsDashboard Section E, projection calculations

---

#### 6. v_in_process_inventory_projection

**Purpose:** Project packaged units from in-process batches using strain-specific conversion rates.

**Schema:**
```sql
CREATE VIEW v_in_process_inventory_projection AS
SELECT
  strain_id,
  strain_name,
  batch_id,
  batch_number,
  current_stage,
  current_qty,
  unit,
  conversion_rate,
  projected_packaged_qty,
  confidence
FROM batch_registry br
JOIN inventory_items ii ON ii.batch_id = br.id
JOIN v_strain_conversion_rates_6mo cr
  ON cr.strain_id = br.strain_id
  AND cr.from_stage = ii.product_stage
WHERE br.lifecycle_state IN ('binned', 'bucked', 'bulk_available')
  AND br.is_quarantined = false;
```

**Usage:** SalesAnalyticsDashboard Section B

---

#### 7. v_sales_order_demand_by_product

**Purpose:** Aggregate unfulfilled order demand by product.

**Schema:**
```sql
CREATE VIEW v_sales_order_demand_by_product AS
SELECT
  p.id AS product_id,
  p.product_name,
  p.strain_id,
  s.strain_name,
  oi.pricing_unit AS unit_type,
  SUM(oi.quantity) AS total_demand,
  COUNT(DISTINCT o.id) AS order_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
JOIN strains s ON s.id = p.strain_id
WHERE o.status IN ('submitted', 'accepted', 'ready_for_delivery')
  AND o.archived = false
  AND o.cancelled = false
GROUP BY p.id, p.product_name, p.strain_id, s.strain_name, oi.pricing_unit;
```

**Usage:** SalesAnalyticsDashboard Section A, Section B

---

#### 8. v_sales_supply_vs_demand

**Purpose:** Master view comparing demand to current and projected supply.

**Schema:**
```sql
CREATE VIEW v_sales_supply_vs_demand AS
SELECT
  d.product_id,
  d.product_name,
  d.strain_name,
  d.unit_type,
  d.total_demand,
  d.order_count,
  COALESCE(atp.atp_qty, 0) AS current_atp,
  COALESCE(proj.projected_qty, 0) AS projected_qty,
  COALESCE(atp.atp_qty, 0) + COALESCE(proj.projected_qty, 0) AS total_available,
  (COALESCE(atp.atp_qty, 0) + COALESCE(proj.projected_qty, 0)) - d.total_demand AS gap,
  CASE
    WHEN (COALESCE(atp.atp_qty, 0) + COALESCE(proj.projected_qty, 0)) - d.total_demand < 0
      THEN 'oversold'
    WHEN (COALESCE(atp.atp_qty, 0) + COALESCE(proj.projected_qty, 0)) - d.total_demand < d.total_demand * 0.2
      THEN 'adequate'
    ELSE 'surplus'
  END AS status,
  CASE
    WHEN velocity.daily_rate > 0
      THEN ((COALESCE(atp.atp_qty, 0) + COALESCE(proj.projected_qty, 0)) / velocity.daily_rate)
    ELSE NULL
  END AS days_of_supply
FROM v_sales_order_demand_by_product d
LEFT JOIN v_atp atp ON atp.product_id = d.product_id
LEFT JOIN (
  SELECT
    strain_id,
    SUM(projected_packaged_qty) AS projected_qty
  FROM v_in_process_inventory_projection
  GROUP BY strain_id
) proj ON proj.strain_id = d.strain_id
LEFT JOIN (
  SELECT
    product_id,
    SUM(quantity) / 30 AS daily_rate
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND o.status = 'delivered'
  GROUP BY product_id
) velocity ON velocity.product_id = d.product_id;
```

**Usage:** SalesAnalyticsDashboard Section A, Section B

---

#### 9. v_order_status_metrics

**Purpose:** Order lifecycle metrics for operations visibility.

**Schema:**
```sql
CREATE VIEW v_order_status_metrics AS
SELECT
  status,
  COUNT(*) AS order_count,
  SUM(total) AS total_units,
  AVG(EXTRACT(EPOCH FROM (
    COALESCE(updated_at, NOW()) - created_at
  )) / 3600) AS avg_time_in_status_hours,
  MIN(created_at) AS oldest_order_date
FROM orders
WHERE archived = false
  AND cancelled = false
GROUP BY status;
```

**Usage:** SalesAnalyticsDashboard Section C

---

## Service Layer

### Production Analytics Service

**File:** `src/features/analytics/services/analytics.service.ts`

**Functions:**

1. **getThroughputSummary(startDate: string, endDate: string)**
   - Fetches daily_throughput_summary view
   - Returns worker productivity metrics
   - Used by: AnalyticsDashboard

2. **getConversionAnalysis(startDate: string, endDate: string)**
   - Fetches strain_conversion_analysis view
   - Returns conversion efficiency data
   - Used by: AnalyticsDashboard

3. **getConsolidatedPackages(date: string)**
   - Fetches consolidated_packages view
   - Returns packages for specific date
   - Used by: EODSummary

4. **getPackageSources(packageId: string)**
   - Fetches consolidated_package_sources view
   - Returns contributing sessions
   - Used by: EODSummary (lazy-loaded)

5. **getCompletedTrimSessions(date: string)**
   - Fetches trim_sessions table
   - Filters by date and status='completed'
   - Used by: ProductionSummary

6. **getCompletedPackagingSessions(date: string)**
   - Fetches packaging_sessions table
   - Filters by date and status='completed'
   - Used by: ProductionSummary

7. **getProductionData(date: string)**
   - Combines trim + packaging sessions
   - Returns both in single call
   - Used by: ProductionSummary

**Type Definitions:**
- ThroughputData
- ConversionData
- ConsolidatedPackage
- PackageSource

---

### Sales Analytics Service

**File:** `src/features/analytics/services/salesAnalytics.service.ts` (to be implemented)

**Functions:**

1. **getStrainConversionRates(strainId?: string)**
   - Fetches v_strain_conversion_rates_6mo
   - Returns 6-month historical rates
   - Optional strain filter
   - Used by: Section E (Conversion Rate Insights)

2. **getInventoryProjection(strainId?: string, productTypeId?: string)**
   - Fetches v_in_process_inventory_projection
   - Returns current + projected inventory
   - Optional filters
   - Used by: Section B (Strain-Level Projections)

3. **getSalesSupplyVsDemand()**
   - Fetches v_sales_supply_vs_demand
   - Returns master supply/demand analysis
   - Used by: Section A (Overview), Section B

4. **getOrderStatusMetrics(dateRange?: {start: string, end: string})**
   - Fetches v_order_status_metrics
   - Returns order lifecycle metrics
   - Used by: Section C (Order Status Funnel)

5. **getSalesVelocity(strainId?: string, dateRange?: {start: string, end: string})**
   - Calculates units sold per time period
   - Trend analysis
   - Used by: Section D (Sales Velocity)

6. **getFulfillmentPerformance(dateRange?: {start: string, end: string})**
   - Calculates allocation and fulfillment rates
   - Average time metrics
   - Used by: Section C (Order Status Funnel)

**Type Definitions:**
```typescript
interface StrainConversionRate {
  strain_id: string;
  strain_name: string;
  from_stage: string;
  to_stage: string;
  avg_conversion_rate: number;
  confidence: 'high' | 'medium' | 'low';
  sample_size: number;
  date_range_start: string;
  date_range_end: string;
}

interface InventoryProjection {
  strain_id: string;
  strain_name: string;
  product_type: string;
  current_packaged_qty: number;
  in_process_breakdown: {
    stage: string;
    current_qty: number;
    conversion_rate: number;
    projected_output: number;
    batch_count: number;
  }[];
  total_projected_qty: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SupplyDemandAnalysis {
  product_id: string;
  product_name: string;
  strain_name: string;
  unit_type: string;
  demand: {
    submitted: number;
    accepted: number;
    total_unfulfilled: number;
  };
  supply: {
    current_atp: number;
    projected_from_in_process: number;
    total_available: number;
  };
  gap: number;
  status: 'oversold' | 'adequate' | 'surplus';
  days_of_supply: number;
}

interface OrderStatusMetrics {
  status: string;
  order_count: number;
  total_units: number;
  avg_time_in_status_hours: number;
  oldest_order_date: string;
}

interface SalesVelocity {
  period: string;
  units_sold: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  projected_sell_through_date: string;
}

interface FulfillmentMetrics {
  allocation_rate: number;
  avg_time_to_allocate_hours: number;
  avg_time_to_fulfill_hours: number;
  on_time_fulfillment_rate: number;
}
```

---

## User Workflows

### Production Analytics Workflows

#### Workflow 1: Daily Production Reporting

**Actor:** Post-Production Staff

**Steps:**
1. Navigate to Analytics → Production Summary
2. Select today's date (default)
3. Review completed trim and packaging sessions
4. Note any pending Dutchie entries (orange alerts)
5. Print report using Print button
6. Enter totals into Dutchie inventory system
7. Keep printed copy for physical records

**Frequency:** Daily (end of shift)

**Success Criteria:** All completed sessions entered into Dutchie, physical record maintained

---

#### Workflow 2: End-of-Day Package Consolidation

**Actor:** Operations Manager

**Steps:**
1. Navigate to Analytics → EOD Summary
2. Select today's date (default)
3. Review summary statistics (total packages, strains, weight/units)
4. Expand strain groups to see package details
5. Click packages to verify source sessions
6. Print report for inventory records
7. Create inventory entries in Dutchie based on report

**Frequency:** Daily (end of day)

**Success Criteria:** All consolidated packages documented, inventory records accurate

---

#### Workflow 3: Worker Productivity Review

**Actor:** Operations Manager

**Steps:**
1. Navigate to Analytics → Analytics Dashboard
2. Select date range (e.g., last 7 days, last 30 days)
3. Review average productivity metrics:
   - Trimmer grams/hour
   - Packager units/hour
4. Compare to historical averages or targets
5. Identify low-performing days for investigation
6. Use data for performance reviews or training needs

**Frequency:** Weekly or monthly

**Success Criteria:** Productivity trends identified, improvement opportunities documented

---

### Sales Analytics Workflows

#### Workflow 4: Order Acceptance Decision

**Actor:** Sales Manager

**Scenario:** Customer submits large order, manager must decide if it can be fulfilled.

**Steps:**
1. Navigate to Analytics → Sales Analytics
2. Review Section A: Supply vs Demand Overview
   - Check current supply gap
   - Note any red (oversold) indicators
3. Navigate to Section B: Strain-Level Projections
4. Find strain(s) in customer's order
5. Review:
   - Current demand (including new order)
   - Current ATP
   - Projected supply from in-process batches
   - Supply gap
6. Decision:
   - **Green/Surplus:** Accept order immediately
   - **Yellow/Adequate:** Accept with standard lead time
   - **Red/Oversold:** Delay acceptance, coordinate with production
7. Communicate lead time to customer based on days-of-supply

**Frequency:** As needed (order-by-order)

**Success Criteria:** Informed decision made, realistic lead time communicated, overselling avoided

---

#### Workflow 5: Sales Team Guidance

**Actor:** Sales Manager

**Scenario:** Provide weekly guidance to sales team on which products to promote.

**Steps:**
1. Navigate to Analytics → Sales Analytics
2. Review Section B: Strain-Level Projections
3. Sort by gap (largest surplus first)
4. Identify strains with surplus (green indicators)
5. Identify strains with shortage (red indicators)
6. Create sales guidance:
   - **Promote:** Surplus strains (offer discounts, feature in marketing)
   - **Limit:** Shortage strains (increase price, de-emphasize)
7. Review Section D: Sales Velocity
   - Top-selling strains (keep in stock)
   - Slow-moving strains (promote more)
8. Communicate guidance to sales team

**Frequency:** Weekly

**Success Criteria:** Sales team aligned with inventory reality, balanced sell-through

---

#### Workflow 6: Production Priority Planning

**Actor:** Operations Manager (with input from Sales Manager)

**Scenario:** Determine which batches/strains to prioritize in production.

**Steps:**
1. Navigate to Analytics → Sales Analytics
2. Review Section A: Supply vs Demand Overview
   - Identify products with negative gap (oversold)
3. Review Section B: Strain-Level Projections
   - Expand strains with red indicators
   - Review in-process pipeline
   - Note current stage of batches
4. Prioritize strains for production:
   - **High Priority:** Oversold strains with batches in Bulk stage (quick conversion to Packaged)
   - **Medium Priority:** Adequate strains approaching shortage
   - **Low Priority:** Surplus strains
5. Coordinate with post-production staff to prioritize sessions
6. Monitor Section C: Order Status Funnel to track fulfillment progress

**Frequency:** Weekly or as needed

**Success Criteria:** Production aligned with demand, oversold situations resolved quickly

---

#### Workflow 7: Conversion Rate Analysis

**Actor:** Operations Manager

**Scenario:** Review 6-month conversion rate performance, identify process improvements.

**Steps:**
1. Navigate to Analytics → Sales Analytics
2. Review Section E: Conversion Rate Insights
3. Identify strains with low confidence (🟠 low sample size)
   - Prioritize more production sessions for these strains
4. Compare actual vs expected conversion rates
   - Strains significantly below expected: investigate process issues
   - Strains above expected: document best practices
5. Review standard deviation (±%)
   - High variation: inconsistent process, needs standardization
   - Low variation: consistent process, good training
6. Click strain rows for detailed session history
7. Update expected_percentage in conversions table if needed

**Frequency:** Monthly

**Success Criteria:** Process improvements identified, conversion expectations calibrated

---

## Key Rules

### Production Analytics Rules

1. **Daily Throughput Accuracy**
   - Worker productivity calculated from completed sessions only
   - Cancelled or in-progress sessions excluded
   - Grams/hour calculated from total minutes worked

2. **Production Summary Completeness**
   - Only completed sessions displayed
   - Pending entry indicator shown if not marked as entered
   - Print functionality preserves all data for physical records

3. **EOD Package Traceability**
   - Every consolidated package must trace to source sessions
   - Source sessions displayed on demand (lazy-loaded)
   - Package date determines inclusion in daily report

4. **Conversion Analysis Accuracy**
   - Actual conversion percentage calculated from completed sessions
   - Variance calculated as (actual - expected)
   - Performance status determined by variance threshold

---

### Sales Analytics Rules

1. **6-Month Conversion Rate Calculation**
   - Only completed sessions from last 6 months included
   - Minimum 3 sessions required, otherwise use expected_percentage
   - Confidence score based on sample size (10+ = high, 5-9 = medium, <5 = low)
   - Standard deviation shown to indicate consistency

2. **Projection Accuracy Requirements**
   - Only in-process batches included (lifecycle_state IN ('binned', 'bucked', 'bulk_available'))
   - Quarantined batches excluded from projections
   - Strain-specific conversion rates applied (not generic)
   - Confidence indicators displayed to managers

3. **Demand Calculation Scope**
   - Include: submitted, accepted, ready_for_delivery orders
   - Exclude: delivered, archived, cancelled orders
   - Group by product_id and strain_id for accuracy

4. **Supply Gap Thresholds**
   - Oversold: gap < 0 (negative)
   - Adequate: gap >= 0 AND gap < 20% of demand
   - Surplus: gap >= 20% of demand

5. **Manager-Only Access**
   - Sales Analytics Dashboard requires manager role
   - Production Analytics available to all authenticated users
   - RLS policies enforce access control

6. **Projection Limitations**
   - Current version: in-process batches only
   - Future enhancement: cultivation pipeline (plants in grow)
   - Placeholder section "Future Projections" (hidden, coming soon)

7. **Historical Data Requirements**
   - 6-month window for conversion rate calculations
   - Minimum 3 sessions per strain for projections
   - Fallback to expected_percentage if insufficient data

---

## Implementation Status

### Production Analytics

**Status:** ✅ Production-Ready (v1.0)

**Implemented:**
- ✅ AnalyticsDashboard component (date range, productivity metrics)
- ✅ ProductionSummary component (daily report, print functionality)
- ✅ EODSummary component (consolidated packages, source tracking)
- ✅ analytics.service.ts (7 service functions)
- ✅ Database views: daily_throughput_summary, strain_conversion_analysis, consolidated_packages, consolidated_package_sources
- ✅ Type definitions: ThroughputData, ConversionData, ConsolidatedPackage, PackageSource
- ✅ Error handling and loading states
- ✅ Print-optimized CSS styling

**Known Limitations:**
- No historical trend charts (future enhancement)
- Manual refresh required (no auto-refresh)
- No export to CSV (print-only)

---

### Sales Analytics

**Status:** 📝 Documented, Not Yet Implemented (v2.0 specification)

**To Be Implemented:**
- ⏳ SalesAnalyticsDashboard component (5 sections)
- ⏳ salesAnalytics.service.ts (6 service functions)
- ⏳ Database views: v_strain_conversion_rates_6mo, v_in_process_inventory_projection, v_sales_order_demand_by_product, v_sales_supply_vs_demand, v_order_status_metrics
- ⏳ Type definitions: StrainConversionRate, InventoryProjection, SupplyDemandAnalysis, OrderStatusMetrics, SalesVelocity, FulfillmentMetrics
- ⏳ Role-based access control (manager-only)
- ⏳ Migration files (4 database view migrations)

**Migration Files Required:**
1. `20251112000001_create_strain_conversion_rates_view.sql`
2. `20251112000002_create_inventory_projection_views.sql`
3. `20251112000003_create_order_status_metrics_view.sql`
4. `20251112000004_add_sales_analytics_indexes.sql`

**Implementation Estimate:** 24-31 hours

---

### Future Enhancements

**Cultivation Pipeline Integration (v3.0)**
- Extend projections to include plants currently in cultivation
- Add v_cultivation_pipeline_projection view
- Multi-week/month supply forecasting
- Expected harvest dates and yields
- "Future Projections" section (currently placeholder)

**Enhanced Visualizations**
- Historical trend charts (line graphs)
- Conversion rate variance charts
- Sales velocity trends over time
- Heatmap for strain demand patterns

**Export Capabilities**
- Export to CSV (all views)
- Export to Excel with formatting
- Scheduled email reports (weekly summaries)

**Advanced Analytics**
- Machine learning for yield prediction refinement
- Seasonal demand pattern analysis
- Customer segment analysis (high-value vs regular)
- Profitability analysis by strain

---

## Related Documentation

- **DASHBOARD.md** - Sales Overview widget integration
- **ORDERS.md** - Order demand calculation and status workflow
- **SESSIONS.md** - Session completion data for production analytics
- **INVENTORY-TRACKING.md** - ATP calculation and inventory balances
- **BATCHES.md** - Batch lifecycle and in-process inventory
- **PRODUCTS.md** - Conversion rates and expected yield percentages
- **SYSTEM-WORKFLOW.md** - Overall workflow context

---

## Notes

**Version History:**
- **v1.0 (2025-11-06):** Initial stub documentation
- **v2.0 (2025-11-12):** Comprehensive documentation added
  - Documented existing Production Analytics implementation
  - Added Sales Analytics specification (manager-facing forecasting)
  - Defined 6-month conversion rate methodology
  - Specified projection calculations and database views
  - Documented user workflows and business rules

**Critical Design Decisions:**
1. **6-Month Window:** Balances recency (relevant process) with sample size (statistical validity)
2. **Manager-Only Access:** Protects sensitive sales data, prevents information overload for staff
3. **In-Process Only:** Maintains scope (cultivation module future), provides actionable short-term projections
4. **Strain-Specific Rates:** Acknowledges biological variation, improves accuracy over generic rates
5. **Confidence Scoring:** Transparent about projection reliability, encourages data-driven decisions

**Business Value:**
- **Sales Managers:** Make informed order acceptance decisions, avoid overselling
- **Operations:** Prioritize production based on demand, reduce waste from overproduction
- **Business Owners:** Improve forecasting accuracy, optimize inventory levels
- **Post-Production Staff:** Streamlined daily reporting, clear entry checklists

This document is part of CULT v2.0 (expanded with sales analytics). It is additive and non-destructive, intended to align with existing Bolt features and batch-centric architecture.
