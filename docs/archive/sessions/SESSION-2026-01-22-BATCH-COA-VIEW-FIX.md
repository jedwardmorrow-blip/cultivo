# Session: Batch-COA View Relationship Fix

**Date:** 2026-01-22
**Session Type:** Bug Fix - UI Display
**Status:** ✅ Complete
**Duration:** ~30 minutes

---

## Objective

Fix the "NO COA" display issue where batch 251105-SWF (Swamp Water Fumez) showed "NO COA" in the UI despite having a valid, active COA successfully uploaded to the database.

---

## Problem Identification

### User Report
- User uploaded COA for batch 251105-SWF successfully
- UI batch list still showed "NO COA" badge
- User concerned packaging would be blocked by validation

### Root Cause Analysis

**Database Evidence:**
```sql
-- COA exists and is active
SELECT id, batch_id, is_active, thc_percentage
FROM certificates_of_analysis
WHERE batch_id = 'a6364427-8fb3-4db8-ba6d-3746510a45e3';

Result: {
  id: "e207644d-fd5a-41c8-94a9-fafa4f08188f",
  batch_id: "a6364427-8fb3-4db8-ba6d-3746510a45e3",
  is_active: true,
  thc_percentage: 25.38
}

-- But batch.coa_id was NULL
SELECT batch_number, coa_id
FROM batch_registry
WHERE batch_number = '251105-SWF';

Result: { batch_number: "251105-SWF", coa_id: null }

-- View showed missing
SELECT batch_number, coa_status
FROM batch_with_coa_status
WHERE batch_number = '251105-SWF';

Result: { batch_number: "251105-SWF", coa_status: "missing" }
```

**The Disconnect:**
- `certificates_of_analysis.batch_id → batch_registry.id` (forward reference) ✅ Populated correctly
- `batch_registry.coa_id → certificates_of_analysis.id` (backward reference) ❌ NULL
- View used: `LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id`
- Since `br.coa_id` was NULL, join failed, view returned `coa_status = 'missing'`

**Why COA Upload Didn't Set coa_id:**
- `createCOA()` service function only sets `certificates_of_analysis.batch_id`
- `replaceCOA()` service function only sets `certificates_of_analysis.batch_id`
- Neither function updates `batch_registry.coa_id` backward reference
- This is expected behavior - `batch_id` FK is the canonical relationship per GAP-009

**Why Packaging Still Worked:**
- Packaging validation queries directly:
  ```typescript
  .from('certificates_of_analysis')
  .eq('batch_id', formData.batch_id)
  .eq('is_active', true)
  ```
- This bypasses the broken view entirely
- Uses correct relationship direction (batch_id FK)
- See: `PackagingSessionStartForm.tsx` lines 54-59

**Scope Assessment:**
- Checked all 51 active batches
- 12 batches with COAs: All had correct `batch_registry.coa_id` (uploaded before constraint)
- 1 batch (251105-SWF): Missing `coa_id` (uploaded after constraint implementation)
- 38 batches: Legitimately have no COAs

---

## Solution Implementation

### Design Decision: Fix the View (Not Service Layer)

**Why This Approach:**
1. **Canonical Relationship:** `certificates_of_analysis.batch_id` is enforced by GAP-009 unique constraint
2. **Packaging Uses It:** Validation already queries on `batch_id`, not `coa_id`
3. **Service Layer Correct:** `createCOA()` and `replaceCOA()` set the right FK
4. **View Was Wrong:** View should match the canonical relationship direction
5. **Minimal Impact:** Only 1 batch affected, easy backfill

**Alternative Considered (Rejected):**
- Update service layer to also set `batch_registry.coa_id`
- Rejected because:
  - Maintains redundant bi-directional sync
  - Service layer becomes more complex
  - View logic remains incorrect
  - Future maintenance burden

### Migration Implementation

**File:** `supabase/migrations/20260122000000_fix_batch_coa_view_join.sql`

**Changes:**

1. **Updated View Join Logic**
   ```sql
   -- BEFORE (incorrect)
   LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id

   -- AFTER (correct)
   LEFT JOIN certificates_of_analysis coa
     ON coa.batch_id = br.id
     AND coa.is_active = true
   ```

2. **Data Backfill**
   ```sql
   UPDATE batch_registry br
   SET coa_id = coa.id
   FROM certificates_of_analysis coa
   WHERE coa.batch_id = br.id
     AND coa.is_active = true
     AND br.coa_id IS NULL;
   ```
   - Syncs backward reference for existing data
   - Ensures compatibility with any legacy code using `coa_id`
   - Only updates NULL values (doesn't overwrite existing links)

---

## Verification Results

### Batch 251105-SWF Fixed
```sql
SELECT batch_number, coa_status, coa_id, thc_percentage
FROM batch_with_coa_status
WHERE batch_number = '251105-SWF';

BEFORE: { coa_status: "missing", coa_id: null }
AFTER:  { coa_status: "active", coa_id: "e207644d-...", thc_percentage: 25.38 }
```

### All Batches Still Correct
- Verified all 13 batches with COAs: All show `coa_status = 'active'` ✅
- No existing batches broken by change ✅

### Backfill Successful
```sql
SELECT batch_number, batch_coa_id, actual_coa_id, sync_status
FROM (
  SELECT br.batch_number, br.coa_id as batch_coa_id, coa.id as actual_coa_id
  FROM batch_registry br
  INNER JOIN certificates_of_analysis coa ON coa.batch_id = br.id
  WHERE br.batch_number = '251105-SWF'
) sub;

Result: { sync_status: "SYNCED" } ✅
```

---

## Technical Details

### Canonical Relationship Direction

**Primary FK (Enforced by GAP-009):**
```
certificates_of_analysis.batch_id → batch_registry.id
- Unique constraint ensures one active COA per batch
- This is the "source of truth"
```

**Secondary FK (Backward Compatibility):**
```
batch_registry.coa_id → certificates_of_analysis.id
- Optional reference for legacy code
- Now synced by backfill for existing data
- Future uploads: May or may not populate (view doesn't need it)
```

### Why GAP-009 Uses batch_id as Canonical

From `20251107000006_add_critical_high_constraints.sql`:
```sql
CREATE UNIQUE INDEX certificates_of_analysis_unique_active_per_batch
    ON certificates_of_analysis (batch_id)
    WHERE is_active = true;
```

This constraint prevents multiple active COAs per batch by using `batch_id` as the unique key. The constraint validates that:
- Each batch can have only ONE active COA at a time
- The `batch_id` FK is the canonical relationship
- Views and queries should join on `batch_id`, not `coa_id`

---

## Impact Assessment

**Severity:** LOW (UI display only)
- ✅ Packaging validation: Not affected (uses correct query)
- ✅ COA uploads: Working correctly
- ✅ Compliance: No issues
- ✅ Data integrity: Maintained

**User Experience:**
- Before: Confusing "NO COA" despite successful upload
- After: Correct "COA Active" badge displays
- User confidence restored

**Technical Debt:**
- Eliminated: View/query inconsistency
- Clarified: Canonical relationship direction
- Aligned: View with GAP-009 constraint architecture

---

## Related Documentation

**Sessions:**
- [SESSION-2026-01-22-COA-REPLACE-WORKFLOW.md](./SESSION-2026-01-22-COA-REPLACE-WORKFLOW.md) - GAP-009 constraint implementation
- [SESSION-2026-01-22-COA-STORAGE-NETWORK-FIX.md](./SESSION-2026-01-22-COA-STORAGE-NETWORK-FIX.md) - Upload diagnostics

**Documentation:**
- [COA-HANDLING.md](./COA-HANDLING.md) - COA workflow and architecture
- [BATCHES.md](./BATCHES.md) - Batch management system

**Constraints:**
- GAP-009: Single active COA per batch (implemented, working)
- GAP-007: COA validation before packaging (UI implemented, trigger planned)

---

## Key Learnings

1. **Views Should Match Constraints:** Database views should use the same relationship direction as enforced constraints
2. **Canonical vs Legacy:** Distinguish between canonical FKs and backward-compatibility references
3. **Validation Bypassed View:** Packaging worked because it queried directly on correct FK
4. **UI Display vs Function:** A UI display bug doesn't always indicate functional issues
5. **Small Scope, Big Impact:** One NULL field caused user confusion despite system working correctly

---

## Changelog Entry

**Added:**
- Migration `20260122000000_fix_batch_coa_view_join.sql`
  - Updated `batch_with_coa_status` view to join on `coa.batch_id` (canonical FK)
  - Backfilled `batch_registry.coa_id` for existing batches with active COAs

**Fixed:**
- Batch list now correctly displays "COA Active" for batches with uploaded COAs
- View join logic now matches packaging validation query logic
- `batch_registry.coa_id` backward reference synced for all existing batches

**Technical:**
- View now respects GAP-009 constraint architecture
- Canonical relationship: `certificates_of_analysis.batch_id → batch_registry.id`
- Legacy field `batch_registry.coa_id` maintained for backward compatibility
