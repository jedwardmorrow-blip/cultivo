# Conversion Testing Quick Reference

**Quick access reference for manual testing** | Keep this open during testing

---

## Current Test Data (Ready to Use)

### Pending Conversions Available for Testing

| ID | Batch | Strain | Product | Qty | Type | Partial? |
|----|-------|--------|---------|-----|------|----------|
| 1 | 251105-SWF | Swamp Water Fumez | Bulk Flower (Bucked) | 1500g | Bucking | Yes (1300g done) |
| 2 | 251105-SWF | Swamp Water Fumez | Bulk Trim (Trimmed) | 80g | Trim | No |
| 3 | 251105-SSM | Silver Marker | Bulk Flower (Bucked) | 1150g | Bucking | No |
| 4 | 251105-SSM | Silver Marker | Bulk Smalls (Bucked) | 600g | Bucking | No |
| 5 | 251105-ASU | Animal Tsunami | Bulk Smalls (Bucked) | 200g | Bucking | No |
| 6 | 250403HG | White Devil | Packaged - 14g Flower | 28 u | Packaging | No |

**Recommended Test Order**:
1. Start with #3 (SSM Bulk Flower) - partial finalization 500g
2. Complete #3 - full finalization remaining 650g
3. Test #6 (White Devil Packaging) - unit-based conversion
4. Test multi-session if available

---

## Essential Queries

### 1. Check Pending Conversions
```sql
SELECT
  batch_name, strain_name, product_name,
  output_weight, output_units, session_count
FROM pending_conversion_sessions
ORDER BY last_completed_at DESC;
```

### 2. Verify Finalization Success
```sql
-- Check conversion package created
SELECT * FROM conversion_packages
WHERE package_id LIKE '2602%'
ORDER BY created_at DESC LIMIT 1;

-- Check inventory created
SELECT * FROM inventory_items
WHERE package_id LIKE '2602%'
ORDER BY created_at DESC LIMIT 1;
```

### 3. ATP Integrity Check
```sql
SELECT
  package_id, product_name,
  on_hand_qty, available_qty, reserved_qty,
  (on_hand_qty - reserved_qty) AS calc_atp,
  CASE WHEN available_qty = (on_hand_qty - reserved_qty)
    THEN 'PASS' ELSE 'FAIL' END AS atp_status
FROM inventory_items
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### 4. Check Movement Record
```sql
SELECT
  im.movement_kind, im.qty, im.unit, im.reason_code,
  ii.package_id, ii.product_name
FROM inventory_movements im
JOIN inventory_items ii ON im.dest_item_id = ii.id
WHERE im.created_at >= CURRENT_DATE
  AND im.reason_code = 'session_finalization'
ORDER BY im.created_at DESC;
```

### 5. Session Finalization Status
```sql
-- Bucking sessions
SELECT
  br.batch_number, bs.id,
  bs.finalization_status_bucked,
  bs.finalization_status_smalls,
  bs.finalized_at_bucked
FROM bucking_sessions bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
WHERE bs.session_status = 'completed'
ORDER BY bs.completed_at DESC LIMIT 5;

-- Trim sessions
SELECT
  br.batch_number, ts.id,
  ts.finalization_status_bigs,
  ts.finalization_status_smalls,
  ts.finalization_status_trim
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
WHERE ts.session_status = 'completed'
ORDER BY ts.completed_at DESC LIMIT 5;
```

---

## Test Checklist

### Phase 1: View (5 min)
- [ ] Navigate to Inventory → Conversions
- [ ] See 6 pending conversions
- [ ] Data matches table above
- [ ] Partial finalization flag shows for #1

### Phase 2: Partial Finalization (10 min)
- [ ] Select SSM Bulk Flower (1150g)
- [ ] Finalize 500g
- [ ] Success message shown
- [ ] Package ID created (260205-SSM-XXX)
- [ ] Inventory record created
- [ ] ATP check passes
- [ ] Movement record exists
- [ ] Remaining shows 650g

### Phase 3: Full Finalization (10 min)
- [ ] Select SSM Bulk Flower (650g remaining)
- [ ] Finalize full amount
- [ ] Entry disappears from pending
- [ ] New package created
- [ ] Session status = 'finalized'

### Phase 4: Unit-Based (10 min)
- [ ] Select White Devil 14g (28 units)
- [ ] Finalize 10 units
- [ ] Inventory category = 'packaged'
- [ ] Unit type = 'unit' (not 'g')
- [ ] Remaining shows 18 units

### Phase 5: Data Integrity (5 min)
- [ ] Run ATP integrity query → 0 violations
- [ ] Run inventory link query → all finalized have inventory
- [ ] Check movement records → all present

---

## Expected Results Template

### After Successful Finalization:

**Conversion Package**:
```
✓ package_id: 260205-XXX-###
✓ batch_id: [UUID]
✓ weight/units: [entered amount]
✓ finalization_status: 'finalized'
✓ finalized_at: [timestamp]
```

**Inventory Item**:
```
✓ package_id: 260205-XXX-###
✓ on_hand_qty: [same as conversion]
✓ available_qty: [equals on_hand_qty]
✓ reserved_qty: 0
✓ unit: 'g' or 'unit'
✓ category: 'bulk' or 'packaged'
✓ status: 'Available'
✓ ATP: available_qty = (on_hand_qty - reserved_qty) ✓
```

**Movement Record**:
```
✓ movement_kind: 'PRODUCE'
✓ dest_item_id: [inventory item id]
✓ qty: [finalized amount]
✓ reason_code: 'session_finalization'
✓ reference_type: '[session_type]_session'
✓ notes: Contains batch and session info
```

**Session Update**:
```
✓ finalization_status_[type]: 'finalized'
✓ finalized_at_[type]: [timestamp]
✓ finalized_by_[type]: [user UUID]
```

---

## Common Issues & Solutions

### Issue: Can't see pending conversions
**Solution**: Run query #1 to check if data exists in DB
- If yes: UI issue, check browser console
- If no: No completed sessions available

### Issue: Finalization fails
**Check**:
1. Error message in UI
2. Browser console for errors
3. Required fields: batch_id, product_name, quantity > 0

### Issue: Inventory not created
**Check**:
1. Run query #2 to verify conversion_packages record
2. Check if inventory_items exists with same package_id
3. If missing, RPC function may have failed

### Issue: ATP violation
**Check**:
```sql
SELECT * FROM inventory_items
WHERE available_qty != (on_hand_qty - reserved_qty);
```
Should return 0 rows. If violations found, report immediately.

---

## Quick Health Check (Run Anytime)

```sql
SELECT
  (SELECT COUNT(*) FROM pending_conversion_sessions) AS pending,
  (SELECT COUNT(*) FROM conversion_packages WHERE finalized_at >= CURRENT_DATE) AS finalized_today,
  (SELECT COUNT(*) FROM inventory_items WHERE available_qty != (on_hand_qty - reserved_qty)) AS atp_violations,
  CASE
    WHEN (SELECT COUNT(*) FROM inventory_items WHERE available_qty != (on_hand_qty - reserved_qty)) = 0
    THEN 'HEALTHY'
    ELSE 'ISSUES'
  END AS system_status;
```

Expected output:
```
pending | finalized_today | atp_violations | system_status
--------|-----------------|----------------|---------------
   6    |        0        |       0        |   HEALTHY
```

---

## Manual Finalization (If Needed)

If UI is not working, you can finalize manually via SQL:

```sql
-- Example: Finalize 500g from SSM Bulk Flower
SELECT finalize_session_aggregated(
  p_batch_id := (SELECT id FROM batch_registry WHERE batch_number = '251105-SSM'),
  p_product_name := 'Bulk Flower (Bucked)',
  p_session_type := 'bucking'
);
```

⚠️ **Warning**: This bypasses UI validation. Use only for testing/debugging.

---

## Navigation Paths

**To Pending Conversions**:
- Main Menu → Inventory → Conversions
- Or: Dashboard → Pending Conversions Widget → View All

**To Inventory**:
- Main Menu → Inventory → All Inventory
- Filter by: category='bulk' or category='packaged'

**To Conversion History**:
- Main Menu → Inventory → Conversion History
- Or: Analytics → Conversions

---

## Testing Tips

1. **Test Small Amounts First**: Use 100-200g for initial tests
2. **Document Package IDs**: Write down each package_id created
3. **Check ATP After Each**: Run ATP query after every finalization
4. **Screenshot Errors**: Capture any error messages
5. **Note Timestamps**: Record when issues occur for debugging

---

## Success Criteria

**Minimum for PASS**:
- [ ] Can view pending conversions
- [ ] Can finalize at least one conversion
- [ ] Inventory created correctly
- [ ] ATP constraint maintained
- [ ] Movement audit trail present

**Full PASS**:
- [ ] All above +
- [ ] Partial finalization works
- [ ] Full finalization works
- [ ] Unit-based conversions work
- [ ] Remaining quantities update
- [ ] No ATP violations
- [ ] All edge cases handled

---

**Keep this document open during testing for quick reference!**

For detailed instructions, see: `/docs/CONVERSION-WORKFLOW-TESTING-GUIDE.md`
For system health info, see: `/docs/CONVERSION-SYSTEM-HEALTH-REPORT.md`
