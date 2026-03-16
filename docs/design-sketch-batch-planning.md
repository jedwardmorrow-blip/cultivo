# Design Sketch: Batch-Level Production Planning

> Replaces the current package-level "Batch Assign" panel with a batch-level
> planning tool that matches how Laura actually thinks about production.

---

## Problem Statement

The current Batch Assign panel operates at the **package level** — it shows
individual `inventory_items` rows (packages) and asks Laura to map them to
individual order line items. This is the wrong abstraction for a planning tool:

1. Laura thinks in **batches and strain runs**, not individual packages
2. "Avail" values are raw `current_quantity` (grams for flower, counts for
   smalls) — not order-ready units
3. The UI doesn't show pipeline context (how much is bucked vs binned vs bulk)
4. Package-level assignment is a **fulfillment** action, not a **planning** action

Laura's actual mental model: *"I'm doing Orange Sherb today — I have 3 batches,
here's what I need to fill across 4 orders. Batch 251215 has 361g bulk flower
ready, batch 260114 has 1956g bucked that needs processing first."*

---

## Core Concept: Two-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  PLANNING LAYER (new)                           │
│  "Which batches service which orders?"          │
│  Table: batch_allocations (already exists!)     │
│  UI: Batch card expansion in production queue   │
│  Actor: Laura, during morning planning          │
├─────────────────────────────────────────────────┤
│  FULFILLMENT LAYER (keep as-is)                 │
│  "Which specific packages fill which line items?"│
│  Table: package_assignments (keep + triggers)   │
│  UI: Order detail → assign packages             │
│  Actor: Laura/Josie, during/after packaging     │
└─────────────────────────────────────────────────┘
```

The planning layer answers: **"What batches am I working today, and what orders
will they service?"**

The fulfillment layer answers: **"This specific jar of Orange Sherb 3.5g goes
to order ORD-1042."** (happens later, during or after actual packaging)

---

## Existing Infrastructure (Already Built!)

### Tables
- **`batch_allocations`** — `batch_id → order_item_id` with `allocation_stage`,
  `allocated_weight_grams`, `projected_final_weight_grams`, `status`
  (pending/fulfilled), `notes`
- **`batch_stage_tracking`** — tracks weight at each pipeline stage per batch
- **`batch_registry`** — single source of truth, `batch_number` like `260114-ORS`
- **`order_items.batch_id`** — already has FK to batch_registry

### Views (13 batch views already exist)
- **`batch_stage_availability`** — batch_number, strain, stage, weight_grams,
  allocated_weight_grams, available_weight_grams, availability_status
- **`batch_order_demand`** — aggregates order_items by batch_id, shows
  total_quantity_needed per product
- **`batch_allocation_overview`** — joins capacity estimates with demand,
  shows utilization % and allocation_status (available/allocated/over_allocated)
- **`batch_capacity_estimates`** — estimated eighths/halves/pounds capacity
- **`batch_inventory_health`** — overall health metrics per batch

### Frontend Pattern (SalesPipeline)
- **StrainRow** → expandable, groups batches by strain
- **BatchCard** — shows batch_number, total weight, colored StageBar
- **StageBar** — horizontal proportional bar: Binned (indigo) | Bucked (violet)
  | Bulk (emerald) | Packaged (cyan) | Trim (stone)

---

## Schema Changes

### What's needed: Almost nothing

The `batch_allocations` table already has the right shape. The only schema work
is a new **view** that joins the production queue demand with batch availability
to power the UI.

> **VERIFIED GAPS (fixed below):**
> 1. `batch_registry.strain_id` is **nullable** — need COALESCE fallback to
>    text `strain` name matching
> 2. `v_production_queue_by_strain` has one row per strain+format — joining
>    directly to batches would duplicate batch rows per format. Must aggregate
>    demand to strain level first.

#### New View: `v_production_queue_batch_planning`

```sql
CREATE OR REPLACE VIEW v_production_queue_batch_planning AS
WITH strain_demand AS (
  -- Aggregate demand to STRAIN level (not strain+format).
  -- v_production_queue_by_strain has one row per strain+format combo,
  -- so we must sum across formats to get total strain demand.
  SELECT
    strain_id,
    MAX(strain_name) AS strain_name,
    SUM(total_units_needed) AS total_units_needed,
    SUM(total_demand_g) AS total_demand_g,
    MAX(order_count) AS order_count,  -- orders counted at strain level
    MIN(CASE urgency
      WHEN 'overdue' THEN 1 WHEN 'urgent' THEN 2
      WHEN 'soon' THEN 3 WHEN 'normal' THEN 4 ELSE 5
    END) AS urgency_rank,
    CASE MIN(CASE urgency
      WHEN 'overdue' THEN 1 WHEN 'urgent' THEN 2
      WHEN 'soon' THEN 3 WHEN 'normal' THEN 4 ELSE 5
    END)
      WHEN 1 THEN 'overdue' WHEN 2 THEN 'urgent'
      WHEN 3 THEN 'soon' WHEN 4 THEN 'normal' ELSE 'no_date'
    END AS worst_urgency,
    MIN(earliest_delivery_date) AS earliest_delivery_date
  FROM v_production_queue_by_strain
  WHERE strain_id IS NOT NULL
  GROUP BY strain_id
),
batch_supply AS (
  -- What batches have supply for each strain?
  -- Join via strain_id when available, fallback to text name match.
  SELECT
    br.id AS batch_id,
    br.batch_number,
    COALESCE(br.strain_id, sd.strain_id) AS strain_id,
    br.strain AS strain_name_text,
    br.status AS batch_status,
    -- Stage breakdown from batch_stage_tracking
    COALESCE(SUM(bst.weight_grams) FILTER (WHERE bst.stage = 'binned'), 0) AS binned_g,
    COALESCE(SUM(bst.weight_grams) FILTER (WHERE bst.stage = 'bucked'), 0) AS bucked_g,
    COALESCE(SUM(bst.weight_grams) FILTER (WHERE bst.stage IN ('bulk_flower', 'bulk_smalls')), 0) AS bulk_g,
    COALESCE(SUM(bst.weight_grams) FILTER (WHERE bst.stage = 'packaged'), 0) AS packaged_g,
    COALESCE(SUM(bst.weight_grams) FILTER (WHERE bst.stage IN ('bulk_trim', 'trim')), 0) AS trim_g,
    COALESCE(SUM(bst.weight_grams), 0) AS total_weight_g,
    COALESCE(SUM(bst.available_weight_grams), 0) AS total_available_g
  FROM batch_registry br
  LEFT JOIN batch_stage_tracking bst ON bst.batch_id = br.id
  -- Fallback join: if batch_registry.strain_id is NULL, match by strain text
  LEFT JOIN strain_demand sd
    ON (br.strain_id IS NOT NULL AND sd.strain_id = br.strain_id)
    OR (br.strain_id IS NULL AND sd.strain_name ILIKE br.strain)
  WHERE br.status = 'active'
  GROUP BY br.id, br.batch_number, br.strain_id, sd.strain_id, br.strain, br.status
),
batch_current_allocations AS (
  -- What's already allocated from each batch?
  SELECT
    ba.batch_id,
    COUNT(DISTINCT ba.order_item_id) AS allocated_order_items,
    SUM(ba.allocated_weight_grams) AS total_allocated_g,
    array_agg(DISTINCT o.order_number) AS allocated_order_numbers
  FROM batch_allocations ba
  JOIN order_items oi ON oi.id = ba.order_item_id
  JOIN orders o ON o.id = oi.order_id
  WHERE ba.status = 'pending'
  GROUP BY ba.batch_id
)
SELECT
  bs.batch_id,
  bs.batch_number,
  bs.strain_id,
  COALESCE(sd.strain_name, bs.strain_name_text) AS strain_name,
  bs.batch_status,
  -- Stage breakdown (for StageBar rendering)
  bs.binned_g,
  bs.bucked_g,
  bs.bulk_g,
  bs.packaged_g,
  bs.trim_g,
  bs.total_weight_g,
  bs.total_available_g,
  -- Current allocations
  COALESCE(bca.allocated_order_items, 0) AS allocated_order_items,
  COALESCE(bca.total_allocated_g, 0) AS total_allocated_g,
  bca.allocated_order_numbers,
  -- Capacity estimates (for planning)
  ROUND(bs.bulk_g / NULLIF(3.5, 0), 0) AS est_eighths_from_bulk,
  ROUND(bs.bulk_g / NULLIF(454, 0), 2) AS est_lbs_from_bulk,
  -- Demand context (aggregated to strain level, no format duplication)
  sd.total_units_needed AS strain_units_needed,
  sd.total_demand_g AS strain_demand_g,
  sd.order_count AS strain_order_count,
  sd.worst_urgency AS strain_urgency
FROM batch_supply bs
LEFT JOIN batch_current_allocations bca ON bca.batch_id = bs.batch_id
LEFT JOIN strain_demand sd ON sd.strain_id = bs.strain_id
WHERE bs.total_weight_g > 0
ORDER BY
  COALESCE(sd.urgency_rank, 5),
  bs.total_available_g DESC;
```

This view is the **only new schema object** needed. Everything else already
exists.

---

## UX Design

### What Changes in the Production Queue

> **VERIFIED against ProductionQueue.tsx (807 lines):**
>
> The current expansion model has TWO independent states:
> - `expandedStrains: Set<string>` — chevron toggle on strain header row
> - `assigningFormat: string | null` — panel toggle per format row ("strainId|formatLabel")
>
> **Key insight**: Batches are per-STRAIN, not per-format. The "Plan Batches"
> button must live on the **strain header row**, not on format sub-rows. This
> means adding a THIRD state: `planningStrain: string | null`.
>
> The format-level "Assign" button (package-level fulfillment) can remain for
> Phase 2 but is hidden initially.

**New behavior:** The strain header row gets a **"Plan Batches"** button (right
side). Clicking it opens the batch card expansion *between the format sub-rows
and the Contributing Orders section* — not replacing either.

**State model in ByStrainView:**
```typescript
const [expandedStrains, setExpandedStrains] = useState<Set<string>>(new Set());  // KEEP
const [assigningFormat, setAssigningFormat] = useState<string | null>(null);      // KEEP (hidden initially)
const [planningStrain, setPlanningStrain] = useState<string | null>(null);        // NEW
```

### Layout: Strain Header → Expand → Format Rows → Batch Plan → Contributing Orders

```
┌─────────────────────────────────────────────────────────────┐
│ ▶ Orange Sherb · 3 formats                   [Plan Batches] │
│   230 units needed · 4 orders · 2.1 lbs demand              │
├─────────────────────────────────────────────────────────────┤
│   (click chevron to expand ↓)                                │
├─────────────────────────────────────────────────────────────┤
│     3.5g Flower     180 units   630g                        │
│     1oz Flower       30 units   850g                        │
│     0.5oz Smalls     20 units   283g                        │
├─── Batch Plan (click "Plan Batches" to show) ───────────────┤
│                                                             │
│  ┌─── 251215-ORS ────────────────────────────────────┐      │
│  │ ████████████░░░░░░░░░░░░░░░░░░░ 361g              │      │
│  │ Bulk (361g)  ·  Trim (3310g)                      │      │
│  │                                                    │      │
│  │ ≈ 103 eighths from bulk  ·  No allocations yet     │      │
│  │                                                    │      │
│  │  Orders needing Orange Sherb:                      │      │
│  │  🔴 ORD-1038  GreenLeaf Disp.   Mar 12   80 units │ [+]  │
│  │  🟡 ORD-1042  Horizon Wellness  Mar 18   50 units │ [+]  │
│  │  🟢 ORD-1055  Peak Cannabis     Mar 25  100 units │ [+]  │
│  │                                                    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                             │
│  ┌─── 260114-ORS ────────────────────────────────────┐      │
│  │ ░░░░░░░░████████████████████░░░░ 1956g             │      │
│  │ Bucked (1956g)  ·  ⚠️ Needs processing             │      │
│  │                                                    │      │
│  │ ≈ 558 eighths if processed  ·  No allocations yet  │      │
│  │                                                    │      │
│  │  [+] Allocate to orders                            │      │
│  └────────────────────────────────────────────────────┘      │
│                                                             │
│  ┌─── 260128-ORS ────────────────────────────────────┐      │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░ 85g               │      │
│  │ Binned (85g)  ·  ⚠️ Early pipeline                 │      │
│  │                                                    │      │
│  │ ≈ 24 eighths if processed  ·  No allocations yet   │      │
│  └────────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Batch Card Anatomy

Each batch card shows:

1. **Header**: Batch number (e.g., `251215-ORS`)
2. **StageBar**: Colored proportional bar (reuse SalesPipeline's StageBar)
   - Binned = indigo, Bucked = violet, Bulk = emerald, Packaged = cyan,
     Trim = stone
3. **Stage summary text**: "Bulk (361g) · Trim (3310g)"
4. **Capacity estimate**: "≈ 103 eighths from bulk" (computed from weight ÷ 3.5)
5. **Processing status**: Warning if material needs processing (bucked/binned)
6. **Current allocations**: Which orders are already allocated to this batch
7. **Allocate button** `[+]`: Opens allocation flow for this batch

### Allocation Flow (within batch card)

When Laura clicks `[+]` next to an order on a batch card:

1. **One-click allocation**: Creates a `batch_allocations` row linking this
   batch to that order item
2. The allocation uses `allocation_stage` to record what stage the material is
   in (e.g., 'bulk_flower', 'bucked')
3. `allocated_weight_grams` is computed from the order's demand
4. Card updates in-place to show the allocation

**Simpler than the old flow**: No package picking, no quantity inputs, no
preview step. Just "this batch services this order" — Laura can always adjust
later.

### What Laura Sees After Allocating

```
  ┌─── 251215-ORS ────────────────────────────────────┐
  │ ████████████░░░░░░░░░░░░░░░░░░░ 361g              │
  │ Bulk (361g)  ·  Trim (3310g)                      │
  │                                                    │
  │ ≈ 103 eighths from bulk                            │
  │ Allocated: 130 eighths across 2 orders             │
  │                                                    │
  │  ✅ ORD-1038  GreenLeaf Disp.   80 units    [×]   │
  │  ✅ ORD-1042  Horizon Wellness  50 units    [×]   │
  │  ── ORD-1055  Peak Cannabis    100 units    [+]   │
  │                                                    │
  │  ⚠️ Over-allocated by 27 units (needs 2nd batch)   │
  └────────────────────────────────────────────────────┘
```

Key features:
- **Over-allocation warning**: If allocated demand > capacity, show warning
- **Remove allocation** `[×]`: Deletes the `batch_allocations` row
- **Multi-batch fulfillment**: An order can be allocated across multiple batches
  (ORD-1055 might get 73 from 251215-ORS and 27 from 260114-ORS)

---

## Component Architecture

### New Components

> **VERIFIED integration model:**
> - `BatchPlanExpansion` is NOT a drop-in replacement for `BatchAssignPanel`.
>   It operates at STRAIN level (no formatLabel/productCategory context).
> - It renders in a new `<tr colSpan={10}>` slot between format sub-rows and
>   the "Contributing Orders" section.
> - `BatchAssignPanel` and `useBatchAssign` are KEPT for now (hidden) —
>   package-level fulfillment may return in Phase 2.

```
src/features/production-queue/
├── components/
│   ├── ProductionQueue.tsx          (modify: add planningStrain state + Plan Batches button
│   │                                 on strain header row + new expansion slot)
│   ├── BatchPlanExpansion.tsx        (NEW — strain-level batch planning panel)
│   ├── BatchPlanCard.tsx             (NEW — individual batch card)
│   ├── BatchStageBar.tsx             (NEW or reuse from SalesPipeline)
│   ├── BatchOrderList.tsx            (NEW — order list within batch card)
│   └── BatchAssignPanel.tsx          (KEEP but hide — format-level fulfillment for later)
├── hooks/
│   ├── useBatchPlanning.ts           (NEW)
│   │   ├── useBatchesForStrain()     -- queries v_production_queue_batch_planning
│   │   ├── useAllocateBatch()        -- INSERT into batch_allocations
│   │   └── useDeallocateBatch()      -- DELETE from batch_allocations
│   └── useBatchAssign.ts             (KEEP — may be used in Phase 2 fulfillment)
└── types.ts                          (update: add BatchPlan types, keep existing)
```

### Integration Point in ProductionQueue.tsx

The `ByStrainView` component currently renders this DOM order per strain:
```
1. Strain header <tr>        ← expandedStrains toggle (chevron)
2. Format sub-rows <tr>[]    ← shown when expanded, each with optional BatchAssignPanel
3. Contributing Orders <tr>  ← shown when expanded
```

New order with batch planning:
```
1. Strain header <tr>        ← expandedStrains toggle (chevron) + [Plan Batches] button
2. Format sub-rows <tr>[]    ← shown when expanded (Assign button hidden for now)
3. BatchPlanExpansion <tr>   ← NEW: shown when planningStrain === strainId
4. Contributing Orders <tr>  ← shown when expanded (unchanged)
```

**Context differences:**
```typescript
// OLD: BatchAssignPanel context (format-level)
interface BatchAssignContext {
  strainId: string;
  strainName: string;
  formatLabel: string;        // ← batch planning doesn't need this
  productCategory: string;    // ← batch planning doesn't need this
  orderItems: OrderLineItem[];
}

// NEW: BatchPlanExpansion props (strain-level)
interface BatchPlanProps {
  strainId: string;
  strainName: string;
  orderItems: OrderLineItem[];  // ALL orders for this strain (all formats)
  onClose: () => void;
}
```

### Data Flow

```
v_production_queue_batch_planning (view)
        │
        ▼
useBatchesForStrain(strainId)       ← queries by strain_id, returns all batches
        │
        ▼
BatchPlanExpansion({ strainId, strainName, orderItems })
  ├── BatchPlanCard (per batch)
  │     ├── BatchStageBar
  │     └── BatchOrderList
  │           └── [+] allocate → useAllocateBatch()
  │           └── [×] remove   → useDeallocateBatch()
  └── Summary footer (total capacity vs total demand)
```

### Key Hook: `useBatchPlanning`

```typescript
// useBatchPlanning.ts

interface BatchPlanData {
  batch_id: string;
  batch_number: string;
  strain_id: string;
  strain_name: string;
  batch_status: string;
  // Stage breakdown
  binned_g: number;
  bucked_g: number;
  bulk_g: number;
  packaged_g: number;
  trim_g: number;
  total_weight_g: number;
  total_available_g: number;
  // Allocations
  allocated_order_items: number;
  total_allocated_g: number;
  allocated_order_numbers: string[];
  // Capacity
  est_eighths_from_bulk: number;
  est_lbs_from_bulk: number;
  // Strain-level demand summary
  strain_units_needed: number;
  strain_demand_g: number;
  strain_order_count: number;
  strain_urgency: string;
}

function useBatchesForStrain(strainId: string): {
  batches: BatchPlanData[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useAllocateBatch(): {
  allocate: (batchId: string, orderItemId: string, stage: string, weightG: number) => Promise<void>;
  loading: boolean;
}

function useDeallocateBatch(): {
  deallocate: (allocationId: string) => Promise<void>;
  loading: boolean;
}
```

---

## What Stays, What Goes

### KEEP (unchanged)
- **`package_assignments`** table + all 3 triggers (fulfillment layer)
- **`useAssignPackage`** hook (used from order detail, not production queue)
- **`v_production_queue_by_strain` v4** (the strain-level view still powers the
  main queue rows)
- **`batch_registry`**, **`batch_stage_tracking`**, **`batch_allocations`** tables
- **All 13 existing batch views**
- **Auto-advance trigger** (`trg_advance_status_on_first_assignment`)

### KEEP BUT HIDE
- **`BatchAssignPanel.tsx`** — keep in codebase, hide the "Assign" button on
  format rows. May return in Phase 2 for package-level fulfillment.
- **`useBatchAssign.ts`** — same, keep for potential Phase 2 use.

### NEW
- **`v_production_queue_batch_planning`** (SQL view — with strain-level demand
  aggregation and nullable strain_id handling)
- **`BatchPlanExpansion.tsx`** (container — strain-level, not format-level)
- **`BatchPlanCard.tsx`** (batch card with StageBar)
- **`BatchOrderList.tsx`** (order list within card)
- **`BatchStageBar.tsx`** (reusable, or import from SalesPipeline)
- **`useBatchPlanning.ts`** (hooks)

### MODIFY
- **`ProductionQueue.tsx`** — ByStrainView gets:
  1. New `planningStrain` state (string | null)
  2. "Plan Batches" button on strain header row
  3. New `<tr>` slot for `BatchPlanExpansion` between format rows and
     Contributing Orders
  4. Hide format-level "Assign" button (comment out, don't delete)

---

## Migration Path

### Phase 1: Schema (one migration)
1. Create `v_production_queue_batch_planning` view
2. No table changes needed — `batch_allocations` already exists

### Phase 2: Frontend — Batch Planning Layer
1. Add `BatchPlanData` types to `types.ts`
2. Build `useBatchPlanning.ts` hooks (useBatchesForStrain, useAllocateBatch,
   useDeallocateBatch)
3. Build `BatchStageBar.tsx` (port from SalesPipeline or make shared)
4. Build `BatchPlanCard.tsx` + `BatchOrderList.tsx`
5. Build `BatchPlanExpansion.tsx` container
6. Wire into `ProductionQueue.tsx`:
   a. Add `planningStrain` state to ByStrainView
   b. Add "Plan Batches" button on strain header row
   c. Insert `BatchPlanExpansion` `<tr>` between format rows and Contributing Orders
   d. Hide (comment out) format-level "Assign" button

### Phase 3: (Future) Package-Level Fulfillment
- Unhide format-level "Assign" button
- Batches that are allocated and packaged → link to package_assignments
- This is the "Fulfillment Layer" from the two-layer architecture
- `BatchAssignPanel` may be adapted or rebuilt for this purpose

---

## Open Questions

1. **Should "Plan Batches" be the button label, or keep "Assign"?**
   Laura may be used to "Assign" — but the action is fundamentally different now.

2. **Should allocations auto-compute weight or let Laura specify?**
   Recommendation: auto-compute from the order's demand weight, show it, let her
   override if needed.

3. **Do we need the SalesPipeline's StrainRow grouping here, or is the existing
   production queue strain row sufficient?**
   The production queue already groups by strain/format — we just expand into
   batch cards within that existing row.

4. **What happens when Laura allocates a batch that's still in bucked/binned?**
   It creates the allocation with `allocation_stage = 'bucked'`. The card shows
   a "⚠️ Needs processing" indicator. When the batch progresses to bulk, the
   stage updates automatically (or we add a lifecycle hook).
