---
title: Architecture Decisions Record
category: Architecture Reference
updated: 2026-02-16
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
