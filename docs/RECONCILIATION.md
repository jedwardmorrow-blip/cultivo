---
title: RECONCILIATION
category: Inventory & Production
version: 1.2
updated: 2025-11-10
---

# RECONCILIATION - Physical Inventory Audits & Variance Tracking

> **Status:** Documented (Evidence-Based)
> **Purpose:** Defines physical inventory audit workflow from cycle counts through variance resolution and reconciliation
> **Reference:** Extracted from [SYSTEM-WORKFLOW.md Section 4.3](./SYSTEM-WORKFLOW.md#43-audits--reconciliation) and [INVENTORY-TRACKING.md Section 8](./INVENTORY-TRACKING.md#audits--reconciliation)

---

## TABLE OF CONTENTS

1. [Purpose](#purpose)
2. [Architecture Overview](#architecture-overview)
3. [Inputs](#inputs)
4. [Outputs](#outputs)
5. [Key Rules](#key-rules)
6. [Audit Session Creation](#audit-session-creation)
7. [Physical Count Workflow](#physical-count-workflow)
8. [Variance Review & Approval](#variance-review--approval)
9. [Reconciliation & Adjustment](#reconciliation--adjustment)
10. [Variance Analysis & Reporting](#variance-analysis--reporting)
11. [Implementation Status](#implementation-status)
12. [Database Dependencies](#database-dependencies)
13. [Related Modules](#related-modules)

---

## Purpose

The Reconciliation module manages physical inventory audits to ensure system accuracy:
- **Audit Session Creation** - Manager schedules cycle counts or full audits
- **Physical Counting** - Staff count actual on-hand inventory
- **Variance Detection** - System identifies discrepancies between system vs. physical
- **Variance Review** - Manager assigns reasons and approves adjustments
- **Reconciliation** - System creates RECONCILIATION movements to correct on_hand_qty
- **Variance Logging** - Immutable audit trail of all variances

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Manager    │────▶│   Physical   │────▶│   Variance   │────▶│ Reconciliation│
│   Creates    │     │   Count      │     │   Review     │     │   Movement    │
│   Audit      │     │   (Staff)    │     │   (Manager)  │     │   (Ledger)    │
│              │     │              │     │              │     │              │
│ in_progress  │     │  counted_qty │     │variance_reason│     │ completed    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Key Principles:**
- Audits are immutable once completed (no retroactive changes)
- Variance reasons REQUIRED (no unexplained adjustments)
- Large variances require manager approval (>5% OR >50g threshold)
- RECONCILIATION movements set on_hand_qty to absolute value (not relative)
- Variance log provides permanent audit trail

---

## Inputs

### 1. Manager Actions
- **Create Audit Session**
  - Audit type: 'cycle_count' (specific stage) OR 'full_audit' (all inventory)
  - Stage filter: Optional (e.g., 'Packaged_3_5g', 'BulkFlower')
  - Audit date: Scheduled date for physical count
  - Status: 'in_progress' (generates audit lines)

- **Approve Variances**
  - Review variances where variance_qty != 0
  - Assign variance_reason from ENUM
  - Add reason_notes for details
  - Approve large variances (>5% OR >50g)

- **Complete Reconciliation**
  - Confirm all variances reviewed
  - Trigger reconciliation (creates inventory_movements)
  - Mark audit status: 'completed'

### 2. Staff Actions
- **Physical Count**
  - Count each inventory_item in audit scope
  - Enter counted_qty for each audit_line
  - Flag items not found (counted_qty = 0)
  - Report damaged/unusable items

### 3. System Actions
- **Auto-Generate Audit Lines**
  - Snapshot current on_hand_qty as expected_qty
  - Create one audit_line per inventory_item in scope
  - Set counted_qty = NULL (to be filled by staff)

- **Calculate Variance**
  - variance_qty = counted_qty - expected_qty (GENERATED column)
  - Positive variance = excess inventory
  - Negative variance = shortage

---

## Outputs

### 1. Audit Sessions
- **Table:** `inventory_audits`
- **Fields:**
  - id: Unique audit identifier
  - audit_date: Scheduled date
  - audit_type: 'cycle_count' OR 'full_audit'
  - stage_filter: Optional stage scope
  - status: 'in_progress' → 'completed'
  - initiated_by: Manager user ID
  - completed_at: Completion timestamp

### 2. Audit Lines
- **Table:** `inventory_audit_lines`
- **Fields:**
  - audit_id: Parent audit FK
  - item_id: inventory_item being counted
  - expected_qty: System on_hand_qty at audit start (snapshot)
  - counted_qty: Physical count result (staff input)
  - variance_qty: GENERATED (counted_qty - expected_qty)
  - variance_reason: ENUM (moisture_loss, spillage, etc.)
  - reason_notes: Detailed explanation

### 3. Variance Log
- **Table:** `variance_log`
- **Purpose:** Immutable audit trail of all variances
- **Fields:**
  - audit_id, item_id: Audit and item references
  - expected_qty, counted_qty, variance_qty: Variance details
  - variance_reason, reason_notes: Explanation
  - approved_by: Manager who approved (for large variances)
  - approved_at: Approval timestamp
  - created_at: Log entry timestamp

### 4. Reconciliation Movements
- **Table:** `inventory_movements`
- **Movement Kind:** 'RECONCILIATION'
- **Purpose:** Adjust on_hand_qty to match physical count
- **Fields:**
  - movement_kind: 'RECONCILIATION'
  - dest_item_id: Item being reconciled
  - qty: counted_qty (ABSOLUTE value, not relative)
  - reason_code: variance_reason from audit_line
  - created_at: Reconciliation timestamp

**Effect on Inventory:**
```sql
-- RECONCILIATION movement sets on_hand_qty to absolute value
UPDATE inventory_items
SET on_hand_qty = NEW.qty  -- Not relative (qty ± delta)
WHERE id = NEW.dest_item_id;
```

### 5. Audit Reports (PDF)
- **Status:** 🔴 PLANNED - Not yet implemented
- **Contents:**
  - Audit summary (date, type, total items, total variance)
  - Variance breakdown by reason
  - Item-by-item variance list
  - Signature section (auditor, manager)

---

## Key Rules

### Audit Creation Rules
1. **Stage-specific or full audit scope**
   - Cycle count: Targets specific stage (e.g., 'Packaged_3_5g')
   - Full audit: All inventory items
   - Stage not locked by another active audit

2. **Expected qty is immutable snapshot**
   - Captured at audit creation time
   - Reflects on_hand_qty at moment audit starts
   - Not affected by subsequent inventory movements during count

3. **One active audit per stage at a time** (PLANNED - NOT ENFORCED)
   - Status: 🔴 MISSING CONSTRAINT
   - Current: Multiple audits can be active simultaneously
   - Risk: Conflicting reconciliations, confusion
   - Fix: Add CHECK constraint or trigger blocking duplicate active audits
   - Priority: MEDIUM
   - Target: Sprint 2025-12-1

### Counting Rules
4. **Counted qty must be entered for all lines**
   - counted_qty = NULL indicates incomplete audit
   - Staff must enter 0 for missing items (not leave blank)
   - Damaged items logged as variance_reason = 'quality_loss'

5. **Variance calculated automatically**
   - variance_qty = counted_qty - expected_qty (GENERATED column)
   - Positive = excess inventory (found more than system shows)
   - Negative = shortage (found less than system shows)
   - Zero = match (no reconciliation needed)

### Variance Review Rules
6. **Variance reason REQUIRED for all non-zero variances** (PARTIAL ENFORCEMENT)
   - Status: 🟡 NOT NULL constraint exists, but no UI validation
   - ENUM values:
     - `moisture_loss` - Weight loss due to drying
     - `spillage` - Material spilled during handling
     - `measurement_error` - Scale inaccuracy or human error
     - `waste` - Damaged/unusable material
     - `theft_loss` - Missing material (suspected theft)
     - `other` - Other reasons (require reason_notes)
   - reason_notes REQUIRED for 'other' variance type
   - Priority: HIGH
   - Target: Add UI validation - Sprint 2025-11-3

7. **Large variance approval threshold: >5% OR >50g** (PLANNED - NOT ENFORCED)
   - Status: 🔴 NOT IMPLEMENTED
   - Current: All variances approved implicitly on reconciliation
   - Risk: Significant losses accepted without oversight
   - Planned: approved_by field required for |variance_qty| > threshold
   - Fix: Add CHECK constraint:
     ```sql
     CHECK (
       ABS(variance_qty) <= 50
       OR ABS(variance_qty) / NULLIF(expected_qty, 0) <= 0.05
       OR approved_by IS NOT NULL
     )
     ```
   - Priority: MEDIUM
   - Target: Sprint 2025-12-1

### Reconciliation Rules
8. **RECONCILIATION movement sets absolute on_hand_qty**
   - Unlike CONSUME/PRODUCE (relative), RECONCILIATION is absolute
   - on_hand_qty = counted_qty (exact match after reconciliation)
   - Ignores previous on_hand_qty value

9. **Reconciliation creates variance log entry**
   - One variance_log record per audit_line with variance_qty != 0
   - Immutable (no UPDATE/DELETE allowed)
   - Permanent audit trail for compliance

10. **Audit status locked after completion**
    - Status 'completed' → no changes allowed
    - Cannot re-open or modify completed audits
    - New audit required for subsequent discrepancies

---

## Audit Session Creation

### Step 1: Manager Initiates Audit

**UI Flow:**
```
Manager → Inventory → Audits → "New Audit" → Select Type & Scope → Create
```

**Database Operations:**
```sql
-- Create audit session
INSERT INTO inventory_audits (
  audit_date, audit_type, stage_filter,
  status, initiated_by, created_at
)
VALUES (
  CURRENT_DATE,
  'cycle_count',  -- OR 'full_audit'
  'Packaged_3_5g',  -- Optional stage filter
  'in_progress',
  auth.uid(),
  now()
);
```

**Validation:**
- ✅ User role IN ('manager', 'admin')
- 🟡 No active audit for same stage (should be enforced)
- ✅ Stage filter exists in product_stages (if provided)

### Step 2: Generate Audit Lines

**Trigger:** Auto-execute on inventory_audits INSERT

**Logic:**
```sql
-- Generate audit lines for all items in scope
INSERT INTO inventory_audit_lines (
  audit_id, item_id, expected_qty, counted_qty
)
SELECT
  NEW.id AS audit_id,
  ii.id AS item_id,
  ii.on_hand_qty AS expected_qty,
  NULL AS counted_qty  -- To be filled by staff
FROM inventory_items ii
WHERE
  -- If stage_filter provided, match it
  (NEW.stage_filter IS NULL OR ii.product_stage_id IN (
    SELECT id FROM product_stages WHERE name = NEW.stage_filter
  ))
  -- Only include items with on_hand_qty > 0
  AND ii.on_hand_qty > 0
ORDER BY ii.package_id;
```

**Side Effects:**
- Audit lines created (one per inventory_item in scope)
- Expected qty snapshot captured (immutable)
- Counted qty initialized to NULL (awaiting staff input)

---

## Physical Count Workflow

### Step 1: Staff Accesses Audit

**UI Flow:**
```
Staff → Inventory → Audits → Select Active Audit → View Items
```

**Display:**
- List of audit_lines grouped by stage or location
- package_id, product_name, expected_qty
- Input field for counted_qty
- Status indicator (complete/incomplete)

### Step 2: Staff Enters Counts

**UI Flow (per item):**
```
Staff → Scan/Find Item → Enter Counted Quantity → Save
```

**Database Operations:**
```sql
-- Update audit line with counted quantity
UPDATE inventory_audit_lines
SET counted_qty = :counted_value
WHERE audit_id = :audit_id
  AND item_id = :item_id;

-- variance_qty automatically calculated (GENERATED column)
-- variance_qty = counted_qty - expected_qty
```

**Validation:**
- ✅ counted_qty >= 0 (cannot be negative)
- ✅ counted_qty is numeric (not NULL after entry)

**Special Cases:**
- **Item not found:** counted_qty = 0 (shortage)
- **Item damaged:** counted_qty = actual usable qty, variance_reason = 'waste'
- **Multiple packages:** Sum counted_qty across packages

### Step 3: Staff Marks Count Complete

**UI Flow:**
```
Staff → Review Audit Progress → "Mark Complete" (when all items counted)
```

**Validation:**
- All audit_lines have counted_qty != NULL
- If incomplete items exist, prompt staff to complete or mark as not found

**No Database Change:** Audit remains 'in_progress' (manager must review variances)

---

## Variance Review & Approval

### Step 1: Manager Reviews Variances

**UI Flow:**
```
Manager → Inventory → Audits → Select Audit → View Variances
```

**Filter Options:**
- Show all items OR only variances (variance_qty != 0)
- Sort by |variance_qty| descending (largest first)
- Group by variance_reason

**Display Per Item:**
```
Package ID: 250106-GSC
Product: Girl Scout Cookies 3.5g
Expected: 100 units
Counted: 98 units
Variance: -2 units (-2.0%)
Reason: [Dropdown]
Notes: [Text field]
```

### Step 2: Manager Assigns Variance Reasons

**Database Operations:**
```sql
-- Update audit line with variance reason
UPDATE inventory_audit_lines
SET
  variance_reason = 'moisture_loss',  -- ENUM value
  reason_notes = 'Material dried further in storage'
WHERE audit_id = :audit_id
  AND item_id = :item_id;
```

**Validation:**
- variance_reason REQUIRED for variance_qty != 0
- reason_notes REQUIRED if variance_reason = 'other'
- 🔴 approved_by REQUIRED if |variance_qty| > threshold (NOT YET ENFORCED)

### Step 3: Large Variance Approval (PLANNED)

**Status:** 🔴 NOT IMPLEMENTED

**Threshold:** |variance_qty| > 50g OR |variance_qty| / expected_qty > 5%

**Planned UI Flow:**
```
Manager → Review Variance > Threshold → "Approve Variance" Button → Confirm
```

**Planned Database:**
```sql
-- Update audit line with approval
UPDATE inventory_audit_lines
SET
  approved_by = auth.uid(),
  approved_at = now()
WHERE audit_id = :audit_id
  AND item_id = :item_id
  AND (
    ABS(variance_qty) > 50
    OR ABS(variance_qty) / NULLIF(expected_qty, 0) > 0.05
  );
```

**Priority:** MEDIUM | Target: Sprint 2025-12-1

---

## Reconciliation & Adjustment

### Step 1: Manager Initiates Reconciliation

**Preconditions:**
- All audit_lines have variance_reason assigned (for non-zero variances)
- Large variances approved (if enforcement enabled)
- Audit status = 'in_progress'

**UI Flow:**
```
Manager → Audit Details → "Reconcile All" → Confirm
```

**Warning Prompt:**
```
This will adjust on_hand_qty for XX items with variances.
Total adjustment: +YY grams / -ZZ grams

Proceed with reconciliation?
[Cancel] [Confirm]
```

### Step 2: Create Reconciliation Movements

**Database Operations:**
```sql
-- For each audit_line with variance_qty != 0
INSERT INTO inventory_movements (
  movement_kind, dest_item_id, qty, unit,
  reason_code, created_at
)
SELECT
  'RECONCILIATION',
  al.item_id,
  al.counted_qty,  -- ABSOLUTE value (not delta)
  ii.unit,
  al.variance_reason,
  now()
FROM inventory_audit_lines al
JOIN inventory_items ii ON ii.id = al.item_id
WHERE al.audit_id = :audit_id
  AND al.variance_qty != 0;
```

**Trigger Side Effect:**
```sql
-- trg_update_on_hand_qty_after_movement
-- For RECONCILIATION movements, sets on_hand_qty to absolute value
UPDATE inventory_items
SET on_hand_qty = NEW.qty  -- Not relative
WHERE id = NEW.dest_item_id;
```

### Step 3: Create Variance Log Entries

**Database Operations:**
```sql
-- Insert variance log for each variance
INSERT INTO variance_log (
  audit_id, item_id, expected_qty, counted_qty,
  variance_qty, variance_reason, reason_notes,
  approved_by, approved_at, created_at
)
SELECT
  audit_id, item_id, expected_qty, counted_qty,
  variance_qty, variance_reason, reason_notes,
  approved_by, approved_at, now()
FROM inventory_audit_lines
WHERE audit_id = :audit_id
  AND variance_qty != 0;
```

**Immutability:** variance_log has no UPDATE/DELETE policies (INSERT/SELECT only)

### Step 4: Complete Audit

**Database Operations:**
```sql
-- Mark audit completed
UPDATE inventory_audits
SET
  status = 'completed',
  completed_at = now()
WHERE id = :audit_id;
```

**Side Effects:**
- inventory_items.on_hand_qty adjusted to match counted_qty
- variance_log entries created (permanent audit trail)
- Audit status locked (no further changes allowed)

---

## Variance Analysis & Reporting

### Variance by Reason (Last 30 Days)

```sql
SELECT
  variance_reason,
  COUNT(*) AS occurrence_count,
  SUM(ABS(variance_qty)) AS total_variance_grams,
  AVG(ABS(variance_qty)) AS avg_variance_grams,
  SUM(CASE WHEN variance_qty > 0 THEN variance_qty ELSE 0 END) AS total_excess,
  SUM(CASE WHEN variance_qty < 0 THEN ABS(variance_qty) ELSE 0 END) AS total_shortage
FROM variance_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY variance_reason
ORDER BY total_variance_grams DESC;
```

**Use Case:** Identify most common variance causes for process improvement

### Variance by Stage (Trend Analysis)

```sql
SELECT
  ps.name AS stage,
  DATE_TRUNC('week', vl.created_at) AS week,
  SUM(ABS(vl.variance_qty)) AS total_variance
FROM variance_log vl
JOIN inventory_items ii ON ii.id = vl.item_id
JOIN product_stages ps ON ps.id = ii.product_stage_id
WHERE vl.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY ps.name, DATE_TRUNC('week', vl.created_at)
ORDER BY week DESC, total_variance DESC;
```

**Use Case:** Track variance trends by production stage over time

### Variance by User/Session (Quality Control)

```sql
SELECT
  u.full_name AS operator,
  COUNT(DISTINCT vl.audit_id) AS audits_with_variances,
  SUM(ABS(vl.variance_qty)) AS total_variance,
  AVG(ABS(vl.variance_qty)) AS avg_variance
FROM variance_log vl
JOIN inventory_audits ia ON ia.id = vl.audit_id
JOIN user_profiles u ON u.id = ia.initiated_by
GROUP BY u.full_name
HAVING SUM(ABS(vl.variance_qty)) > 100
ORDER BY total_variance DESC;
```

**Use Case:** Identify operators requiring additional training

### Audit Completion Report (PDF Generation - PLANNED)

**Status:** 🔴 NOT IMPLEMENTED

**Planned Contents:**
- Audit summary header (date, type, scope, initiated_by)
- Total items audited: X
- Items with variances: Y (Z%)
- Total variance: +A grams / -B grams
- Variance breakdown table (by reason)
- Item-by-item variance list (sorted by |variance_qty|)
- Signature section (auditor, manager, date)

**Priority:** MEDIUM | Target: Sprint 2025-12-2

---

## Implementation Status

### Fully Implemented ✅
- ✅ Audit session creation (cycle count & full audit)
- ✅ Auto-generation of audit lines with expected_qty snapshot
- ✅ Physical count entry (staff UI)
- ✅ Variance calculation (GENERATED column)
- ✅ Variance reason assignment (manager UI)
- ✅ Reconciliation movements (RECONCILIATION kind)
- ✅ Variance log (immutable audit trail)
- ✅ Audit completion workflow

### Partial / Manual Only ⚠️
- ⚠️ Variance reason UI validation (DB constraint exists, UI incomplete)
  - Priority: HIGH | Target: Sprint 2025-11-3
  - Current: Can save without reason if frontend bypassed

- ⚠️ Audit line duplicate prevention (no unique constraint)
  - Priority: MEDIUM | Target: Sprint 2025-12-1
  - Risk: Same item counted twice in one audit

### Missing / Planned ❌
- ❌ Large variance approval workflow (>5% OR >50g threshold)
  - **Priority: MEDIUM** | Target: Sprint 2025-12-1
  - Risk: Significant losses unreviewed

- ❌ Active audit per stage lock (prevent concurrent audits)
  - Priority: MEDIUM | Target: Sprint 2025-12-1
  - Risk: Conflicting reconciliations

- ❌ Audit PDF report generation
  - Priority: MEDIUM | Target: Sprint 2025-12-2
  - Risk: No printable audit documentation

- ❌ Variance trend dashboard
  - Priority: LOW | Target: Sprint 2025-12-3
  - Risk: Manual SQL queries required for analysis

---

## Database Dependencies

### Core Tables
- **`inventory_audits`** - Audit sessions
  - Status: 'in_progress' → 'completed'
  - Type: 'cycle_count' OR 'full_audit'
  - Indexes: status, audit_date, initiated_by

- **`inventory_audit_lines`** - Item counts
  - Fields: audit_id, item_id, expected_qty, counted_qty, variance_qty (GENERATED)
  - Indexes: audit_id, item_id
  - Unique: (audit_id, item_id) — prevents duplicate counts

- **`variance_log`** - Immutable audit trail
  - Fields: audit_id, item_id, expected_qty, counted_qty, variance_qty, variance_reason, reason_notes, approved_by
  - Indexes: audit_id, item_id, variance_reason, created_at
  - RLS: INSERT/SELECT only (no UPDATE/DELETE)

### Inventory Integration
- **`inventory_movements`** - Ledger entries
  - RECONCILIATION: Sets on_hand_qty to absolute value
  - Trigger: `trg_update_on_hand_qty_after_movement` updates inventory_items

- **`inventory_items`** - Current inventory state
  - on_hand_qty adjusted by RECONCILIATION movements
  - Expected_qty snapshot captured at audit start

- **`product_stages`** - Stage filter reference
  - Used for cycle counts targeting specific stages

### User Management
- **`user_profiles`** - Auditor/manager tracking
  - initiated_by: Manager who created audit
  - approved_by: Manager who approved large variances

---

## Related Modules

### Upstream Dependencies
- **[INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)** - Event-driven ledger
  - RECONCILIATION movements adjust on_hand_qty
  - Ledger immutability enforced
  - See [Event-Driven Ledger](./INVENTORY-TRACKING.md#event-driven-ledger)

### Downstream Consumers
- **[ANALYTICS.md](./ANALYTICS.md)** - Variance reporting
  - variance_log for loss analysis
  - Trend analysis by stage/reason
  - Operator quality metrics

### Peer Modules
- **[DATASETS.md](./DATASETS.md)** - Complete schema
  - See [Section 6.2: Variance Log](./DATASETS.md#62-variance_log)
  - See [Tech-Debt Register](./DATASETS.md#9-tech-debt-register)

- **[SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md)** - End-to-end process
  - See [Section 4.3: Audits & Reconciliation](./SYSTEM-WORKFLOW.md#43-audits--reconciliation)
  - See [Known Gaps](./SYSTEM-WORKFLOW.md#81-known-gaps-implementation-incomplete)

---

## REFERENCES

- **SYSTEM-WORKFLOW.md Section 4.3** - Source of this document
- **INVENTORY-TRACKING.md Section 8** - Audit workflow details
- **DATASETS.md Section 6** - Variance log schema
- **DOCS-INTEGRATION-PROGRESS.md** - Implementation status tracker
- **Migration Files:**
  - `20251026000000_create_inventory_audit_system.sql` (audits, audit_lines, variance_log)
- **Type Definitions:** `src/features/inventory/types/audit.types.ts`
- **Hooks:** `src/features/inventory/hooks/useAudit.ts`
- **Services:** `src/features/inventory/services/audit.service.ts`

---

**Last Updated:** 2025-11-06
**Version:** 1.1 (Evidence-Based)
**Maintainer:** System Architect
**Review Cycle:** Monthly or post-audit-workflow-changes
