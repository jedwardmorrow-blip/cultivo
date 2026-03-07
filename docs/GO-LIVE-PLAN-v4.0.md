# CultOps Go-Live Plan

**Version 4.0 -- Schema-First Migration to cult-ops Supabase**
**Target: Monday, March 3, 2026**
**Prepared: March 2, 2026**

> This plan supersedes v3.4 and all prior versions. The strategy has changed from
> soft-reset (delete test data in place) to **schema-first migration** (export full schema
> from Bolt.new instance, deploy to cult-ops Supabase, import only production data).
> v3.4 remains in this directory as reference for FK ordering and trigger documentation.

---

## Change Log from v3.4

| # | Category | What Changed | Why |
|---|----------|-------------|-----|
| 1 | Strategy | Changed from soft-reset to schema-first migration | Clean slate on cult-ops is simpler and safer than 27-table FK-ordered DELETE |
| 2 | Target | Deploying to `cult-ops` Supabase instance (`fhjcvdimdgzwrijotmxg`) | Bolt.new instance cannot be controlled from Supabase dashboard |
| 3 | Data scope | Only importing production data (orders, customers, products, settings, etc.) | No test/session/inventory data carries forward; inventory is loaded fresh from audit |
| 4 | Env config | `.env` will point to cult-ops instance after cutover | Frontend connects to whichever instance the env vars point to |
| 5 | Simplification | No trigger disable/enable dance needed | Fresh schema, fresh data, triggers only fire on new operations |
| 6 | Risk reduction | No risk of FK constraint violations during DELETE | We never delete anything -- we INSERT into clean tables |

---

## 1. Architecture Overview

### 1.1 Three Supabase Instances

| Instance | Project Ref | Current Status | Role in This Plan |
|----------|-------------|----------------|-------------------|
| Bolt.new (LIVE) | `fonreynkfeqywshijqpi` | 94 tables, production + test data | **SOURCE** -- export schema + production data |
| cult-ops (Dashboard) | `fhjcvdimdgzwrijotmxg` | EMPTY (0 tables) | **TARGET** -- deploy schema, import production data |
| cult-ops-dev (Dashboard) | `uayyhluztelnfxfvdhyt` | EMPTY | Not used in this plan |

### 1.2 Why Migrate Instead of Reset-in-Place

The v3.4 plan required a 27-table FK-ordered DELETE sequence, trigger disabling, and careful
re-linking of preserved data. This is fragile and hard to verify.

The v4.0 approach is simpler:
1. Export the complete schema DDL from Bolt.new (tables, views, functions, triggers, RLS, indexes)
2. Deploy that DDL to cult-ops (empty instance)
3. Export only production data rows from Bolt.new
4. Import those rows into cult-ops
5. Upload fresh audit data (strains, batches, COAs, inventory)
6. Update `.env` to point to cult-ops
7. Bolt.new instance remains untouched as a backup

---

## 2. What Migrates (Production Data)

These tables contain real business data that must be preserved.

| Table | Rows | Data Type | Migration Method |
|-------|------|-----------|-----------------|
| orders | 132 | Real | SQL INSERT export |
| order_items | 576 | Real | SQL INSERT export |
| order_fulfillment_checklist | 576 | Real | SQL INSERT export |
| products | 1,049 | Real | SQL INSERT export |
| customers | 39 | Real | SQL INSERT export |
| app_settings | 33 | Real | SQL INSERT export |
| product_types | 14 | Real | SQL INSERT export |
| grow_rooms | 11 | Real | SQL INSERT export |
| user_profiles | 10 | Real | SQL INSERT export |
| notification_preferences | 9 | Real | SQL INSERT export |
| room_sections | 8 | Real | SQL INSERT export |
| quality_grade_history | 8 | Real | SQL INSERT export |
| quality_grades | 5 | Real | SQL INSERT export |
| coversheets | 5 | Real | SQL INSERT export (order-linked only) |
| label_types | 4 | Real | SQL INSERT export |
| product_stages | 4 | Real | SQL INSERT export |
| customer_activity_log | 3 | Real | SQL INSERT export |
| dry_rooms | 3 | Real | SQL INSERT export |
| invoices | 3 | Real | SQL INSERT export (order-linked) |
| delivery_drivers | 1 | Real | SQL INSERT export |
| delivery_vehicles | 1 | Real | SQL INSERT export |
| crm_visit_schedule | 1 | Real | SQL INSERT export |
| room_tables | 1 | Real | SQL INSERT export |

**Total: 23 tables, ~2,545 rows of production data**

### 2.1 What Does NOT Migrate

All test/development data is left behind on the Bolt.new instance:

- inventory_items (122 test rows)
- inventory_movements (227 test rows)
- batch_registry (62 test rows)
- All session tables (trim, bucking, packaging -- test data)
- All cultivation test data (plant_groups, individual_plants, harvest_sessions)
- All delivery route test data
- strains (43 rows -- will be re-uploaded fresh with correct abbreviations)
- certificates_of_analysis (20 test rows -- will be re-uploaded from lab CSV)
- All internal inventory tables (bulk, bucked, packaged -- deprecated)

---

## 3. Execution Phases

### Phase 1 -- Schema Export from Bolt.new

Export the complete DDL from `fonreynkfeqywshijqpi`:
- All 94 base tables with columns, constraints, defaults, CHECK constraints
- All views (order_pipeline_view, inventory views, conversion views, CRM views, etc.)
- All functions and triggers
- All RLS policies
- All indexes
- Storage buckets configuration (coa-documents, logos)

**Method:** Query `information_schema` and `pg_catalog` tables via MCP connection to generate
complete CREATE TABLE, CREATE VIEW, CREATE FUNCTION, CREATE POLICY, and CREATE INDEX statements.

**Output:** A single SQL file (or ordered set of files) that can recreate the entire schema.

**Verification:**
```
- Table count matches source (94 base tables)
- View count matches source
- Function count matches source
- Trigger count matches source
- RLS policy count matches source
```

### Phase 2 -- Deploy Schema to cult-ops

Run the exported DDL against `fhjcvdimdgzwrijotmxg` via the Supabase SQL Editor.

**Important considerations:**
- Run DDL in dependency order (types/enums first, then tables, then views, then functions, then triggers, then RLS policies, then indexes)
- Schema must be deployed to the `public` schema
- Enable RLS on all tables (already part of exported DDL)
- Create storage buckets: `coa-documents`, `logos`

**Verification:**
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Must match source count (94)
```

### Phase 3 -- Data Cleanup on Source (Read-Only Corrections)

Before exporting production data, identify and correct data quality issues.
These corrections are applied to the EXPORT SQL, not to the source database.

**3.1 Strain name corrections (applied in export SQL):**

| Original | Corrected |
|----------|-----------|
| Super Silver Marker | Silver Marker |
| Flava Flav | Flavor Flav |

These corrections apply to text fields in: `order_items.strain`, `products.strain_name`

**3.2 Null strain_id handling:**

Production data (orders, products) will be exported WITHOUT strain_id values.
Strain re-linking happens in Phase 5 after fresh strains are uploaded.

Export SQL for order_items and products will explicitly SET strain_id = NULL.

### Phase 4 -- Export and Import Production Data

**4.1 Export order:**

FK dependencies require this import sequence:

```
1. quality_grades           -- no FK dependencies
2. product_stages           -- no FK dependencies
3. product_types            -- no FK dependencies
4. label_types              -- no FK dependencies
5. customers                -- no FK dependencies
6. delivery_drivers         -- no FK dependencies
7. delivery_vehicles        -- no FK dependencies
8. grow_rooms               -- no FK dependencies
9. dry_rooms                -- no FK dependencies
10. room_tables             -- FK -> grow_rooms
11. room_sections           -- FK -> grow_rooms
12. products                -- FK -> product_types, strains (SET NULL)
13. app_settings            -- no FK dependencies
14. user_profiles           -- FK -> auth.users
15. notification_preferences -- FK -> user_profiles
16. orders                  -- FK -> customers
17. order_items             -- FK -> orders, products
18. order_fulfillment_checklist -- FK -> orders, order_items
19. invoices                -- FK -> orders
20. coversheets             -- FK -> orders
21. customer_activity_log   -- FK -> customers
22. quality_grade_history   -- FK -> quality_grades
23. crm_visit_schedule      -- FK -> customers
```

**4.2 Method:**

For each table, generate INSERT statements from the source database.
Use `SELECT * FROM table_name` via MCP, then format as INSERT SQL.

**4.3 Auth users:**

Auth users live in `auth.users` (managed by Supabase Auth), not in the public schema.
These must be recreated via the Supabase dashboard or Admin API on the cult-ops instance.

Required users (from user_profiles):
- Export user_profiles to identify required auth users
- Recreate each user on cult-ops via Supabase Auth dashboard
- user_profiles trigger will auto-create the profile row, OR insert manually if trigger does not match

**Verification after Phase 4:**
```sql
SELECT 'orders' AS tbl, COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings;
-- Row counts must match source
```

### Phase 5 -- Upload Fresh Audit Data

This is the same data upload sequence from v3.4 Phase D, but into a clean database
with no conflicting test data.

**5.1 Strains**
- Source: Audit spreadsheet strain list
- Required: `id` (uuid), `name`, `display_name`, `abbreviation` (3-letter uppercase), `is_active`
- Optional: `dominance_type`, `thc_range`, `cbd_range`, `terpene_profile`

**5.2 Batch Registry**
- Source: Audit spreadsheet (34 batches)
- Required: `id`, `batch_number` (YYMMDD-XXX), `strain` (text), `strain_id` (FK), `harvest_date`, `lifecycle_state`
- All batches start with correct lifecycle_state based on current processing status

**5.3 Certificates of Analysis**
- Source: COA lab CSV (42 unique batches, 51 tests)
- Required: `id`, `batch_id` (FK), `strain_name`, `thc_percentage`, `total_thc`
- Rule: When two tests exist for same batch, use higher THC%
- Formula: `total_thc = d9_thc + (thca * 0.877)`

**5.4 Backfill batch_registry.coa_id**
```sql
UPDATE batch_registry br
SET coa_id = coa.id
FROM certificates_of_analysis coa
WHERE coa.batch_id = br.id
  AND br.coa_id IS NULL;
```

**5.5 Inventory Items**
- Source: Audit spreadsheet (131 Binned + 5 Bucked + any Packaged)
- No trigger disable needed (no conflicting test data in fresh database)
- BUT: evaluate whether auto-triggers (batch number inherit, strain inherit, auto-register)
  should be disabled anyway to ensure exact data from audit is preserved
- Critical constraints still apply:
  - `available_qty = on_hand_qty - reserved_qty` (ATP CHECK)
  - `batch_number ~ '^\d{6}-[A-Z]{3,4}$'` (format CHECK)
  - `reserved_qty = 0` for fresh inventory
  - `test_mode = false` for production data

**5.6 Trigger consideration for inventory upload:**

Even in the clean database, these triggers may interfere with direct data loading:

| Trigger | Risk | Action |
|---------|------|--------|
| `set_inventory_batch_number` | Overwrites our batch_number with lookup | DISABLE before upload |
| `trg_inventory_item_inherit_strain` | Overwrites our strain_id with lookup | DISABLE before upload |
| `trg_inventory_items_update_batch_stage` | Updates batch lifecycle | DISABLE before upload |
| `trigger_inventory_auto_register_batch` | Creates duplicate batches | DISABLE before upload |

```sql
-- Before inventory upload
ALTER TABLE inventory_items DISABLE TRIGGER set_inventory_batch_number;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_item_inherit_strain;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_items_update_batch_stage;
ALTER TABLE inventory_items DISABLE TRIGGER trigger_inventory_auto_register_batch;

-- After inventory upload
ALTER TABLE inventory_items ENABLE TRIGGER set_inventory_batch_number;
ALTER TABLE inventory_items ENABLE TRIGGER trg_inventory_item_inherit_strain;
ALTER TABLE inventory_items ENABLE TRIGGER trg_inventory_items_update_batch_stage;
ALTER TABLE inventory_items ENABLE TRIGGER trigger_inventory_auto_register_batch;
```

### Phase 6 -- Re-Link Preserved Data to Fresh Strains

After strains are uploaded in Phase 5, restore strain_id references on preserved tables:

```sql
-- Re-link order_items
UPDATE order_items oi
SET strain_id = s.id
FROM strains s
WHERE oi.strain = s.name
  AND oi.strain_id IS NULL;

-- Re-link products
UPDATE products p
SET strain_id = s.id
FROM strains s
WHERE p.strain_name = s.name
  AND p.strain_id IS NULL;
```

**Verification:**
```sql
-- Unmatched order_items (should return 0 rows if all strain names are correct)
SELECT DISTINCT oi.strain
FROM order_items oi
WHERE oi.strain IS NOT NULL AND oi.strain != '' AND oi.strain_id IS NULL;

-- Unmatched products (some may legitimately lack strain)
SELECT DISTINCT p.strain_name
FROM products p
WHERE p.strain_name IS NOT NULL AND p.strain_name != '' AND p.strain_id IS NULL;
```

### Phase 7 -- Environment Cutover

**7.1 Update `.env`:**
```
VITE_SUPABASE_URL=https://fhjcvdimdgzwrijotmxg.supabase.co
VITE_SUPABASE_ANON_KEY=<cult-ops anon key from dashboard>
```

**7.2 Deploy:**
- Build with new env vars: `npm run build`
- Deploy to hosting (Vercel/Bolt.new)

**7.3 Edge Functions:**
- Redeploy `admin-create-user` edge function to cult-ops instance
- Redeploy `inventory-reset` edge function to cult-ops instance
- Both use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars which are auto-populated per instance

**7.4 Storage:**
- Create `coa-documents` bucket on cult-ops
- Create `logos` bucket on cult-ops
- Upload company logos to `logos` bucket
- COA PDFs can be uploaded after go-live

### Phase 8 -- Verification

Run the complete verification suite against the cult-ops instance:

```sql
-- 1. Table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Must be 94

-- 2. Production data counts
SELECT 'orders' AS tbl, COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles;
-- Must match source counts

-- 3. Strain count matches audit upload
SELECT COUNT(*) FROM strains WHERE is_active = true;

-- 4. Every batch links to a valid strain
SELECT br.batch_number, br.strain
FROM batch_registry br WHERE br.strain_id IS NULL;
-- Must return 0 rows

-- 5. Every inventory item links to a valid batch
SELECT ii.package_id, ii.product_name
FROM inventory_items ii WHERE ii.batch_id IS NULL;
-- Must return 0 rows

-- 6. ATP constraint health
SELECT id, package_id, on_hand_qty, available_qty, reserved_qty
FROM inventory_items
WHERE available_qty != (on_hand_qty - COALESCE(reserved_qty, 0));
-- Must return 0 rows

-- 7. Batch number format
SELECT id, batch_number FROM batch_registry
WHERE batch_number !~ '^\d{6}-[A-Z]{3,4}$';
-- Must return 0 rows

-- 8. Order-strain re-link completeness
SELECT COUNT(*) AS unlinked FROM order_items
WHERE strain IS NOT NULL AND strain != '' AND strain_id IS NULL;
-- Must return 0

-- 9. COA linkage
SELECT br.batch_number, br.coa_id IS NOT NULL AS has_coa
FROM batch_registry br ORDER BY br.batch_number;

-- 10. No test data leaked
SELECT COUNT(*) FROM inventory_items WHERE test_mode = true;
-- Must return 0
```

**UI Verification:**
- Log in with existing credentials
- Dashboard loads with correct data
- Order list shows all 132 orders
- Batch list shows 34 batches from audit
- Inventory shows audit counts
- Creating a new session works and auto-links to batches
- COA upload works (storage bucket accessible)

---

## 4. Schema Reference

Carried forward from v3.4 Section 3 -- these constraints still apply to the fresh database.

### 4.1 Critical CHECK Constraints

| Constraint | Table | Rule |
|-----------|-------|------|
| `chk_atp_consistency` | inventory_items | `available_qty = on_hand_qty - COALESCE(reserved_qty, 0)` |
| `batch_number_format_check` | inventory_items | `batch_number ~ '^\d{6}-[A-Z]{3,4}$'` |
| `batch_number_required_with_batch_id` | inventory_items | `batch_id IS NOT NULL => batch_number IS NOT NULL` |
| `inventory_items_package_id_format` | inventory_items | `length(package_id) >= 5` |

### 4.2 Core Table Schemas

See v3.4 Section 3.3 for full column reference for:
- `batch_registry`
- `certificates_of_analysis`
- `inventory_items`
- `strains`

---

## 5. COA Handling

Carried forward from v3.4 Section 6.

- When two tests exist for same batch, use higher THC%
- Total THC formula: `total_thc = d9_thc + (thca * 0.877)`
- Strain name corrections apply (Super Silver Marker -> Silver Marker, Flava Flav -> Flavor Flav)
- COA PDFs: Upload to cult-ops `coa-documents` storage bucket after data upload
- `file_url` in `certificates_of_analysis` stores the storage path

---

## 6. Strain Name Corrections

| Original | Corrected |
|----------|-----------|
| Super Silver Marker | Silver Marker |
| Flava Flav | Flavor Flav |

Applied to: `order_items.strain`, `products.strain_name` during Phase 3 export.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Schema DDL export misses objects | Medium | High | Verify object counts after deploy; diff against source |
| Auth user mismatch (UUIDs differ) | High | High | Recreate users first; use same email; update user_profiles.id to match |
| RLS policy blocks data import | Medium | High | Use service_role key for all imports |
| FK constraint violation during import | Low | High | Follow Phase 4 import order strictly |
| Trigger fires during inventory INSERT | Medium | High | Disable 4 triggers per Phase 5.6 |
| ATP constraint violation on INSERT | Medium | High | Ensure available_qty = on_hand_qty when reserved_qty = 0 |
| Strain name mismatch during re-link | Medium | Medium | Apply Phase 3 corrections; verify Phase 6 queries |
| Storage bucket permissions | Low | Medium | Configure bucket policies after creation |
| Edge function env vars | Low | Medium | Auto-populated on cult-ops; verify with test call |
| Bolt.new instance goes offline | Low | Low | Schema and data already exported; no dependency after cutover |

### 7.1 Auth User UUID Strategy

The most significant risk is that auth user UUIDs will differ between instances.
When users are recreated on cult-ops, they get new UUIDs.

**Mitigation options (choose one during execution):**

**Option A -- UUID Preservation (preferred if possible):**
- Use Supabase Admin API to create users with specific UUIDs
- `supabase.auth.admin.createUser({ id: 'original-uuid', email: '...', password: '...' })`
- This preserves all FK references in user_profiles, created_by fields, etc.

**Option B -- UUID Remapping:**
- Create users normally (new UUIDs assigned)
- Build a mapping table: `old_uuid -> new_uuid`
- Update all references: `user_profiles.id`, `batch_registry.created_by`, RLS policies using `auth.uid()`
- More work, but guaranteed to work

---

## 8. Execution Checklist

```
[ ] Phase 0: Pre-Flight
    [ ] Verify MCP connection to Bolt.new instance
    [ ] Verify access to cult-ops Supabase dashboard
    [ ] Get cult-ops anon key and service_role key from dashboard
    [ ] Confirm audit spreadsheet is final and reviewed
    [ ] Confirm COA lab CSV is final

[ ] Phase 1: Schema Export
    [ ] Export all table DDL (94 tables)
    [ ] Export all view definitions
    [ ] Export all function definitions
    [ ] Export all trigger definitions
    [ ] Export all RLS policy definitions
    [ ] Export all index definitions
    [ ] Save as ordered SQL file(s)

[ ] Phase 2: Deploy Schema to cult-ops
    [ ] Run DDL in dependency order on cult-ops
    [ ] Verify table count = 94
    [ ] Verify view count matches
    [ ] Verify function count matches
    [ ] Verify trigger count matches
    [ ] Create coa-documents storage bucket
    [ ] Create logos storage bucket

[ ] Phase 3: Data Cleanup (in export SQL)
    [ ] Apply strain name corrections to export data
    [ ] Set strain_id = NULL on order_items and products in export

[ ] Phase 4: Import Production Data
    [ ] Recreate auth users on cult-ops (Option A or B from Section 7.1)
    [ ] Import tables in FK-dependency order (23 tables)
    [ ] Verify row counts match source for all 23 tables

[ ] Phase 5: Upload Fresh Audit Data
    [ ] 5.1: Upload strains from audit spreadsheet
    [ ] 5.2: Upload batch_registry (34 batches)
    [ ] 5.3: Upload certificates_of_analysis from lab CSV
    [ ] 5.4: Backfill batch_registry.coa_id
    [ ] 5.5: Disable 4 inventory triggers
    [ ] 5.5: Upload inventory_items from audit
    [ ] 5.5: Re-enable 4 inventory triggers

[ ] Phase 6: Re-Link Preserved Data
    [ ] Re-link order_items.strain_id to new strain UUIDs
    [ ] Re-link products.strain_id to new strain UUIDs
    [ ] Verify no unmatched rows

[ ] Phase 7: Environment Cutover
    [ ] Update .env with cult-ops URL and anon key
    [ ] npm run build passes
    [ ] Deploy to hosting
    [ ] Redeploy edge functions to cult-ops
    [ ] Upload logos to storage
    [ ] Upload COA PDFs to storage (can be done post-go-live)

[ ] Phase 8: Verification
    [ ] Run all 10 verification queries (Phase 8 SQL)
    [ ] Log in and verify dashboard loads
    [ ] Verify orders list (132 orders)
    [ ] Verify batch list (34 batches)
    [ ] Verify inventory counts match audit
    [ ] Test creating a new session
    [ ] Test COA upload (storage accessible)
    [ ] Monitor for 24 hours
```

---

## 9. Environment Reference

| Resource | Bolt.new (Source) | cult-ops (Target) |
|----------|-------------------|-------------------|
| Supabase URL | `https://fonreynkfeqywshijqpi.supabase.co` | `https://fhjcvdimdgzwrijotmxg.supabase.co` |
| Project Ref | `fonreynkfeqywshijqpi` | `fhjcvdimdgzwrijotmxg` |
| Dashboard | Not directly accessible | `https://supabase.com/dashboard/project/fhjcvdimdgzwrijotmxg` |
| COA Bucket | `coa-documents` | `coa-documents` (create) |
| Logo Bucket | `logos` | `logos` (create) |
| Schema Types | `src/lib/database/database.types.ts` | Same file, regenerate after cutover |

---

## 10. Rollback Plan

If cult-ops deployment fails or has critical issues:

1. **Revert `.env`** to point back to Bolt.new instance (`fonreynkfeqywshijqpi`)
2. Redeploy with old env vars
3. Bolt.new instance is untouched -- all original data still there
4. Diagnose issue on cult-ops, retry when ready

The Bolt.new instance is never modified during this plan. It serves as a live backup
throughout the entire migration process.

---

## 11. Post-Go-Live Tasks

After successful cutover and 24-hour monitoring:

1. Upload remaining COA PDFs to cult-ops storage
2. Run `npm run types:generate` against cult-ops to regenerate database types
3. Update `vercel.json` or deployment config if applicable
4. Consider archiving Bolt.new instance (do not delete -- keep as historical backup)
5. Notify `pgrst` schema reload if views are stale: `NOTIFY pgrst, 'reload schema'`

---

## Appendix A: v3.4 Reference

The v3.4 plan (`GO-LIVE-PLAN-v3.4.md`) remains in this directory as reference for:
- Section 2.2: FK blocking relationships (RESTRICT and NO ACTION)
- Section 3.3: Core table column quick-reference
- Section 4.2 Phase B: FK-ordered DELETE sequence (useful if reset-in-place is ever needed)
- Section 5: Complete trigger inventory for inventory_items and inventory_movements
