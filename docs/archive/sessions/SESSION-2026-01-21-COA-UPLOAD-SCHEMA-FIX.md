# Session: COA Upload System Schema Fix

**Date:** 2026-01-21
**Session Type:** Bug Fix - Critical
**Status:** ✅ Complete
**Duration:** ~30 minutes

---

## Objective

Fix two critical bugs preventing COA upload functionality from working:
1. Schema mismatch between code and database (test_date vs sample_date)
2. PDF.js worker loading failure (CDN vs local)

## Problem Identification

### User Report:
- COA upload interface showed error: "Failed to load COAs: column certificates_of_analysis.test_date does not exist"
- PDF parsing failed with: "Setting up fake worker failed: Failed to fetch dynamically imported module: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.530/pdf.worker.min.js?import"

### Root Cause Analysis:

**Issue 1: Complete Schema Mismatch**
- The `coa.service.ts` code was written for a different schema than the actual `certificates_of_analysis` table
- Code expected fields like: `test_date`, `status`, `file_path`, `terpene_profile` (JSON)
- Actual table has: `sample_date`, `is_active`, `pdf_file_path`, individual terpene columns

**Issue 2: PDF.js Worker Loading**
- Worker loaded from external CDN (`cdnjs.cloudflare.com`)
- Failed due to network issues, CORS restrictions, or CSP violations
- Needed to load worker from local project files

---

## What Was Done

### 1. Fixed PDF.js Worker Configuration

**File:** `src/features/coa/services/coa.service.ts`

**Before:**
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

**After:**
```typescript
// Load PDF.js worker from local file instead of CDN to avoid CORS/CSP issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

**Action:** Copied worker file from node_modules to public directory
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

---

### 2. Fixed Database Schema Mapping

**File:** `src/features/coa/services/coa.service.ts`

**A. Fixed mapDatabaseCOAToApp() Function**

**Changes:**
- Read from `dbRow.sample_date` instead of `dbRow.test_date`
- Read from `dbRow.is_active` (boolean) instead of `dbRow.status === 'active'`
- Read from `dbRow.pdf_file_path` instead of `dbRow.file_path`
- Read individual terpene columns instead of `dbRow.terpene_profile` JSON
- Read `dbRow.strain_name`, `dbRow.batch_number` etc. with fallbacks

**B. Fixed createCOA() Function**

**Before:** Inserted with wrong column names
```typescript
const dbInsert = {
  file_path: data.pdf_file_path,
  file_name: `${data.batch_number}_COA.pdf`,
  test_date: data.sample_date,
  lab_name: null,
  terpene_profile: {...},
  status: data.is_active ? 'active' : 'inactive'
};
```

**After:** Mapped to actual table schema
```typescript
const dbInsert = {
  strain_name: data.strain_name,
  batch_number: data.batch_number,
  sample_date: data.sample_date,
  pdf_file_path: data.pdf_file_path,
  is_active: data.is_active,
  terpene_1_name: data.terpene_1_name,
  terpene_1_value: data.terpene_1_value,
  // ... all individual terpene fields
};
```

**C. Fixed updateCOA() Function**

**Changes:**
- Update `sample_date` column instead of `test_date`
- Update `is_active` boolean instead of `status` text
- Update `pdf_file_path` instead of `file_path`
- Added updates for all missing fields (strain_name, batch_number, harvest_date, etc.)

**D. Fixed Query Functions**

**getAllCOAs():**
- Changed `.order('test_date')` to `.order('sample_date')`

**getActiveCOAs():**
- Changed `.eq('status', 'active')` to `.eq('is_active', true)`
- Changed `.order('test_date')` to `.order('sample_date')`

---

## Database Schema Reference

**Actual `certificates_of_analysis` Table Structure:**

```sql
CREATE TABLE certificates_of_analysis (
  id uuid PRIMARY KEY,
  strain_name text NOT NULL,
  batch_number text NOT NULL,
  harvest_date date,
  manufacture_date date,
  sample_date date,              -- NOT test_date
  thc_percentage numeric(5,2),
  cbd_percentage numeric(5,2),
  total_cannabinoids_percentage numeric(5,2),
  total_terpenes_mg_g numeric(6,2),
  terpene_1_name text,           -- Individual columns
  terpene_1_value numeric(6,2),  -- NOT JSON terpene_profile
  terpene_1_percentage numeric(5,2),
  terpene_2_name text,
  terpene_2_value numeric(6,2),
  terpene_2_percentage numeric(5,2),
  terpene_3_name text,
  terpene_3_value numeric(6,2),
  terpene_3_percentage numeric(5,2),
  pdf_file_path text,            -- NOT file_path
  is_active boolean,             -- NOT status text
  created_at timestamptz,
  updated_at timestamptz,
  batch_id uuid
);
```

---

## Verification

### Build Status

✅ **Build Successful**
```bash
npm run build
✓ 2459 modules transformed
✓ built in 22.52s
```

No TypeScript errors
All imports resolved correctly

---

## Files Modified

1. **`src/features/coa/services/coa.service.ts`**
   - Fixed PDF.js worker path (line 3-4)
   - Fixed `mapDatabaseCOAToApp()` function (lines 15-49)
   - Fixed `createCOA()` function (lines 260-294)
   - Fixed `updateCOA()` function (lines 303-335)
   - Fixed `getAllCOAs()` function (line 372)
   - Fixed `getActiveCOAs()` function (lines 388, 387)

2. **`public/pdf.worker.min.mjs`** (Added)
   - Copied from node_modules/pdfjs-dist/build/
   - Size: 1.07 MB

---

## Testing Plan

### Test 1: COA List Loading
1. Navigate to Settings > Certificates (COA)
2. **Expected:** COA list loads without error
3. **Expected:** No "test_date does not exist" error
4. **Verify:** Existing COAs appear if any exist

### Test 2: COA Upload
1. Click "Select PDF Files"
2. Upload sample COA (Swamp Water Fumez PDF provided)
3. **Expected:** PDF parsing begins without worker error
4. **Expected:** Extracted data shows:
   - Strain: "Swamp Water Fumez"
   - Batch: "251105-SWF"
   - THC: 25.38%
   - Harvest Date: 11/05/2025
   - Terpenes extracted correctly

### Test 3: COA Review & Save
1. Review extracted data in wizard
2. Select or create batch "251105-SWF"
3. Confirm upload
4. **Expected:** Success message
5. **Expected:** COA appears in list below
6. **Verify:** All fields saved correctly

### Test 4: COA Management
1. Toggle COA active/inactive
2. **Expected:** Status updates without error
3. Click PDF icon to view
4. **Expected:** PDF opens in new tab
5. Delete test COA (if created)
6. **Expected:** Deletion succeeds

---

## Impact Assessment

**Affected Systems:**
- ✅ COA Upload Interface (Settings > Certificates)
- ✅ COA List Display
- ✅ COA-Batch Linkage
- ✅ Batch Management COA Status
- ✅ Packaging Session COA Validation
- ✅ Public COA Library

**Risk Level:** LOW
- Bug fixes only (no new features)
- Changes isolated to one service file
- Schema now correctly aligned with database
- No data migrations required
- Easy to rollback if needed

---

## Root Cause: Why Did This Happen?

Looking at migration history, there were TWO different COA table structures created:

1. **`coa_documents` table** (migrations 20251012230934, 20251012250000)
   - Has `test_date` column
   - Has `status` text column
   - Has `file_url` column
   - Has `terpene_profile` JSON column

2. **`certificates_of_analysis` table** (migration 20251017191344)
   - Has `sample_date` column
   - Has `is_active` boolean column
   - Has `pdf_file_path` column
   - Has individual terpene columns

**The code was written for `coa_documents` table structure but querying `certificates_of_analysis` table**, causing complete schema mismatch.

---

## Lessons Learned

1. **Always verify database schema before writing queries**
   - Run `SELECT column_name FROM information_schema.columns` first
   - Don't assume schema matches expectations

2. **Avoid multiple similar tables**
   - Having both `coa_documents` and `certificates_of_analysis` caused confusion
   - Should consolidate to single source of truth

3. **Load workers locally instead of CDN**
   - External CDN dependencies can fail
   - CSP/CORS issues are common with workers
   - Local files are more reliable

4. **Test after schema changes**
   - Schema migrations should trigger service layer updates
   - Integration tests would have caught this mismatch

---

## Next Steps

### Immediate Testing Required:
1. Upload sample COA PDF provided by user
2. Verify extraction matches expected values
3. Test batch linkage workflow
4. Verify integration with packaging sessions

### Documentation Updates:
- ✅ This session document created
- 🔄 Update `CHANGELOG.md` (next)
- 🔄 Update `COA-HANDLING.md` implementation notes (if needed)

### Future Improvements:
1. Consider consolidating COA tables (remove duplicate `coa_documents`)
2. Add TypeScript types that match actual schema
3. Add integration tests for COA upload workflow
4. Consider adding schema validation layer

---

## Success Metrics

**Technical:**
- ✅ Build successful
- ✅ No TypeScript errors
- ✅ Schema correctly aligned
- ✅ PDF.js worker loads locally
- 🔄 End-to-end testing pending

**User Experience:**
- 🔄 Users can upload COAs without errors
- 🔄 PDF parsing works reliably
- 🔄 Data extraction accurate
- 🔄 Batch linkage functional

---

## Conclusion

Fixed critical bugs preventing COA upload system from functioning. The issues were:

1. **Complete schema mismatch** - Code written for wrong table structure
2. **PDF.js worker loading failure** - CDN dependency unreliable

Both issues have been resolved by:
- Aligning all database operations with actual `certificates_of_analysis` schema
- Loading PDF.js worker from local project files

The COA upload system should now work end-to-end. User testing with actual COA PDF will validate the fix.

---

**Session Complete:** 2026-01-21
**Status:** ✅ Ready for Testing
**Next:** User validation with sample COA PDF
