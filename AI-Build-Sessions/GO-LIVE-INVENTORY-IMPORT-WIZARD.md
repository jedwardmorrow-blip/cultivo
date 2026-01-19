# Go-Live Inventory Import Wizard

**Session ID:** GO-LIVE-IMPORT-001
**Priority:** HIGH (Go-Live Readiness)
**Duration:** 60-90 minutes
**Status:** 📋 Planned (Not Started)
**Created:** 2026-01-19

---

## Overview

Build a production-ready UI wizard for importing existing inventory when transitioning to the new system. This provides a safe, validated, and auditable way to load initial inventory data from CSV files.

---

## Entry Criteria

- ✅ Edge function exists: `supabase/functions/inventory-reset/index.ts`
- ✅ Script exists: `scripts/inventory-reset-consolidated.ts`
- ✅ Database schema stable (all migrations deployed)
- ✅ Inventory UI structure in place
- ✅ Can test CSV import via edge function

---

## Implementation Steps

### Step 1: Create CSV Upload Interface (15 min)

**File:** `src/features/inventory/components/InventoryImportWizard.tsx`

**Features:**
- Multi-step wizard (4 steps)
- Drag-and-drop file upload
- CSV validation
- Column mapping preview
- Import execution with progress
- Results summary

**UI Flow:**
1. **Step 1: Upload CSV**
   - Drag-drop zone
   - File picker fallback
   - File size validation (<5MB)
   - Format validation (.csv only)

2. **Step 2: Preview & Validate**
   - Parse CSV client-side
   - Display first 10 rows
   - Show column mapping
   - Validate required columns
   - Check for missing strains
   - Estimate batches to create

3. **Step 3: Confirm Import**
   - Summary statistics
   - Warning about clearing existing inventory
   - Confirmation checkbox
   - Final import button

4. **Step 4: Results**
   - Progress indicator during import
   - Success message
   - Statistics (items imported, batches created)
   - Snapshot ID for audit
   - Download import log button

### Step 2: CSV Validation Service (15 min)

**File:** `src/features/inventory/services/csvImport.service.ts`

**Functions:**
```typescript
export interface CSVRow {
  package_id: string;
  product_name: string;
  category: string;
  strain: string;
  batch_number: string;
  available_qty: number;
  unit: string;
  room: string;
  status: string;
  tags?: string;
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    uniqueStrains: number;
    uniqueBatches: number;
    totalWeight: number;
  };
}

// Parse CSV file to array of objects
export async function parseCSVFile(file: File): Promise<CSVRow[]>

// Validate CSV data structure
export function validateCSVData(rows: CSVRow[]): ImportValidation

// Check if strains exist in database
export async function checkMissingStrains(strains: string[]): Promise<string[]>

// Format validation results for UI display
export function formatValidationResults(validation: ImportValidation): JSX.Element
```

### Step 3: Edge Function Integration (15 min)

**File:** `src/features/inventory/hooks/useInventoryImport.ts`

**Hook Interface:**
```typescript
export function useInventoryImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const executeImport = async (csvData: string) => {
    // Call edge function
    // Handle progress updates
    // Return results
  };

  return { isImporting, progress, result, executeImport };
}
```

**Edge Function Call:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/inventory-reset`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ csvData })
  }
);
```

### Step 4: Import Log Download (10 min)

**File:** `src/features/inventory/services/importLog.service.ts`

**Features:**
- Generate import log as text file
- Include timestamp, user, stats
- List all items imported
- Include snapshot ID for reference
- Download as .txt or .json

### Step 5: Update UI Routes (5 min)

**Update:**
- Replace placeholder in `InventoryResetWizard.tsx`
- Add route in inventory layout
- Add menu item in sidebar
- Ensure proper permissions

### Step 6: Testing (20 min)

**Test Cases:**
1. **Upload valid CSV**
   - Should parse correctly
   - Show preview
   - Execute successfully

2. **Upload invalid CSV**
   - Missing columns → show error
   - Invalid data types → show error
   - Empty file → show error

3. **Database operations**
   - Creates missing batches
   - Clears old inventory
   - Creates snapshot
   - Inserts all items

4. **UI flow**
   - All 4 steps navigate correctly
   - Back button works
   - Cancel works at any step
   - Results display correctly

---

## CSV Format Reference

**Required Columns:**
```csv
package_id,product_name,category,strain,batch_number,available_qty,unit,room,status,tags
251021-CAP-01,Binned - Capulator Junky,Flower - Binned,Capulator Junky,250916-CAP,1032.0,g,Dry Room,Available,
```

**Column Descriptions:**
- `package_id`: Unique identifier (format: YYMMDD-XXX-##)
- `product_name`: Display name with stage
- `category`: Product category
- `strain`: Strain name (must exist or will be created)
- `batch_number`: Batch identifier (format: YYMMDD-XXX)
- `available_qty`: Numeric quantity
- `unit`: Unit of measure (g, oz, lb, unit)
- `room`: Physical location
- `status`: Status (Available, Reserved, etc.)
- `tags`: Optional tags (comma-separated)

**Auto-Created Data:**
- Batches: Created if batch_number doesn't exist
- Harvest Date: Parsed from batch_number (YYMMDD prefix)
- Product Stage: Mapped from product_name
- Snapshot: Created for audit trail

---

## Files to Create

1. `src/features/inventory/components/InventoryImportWizard.tsx` (Main UI)
2. `src/features/inventory/services/csvImport.service.ts` (Validation)
3. `src/features/inventory/services/importLog.service.ts` (Logging)
4. `src/features/inventory/hooks/useInventoryImport.ts` (API hook)

---

## Files to Modify

1. `src/features/inventory/components/InventoryResetWizard.tsx` (Replace placeholder)
2. `src/features/inventory/components/InventorySidebar.tsx` (Add menu item)
3. `src/features/inventory/components/index.ts` (Export new components)

---

## UI Design Specifications

**Wizard Container:**
- Full-width layout with centered content
- Step indicator at top (1 → 2 → 3 → 4)
- Progress bar for active step
- Back/Next/Cancel buttons
- Consistent spacing and styling

**Upload Zone:**
- Dashed border with hover effect
- Large upload icon
- "Drag CSV file here or click to browse"
- File info display after selection

**Preview Table:**
- Scrollable table (max height 400px)
- Column headers clearly labeled
- First 10 rows shown
- "...and X more rows" footer

**Validation Results:**
- Green checkmarks for passed validations
- Yellow warnings for non-critical issues
- Red errors for blocking issues
- Clear, actionable messages

**Progress Indicator:**
- Spinning loader during upload
- Percentage complete during processing
- Estimated time remaining

**Results Screen:**
- Large success icon
- Statistics cards
- Download log button
- "View Inventory" button to navigate

---

## Error Handling

**Upload Errors:**
- File too large (>5MB)
- Invalid file type (not .csv)
- File read error

**Validation Errors:**
- Missing required columns
- Invalid data types
- Duplicate package IDs
- Empty required fields

**Import Errors:**
- Database connection failure
- Constraint violation
- Insufficient permissions
- Network timeout

**All errors should:**
- Display clear message
- Suggest corrective action
- Allow user to retry or cancel
- Log to console for debugging

---

## Security Considerations

**Permissions:**
- Require authenticated user
- Check for admin or manager role
- Log who initiated import

**Data Safety:**
- Confirm before clearing inventory
- Create snapshot before import
- Provide rollback instructions
- Validate all data before insert

**Edge Function:**
- Already uses service role key (secure)
- Validates all inputs
- Creates audit trail

---

## Success Criteria

- ✅ User can upload CSV file via UI
- ✅ Validation catches all invalid data
- ✅ Preview shows accurate data
- ✅ Import executes without errors
- ✅ All items appear in inventory
- ✅ Batches created correctly
- ✅ Snapshot created for audit
- ✅ Import log downloadable
- ✅ Error messages clear and helpful
- ✅ UI is intuitive and responsive

---

## Rollback Plan

**If UI has issues:**
- Revert component files
- Users can still use edge function directly
- Script method still available

**If import fails:**
- Snapshot ID can be used to restore
- Create restore function if needed
- Manual cleanup via SQL

**No database changes needed** - this is UI-only with existing backend

---

## Future Enhancements (Not in Scope)

- Template CSV download
- Column auto-mapping (flexible headers)
- Incremental import (append vs replace)
- Import history browser
- Schedule imports
- Import from Google Sheets URL

---

## Estimated Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| CSV Upload UI | 15 min | None |
| Validation Service | 15 min | None |
| Edge Function Integration | 15 min | Upload UI |
| Import Log Download | 10 min | None |
| UI Routes Update | 5 min | All components |
| Testing | 20 min | All code complete |
| **Total** | **80 min** | |

---

## Testing Checklist

- [ ] Upload valid CSV → succeeds
- [ ] Upload invalid CSV → shows errors
- [ ] Preview displays correctly
- [ ] Validation catches issues
- [ ] Import creates batches
- [ ] Import creates inventory items
- [ ] Snapshot created
- [ ] Import log downloadable
- [ ] Error handling works
- [ ] UI navigation smooth
- [ ] Back button works
- [ ] Cancel at any step works
- [ ] Mobile responsive
- [ ] Loading states clear

---

## Documentation Updates Needed

After completion:

1. **User Guide:**
   - Add section in `docs/USER-SETUP-GUIDE.md`
   - Step-by-step with screenshots
   - CSV format requirements
   - Common errors and solutions

2. **Technical Docs:**
   - Update `docs/INVENTORY-TRACKING.md`
   - Document import process
   - Edge function usage
   - Snapshot system

3. **CHANGELOG:**
   - Add entry for import wizard
   - Note go-live readiness

---

## Priority for Go-Live

**Critical Path:** YES
- Required for initial data load
- Reduces manual entry time from days to minutes
- Provides audit trail for initial inventory
- Reduces human error in data entry

**Recommended Timeline:**
- Build 1-2 weeks before go-live
- Test with sample data
- Train staff on usage
- Prepare production CSV file
- Execute during cutover window

---

## Notes

- Edge function already tested and working
- Script version available as backup
- No database migrations needed
- UI-only implementation
- Can be built independently of other work
- Zero risk to existing functionality

---

**Status:** Ready to implement when needed for go-live preparation
