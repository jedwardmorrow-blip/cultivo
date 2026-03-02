# CultOps Go-Live Plan

**Version 5.0 -- Verified Schema-First Migration to cult-ops Supabase**
**Prepared: March 2, 2026**

> This plan supersedes v4.0 and all prior versions. The strategy remains schema-first
> migration (export full schema from Bolt.new instance, deploy to cult-ops Supabase,
> import only production data). v5.0 corrects factual errors in v4.0, commits to
> concrete decisions that v4.0 left open, and tightens the data scope based on live
> database verification performed March 2, 2026.

---

## Change Log from v4.0

| # | Category | What Changed | Why |
|---|----------|-------------|-----|
| 1 | Schema export | Replaced manual `information_schema` extraction with `pg_dump` approach | Manual DDL reconstruction for 94 tables, 70 views, 183 functions, 141 triggers, 263 RLS policies, 377 indexes, and 6 enums is too error-prone |
| 2 | Data scope | Added labels (29), delivery_routes (18), package_assignments (2) to migration scope | These contain real production data linked to real customers and orders |
| 3 | Data scope | Confirmed all 1,049 products migrate (active + archived) | Preserves FK integrity with order_items; archived products needed for historical orders |
| 4 | Auth strategy | Committed to Option A (UUID preservation) | Avoids remapping UUIDs across 7 FK-dependent tables |
| 5 | FK import order | Fixed incorrect FK dependencies (grow_rooms, dry_rooms, room_sections, customers self-ref) | v4.0 listed several tables as "no FK dependencies" when they actually FK to auth.users |
| 6 | Storage buckets | Corrected bucket names: `coa-pdfs` (not `coa-documents`), `company-assets` (not `logos`) | Names must match source instance |
| 7 | Edge functions | Added `slack-notify` and `slack-order-webhook` to redeployment list | v4.0 only listed 2 of 4 deployed functions |
| 8 | Row counts | Corrected to match live database: customers=39, app_settings=33, product_types=14 | v4.0 used stale counts from the Data Reference document |
| 9 | Data quality | Added 5 additional data quality fixes beyond strain name corrections | Identified from Data Reference cross-check |
| 10 | order_items.batch_id | Documented that 48 rows have non-null batch_id requiring NULL-out in export | batch_registry is not migrating; FK is SET NULL |
| 11 | Enums | Added 6 custom enum types to schema export checklist | v4.0 did not mention enums at all |
| 12 | Verification | Expanded from 10 to 16 verification queries | Added enum, storage, edge function, and cross-reference checks |

---

## 1. Architecture Overview

### 1.1 Three Supabase Instances

| Instance | Project Ref | Current Status | Role in This Plan |
|----------|-------------|----------------|-------------------|
| Bolt.new (LIVE) | `fonreynkfeqywshijqpi` | 94 tables, production + test data | **SOURCE** -- export schema + production data |
| cult-ops (Dashboard) | `fhjcvdimdgzwrijotmxg` | EMPTY (confirmed 0 tables) | **TARGET** -- deploy schema, import production data |
| cult-ops-dev (Dashboard) | `uayyhluztelnfxfvdhyt` | EMPTY | Not used in this plan |

### 1.2 Source Database Object Counts (Verified March 2, 2026)

| Object Type | Count |
|-------------|-------|
| Base tables | 94 |
| Views | 70 |
| Functions | 183 |
| Triggers | 141 |
| RLS policies | 263 |
| Indexes | 377 |
| Custom enum types | 6 |
| Storage buckets | 2 (`coa-pdfs`, `company-assets`) |
| Edge functions | 4 |

### 1.3 Why Migrate Instead of Reset-in-Place

The v3.4 plan required a 27-table FK-ordered DELETE sequence, trigger disabling, and careful
re-linking of preserved data. This is fragile and hard to verify.

The v5.0 approach is simpler:
1. Export the complete schema DDL from Bolt.new (tables, views, functions, triggers, RLS, indexes, enums)
2. Deploy that DDL to cult-ops (empty instance)
3. Export only production data rows from Bolt.new
4. Import those rows into cult-ops
5. Upload fresh audit data (strains, batches, COAs, inventory)
6. Update `.env` to point to cult-ops
7. Bolt.new instance remains untouched as a backup

---

## 2. What Migrates (Production Data)

These tables contain real business data that must be preserved. Row counts verified
against the live database on March 2, 2026.

### 2.1 Tier 1 -- Reference Data (no parent FK dependencies)

| Table | Rows | Notes |
|-------|------|-------|
| quality_grades | 5 | Grade definitions |
| product_stages | 4 | Binned, Bucked, Trimmed, Packaged |
| product_types | 14 | Flower, Pre-Roll, etc. |
| label_types | 4 | Label template definitions |
| conversion_rates | 2 | Stage conversion rates |
| app_settings | 33 | All application configuration |
| delivery_drivers | 1 | Driver record |
| delivery_vehicles | 1 | Vehicle record |

**Subtotal: 8 tables, 64 rows**

### 2.2 Tier 2 -- Core Entities (FK to auth.users or Tier 1)

| Table | Rows | FK Dependencies |
|-------|------|-----------------|
| customers | 39 | Self-referential (`parent_customer_id` -> `customers.id`, SET NULL) |
| products | 1,049 | `product_stages`, `product_types`, self-ref (`replaced_by_product_id`), `strains` (SET NULL on export) |
| grow_rooms | 11 | `auth.users` (`created_by`) |
| dry_rooms | 3 | `auth.users` (`created_by`) |
| user_profiles | 10 | `auth.users` (`id`) |

**Subtotal: 5 tables, 1,112 rows**

### 2.3 Tier 3 -- Dependent Entities (FK to Tier 2)

| Table | Rows | FK Dependencies |
|-------|------|-----------------|
| room_tables | 1 | `grow_rooms`, `auth.users` (`created_by`) |
| room_sections | 8 | `room_tables`, `auth.users` (`created_by`) |
| notification_preferences | 9 | No FK constraints (verified) |
| quality_grade_history | 8 | `quality_grades`, `auth.users` (`changed_by`) |
| delivery_routes | 18 | `customers` (origin + destination) |
| labels | 29 | `products`, `strains` (NULL on export), `label_types`, `auth.users` (`voided_by`) |

**Subtotal: 6 tables, 73 rows**

### 2.4 Tier 4 -- Orders and Related (FK to Tier 2 + Tier 3)

| Table | Rows | FK Dependencies |
|-------|------|-----------------|
| orders | 132 | `customers` |
| order_items | 576 | `orders`, `products`, `strains` (NULL on export), `batch_registry` (NULL on export) |
| order_fulfillment_checklist | 576 | `orders`, `order_items` |
| invoices | 3 | `orders`, `customers` |
| coversheets | 5 | `orders` |
| package_assignments | 2 | `orders`, `order_items`, `labels`, `auth.users` (`assigned_by`) |

**Subtotal: 6 tables, 1,294 rows**

### 2.5 Tier 5 -- CRM Activity (FK to Tier 2 + Tier 4)

| Table | Rows | FK Dependencies |
|-------|------|-----------------|
| crm_visit_schedule | 1 | `customers`, `user_profiles`, `customer_activity_log` (SET NULL) |
| customer_activity_log | 3 | `customers`, `orders` (SET NULL), `user_profiles` (SET NULL), `crm_tasks` (SET NULL), `crm_visit_schedule` (SET NULL) |

**Subtotal: 2 tables, 4 rows**

### 2.6 Migration Totals

**Total: 27 tables, ~2,547 rows of production data**

### 2.7 Tables That Do NOT Migrate (Left on Bolt.new)

All test/development data is left behind:

| Category | Tables | Notes |
|----------|--------|-------|
| Inventory | `inventory_items` (122), `inventory_movements` (227) | Test data; fresh inventory from audit |
| Batches | `batch_registry` (65) | Test batches; fresh batches from audit |
| Sessions | `trim_sessions`, `bucking_sessions`, `packaging_sessions` | All test data |
| Cultivation | `plant_groups`, `individual_plants`, `harvest_sessions`, `harvest_weight_entries`, `binning_sessions` | All test data |
| Strains | `strains` (43) | Re-uploaded fresh with correct abbreviations |
| COAs | `certificates_of_analysis` (20) | Re-uploaded from lab CSV |
| Internal inventory | `internal_bulk_inventory`, `internal_bucked_inventory`, `internal_packaged_inventory` | Deprecated tables |
| Conversions | `pending_conversions`, `conversion_packages` | Test data |
| Schedules | `delivery_schedule`, `trim_schedule`, `packaging_schedule` | All 0 rows |
| Other empty | `batch_allocations` (0), `order_fulfillment_items` (0), `slack_notifications` (0), `manifests` (0), `crm_tasks` (0), `draft_orders` (0) | No data to migrate |

---

## 3. Execution Phases

### Phase 1 -- Schema Export from Bolt.new

Export the complete DDL from `fonreynkfeqywshijqpi`.

**Method:** Use `pg_dump --schema-only` via the Supabase Management API or direct
database connection string. This produces a complete, tested DDL file that includes
all object types in correct dependency order.

If direct `pg_dump` access is not available, fall back to MCP-based extraction in this order:
1. Custom enum types (6 types)
2. Extensions
3. Base tables with columns, constraints, defaults, CHECK constraints (94 tables)
4. Indexes (377)
5. Functions (183)
6. Triggers (141)
7. Views (70)
8. RLS policies (263)

**Custom enum types that MUST be included:**

| Enum Type | Values |
|-----------|--------|
| `allocation_workflow_stage` | allocated, in_trimming, trimmed, in_packaging, packaged, labeled, coa_attached, ready_for_delivery |
| `audit_status` | initiated, in_progress, completed, cancelled |
| `finalization_status` | pending, finalized, voided |
| `order_item_status` | trimming, packaging, labeling, pending_coa, ready_for_delivery |
| `variance_reason` | moisture_loss, spillage, measurement_error, waste, theft_loss, other |
| `variance_source` | audit_reconciliation, session_conversion, manual_adjustment, combine_packages, weight_rebalance |

**Output:** A single SQL file (or ordered set of files) that can recreate the entire schema.

**Verification after Phase 1:**
```
- Enum type count = 6
- Table count = 94
- View count = 70
- Function count = 183
- Trigger count = 141
- RLS policy count = 263
- Index count = 377
```

### Phase 2 -- Deploy Schema to cult-ops

Run the exported DDL against `fhjcvdimdgzwrijotmxg` via the Supabase SQL Editor or MCP.

**Execution order:**
1. Custom enum types
2. Extensions (if any non-default)
3. Base tables (dependency-ordered: parent tables before child tables)
4. Indexes
5. Functions
6. Triggers
7. Views
8. RLS policies

**Storage buckets:**
- Create `coa-pdfs` bucket (public: true)
- Create `company-assets` bucket (public: true)
- Configure storage policies to match source

**Verification after Phase 2:**
```sql
-- Must match source counts
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 94

SELECT COUNT(*) FROM information_schema.views
WHERE table_schema = 'public';
-- Expected: 70

SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Expected: 263
```

### Phase 3 -- Auth User Recreation (UUID Preservation)

Auth users live in `auth.users` (managed by Supabase Auth). They must be recreated
on cult-ops BEFORE importing any data that references them.

**Strategy: UUID Preservation (Option A)**

Use the Supabase Admin API via the `admin-create-user` edge function (or direct
`supabase.auth.admin.createUser()`) with explicit `id` parameter to preserve original UUIDs.

**10 users to recreate:**

| UUID | Email | Notes |
|------|-------|-------|
| `b5116e5d-cc6a-4ed1-9ba8-9ea918ed2395` | `justin@cultcannabis.co` | First user created |
| `f0ff44c6-b0a2-4026-86ce-b40e21b77e51` | `sam@cultcannabis.co` | |
| `647594c7-a932-476c-b7d5-f158e85f76e7` | `james@cultcannabis.co` | |
| `c8b53f7a-82e3-44cc-ab01-4aa1a392841d` | `leo@cultcannabis.co` | |
| `04d9d91c-3d8b-4c72-a0d7-916721febac6` | `scott@cultcannabis.co` | |
| `f9f0b692-7283-48e1-8238-fb940d34f741` | `josie@cultcannabis.co` | |
| `52704ea8-e986-4c27-9aa2-418881ceb363` | `laura@cultcannabis.co` | |
| `552ee529-8daa-4d31-a126-70e49791c749` | `greg@cultcannabis.co` | |
| `97112d43-ad9c-4ecb-a1dc-f31ac8188821` | `david@cultcannabis.co` | FIX: source has typo `david@cultcannabis.c` -- create with corrected email |
| `3e08cb90-05c5-4644-8291-08f0c3540f3f` | `ynez_cross@yahoo.com` | |

**API call pattern:**
```typescript
const { data, error } = await supabase.auth.admin.createUser({
  id: '<original-uuid>',
  email: '<email>',
  password: '<temporary-password>',
  email_confirm: true
});
```

**Important:** The `user_profiles` trigger (`handle_new_user`) may auto-create a
profile row when a user is created. If so, the Phase 4 import of `user_profiles`
must use UPSERT (INSERT ... ON CONFLICT DO UPDATE) rather than plain INSERT.

**Tables that FK to auth.users (7 tables):**
- `user_profiles.id`
- `batch_registry.created_by` (not migrating -- no issue)
- `grow_rooms.created_by`
- `dry_rooms.created_by`
- `room_tables.created_by`
- `room_sections.created_by`
- `labels.voided_by`
- `package_assignments.assigned_by`
- `quality_grade_history.changed_by`

**Verification after Phase 3:**
```sql
SELECT COUNT(*) FROM auth.users;
-- Expected: 10
```

### Phase 4 -- Export and Import Production Data

**4.1 Data Quality Corrections (Applied in Export SQL)**

These corrections are applied to the INSERT statements during export, NOT to the
source database. The source database remains untouched.

| # | Table | Field | Original | Corrected |
|---|-------|-------|----------|-----------|
| 1 | order_items | strain | Super Silver Marker | Silver Marker |
| 2 | order_items | strain | Flava Flav | Flavor Flav |
| 3 | products | strain_name | Super Silver Marker | Silver Marker |
| 4 | products | strain_name | Flava Flav | Flavor Flav |
| 5 | product_types | description | Fresh Frozdn | Fresh Frozen |
| 6 | order_items | strain_id | (any value) | NULL (batch_registry not migrating) |
| 7 | order_items | batch_id | (48 non-null rows) | NULL (batch_registry not migrating) |
| 8 | products | strain_id | (any value) | NULL (re-linked in Phase 6) |
| 9 | labels | strain_id | (any value) | NULL (re-linked in Phase 6) |

**4.2 Import Order (FK-dependency sorted)**

The import must follow this exact sequence. Each tier depends on the previous tiers
being fully imported.

```
--- Tier 1: Reference data (no parent FK) ---
 1. quality_grades              5 rows
 2. product_stages              4 rows
 3. product_types              14 rows    -- Apply: "Fresh Frozdn" -> "Fresh Frozen"
 4. label_types                 4 rows
 5. conversion_rates            2 rows
 6. app_settings               33 rows
 7. delivery_drivers            1 row
 8. delivery_vehicles           1 row

--- Tier 2: Core entities (FK to auth.users or Tier 1) ---
 9. customers                  39 rows    -- Import hub parents first (parent_customer_id = NULL),
                                          -- then UPDATE children with parent_customer_id
10. products                 1049 rows    -- strain_id = NULL, stage_id -> product_stages,
                                          -- type_id -> product_types
                                          -- Import non-self-referencing first, then UPDATE replaced_by_product_id
11. user_profiles              10 rows    -- Use UPSERT if trigger auto-created rows in Phase 3
12. grow_rooms                 11 rows    -- created_by -> auth.users
13. dry_rooms                   3 rows    -- created_by -> auth.users

--- Tier 3: Dependent entities (FK to Tier 2) ---
14. room_tables                 1 row     -- grow_room_id -> grow_rooms, created_by -> auth.users
15. room_sections               8 rows    -- room_table_id -> room_tables, created_by -> auth.users
16. notification_preferences    9 rows    -- No FK constraints
17. quality_grade_history       8 rows    -- quality_grades, auth.users
18. delivery_routes            18 rows    -- customers (origin + destination)
19. labels                     29 rows    -- products, label_types, auth.users; strain_id = NULL

--- Tier 4: Orders and related ---
20. orders                    132 rows    -- customer_id -> customers
21. order_items               576 rows    -- orders, products; strain_id = NULL, batch_id = NULL
22. order_fulfillment_checklist 576 rows  -- orders, order_items
23. invoices                    3 rows    -- orders, customers
24. coversheets                 5 rows    -- orders
25. package_assignments         2 rows    -- orders, order_items, labels, auth.users

--- Tier 5: CRM activity ---
26. customer_activity_log       3 rows    -- customers, orders (SET NULL for missing), user_profiles;
                                          -- crm_tasks ref = NULL, crm_visit_schedule ref = NULL
27. crm_visit_schedule          1 row     -- customers, user_profiles;
                                          -- linked_activity_id -> customer_activity_log (SET NULL if missing)
```

**4.3 Method:**

For each table, generate INSERT statements from the source database via MCP.
Use `SELECT * FROM table_name` to extract rows, then format as INSERT SQL with
explicit column lists.

Use the `service_role` key for all imports to bypass RLS.

**4.4 Self-Referential Tables:**

Two tables have self-referential FKs that require special handling:

**customers** (`parent_customer_id -> customers.id`):
```sql
-- Step 1: Insert all customers with parent_customer_id = NULL
INSERT INTO customers (id, name, ..., parent_customer_id) VALUES (..., NULL);
-- Step 2: Update parent references
UPDATE customers SET parent_customer_id = '<parent-uuid>' WHERE id = '<child-uuid>';
```

**products** (`replaced_by_product_id -> products.id`):
```sql
-- Step 1: Insert all products with replaced_by_product_id = NULL
INSERT INTO products (id, ..., replaced_by_product_id) VALUES (..., NULL);
-- Step 2: Update replacement references
UPDATE products SET replaced_by_product_id = '<new-id>' WHERE id = '<old-id>';
```

**Verification after Phase 4:**
```sql
SELECT 'orders' AS tbl, COUNT(*) AS cnt FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'order_fulfillment_checklist', COUNT(*) FROM order_fulfillment_checklist
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'labels', COUNT(*) FROM labels
UNION ALL SELECT 'delivery_routes', COUNT(*) FROM delivery_routes
UNION ALL SELECT 'package_assignments', COUNT(*) FROM package_assignments
ORDER BY tbl;
-- Must match: orders=132, order_items=576, order_fulfillment_checklist=576,
-- products=1049, customers=39, app_settings=33, user_profiles=10,
-- labels=29, delivery_routes=18, package_assignments=2
```

### Phase 5 -- Upload Fresh Audit Data

This is the same data upload sequence from v3.4, but into a clean database
with no conflicting test data.

**5.1 Strains**
- Source: Audit spreadsheet strain list
- Required: `id` (uuid), `name`, `display_name`, `abbreviation` (3-letter uppercase), `is_active`
- Optional: `dominance_type`, `thc_range`, `cbd_range`, `terpene_profile`
- Data quality fixes to apply during upload:
  - Dante's Inferno: add `dominance_type`
  - Devil Driver: add `dominance_type`
  - Strawguava: normalize `dominance_type` to proper case, fix category from "unknown"

**5.2 Batch Registry**
- Source: Audit spreadsheet (34 batches)
- Required: `id`, `batch_number` (YYMMDD-XXX), `strain` (text), `strain_id` (FK), `harvest_date`, `lifecycle_state`
- `created_by` should reference a valid auth.users UUID from Phase 3
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
- Critical constraints:
  - `available_qty = on_hand_qty - reserved_qty` (ATP CHECK)
  - `batch_number ~ '^\d{6}-[A-Z]{3,4}$'` (format CHECK)
  - `reserved_qty = 0` for fresh inventory
  - `test_mode = false` for production data

**5.6 Trigger Management for Inventory Upload**

Even in the clean database, these triggers will interfere with direct data loading:

| Trigger | Table | Risk | Action |
|---------|-------|------|--------|
| `set_inventory_batch_number` | inventory_items | Overwrites batch_number with lookup | DISABLE |
| `trg_inventory_item_inherit_strain` | inventory_items | Overwrites strain_id with lookup | DISABLE |
| `trg_inventory_items_update_batch_stage` | inventory_items | Updates batch lifecycle | DISABLE |
| `trigger_inventory_auto_register_batch` | inventory_items | Creates duplicate batches | DISABLE |

```sql
-- Before inventory upload
ALTER TABLE inventory_items DISABLE TRIGGER set_inventory_batch_number;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_item_inherit_strain;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_items_update_batch_stage;
ALTER TABLE inventory_items DISABLE TRIGGER trigger_inventory_auto_register_batch;

-- Upload inventory data here

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

-- Re-link labels
UPDATE labels l
SET strain_id = s.id
FROM strains s
WHERE l.strain_id IS NULL
  AND EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = l.product_id
      AND p.strain_id = s.id
  );
```

**Verification after Phase 6:**
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

**7.2 Build and Deploy:**
- Build with new env vars: `npm run build`
- Deploy to hosting (Vercel/Bolt.new)

**7.3 Edge Functions (4 functions):**

All 4 edge functions must be redeployed to the cult-ops instance:

| Function | JWT Verify | Source | Notes |
|----------|-----------|--------|-------|
| `admin-create-user` | true | `supabase/functions/admin-create-user/index.ts` | In repo |
| `inventory-reset` | true | `supabase/functions/inventory-reset/index.ts` | In repo |
| `slack-notify` | true | Deployed only (not in repo) | Export code from Bolt.new first |
| `slack-order-webhook` | false | Deployed only (not in repo) | Export code from Bolt.new first |

Edge function environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`) are auto-populated per instance.

**Pre-requisite:** Export the `slack-notify` and `slack-order-webhook` function code
from the Bolt.new instance before cutover, since they are not checked into the repository.

**7.4 Storage Buckets:**

| Bucket Name | Public | Action |
|-------------|--------|--------|
| `coa-pdfs` | true | Create on cult-ops |
| `company-assets` | true | Create on cult-ops |

- Upload company logos to `company-assets` bucket
- COA PDFs can be uploaded after go-live

### Phase 8 -- Verification

**8.1 Database Object Counts:**
```sql
-- 1. Table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Must be 94

-- 2. View count
SELECT COUNT(*) FROM information_schema.views
WHERE table_schema = 'public';
-- Must be 70

-- 3. RLS policy count
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Must be 263

-- 4. Enum type count
SELECT COUNT(DISTINCT t.typname)
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public';
-- Must be 6
```

**8.2 Production Data Counts:**
```sql
SELECT 'orders' AS tbl, COUNT(*) AS cnt FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'order_fulfillment_checklist', COUNT(*) FROM order_fulfillment_checklist
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'labels', COUNT(*) FROM labels
UNION ALL SELECT 'delivery_routes', COUNT(*) FROM delivery_routes
UNION ALL SELECT 'package_assignments', COUNT(*) FROM package_assignments
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'coversheets', COUNT(*) FROM coversheets
ORDER BY tbl;
-- Must match source counts exactly
```

**8.3 Fresh Data Integrity:**
```sql
-- 5. Strain count matches audit upload
SELECT COUNT(*) FROM strains WHERE is_active = true;

-- 6. Every batch links to a valid strain
SELECT br.batch_number, br.strain
FROM batch_registry br WHERE br.strain_id IS NULL;
-- Must return 0 rows

-- 7. Every inventory item links to a valid batch
SELECT ii.package_id, ii.product_name
FROM inventory_items ii WHERE ii.batch_id IS NULL;
-- Must return 0 rows

-- 8. ATP constraint health
SELECT id, package_id, on_hand_qty, available_qty, reserved_qty
FROM inventory_items
WHERE available_qty != (on_hand_qty - COALESCE(reserved_qty, 0));
-- Must return 0 rows

-- 9. Batch number format
SELECT id, batch_number FROM batch_registry
WHERE batch_number !~ '^\d{6}-[A-Z]{3,4}$';
-- Must return 0 rows
```

**8.4 Cross-Reference Integrity:**
```sql
-- 10. Order-strain re-link completeness
SELECT COUNT(*) AS unlinked FROM order_items
WHERE strain IS NOT NULL AND strain != '' AND strain_id IS NULL;
-- Must return 0

-- 11. Product-strain re-link completeness
SELECT COUNT(*) AS unlinked FROM products
WHERE strain_name IS NOT NULL AND strain_name != '' AND strain_id IS NULL;
-- Should be 0 or near-0 (some products may legitimately lack strain)

-- 12. COA linkage
SELECT br.batch_number, br.coa_id IS NOT NULL AS has_coa
FROM batch_registry br ORDER BY br.batch_number;

-- 13. No test data leaked
SELECT COUNT(*) FROM inventory_items WHERE test_mode = true;
-- Must return 0

-- 14. Auth user count
SELECT COUNT(*) FROM auth.users;
-- Must be 10

-- 15. order_items batch_id should be NULL (batch_registry not migrated)
SELECT COUNT(*) FROM order_items WHERE batch_id IS NOT NULL;
-- Must be 0 (all NULL-ed during export)

-- 16. Product FK integrity
SELECT COUNT(*) FROM products p
WHERE p.stage_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM product_stages ps WHERE ps.id = p.stage_id);
-- Must return 0
```

**8.5 UI Verification:**
- Log in with existing credentials
- Dashboard loads with correct data
- Order list shows all 132 orders
- Batch list shows 34 batches from audit
- Inventory shows audit counts
- Creating a new session works and auto-links to batches
- COA upload works (storage bucket accessible)
- Delivery route map loads with customer pins

---

## 4. Schema Reference

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

- When two tests exist for same batch, use higher THC%
- Total THC formula: `total_thc = d9_thc + (thca * 0.877)`
- Strain name corrections apply (Super Silver Marker -> Silver Marker, Flava Flav -> Flavor Flav)
- COA PDFs: Upload to cult-ops `coa-pdfs` storage bucket after data upload
- `file_url` in `certificates_of_analysis` stores the storage path

---

## 6. Data Quality Corrections

### 6.1 Strain Name Corrections (Applied During Export)

| Original | Corrected | Affected Tables |
|----------|-----------|-----------------|
| Super Silver Marker | Silver Marker | `order_items.strain`, `products.strain_name` |
| Flava Flav | Flavor Flav | `order_items.strain`, `products.strain_name` |

### 6.2 Other Data Quality Fixes

| # | Fix | Where Applied |
|---|-----|---------------|
| 1 | Dave Low email: `david@cultcannabis.c` -> `david@cultcannabis.co` | Phase 3 auth user creation |
| 2 | Fresh Frozen description: "Fresh Frozdn" -> "Fresh Frozen" | Phase 4 product_types export |
| 3 | Dante's Inferno: add missing `dominance_type` | Phase 5 strain upload |
| 4 | Devil Driver: add missing `dominance_type` | Phase 5 strain upload |
| 5 | Strawguava: fix `dominance_type` case, fix category | Phase 5 strain upload |
| 6 | Earth's Healing ATO: placeholder "4444" | Flag for team -- provide real value |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Schema DDL export misses objects | Low (pg_dump) / Medium (manual) | High | Use pg_dump; verify all 7 object counts after deploy |
| Auth user UUID mismatch | Low | High | Committed to Option A (UUID preservation via admin API) |
| RLS policy blocks data import | Medium | High | Use service_role key for all imports |
| FK constraint violation during import | Low | High | Follow Phase 4 tiered import order strictly |
| Self-referential FK on customers/products | Medium | Medium | Two-pass insert: NULL refs first, then UPDATE |
| user_profiles trigger auto-creates rows | Medium | Low | Use UPSERT for user_profiles import |
| Trigger fires during inventory INSERT | Medium | High | Disable 4 triggers per Phase 5.6 |
| ATP constraint violation on INSERT | Medium | High | Ensure available_qty = on_hand_qty when reserved_qty = 0 |
| Strain name mismatch during re-link | Medium | Medium | Apply Phase 6.1 corrections; verify Phase 6 queries |
| Slack functions not in repo | Medium | Medium | Export code from Bolt.new before cutover |
| Storage bucket permissions | Low | Medium | Configure bucket policies after creation; set public=true |
| Edge function env vars | Low | Medium | Auto-populated on cult-ops; verify with test call |
| Bolt.new instance goes offline | Low | Low | Schema and data already exported; no dependency after cutover |

---

## 8. Execution Checklist

```
[ ] Phase 0: Pre-Flight
    [ ] Verify MCP connection to Bolt.new instance
    [ ] Verify access to cult-ops Supabase dashboard
    [ ] Get cult-ops anon key and service_role key from dashboard
    [ ] Confirm audit spreadsheet is final and reviewed
    [ ] Confirm COA lab CSV is final
    [ ] Export slack-notify function code from Bolt.new
    [ ] Export slack-order-webhook function code from Bolt.new

[ ] Phase 1: Schema Export
    [ ] Export complete DDL via pg_dump --schema-only (preferred)
    [ ] -- OR: Export enums (6), tables (94), views (70), functions (183),
    [ ]        triggers (141), RLS policies (263), indexes (377) via MCP
    [ ] Save as ordered SQL file(s)
    [ ] Verify object counts match source

[ ] Phase 2: Deploy Schema to cult-ops
    [ ] Run DDL in dependency order on cult-ops
    [ ] Verify: tables = 94, views = 70, policies = 263, enums = 6
    [ ] Create coa-pdfs storage bucket (public: true)
    [ ] Create company-assets storage bucket (public: true)

[ ] Phase 3: Auth User Recreation
    [ ] Create 10 auth users with UUID preservation (admin API)
    [ ] Fix Dave's email: david@cultcannabis.co (not .c)
    [ ] Verify: auth.users count = 10

[ ] Phase 4: Import Production Data
    [ ] Apply data quality corrections to export SQL (Section 6)
    [ ] Import Tier 1: 8 reference tables (64 rows)
    [ ] Import Tier 2: 5 core entity tables (1,112 rows)
    [ ]   -- customers: two-pass for parent_customer_id self-ref
    [ ]   -- products: two-pass for replaced_by_product_id self-ref
    [ ]   -- user_profiles: UPSERT if trigger auto-created rows
    [ ] Import Tier 3: 6 dependent tables (73 rows)
    [ ] Import Tier 4: 6 order tables (1,294 rows)
    [ ]   -- order_items: strain_id = NULL, batch_id = NULL
    [ ] Import Tier 5: 2 CRM tables (4 rows)
    [ ] Verify row counts for all 27 tables

[ ] Phase 5: Upload Fresh Audit Data
    [ ] 5.1: Upload strains from audit spreadsheet (with data quality fixes)
    [ ] 5.2: Upload batch_registry (34 batches)
    [ ] 5.3: Upload certificates_of_analysis from lab CSV
    [ ] 5.4: Backfill batch_registry.coa_id
    [ ] 5.5: Disable 4 inventory triggers
    [ ] 5.5: Upload inventory_items from audit
    [ ] 5.5: Re-enable 4 inventory triggers

[ ] Phase 6: Re-Link Preserved Data
    [ ] Re-link order_items.strain_id to new strain UUIDs
    [ ] Re-link products.strain_id to new strain UUIDs
    [ ] Re-link labels.strain_id via product lookup
    [ ] Verify no unmatched rows

[ ] Phase 7: Environment Cutover
    [ ] Update .env with cult-ops URL and anon key
    [ ] npm run build passes
    [ ] Deploy to hosting
    [ ] Deploy edge function: admin-create-user
    [ ] Deploy edge function: inventory-reset
    [ ] Deploy edge function: slack-notify
    [ ] Deploy edge function: slack-order-webhook (verifyJWT: false)
    [ ] Upload logos to company-assets storage bucket
    [ ] Upload COA PDFs to coa-pdfs bucket (can be post-go-live)

[ ] Phase 8: Verification
    [ ] Run all 16 verification queries (Section 8.1-8.4)
    [ ] Log in and verify dashboard loads
    [ ] Verify orders list (132 orders)
    [ ] Verify batch list (34 batches)
    [ ] Verify inventory counts match audit
    [ ] Verify delivery routes display on map
    [ ] Test creating a new session
    [ ] Test COA upload (storage accessible)
    [ ] NOTIFY pgrst, 'reload schema'
    [ ] Monitor for 24 hours
```

---

## 9. Environment Reference

| Resource | Bolt.new (Source) | cult-ops (Target) |
|----------|-------------------|-------------------|
| Supabase URL | `https://fonreynkfeqywshijqpi.supabase.co` | `https://fhjcvdimdgzwrijotmxg.supabase.co` |
| Project Ref | `fonreynkfeqywshijqpi` | `fhjcvdimdgzwrijotmxg` |
| Dashboard | Not directly accessible | `https://supabase.com/dashboard/project/fhjcvdimdgzwrijotmxg` |
| COA Bucket | `coa-pdfs` | `coa-pdfs` (create) |
| Assets Bucket | `company-assets` | `company-assets` (create) |
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

1. Upload remaining COA PDFs to cult-ops `coa-pdfs` storage bucket
2. Run `npm run types:generate` against cult-ops to regenerate database types
3. Update `vercel.json` or deployment config if applicable
4. Update Earth's Healing ATO number from placeholder "4444" to real value
5. Consider archiving Bolt.new instance (do not delete -- keep as historical backup)
6. `NOTIFY pgrst, 'reload schema'` if views are stale

---

## Appendix A: v3.4 and v4.0 Reference

The prior plans remain in this directory as reference:
- `GO-LIVE-PLAN-v3.4.md` -- FK ordering, trigger inventory, core table schemas
- `GO-LIVE-PLAN-v4.0.md` -- Original schema-first migration plan

Key reference sections:
- v3.4 Section 2.2: FK blocking relationships (RESTRICT and NO ACTION)
- v3.4 Section 3.3: Core table column quick-reference
- v3.4 Section 5: Complete trigger inventory for inventory_items and inventory_movements

## Appendix B: Complete FK Dependency Graph for Migrating Tables

Extracted from live database March 2, 2026:

```
customers.parent_customer_id        -> customers.id              (SET NULL)
products.stage_id                   -> product_stages.id         (NO ACTION)
products.type_id                    -> product_types.id          (NO ACTION)
products.strain_id                  -> strains.id                (NO ACTION)
products.replaced_by_product_id     -> products.id               (NO ACTION)
user_profiles.id                    -> auth.users.id             (CASCADE)
grow_rooms.created_by               -> auth.users.id             (NO ACTION)
dry_rooms.created_by                -> auth.users.id             (NO ACTION)
room_tables.grow_room_id            -> grow_rooms.id             (CASCADE)
room_tables.created_by              -> auth.users.id             (NO ACTION)
room_sections.room_table_id         -> room_tables.id            (?)
room_sections.created_by            -> auth.users.id             (?)
quality_grade_history.previous_grade_id -> quality_grades.id     (?)
quality_grade_history.new_grade_id  -> quality_grades.id         (?)
quality_grade_history.changed_by    -> auth.users.id             (?)
delivery_routes.origin_customer_id  -> customers.id              (CASCADE)
delivery_routes.destination_customer_id -> customers.id          (CASCADE)
labels.product_id                   -> products.id               (NO ACTION)
labels.strain_id                    -> strains.id                (NO ACTION)
labels.label_type_id                -> label_types.id            (NO ACTION)
labels.voided_by                    -> auth.users.id             (NO ACTION)
orders.customer_id                  -> customers.id              (RESTRICT)
order_items.order_id                -> orders.id                 (CASCADE)
order_items.product_id              -> products.id               (RESTRICT)
order_items.strain_id               -> strains.id                (RESTRICT)
order_items.batch_id                -> batch_registry.id         (SET NULL)
order_fulfillment_checklist.order_id     -> orders.id            (CASCADE)
order_fulfillment_checklist.order_item_id -> order_items.id      (CASCADE)
invoices.order_id                   -> orders.id                 (CASCADE)
invoices.customer_id                -> customers.id              (NO ACTION)
coversheets.order_id                -> orders.id                 (CASCADE)
package_assignments.order_id        -> orders.id                 (CASCADE)
package_assignments.order_item_id   -> order_items.id            (CASCADE)
package_assignments.label_id        -> labels.id                 (SET NULL)
package_assignments.assigned_by     -> auth.users.id             (NO ACTION)
customer_activity_log.customer_id   -> customers.id              (CASCADE)
customer_activity_log.linked_order_id -> orders.id               (SET NULL)
customer_activity_log.user_id       -> user_profiles.id          (SET NULL)
customer_activity_log.linked_task_id -> crm_tasks.id             (SET NULL)
customer_activity_log.visit_id      -> crm_visit_schedule.id     (SET NULL)
crm_visit_schedule.customer_id      -> customers.id              (?)
crm_visit_schedule.user_id          -> user_profiles.id          (?)
crm_visit_schedule.linked_activity_id -> customer_activity_log.id (?)
```
