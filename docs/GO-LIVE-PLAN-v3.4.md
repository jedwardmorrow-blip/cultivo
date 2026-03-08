# CultOps Go-Live Plan

**Version 3.4 -- Corrected Soft-Reset with Order/Product Preservation**
**Target: Monday, March 3, 2026**
**Prepared: March 2, 2026**

> This plan supersedes v3.1 and v3.2 (`.docx` files in this directory). All SQL errors,
> missing tables, incorrect FK behaviors, and row count discrepancies from those versions
> have been corrected. This is the single source of truth for go-live execution.

---

## Change Log from v3.2

| # | Category | What Changed | Why |
|---|----------|-------------|-----|
| 1 | SQL error | `products.strain` corrected to `products.strain_name` | Column does not exist; re-link UPDATE would fail |
| 2 | SQL error | `individual_plants` FK path corrected (goes through `plant_groups`, not directly to `strains`) | DELETE would miss intermediate table |
| 3 | Row count | `order_items` corrected from 498 to **576** | Live DB shows 576 rows |
| 4 | Row count | `certificates_of_analysis` corrected from 0 to **20** | 20 COAs now exist |
| 5 | FK behavior | `harvest_sessions.batch_registry_id` is **NO ACTION**, not SET NULL | DELETE of batch_registry would fail if harvest_sessions not cleared first |
| 6 | FK behavior | `batch_registry.strain_id` is **RESTRICT** | Cannot delete strains while batch_registry rows reference them |
| 7 | FK behavior | `products.strain_id` is **NO ACTION** (not RESTRICT as stated in v3.2) | Still blocks delete, but different error message |
| 8 | FK behavior | `labels.strain_id` is **NO ACTION** | Must clear labels before deleting strains |
| 9 | FK behavior | `plant_groups.strain_id` is **NO ACTION** | Must clear plant_groups before deleting strains |
| 10 | Missing tables | Added 12 tables to Phase B delete sequence (see Section 4.2) | v3.2 only had 15; actual FK graph requires 27 |
| 11 | New phase | Added **Phase A.5** for data cleanup before reset | NULL strain text, naming corrections, legacy product archival |
| 12 | Triggers | Added trigger management section (Section 5) | 8 triggers on `inventory_items` and 4 on `inventory_movements` must be disabled during upload |
| 13 | ATP constraint | Documented `chk_atp_consistency` CHECK constraint | `available_qty = on_hand_qty - COALESCE(reserved_qty, 0)` is a hard CHECK, not a trigger |
| 14 | Verification | Updated verification queries for NULL strain text on legacy records | Some records legitimately have NULL strain after SET NULL |

---

## 1. Architecture Discovery

The CultOps application running on Bolt.new uses a Bolt.new-provisioned Supabase instance,
NOT the projects visible in the user's Supabase dashboard.

### 1.1 Three Supabase Instances

| Instance | Project Ref | Status | Tables |
|----------|-------------|--------|--------|
| cult-ops (Dashboard) | fhjcvdimdgzwrijotmxg | EMPTY | 0 |
| cult-ops-dev (Dashboard) | uayyhluztelnfxfvdhyt | EMPTY | 0 |
| Bolt.new Instance (LIVE) | fonreynkfeqywshijqpi | **ACTIVE** | 95 |

The Bolt.new instance (`fonreynkfeqywshijqpi`) is the ONLY instance with data and schema.

---

## 2. Live Database State (as of March 2, 2026)

### 2.1 Row Counts (Tables with Data)

| Table | Rows | Data Type | Reset Action |
|-------|------|-----------|-------------|
| products | 1,049 | **REAL** | PRESERVE (SET NULL strain_id) |
| order_fulfillment_checklist | 576 | **REAL** | PRESERVE (CASCADE from orders) |
| order_items | 576 | **REAL** | PRESERVE (SET NULL strain_id, batch_id) |
| route_waypoints | 236 | Test | CASCADE from delivery_routes |
| inventory_movements | 227 | Test | DELETE |
| batch_id_backfill_log | 185 | Test | DELETE |
| individual_plants | 153 | Test | DELETE (via plant_groups) |
| orders | 132 | **REAL** | PRESERVE |
| batch_stage_tracking | 129 | Test | CASCADE from batch_registry |
| inventory_items | 122 | Test | DELETE |
| internal_bulk_inventory | 100 | Test | DELETE |
| internal_bucked_inventory | 74 | Test | DELETE |
| consolidated_package_sources | 71 | Test | CASCADE from consolidated_packages |
| batch_registry | 62 | Test | DELETE |
| conversion_packages | 60 | Test | DELETE (RESTRICT FK -- must delete before batch_registry) |
| consolidated_packages | 57 | Test | DELETE |
| batch_lifecycle_events | 54 | Test | CASCADE from batch_registry |
| strains | 43 | Mixed | DELETE and re-upload |
| strain_metadata | 41 | Test | DELETE |
| customers | 39 | **REAL** | PRESERVE |
| bucking_sessions | 36 | Test | DELETE |
| app_settings | 33 | **REAL** | PRESERVE |
| trim_sessions | 31 | Test | DELETE |
| labels | 29 | Test | DELETE |
| certificates_of_analysis | 20 | Test | DELETE |
| delivery_routes | 18 | Test | DELETE |
| packaging_sessions | 16 | Test | DELETE |
| plant_group_stage_history | 16 | Test | DELETE |
| product_types | 14 | **REAL** | PRESERVE |
| inventory_snapshots | 13 | Test | DELETE |
| variance_log | 12 | Test | DELETE |
| plant_groups | 11 | Test | DELETE |
| harvest_weight_entries | 11 | Test | CASCADE from harvest_sessions |
| grow_rooms | 11 | **REAL** | PRESERVE |
| user_profiles | 10 | **REAL** | PRESERVE |
| inventory_internal_labels | 9 | Test | DELETE |
| notification_preferences | 9 | **REAL** | PRESERVE |
| room_sections | 8 | **REAL** | PRESERVE |
| quality_grade_history | 8 | **REAL** | PRESERVE |
| internal_packaged_inventory | 8 | Test | DELETE |
| strain_aliases | 6 | Test | CASCADE from strains |
| quality_grades | 5 | **REAL** | PRESERVE |
| coversheets | 5 | Test | CASCADE from orders (if any test orders removed) |
| label_types | 4 | **REAL** | PRESERVE |
| plant_group_room_history | 4 | Test | DELETE |
| product_stages | 4 | **REAL** | PRESERVE |
| inventory_variances | 4 | Test | DELETE |
| customer_activity_log | 3 | **REAL** | PRESERVE |
| dry_rooms | 3 | **REAL** | PRESERVE |
| invoices | 3 | **REAL** | CASCADE from orders |
| batch_production_history | 2 | Test | CASCADE from batch_registry |
| harvest_sessions | 2 | Test | DELETE |
| plant_group_cut_sessions | 2 | Test | DELETE |
| package_assignments | 2 | Test | DELETE |
| delivery_drivers | 1 | **REAL** | PRESERVE |
| delivery_vehicles | 1 | **REAL** | PRESERVE |
| crm_visit_schedule | 1 | **REAL** | PRESERVE |
| conversion_variance_log | 1 | Test | DELETE (RESTRICT FK -- must delete before batch_registry) |
| room_tables | 1 | **REAL** | PRESERVE |

### 2.2 Critical Finding: RESTRICT and NO ACTION FKs Block Strain Deletion

Six tables hold blocking foreign keys to `strains.id`:

| Child Table | FK Column | Delete Rule | Rows | Strategy |
|-------------|-----------|-------------|------|----------|
| batch_registry | strain_id | **RESTRICT** | 62 | DELETE rows in Phase B |
| order_items | strain_id | **RESTRICT** | 576 | SET NULL in Phase A |
| internal_bucked_inventory | strain_id | **RESTRICT** | 74 | DELETE rows in Phase B |
| internal_bulk_inventory | strain_id | **RESTRICT** | 100 | DELETE rows in Phase B |
| products | strain_id | **NO ACTION** | 1,049 | SET NULL in Phase A |
| labels | strain_id | **NO ACTION** | 29 | DELETE rows in Phase B |
| plant_groups | strain_id | **NO ACTION** | 11 | DELETE rows in Phase B |
| packaging_sessions | strain_id | SET NULL | 16 | Auto-nulled on strain delete |
| trim_sessions | strain_id | SET NULL | 31 | Auto-nulled on strain delete |

### 2.3 Batch Lifecycle States (sample)

| Batch # | Strain | Harvest | Lifecycle | Has COA |
|---------|--------|---------|-----------|---------|
| 260225-DON | Donny Burger | -- | pre_harvest | No |
| 260220-DIF | Dante's Inferno | 2026-02-20 | created | No |
| 260220-STP | Stay Puft | 2026-02-20 | created | No |
| 260105-DIF | Dante's Inferno | -- | pre_harvest | No |
| 260112-CHL | Chemlatto | -- | pre_harvest | No |

---

## 3. Corrected Schema Reference

### 3.1 Schema Corrections vs. Previous Plans

| Table.Column | v3.1/v3.2 Assumed | Actual (Live) | Impact |
|-------------|-------------------|---------------|--------|
| batch_registry.batch_number | `batch_id` | `batch_number` | All SQL must use `batch_number` |
| batch_registry.strain | `strain_name` | `strain` | Column name is `strain` (text field) |
| certificates_of_analysis.strain_name | -- | `strain_name` | COA table uses `strain_name` (different from batch_registry) |
| products.strain_name | `strain` (v3.2) | `strain_name` | Re-link UPDATE must use `products.strain_name` |
| inventory_items.batch_id | nullable | **NOT NULL** (enforced by app) | Every item MUST link to a batch |
| inventory_items.test_mode | -- | `boolean NOT NULL DEFAULT false` | Must set to `false` for production |
| inventory_items.reserved_qty | -- | `numeric NOT NULL DEFAULT 0` | Must provide, used in ATP check |
| inventory_items.available_qty | computed | `CHECK (available_qty = on_hand_qty - COALESCE(reserved_qty, 0))` | Hard constraint, not trigger |
| strains.name | name only | `name` + `display_name` | Both fields required |
| strains.abbreviation | required | **NULLABLE** | DB allows null, but app requires 3-letter code |
| strains.is_active | -- | `boolean NOT NULL DEFAULT true` | Cannot be null |

### 3.2 Upload Order (Respecting Foreign Keys)

```
1. strains              -- No FK dependencies
2. batch_registry       -- FK to strains.id
3. certificates_of_analysis -- FK to batch_registry.id
4. UPDATE batch_registry SET coa_id = ...  -- Backfill bidirectional link
5. inventory_items      -- FK to batch_registry.id, strains.id
```

### 3.3 Core Table Column Quick-Reference

**batch_registry:**
- `id` (uuid PK), `batch_number` (text UNIQUE, format `YYMMDD-XXX`), `strain` (text),
  `strain_id` (uuid FK -> strains RESTRICT), `harvest_date` (date), `initial_weight_grams` (numeric),
  `lifecycle_state` (text CHECK), `is_quarantined` (boolean), `coa_id` (uuid FK -> coa SET NULL),
  `quality_grade_id` (uuid FK -> quality_grades NO ACTION), `created_by` (uuid),
  `created_at`/`updated_at` (timestamptz)

**certificates_of_analysis:**
- `id` (uuid PK), `batch_id` (uuid FK -> batch_registry SET NULL), `strain_name` (text),
  `harvest_date` (date), `thc_percentage` (numeric), `cbd_percentage` (numeric),
  `total_thc` (numeric), `total_cbd` (numeric), `terpene_profile` (jsonb),
  `lab_name` (text), `test_date` (date), `file_url` (text), `status` (text),
  `created_at` (timestamptz)

**inventory_items:**
- `id` (uuid PK), `package_id` (text, CHECK length >= 5), `product_name` (text),
  `strain` (text), `strain_id` (uuid FK -> strains SET NULL),
  `batch_id` (uuid FK -> batch_registry SET NULL), `batch_number` (text, CHECK format),
  `stage` (text), `category` (text), `on_hand_qty` (numeric), `available_qty` (numeric),
  `reserved_qty` (numeric NOT NULL DEFAULT 0), `unit_type` (text),
  `quality_grade_id` (uuid FK -> quality_grades NO ACTION),
  `parent_item_id` (uuid FK -> self SET NULL), `test_mode` (boolean NOT NULL DEFAULT false),
  `created_at`/`updated_at` (timestamptz)
  - **CHECK:** `chk_atp_consistency`: `available_qty = on_hand_qty - COALESCE(reserved_qty, 0)`
  - **CHECK:** `batch_number_format_check`: `batch_number ~ '^\d{6}-[A-Z]{3,4}$'`
  - **CHECK:** `batch_number_required_with_batch_id`: batch_id present => batch_number present

**strains:**
- `id` (uuid PK), `name` (text NOT NULL), `display_name` (text NOT NULL),
  `abbreviation` (text, nullable), `dominance_type` (text), `thc_range` (text),
  `cbd_range` (text), `description` (text), `terpene_profile` (jsonb DEFAULT '{}'),
  `is_active` (boolean NOT NULL DEFAULT true), `created_at`/`updated_at` (timestamptz)

---

## 4. Migration Strategy: Soft-Reset with Order/Product Preservation

### 4.1 Why Soft-Reset (not Full Reset)

- Orders (132), order_items (576), customers (39) are **real production data** -- must preserve
- Products (1,049) contain pricing, SKUs, and catalog data -- must preserve
- App settings, grow rooms, dry rooms, quality grades -- must preserve
- All session/inventory/batch data is from development/testing -- safe to delete
- Strains must be re-uploaded with correct abbreviations and metadata

### 4.2 Execution Phases

#### Phase A -- Detach Real Data from Old Strain UUIDs

```sql
-- Null out strain_id on order_items (576 rows, RESTRICT FK)
UPDATE order_items SET strain_id = NULL WHERE strain_id IS NOT NULL;

-- Null out strain_id on products (1,049 rows, NO ACTION FK)
UPDATE products SET strain_id = NULL WHERE strain_id IS NOT NULL;
```

**Verification after Phase A:**
```sql
SELECT COUNT(*) FROM order_items WHERE strain_id IS NOT NULL;  -- must be 0
SELECT COUNT(*) FROM products WHERE strain_id IS NOT NULL;      -- must be 0
```

#### Phase A.5 -- Data Cleanup (Before Reset)

Fix data quality issues discovered during audit analysis:

```sql
-- 1. Fix "Super Silver Marker" -> "Silver Marker" in any text fields
UPDATE order_items SET strain = 'Silver Marker' WHERE strain = 'Super Silver Marker';
UPDATE products SET strain_name = 'Silver Marker' WHERE strain_name = 'Super Silver Marker';
UPDATE batch_registry SET strain = 'Silver Marker' WHERE strain = 'Super Silver Marker';

-- 2. Fix "Flava Flav" -> "Flavor Flav" if present
UPDATE order_items SET strain = 'Flavor Flav' WHERE strain = 'Flava Flav';
UPDATE products SET strain_name = 'Flavor Flav' WHERE strain_name = 'Flava Flav';
UPDATE batch_registry SET strain = 'Flavor Flav' WHERE strain = 'Flavor Flav';

-- 3. Archive legacy products with no strain linkage (optional, post-reset)
-- This will be done AFTER re-link in Phase E
```

#### Phase B -- FK-Ordered DELETE (27 tables)

Tables are ordered so that child rows are deleted before parent rows. CASCADE
relationships are noted where Postgres handles the deletion automatically.

```sql
-- Layer 1: Leaf tables (no children depend on these)
DELETE FROM package_assignments;             -- 2 rows (FK -> order_items CASCADE, labels SET NULL)
DELETE FROM product_labels;                  -- 0 rows (FK -> package_assignments CASCADE)
DELETE FROM inventory_audit_lines;           -- 0 rows (FK -> inventory_audits CASCADE, inventory_items SET NULL)
DELETE FROM inventory_variances;             -- 4 rows
DELETE FROM inventory_reconciliation;        -- 3 rows
DELETE FROM inventory_snapshots;             -- 13 rows
DELETE FROM inventory_internal_labels;       -- 9 rows
DELETE FROM batch_id_backfill_log;           -- 185 rows

-- Layer 2: Tables referencing inventory_items
DELETE FROM variance_log;                    -- 12 rows (FK -> inventory_items SET NULL)
DELETE FROM inventory_movements;             -- 227 rows (FK -> inventory_items SET NULL)

-- Layer 3: Inventory items (self-referencing parent_item_id)
DELETE FROM inventory_items;                 -- 122 rows

-- Layer 4: Session-dependent tables
DELETE FROM internal_packaged_inventory;     -- 8 rows (FK -> packaging_sessions NO ACTION)
DELETE FROM internal_bucked_inventory;       -- 74 rows (FK -> strains RESTRICT)
DELETE FROM internal_bulk_inventory;         -- 100 rows (FK -> strains RESTRICT)
DELETE FROM inventory_conversions;           -- 0 rows (FK -> trim_sessions CASCADE)
DELETE FROM consolidated_package_sources;    -- 71 rows (FK -> consolidated_packages CASCADE)
DELETE FROM consolidated_packages;           -- 57 rows

-- Layer 5: Sessions (FK -> batch_registry various rules)
DELETE FROM conversion_packages;             -- 60 rows (FK -> batch_registry RESTRICT)
DELETE FROM conversion_variance_log;         -- 1 row (FK -> batch_registry RESTRICT)
DELETE FROM labels;                          -- 29 rows (FK -> strains NO ACTION)
DELETE FROM trim_sessions;                   -- 31 rows (FK -> batch_registry SET NULL, strains SET NULL)
DELETE FROM packaging_sessions;              -- 16 rows (FK -> batch_registry SET NULL, strains SET NULL)
DELETE FROM bucking_sessions;               -- 36 rows (FK -> batch_registry SET NULL)

-- Layer 6: Cultivation (must clear before batch_registry due to NO ACTION FKs)
DELETE FROM individual_plants;               -- 153 rows (FK -> plant_groups NO ACTION)
DELETE FROM plant_group_cut_sessions;        -- 2 rows (FK -> plant_groups CASCADE/NO ACTION)
DELETE FROM plant_group_stage_history;       -- 16 rows (FK -> plant_groups NO ACTION)
DELETE FROM plant_group_room_history;        -- 4 rows (FK -> plant_groups NO ACTION, grow_rooms NO ACTION)
DELETE FROM harvest_weight_entries;          -- 11 rows (FK -> harvest_sessions CASCADE)
DELETE FROM binning_sessions;                -- 0 rows (FK -> harvest_sessions NO ACTION, batch_registry NO ACTION)
DELETE FROM harvest_sessions;                -- 2 rows (FK -> plant_groups NO ACTION, batch_registry NO ACTION)
DELETE FROM plant_groups;                    -- 11 rows (FK -> batch_registry NO ACTION, strains NO ACTION)

-- Layer 7: Batch ecosystem
DELETE FROM batch_stage_tracking;            -- 129 rows (FK -> batch_registry CASCADE)
DELETE FROM batch_lifecycle_events;          -- 54 rows (FK -> batch_registry CASCADE)
DELETE FROM batch_production_history;        -- 2 rows (FK -> batch_registry CASCADE)
DELETE FROM certificates_of_analysis;        -- 20 rows (FK -> batch_registry SET NULL)
DELETE FROM strain_metadata;                 -- 41 rows
DELETE FROM batch_registry;                  -- 62 rows

-- Layer 8: Delivery (test routes only)
DELETE FROM route_waypoints;                 -- 236 rows (FK -> delivery_routes CASCADE)
DELETE FROM delivery_routes;                 -- 18 rows
```

**Verification after Phase B:**
```sql
-- All these must return 0
SELECT COUNT(*) FROM inventory_items;
SELECT COUNT(*) FROM batch_registry;
SELECT COUNT(*) FROM trim_sessions;
SELECT COUNT(*) FROM packaging_sessions;
SELECT COUNT(*) FROM bucking_sessions;
SELECT COUNT(*) FROM certificates_of_analysis;
SELECT COUNT(*) FROM inventory_movements;
SELECT COUNT(*) FROM plant_groups;
SELECT COUNT(*) FROM harvest_sessions;
```

#### Phase C -- Delete and Re-Upload Strains

```sql
-- Now safe: all RESTRICT/NO ACTION children cleared or SET NULL'd
DELETE FROM strain_aliases;  -- 6 rows (FK -> strains CASCADE, but explicit for clarity)
DELETE FROM strains;         -- 43 rows
```

**Verification:**
```sql
SELECT COUNT(*) FROM strains;  -- must be 0
```

#### Phase D -- Upload Fresh Data

Order of uploads (respecting FK dependencies):

**D.1: Strains**
- Source: Audit spreadsheet strain list
- Required fields: `id` (uuid), `name`, `display_name`, `abbreviation` (3-letter uppercase), `is_active`
- Optional: `dominance_type`, `thc_range`, `cbd_range`, `terpene_profile`

**D.2: Batch Registry**
- Source: Audit spreadsheet (34 batches)
- Required fields: `id` (uuid), `batch_number` (YYMMDD-XXX), `strain` (text), `strain_id` (FK to new strain uuid), `harvest_date`, `lifecycle_state`
- `initial_weight_grams`: First harvest weight only
- Lifecycle states: Set based on current processing status (most will be `created` or `bucked`)

**D.3: Certificates of Analysis**
- Source: COA lab CSV (42 unique batches, 51 tests)
- Required fields: `id` (uuid), `batch_id` (FK to new batch uuid), `strain_name`, `thc_percentage`, `total_thc`
- Rule: When two tests exist for same batch, use higher THC%
- Formula: `total_thc = d9_thc + (thca * 0.877)`

**D.4: Backfill batch_registry.coa_id**
```sql
UPDATE batch_registry br
SET coa_id = coa.id
FROM certificates_of_analysis coa
WHERE coa.batch_id = br.id
  AND br.coa_id IS NULL;
```

**D.5: Inventory Items** (see Section 5 for trigger management)
- Source: Audit spreadsheet (131 Binned + 5 Bucked + any Packaged)
- Required fields: `id`, `package_id`, `product_name`, `strain`, `strain_id`, `batch_id`, `batch_number`, `stage`, `category`, `on_hand_qty`, `available_qty`, `reserved_qty`, `unit_type`, `test_mode`
- **Critical constraints:**
  - `available_qty = on_hand_qty - reserved_qty` (ATP CHECK)
  - `batch_number ~ '^\d{6}-[A-Z]{3,4}$'` (format CHECK)
  - `reserved_qty` defaults to 0 for fresh inventory
  - `test_mode = false` for production data
  - Provide `batch_id` UUID directly (not batch_number) to avoid trigger conflicts

#### Phase E -- Re-Link Preserved Data

After strains are uploaded, restore strain_id references on preserved tables:

```sql
-- Re-link order_items (uses 'strain' text column to match):
UPDATE order_items oi
SET strain_id = s.id
FROM strains s
WHERE oi.strain = s.name
  AND oi.strain_id IS NULL;

-- Re-link products (uses 'strain_name' text column to match):
UPDATE products p
SET strain_id = s.id
FROM strains s
WHERE p.strain_name = s.name
  AND p.strain_id IS NULL;
```

**Verification after Phase E:**
```sql
-- Check for unmatched order_items (should only be items with no strain)
SELECT DISTINCT oi.strain
FROM order_items oi
WHERE oi.strain IS NOT NULL
  AND oi.strain != ''
  AND oi.strain_id IS NULL;
-- Must return 0 rows

-- Check for unmatched products (may have legacy products without strains)
SELECT DISTINCT p.strain_name
FROM products p
WHERE p.strain_name IS NOT NULL
  AND p.strain_name != ''
  AND p.strain_id IS NULL;
-- Review any results -- may need name corrections or are legitimately non-strain products
```

#### Phase F -- Verification

```sql
-- 1. Strain count matches upload
SELECT COUNT(*) FROM strains WHERE is_active = true;

-- 2. Every batch links to a valid strain
SELECT br.batch_number, br.strain
FROM batch_registry br
WHERE br.strain_id IS NULL;
-- Must return 0 rows

-- 3. Every inventory item links to a valid batch
SELECT ii.package_id, ii.product_name
FROM inventory_items ii
WHERE ii.batch_id IS NULL;
-- Must return 0 rows

-- 4. ATP constraint health
SELECT id, package_id, on_hand_qty, available_qty, reserved_qty,
  (on_hand_qty - COALESCE(reserved_qty, 0)) AS expected_available
FROM inventory_items
WHERE available_qty != (on_hand_qty - COALESCE(reserved_qty, 0));
-- Must return 0 rows

-- 5. Batch number format
SELECT id, batch_number
FROM batch_registry
WHERE batch_number !~ '^\d{6}-[A-Z]{3,4}$';
-- Must return 0 rows

-- 6. Inventory batch_number format
SELECT id, package_id, batch_number
FROM inventory_items
WHERE batch_number !~ '^\d{6}-[A-Z]{3,4}$';
-- Must return 0 rows

-- 7. COA linkage
SELECT br.batch_number, br.coa_id IS NOT NULL AS has_coa
FROM batch_registry br
ORDER BY br.batch_number;

-- 8. Order-strain re-link completeness
SELECT COUNT(*) AS unlinked_order_items
FROM order_items
WHERE strain IS NOT NULL AND strain != '' AND strain_id IS NULL;
-- Must return 0

-- 9. Product-strain re-link completeness
SELECT COUNT(*) AS unlinked_products
FROM products
WHERE strain_name IS NOT NULL AND strain_name != '' AND strain_id IS NULL;
-- Review results (some products may legitimately lack strain)
```

---

## 5. Trigger Management During Upload

### 5.1 Triggers on `inventory_items` (8 custom triggers)

| Trigger | Timing | Event | Purpose | Impact on Upload |
|---------|--------|-------|---------|-----------------|
| `set_inventory_batch_number` | BEFORE | INSERT/UPDATE | Auto-populates batch_number from batch_registry | **DISABLE** -- we provide batch_number directly |
| `trg_auto_set_inventory_category` | BEFORE | INSERT/UPDATE | Sets category from stage | May help -- evaluate if category is in upload data |
| `trg_block_direct_quantity_updates` | BEFORE | UPDATE | Prevents direct qty changes | Safe for INSERT, blocks manual corrections |
| `trg_inventory_item_inherit_strain` | BEFORE | INSERT/UPDATE | Copies strain_id from batch_registry | **DISABLE** -- we provide strain_id directly |
| `trg_inventory_items_update_batch_stage` | AFTER | INSERT/UPDATE/DELETE | Updates batch lifecycle_state | **DISABLE** -- batch lifecycle already set in upload |
| `trg_prevent_batch_id_update` | BEFORE | INSERT/UPDATE | Prevents batch_id changes after creation | Safe for INSERT |
| `trigger_inventory_auto_register_batch` | AFTER | INSERT/UPDATE | Auto-creates batch if not exists | **DISABLE** -- batches already uploaded |

### 5.2 Triggers on `inventory_movements` (4 custom triggers)

| Trigger | Timing | Event | Purpose | Impact on Upload |
|---------|--------|-------|---------|-----------------|
| `trg_check_quarantine_before_movement` | BEFORE | INSERT | Blocks movements on quarantined batches | N/A -- no movements during upload |
| `trg_update_inventory_on_hand` | AFTER | INSERT | Updates inventory_items balances | N/A -- no movements during upload |
| `trg_validate_movement` | BEFORE | INSERT | Validates movement fields | N/A -- no movements during upload |
| `trg_validate_movement_item_ids` | BEFORE | INSERT | Validates item references | N/A -- no movements during upload |

### 5.3 Trigger Disable/Enable Sequence

**Before inventory upload:**
```sql
-- Disable triggers that interfere with direct data loading
ALTER TABLE inventory_items DISABLE TRIGGER set_inventory_batch_number;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_item_inherit_strain;
ALTER TABLE inventory_items DISABLE TRIGGER trg_inventory_items_update_batch_stage;
ALTER TABLE inventory_items DISABLE TRIGGER trigger_inventory_auto_register_batch;
```

**After inventory upload completes:**
```sql
-- Re-enable all triggers
ALTER TABLE inventory_items ENABLE TRIGGER set_inventory_batch_number;
ALTER TABLE inventory_items ENABLE TRIGGER trg_inventory_item_inherit_strain;
ALTER TABLE inventory_items ENABLE TRIGGER trg_inventory_items_update_batch_stage;
ALTER TABLE inventory_items ENABLE TRIGGER trigger_inventory_auto_register_batch;
```

### 5.4 Constraints That Cannot Be Disabled

The following CHECK constraints are always enforced and the upload data must satisfy them:

| Constraint | Table | Rule |
|-----------|-------|------|
| `chk_atp_consistency` | inventory_items | `available_qty = on_hand_qty - COALESCE(reserved_qty, 0)` |
| `batch_number_format_check` | inventory_items | `batch_number ~ '^\d{6}-[A-Z]{3,4}$'` |
| `batch_number_required_with_batch_id` | inventory_items | `batch_id IS NOT NULL => batch_number IS NOT NULL` |
| `inventory_items_package_id_format` | inventory_items | `length(package_id) >= 5` |

---

## 6. COA Handling

### 6.1 COA Data Sources

| Source | Records | Notes |
|--------|---------|-------|
| Lab CSV | 51 tests across 42 unique batches | THC%, CBD%, terpene profiles |

### 6.2 COA Rules

- When two tests exist for the same batch, use the **higher THC%**
- Total THC formula: `total_thc = d9_thc + (thca * 0.877)`
- Strain name corrections apply (Super Silver Marker -> Silver Marker, Flava Flav -> Flavor Flav)
- COA PDFs: Upload to Supabase Storage `coa-documents` bucket separately after data upload
- The `file_url` field in `certificates_of_analysis` stores the storage path

### 6.3 COA-Batch Bidirectional Link

After COA records are inserted:
```sql
-- Link batch_registry.coa_id to the COA record
UPDATE batch_registry br
SET coa_id = coa.id
FROM certificates_of_analysis coa
WHERE coa.batch_id = br.id
  AND br.coa_id IS NULL;
```

---

## 7. Data Preparation Summary

| Source | Records | Contents |
|--------|---------|----------|
| Audit Spreadsheet | ~131 | Binned inventory (physical counts) |
| Audit Spreadsheet | ~5 | Bucked flower weights |
| Audit Spreadsheet | ~34 | Batch registry with harvest dates |
| COA Lab CSV | 51 tests / 42 batches | THC%, CBD%, terpene profiles |

### 7.1 Strain Name Corrections

| Original | Corrected |
|----------|-----------|
| Super Silver Marker | Silver Marker |
| Flava Flav | Flavor Flav |

### 7.2 Batch Number Format

`YYMMDD-XXX` where XXX is a 3-letter uppercase strain abbreviation.

Examples: `260220-DIF` (Dante's Inferno), `260225-DON` (Donny Burger)

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| RLS policy blocks upload | Medium | High | Use service_role key or temporarily adjust policies |
| FK constraint violation during DELETE | Medium | High | Follow exact Phase B order; verify with COUNT(*) between layers |
| Trigger fires during inventory INSERT | High | High | Disable triggers per Section 5.3 before upload |
| ATP constraint violation on INSERT | Medium | High | Ensure `available_qty = on_hand_qty` when `reserved_qty = 0` |
| Strain name mismatch during re-link | Medium | Medium | Run Phase A.5 cleanup before reset; verify with Phase E queries |
| Orphaned order_items after re-link | Low | High | Verify zero unlinked rows in Phase F step 8 |
| COA PDF upload failure | Low | Medium | Data records first, PDFs second; can retry independently |
| Token limit during execution | Medium | Medium | Execute in phases; each phase is independently verifiable |
| Stale PostgREST cache | Medium | Low | Call `NOTIFY pgrst, 'reload schema'` after schema-affecting changes |
| Bolt.new terminal timeout | Medium | Medium | Use Supabase SQL editor as fallback for large operations |

---

## 9. Environment Reference

| Resource | Value |
|----------|-------|
| Live Supabase URL | `https://fonreynkfeqywshijqpi.supabase.co` |
| Bolt.new Project | `https://bolt.new/~/sb1-e6rq2s5m` |
| Schema Types File | `src/lib/database/database.types.ts` |
| COA Storage Bucket | `coa-documents` |
| Logo Storage Bucket | `logos` |

---

## 10. Go-Live Execution Checklist

```
[ ] Phase 0: Pre-Flight
    [ ] Verify database connectivity
    [ ] Take note of current row counts (run Section 2.1 query)
    [ ] Confirm audit spreadsheet is final and reviewed

[ ] Phase A: Detach real data from old strain UUIDs
    [ ] SET NULL on order_items.strain_id
    [ ] SET NULL on products.strain_id
    [ ] Verify both return 0 non-null strain_ids

[ ] Phase A.5: Data cleanup
    [ ] Fix "Super Silver Marker" -> "Silver Marker"
    [ ] Fix "Flava Flav" -> "Flavor Flav" (if present)

[ ] Phase B: FK-ordered DELETE
    [ ] Layer 1: Leaf tables
    [ ] Layer 2: Inventory movements
    [ ] Layer 3: Inventory items
    [ ] Layer 4: Session-dependent tables
    [ ] Layer 5: Sessions
    [ ] Layer 6: Cultivation
    [ ] Layer 7: Batch ecosystem
    [ ] Layer 8: Delivery routes
    [ ] Verify all counts are 0

[ ] Phase C: Delete strains
    [ ] DELETE strain_aliases
    [ ] DELETE strains
    [ ] Verify count is 0

[ ] Phase D: Upload fresh data
    [ ] D.1: Upload strains
    [ ] D.2: Upload batch_registry
    [ ] D.3: Upload certificates_of_analysis
    [ ] D.4: Backfill batch_registry.coa_id
    [ ] D.5: Disable triggers (Section 5.3)
    [ ] D.5: Upload inventory_items
    [ ] D.5: Re-enable triggers (Section 5.3)

[ ] Phase E: Re-link preserved data
    [ ] Re-link order_items.strain_id
    [ ] Re-link products.strain_id
    [ ] Verify no unmatched rows

[ ] Phase F: Verification
    [ ] Run all 9 verification queries (Section 4.2 Phase F)
    [ ] Spot-check 5 random inventory items in the UI
    [ ] Verify batch list loads correctly
    [ ] Verify order list still shows all orders
    [ ] Test creating a new session (should auto-link to new batches)

[ ] Phase G: Post-Go-Live
    [ ] Upload COA PDFs to storage bucket
    [ ] Notify pgrst schema reload if needed
    [ ] Monitor for 24 hours
```
