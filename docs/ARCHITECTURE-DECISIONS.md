---
title: Architecture Decisions Record
category: Architecture Reference
updated: 2026-03-01
---

# Architecture Decisions Record

Key architectural decisions that govern how the system works. Read before modifying inventory, sessions, or conversion workflows.

---

## 1. Finalization Pattern: Creation vs. Transformation (2026-01-28)

**Core Principle:** Session finalization is inventory CREATION, not MOVEMENT.

**Two Distinct Patterns:**

1. **Inventory Movements (Transformation):**
   - Transform or adjust existing inventory
   - Examples: CONSUME, FULFILL, ADJUST, RECONCILE
   - Pattern: Trigger-based quantity updates
   - Movement trigger processes the movement

2. **Session Finalization (Creation):**
   - Create NEW inventory from session outputs
   - Examples: Packaging sessions, trim outputs, bucking outputs
   - Pattern: Direct quantity setting
   - Movement trigger bypasses (audit trail only)

**Implementation:**
```sql
-- Finalization: Set quantities directly
INSERT INTO inventory_items (
  on_hand_qty = v_total_units,
  available_qty = v_total_units,
  reserved_qty = 0
);

-- Movement for audit trail only (trigger bypasses)
INSERT INTO inventory_movements (
  reason_code = 'session_finalization'
);
```

**Key Rules:**
- Creation: Quantities set directly during INSERT
- Transformation: Quantities updated via movement trigger
- Never mix: Finalization should never rely on trigger choreography

**Reference:** `simplify_finalization_treat_as_creation.sql` (2026-01-28)

---

## 2. Batch-Centric Architecture (2025-10-20)

Everything links to batches. `batch_id` is NOT NULL in `inventory_items`.

**Batch Number Format:** `YYMMDD-STRAIN` (e.g., `251015-GPURP`)
**Package ID Format:** `YYMMDD-STRAIN-PKG` (e.g., `251015-GPURP-PKG001`)

**Why:** Cannabis traceability from seed to sale, required for compliance.

---

## 3. Event-Driven Inventory / Immutable Ledger (2025-10-21)

All inventory quantity changes go through `inventory_movements` table. Database triggers automatically update `inventory_items` balances.

**Use `inventoryMovementService.recordMovement()` for ALL inventory changes.**

Never directly update `on_hand_qty`, `available_qty`, or `reserved_qty`.

**Movement Kinds:** RECEIPT, CONSUME, PRODUCE, FULFILLMENT, RETURN, RESERVE, RELEASE, ADJUSTMENT, RECONCILIATION

---

## 4. Unpivoting Pattern for Session Outputs (2026-01-16)

Sessions that produce multiple product types are UNPIVOTED into separate rows before conversion aggregation.

**Example:** A bucking session producing flower (1500g) + smalls (1160g) becomes 2 separate conversion buckets, not 1.

Applied consistently across all session types:
- Bucking: 2 branches (flower, smalls)
- Trim: 3 branches (flower, smalls, trim)
- Packaging: 3 branches (3.5g, 14g, 1lb)

**View:** `pending_conversion_sessions` (8 total branches across all session types)

---

## 5. ATP (Available-to-Promise) Constraint

Formula: `available_qty = on_hand_qty - reserved_qty`

Enforced via constraint trigger (DEFERRABLE INITIALLY DEFERRED) to allow multi-step operations within a transaction.

**Validation query:**
```sql
SELECT COUNT(*) FROM inventory_qty_health WHERE health_status = 'MISMATCH';
```

---

## 6. Centralized Type System (2025-10-12)

Single source of truth for domain types in `src/types/`. Import from `@/types`.

Never create duplicate type definitions in feature files. Keep feature-specific types (UI state, props) in feature directories.

---

## 7. UUID Aggregation in PostgreSQL

PostgreSQL has NO aggregate functions for UUID types. `MAX(uuid_col)` will fail.

**Correct pattern:**
```sql
(SELECT uuid_col FROM table WHERE id = ANY(ids) LIMIT 1)
```

Safe when all rows share the same UUID value (guaranteed by batch-centric architecture).

---

## 8. Session Isolation in Conversion Views (2026-02-05)

Conversion packages must be filtered by `source_session_ids` to prevent cross-session contamination. Filtering by `aggregation_id` or `batch_id` alone is insufficient.

**Pattern:** `cp.source_session_ids @> to_jsonb(ARRAY[session.id])`

---

## 10. Strain Abbreviation is Mandatory and Validated to Exactly 3 Uppercase Letters (2026-02-18)

**Context:** Batch numbers (`YYMMDD-ABBREV`) and plant group IDs (`PG-YYMMDD-ABBREV`) both require a strain abbreviation. The old schema allowed `strains.abbreviation` to be any non-null text (3–5 chars per old docs), and the v1.0 trigger spec had a COALESCE fallback.

**Decision:** The abbreviation must be exactly 3 uppercase letters. No fallback.

**Enforcement is at two layers:**
1. **DB triggers** — `fn_generate_plant_group_number` (BEFORE INSERT on plant_groups) and `fn_complete_harvest_session` (BEFORE UPDATE on harvest_sessions) both raise a named exception if `strains.abbreviation` is null or empty. Neither has a COALESCE fallback.
2. **UI layer** — The StrainsManagement form must enforce exactly 3 chars, uppercase, before allowing save. This is implemented in Session C-3.

**Why trigger-layer, not schema-level CHECK constraint?**
A CHECK constraint on `strains.abbreviation` (e.g., `~'^[A-Z]{3}$'`) was considered. It was deferred to migration C-2-3 rather than implemented as a schema constraint now because:
- Existing strain rows may have NULL abbreviations and adding NOT NULL + CHECK would require a data migration
- The trigger enforcement is sufficient for runtime safety; the schema constraint is a belt-and-suspenders improvement
- Migration C-2-3 should add: `ALTER TABLE strains ADD CONSTRAINT strains_abbreviation_format CHECK (abbreviation ~ '^[A-Z]{3}$');`

**Why 3 letters exactly (not 3–5 as old docs said)?**
The live `SGA` badge in the UI and all existing batch numbers in production use exactly 3-letter abbreviations. Expanding to 5 would change existing batch number formats without benefit.

**Reference:** CULTIVATION-RULES.md Invariant C-11, CULTIVATION-ARCHITECTURE.md Triggers section

---

## 11. batch_registry.initial_weight_grams Stores First-Harvest Weight Only (2026-02-18)

**Context:** When same-strain same-day harvests occur (two plant groups harvested the same day), the `fn_complete_harvest_session` trigger uses `ON CONFLICT (batch_number) DO NOTHING`. The second session links to the existing batch but does not update `initial_weight_grams`.

**Decision:** Accept this behavior deliberately. `initial_weight_grams` is a reference/display field, not the authoritative weight register.

**Implication for consumers:**
- Any feature displaying "total batch harvest weight" MUST query `SUM(wet_weight_grams) FROM harvest_sessions WHERE batch_registry_id = ?`
- `initial_weight_grams` alone is unreliable for multi-harvest batches
- The weight adjustment trigger (`trg_sync_harvest_weight_adjustment`) only updates `initial_weight_grams` for the adjusted session — it does not recalculate across all sessions for the batch

**Why not accumulate on every insert?** An `ON CONFLICT DO UPDATE SET initial_weight_grams = initial_weight_grams + EXCLUDED.initial_weight_grams` approach was considered and rejected: it would change the semantics of the field from "wet weight at first harvest" (a useful point-in-time metric) to "running total" (which is already available via the harvest_sessions join), and it would introduce a more complex trigger that could interfere with the weight adjustment trigger.

**Reference:** CULTIVATION-RULES.md Invariant C-17, CULTIVATION-ARCHITECTURE.md Integration section

---

## 12. Anon RLS Policies Exist Intentionally for Public-Facing Routes (2026-02-18)

**Context:** An RLS audit (2026-02-18) found that several tables grant access to the Supabase `anon` role. This is not all accidental — some anon access is required for public-facing features.

**Intentional anon access (must be preserved):**

| Table | Anon Access | Required For |
|-------|-------------|-------------|
| `orders` | SELECT, INSERT, UPDATE | Public order form (`?order=new`) |
| `order_items` | SELECT, INSERT, UPDATE | Public order form |
| `customers` | SELECT, INSERT | Public order form customer lookup |
| `products` | SELECT | Public order form product list |
| `app_settings` | SELECT | Public order form company info |
| `coversheets` | SELECT (token-based) | Public coversheet URL (`/coversheet`) |
| `coa_documents` | SELECT (is_public flag) | Public COA library (`/coa-library`) |

**Legacy anon access (candidates for removal in a future dedicated session):**

| Table | Anon Access | Status |
|-------|-------------|--------|
| `trim_sessions` | ALL | Legacy — from early development before auth was added |
| `packaging_sessions` | ALL | Legacy |
| `bucked_inventory` | ALL | Legacy |
| `bulk_inventory` | ALL | Legacy |
| `app_settings` | UPDATE | Legacy — should be authenticated only |
| `strain_metadata` | ALL | Legacy |

**App-level auth gate:** `App.tsx` does NOT have a universal auth guard middleware. Authenticated screens each check `if (!user) return <Login />` individually. Public routes (`/coversheet`, `/coa-library`, `/menu`, `?order=new`, `/reset-password`) are hardcoded exceptions. This architecture is intentional for the public order form use case.

**Plan:** Legacy anon policy removal is a standalone future session (see OPTIMIZATION-ROADMAP.md). It requires: (1) auditing each table's usage patterns in production, (2) removing legacy anon policies, (3) optionally adding a PrivateRoute wrapper to App.tsx. This must NOT be done during cultivation build sessions.

**Reference:** OPTIMIZATION-ROADMAP.md RLS Anon Policy Removal section

---

## 9. Partial Conversion Support (2026-02-16)

The `finalize_session_aggregated` RPC must ONLY be called when ALL remaining weight/units are accounted for by packages. For partial conversions, skip the RPC so sessions remain in `'pending'` status.

**Why:** The VIEW filters by `finalization_status_* = 'pending'`. If the RPC marks sessions as finalized after a partial conversion, the remaining unconverted output disappears from the VIEW permanently.

**Implementation (in `conversions.service.ts`):**
```typescript
const isFullFinalization = (() => {
  if (params.output_weight != null && params.output_weight > 0) {
    return totalPackageWeight >= params.output_weight - 0.5;
  }
  if (params.output_units != null && params.output_units > 0) {
    return totalPackageUnits >= params.output_units;
  }
  return true; // Default to full (backward compat for packaging path)
})();

if (isFullFinalization) {
  // Call RPC to mark sessions as finalized
} else {
  // Skip RPC - sessions stay 'pending', VIEW shows reduced remaining
}
```

**Critical: Single-Session Package References for Partial Conversions**

When creating packages during partial finalization, `source_session_ids` must reference only ONE session (the first in the array). The VIEW's LEFT JOIN matches packages per-session via `cp.source_session_ids @> to_jsonb(ARRAY[bs.id])`. If a package references multiple pending sessions, its weight is counted once per session, inflating the subtracted amount.

**Key Rules:**
- The conditional is enforced at the SERVICE layer, not the RPC
- The `pending_conversion_sessions` VIEW already handles subtraction of packaged amounts
- `output_weight`/`output_units` from the VIEW represent REMAINING quantities
- 0.5g tolerance prevents floating point edge cases
- Packaging sessions (unit-based, non-bulk) do not pass `output_weight`/`output_units`, so they default to full finalization (backward compatible)

**Reference:** `conversions.service.ts`, migration `repair_swf_partial_finalization_status`

---

## 14. Task and Visit Auto-Logging Pattern (2026-02-25)

**Context:** CRM Phase 2 introduces tasks and visit scheduling. When a task or visit is completed, the account timeline (customer_activity_log) must reflect this without requiring manual double-entry.

**Decision:** Completing a task or visit auto-creates a `customer_activity_log` entry in the service layer. The activity log entry contains a `linked_task_id` or `visit_id` back-reference to the source record.

**Rationale:**
- Single source of truth: the activity log remains the complete account timeline
- No manual double-entry: completing a task = one action, two records
- Back-references allow the UI to distinguish auto-logged entries and link back to the source
- Service-layer implementation (not database trigger) keeps the logic auditable and testable

**Implementation:**
```typescript
async function completeTask(taskId: string) {
  // 1. Update task status + completed_at
  // 2. Auto-create activity log entry with linked_task_id = taskId
}

async function completeVisit(visitId: string, outcomeNotes: string) {
  // 1. Update visit status + outcome_notes
  // 2. Auto-create activity log entry with visit_id = visitId
}
```

**Why service-layer, not trigger?** A database trigger would create coupling between the task/visit tables and the activity log. The service layer approach is explicit, testable, and follows the existing `createActivity()` pattern already used in Phase 1.

**Reference:** CRM.md Phase 2, crm.service.ts

---

## 15. Account Health Scoring as a View, Not a Stored Column (2026-02-25)

**Context:** Account health scores help identify at-risk and dormant customers. The score combines order recency, frequency trend, revenue trend, and engagement metrics.

**Decision:** Health scores are computed on-read via a Postgres VIEW (`crm_account_scores`) rather than stored as a column on the customers table.

**Rationale:**
- Always fresh: no stale data, no sync triggers, no refresh jobs
- Acceptable performance: <100 customer accounts; the aggregation queries complete in milliseconds
- Simpler schema: no need for a trigger to recalculate scores on every order/task/visit change
- Matches the `crm_customer_summary` pattern already established in Phase 1

**Why not a stored column?** With <100 accounts, the read-time computation cost is negligible. Stored columns would require triggers on `orders`, `crm_tasks`, `crm_visit_schedule`, and `customer_activity_log` to stay current, adding significant complexity for no measurable performance gain.

**Reference:** CRM.md Phase 2, crm_account_scores view definition

---

## 16. Visit Calendar Follows DistributionCalendar Pattern (2026-02-25)

**Context:** The Visit Calendar needs a monthly grid with drag-and-drop, modal detail views, and real-time updates.

**Decision:** The Visit Calendar component mirrors the existing DistributionCalendar architecture: monthly grid, drag-to-reschedule, Supabase real-time subscription, click-to-expand day detail modal.

**Rationale:**
- Consistency: users already understand the DistributionCalendar interaction model
- Reduced maintenance: same patterns, similar code structure, shared understanding
- Proven approach: drag-and-drop + real-time is already working in production for delivery scheduling

**Reference:** CRM.md Phase 2, DistributionCalendar.tsx

---

## 13. Binning Session is a Data-Capture Milestone, Not an Inventory Event (2026-02-19)

**Context:** After harvest sessions complete, the wet material is moved to a dry room for a drying period. Once dried, operators record the post-drying weight (dry weight in grams) and the date the material was binned. This data is needed for compliance reporting and yield analysis.

**Decision:** Completing a binning session does NOT create inventory, does NOT trigger any batch lifecycle change, and does NOT insert any `inventory_movements` records. Dry weight is a reference figure only.

**Rationale:**
- Respects Architecture Decision 1 (Finalization = Creation). The batch already exists (created by harvest completion in `fn_complete_harvest_session`). Coupling dry weight recording to a second inventory creation path would conflict with the existing pipeline.
- Inventory is created downstream when processing sessions (bucking, trim, packaging) are finalized. Dry weight informs those sessions but does not drive them.
- Keeping binning as pure data-capture makes the trigger simple (validation only) and eliminates the risk of double-inventory or ATP violations.

**Implementation:**
- `trg_validate_binning_session` (BEFORE INSERT on `binning_sessions`) — validates that the referenced harvest session is `completed` and that `batch_registry_id` matches `harvest_sessions.batch_registry_id`. Does nothing else.
- No AFTER trigger on `binning_sessions`.
- `batch_registry_id` is denormalized onto `binning_sessions` for query convenience; the trigger ensures it is always consistent with the harvest session.

**Querying same-batch total dry weight:**
```sql
SELECT SUM(dry_weight_grams)
FROM binning_sessions
WHERE batch_registry_id = ? AND session_status = 'completed';
```
Mirrors the same-batch wet weight pattern (see Decision 11).

**Reference:** CULTIVATION-RULES.md Invariant C-37, CULTIVATION-ARCHITECTURE.md Triggers section (Trigger 13)

---

## 17. Delivery Model and Chain Performance as View-Based Analytics (2026-02-25)

**Context:** CRM Phase 2.5 adds delivery model tracking (hub_and_spoke vs direct_to_each) and per-child-location performance analytics for multi-location dispensary chains.

**Decision:** Delivery model is a simple text column on `customers`. Chain performance metrics are computed via a Postgres VIEW (`crm_chain_location_performance`) using CTEs for correct revenue share percentages. The `crm_customer_summary` view is extended with `delivery_model`, `child_total_revenue`, and `child_total_orders` for dashboard sorting.

**Rationale:**
- Simple column vs. junction table: delivery model is a 1:1 property of the customer, not a relationship. A text column with CHECK constraint is sufficient.
- VIEW over stored aggregates: with <20 hub_child accounts, real-time computation is fast. No refresh triggers needed.
- CTE-based percentage calculation: `child_stats` -> `parent_totals` -> final join ensures revenue_share_pct is always correct (sums to 100% per parent).
- Health labels in the VIEW: computed from days_since_last_order using the same thresholds as `crm_account_scores`, keeping health definitions consistent.

**Frontend implications:**
- Hub_child accounts excluded from dashboard top/at-risk lists to prevent double-counting
- Hub_parent revenue sorted by combined (parent + children) in all lists
- Expand/collapse tree pattern in AccountsList with child search bubbling

**Reference:** CRM-SUB-ACCOUNTS.md, CRM.md Phase 2.5

---

## 18. Route Zone Classification is Client-Side, Not Stored (2026-02-26)

**Context:** The Distribution Calendar needs geographic awareness to help users plan route-efficient delivery days (clustering orders by geographic corridor).

**Decision:** Route zones are computed client-side using haversine distance + bearing from facility coordinates. The 5 zones (Local, East Valley, West Valley, Tucson, Northern AZ) are defined as constants in `src/features/delivery/utils/routeZones.ts`. No database column or migration required.

**Rationale:**
- With <40 active customers, computing zones for all visible orders is negligible (sub-millisecond).
- Avoids a stored column that would need re-computation when facility coordinates or zone boundaries change.
- Zone boundaries can be adjusted in code without a migration.
- Customer coordinate data already exists in the `customers` table; facility coordinates are in `app_settings`.
- Suggested-day scoring (zone match + preferred day + capacity) is pure client-side using already-loaded order data.

**Zone assignment logic:** Distance < 10mi = Local, Distance > 80mi + bearing S/SE = Tucson, Distance > 80mi + other bearings = Northern AZ, 10-80mi + bearing E/SE = East Valley, 10-80mi + bearing W/NW = West Valley.

**Reference:** CHANGELOG 2026-02-26, `src/features/delivery/utils/routeZones.ts`

---

## 19. Package Assignment Reservation System Replaces Legacy Allocations (2026-03-01)

**Context:** The system had two parallel allocation mechanisms: a legacy `order_item_allocations` table (with related triggers/functions) and a newer `package_assignments` table. The legacy system was dead code with only 2 rows and no active UI references. Inventory was never automatically reserved or deducted when packages were assigned to orders.

**Decision:** Remove the entire legacy allocation system and implement trigger-based inventory reservation on the `package_assignments` table.

**Implementation:**
1. **Removed:** `order_item_allocations`, `inventory_transactions` tables; 10 legacy functions; 4 legacy triggers
2. **Added `status` column** to `package_assignments`: `'reserved'` | `'fulfilled'` | `'released'`
3. **Reservation trigger** (`fn_reserve_inventory_on_assignment`, AFTER INSERT): decrements `available_qty`, increments `reserved_qty`, creates RESERVE movement
4. **Release trigger** (`fn_release_inventory_on_unassignment`, BEFORE DELETE): restores available_qty for non-fulfilled assignments
5. **Order completion trigger** (`fn_fulfill_inventory_on_order_complete`): converts reservations to FULFILLMENT movements (permanent on_hand_qty deduction)
6. **Order cancellation trigger** (`fn_release_inventory_on_order_cancel`): releases all reservations
7. **Revert trigger** (`fn_reverse_fulfillment_on_order_revert`): creates RETURN movements if order leaves 'completed' status
8. **Views:** `inventory_reservation_summary`, `package_assignments_with_reservations`

**Why trigger-based, not service-layer?**
- Matches the existing session reservation pattern (`reserve_inventory_on_session_start`, `release_inventory_on_session_cancel`)
- Guarantees consistency even if app layer bypassed (direct DB edits, edge functions)
- Movement trigger (`fn_update_inventory_on_hand`) already handles FULFILLMENT/RETURN kinds
- RESERVE/RELEASE are ATP-only operations (no on_hand change), handled directly in the reservation triggers

**Key invariants:**
- `available_qty = on_hand_qty - reserved_qty` (enforced by ATP constraint trigger)
- Package assignment INSERT always creates a RESERVE movement
- Package assignment DELETE always creates a RELEASE movement (if status = 'reserved')
- Order completion always creates FULFILLMENT movements for all reserved assignments
- Fulfilled assignments cannot be removed (service-layer guard + UI disabled state)

**Reference:** ORDERS.md v2.0, migrations `remove_legacy_allocation_system`, `add_package_assignment_reservation_system`, `create_inventory_reservation_views`, `create_order_fulfillment_triggers`
