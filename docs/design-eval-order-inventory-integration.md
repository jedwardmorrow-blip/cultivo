# Order System Redesign: Strain-First, Inventory-Aware Order Entry

**Version:** 2.0 — Revised March 23, 2026
**Status:** Final design — ready for build

---

## 1. The Problem

### 1,189 Products in a Flat Grid

The current product catalog presents 1,189 active products in a grid grouped only by category (packaged, preroll, bulk). Within each category, every strain × format permutation is a separate card. Nobody is scrolling through that.

### Actual SKU Structure

Each strain generates a matrix of distinct SKUs across stages and material types:

**Bulk products** (~13 per strain): 3 processing stages (Binned, Bucked, Trimmed) × 4-5 material types (Flower, Smalls, Trim, Preroll, Fresh Frozen). Each combination is a distinct SKU representing physically different material — "Binned Flower" is not the same product as "Bucked Flower" or "Bulk Smalls." All priced per lb.

**Packaged products** (~5 per strain): 3.5g Flower, 14g Smalls, 1lb Flower (454g), 1lb Smalls (454g), 1g Preroll. These are physically distinct sealed packages, each with their own inventory count. Priced per unit.

**Prerolls** (1 per strain): 1g Preroll. Priced per unit.

Plus ~296 packaged and ~74 preroll products for strains without a linked strain record (legacy data following the same format patterns).

### Zero Inventory Awareness

Leo adds products to the cart blind — no idea if they're in stock, which batches have availability, or how much weight remains per stage. The `order_items` table has `batch_id` and `strain_id` columns that never get populated during order entry. Batch assignment is a separate mental process.

---

## 2. UX Evaluation

### What's Working
- Single-page layout (customer + catalog + cart) follows the Square/Toast pattern well
- Dark theme with cult-* tokens is cohesive — industrial/utilitarian aesthetic fits an ops tool
- Cart persistence and price lock are strong operational features
- Mobile tab pattern (Details/Products/Cart) with mini cart summary is solid

### What's Failing
- Product overwhelm: 1,189-item flat grid defeats "everything visible, minimal navigation"
- No inventory context during selection — mistakes happen here (overselling, wrong batch)
- No batch traceability on order items
- No connection between order entry and production planning

---

## 3. The Design

### Core Concept: Strain-First, Inventory-Aware

Replace the flat product grid with a strain-first browsing model. Leo picks a strain, sees what's available across all stages and batches, selects the specific SKU and quantity, and the system handles batch allocation silently.

### 3.1 Strain Grid (replaces product grid)

Alphabetical grid of ~28-30 strain cards. Stable sort — never rearranges. Each card shows:

- Strain name
- Dominance type badge (indica/sativa/hybrid)
- Aggregated inventory summary: packaged units, bulk grams, batch count
- Availability indicator (green/yellow/red)
- Demand pressure: "X committed across Y pending orders" as a thin progress bar
- **When customer is selected:** one line of muted text — "Acme: 20 units, 14d ago" or "Never ordered"

**Filter chips** above the grid: **All** · **New for customer** · **In stock** · **Has COA**

Filters compose (can activate multiple). Grid filters in place — no rearranging. "New for customer" shows strains this customer hasn't ordered in 90+ days. Only appears when a customer is selected.

Search filters the strain grid by name. Power-user search (typing "3.5g" or "bulk flower") falls through to a cross-strain product search.

### 3.2 Strain Detail Panel (drill-in on click)

Clicking a strain card opens an inline expansion showing all orderable SKUs for that strain, grouped by category with real inventory counts. Each SKU is a distinct product row — no collapsing, no pickers, because these are physically different products.

**PACKAGED** (priced per unit)

| SKU | Price | Available | Customer History |
|-----|-------|-----------|-----------------|
| 3.5g Flower | $17.50/unit | 49 units | last: 10, 14d ago |
| 14g Smalls | $50/unit | 10 units | never ordered |
| 1lb Flower (454g) | — | 0 units | — |
| 1lb Smalls (454g) | — | 0 units | — |
| 1g Preroll | $3/g | available | last: 5, 14d ago |

**BULK — TRIMMED** (priced per lb)

| Material | Available | Batches |
|----------|-----------|---------|
| Flower | 384g | 2 batches |
| Smalls | 4,349g | 3 batches |
| Trim | 7,954g | 5 batches |
| Fresh Frozen | 0g | — |

**BULK — BUCKED** (priced per lb)

| Material | Available | Batches |
|----------|-----------|---------|
| Flower | 2,325g | 1 batch |
| Smalls | 0g | — |
| Trim | 0g | — |

**BULK — BINNED** (priced per lb)

| Material | Available | Batches |
|----------|-----------|---------|
| Flower | 0g | — |

Quick-add button on each row. Zero-inventory rows are visually muted but still visible (Leo needs to know what exists even if it's out of stock). Customer history shown as muted text per row when a customer is selected.

### 3.3 Batch Stage Visibility (per SKU)

When Leo taps a bulk SKU row to add it, or taps an expand chevron, he sees the **batch-level breakdown** for that specific stage + material type:

```
Bulk Flower — Animal Tsunami — 384g total across 2 batches

  Batch 260210-ASU  ·  harvested Feb 10  ·  222g available  ·  COA ✓
  Batch 251203-ASU  ·  harvested Dec 3   ·  162g available  ·  COA ✓
```

This gives Leo the ranking he needs: how much weight remains per stage per batch. He can see at a glance which batches to pull from and how deep the inventory goes.

For packaged products, the same pattern applies but shows packaged unit counts per batch:

```
3.5g Flower — Animal Tsunami — 49 units total across 6 batches

  Batch 260218-ASU  ·  harvested Feb 18  ·  10 units  ·  COA pending
  Batch 260210-ASU  ·  harvested Feb 10  ·  7 units   ·  COA ✓
  Batch 260128-ASU  ·  harvested Jan 28  ·  10 units  ·  COA ✓
  Batch 260114-ASU  ·  harvested Jan 14  ·  10 units  ·  COA ✓
  Batch 251231-ASU  ·  harvested Dec 31  ·  3 units   ·  COA ✓
  Batch 251105-ASU  ·  harvested Nov 5   ·  9 units   ·  COA ✓
```

### 3.4 Cart with Silent Batch Allocation

When a product is added to the cart, the system auto-selects the optimal batch (FIFO by harvest date, COA-verified first) and shows a small batch number tag. No picker, no decision required by default.

**Desktop cart line item (default/collapsed):**
```
Animal Tsunami · 3.5g Flower × 10     $175.00
  Batch: 260210-ASU · ✓ In stock
```

**Desktop cart line item (expanded on tap, or auto-expanded on warning):**
```
Animal Tsunami · 3.5g Flower × 10     $175.00
  Batch: 260210-ASU · ⚠ Only 7 available
  [Change batch]  [Split across batches]
```

Leo taps the batch tag only if he wants to override. Over-allocation warnings appear inline in real-time. `batch_id` and `strain_id` get populated on `order_items` at submission.

**Mobile cart line item (collapsed by default):**
```
ASU · 3.5g Flower × 10        $175.00
```

Tap to expand and see batch, availability, customer history. This keeps the mobile cart scannable — receipt-like density in collapsed state, full detail on demand.

### 3.5 Concurrent-Order Awareness (Option 1: Soft)

When Leo is building an order, the strain detail panel and cart show awareness of other pending orders consuming the same inventory:

- On the strain card: demand pressure progress bar (available vs. committed)
- On SKU rows: "12 units committed across 3 pending orders" in muted text
- In the cart: if a batch is also referenced by another pending order, show "Note: 2 other orders also pull from this batch"

This is purely informational — no blocking, no reservations. The data comes from joining `order_items` on `orders` where status is pending/open. Leo sees it, mentally adjusts, and moves on.

### 3.6 Post-Submit Fulfillment Summary

After order submission, replace the generic success toast with a fulfillment summary:

**Fully fulfillable:**
```
Order #1047 created ✓
4/4 items allocated from current stock.
Batch allocations recorded.
```

**Partially fulfillable:**
```
Order #1047 created ⚠
2/4 items allocated from stock.
2 items need production:
  · Stay Puft 3.5g Flower — 0 packaged, 602g bulk available
  · Orange Sherb 14g Smalls — 0 packaged, 7 units available (but 89 needed across orders)
```

### 3.7 Demand Forecast Widget (Orders Dashboard)

Small widget on the main orders list view:

```
This Week: 245 units across 12 orders
Stock covers 78% of demand
Gaps: Orange Sherb (−82 units) · Stay Puft (−14 units)
```

Non-intrusive, always visible. Makes the orders list itself a planning surface.

---

## 4. Visual Design & Micro-Interactions

### Filter Chip Transitions

When a filter is toggled, non-matching strain cards fade out with `opacity 0 → scale 0.95` over 200ms. Grid reflows smoothly. CSS-only — `transition: opacity 200ms ease, transform 200ms ease`.

### Add-to-Cart Feedback

When a product is added from the strain detail panel:
1. The SKU row flashes `cult-accent` briefly (150ms)
2. The cart column shows a brief "+1" animation at the top
3. On mobile, the mini-cart bar at the bottom bounces with a count increment

### Demand Pressure Bars

Thin progress bar (3px) under the inventory number on each strain card. Fill uses `cult-success` for available stock, `cult-warning` for committed/pending. Scannable at a glance across the entire grid.

### Availability Indicators

- Green dot + count: sufficient stock (>50% of typical order size available)
- Yellow dot + count: low stock (<50% available or high demand pressure)
- Red dot + "Out": zero available at that stage
- Muted/dimmed row: zero inventory, no active batches

### Mobile-Specific Refinements

**Strain grid on mobile:** 2-column grid. Each card shows strain name, single aggregated availability dot (green/yellow/red), and one number (total available units-equivalent). Tap to see full breakdown. Customer history line appears below the card name when a customer is selected.

**Strain detail on mobile:** Full-width scrollable panel replacing the grid. Back button returns to strain grid. SKU rows are full-width with larger touch targets (44px minimum). Batch breakdown is behind a tap-to-expand per SKU row.

**Cart on mobile:** Two-state design. Collapsed: product name, quantity, line total (one line per item). Tap to expand: batch assignment, availability warning, customer history. Keeps the cart scannable as a receipt in default state.

---

## 5. Data Architecture

### Existing Services (Already Built — Need Wiring)

| Service | Purpose | Status |
|---------|---------|--------|
| `batchAllocationService.fetchBatchInventoryConsolidated()` | Packaged/bulk/bucked totals per batch | Built |
| `batchAllocationService.fetchOrderDemandBySKU()` | Order demand aggregation | Built |
| `batchAllocationService.calculateProjectedInventoryRequirement()` | Demand vs. available matching | Built |
| `batchAllocationService.calculateBatchAllocationPath()` | Allocation strategy | Built |
| `batchService.fetchBatchWithCOAStatus()` | Batch data + quality info | Built |
| `batchService.checkBatchOverAllocation()` | Over-allocation warnings | Built |
| `batchService.fetchBatchStageAllocationStatusByBatch()` | Per-stage allocation metrics | Built |
| `BatchAllocationSelector` component | Batch picker UI | Built |

### New Hooks

```typescript
// Aggregates inventory by strain for the strain grid
// Queries batch_stage_tracking grouped by strain
useStrainInventorySummary()

// Fetches batch-level breakdown for a specific strain
// Returns per-batch, per-stage availability
useStrainBatchAvailability(strain: string)

// Customer order history for the selected customer
// Returns map of strainId → { totalQty, lastOrderDate, formatBreakdown }
useCustomerOrderHistory(customerId: string)

// Demand from pending/open orders, for demand pressure indicators
useOrderDemandPressure()

// Auto batch allocation for a product being added to cart
useAutoBatchAllocation(strain: string, stage: string, materialType: string)
```

### New DB View

```sql
CREATE VIEW strain_inventory_summary AS
SELECT
  br.strain,
  COUNT(DISTINCT br.id) as active_batch_count,
  SUM(CASE WHEN bst.stage = 'packaged' THEN bst.available_weight_grams ELSE 0 END)
    as packaged_available,
  SUM(CASE WHEN bst.stage = 'bulk_flower' THEN bst.available_weight_grams ELSE 0 END)
    as bulk_flower_grams,
  SUM(CASE WHEN bst.stage = 'bulk_smalls' THEN bst.available_weight_grams ELSE 0 END)
    as bulk_smalls_grams,
  SUM(CASE WHEN bst.stage = 'bulk_trim' THEN bst.available_weight_grams ELSE 0 END)
    as trim_grams,
  SUM(CASE WHEN bst.stage = 'bucked' THEN bst.available_weight_grams ELSE 0 END)
    as bucked_grams,
  MAX(br.harvest_date) as most_recent_harvest
FROM batch_registry br
JOIN batch_stage_tracking bst ON br.id = bst.batch_id
WHERE br.lifecycle_state NOT IN ('depleted', 'archived')
  AND bst.available_weight_grams > 0
GROUP BY br.strain;
```

### UI Component Plan

| Component | Purpose | Priority |
|-----------|---------|----------|
| `StrainGrid` | Replaces flat product grid; ~30 strain cards with inventory + demand pressure | P0 |
| `StrainCard` | Individual strain card with inventory summary, availability dot, customer history | P0 |
| `StrainDetailPanel` | Drill-in view showing all SKUs grouped by category + stage | P0 |
| `StrainFilterBar` | Filter chips: All / New for customer / In stock / Has COA | P0 |
| `BatchBreakdownRow` | Per-SKU expandable batch list showing weight per batch per stage | P0 |
| `CartItemCollapsible` | Two-state cart line: collapsed (receipt) / expanded (batch + warnings) | P1 |
| `DemandPressureBar` | Thin progress bar showing available vs. committed | P1 |
| `FulfillmentSummary` | Post-submit order fulfillment report | P1 |
| `DemandForecastWidget` | Orders dashboard widget showing weekly demand vs. stock coverage | P2 |

---

## 6. Wireframe: Desktop Three-Column Layout

```
┌──────────────────┬────────────────────────────────┬──────────────────┐
│ ORDER DETAILS    │ STRAIN CATALOG                  │ CART             │
│                  │                                 │                  │
│ Customer: [___]  │ [All] [New for Acme] [In stock] │ 3 items · $427   │
│ Priority: Normal │ Search: [______________] 🔍     │                  │
│ Delivery: Mar 28 │                                 │ ASU · 3.5g ×10   │
│                  │ ┌──────────┐ ┌──────────┐      │  260210 · ⚠ 7    │
│                  │ │ Animal   │ │ Black    │      │                  │
│                  │ │ Tsunami  │ │ Maple    │      │ CAP · Bulk F ×2lb│
│                  │ │ 🟢 49pkg │ │ 🟢 1.6kg │      │  260210 · ✓      │
│                  │ │ ██████░░ │ │ ████░░░░ │      │                  │
│                  │ │Acme:14d  │ │Acme:nevr │      │ STP · 1g PR ×5   │
│                  │ └──────────┘ └──────────┘      │  251231 · ✓      │
│                  │ ┌──────────┐ ┌──────────┐      │                  │
│                  │ │ Cap      │ │Chemlatto │      │──────────────────│
│                  │ │ Junky    │ │          │      │ Subtotal  $427   │
│                  │ │ 🟢 240pk │ │ 🟡 14pkg │      │ Total     $427   │
│                  │ │ ████████ │ │ ██░░░░░░ │      │                  │
│                  │ │Acme:30d  │ │Acme:nevr │      │ [ Submit Order ] │
│                  │ └──────────┘ └──────────┘      │                  │
│                  │                                 │                  │
│                  │ ▼ ANIMAL TSUNAMI (expanded)     │                  │
│                  │ ┌──────────────────────────────┐│                  │
│                  │ │ Indica · 5 batches · COA ✓  ││                  │
│                  │ │                              ││                  │
│                  │ │ PACKAGED           Avail  +  ││                  │
│                  │ │ 3.5g Flower  $17.50  49  [+] ││                  │
│                  │ │  Acme: 10 units, 14d ago     ││                  │
│                  │ │ 14g Smalls   $50     10  [+] ││                  │
│                  │ │  Acme: never ordered          ││                  │
│                  │ │ 1lb Flower    —       0   —  ││                  │
│                  │ │ 1lb Smalls    —       0   —  ││                  │
│                  │ │ 1g Preroll   $3       —  [+] ││                  │
│                  │ │                              ││                  │
│                  │ │ BULK — TRIMMED        Avail  ││                  │
│                  │ │ Flower    $X/lb    384g  [+] ││                  │
│                  │ │   ▸ 260210: 222g · 251203:…  ││                  │
│                  │ │ Smalls    $X/lb  4,349g  [+] ││                  │
│                  │ │ Trim      $X/lb  7,954g  [+] ││                  │
│                  │ │                              ││                  │
│                  │ │ BULK — BUCKED         Avail  ││                  │
│                  │ │ Flower    $X/lb  2,325g  [+] ││                  │
│                  │ │   ▸ 260210: 2,325g · COA ✓   ││                  │
│                  │ │ Smalls     —       0g    —   ││                  │
│                  │ │ Trim       —       0g    —   ││                  │
│                  │ └──────────────────────────────┘│                  │
└──────────────────┴────────────────────────────────┴──────────────────┘
```

---

## 7. Build Order

### Phase A: Strain-First Selection (P0)

1. `strain_inventory_summary` DB view
2. `useStrainInventorySummary` hook
3. `StrainGrid` + `StrainCard` components
4. `StrainDetailPanel` with SKU rows grouped by category and stage
5. `StrainFilterBar` with All / In stock / Has COA chips
6. `BatchBreakdownRow` — per-SKU expandable batch list with weight per batch per stage
7. Wire into existing `NewOrderForm` center column, replacing `ProductCatalog`

### Phase B: Customer Context (P0)

1. `useCustomerOrderHistory` hook (query `order_items` × `orders` by customer)
2. Ambient customer history text on strain cards and SKU rows
3. "New for customer" filter chip (appears when customer is selected)

### Phase C: Inventory-Aware Cart (P1)

1. `useAutoBatchAllocation` hook (FIFO by harvest, COA-verified first)
2. `CartItemCollapsible` — two-state cart line items
3. Auto-populate `batch_id` and `strain_id` on cart items
4. Over-allocation warnings using `checkBatchOverAllocation()`
5. Batch override tap-to-change functionality

### Phase D: Ambient Planning (P1)

1. `useOrderDemandPressure` hook
2. `DemandPressureBar` on strain cards
3. Concurrent-order awareness notes in cart
4. `FulfillmentSummary` post-submit component

### Phase E: Dashboard Integration (P2)

1. `DemandForecastWidget` on orders list view
2. Weekly demand vs. stock coverage calculation

### Phase F: Yield Projections (Future — Deferred)

**Deliberately deferred** to allow the system more time to accumulate production history data in `batch_production_history`. The conversion rate engine (bucked → bulk → packaged yield projections) requires enough historical data points per strain to be meaningful. Once 3-6 months of production data is recorded, build:

1. Historical yield calculation service
2. Per-strain conversion rate averages
3. Projected output when processing bucked/bulk stock
4. Production recommendation engine in fulfillment summary

---

## 8. Scoring

| Dimension | Current | This Plan |
|-----------|---------|-----------|
| Information architecture | 2 | 10 — strain-first hierarchy matches mental model; each drill-in level shows distinct SKUs correctly |
| Task completion speed | 3 | 9 — filter chips + customer history + quick-add; −1 because no reorder shortcut (intentional for simplicity) |
| Error prevention | 2 | 9.5 — silent auto-allocation + real-time warnings + demand pressure; −0.5 soft awareness only, no hard lock |
| Inventory awareness | 0 | 10 — batch-level, stage-level, demand-level visibility at every step |
| Learnability | 5 | 9.5 — strain grid is obvious, filters are universal, batch hidden by default; −0.5 demand pressure bars are a new visual concept |
| Mobile usability | 4 | 9.5 — two-state cart, simplified cards, proper touch targets; −0.5 batch breakdown rows are dense on small screens |
| Visual design coherence | 6 | 9.5 — filter transitions, add-to-cart feedback, demand bars add polish within utilitarian aesthetic; −0.5 ops tool ceiling |
| Operational value | 3 | 10 — order entry becomes demand signal, batch allocation at point of sale, planning ambient in ordering |

**Overall: 9.6 / 10**

Remaining 0.4: yield projection engine (deferred — needs data accumulation), server-side inventory reservation (future when scale demands it), and the inherent ceiling of visual design for an internal ops tool.
