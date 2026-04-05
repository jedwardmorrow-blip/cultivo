# CUL-383 Pre-Execution Validation Checklist

**Date**: 2026-04-05
**Target**: Execute within 1 hour of DBA schema confirmation
**QA Engineer**: Agent 95a542ae-9425-42c3-82be-c6ba5a796551

---

## DBA Response Verification Gate

Upon DBA response to [CUL-383](/CUL/issues/CUL-383), validate the following before proceeding to functional test execution:

### Required Confirmations

- [ ] **Migration Application Status**: DBA confirmed CUL-383 and CUL-384 migrations applied to staging (cbxwippkzeszvxewhebd)
- [ ] **Schema Source Alignment**: Actual staging schema matches `supabase/migrations/` source files
- [ ] **variance_status Column**: Clarified location (`inventory_audit_lines` vs `inventory_audit_line_items`)
- [ ] **Stage Locking Implementation**: Clarified mechanism (`stage_locks` table vs `inventory_audits.is_locked` column)
- [ ] **Production Alignment**: Confirmed staging schema matches production (fonreynkfeqywshijqpi)

### If Schema Differs from Validation Report

- [ ] Update [CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md](/docs/CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md) to reflect actual schema before test execution
- [ ] Adjust variance_status queries in test cases (Step 1.4, Step 2) to correct table location
- [ ] Adjust stage locking test logic (Test Case 4) to match actual implementation

---

## Environment Pre-Flight

### Staging Database Readiness

- [ ] Verify staging database connectivity (`cbxwippkzeszvxewhebd`)
- [ ] Confirm no active audits in progress:
  ```sql
  SELECT COUNT(*) FROM inventory_audits
  WHERE status IN ('initiated', 'in_progress');
  -- Expected: 0
  ```
- [ ] Verify Packaged stage inventory baseline (28 packages, 1,088g):
  ```sql
  SELECT COUNT(*) as package_count, SUM(on_hand_qty) as total_qty
  FROM inventory_items
  WHERE stage = 'Packaged';
  -- Expected: 28 packages, 1,088g
  ```
- [ ] Confirm no prior audit records in clean baseline:
  ```sql
  SELECT COUNT(*) FROM inventory_audits;
  -- Expected: 0
  ```

### API/RPC Readiness

- [ ] Verify audit service API endpoints are accessible from QA environment
- [ ] Test fn_apply_audit_adjustments() RPC with dry-run (if supported)
- [ ] Confirm inventory_movements table is writable
- [ ] Test audit_number sequence generation (AUD-YYYYMMDD-NNN format)

---

## Test Case Execution Order

Execute in this sequence to minimize dependencies and detect issues early:

### Phase 1: Foundational Tests (Parallel, no dependencies)

1. **Test Case 3: Package Discovery** (0-5 minutes)
   - Lowest risk (doesn't depend on variance_status or stage_locks)
   - Tests new inventory item creation during audit
   - Confirms basic audit initiation and completion workflow
   - Result: PASS/FAIL indicator for core audit engine

2. **Test Case 1: Basic Audit Lifecycle** (5-15 minutes, depends on variance_status)
   - Depends on: Schema clarification (variance_status location)
   - Tests tolerance variance classification (±1-2g)
   - Tests audit state transitions (initiated → completed)
   - Tests inventory_movements creation
   - Result: PASS/FAIL indicator for variance handling

### Phase 2: Advanced Tests (After Phase 1 PASS)

3. **Test Case 2: Large Variance (Flagged)** (15-20 minutes)
   - Depends on: Test Case 1 PASS + variance_status table confirmed
   - Tests ≥5g threshold detection and flagged status
   - Tests flagged audit completion (should not block)
   - Tests variance_log creation for compliance
   - Result: PASS/FAIL indicator for high-variance edge cases

4. **Test Case 4: Stage Locking** (20-25 minutes)
   - Depends on: Schema clarification (stage_locks implementation)
   - Tests concurrent audit prevention
   - Tests stage unlock on completion
   - Tests sequential audit_number generation
   - Result: PASS/FAIL indicator for concurrency control

### Phase 3: Boundary & Performance Tests (After all Phase 1-2 PASS)

5. **Boundary Validation** (25-30 minutes)
   - 0g variance (no variance)
   - 0.49g variance (just under tolerance)
   - 0.5g variance (at tolerance boundary)
   - 4.99g variance (just under flagged threshold)
   - 5g variance (at flagged threshold)
   - Result: Verify threshold classification is accurate

6. **Performance Check** (30-35 minutes)
   - Initiate audit with 1000+ packages
   - Measure completion time
   - Expected: <5 seconds
   - Result: Performance baseline established

---

## Test Case Execution Checklist

### Test Case 1: Basic Audit Lifecycle

**Pre-Execution**:
- [ ] Confirmed Packaged stage has 28 packages, 1,088g
- [ ] No active audits in inventory_audits
- [ ] variance_status column location confirmed

**Execution** (see [CUL-383-FUNCTIONAL-TEST-EXECUTION.md](/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md) Step 1.1–1.6):
- [ ] Step 1.1: Audit initiated, audit_number generated (AUD-YYYYMMDD-001)
- [ ] Step 1.2: 28 audit lines created (one per package)
- [ ] Step 1.3: Updated 5 sample lines with variance
- [ ] Step 1.4: variance_status classification verified
  - Lines 1-3: variance_status = 'within_scale_tolerance' (no variance)
  - Lines 4-5: variance_status = 'within_scale_tolerance' (±1-2g)
- [ ] Step 1.5: Audit completed, fn_apply_audit_adjustments() executed
- [ ] Step 1.6: inventory_movements created (2 records, reason_code='audit_reconciliation')

**Post-Execution Validation**:
- [ ] Query inventory_audit_lines: all 28 lines confirmed
- [ ] Query inventory_movements: exactly 2 movements (one per variance)
- [ ] Verify on_hand_qty updated correctly for affected items
- [ ] **Result**: PASS ✅ / FAIL ❌

---

### Test Case 2: Large Variance (Flagged)

**Pre-Execution**:
- [ ] Test Case 1 PASS
- [ ] Identified one package with ≥100g expected_qty
- [ ] stage_locks unlocked from Test Case 1 completion

**Execution** (see [CUL-383-FUNCTIONAL-TEST-EXECUTION.md](/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md) Test Case 2):
- [ ] Initiated new audit on Packaged stage (AUD-YYYYMMDD-002)
- [ ] Selected package with expected_qty ≥100g
- [ ] Updated with large variance (e.g., 100g expected, 50g actual)
- [ ] Verified variance_status = 'flagged'
- [ ] Completed audit (flagged should not block completion)

**Post-Execution Validation**:
- [ ] Query inventory_audit_lines: variance_status = 'flagged'
- [ ] Query variance_log: compliance record created
- [ ] Audit status = 'completed' (flagged did not prevent completion)
- [ ] **Result**: PASS ✅ / FAIL ❌

---

### Test Case 3: Package Discovery

**Pre-Execution**:
- [ ] Confirmed Binned stage accessible (305 packages baseline)
- [ ] No active audits on Binned stage

**Execution** (see [CUL-383-FUNCTIONAL-TEST-EXECUTION.md](/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md) Test Case 3):
- [ ] Initiated audit on Binned stage (AUD-YYYYMMDD-003 or first audit)
- [ ] Called addPackageToAudit() with new test SKU
- [ ] Verified new inventory_item created with correct category
- [ ] Verified audit line created (expected_qty=0, actual_qty=500, confirmed=true)
- [ ] Completed audit
- [ ] Verified on_hand_qty = 500 for new item

**Post-Execution Validation**:
- [ ] Query inventory_items: new item exists with on_hand_qty=500
- [ ] Query inventory_audit_lines: new package in completed audit
- [ ] **Result**: PASS ✅ / FAIL ❌

---

### Test Case 4: Stage Locking

**Pre-Execution**:
- [ ] Confirmed Trimmed stage accessible (142 packages baseline)
- [ ] stage_locks implementation clarified by DBA
- [ ] No active audits on Trimmed stage

**Execution** (see [CUL-383-FUNCTIONAL-TEST-EXECUTION.md](/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md) Test Case 4):
- [ ] Initiated audit on Trimmed stage (AUD-YYYYMMDD-004 or first audit)
- [ ] Verified audit_number generated
- [ ] Verified stage locked (implementation-specific check)
- [ ] Attempted second audit on same stage
  - Expected: Error "Cannot start audit: stages are locked by AUD-YYYYMMDD-NNN"
  - Actual: ___________
- [ ] Completed first audit
- [ ] Verified stage unlocked
- [ ] Initiated second audit on Trimmed stage
  - Expected: Success (stage now unlocked)
  - Actual: ___________

**Post-Execution Validation**:
- [ ] Query inventory_audits: two sequential audits on Trimmed stage
- [ ] Query stage_locks or audit.is_locked: state transitions verified
- [ ] audit_number sequence: incremented correctly (NNN component)
- [ ] **Result**: PASS ✅ / FAIL ❌

---

## Boundary Test Cases (Conditional, after Phase 1-2 PASS)

### Variance Threshold Boundaries

Execute if Test Cases 1-2 PASS. Create small test stage with 5 packages:

| Package | Expected | Actual | Variance | Expected Status | Actual Status |
|---------|----------|--------|----------|-----------------|---------------|
| A | 10g | 10g | 0g | within_tolerance | ___ |
| B | 10g | 10.49g | +0.49g | within_tolerance | ___ |
| C | 10g | 9.5g | -0.5g | within_tolerance | ___ |
| D | 10g | 5.01g | -4.99g | within_tolerance | ___ |
| E | 10g | 5g | -5g | **flagged** | ___ |

**Verification**: All boundaries correctly classified per thresholds (0-0.5g tolerance, 5g flag threshold)

---

## Performance Test (Conditional, after all functional tests PASS)

### Test: Audit with 1000+ Packages

- [ ] Create or identify stage/warehouse with 1000+ items
- [ ] Initiate audit
- [ ] Record start_time and completion_time
- [ ] Measure: `completion_time - start_time`
- [ ] Expected: <5 seconds
- [ ] Actual: ___________

---

## Failure Handling

If any test case FAILS:

1. **Document the failure**:
   - Test case ID and step that failed
   - Expected vs. actual behavior
   - SQL queries and results that show the issue
   - Error messages or stack traces (if API-based)

2. **File bug(s)**:
   - Create subtask(s) on CUL-383 per component (Builder, DBA)
   - Tag with `[CUL-383-BUG]` for traceability

3. **Re-test after fix**:
   - Do NOT re-execute passing test cases
   - Execute only the failed case + any dependent cases

4. **Escalate if blocked**:
   - If blocker is architectural (e.g., schema design conflict), escalate to CTO
   - If blocker is data-related, escalate to DBA

---

## Deployment Readiness Criteria

All of the following must be true to proceed to production deployment:

- [ ] **Test Case 1**: PASS (basic lifecycle)
- [ ] **Test Case 2**: PASS (large variance flagged)
- [ ] **Test Case 3**: PASS (package discovery)
- [ ] **Test Case 4**: PASS (stage locking)
- [ ] **Boundary Tests**: PASS (variance threshold classification)
- [ ] **Performance Check**: <5 seconds for 1000+ packages
- [ ] **Audit Trail**: inventory_movements accurate and complete
- [ ] **Double-Count Prevention**: No duplicate movements per line update
- [ ] **No Critical Bugs**: All failures resolved or documented as known limitations
- [ ] **Production Schema**: Confirmed alignment with staging

**If ALL criteria met**: Ready for production deployment
**If ANY criterion NOT met**: Cannot deploy; document blockers and re-evaluate

---

## Summary

This checklist provides a structured path from DBA confirmation → functional test execution → deployment readiness assessment.

**Next Action**: Upon DBA response on CUL-383, validate this checklist's gate criteria, then execute test cases in the specified order.

**Estimated Total Time**: 35-40 minutes for all test cases + boundary validation

**Target Completion**: 2026-04-05 (upon DBA confirmation, which should arrive by EOD today)
