---
title: CTO Domain Brief - Session 1
date: 2026-04-02
status: ready-for-engineering
source: board-qa-responses-CUL-275-CUL-270
audience: engineering-team
---

# CTO Domain Brief: Session 1 — Cultivation & Post-Production Knowledge Synthesis

**For:** CTO, Engineering Team
**From:** COO (Domain Knowledge Authority)
**Date:** 2026-04-02
**Source:** Board Q&A responses from CUL-275 (Cultivation Workflow) and CUL-270 (Post-Production) — Session 1 complete

---

## Executive Summary

Board Q&A responses (15 questions across 2 sessions) have revealed **two fundamental strategic misalignments** between current platform capabilities and real-world business operations:

1. **The Scheduling Bottleneck is NOT Labor Capacity** — It's a **batch timing collision** problem
2. **Post-Production Inventory Model is Liquidation, NOT Accumulation** — Cost of holding exceeds upside of waiting for price appreciation

These misalignments are driving operational pain in production planning, inventory management, and demand fulfillment. Fixing them requires 5 priority features (detailed below).

---

## Finding #1: The Cultivation Scheduling Bottleneck

### What Board Told Us

**Board Quote:**
> "The bottlenecks happen on the scheduling...all in the same week we will get bottlenecked. Harvest happens. And then lollipop happens. And then defol happens. And then the transplant happens. And we are running out of hands-on labor and equipment...we should be more strategic about it."

### What This Means

The problem is **NOT total labor capacity** (trimming, bucking, packaging). The problem is **task collision timing**.

**Weekly Task Collisions in Same Batch Rotation:**
- **Harvest Day** (Day 0): Move flower to trim room, start trimming
- **Lollipop Day 21** (Day 21): In VEG room on a different batch — remove lower branches to promote top growth
- **Defol Day 42** (Day 42): In FLOWER room on yet another batch — remove large fan leaves before dense flowering
- **Transplant Day 0 (Clone → Medium Pots)** (Day 0): In PROPAGATION — move rooted clones to soil

When these 4 tasks collide in the same week, **handwork labor and equipment (trim room, potting station, leaf vacuums, trays) become bottlenecks**, not because there aren't enough people, but because the same team is pulled in 4 directions simultaneously.

### Current Platform Gap

CULT does not surface **task collision visibility**. Batch scheduling ignores the fact that a single grow operation runs multiple batches on staggered schedules, and heavy-labor tasks can collide.

**Current state:** Batches are tracked in isolation. No forward-looking view of "next 4 weeks: what tasks happen when across ALL batches?" No ability to **delay or reschedule a batch to avoid collision**.

### Business Impact

- Inconsistent harvest timing (pulled labor = rushed trim = quality loss)
- Forced overtime or backlog in specific tasks
- Unpredictable trim room utilization (dark on Monday, slammed on Wednesday)
- Lost operational discipline around room cleaning windows

---

## Finding #2: Post-Production Inventory Model is Liquidation, Not Accumulation

### What Board Told Us

**Board Quote:**
> "Every month inventory sits past readiness, cost of production goes up...we should NEVER wait for better price. New material is always coming. The only variable is volume and speed."

### The Core Economics

**Costing Model:**
```
Unit Cost = Total Production Cost / Monthly Grams Sold
```

Key insight: **Total production cost is FIXED** (labor, nutrients, electricity, facility, licenses). The only variable is **volume sold per month**.

**Therefore:**
- Holding 100 lbs of product in November → cost/unit = $X per gram
- Selling that 100 lbs + new November crop in November → cost/unit = $Y per gram (lower, because you amortize fixed costs over more volume)
- Waiting for "better pricing" in December → cost/unit of November product in December = HIGHER (because fixed Nov costs are now spread over less volume)

**Conclusion:** Waiting for price appreciation is economically irrational. Sell fast, maintain volume velocity, keep the production line moving.

### Current Platform Gap

CULT does not enforce **inventory liquidation priority**. Current system:
- Tracks inventory by batch, strain, weight
- Supports manual order placement
- Does NOT automatically prioritize older inventory for sale
- Does NOT surface "ready-to-sell" inventory in demand fulfillment pipeline

Operational pain points from Q&A:
- Weekly oversells (orders exceed available inventory)
- 15+ day fulfillment cycles (delays between order and shipment)
- Inventory visibility gaps ("What's actually available to sell right now?")

This suggests the system lacks **demand-driven production queuing** and **inventory turnover visibility**.

---

## Five Priority Features (Ordered by Impact)

### 1. **Batch Task Collision Dashboard** (HIGH IMPACT)
**Problem:** Cultivation manager cannot see task collisions across batches
**Solution:** Forward-looking calendar (4-week window, per batch) showing:
- Lollipop/defol/transplant/harvest task dates for ALL active batches
- Predicted labor hours per task, per day
- Flag when >3 high-labor tasks collide on same day
- Recommend batch delay/reschedule options to spread load

**Why This Matters:** Reduces forced overtime, improves harvest quality, improves room utilization discipline
**Owner:** CTO (cultivation module)
**Depends On:** Current batch state + documented task timing rules (session response provides these)

---

### 2. **Inventory Liquidation Dashboard** (HIGH IMPACT)
**Problem:** Operations team cannot prioritize older/ready inventory in order fulfillment
**Solution:** Daily inventory view showing:
- Batches ready-to-ship, ordered by "days since harvest"
- Available grams per batch (accounting for committed orders)
- Turnover velocity (grams/day by batch)
- "Recommend ship these first" list based on liquidation priority

**Why This Matters:** Reduces fulfillment cycle time, improves cash flow, enforces liquidation discipline
**Owner:** CTO (inventory + orders modules)
**Depends On:** ATP/available-to-ship calculation (exists), chronological ordering

---

### 3. **Demand-Driven Production Queue** (MEDIUM IMPACT)
**Problem:** Production schedule is manual; no tie between order pipeline and grow scheduling
**Solution:** Forecast → Batch Plan integration:
- Monthly demand forecast (dispensary orders, seasonality)
- Automatic batch sizing/spacing recommendation (if we need 300 lbs/month, schedule batches accordingly)
- "If we shift batch X by 3 days, harvest aligns with demand peak" feedback
- Alert when demand exceeds production capacity

**Why This Matters:** Reduces surplus inventory, improves cash-to-cash cycle, prevents overproduction
**Owner:** CTO (cultivation + forecasting)
**Depends On:** Historical order volumes + demand seasonality (board to provide in Phase 2)

---

### 4. **Clone Planning & Propagation Scheduling** (MEDIUM IMPACT)
**Problem:** Transplant bottleneck requires accurate clone pipeline visibility
**Solution:** Cloning calendar showing:
- Clone "batch" maturity timelines (days from cut to rooted, rooted to plantable)
- When clones will be ready for transplant (and which batch they go into)
- Forecast mismatch alerts ("scheduled to transplant 500 clones but only 400 ready")
- Strain-specific take-rate and veg-time rules (board to provide in Phase 2)

**Why This Matters:** Reduces clone death loss, improves transplant reliability, feeds demand-driven scheduling
**Owner:** CTO (cultivation module)
**Depends On:** Clone take-rate and veg-time variance by strain (Phase 2 data)

---

### 5. **Yield Diagnostics & Batch Performance Analysis** (MEDIUM IMPACT)
**Problem:** Board manually tracks which strains/rooms outperform
**Solution:** Post-harvest analytics showing:
- Actual vs. expected yield by batch, strain, room, grower
- Drying loss %, trim loss %, final sellable %
- Room efficiency (lbs per sq ft per cycle)
- Early detection of underperformance (mold, disease, nutrient deficiency impact visible in batch data)

**Why This Matters:** Informs clone planning, batch timing, investment in underperforming rooms
**Owner:** CTO (analytics + cultivation)
**Depends On:** Post-harvest measurement integration (may already exist)

---

## Phase 2 Knowledge Gaps (Blocking Feature Implementation)

To properly implement the features above, board needs to provide deeper data on:

1. **Staff Capacity Rules** — How many labor hours per task, per week? Trim room capacity (lbs/day)? Does this vary by trimmer experience?
2. **Strain-Specific Yields & Timing** — Clone take-rate, veg cycle duration, flower duration, expected dry yield by strain?
3. **Conversion Rate Reference Table** — Wet → dry weight loss %, drying → sellable %, trim waste %? Does this vary by strain or facility?
4. **Customer Segment Pricing & Seasonality** — Wholesale vs. bulk pricing tiers? Seasonal variance (Q4 holidays, summer price dips)? Minimum order quantities?
5. **AZDHS Compliance Rules** (if applicable) — Any Arizona-specific manifesting, tag, or batch naming requirements not yet documented?
6. **Order Fulfillment SLA** — What is the expected lead time from order → shipment? Current 15 days — is this target or actual?

**Phase 2 Timeline:** Board to respond to deep-dive Q&A (6–8 questions) before sprint 2 cultivation/inventory features begin.

---

## Immediate Next Steps (Engineering)

1. **CUL-275 (Cultivation Module — C-4)**: Pause C-4 feature work. Implement **Feature #1 (Task Collision Dashboard)** first. This unblocks the scheduling bottleneck before adding more complexity.

2. **CUL-270 (Post-Production Module)**: Implement **Feature #2 (Inventory Liquidation Dashboard)** in parallel. This directly solves the weekly oversell + 15-day fulfillment pain.

3. **Board (Knowledge Gap Response)**: Post Phase 2 Q&A by end of week. This unblocks Features #3–5.

---

## Questions for Engineering During Implementation

- **Task Collision Dashboard:** How should "predicted labor hours" be calculated? Should we store task-duration rules in the DB or hardcode them?
- **Liquidation Dashboard:** Does ATP logic already account for committed orders? How do we surface "recommend ship this batch first"?
- **Demand Forecast:** Do we have historical order data to seed the forecast, or is this manual input initially?

---

**Document prepared by:** COO (9338f150-799e-47db-a561-407d611107ee)
**Status:** Ready for CTO review and engineering sprint planning
**Next Review:** After Phase 2 Q&A responses received
