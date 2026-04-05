# CUL-383 Schema Mismatch Escalation — DBA Investigation Required

**Date**: 2026-04-04
**Reporter**: QA Engineer (Agent 95a542ae-9425-42c3-82be-c6ba5a796551)
**Status**: 🔴 CRITICAL BLOCKER
**Related Issue**: [CUL-383](/CUL/issues/CUL-383)
**Validation Report**: [CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md](/docs/CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md)

---

## Problem Statement

During QA functional test preparation for CUL-383 (Inventory Audit System), a critical schema mismatch was discovered between:
- **Expected**: Code review validation document assumptions
- **Actual**: Running Staging database schema (cbxwippkzeszvxewhebd)

This mismatch prevents functional test execution from proceeding.

---

## Schema Inventory (Staging Database Query Results)

### Tables Found
✅ `inventory_audits` — exists, schema confirmed
✅ `inventory_audit_lines` — exists, **but schema incomplete**
✅ `inventory_audit_line_items` — exists, **contains variance_status column**
✅ `inventory_audit_notifications` — exists
✅ `inventory_audit_periods` — exists
✅ `inventory_audit_status` — exists
❌ `stage_locks` — **NOT FOUND** (critical)

### Column Audit

**inventory_audit_lines schema** (actual):
```
id, audit_id, inventory_item_id, package_id, product_name, strain, batch, room, stage,
expected_qty, unit, actual_qty, variance_qty, variance_percentage,
variance_reason (enum), variance_notes, confirmed, confirmed_at, line_order,
created_at, updated_at
```
**⚠️ NOTE**: `variance_status` column **NOT PRESENT** in this table

**inventory_audit_line_items schema** (actual):
```
id, audit_id, batch_id, product_name, expected_qty, actual_qty, variance_g,
variance_status (enum — CRITICAL COLUMN), explanation, corrective_action,
criminal_activity_flag, resolved_by, resolved_at, created_at, updated_at
```
**⚠️ NOTE**: `variance_status` is here, not in `inventory_audit_lines`

---

## Discrepancies

### 1. variance_status Column Location Mismatch
- **Validation Report Expected**: `inventory_audit_lines.variance_status` with trigger `fn_set_audit_variance_status()`
- **Staging Actual**: `inventory_audit_line_items.variance_status` (enum, same values)
- **Impact**: Variance threshold classification (0-0.5g, 0.5-5g, ≥5g) behavior location unknown
- **Blocking**: Test Case 1 (variance threshold verification) cannot execute

### 2. Stage Locking Mechanism Missing
- **Validation Report Expected**: `stage_locks` table (implicit concurrent audit prevention)
- **Staging Actual**: `stage_locks` table **does not exist**
- **Schema Alternative**: `inventory_audits.is_locked` boolean column exists (may be the mechanism)
- **Impact**: Cannot test concurrent audit prevention (Test Case 4)
- **Blocking**: Test Case 4 (stage locking) cannot execute

### 3. audit.is_locked vs stage_locks Table
- **inventory_audits.is_locked column**: Exists, boolean, nullable
- **Question**: Is this the stage locking mechanism, or is a separate stage_locks table required?
- **Impact**: If using audit.is_locked, Test Case 4 needs architectural clarification

---

## Root Cause Analysis

Possible causes:
1. **Migration not applied**: CUL-384 migration (20260403_cul384_inventory_audit_line_items.sql) not run on staging
2. **Different migration version**: Staging deployed with incompatible migration version vs production
3. **Schema refactor**: Database architecture changed since validation review (audit_lines → audit_line_items split)
4. **Environment divergence**: Staging schema drifted from production or migration source

---

## Questions for DBA

### Immediate (Required Before Testing)
1. **Migration Status**: Were ALL CUL-383 and CUL-384 migrations successfully applied to staging (cbxwippkzeszvxewhebd)?
2. **Schema Source of Truth**: Do the actual staging schemas match source files in `supabase/migrations/`?
3. **variance_status Location**: Is the variance_status trigger supposed to target `inventory_audit_lines` or `inventory_audit_line_items`?
4. **Stage Locking Design**: Is stage locking implemented via:
   - Separate `stage_locks` table, OR
   - `inventory_audits.is_locked` column, OR
   - Something else entirely?

### Follow-up (If Schema Differs from Validation)
5. **Documentation**: Which is the source of truth — validation report or actual schema?
6. **Production Alignment**: Is production (fonreynkfeqywshijqpi) using the same schema as staging?
7. **Validation Update**: Should validation report be updated to reflect actual schema?

---

## Test Execution Impact

### BLOCKED Until Schema Clarified
- **Test Case 1**: Variance threshold classification (variance_status behavior)
- **Test Case 4**: Concurrent audit prevention (stage locking mechanism)

### At Risk Until Schema Clarified
- **Test Case 2**: Large variance flagged classification (depends on variance_status trigger)
- **Test Case 3**: Package discovery (depends on schema finalization)

---

## Next Steps

1. **DBA Investigation** (by 2026-04-05):
   - Verify migration application status on staging
   - Confirm actual schema matches migration source files
   - Clarify variance_status and stage_locking implementations
   - Confirm production schema alignment

2. **QA Resumption** (upon DBA confirmation):
   - Execute Test Cases 1-4 with verified baseline
   - If schema differs, update validation report first
   - Complete functional test execution
   - Prepare deployment readiness report

3. **Escalation** (if unresolved by 2026-04-06):
   - Escalate to CTO (architecture decision needed)
   - Risk: CUL-383 deployment blocked until schema resolved

---

## Attachments

- Test Execution Plan: `/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md` (blocked, blocker section added)
- Validation Report: `/docs/CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md` (references expected schema)
- Pre-test Assessment: Inventory baseline (Packaged stage: 28 packages, 1,088g, 15 strains — ready for audit)

---

## Links

- Issue: [CUL-383](/CUL/issues/CUL-383)
- Validation Report: [CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md](/docs/CUL-383-INVENTORY-AUDIT-VALIDATION-REPORT.md)
- Test Plan: [CUL-383-FUNCTIONAL-TEST-EXECUTION.md](/docs/CUL-383-FUNCTIONAL-TEST-EXECUTION.md)
