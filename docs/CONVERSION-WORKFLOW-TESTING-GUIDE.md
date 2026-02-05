# Conversion Workflow Testing Guide

**Date**: February 5, 2026
**Purpose**: Systematic manual testing of the conversion finalization workflow
**Status**: Ready for Testing

---

## Testing Overview

This guide provides step-by-step instructions to test the conversion workflow from session completion through inventory finalization. The system is already implemented and running.

### Current System State

**Pending Conversions Found**: 6 items
- 1 Bucking session (Swamp Water Fumez - 1500g flower)
- 1 Trim session (Swamp Water Fumez - 80g trim)
- 3 Bucking sessions (Silver Marker, Animal Tsunami)
- 1 Packaging session (White Devil - 28 units of 14g)

**Finalized Conversions**: Multiple examples with inventory created

---

## Test Plan Structure

### Phase 1: View Pending Conversions
Test the conversions dashboard and verify data display

### Phase 2: Finalize a Conversion
Execute the finalization workflow and verify inventory creation

### Phase 3: Verify Inventory Integration
Confirm inventory records are correct and queryable

### Phase 4: Test Edge Cases
Validate partial finalization and multi-session aggregation

---

## Phase 1: View Pending Conversions (Manual UI Testing)

### Test 1.1: Navigate to Conversions View

**Steps**:
1. Log into the application
2. Navigate to **Inventory → Conversions** (or wherever the conversions UI is located)
3. Locate the "Pending Conversions" section

**Expected Results**:
- Should see a table/list of pending conversions
- Should see at least 6 pending items based on current database state
- Each item should display:
  - Batch name/number
  - Strain name
  - Product name
  - Session type (trim/bucking/packaging)
  - Output quantity (weight or units)
  - Session count

**Verification Query** (Run if needed):
```sql
SELECT
  batch_name,
  strain_name,
  session_type,
  product_name,
  output_weight,
  output_units,
  session_count,
  finalization_status
FROM pending_conversion_sessions
ORDER BY last_completed_at DESC;
```

### Test 1.2: Verify Data Accuracy

**Steps**:
1. Locate the "251105-SWF" batch entry for "Bulk Flower (Bucked)"
2. Verify the displayed quantity matches 1500g
3. Check that it shows 1 session aggregated

**Expected Results**:
- Batch: 251105-SWF
- Strain: Swamp Water Fumez
- Product: Bulk Flower (Bucked)
- Weight: 1500g
- Session Count: 1
- Status: Pending

**Verification Query**:
```sql
SELECT * FROM pending_conversion_sessions
WHERE batch_name = '251105-SWF'
  AND product_name = 'Bulk Flower (Bucked)';
```

### Test 1.3: Check Has Partial Packages Flag

**Steps**:
1. Look for the "251105-SWF" batch entry for "Bulk Flower (Bucked)"
2. Check if there's an indicator showing partial finalization

**Expected Results**:
- Should show `has_partial_packages = true` (1300g already finalized)
- Remaining weight should be 1500g available for new finalization

**Verification Query**:
```sql
SELECT
  product_name,
  output_weight,
  has_partial_packages,
  session_count
FROM pending_conversion_sessions
WHERE batch_name = '251105-SWF'
  AND session_type = 'bucking';
```

---

## Phase 2: Finalize a Conversion (Manual UI Testing)

### Test 2.1: Initiate Finalization

**Steps**:
1. Navigate to the pending conversions view
2. Select the "251105-SSM" batch, "Bulk Flower (Bucked)" entry (1150g)
3. Click "Finalize" or equivalent button
4. If prompted, enter finalization quantity: **500g** (partial finalization)
5. Confirm the action

**Expected Results**:
- Should see a confirmation dialog or form
- Should accept partial quantity (500g out of 1150g)
- Should show success message
- Remaining weight should update to 650g

**Verification Query** (Run after finalization):
```sql
-- Check if conversion package was created
SELECT
  package_id,
  batch_id,
  product_name,
  weight,
  finalization_status,
  created_at
FROM conversion_packages
WHERE batch_id = (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM')
  AND weight = 500
ORDER BY created_at DESC
LIMIT 1;

-- Check if inventory was created
SELECT
  package_id,
  product_name,
  on_hand_qty,
  available_qty,
  reserved_qty,
  unit,
  category,
  status
FROM inventory_items
WHERE batch_id = (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM')
  AND product_name = 'Bulk Flower (Bucked)'
ORDER BY created_at DESC
LIMIT 1;
```

### Test 2.2: Verify Inventory Creation

**Steps**:
1. After finalization, navigate to **Inventory → All Inventory** or **Inventory → Bulk**
2. Search for the newly created package (should start with today's date: `2602XX-SSM-XXX`)
3. Verify the inventory record details

**Expected Results**:
- Package ID format: `YYMMDD-STRAIN-###` (e.g., `260205-SSM-001`)
- Product Name: "Bulk Flower (Bucked)"
- Quantity: 500g
- Unit: "g" (grams)
- Status: "Available"
- Category: "bulk"
- ATP Constraint: `available_qty = on_hand_qty - reserved_qty` (should be 500 = 500 - 0)

**Verification Query**:
```sql
SELECT
  ii.package_id,
  ii.product_name,
  ii.on_hand_qty,
  ii.available_qty,
  ii.reserved_qty,
  ii.unit,
  ii.category,
  ii.status,
  ii.created_at,
  -- Verify ATP constraint
  (ii.on_hand_qty - ii.reserved_qty) AS calculated_atp,
  CASE
    WHEN ii.available_qty = (ii.on_hand_qty - ii.reserved_qty)
    THEN 'PASS'
    ELSE 'FAIL'
  END AS atp_check
FROM inventory_items ii
WHERE ii.batch_id = (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM')
  AND ii.product_name = 'Bulk Flower (Bucked)'
ORDER BY ii.created_at DESC
LIMIT 1;
```

### Test 2.3: Verify Movement Record

**Steps**:
1. Navigate to the inventory item detail page
2. Look for the "Movement History" or "Audit Trail" section
3. Verify a movement record was created

**Expected Results**:
- Movement Kind: "PRODUCE"
- Quantity: 500g
- Reason: "session_finalization"
- Reference Type: "bucking_session"
- Notes should mention batch and session details

**Verification Query**:
```sql
SELECT
  im.movement_kind,
  im.qty,
  im.unit,
  im.reason_code,
  im.reference_type,
  im.notes,
  im.created_at,
  ii.package_id
FROM inventory_movements im
JOIN inventory_items ii ON im.dest_item_id = ii.id
WHERE ii.batch_id = (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM')
  AND im.reason_code = 'session_finalization'
ORDER BY im.created_at DESC
LIMIT 1;
```

### Test 2.4: Verify Remaining Quantity Updates

**Steps**:
1. Return to the pending conversions view
2. Locate the "251105-SSM" batch, "Bulk Flower (Bucked)" entry
3. Verify the displayed quantity has decreased

**Expected Results**:
- Output weight should now show: **650g** (1150g - 500g)
- Session count should remain: **1**
- Status should still be: **Pending**
- `has_partial_packages` should now be: **true**

**Verification Query**:
```sql
SELECT
  batch_name,
  product_name,
  output_weight,
  session_count,
  finalization_status,
  has_partial_packages
FROM pending_conversion_sessions
WHERE batch_name = '251105-SSM'
  AND product_name = 'Bulk Flower (Bucked)';
```

---

## Phase 3: Full Finalization Test

### Test 3.1: Finalize Remaining Quantity

**Steps**:
1. In pending conversions view, select "251105-SSM" / "Bulk Flower (Bucked)" (650g remaining)
2. Click "Finalize" and enter the full remaining amount: **650g**
3. Confirm

**Expected Results**:
- Success message displayed
- Entry should disappear from pending conversions view
- New inventory package created
- Session finalization status updated to "finalized"

**Verification Query**:
```sql
-- Should return 0 rows (fully finalized)
SELECT * FROM pending_conversion_sessions
WHERE batch_name = '251105-SSM'
  AND product_name = 'Bulk Flower (Bucked)';

-- Should show finalization status as 'finalized'
SELECT
  id,
  batch_registry_id,
  bucked_flower_grams,
  finalization_status_bucked,
  finalized_at_bucked,
  finalized_by_bucked
FROM bucking_sessions
WHERE batch_registry_id = (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM')
  AND session_status = 'completed';
```

---

## Phase 4: Packaging Session Finalization

### Test 4.1: Finalize Packaging Session (Unit-Based)

**Steps**:
1. Navigate to pending conversions
2. Locate "250403HG" batch, "Packaged - White Devil - 14g Flower" (28 units)
3. Click "Finalize"
4. If prompted, enter quantity: **10 units** (partial)
5. Confirm

**Expected Results**:
- Success message
- New inventory package created with category = "packaged"
- Unit type = "unit" (not grams)
- Remaining units: 18

**Verification Query**:
```sql
-- Check inventory creation
SELECT
  package_id,
  product_name,
  on_hand_qty,
  unit,
  category,
  status,
  available_qty,
  reserved_qty
FROM inventory_items
WHERE batch_id = (SELECT id FROM batch_registry WHERE batch_number = '250403HG')
  AND product_name LIKE '%14g%'
  AND category = 'packaged'
ORDER BY created_at DESC
LIMIT 1;

-- Check remaining pending units
SELECT
  product_name,
  output_units,
  session_count,
  has_partial_packages
FROM pending_conversion_sessions
WHERE batch_name = '250403HG'
  AND product_name LIKE '%14g%';
```

---

## Phase 5: Edge Case Testing

### Test 5.1: Multi-Session Aggregation

**Steps**:
1. Complete 2 trim sessions for the same batch/strain/product
2. Navigate to pending conversions
3. Verify they appear as a single aggregated entry

**Expected Results**:
- Single row showing combined weight
- Session count shows "2"
- `session_ids` array contains both session IDs

**Verification Query**:
```sql
-- Find multi-session conversions
SELECT
  batch_name,
  product_name,
  output_weight,
  session_count,
  session_ids,
  array_length(session_ids, 1) AS session_array_length
FROM pending_conversion_sessions
WHERE session_count > 1
ORDER BY session_count DESC;
```

### Test 5.2: Zero Quantity Validation

**Steps**:
1. Attempt to finalize a conversion with quantity = 0
2. Submit the form

**Expected Results**:
- Should show validation error
- Should prevent submission
- Message: "Quantity must be greater than zero"

### Test 5.3: Over-Finalization Prevention

**Steps**:
1. Attempt to finalize more than the available quantity
2. Example: If 650g remaining, try to finalize 700g

**Expected Results**:
- Should show validation error
- Should prevent submission
- Message: "Cannot exceed available quantity of 650g"

### Test 5.4: Concurrent Finalization Handling

**Steps**:
1. Open the pending conversions view in two browser tabs
2. In both tabs, select the same conversion
3. In Tab 1, finalize 300g
4. In Tab 2, attempt to finalize 500g (assuming original was 650g)

**Expected Results**:
- Tab 1 should succeed
- Tab 2 should either:
  - Refresh and show updated remaining quantity (350g)
  - Show error: "Quantity has changed, please refresh"
  - Use optimistic locking to prevent over-finalization

---

## Phase 6: Data Integrity Verification

### Test 6.1: ATP Constraint Verification

**Objective**: Ensure all inventory maintains ATP constraint

**Query**:
```sql
-- Should return 0 rows (all inventory passes ATP check)
SELECT
  package_id,
  product_name,
  on_hand_qty,
  available_qty,
  reserved_qty,
  (on_hand_qty - reserved_qty) AS calculated_atp,
  available_qty - (on_hand_qty - reserved_qty) AS atp_violation
FROM inventory_items
WHERE available_qty != (on_hand_qty - reserved_qty);
```

**Expected Results**:
- Should return **0 rows**
- If any rows returned, ATP constraint is violated

### Test 6.2: Finalization Status Consistency

**Objective**: Verify session finalization status matches conversion packages

**Query**:
```sql
-- Check trim sessions
SELECT
  ts.id AS session_id,
  ts.batch_registry_id,
  br.batch_number,
  ts.finalization_status_bigs,
  ts.finalization_status_smalls,
  ts.finalization_status_trim,
  COUNT(DISTINCT cp.id) AS conversion_packages_count
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN conversion_packages cp ON cp.source_session_ids @> jsonb_build_array(ts.id::text)
WHERE ts.session_status = 'completed'
GROUP BY ts.id, ts.batch_registry_id, br.batch_number,
         ts.finalization_status_bigs, ts.finalization_status_smalls, ts.finalization_status_trim;

-- Sessions with 'finalized' status should have conversion packages
-- Sessions with 'pending' status should appear in pending_conversion_sessions view
```

**Expected Results**:
- All sessions marked "finalized" should have corresponding conversion_packages records
- All sessions marked "pending" should appear in `pending_conversion_sessions` view

### Test 6.3: Inventory-Conversion Link

**Objective**: Verify all finalized conversions created inventory

**Query**:
```sql
-- Should return 0 rows (all finalized conversions have inventory)
SELECT
  cp.id AS conversion_id,
  cp.package_id,
  cp.batch_id,
  cp.weight,
  cp.units,
  cp.finalization_status,
  cp.finalized_at,
  CASE
    WHEN ii.id IS NULL THEN 'MISSING_INVENTORY'
    ELSE 'OK'
  END AS inventory_status
FROM conversion_packages cp
LEFT JOIN inventory_items ii ON cp.package_id = ii.package_id
WHERE cp.finalization_status = 'finalized'
  AND ii.id IS NULL;
```

**Expected Results**:
- Should return **0 rows**
- Every finalized conversion should have matching inventory

---

## Phase 7: Reporting and Analytics

### Test 7.1: Conversion History View

**Steps**:
1. Navigate to **Inventory → Conversion History** or equivalent
2. View the list of all finalized conversions
3. Filter by date range, batch, or strain

**Expected Results**:
- Should see all finalized conversions
- Each entry should show:
  - Package ID
  - Batch name
  - Strain name
  - Product name
  - Quantity
  - Finalized date
  - Finalized by (user)
  - Link to inventory item

**Verification Query**:
```sql
SELECT * FROM conversion_history_view
ORDER BY finalized_at DESC
LIMIT 20;
```

### Test 7.2: Conversion Summary Dashboard

**Steps**:
1. Navigate to the dashboard or analytics section
2. Locate conversion metrics

**Expected Results**:
- Should show summary statistics:
  - Total conversions completed
  - Total weight/units finalized
  - Conversion rate by session type
  - Pending conversions count

**Verification Query**:
```sql
-- Summary stats
SELECT
  COUNT(*) AS total_finalized,
  SUM(COALESCE(weight, 0)) AS total_weight_g,
  SUM(COALESCE(units, 0)) AS total_units,
  COUNT(DISTINCT batch_id) AS batches_affected
FROM conversion_packages
WHERE finalization_status = 'finalized'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Pending summary
SELECT
  COUNT(*) AS pending_count,
  SUM(COALESCE(output_weight, 0)) AS pending_weight_g,
  SUM(COALESCE(output_units, 0)) AS pending_units
FROM pending_conversion_sessions;
```

---

## Test Results Summary Template

Use this template to document your test results:

```
# Conversion Workflow Test Results
**Date**: [Date]
**Tester**: [Name]
**Environment**: [Dev/Staging/Production]

## Phase 1: View Pending Conversions
- [ ] Test 1.1: Navigate to Conversions View - PASS/FAIL
  - Notes:
- [ ] Test 1.2: Verify Data Accuracy - PASS/FAIL
  - Notes:
- [ ] Test 1.3: Check Has Partial Packages Flag - PASS/FAIL
  - Notes:

## Phase 2: Finalize a Conversion
- [ ] Test 2.1: Initiate Finalization - PASS/FAIL
  - Package ID Created:
  - Notes:
- [ ] Test 2.2: Verify Inventory Creation - PASS/FAIL
  - ATP Check: PASS/FAIL
  - Notes:
- [ ] Test 2.3: Verify Movement Record - PASS/FAIL
  - Notes:
- [ ] Test 2.4: Verify Remaining Quantity Updates - PASS/FAIL
  - Notes:

## Phase 3: Full Finalization Test
- [ ] Test 3.1: Finalize Remaining Quantity - PASS/FAIL
  - Notes:

## Phase 4: Packaging Session Finalization
- [ ] Test 4.1: Finalize Packaging Session - PASS/FAIL
  - Notes:

## Phase 5: Edge Case Testing
- [ ] Test 5.1: Multi-Session Aggregation - PASS/FAIL
- [ ] Test 5.2: Zero Quantity Validation - PASS/FAIL
- [ ] Test 5.3: Over-Finalization Prevention - PASS/FAIL
- [ ] Test 5.4: Concurrent Finalization Handling - PASS/FAIL

## Phase 6: Data Integrity Verification
- [ ] Test 6.1: ATP Constraint Verification - PASS/FAIL
  - Violations Found: [Number]
- [ ] Test 6.2: Finalization Status Consistency - PASS/FAIL
- [ ] Test 6.3: Inventory-Conversion Link - PASS/FAIL
  - Missing Inventory: [Number]

## Phase 7: Reporting and Analytics
- [ ] Test 7.1: Conversion History View - PASS/FAIL
- [ ] Test 7.2: Conversion Summary Dashboard - PASS/FAIL

## Overall Assessment
**Total Tests**: XX
**Passed**: XX
**Failed**: XX
**Success Rate**: XX%

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## Quick Reference: Database Queries

### Check Pending Conversions
```sql
SELECT * FROM pending_conversion_sessions
ORDER BY last_completed_at DESC;
```

### Check Recent Conversions
```sql
SELECT * FROM conversion_packages
ORDER BY created_at DESC
LIMIT 10;
```

### Check Inventory Created from Conversions
```sql
SELECT
  ii.*,
  cp.aggregation_id,
  cp.finalization_status
FROM inventory_items ii
JOIN conversion_packages cp ON ii.package_id = cp.package_id
WHERE cp.finalized_at >= CURRENT_DATE
ORDER BY ii.created_at DESC;
```

### ATP Integrity Check
```sql
SELECT * FROM inventory_items
WHERE available_qty != (on_hand_qty - reserved_qty);
```

### Session Finalization Status
```sql
-- Trim sessions
SELECT
  id, batch_registry_id, session_status,
  finalization_status_bigs,
  finalization_status_smalls,
  finalization_status_trim
FROM trim_sessions
WHERE session_status = 'completed'
ORDER BY completed_at DESC;

-- Packaging sessions
SELECT
  id, batch_registry_id, session_status,
  finalization_status_3_5g,
  finalization_status_14g,
  finalization_status_1lb
FROM packaging_sessions
WHERE session_status = 'completed'
ORDER BY completed_at DESC;

-- Bucking sessions
SELECT
  id, batch_registry_id, session_status,
  finalization_status_bucked,
  finalization_status_smalls
FROM bucking_sessions
WHERE session_status = 'completed'
ORDER BY completed_at DESC;
```

---

## Support and Troubleshooting

### Common Issues

**Issue**: Pending conversion shows incorrect quantity
- **Check**: Run the verification query for that specific conversion
- **Possible Cause**: Partial finalization not reflected in view
- **Solution**: Refresh the view or check conversion_packages table

**Issue**: Finalization fails with error
- **Check**: Review error message in UI
- **Common Causes**:
  - Missing batch_id or strain_id
  - Invalid quantity (zero or negative)
  - ATP constraint violation
- **Solution**: Check session data and ensure all required fields are populated

**Issue**: Inventory not created after finalization
- **Check**: Run Test 6.3 query to find missing inventory
- **Possible Cause**: Finalization RPC error not caught by UI
- **Solution**: Review database logs and RPC function execution

### Getting Help

If you encounter issues during testing:
1. Document the exact steps taken
2. Capture screenshots of the error
3. Run the relevant verification queries
4. Note the timestamp of the failure
5. Check for related errors in browser console

---

**End of Testing Guide**
