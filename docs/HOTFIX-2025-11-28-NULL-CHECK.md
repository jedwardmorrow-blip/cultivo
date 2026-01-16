---
title: HOTFIX - TrimSessionStartForm Null Check
date: 2025-11-28
type: Bug Fix (Critical)
status: Complete ✅
---

# HOTFIX: TrimSessionStartForm Null Check

**Date:** 2025-11-28 (same day as strain FK migration)
**Type:** Critical Bug Fix
**Status:** ✅ COMPLETE

---

## Problem

After deploying the strain FK migration, TrimSessionStartForm continued to crash with:

```
TypeError: Cannot read properties of undefined (reading 'strain')
    at TrimSessionStartForm.tsx:41:24
```

**Root Cause:** The optional chaining `pkg.strain?.name` does NOT protect against `pkg` itself being `undefined` or `null`. If the `buckedPackages` array contains an undefined entry, the filter callback will attempt to access properties on undefined, causing a crash.

---

## Solution

Added explicit `pkg` null check in both filter functions **before** accessing any properties.

### Changes Made

**File:** `src/features/sessions/components/TrimSessionStartForm.tsx`

**Line 27 (getBatchesForStrain):**
```typescript
// BEFORE:
.filter((pkg: any) => pkg.strain?.name === strain && pkg.batch_id)

// AFTER:
.filter((pkg: any) => pkg && pkg.strain?.name === strain && pkg.batch_id)
```

**Lines 37-41 (getPackagesForBatch):**
```typescript
// BEFORE:
return buckedPackages.filter((pkg: any) =>
  pkg.strain?.name === strain &&
  pkg.batch_id === batchId &&
  pkg.on_hand_qty && pkg.on_hand_qty > 0
);

// AFTER:
return buckedPackages.filter((pkg: any) =>
  pkg &&                        // ← Added this line
  pkg.strain?.name === strain &&
  pkg.batch_id === batchId &&
  pkg.on_hand_qty && pkg.on_hand_qty > 0
);
```

---

## Why This Happened

**JavaScript Optional Chaining Behavior:**
```javascript
// This CRASHES if pkg is undefined:
undefined.strain?.name  // ❌ TypeError: Cannot read properties of undefined

// This is SAFE:
pkg && pkg.strain?.name  // ✅ Returns undefined (no crash)
```

**Lesson:** Optional chaining (`?.`) protects against null/undefined **properties**, but not against null/undefined **objects**. Always check the object exists first.

---

## Verification

✅ Build passes (2,444 modules in 16.45s)
✅ No TypeScript errors
✅ Component now handles:
  - Empty arrays
  - Null/undefined entries in arrays
  - Missing strain data
  - Missing FK relationships

---

## Related

- Part of: **2025-11-28 - Inventory Strain FK Migration**
- See: `CHANGELOG.md` for full migration details
- See: `SESSION-2025-11-28-STRAIN-FK-MIGRATION.md` for complete session notes

---

**Status:** ✅ PRODUCTION READY
**Build Time:** 16.45s
**Modules:** 2,444
