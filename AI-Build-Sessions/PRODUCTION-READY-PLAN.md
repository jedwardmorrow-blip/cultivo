# AI-Driven Production Deployment Plan

**Version:** 1.0
**Created:** 2026-01-19
**Status:** Active
**Purpose:** Session-based implementation guide with continuity checkpoints for AI-driven builds

---

## Overview

This document provides a comprehensive, phased approach for deploying production-ready features. Each session is self-contained with clear entry/exit criteria, testing procedures, and rollback plans to ensure continuity even if interrupted.

## Session Structure

Each session follows this pattern:
- **Session ID:** Unique identifier
- **Duration:** Estimated time (30-120 minutes)
- **Entry Criteria:** What must be true before starting
- **Exit Criteria:** What must be true to consider complete
- **Rollback:** How to undo if needed
- **Next Session:** What to do next

---

## PHASE 1: CRITICAL BUG FIXES

### Session 1.1: Fix Conversion Finalization Schema Mismatch

**Session ID:** CONV-FIX-001
**Priority:** CRITICAL
**Duration:** 45-60 minutes
**Blocking:** Yes - conversions currently unusable

**Entry Criteria:**
- No uncommitted changes in src/features/inventory/services/
- Database connection verified
- Can execute test conversion workflow

**Implementation Steps:**

1. **Read actual inventory_items schema from database**
   - Execute: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_items'`
   - Document current schema vs code expectations

2. **Fix conversions.service.ts (lines 263-279)**
   - Remove: `product_id` field (does not exist)
   - Update: strain FK lookup from `strains.name` to match actual column
   - Verify: batch_number, strain_id, product_stage_id exist
   - Add: proper null checks for batch data
   - Change: error logging to throw errors (lines 246, 288)

3. **Add validation before insert**
   - Validate batch_id exists
   - Validate strain_id exists
   - Validate product_stage_id exists
   - Fail fast with clear error messages

4. **Update inventory movement creation (lines 295-322)**
   - Ensure movement created AFTER inventory_item exists
   - Use proper error propagation
   - Add transaction rollback on failure

**Files to Modify:**
- `src/features/inventory/services/conversions.service.ts`

**Testing Procedure:**

1. **Pre-test:** Note current pending conversions count
2. **Test A:** Complete bucking session → verify appears in conversions
3. **Test B:** Finalize conversion with 3 bulk bags
   - Check console: no errors
   - Check database: 3 conversion_packages created
   - Check database: 3 inventory_items created with correct weights
   - Check UI: packages appear in inventory
   - Check UI: item removed from pending conversions
4. **Test C:** Verify inventory movements created for audit
5. **Test D:** Try invalid finalization (missing batch) → should fail gracefully

**Exit Criteria:**
- Zero console errors during finalization
- Packages AND inventory items created atomically
- Weights match between conversion_packages and inventory_items
- Items removed from pending conversions after finalization
- Inventory movements created for audit trail
- All 5 tests pass

**Rollback:**
- Git revert changes to conversions.service.ts
- No database changes needed (code-only fix)

**Next Session:** 1.2 (COA Validation) or 2.1 (Batch Migrations) if conversions not urgent

---

### Session 1.2: Add COA Validation Before Packaging

**Session ID:** COA-VAL-001
**Priority:** HIGH
**Duration:** 60-90 minutes
**Blocking:** No - but compliance risk

**Entry Criteria:**
- Database connection verified
- Can create/read certificates_of_analysis table
- Have test batch with and without COA

**Implementation Steps:**

1. **Create validation trigger SQL**
   - File: `supabase/migrations/20260120000000_add_coa_validation_trigger.sql`
   - Function: `check_batch_has_valid_coa(batch_id UUID) RETURNS BOOLEAN`
     - Query active COA: `SELECT COUNT(*) FROM certificates_of_analysis WHERE batch_id = $1 AND status = 'active' AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)`
     - Return true if count > 0
   - Trigger: `trg_validate_coa_before_packaging_session BEFORE INSERT ON packaging_sessions`
     - Call validation function
     - RAISE EXCEPTION if false: 'Cannot start packaging: Batch requires valid COA. Upload COA first.'

2. **Test migration in local database**
   - Apply migration
   - Test insert without COA → should fail
   - Upload COA → insert should succeed

3. **Update UI to show COA status**
   - File: `src/features/sessions/components/PackagingSessionForm.tsx`
   - Add query to check COA status when batch selected
   - Display indicator: Green checkmark if valid COA, Red warning if missing
   - Add helpful message: "Upload COA in Batches section before packaging"

**Files to Create:**
- `supabase/migrations/20260120000000_add_coa_validation_trigger.sql`

**Files to Modify:**
- `src/features/sessions/components/PackagingSessionForm.tsx`

**Testing Procedure:**

1. **Database Test:**
   - Create test batch without COA
   - Attempt INSERT into packaging_sessions → should fail
   - Upload COA for batch
   - Retry INSERT → should succeed
   - Expire COA (set expiry_date to yesterday)
   - Attempt INSERT → should fail again

2. **UI Test:**
   - Open packaging form
   - Select batch without COA → see red warning, helpful message
   - Upload COA via Batches screen
   - Return to packaging form → see green checkmark
   - Can submit form successfully

**Exit Criteria:**
- Trigger blocks packaging without valid COA
- Error message is clear and actionable
- UI shows COA status before submission
- All 6 tests pass
- No breaking changes to existing packaging workflows

**Rollback:**
- `DROP TRIGGER IF EXISTS trg_validate_coa_before_packaging_session ON packaging_sessions;`
- `DROP FUNCTION IF EXISTS check_batch_has_valid_coa;`
- Git revert UI changes

**Next Session:** 2.1 (Begin Batch 1 migrations)

---

## PHASE 2: BATCH 1 CRITICAL INTEGRITY MIGRATIONS

**Reference:** `supabase/migrations/batch1_critical_integrity_fixes/README.md`
**Status:** 2 of 6 complete, 4 remaining

### Session 2.1: Pre-Deployment Code Audit

**Session ID:** BATCH1-AUDIT-001
**Priority:** HIGH
**Duration:** 90-120 minutes
**Blocking:** Yes - must complete before migration 4

**Entry Criteria:**
- Migrations 1-2 already deployed (batch_id backfill and constraints)
- Full codebase access
- Can search across all TypeScript files

**Implementation Steps:**

1. **Audit for direct on_hand_qty updates**
   - Search: `grep -r "\.update.*on_hand_qty" src/`
   - Search: `grep -r "on_hand_qty.*=" src/ | grep -v "const\|let\|var"`
   - Document all locations found

2. **Audit for direct available_qty updates**
   - Search: `grep -r "\.update.*available_qty" src/`
   - Document all locations

3. **Review inventoryMovementService coverage**
   - File: `src/services/inventoryMovement.service.ts`
   - Verify recordMovement function exists
   - Check all movement_kind types supported
   - Ensure proper error handling

4. **Create migration plan for each violation**
   - For each direct update found:
     - Document current code
     - Design replacement using inventory_movements
     - Note testing requirements

**Expected Findings:**
- Based on grep results: NO direct updates found (good news!)
- If any found: Create detailed fix plan before proceeding

**Exit Criteria:**
- Complete list of all direct quantity updates
- Replacement pattern documented for each
- Testing plan created
- inventoryMovementService verified functional

**Deliverable:** Create `AI-Build-Sessions/BATCH1-CODE-AUDIT-RESULTS.md`

**Next Session:** 2.2 (Fix any violations) or 2.3 (Deploy migrations) if none found

---

### Session 2.2: Deploy Migration 3 - Lifecycle State Timing

**Session ID:** BATCH1-MIG-003
**Priority:** HIGH
**Duration:** 45-60 minutes
**Blocking:** No - but improves data quality

**Entry Criteria:**
- Migrations 1-2 confirmed deployed and verified
- Database backup created
- No active production sessions in progress

**Implementation Steps:**

1. **Review migration file**
   - File: `supabase/migrations/batch1_critical_integrity_fixes/20251107000003_fix_lifecycle_state_timing.sql`
   - Understand triggers: `trg_update_batch_lifecycle_on_trim_complete`, `trg_handle_trim_session_cancellation`
   - Note: Moves state updates from session START to session COMPLETION

2. **Apply to local/staging first**
   - Execute migration
   - Check for errors
   - Verify triggers created

3. **Test session workflows**
   - Start trim session → lifecycle_state should NOT change
   - Complete trim session → lifecycle_state should change
   - Cancel trim session → lifecycle_state should rollback
   - Repeat for packaging sessions

4. **Apply to production**
   - Create backup: timestamp noted
   - Run migration
   - Verify with: `SELECT * FROM batch1_critical_integrity_fixes/verify_batch1_all.sql` (test suite 2)

**Files Involved:**
- `supabase/migrations/batch1_critical_integrity_fixes/20251107000003_fix_lifecycle_state_timing.sql`

**Testing Procedure:**

1. **Before migration:** Complete session → note timing of state change
2. **After migration:**
   - Start trim session for batch in 'drying' state
   - Check batch_registry → should still be 'drying'
   - Complete session
   - Check batch_registry → should now be 'bucking_complete'
3. **Cancellation test:**
   - Start packaging session (state → 'packaging')
   - Cancel session
   - Check batch_registry → should revert to previous state

**Exit Criteria:**
- Migration applied without errors
- Triggers created successfully
- Lifecycle states update on completion only
- Cancellation rollback works
- Verification tests pass

**Rollback:**
```sql
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_trim_complete ON trim_sessions;
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions;
DROP TRIGGER IF EXISTS trg_handle_trim_session_cancellation ON trim_sessions;
DROP TRIGGER IF EXISTS trg_handle_packaging_session_cancellation ON packaging_sessions;
```

**Next Session:** 2.3 (Migration 4 - Ledger enforcement)

---

### Session 2.3: Deploy Migration 4 - Ledger-Only Quantity Changes

**Session ID:** BATCH1-MIG-004
**Priority:** CRITICAL
**Duration:** 60-90 minutes
**Blocking:** Yes - fundamental architecture change

**Entry Criteria:**
- Session 2.1 audit complete with NO violations found
- Migration 3 deployed and verified
- Database backup created
- All stakeholders notified (5-10 min read-only window)

**Implementation Steps:**

1. **Review migration file**
   - File: `supabase/migrations/batch1_critical_integrity_fixes/20251107000004_enforce_ledger_only_quantity_changes.sql`
   - Creates: `trg_block_direct_quantity_updates` (prevents UPDATE of on_hand_qty)
   - Creates: `trg_process_inventory_movement` (auto-updates on_hand_qty from movements)
   - Creates: RLS policies blocking DELETE/UPDATE on inventory_movements

2. **Communicate read-only window**
   - Notify users: "Database maintenance in progress - 5-10 minutes"
   - Consider: Set app to maintenance mode if available

3. **Apply migration**
   - Execute SQL file
   - Monitor for errors
   - Check trigger creation

4. **Test ledger enforcement**
   - Attempt direct update → should fail
   - Insert movement → should auto-update inventory
   - Verify audit trail immutability

**Files Involved:**
- `supabase/migrations/batch1_critical_integrity_fixes/20251107000004_enforce_ledger_only_quantity_changes.sql`

**Testing Procedure:**

1. **Block direct updates:**
   ```sql
   UPDATE inventory_items SET on_hand_qty = 100 WHERE id = '<test-id>';
   -- Should fail with: "Direct quantity updates blocked. Use inventory_movements."
   ```

2. **Test movement processing:**
   ```sql
   INSERT INTO inventory_movements (movement_kind, dest_item_id, qty, unit, reason_code)
   VALUES ('ADJUSTMENT', '<test-id>', 50, 'g', 'test');
   -- Should succeed and auto-update inventory_items.on_hand_qty
   ```

3. **Test movement immutability:**
   ```sql
   UPDATE inventory_movements SET qty = 100 WHERE id = '<movement-id>';
   -- Should fail - immutable fields
   DELETE FROM inventory_movements WHERE id = '<movement-id>';
   -- Should fail - audit trail protected
   ```

4. **Run verification suite:**
   - Execute test suite 3 from verify_batch1_all.sql
   - All 5 tests must PASS

**Exit Criteria:**
- Migration applied successfully
- Direct quantity updates blocked
- Movements auto-update inventory
- Immutability enforced
- All verification tests pass
- Application functionality unaffected

**Breaking Change Alert:** If ANY code was missed in audit (Session 2.1), it will fail now. Monitor error logs closely for 1 hour.

**Rollback:**
```sql
DROP TRIGGER IF EXISTS trg_block_direct_quantity_updates ON inventory_items;
DROP TRIGGER IF EXISTS trg_process_inventory_movement ON inventory_movements;
DROP POLICY IF EXISTS "Block DELETE on inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Block UPDATE on immutable movement fields" ON inventory_movements;
```

**Next Session:** 2.4 (Migration 5 - Quarantine gate)

---

### Session 2.4: Deploy Migration 5 - Quarantine Gate

**Session ID:** BATCH1-MIG-005
**Priority:** HIGH
**Duration:** 45-60 minutes
**Blocking:** No - safety feature

**Entry Criteria:**
- Migration 4 deployed and verified
- Database backup created
- Test batch with quarantine status available

**Implementation Steps:**

1. **Review migration file**
   - File: `supabase/migrations/batch1_critical_integrity_fixes/20251107000005_enforce_quarantine_gate.sql`
   - Creates: `v_quarantined_batches` view
   - Creates: `trg_check_quarantine_before_movement` (blocks RESERVE/FULFILLMENT)
   - Creates: `quarantine_violation_log` table for audit

2. **Apply migration**
   - Execute SQL
   - Verify view and triggers created

3. **Test quarantine enforcement**
   - Quarantine a batch
   - Attempt to reserve for order → should fail
   - Attempt to fulfill order → should fail
   - Check violation log → entries created
   - Release quarantine → operations succeed

**Files Involved:**
- `supabase/migrations/batch1_critical_integrity_fixes/20251107000005_enforce_quarantine_gate.sql`

**Testing Procedure:**

1. **Set up test:**
   ```sql
   UPDATE batch_registry SET quarantine_status = 'quarantined',
     quarantine_reason = 'test' WHERE id = '<test-batch-id>';
   ```

2. **Test blocks:**
   - Try creating order_item with quarantined batch → should fail
   - Try fulfilling existing order → should fail
   - Check quarantine_violation_log → should have 2 entries

3. **Test allowed operations:**
   - Create trim session with quarantined batch → should succeed (production allowed)
   - Create packaging session → should succeed

4. **Test release:**
   ```sql
   UPDATE batch_registry SET quarantine_status = 'released' WHERE id = '<test-batch-id>';
   ```
   - Retry order operations → should succeed

**Exit Criteria:**
- Migration applied successfully
- Quarantine blocks RESERVE/FULFILLMENT
- Production sessions still allowed
- Violation log captures attempts
- Release restores full operations
- Verification tests pass

**Rollback:**
```sql
DROP TRIGGER IF EXISTS trg_check_quarantine_before_movement ON inventory_movements;
DROP TABLE IF EXISTS quarantine_violation_log CASCADE;
DROP VIEW IF EXISTS v_quarantined_batches;
```

**Next Session:** 2.5 (Migration 6 - Final constraints)

---

### Session 2.5: Deploy Migration 6 - Critical Constraints

**Session ID:** BATCH1-MIG-006
**Priority:** MEDIUM
**Duration:** 30-45 minutes
**Blocking:** No - data quality improvement

**Entry Criteria:**
- Migration 5 deployed and verified
- Database backup created
- Data quality pre-check completed

**Pre-Flight Check:**
```sql
-- Check for constraint violations BEFORE applying
SELECT package_id FROM inventory_items
WHERE package_id IS NOT NULL
  AND package_id !~ '^[0-9]{6}-[A-Z0-9]+-[0-9]{2}$';
-- Should return 0 rows

SELECT * FROM order_items WHERE demand_unit NOT IN ('g', 'unit', 'oz', 'lb');
-- Should return 0 rows

SELECT batch_id, COUNT(*) FROM certificates_of_analysis
WHERE status = 'active' GROUP BY batch_id HAVING COUNT(*) > 1;
-- Should return 0 rows
```

**Implementation Steps:**

1. **Review migration file**
   - File: `supabase/migrations/batch1_critical_integrity_fixes/20251107000006_add_critical_high_constraints.sql`
   - Adds: Package ID format constraint
   - Adds: Order status transition validation
   - Adds: Unique active COA per batch
   - Adds: Demand unit validation

2. **Apply migration**
   - Execute SQL
   - Monitor for constraint violations

3. **Test constraints**
   - Try invalid package_id → should fail
   - Try invalid order status → should fail
   - Try duplicate active COA → should fail

**Exit Criteria:**
- Migration applied successfully
- All constraints active
- No existing data violations
- New violations blocked
- Verification tests pass

**Rollback:**
```sql
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_package_id_format;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_demand_unit_check;
DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON orders;
DROP INDEX IF EXISTS certificates_of_analysis_unique_active_per_batch;
```

**Next Session:** 2.6 (Batch 1 verification and documentation)

---

### Session 2.6: Batch 1 Final Verification and Documentation

**Session ID:** BATCH1-VERIFY-001
**Priority:** HIGH
**Duration:** 30-45 minutes
**Blocking:** Yes - required before Phase 3

**Entry Criteria:**
- All 6 migrations deployed
- 24 hours of production monitoring complete
- No critical errors in logs

**Implementation Steps:**

1. **Run complete verification suite**
   - File: `verification/batch1_critical_integrity_fixes/verify_batch1_all.sql`
   - Execute full suite (25+ tests)
   - Document results

2. **Manual functional testing**
   - Create inventory item → verify batch_id auto-set
   - Attempt batch_id update → verify blocked
   - Complete trim session → verify lifecycle updates
   - Insert movement → verify quantity auto-updates
   - Quarantine batch → verify operations blocked
   - All 8 manual tests from README.md

3. **Check monitoring metrics**
   ```sql
   -- Should be 0
   SELECT COUNT(*) FROM inventory_items WHERE batch_id IS NULL;

   -- Review for anomalies
   SELECT * FROM quarantine_violation_log WHERE blocked_at > now() - interval '24 hours';

   -- Should be 0 (no direct updates)
   SELECT COUNT(*) FROM pg_stat_statements
   WHERE query LIKE '%UPDATE inventory_items%SET on_hand_qty%';
   ```

4. **Update documentation**
   - File: `supabase/migrations/batch1_critical_integrity_fixes/DELIVERABLES.md`
   - Change status: "PARTIALLY COMPLETED" → "COMPLETED"
   - Update migration status: All to ✅
   - Add deployment date and verification results

5. **Update tracking docs**
   - File: `docs/DOCS-INTEGRATION-PROGRESS.md`
   - Update Database Migration Tracking section
   - Change Batch 1 status: 🟡 Planned → 🟢 Completed
   - Add CHANGELOG reference

6. **Create CHANGELOG entry**
   - File: `CHANGELOG.md`
   - Section: `## 2026-01-[DATE] - Database Integrity: Batch 1 Critical Fixes`
   - Include: Migration list, testing results, impact assessment

**Exit Criteria:**
- All 25+ verification tests PASS
- All 8 manual tests PASS
- Zero orphaned inventory items
- Zero constraint violations in logs
- Documentation updated
- CHANGELOG entry created
- Team notified of completion

**Deliverable:** `AI-Build-Sessions/BATCH1-COMPLETION-REPORT.md`

**Next Session:** 3.1 (Event-driven ledger Phase 2.1)

---

## PHASE 3: EVENT-DRIVEN LEDGER INTEGRATION

**Reference:** `docs/EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md`

### Session 3.1: Adjustments Service Migration

**Session ID:** LEDGER-ADJ-001
**Priority:** HIGH
**Duration:** 90-120 minutes
**Blocking:** No - enhances audit trail

**Entry Criteria:**
- Batch 1 migrations complete
- inventoryMovementService exists and tested
- Can create test adjustments

**Implementation Steps:**

1. **Review current adjustment.service.ts**
   - Identify all quantity modification points
   - Document current direct update patterns
   - Plan movement-based replacements

2. **Create movement trigger if not exists**
   - File: `supabase/migrations/20260121000000_inventory_movement_triggers.sql`
   - Function: `update_inventory_from_movement()`
     - ON INSERT inventory_movements
     - Calculate new quantity based on movement_kind
     - UPDATE inventory_items.on_hand_qty
   - Trigger: `trg_update_inventory_on_movement AFTER INSERT ON inventory_movements`

3. **Update adjustment.service.ts**
   - Replace direct updates with inventoryMovementService.recordMovement()
   - Add proper error handling
   - Maintain backward compatibility during transition

4. **Add validation helpers**
   - Function: `validateMovement(movement_kind, source_item, dest_item, qty)`
   - Check: Sufficient quantity for CONSUME/TRANSFER
   - Check: Valid item IDs
   - Check: Non-negative quantities

**Files to Create:**
- `supabase/migrations/20260121000000_inventory_movement_triggers.sql`

**Files to Modify:**
- `src/features/inventory/services/adjustment.service.ts`
- `src/services/inventoryMovement.service.ts` (add validation)

**Testing Procedure:**

1. **Test ADJUSTMENT:**
   - Create adjustment via UI
   - Verify movement created in inventory_movements
   - Verify on_hand_qty updated correctly
   - Verify audit trail complete

2. **Test validation:**
   - Attempt negative adjustment beyond available → should fail
   - Attempt adjustment on non-existent item → should fail
   - Verify error messages clear and actionable

3. **Test immutability:**
   - Create movement
   - Attempt to UPDATE → should fail
   - Attempt to DELETE → should fail

**Exit Criteria:**
- All adjustments create movements
- Quantities update automatically
- Validation prevents invalid operations
- Audit trail immutable
- No breaking changes to existing workflows
- All tests pass

**Rollback:**
- Revert code changes
- DROP TRIGGER trg_update_inventory_on_movement
- No data loss (movements are additive)

**Next Session:** 3.2 (Session completions)

---

## SESSION CONTINUATION PROTOCOL

**If a session is interrupted:**

1. **Document progress:**
   - Note current step in session
   - List completed actions
   - Identify any partial changes
   - Note any errors encountered

2. **Save state:**
   - Commit any code changes
   - Export database state if mid-migration
   - Save logs and error messages

3. **Resume procedure:**
   - Read session entry criteria
   - Verify you're at correct starting point
   - Complete remaining steps
   - Execute full testing procedure
   - Verify exit criteria met

4. **Continuity file:**
   - Create: `AI-Build-Sessions/SESSION-STATE.md`
   - Update after each step
   - Include: Session ID, current step, blockers, next action

---

## EMERGENCY PROCEDURES

**Critical Bug Found:**
1. Stop current session
2. Document bug in AI-Build-Sessions/BUGS.md
3. Assess severity (blocker/critical/high/medium/low)
4. If blocker: Execute rollback for current session
5. Fix bug before continuing
6. Re-test from session entry criteria

**Database Corruption:**
1. Immediately set system to read-only
2. Assess extent of corruption
3. Restore from most recent backup
4. Document data loss
5. Replay successful migrations
6. Resume from last stable session

**Rollback Decision Tree:**
- Data loss risk: ROLLBACK
- >50% tests failing: ROLLBACK
- Security vulnerability: ROLLBACK
- Performance degradation >50%: ROLLBACK
- Minor bugs with workaround: CONTINUE with bug tracking

---

## SUCCESS METRICS

**Technical:**
- 100% verification tests passing
- Zero orphaned inventory items
- 100% batch traceability
- Complete audit trail (all changes have movements)
- Zero direct quantity updates in logs
- All constraints enforced

**Operational:**
- <1 minute downtime per session
- <5% error rate during cutover
- All workflows functional
- User training 100% complete
- Documentation accuracy >95%

**Business:**
- Full compliance with seed-to-sale regulations
- Complete traceability for all products
- Manager approval workflows active
- Quarantine enforcement working
- COA validation preventing violations

---

## Document History

- **v1.0** (2026-01-19): Initial comprehensive plan created
- Sessions 1.1 through 2.6 fully documented
- Emergency procedures established
- Continuity protocols defined
