---
title: Conversion View Session Isolation Fix
date: 2026-02-05
category: Bug Fix
severity: High
impact: Data Accuracy & Inventory Tracking
---

# SESSION 2026-02-05: Conversion View Session Isolation Fix

> **Status:** ✅ COMPLETE
> **Priority:** HIGH
> **Impact:** Fixes negative remaining weights and restores visibility of conversion buckets

---

## Problem Statement

### User Report
Users reported that conversion buckets were disappearing from the Conversions screen, and when they did appear, showed negative remaining quantities. This prevented bulk bag creation and caused confusion about available inventory.

### Root Cause Analysis

**Discovery:** The `pending_conversion_sessions` VIEW aggregates sessions by (batch_id + product_name) and LEFT JOINs to `conversion_packages` ONLY by `aggregation_id`. This created critical cross-session contamination:

**Problem Timeline:**
1. Session A completes: 1820g output for Batch 251105-BLM → Bulk Flower Trimmed
2. Session A finalized: Creates packages totaling 1820g
3. Session A removed from view (finalization_status = 'finalized')
4. Session B completes: 500g output for SAME batch + product
5. **BUG:** View shows Session B remaining = -1320g (500 - 1820)
   - Session A's packages are incorrectly subtracted from Session B's output!
   - HAVING clause filters out negative values → Bucket hidden from view

**Root Cause Code:**
```sql
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(...)::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  -- ❌ MISSING: No filter to ensure packages came from THIS session
```

The `aggregation_id` is based on (batch_id + product_name + session_type), so ALL packages for that combination are included, even packages from finalized sessions.

**Impact:**
- ❌ Negative remaining weights/units displayed
- ❌ Conversion buckets hidden by HAVING clause filtering negatives
- ❌ Cannot create bulk bags for new sessions
- ❌ Data integrity issues in inventory tracking
- ❌ Confusion about available quantities
- ❌ Workflow blocked for active production

---

## Solution Implemented

### Architecture: Session-Level Package Filtering

Added a second JOIN condition to ensure packages are ONLY counted if they were created from sessions included in the current branch's WHERE clause:

```sql
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(...)::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[session_table.id])  -- ✅ NEW
  -- ↑ Only count packages from THIS session
```

The `source_session_ids` column tracks which sessions contributed to each package. By filtering on this, we ensure packages created by Session A don't affect Session B.

### Migration Applied

**File:** `fix_pending_conversions_filter_packages_by_session.sql`

Updated all 8 branches of the `pending_conversion_sessions` VIEW:
- ✅ Branch 1: Trim Big Buds (trim_sessions.id)
- ✅ Branch 2: Trim Small Buds (trim_sessions.id)
- ✅ Branch 3: Trim Byproduct (trim_sessions.id)
- ✅ Branch 4a: Packaging 3.5g (packaging_sessions.id)
- ✅ Branch 4b: Packaging 14g (packaging_sessions.id)
- ✅ Branch 4c: Packaging 1lb (packaging_sessions.id)
- ✅ Branch 5: Bucking Flower (bucking_sessions.id)
- ✅ Branch 6: Bucking Smalls (bucking_sessions.id)

Each branch now filters packages by `source_session_ids` to ensure proper session isolation.

### Key Change Pattern

**Before (BROKEN):**
```sql
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
```

**After (FIXED):**
```sql
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ts.id])  -- 🔒 SESSION ISOLATION
```

---

## Verification Results

### Database Query Test

**Query:**
```sql
SELECT
  batch_name,
  product_name,
  session_type,
  output_weight,
  output_units,
  session_count,
  has_partial_packages
FROM pending_conversion_sessions
WHERE batch_name IN ('251105-BLM', '251105-SWF')
ORDER BY batch_name, product_name;
```

**Results After Fix:**
| Batch | Product | Type | Remaining | Status |
|-------|---------|------|-----------|--------|
| 251105-BLM | Bulk Flower (Bucked) | bucking | 1000g | ✅ Positive |
| 251105-BLM | Bulk Smalls (Bucked) | bucking | 190g | ✅ Positive |
| 251105-SWF | Bulk Flower (Bucked) | bucking | 900g | ✅ Positive |
| 251105-SWF | Bulk Smalls (Bucked) | bucking | 450g | ✅ Positive |
| 251105-SWF | Bulk Trim (Trimmed) | trim | 80g | ✅ Positive |

**All remaining quantities are now positive and accurate!**

### Package Isolation Verification

Queried conversion_packages for these batches:
- Found 13 finalized packages with different `source_session_ids`
- Confirmed these packages are NOT being subtracted from new pending sessions
- Session isolation working correctly across all branches

### Frontend Compatibility

Checked `/src/features/inventory/services/conversions.service.ts`:
- ✅ `getPendingConversions()` queries VIEW directly (line 246)
- ✅ No overriding logic that would interfere with session filtering
- ✅ Deprecated `getRemainingQuantity()` won't cause issues (components use VIEW values)
- ✅ All downstream components will automatically benefit from the fix

---

## Expected Behavior After Fix

**Scenario: Sequential Sessions for Same Batch + Product**

1. **Session A completes:** 1820g output
   - Shows in conversions: 1820g remaining ✅

2. **Session A finalized:** Creates 1820g packages
   - Packages linked to Session A via source_session_ids
   - Session A removed from view (finalized status)
   - Packages NOT counted against other sessions ✅

3. **Session B completes:** 500g output
   - Shows in conversions: 500g remaining ✅ CORRECT
   - Session A's packages DON'T affect Session B ✅

4. **Both sessions finalized independently:**
   - Total inventory created: 2320g (1820g + 500g) ✅
   - No cross-contamination ✅
   - Accurate audit trail ✅

---

## Benefits

### Data Integrity
- ✅ Accurate remaining quantities per session
- ✅ No negative weights displayed
- ✅ All conversion buckets visible
- ✅ Proper session isolation in aggregations
- ✅ Reliable bulk bag creation workflow

### Workflow Reliability
- ✅ Multiple sessions for same batch+product work independently
- ✅ Finalized sessions don't block new sessions
- ✅ Partial finalization supported correctly
- ✅ Clear visibility into conversion pipeline

### System Integrity
- ✅ Maintains audit trail with source_session_ids
- ✅ Prevents data corruption from aggregation bugs
- ✅ Consistent architecture across all 8 branches
- ✅ Database-level enforcement of session isolation

---

## Technical Details

### Architecture Pattern

The fix implements **session-level package filtering** using PostgreSQL's JSON containment operator (`@>`):

```sql
cp.source_session_ids @> to_jsonb(ARRAY[session_table.id])
```

This checks if the package's `source_session_ids` array contains the current session's ID, ensuring packages are only counted against the sessions that created them.

### Performance Impact

**Minimal:** The `source_session_ids` column is already indexed for JSON operations. The additional filter adds negligible overhead to the VIEW query.

### Migration Safety

- ✅ Read-only operation (VIEW recreation)
- ✅ No data changes to underlying tables
- ✅ No breaking changes to VIEW schema
- ✅ Existing queries continue to work
- ✅ Zero downtime deployment

---

## Diagnostic Queries for Future Reference

### Check for negative remaining quantities:
```sql
SELECT *
FROM pending_conversion_sessions
WHERE output_weight < 0 OR output_units < 0;
```

### Verify session isolation for specific batch:
```sql
-- Check pending sessions
SELECT
  batch_name,
  product_name,
  output_weight,
  session_ids
FROM pending_conversion_sessions
WHERE batch_name = '251105-BLM';

-- Check associated packages
SELECT
  cp.package_id,
  cp.weight,
  cp.source_session_ids,
  cp.finalization_status
FROM conversion_packages cp
JOIN pending_conversion_sessions pcs
  ON cp.aggregation_id = pcs.aggregation_id
WHERE pcs.batch_name = '251105-BLM';
```

### Verify packages are filtered by session:
```sql
SELECT
  pcs.batch_name,
  pcs.product_name,
  pcs.session_ids,
  cp.package_id,
  cp.source_session_ids,
  (cp.source_session_ids @> to_jsonb(pcs.session_ids)) as is_session_match
FROM pending_conversion_sessions pcs
LEFT JOIN conversion_packages cp
  ON cp.aggregation_id = pcs.aggregation_id
WHERE pcs.batch_name IN ('251105-BLM', '251105-SWF');
```

---

## Files Modified

1. **Database Migration:**
   - `supabase/migrations/[timestamp]_fix_pending_conversions_filter_packages_by_session.sql`
   - Modified: `pending_conversion_sessions` VIEW (all 8 branches)
   - Added: Session-level package filtering using `source_session_ids`

---

## Related Documentation

- **Architecture:** docs/SESSIONS.md (conversion workflow)
- **Inventory:** docs/INVENTORY-TRACKING.md (event-driven system)
- **Previous Fix:** docs/SESSION-2026-01-16-CONVERSION-ARCHITECTURE-SIMPLIFICATION.md

---

## Lessons Learned

### Aggregation Pitfalls
When aggregating data across multiple entities (sessions), be careful about JOIN conditions. Ensure filters properly isolate data to prevent cross-contamination.

### Source Tracking is Critical
The `source_session_ids` field proved invaluable for maintaining proper isolation. Always track data lineage when aggregating across multiple sources.

### VIEW Complexity Management
With 8 branches in a UNION ALL, it's critical to apply fixes consistently across ALL branches. Missing even one branch would create inconsistent behavior.

### Testing Strategy
Real data validation (querying actual batches) was more effective than synthetic tests. Use production scenarios to verify fixes.

---

**Date:** 2026-02-05
**Author:** AI Build Session
**Session ID:** CONVERSION-SESSION-ISOLATION-001
**Migration Applied:** ✅ YES
**Build Verified:** ✅ YES
**Data Validated:** ✅ YES
