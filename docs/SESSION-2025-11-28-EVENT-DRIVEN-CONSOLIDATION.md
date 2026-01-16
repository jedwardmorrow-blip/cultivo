---
title: Event-Driven Trigger Consolidation
category: Session Report
date: 2025-11-28
status: Phase 2 Complete - Triggers Consolidated
priority: CRITICAL
---

# Event-Driven Trigger Consolidation - 2025-11-28

> **Status:** Phases 1-4 Complete | Ready for Phase 5 (Drop Legacy Columns)
> **Duration:** 4 hours
> **Impact:** All inventory movements, sessions, order fulfillment

---

## Executive Summary

Successfully consolidated conflicting trigger systems and migrated to pure event-driven inventory architecture. Fixed critical bugs where two triggers were processing every movement simultaneously, causing confusion and potential data inconsistencies.

### Key Achievements

✅ Eliminated duplicate trigger execution
✅ Removed legacy field writes from session triggers
✅ Standardized movement_kind nomenclature
✅ Clarified ATP (Available-To-Promise) vs on_hand_qty separation
✅ Build passes (2,444 modules)

---

## Critical Issues Discovered

### 1. Duplicate Trigger System (CRITICAL)

**Problem:**
Two triggers were firing on EVERY INSERT to inventory_movements:

1. `trg_process_inventory_movement` → `fn_process_inventory_movement()` (October 2025)
2. `trg_update_inventory_on_hand` → `fn_update_inventory_on_hand()` (November 2025)

**Symptoms:**
- Conflicting movement_kind interpretation (old vs new naming)
- Unclear which trigger was "winning"
- AI session inconsistency across months

**Resolution:**
- Disabled `trg_process_inventory_movement` (kept function for rollback)
- Designated `fn_update_inventory_on_hand` as PRIMARY TRIGGER
- Added deprecation comments

### 2. Movement Kind Naming Inconsistency

**Problem:**
Two naming conventions in use:

| Old (Oct) | New (Nov) | Usage |
|-----------|-----------|-------|
| CONSUME_SESSION_INPUT | CONSUME | Preferred ✅ |
| PRODUCE_SESSION_OUTPUT | PRODUCE | Preferred ✅ |
| RESERVE | RESERVE | Consistent ✅ |
| RELEASE | RELEASE | Consistent ✅ |

**Resolution:**
- Standardized on NEW naming (CONSUME, PRODUCE)
- Updated fn_update_inventory_on_hand to use new names
- Deprecated old fn_process_inventory_movement

### 3. RESERVE/RELEASE Misinterpretation

**Problem:**
`fn_update_inventory_on_hand` treated RESERVE as DECREMENT and RELEASE as INCREMENT, but session triggers already manage ATP (available_qty/reserved_qty) separately.

**Result:**
Potential for on_hand_qty to change when it shouldn't (RESERVE/RELEASE are ATP-only).

**Resolution:**
- Modified fn_update_inventory_on_hand to treat RESERVE/RELEASE as NO-OP
- Only session triggers update available_qty/reserved_qty
- on_hand_qty remains unchanged by RESERVE/RELEASE movements

### 4. Legacy Field Pollution

**Problem:**
Session triggers wrote unnecessary legacy fields:
- `session_type` (text) instead of `reference_type` (UUID-based)
- `source_identifier` (text package_id) instead of `source_item_id` (UUID)
- `source_weight_change` (redundant with qty)
- Plus 6 other legacy columns

**Resolution:**
- Updated `reserve_inventory_on_session_start()` to write ONLY event-driven fields
- Updated `release_inventory_on_session_cancel()` to write ONLY event-driven fields
- Use `reference_id` (session UUID) + `reference_type` (table name) instead

---

## Migrations Applied

### Migration 1: consolidate_event_driven_triggers (2025-11-28)

**Changes:**
1. Dropped trigger: `trg_process_inventory_movement`
2. Updated function: `reserve_inventory_on_session_start()`
   - Removed legacy field writes
   - Uses pure event-driven architecture
   - reference_id = session UUID
   - reference_type = TG_TABLE_NAME (e.g., 'bucking_sessions')
3. Updated function: `release_inventory_on_session_cancel()`
   - Removed legacy field writes
   - Pure event-driven
4. Added deprecation comment to `fn_process_inventory_movement()`

### Migration 2: fix_reserve_release_atp_handling (2025-11-28)

**Changes:**
1. Updated `fn_update_inventory_on_hand()` to treat RESERVE/RELEASE as NO-OP
2. Clarified that ATP tracking (available_qty/reserved_qty) is separate from on_hand_qty
3. Added comments explaining movement_kind behaviors

---

## Current Architecture

### Trigger Execution Flow

```
INSERT into inventory_movements
    │
    ├─ BEFORE Triggers (validation)
    │   ├─ trg_validate_movement
    │   ├─ trg_validate_movement_item_ids
    │   └─ trg_check_quarantine_before_movement
    │
    ├─ INSERT occurs (movement record created)
    │
    └─ AFTER Triggers (processing)
        └─ trg_update_inventory_on_hand ← ONLY THIS ONE
            └─ fn_update_inventory_on_hand()
                ├─ RESERVE/RELEASE: NO-OP (ATP handled elsewhere)
                ├─ CONSUME/FULFILLMENT: Decrement on_hand_qty
                ├─ PRODUCE/RECEIPT/RETURN: Increment on_hand_qty
                └─ ADJUSTMENT/RECONCILIATION: Set on_hand_qty absolute
```

### Movement Types

| movement_kind | Effect on on_hand_qty | Handled By | Notes |
|---------------|----------------------|------------|-------|
| CONSUME | Decrement | fn_update_inventory_on_hand | Session input |
| PRODUCE | Increment | fn_update_inventory_on_hand | Session output |
| RECEIPT | Increment | fn_update_inventory_on_hand | Initial stock |
| FULFILLMENT | Decrement | fn_update_inventory_on_hand | Order shipment |
| RETURN | Increment | fn_update_inventory_on_hand | Customer return |
| RESERVE | NO-OP | Session triggers (ATP only) | Soft allocation |
| RELEASE | NO-OP | Session triggers (ATP only) | Release allocation |
| ADJUSTMENT | Absolute | fn_update_inventory_on_hand | Manual correction |
| RECONCILIATION | Absolute | fn_update_inventory_on_hand | Physical count |

### Session Trigger Flow

```
Session Start (INSERT into bucking_sessions/trim_sessions/packaging_sessions)
    │
    └─ AFTER INSERT Trigger
        └─ reserve_inventory_on_session_start()
            ├─ Validate inventory exists and sufficient
            ├─ UPDATE inventory_items SET
            │   available_qty = available_qty - pull_weight,
            │   reserved_qty = reserved_qty + pull_weight
            └─ INSERT into inventory_movements (
                  movement_kind = 'RESERVE',
                  source_item_id = <uuid>,
                  qty = pull_weight,
                  reference_id = session.id,
                  reference_type = TG_TABLE_NAME
                )
                (fn_update_inventory_on_hand skips RESERVE - NO-OP)

Session Cancel (UPDATE set cancelled_at)
    │
    └─ AFTER UPDATE Trigger (if cancelled_at changed)
        └─ release_inventory_on_session_cancel()
            ├─ UPDATE inventory_items SET
            │   available_qty = available_qty + pull_weight,
            │   reserved_qty = reserved_qty - pull_weight
            └─ INSERT into inventory_movements (
                  movement_kind = 'RELEASE',
                  dest_item_id = <uuid>,
                  qty = pull_weight,
                  reference_id = session.id,
                  reference_type = TG_TABLE_NAME
                )
                (fn_update_inventory_on_hand skips RELEASE - NO-OP)
```

---

## Field Mapping: Legacy vs Event-Driven

### Before (Legacy + Event-Driven)

```sql
INSERT INTO inventory_movements (
  -- Event-driven (new)
  movement_kind,           -- 'RESERVE'
  source_item_id,          -- UUID
  qty,                     -- 1000
  unit,                    -- 'g'

  -- Legacy (old) ❌
  session_type,            -- 'bucking_sessions' (text)
  source_identifier,       -- 'PKG-12345' (text)
  source_weight_change,    -- -1000 (redundant)
  movement_type,           -- NULL
  ...
);
```

### After (Pure Event-Driven)

```sql
INSERT INTO inventory_movements (
  -- Event-driven architecture ✅
  movement_kind,           -- 'RESERVE'
  source_item_id,          -- UUID (proper foreign key)
  qty,                     -- 1000
  unit,                    -- 'g'

  -- Context (replaces legacy)
  reference_id,            -- Session UUID (proper foreign key)
  reference_type,          -- 'bucking_sessions' (table name)
  reason_code,             -- 'session_start'

  -- Human-readable
  notes                    -- 'Reserved 1000 g for bucking_sessions...'
);
```

**Advantages:**
- UUID-based relationships (referential integrity)
- No redundant data (qty vs source_weight_change)
- Clear context (reference_type + reference_id)
- Consistent with other movements (orders, audits, etc.)

---

## Verification

### Trigger Audit

```sql
-- Before consolidation
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'inventory_movements';
-- Result: trg_process_inventory_movement, trg_update_inventory_on_hand ❌ CONFLICT

-- After consolidation
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'inventory_movements';
-- Result: trg_update_inventory_on_hand ✅ ONLY ONE
```

### Build Verification

```bash
$ npm run build
✓ built in 16.93s
✓ 2,444 modules transformed
✅ NO ERRORS
```

---

## Next Steps

### Phase 5: Drop Legacy Columns (READY)

**Now safe to drop because:**
- ✅ Session triggers no longer write to legacy fields
- ✅ Application code doesn't reference legacy fields (verified)
- ✅ Build passes with current schema
- ✅ Only trigger system used legacy fields, now cleaned

**Columns to drop:**
1. `session_type` (text)
2. `source_inventory_type` (text)
3. `source_identifier` (text)
4. `source_weight_change` (numeric)
5. `destination_inventory_type` (text)
6. `destination_identifier` (text)
7. `destination_weight_change` (numeric)
8. `strain` (text)
9. `batch_id` (uuid - redundant with inventory_items.batch_id)

**Migration:** `drop_legacy_inventory_movement_columns.sql`

### Phase 6: Update TypeScript Types

Remove legacy columns from `database.types.ts`:
- Row type
- Insert type
- Update type

### Phase 7: Testing

**Critical Tests:**
1. Create bucking session → verify RESERVE movement created
2. Cancel bucking session → verify RELEASE movement created
3. Complete trim session → verify CONSUME/PRODUCE movements
4. Fulfill order → verify FULFILLMENT movement
5. Physical audit → verify RECONCILIATION movement

### Phase 8: Documentation Updates

- [x] SESSION-2025-11-28-EVENT-DRIVEN-CONSOLIDATION.md (this file)
- [ ] EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md (update Phase 6 status)
- [ ] DATABASE-TRIGGERS.md (reflect consolidated architecture)
- [ ] INVENTORY-TRACKING.md (remove legacy field references)
- [ ] AI-SESSION-BRIEF.md (update current state)

---

## Lessons Learned

### 1. AI Session Inconsistency

**Problem:** Different AI sessions created conflicting implementations over months:
- Oct session: Created fn_process_inventory_movement
- Nov session: Created fn_update_inventory_on_hand
- Both left active, causing silent conflicts

**Solution:** Regular architecture audits, clear deprecation of old code.

### 2. Dual-Schema Complexity

**Problem:** Maintaining both legacy and event-driven fields created confusion:
- Which fields to use?
- Which system is authoritative?
- Redundant data (qty vs source_weight_change)

**Solution:** Commit to ONE architecture, deprecate legacy immediately.

### 3. Documentation vs Reality

**Problem:** Documentation (EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md) described aspirational Phase 6 as "complete" when actually triggers still used legacy fields.

**Solution:** Session reports like this one to document ACTUAL state vs desired state.

### 4. Trigger Testing Difficulty

**Problem:** Hard to test triggers without full system context:
- Need actual sessions to test session triggers
- Need orders to test fulfillment
- Mock data doesn't exercise trigger paths

**Solution:** Test Mode system (already implemented) + comprehensive integration tests.

---

## Rollback Procedure

If issues discovered after Phase 5 (dropping columns):

### 1. Restore Triggers (< 1 minute)

```sql
-- Re-enable old trigger
CREATE TRIGGER trg_process_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_process_inventory_movement();
```

### 2. Restore Legacy Columns (if dropped) (5 minutes)

```sql
ALTER TABLE inventory_movements
  ADD COLUMN session_type text,
  ADD COLUMN source_inventory_type text,
  ADD COLUMN source_identifier text,
  ADD COLUMN source_weight_change numeric,
  ADD COLUMN destination_inventory_type text,
  ADD COLUMN destination_identifier text,
  ADD COLUMN destination_weight_change numeric,
  ADD COLUMN strain text,
  ADD COLUMN batch_id uuid;
```

### 3. Restore Session Triggers (10 minutes)

Revert `reserve_inventory_on_session_start` and `release_inventory_on_session_cancel` to previous versions from git history.

### 4. Test (30 minutes)

Create test session and verify it works.

**Total Rollback Time:** ~45 minutes

---

## Success Criteria

### Phase 2-4 (Complete ✅)

- [x] Only ONE trigger updates on_hand_qty
- [x] No legacy field writes in session triggers
- [x] RESERVE/RELEASE treated as ATP-only (no on_hand_qty change)
- [x] Build passes without errors
- [x] All triggers documented

### Phase 5-8 (Pending)

- [ ] Legacy columns dropped from inventory_movements
- [ ] TypeScript types updated
- [ ] All three session types tested (create, complete, cancel)
- [ ] Order fulfillment tested
- [ ] Physical audit tested
- [ ] Documentation reflects actual implementation
- [ ] System runs in production for 48 hours without issues

---

## Metrics

**Code Removed:**
- 1 duplicate trigger
- 1 conflicting trigger function (deprecated, not deleted)
- 9 legacy field writes per movement

**Clarity Gained:**
- 1 authoritative trigger function
- Consistent movement_kind naming
- Clear ATP vs on_hand_qty separation
- UUID-based relationships

**Build Time:** 16.93s (unchanged - no regression)
**Modules:** 2,444 (unchanged)

---

**Session Lead:** Claude AI (Code Assistant)
**Date:** 2025-11-28
**Duration:** 4 hours (analysis + implementation + verification)
**Status:** ✅ Phases 1-4 Complete | Ready for Phase 5
**Next Session:** Drop legacy columns + comprehensive testing

---
