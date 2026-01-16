# Session 2026-01-16: Inventory Service Layer Architecture Fix

**Date:** 2026-01-16
**Type:** Architecture Compliance / Code Quality
**Status:** ✅ Complete
**Impact:** Backend services only - no UI changes

---

## Summary

Fixed two service files that were bypassing the inventory service layer and making direct database inserts to `inventory_movements`. This violated the documented architecture and caused schema mismatch errors (e.g., using non-existent `occurred_at` column).

**Root Cause:** Direct database operations require developers to know exact column names and bypass centralized business logic, error handling, and test mode support.

**Solution:** Replaced direct Supabase inserts with `inventoryMovementService.recordMovement()` calls in both affected services.

---

## Problem Analysis

### Architectural Violation

The codebase has a clear service layer pattern for inventory movements:
- **Service Layer:** `inventoryMovementService` in `src/services/inventoryMovement.service.ts`
- **Purpose:** Centralize movement recording, handle test mode, validate inputs, provide consistent error handling
- **Contract:** All inventory movement inserts must go through this service

### Files Violating Pattern

Two backend services were making direct inserts:

1. **`src/features/inventory/services/conversions.service.ts`** (line 315-325)
   - Context: Recording PRODUCE movements during conversion finalization
   - Issue: Used hardcoded column names including `occurred_at` (non-existent)
   - Impact: Runtime errors during conversion finalization

2. **`src/features/inventory/services/adjustment.service.ts`** (line 71-83)
   - Context: Recording ADJUSTMENT movements for manual quantity corrections
   - Issue: Same hardcoded columns and schema assumptions
   - Impact: Potential runtime errors during manual adjustments

### Why This Matters

**Direct inserts cause:**
- ❌ Schema coupling - code breaks when database schema changes
- ❌ Inconsistent error handling across services
- ❌ Test mode not respected (movements created in production DB during tests)
- ❌ Duplicate business logic (validation, defaults, logging)
- ❌ Harder to maintain and refactor

**Service layer provides:**
- ✅ Schema abstraction - database changes don't break application code
- ✅ Consistent error handling and result patterns
- ✅ Test mode support automatically applied
- ✅ Single source of truth for movement business logic
- ✅ Easy to add features (audit logging, webhooks, etc.)

---

## Changes Made

### 1. Fixed `conversions.service.ts`

**Added Import:**
```typescript
import { inventoryMovementService } from '@/services';
```

**Replaced Direct Insert:**
```typescript
// BEFORE (WRONG):
const { error: movementError } = await supabase
  .from('inventory_movements')
  .insert({
    movement_kind: 'PRODUCE',
    dest_item_id: invItem.id,
    qty: pkg.weight || pkg.units || 0,
    unit: pkg.weight ? 'g' : 'unit',
    reason_code: 'finalized_conversion',
    notes: `Finalized from ${params.session_ids.length} ${params.session_type} session(s)`,
    occurred_at: new Date().toISOString(), // ❌ Column doesn't exist
  });

if (movementError) {
  console.error(`Failed to create movement:`, movementError);
}

// AFTER (CORRECT):
const movementResult = await inventoryMovementService.recordMovement({
  movement_kind: 'PRODUCE',
  dest_item_id: invItem.id,
  qty: pkg.weight || pkg.units || 0,
  unit: pkg.weight ? 'g' : 'unit',
  reason_code: 'finalized_conversion',
  notes: `Finalized from ${params.session_ids.length} ${params.session_type} session(s)`,
  // ✅ No occurred_at - service uses DB default
});

if (!movementResult.success) {
  console.error(`Failed to create movement:`, movementResult.error);
}
```

**Benefits:**
- Removed 12 lines → 8 lines (simpler)
- Removed hardcoded column name
- Database timestamp handled automatically
- Test mode now respected
- Consistent error handling

### 2. Fixed `adjustment.service.ts`

**Added Import:**
```typescript
import { inventoryMovementService } from '@/services';
```

**Replaced Direct Insert:**
```typescript
// BEFORE (WRONG):
const { data: movement, error: movementError } = await supabase
  .from('inventory_movements')
  .insert({
    source_item_id: inventory_item_id,
    movement_kind: 'ADJUSTMENT',
    qty: new_qty,
    unit: item.unit,
    reason_code: variance_reason,
    notes: `Manual adjustment: ${notes}`,
    occurred_at: new Date().toISOString(), // ❌ Column doesn't exist
  })
  .select('id')
  .single();

if (movementError) throw movementError;

// AFTER (CORRECT):
const movementResult = await inventoryMovementService.recordMovement({
  source_item_id: inventory_item_id,
  movement_kind: 'ADJUSTMENT',
  qty: new_qty,
  unit: item.unit,
  reason_code: variance_reason,
  notes: `Manual adjustment: ${notes}`,
  // ✅ No occurred_at - service uses DB default
});

if (!movementResult.success || !movementResult.movement_id) {
  throw new Error(movementResult.error || 'Failed to create movement');
}

const movement = { id: movementResult.movement_id };
```

**Benefits:**
- Same advantages as conversions.service.ts
- Movement ID still extracted for variance logging
- Better error messages with context

---

## Testing & Verification

### Build Verification
```bash
npm run build
# ✅ Build successful - no breaking changes
# ✅ No TypeScript errors
# ✅ No import resolution issues
```

### Functional Testing Required

**Conversion Finalization Flow:**
1. Start a trim/packaging/bucking session
2. Complete the session with outputs
3. Finalize conversion and create packages
4. ✅ Verify PRODUCE movements created in `inventory_movements`
5. ✅ Verify `on_hand_qty` updated correctly
6. ✅ Verify packages appear in inventory

**Manual Adjustment Flow:**
1. Navigate to inventory item
2. Perform quick adjustment (change quantity)
3. ✅ Verify ADJUSTMENT movement created
4. ✅ Verify variance logged
5. ✅ Verify `on_hand_qty` updated correctly

**Test Mode:**
1. Enable test mode in UI
2. Perform conversions and adjustments
3. ✅ Verify movements go to test portal database
4. ✅ Verify production database unchanged

---

## Impact Analysis

### Affected Code Paths

**Conversions Flow:**
- UI: `ConversionModal.tsx` → calls `finalizeConversion()`
- Service: `conversions.service.ts` → now uses `inventoryMovementService`
- Database: `inventory_movements` trigger → updates `on_hand_qty`

**Adjustments Flow:**
- UI: `QuickAdjustmentModal.tsx` → calls `adjustInventoryItem()`
- Service: `adjustment.service.ts` → now uses `inventoryMovementService`
- Database: `inventory_movements` trigger → updates `on_hand_qty`

### No Breaking Changes

**Why this is safe:**
- Both services are backend-only (no UI imports them directly)
- Return values unchanged (movement IDs still returned)
- Database triggers work identically (same columns inserted)
- Error handling improved (better error messages)
- Test mode now works correctly

**Consumers don't need updates:**
- UI components call the same service functions
- Function signatures unchanged
- Return types compatible
- Error handling more robust

---

## Architecture Patterns

### Service Layer Pattern (Correct)

```
┌─────────────────────────────────────────────────────────────┐
│                    UI COMPONENT                             │
│  (ConversionModal, QuickAdjustmentModal, etc.)             │
└────────────────────┬────────────────────────────────────────┘
                     │ calls service function
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 FEATURE SERVICE                             │
│  (conversions.service, adjustment.service)                  │
│                                                             │
│  - Business logic (validation, calculations)                │
│  - Uses inventoryMovementService for movements ✅           │
│  - Returns structured results                               │
└────────────────────┬────────────────────────────────────────┘
                     │ calls infrastructure service
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE SERVICE                          │
│  (inventoryMovementService)                                 │
│                                                             │
│  - Database operations (Supabase inserts)                   │
│  - Test mode handling                                       │
│  - Schema abstraction                                       │
│  - Error handling & logging                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ inserts to database
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  inventory_movements → triggers → inventory_items           │
└─────────────────────────────────────────────────────────────┘
```

### Anti-Pattern (Wrong)

```
┌─────────────────────────────────────────────────────────────┐
│                 FEATURE SERVICE                             │
│  (conversions.service, adjustment.service)                  │
│                                                             │
│  - Business logic                                           │
│  - Direct Supabase inserts ❌                               │
│  - Hardcoded column names ❌                                │
│  - No test mode support ❌                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ directly inserts
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  inventory_movements (with non-existent columns)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Prevention Guidelines

### For AI Assistants

When writing code that needs to record inventory movements:

**❌ NEVER DO THIS:**
```typescript
// Direct database insert - WRONG!
await supabase.from('inventory_movements').insert({
  movement_kind: 'PRODUCE',
  qty: 100,
  occurred_at: new Date().toISOString(), // Column doesn't exist
});
```

**✅ ALWAYS DO THIS:**
```typescript
// Use service layer - CORRECT!
import { inventoryMovementService } from '@/services';

const result = await inventoryMovementService.recordMovement({
  movement_kind: 'PRODUCE',
  qty: 100,
  // occurred_at handled by database default
});

if (!result.success) {
  console.error('Movement failed:', result.error);
}
```

### Code Review Checklist

When reviewing code changes:
- [ ] No direct inserts to `inventory_movements`
- [ ] All movements use `inventoryMovementService.recordMovement()`
- [ ] No hardcoded database column names
- [ ] No manual timestamp generation (use DB defaults)
- [ ] Proper error handling using result pattern

### Grep Commands for Detection

Find potential violations:
```bash
# Search for direct inventory_movements inserts
grep -rn "\.from('inventory_movements')\.insert" src/

# Search for occurred_at usage
grep -rn "occurred_at.*new Date" src/

# Should only find inventoryMovement.service.ts
```

---

## Related Documentation

- **[INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)** - Event-driven inventory architecture
- **[DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md)** - Automatic quantity updates via triggers
- **[AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md)** - Development guidelines (should add this pattern)
- **[ERROR-HANDLING.md](./ERROR-HANDLING.md)** - Error handling patterns

---

## Future Improvements

### Short Term
- [ ] Add JSDoc comments to both fixed services explaining the service layer pattern
- [ ] Update AI-INSTRUCTIONS.md with this specific example
- [ ] Consider adding ESLint rule to detect direct database operations in feature services

### Long Term
- [ ] Audit other feature services for similar violations
- [ ] Consider creating typed service result pattern (`Result<T, E>`)
- [ ] Add integration tests for movement recording
- [ ] Document all available infrastructure services

---

## Lessons Learned

1. **Architecture documentation is not enough** - Need examples of both correct and incorrect patterns
2. **Schema changes expose violations** - The `occurred_at` column removal revealed this issue
3. **Service layer has clear benefits** - Test mode, error handling, schema abstraction all "free"
4. **Prevention is better than detection** - Need automated checks (linting, tests)

---

## Verification Checklist

- [x] conversions.service.ts uses inventoryMovementService
- [x] adjustment.service.ts uses inventoryMovementService
- [x] Build completes successfully
- [x] No TypeScript errors
- [x] No breaking changes to return values
- [ ] Conversion finalization tested (functional)
- [ ] Manual adjustment tested (functional)
- [ ] Test mode verified (functional)
- [x] Documentation created

---

**Status:** Code changes complete and verified. Functional testing recommended before deployment.
