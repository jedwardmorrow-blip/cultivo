---
title: Combine Packages - UI Verification Checklist
category: Testing
version: 1.0
updated: 2025-12-02
---

# Combine Packages UI Verification Checklist

> **Quick verification guide for developers**
> **Time Required:** ~15 minutes
> **Prerequisites:** Dev environment running with sample inventory data

---

## PRE-FLIGHT CHECKS

### 1. Build Status
```bash
npm run build
# Should complete without errors
# Target: < 25 seconds
```

### 2. Dev Server
```bash
npm run dev
# Navigate to: http://localhost:5173
```

### 3. Sample Data Available
- [ ] Logged in as authenticated user
- [ ] Navigate to Inventory → All Inventory
- [ ] Can see inventory items in table
- [ ] Multiple packages exist with compatible attributes

---

## UI COMPONENT VERIFICATION

### Component: AllInventoryView

**Location:** `src/features/inventory/components/AllInventoryView.tsx`

#### Visual Elements Present
- [ ] Stats cards at top (Total Packages, Weight, Strains, Packaged)
- [ ] Stage breakdown cards (Binned, Bucked, Bulk, Packaged)
- [ ] Inventory table with data
- [ ] Checkboxes in first column (if selectable prop enabled)
- [ ] Action buttons in last column (print icon)

#### Multi-Select Functionality
- [ ] Click checkbox on first row → row selected
- [ ] Click checkbox again → row deselected
- [ ] Click multiple checkboxes → multiple rows selected
- [ ] Selection persists when scrolling

#### Selection Banner (appears when 1+ selected)
- [ ] Blue banner appears above stage cards
- [ ] Shows "X packages selected" count
- [ ] "Combine Packages" button visible
- [ ] "Clear Selection" button visible
- [ ] Package icon displayed

---

### Component: Selection Validation

#### Test: Select 1 Package
- [ ] Select single package
- [ ] Click "Combine Packages"
- [ ] Red error message: "Select at least 2 packages to combine"
- [ ] Modal does NOT open

#### Test: Select 2 Compatible Packages
- [ ] Select 2 packages from same batch/product/stage
- [ ] No error message shown
- [ ] Click "Combine Packages"
- [ ] Modal opens successfully

#### Test: Select 2 Incompatible Packages (Different Batches)
- [ ] Select package from Batch A
- [ ] Select package from Batch B
- [ ] Click "Combine Packages"
- [ ] Error message: "All packages must be from the same batch"
- [ ] Modal does NOT open

#### Test: Select 2 Incompatible Packages (Different Products)
- [ ] Select different product types
- [ ] Click "Combine Packages"
- [ ] Error message: "All packages must be the same product"
- [ ] Modal does NOT open

#### Test: Select 2 Incompatible Packages (Different Stages)
- [ ] Select one bucked, one bulk
- [ ] Click "Combine Packages"
- [ ] Error message: "All packages must be at the same stage"
- [ ] Modal does NOT open

---

### Component: CombinePackagesModal

#### Test: Modal Opens
- [ ] Select 2+ compatible packages
- [ ] Click "Combine Packages"
- [ ] Modal appears with dark backdrop
- [ ] Modal centered on screen
- [ ] Title: "Combine Packages"
- [ ] Step indicator shows "Step 1 of 4"

#### Test: Step 1 - Review Packages
- [ ] All selected packages listed in table
- [ ] Columns: Package ID, Batch, Qty, Unit
- [ ] Summary section shows:
  - Total packages count
  - Total quantity
  - Batch number
  - Product name
  - Stage name
  - Strain
- [ ] "Next" button enabled
- [ ] "Cancel" button visible

#### Test: Step 2 - Generate Package ID
- [ ] Auto-generated package ID displayed
- [ ] Format matches convention (YYMMDD-STRAIN-STAGE-###)
- [ ] Input field allows editing
- [ ] "Generate New" button works (creates new ID)
- [ ] "Back" button returns to Step 1
- [ ] "Next" button enabled when ID valid

#### Test: Step 3 - Confirm Variance
- [ ] Expected quantity displayed
- [ ] Actual quantity input field
- [ ] Variance calculated automatically
- [ ] Variance percentage shown
- [ ] If variance > 0:
  - Variance reason dropdown appears
  - Optional notes field appears
- [ ] "Back" button works
- [ ] "Combine Packages" button enabled

#### Test: Step 4 - Completing
- [ ] Loading spinner shown
- [ ] Text: "Combining packages..."
- [ ] Cannot click anything while processing

#### Test: Step 5 - Success
- [ ] Success icon (green checkmark)
- [ ] Success message displayed
- [ ] New package ID shown
- [ ] Details summary (qty, unit, batch, etc.)
- [ ] "Done" button closes modal

---

### Component: Error Handling

#### Test: Network Error
- [ ] Disconnect network during combine
- [ ] Error message displayed in modal
- [ ] Can retry or cancel
- [ ] No partial data created

#### Test: Permission Error
- [ ] Test as user without combine permission (if applicable)
- [ ] Appropriate error message
- [ ] Graceful handling

---

## INTEGRATION VERIFICATION

### Database Integration
```sql
-- After successful combine, check:

-- 1. New package created
SELECT * FROM inventory_items
WHERE package_id = 'NEW_PACKAGE_ID';

-- 2. Source packages depleted
SELECT * FROM inventory_items
WHERE id IN ('SOURCE_1', 'SOURCE_2');
-- Should show on_hand_qty = 0 or available_qty = 0

-- 3. Movements logged
SELECT * FROM inventory_movements
WHERE reference_id = 'NEW_PACKAGE_ID'
ORDER BY created_at DESC;
-- Should see CONSUME movements for sources + PRODUCE for new
```

### UI State Management
- [ ] After combine completes, inventory table refreshes
- [ ] New package appears in correct position
- [ ] Old packages disappear (if filtered to hide zero qty)
- [ ] Selection cleared automatically
- [ ] Can immediately start new combine

---

## PERFORMANCE CHECKS

| Action | Expected | Measured |
|--------|----------|----------|
| Open modal | < 500ms | _____ |
| Generate ID | < 200ms | _____ |
| Complete combine | < 3s | _____ |
| Close modal | < 200ms | _____ |
| Refresh inventory | < 1s | _____ |

---

## RESPONSIVE DESIGN

### Desktop (1920x1080)
- [ ] Modal width appropriate (~800px max)
- [ ] Table columns visible
- [ ] No horizontal scroll
- [ ] Buttons easily clickable

### Tablet (768x1024)
- [ ] Modal fits screen
- [ ] Table scrollable if needed
- [ ] Touch targets adequate
- [ ] No layout breaks

### Mobile (375x667)
- [ ] Modal full width with padding
- [ ] Stacked layout where needed
- [ ] Readable font sizes
- [ ] Accessible buttons

---

## ACCESSIBILITY CHECKS

- [ ] Tab navigation works through form
- [ ] Focus indicators visible
- [ ] Screen reader announces selected count
- [ ] Error messages associated with inputs
- [ ] Success message announced
- [ ] Modal can be closed with Escape key

---

## BROWSER COMPATIBILITY

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## CONSOLE CHECKS

### No Errors
```bash
# Open DevTools Console
# Should see NO red errors during:
- Page load
- Package selection
- Modal open
- Combine operation
- Modal close
```

### Expected Logs (if any)
- Service call logs (debug mode only)
- Success confirmation logs

---

## SIGN-OFF CHECKLIST

### Functionality
- [ ] Can select multiple packages ✓
- [ ] Validation prevents invalid combinations ✓
- [ ] Modal workflow completes successfully ✓
- [ ] Database operations succeed ✓
- [ ] UI refreshes correctly ✓

### Quality
- [ ] No console errors ✓
- [ ] Performance acceptable ✓
- [ ] Responsive on all devices ✓
- [ ] Accessible to keyboard/screen readers ✓

### Documentation
- [ ] Testing guide available ✓
- [ ] Known issues documented ✓
- [ ] User guide created (pending)

---

## NOTES & OBSERVATIONS

**Date Tested:** _______________
**Tester:** _______________
**Environment:** _______________

**Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Recommendations:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## QUICK TEST SCRIPT

For rapid verification, run this abbreviated test:

1. **Setup** (1 min)
   - Login to dev environment
   - Navigate to Inventory → All Inventory
   - Verify data present

2. **Happy Path** (3 min)
   - Select 2 compatible packages
   - Click "Combine Packages"
   - Complete all 4 steps
   - Verify success

3. **Validation** (2 min)
   - Test with 1 package (should fail)
   - Test with different batches (should fail)
   - Test with 2 compatible (should succeed)

4. **Cleanup** (1 min)
   - Check database for new package
   - Verify movements logged
   - Clear test data if needed

**Total Time:** ~7 minutes

✅ **PASS** = All 4 steps successful
❌ **FAIL** = Any step fails, document issue

---

## STATUS

**Last Verified:** 2025-12-02
**Status:** ⏸️ PENDING RUNTIME TEST
**Next Test Date:** _______________
**Verified By:** _______________

