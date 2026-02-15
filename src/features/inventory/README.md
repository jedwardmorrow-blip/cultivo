# Inventory Management Feature

**Purpose:** Track physical inventory from harvest through packaging, manage conversions, conduct audits, and maintain compliance documentation.

---

## Overview

The inventory feature is one of the most complex modules in the system, handling:

- Physical inventory tracking (packages, lots, items)
- Stage conversions (Binned → Bucked → Bulk → Packaged)
- Inventory audits with variance tracking
- Label generation and printing
- CSV import/export
- Real-time inventory oversight
- Package creation and management

---

## Inventory Stage Flow

Inventory moves through four distinct stages in the production pipeline:

### Stage Progression: Binned → Bucked → Bulk → Packaged

**1. Binned (Fresh Harvest)**
- Raw flower directly from harvest
- Material still on stems/branches
- Stored in bins for curing
- Tracked by weight (grams)
- Category: `Flower - Binned`

**2. Bucked (Stems Removed)**
- Flower separated from stems (bucking process)
- Ready for trimming
- Tracked by weight (grams)
- Category: `Flower - Bucked`
- Conversion: Trim sessions move Bucked → Bulk

**3. Bulk (Processed)**
- Trimmed flower, smalls, and trim
- Ready for packaging
- Tracked by weight (grams)
- Categories: `Flower - Bulk`, `Trim - Bulk`
- Conversion: Packaging sessions move Bulk → Packaged

**4. Packaged (Final Products)**
- Finished consumer products (3.5g, 14g, etc.)
- Ready for distribution
- Tracked by units (count)
- Categories: `Flower - Prepack`, `Trim - Prepack`

### Stage Detection Logic

The system uses the `category` and `product_name` fields to determine which stage an item belongs to:

- **Packaged**: Category contains "prepack" or "packaged" OR SKU contains "-000"
- **Binned**: Category/product name contains "binned"
- **Bucked**: Category/product name contains "bucked"
- **Bulk**: Category/product name contains "bulk" (and not binned/bucked)

See `getItemStage()` in `hooks/useInventoryFilters.ts` for implementation details.

### Stage Conversions

Conversions are managed through production sessions:

**Bucked → Bulk:**
- Trim sessions process bucked material
- Creates bulk flower, smalls, and trim
- Records waste/variance (stems, unusable material)
- Tracked in `pending_conversions` table

**Bulk → Packaged:**
- Packaging sessions create final products
- Converts bulk material to packaged units
- Assigns package IDs and labels
- Updates inventory with final products

All conversions track variance and require manager approval through the Conversions view.

### Future Enhancement

A `stage_id` foreign key relationship to the `product_stages` table is planned for future implementation. This will provide:
- Type-safe stage relationships
- Better query performance
- Cleaner filtering without string parsing
- Enforced referential integrity

See `HOUSEKEEPING_PROGRESS.md` for details on this future enhancement.

---

## Key Components

### Management Views
- **InventoryManagementRefactored** - Main inventory dashboard
- **InventoryOversightDashboard** - Real-time inventory overview
- **ConversionsView** - Conversion workflow management
- **AuditManagement** - Audit initiation and tracking

### Conversion Workflow
- **ConversionModal** - Main conversion orchestration
- **ConversionLotsList** - Available lots for conversion
- **PackageCreationForm** - Create new packages from conversions
- **VarianceConfirmation** - Handle conversion variances

### Audit System
- **AuditInitiationModal** - Start new audit
- **AuditLineEditor** - Edit individual audit lines
- **AuditSheetTemplate** - Printable audit sheet
- **VarianceLogViewer** - View historical variances

### Utilities
- **InventoryLabelPrintModal** - Generate and print labels
- **InventorySearch** - Search and filter inventory
- **InventoryTable** - Display inventory data
- **QuickAdjustmentModal** - Fast inventory adjustments
- **StatsCard** - Display inventory statistics

---

## Custom Hooks

### Data Fetching
- `useInventoryData` - Fetch inventory items with filters and real-time updates
- `useInventorySearch` - Search functionality
- `useInventoryFilters` - Manage filter state
- `useInventoryOversight` - Real-time oversight data
- `useConversionLots` - Fetch available conversion lots with real-time updates

### Audit System
- `useAudit` - Main audit workflow orchestration
- `useAuditPDF` - Generate audit PDF documents
- `useVarianceLog` - Fetch and manage variance logs
- `useAdjustment` - Handle inventory adjustments

### Conversion Workflow
- `useConversionWorkflow` - Orchestrate conversion process
- `useConversionLock` - Prevent concurrent conversions
- `usePackageIdGenerator` - Generate unique package IDs
- `useInventoryLabel` - Generate label data

### CSV Operations
- `useCSVUpload` - Handle CSV imports

---

## Services

### Core Services
- **audit.service.ts** - Audit operations and variance tracking
- **adjustment.service.ts** - Inventory adjustment logic
- **conversions.service.ts** - Conversion workflow logic
- **varianceLog.service.ts** - Variance logging and retrieval
- **auditPDF.service.ts** - PDF generation for audits
- **inventoryNaming.service.ts** - Generate inventory names

---

## Types

### Core Types
- `InventoryItem` - Physical inventory record
- `ConversionLotSummary` - Lot available for conversion
- `AuditSession` - Audit session metadata
- `AuditLine` - Individual inventory count
- `VarianceRecord` - Recorded variance
- `AdjustmentRequest` - Adjustment parameters

### Workflow Types
- `ConversionStep` - Current step in conversion workflow
- `ConversionProgress` - Conversion completion tracking
- `LockStatus` - Conversion lock state

See `types/` folder for detailed type definitions.

---

## Key Workflows

### 1. Inventory Conversion Workflow

```
User Flow:
1. Navigate to Conversions tab
2. Select lot to convert
3. Review lot details and available quantity
4. Enter target product details
5. Specify output quantity
6. Review variance (if any)
7. Confirm conversion
8. System creates new inventory items
9. Updates source inventory
10. Records movement in audit trail
```

**Key Files:**
- `ConversionModal.tsx` - Main UI orchestration
- `useConversionWorkflow.ts` - Business logic
- `conversions.service.ts` - Database operations

### 2. Inventory Audit Workflow

```
User Flow:
1. Navigate to Audit tab
2. Click "Start New Audit"
3. Select inventory to audit
4. Export audit sheet (PDF)
5. Conduct physical count
6. Enter counted quantities
7. System calculates variances
8. Review and confirm variances
9. System adjusts inventory
10. Records variance log
```

**Key Files:**
- `AuditManagement.tsx` - Main UI
- `useAudit.ts` - Orchestration logic
- `audit.service.ts` - Database operations
- `AuditSheetTemplate.tsx` - Printable sheet

### 3. Package Creation Workflow

```
User Flow:
1. From conversion modal
2. Select target product/strain/stage
3. Enter package details (weight, date, etc.)
4. Generate unique package ID
5. System creates inventory item
6. Optionally generate label
7. Print label if needed
```

**Key Files:**
- `PackageCreationForm.tsx` - Form UI
- `usePackageIdGenerator.ts` - ID generation
- `useInventoryLabel.ts` - Label generation

---

## Database Tables

### Primary Tables
- `inventory_items` - Physical inventory records
- `inventory_movements` - Audit trail of all changes
- `pending_conversions` - Queued conversions
- `inventory_audit_sessions` - Audit metadata
- `inventory_audit_lines` - Individual counts
- `inventory_variance_log` - Historical variances
- `inventory_internal_labels` - Label metadata

### Key Relationships
```
inventory_items
  ├─→ product (required)
  ├─→ batch (required)
  ├─→ inventory_movements (many)
  └─→ pending_conversions (many)

inventory_audit_sessions
  └─→ inventory_audit_lines (many)

inventory_variance_log
  ├─→ audit_session (optional)
  └─→ inventory_item (required)
```

---

## State Management

### Component State
- Form values (React useState)
- Modal visibility
- Loading states
- Error states

### Shared State
- No global state
- Data fetched per component
- Real-time updates via Supabase subscriptions

### Caching Strategy
- Custom hooks cache data
- Manual refetch after mutations
- Real-time updates via Supabase subscriptions
  - **conversion_packages** table: Auto-refresh when conversions are finalized
  - **inventory_items** table: Auto-refresh when inventory is directly modified
  - Silent refresh pattern prevents UI flicker during updates

---

## Security & RLS

### Row Level Security Policies
- All inventory tables protected with RLS
- Authenticated users only
- No public access to inventory data
- Audit trails require elevated permissions

### Data Validation
- Client-side form validation
- Server-side validation in triggers
- Type checking via TypeScript
- Business rule enforcement in database

---

## Performance Considerations

### Optimizations
- Indexed queries on frequently accessed columns
- Paginated results for large datasets
- Lazy loading of conversion lots
- Debounced search inputs
- Memoized calculations
- Silent refresh pattern for real-time updates (no loading spinner flicker)

### Known Limitations
- Large CSV imports can be slow (>1000 rows)
- Complex audit calculations may take time
- Multiple rapid changes may trigger multiple silent refreshes (acceptable performance impact)

---

## Testing

### Current Status
- ⚠️ No automated tests (Phase 7 planned)
- Manual testing for all workflows
- Database triggers tested in migrations

### Critical Test Cases (Future)
1. Conversion workflow with variance
2. Audit with large inventory set
3. CSV import with various formats
4. Concurrent conversion attempts (locking)
5. Variance calculation accuracy

---

## Dependencies

### Internal Dependencies
- **products** - Product definitions
- **batches** - Batch/lot tracking
- **orders** - Package assignments (consumed)

### External Dependencies
- Supabase client
- jsPDF (label/audit PDFs)
- jsbarcode (barcode generation)
- PapaParse (CSV parsing - via useCSVUpload)

---

## Configuration

### Environment Variables
None specific to this feature (uses global Supabase config)

### App Settings
- Default units (grams, pounds, etc.)
- Label formats
- Package ID prefixes

---

## Common Issues & Solutions

### Issue: Conversion fails with "Insufficient inventory"
**Cause:** Source inventory has reserved quantity
**Solution:** Check for active production sessions using this inventory

### Issue: Audit sheet shows incorrect quantities
**Cause:** Stale data from real-time updates
**Solution:** Refresh audit session before exporting

### Issue: CSV import fails
**Cause:** Column mismatch or invalid data
**Solution:** Use provided CSV template, validate data types

### Issue: Labels not printing
**Cause:** Browser pop-up blocker
**Solution:** Allow pop-ups for this domain

---

## Future Enhancements

1. **Barcode Scanning** - Scan packages during audit
2. **Mobile Audit App** - Conduct audits on mobile devices
3. **Automated Alerts** - Low stock, expiration warnings
4. **Batch Operations** - Bulk conversions, adjustments
5. **Historical Snapshots** - View inventory at any point in time
6. **Cost Tracking** - Track COGS through inventory lifecycle

---

## Related Documentation

- **Architecture:** `/docs/ARCHITECTURE.md`
- **Conversions Guide:** `/docs/guides/CONVERSION_GUIDE.md` (future)
- **Audit Guide:** `/docs/guides/AUDIT_GUIDE.md` (future)
- **API Reference:** Service layer JSDoc (future)

---

---

## Real-Time Updates

### Supabase Subscriptions

The inventory system uses Supabase real-time subscriptions to automatically refresh data when changes occur:

**`useInventoryData` Hook:**
- Subscribes to `conversion_packages` table for finalized conversion updates
- Subscribes to `inventory_items` table for direct inventory modifications
- Uses silent refresh pattern to prevent UI loading flicker
- Automatically cleans up subscriptions on component unmount

**Pattern Used:**
```typescript
const fetchInventory = useCallback(async (silent = false) => {
  if (!silent) {
    setLoading(true);  // Only show loading on initial/manual fetch
  }
  // ... fetch data
  if (!silent) {
    setLoading(false);
  }
}, [deps]);

// Real-time subscription
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', { event: '*', table: 'table_name' }, () => {
      fetchInventory(true);  // Silent refresh - no loading spinner
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [fetchInventory]);
```

**Benefits:**
- Inventory views update automatically when conversions are finalized
- No manual refresh needed after inventory changes
- Seamless multi-user experience (changes by one user visible to all)
- No UI flicker from loading states during background updates

**Reference Implementation:**
- Pattern established in `useConversionLots.ts` (October 2025)
- Extended to `useInventoryData.ts` (January 2026)

---

## Contacts & Ownership

**Primary Maintainer:** TBD
**Last Major Update:** 2026-01-21 (Real-time Updates Implementation)
**Status:** ✅ Production-ready

---

**For questions or issues with this feature, refer to the main README or create an issue.**
