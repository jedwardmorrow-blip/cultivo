---
title: CULTIVATION-ARCHITECTURE
category: Cultivation Module
version: 2.0
updated: 2026-02-20
status: FULLY IMPLEMENTED — 11 tables and 13 triggers live; D-14 (harvest weight entries + room tracking) added
---

# CULTIVATION — Architecture & Database Design

> **Status:** FULLY IMPLEMENTED — 11 tables (7 grow + 2 dry/binning + 1 individual plants + 1 harvest weight entries) and 13 triggers are live. D-14 adds harvest_weight_entries table, grow_room_id and dry_room_id on harvest_sessions. E-1 added individual_plants table, batch_registry_id on plant_groups, clone_date on batch_registry, and updated fn_generate_plant_group_number + fn_complete_harvest_session for batch-at-clone-time tracking.
> **Audience:** AI maintaining or extending the cultivation module.
> **Purpose:** Authoritative database schema, RLS policies, triggers, and integration design.
> **Cross-References:** [CULTIVATION.md](./CULTIVATION.md), [CULTIVATION-RULES.md](./CULTIVATION-RULES.md), [BATCHES.md](./BATCHES.md), [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md)

---

## TABLE OF CONTENTS

1. [Schema Overview](#schema-overview)
2. [Table Definitions](#table-definitions)
3. [RLS Policies](#rls-policies)
4. [Triggers](#triggers)
5. [Integration with Existing Schema](#integration-with-existing-schema)
6. [Migration Plan](#migration-plan)
7. [Frontend Module Structure](#frontend-module-structure)
8. [Service Layer Design](#service-layer-design)
9. [Type Definitions](#type-definitions)
10. [Health Analysis (2026-02-19)](#health-analysis)

---

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ CULTIVATION SCHEMA                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  grow_rooms                                                          │
│  ├─ PK: id uuid                                                      │
│  ├─ room_code text UNIQUE NOT NULL                                   │
│  ├─ room_type: 'clone'|'veg'|'flower'|'mother'|'mixed'              │
│  └─ is_active boolean DEFAULT true                                   │
│       │                                                              │
│       ▼  (C-4)                                                       │
│  room_tables                                                         │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: grow_room_id → grow_rooms(id)  [CASCADE DELETE]             │
│  ├─ table_number integer NOT NULL > 0                                │
│  ├─ table_name text  [nullable, optional label]                      │
│  ├─ total_sqft numeric  [nullable]                                   │
│  └─ is_active boolean DEFAULT true                                   │
│       │                                                              │
│       ▼  (C-4)                                                       │
│  room_sections                                                       │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: room_table_id → room_tables(id)  [CASCADE DELETE]           │
│  ├─ section_label text NOT NULL  [e.g. "A", "B", "01"]              │
│  ├─ section_sqft numeric  [nullable]                                 │
│  └─ is_active boolean DEFAULT true                                   │
│                                                                      │
│  plant_groups                                                        │
│  ├─ PK: id uuid                                                      │
│  ├─ group_number text UNIQUE NOT NULL  (auto-generated PG-YYMMDD-ABV)│
│  ├─ FK: strain_id → strains(id)  [immutable]                        │
│  ├─ FK: grow_room_id → grow_rooms(id)                               │
│  ├─ FK: mother_plant_group_id → plant_groups(id)  [nullable]        │
│  ├─ FK: room_table_id → room_tables(id)  [nullable, C-5B]           │
│  ├─ FK: room_section_id → room_sections(id)  [nullable, C-5B]       │
│  ├─ is_mother boolean DEFAULT false                                  │
│  └─ growth_stage text  ['clone','veg','flower','harvested']         │
│                                                                      │
│  plant_group_stage_history                                           │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: plant_group_id → plant_groups(id)                           │
│  └─ immutable log (no UPDATE/DELETE allowed)                        │
│                                                                      │
│  plant_group_room_history                                            │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: plant_group_id → plant_groups(id)                           │
│  ├─ FK: from_room_id → grow_rooms(id)                               │
│  ├─ FK: to_room_id → grow_rooms(id)                                 │
│  └─ immutable log (no UPDATE/DELETE allowed)                        │
│                                                                      │
│  harvest_sessions                                                    │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: plant_group_id → plant_groups(id)                           │
│  ├─ FK: batch_registry_id → batch_registry(id)  [nullable]         │
│  ├─ FK: grow_room_id → grow_rooms(id)  [nullable, D-14]            │
│  ├─ FK: dry_room_id → dry_rooms(id)  [nullable, D-14]              │
│  ├─ wet_weight_grams numeric NOT NULL                                │
│  ├─ adjusted_weight_grams numeric  [nullable, post-entry correction] │
│  ├─ adjustment_reason text  [nullable, required when adjusted]       │
│  └─ session_status text  ['active','completed','cancelled']         │
│       │                                                              │
│       ▼                                                              │
│  harvest_weight_entries  (D-14 — LIVE)                               │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: harvest_session_id → harvest_sessions(id)  [CASCADE]        │
│  ├─ weight_grams numeric NOT NULL > 0                                │
│  ├─ plant_count integer NOT NULL >= 1                                │
│  ├─ entry_order integer NOT NULL DEFAULT 1                           │
│  └─ notes text  [nullable]                                           │
│       │                                                              │
│       ▼  (D-2 — LIVE)                                                │
│  binning_sessions                                                    │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: harvest_session_id → harvest_sessions(id)  [UNIQUE — 1:1]  │
│  ├─ FK: dry_room_id → dry_rooms(id)                                 │
│  ├─ FK: batch_registry_id → batch_registry(id)  [denormalized]     │
│  ├─ dry_weight_grams numeric NOT NULL > 0                            │
│  ├─ bin_date date NOT NULL                                           │
│  └─ session_status text  ['active','completed','cancelled']         │
│                                                                      │
│  dry_rooms  (D-2 — LIVE)                                            │
│  ├─ PK: id uuid                                                      │
│  ├─ room_code text UNIQUE NOT NULL  [immutable after creation]       │
│  ├─ name text NOT NULL                                               │
│  ├─ capacity_lbs numeric  [nullable, informational]                  │
│  └─ is_active boolean DEFAULT true                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### grow_rooms

```sql
CREATE TABLE IF NOT EXISTS grow_rooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  room_code     text NOT NULL,
  room_type     text NOT NULL DEFAULT 'flower'
                  CHECK (room_type IN ('clone', 'veg', 'flower', 'mother', 'mixed')),
  capacity_plants integer,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),

  CONSTRAINT grow_rooms_room_code_unique UNIQUE (room_code),
  CONSTRAINT grow_rooms_capacity_positive CHECK (
    capacity_plants IS NULL OR capacity_plants > 0
  )
);

ALTER TABLE grow_rooms ENABLE ROW LEVEL SECURITY;
```

### plant_groups

```sql
CREATE TABLE IF NOT EXISTS plant_groups (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_number           text UNIQUE NOT NULL,
  name                   text,
  strain_id              uuid NOT NULL REFERENCES strains(id),
  grow_room_id           uuid NOT NULL REFERENCES grow_rooms(id),
  mother_plant_group_id  uuid REFERENCES plant_groups(id),
  room_table_id          uuid REFERENCES room_tables(id),          -- C-5B: placement
  room_section_id        uuid REFERENCES room_sections(id),        -- C-5B: placement
  is_mother              boolean NOT NULL DEFAULT false,
  plant_count            integer NOT NULL CHECK (plant_count > 0),
  growth_stage           text NOT NULL DEFAULT 'clone'
                           CHECK (growth_stage IN ('clone', 'veg', 'flower', 'harvested')),
  stage_entered_at       timestamptz NOT NULL DEFAULT now(),
  planted_date           date,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT room_section_requires_table CHECK (
    room_section_id IS NULL OR room_table_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_plant_groups_room_table_id ON plant_groups(room_table_id) WHERE room_table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plant_groups_room_section_id ON plant_groups(room_section_id) WHERE room_section_id IS NOT NULL;

ALTER TABLE plant_groups ENABLE ROW LEVEL SECURITY;
```

**Note:** `group_number` is generated by trigger `trg_generate_plant_group_number` (BEFORE INSERT). It is declared NOT NULL but the trigger always sets it — no application code should populate this column.

**Placement columns (C-5B):** `room_table_id` and `room_section_id` are nullable FKs added in migration C-5B-1. They store the current physical position of the plant group. The DB trigger `trg_clear_placement_on_room_transfer` automatically NULLs these when `grow_room_id` changes. The trigger `trg_validate_placement_room` validates that `room_table_id.grow_room_id = plant_groups.grow_room_id` on insert/update. The CHECK constraint `room_section_requires_table` ensures that if a section is set, a table must also be set.

### plant_group_stage_history

```sql
CREATE TABLE IF NOT EXISTS plant_group_stage_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id   uuid NOT NULL REFERENCES plant_groups(id),
  from_stage       text,
  to_stage         text NOT NULL,
  transitioned_at  timestamptz NOT NULL DEFAULT now(),
  transitioned_by  uuid REFERENCES auth.users(id),
  notes            text
);

ALTER TABLE plant_group_stage_history ENABLE ROW LEVEL SECURITY;
```

### plant_group_room_history

```sql
CREATE TABLE IF NOT EXISTS plant_group_room_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id   uuid NOT NULL REFERENCES plant_groups(id),
  from_room_id     uuid NOT NULL REFERENCES grow_rooms(id),
  to_room_id       uuid NOT NULL REFERENCES grow_rooms(id),
  moved_at         timestamptz NOT NULL DEFAULT now(),
  moved_by         uuid REFERENCES auth.users(id),
  notes            text
);

ALTER TABLE plant_group_room_history ENABLE ROW LEVEL SECURITY;
```

### room_tables

Added in Session C-4 to represent physical cultivation tables within a grow room.

```sql
CREATE TABLE IF NOT EXISTS room_tables (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_room_id  uuid        NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  table_number  integer     NOT NULL,
  table_name    text,
  total_sqft    numeric(8,2),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),

  CONSTRAINT room_tables_number_positive CHECK (table_number > 0),
  CONSTRAINT room_tables_unique_number_per_room UNIQUE (grow_room_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_room_tables_grow_room_id ON room_tables(grow_room_id);

ALTER TABLE room_tables ENABLE ROW LEVEL SECURITY;
```

**Notes:**
- `table_number` must be a positive integer, unique per room. Numbers do not need to be sequential.
- `table_name` is an optional human-friendly label (e.g., "Back Wall Left"). The `table_number` is the canonical identifier.
- `total_sqft` is optional — tracks surface area for space utilization reporting.
- `is_active` is the soft-delete flag. Tables with active plant groups should not be archived (application-layer enforcement; no DB constraint).
- Cascade delete from `grow_rooms` removes all associated tables and their sections if the room is hard-deleted (rooms are normally archived via `is_active`, not deleted).

### room_sections

Added in Session C-4. Columns `flip_date` and `projected_harvest_date` added in Session C-5A.

```sql
CREATE TABLE IF NOT EXISTS room_sections (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_table_id           uuid        NOT NULL REFERENCES room_tables(id) ON DELETE CASCADE,
  section_label           text        NOT NULL,
  section_sqft            numeric(8,2),
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid        REFERENCES auth.users(id),
  flip_date               date,
  projected_harvest_date  date,

  CONSTRAINT room_sections_unique_label_per_table UNIQUE (room_table_id, section_label)
);

CREATE INDEX IF NOT EXISTS idx_room_sections_room_table_id ON room_sections(room_table_id);

ALTER TABLE room_sections ENABLE ROW LEVEL SECURITY;
```

**Notes:**
- `section_label` is a short operator-defined label (e.g., "A", "B", "01", "Left"). Unique per table.
- `section_sqft` is optional — for space utilization tracking at the section level.
- `is_active` is the soft-delete flag. Archive instead of hard-delete.
- `flip_date` — the date the batch occupying this section was flipped from Veg to Flower. Nullable and mutable; changes every run. Used to compute "Day N of flower" on the room card UI.
- `projected_harvest_date` — the expected harvest date for the current run in this section. Nullable and mutable. Used to compute run length (flip → harvest days) and days-remaining countdown.
- These dates belong on sections (not rooms) because a single room can hold mixed batches across different sections, each on different flip/harvest schedules.
- Plant group placement at section level is planned for Session C-5B — two FK columns (`room_table_id` and `room_section_id`) will be added to `plant_groups` at that time.

### harvest_sessions

```sql
CREATE TABLE IF NOT EXISTS harvest_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id        uuid NOT NULL REFERENCES plant_groups(id),
  harvest_date          date NOT NULL,
  wet_weight_grams      numeric(10, 2) NOT NULL CHECK (wet_weight_grams > 0),
  adjusted_weight_grams numeric(10, 2),
  adjustment_reason     text,
  plant_count_harvested integer NOT NULL CHECK (plant_count_harvested > 0),
  batch_registry_id     uuid REFERENCES batch_registry(id),
  session_status        text NOT NULL DEFAULT 'active'
                          CHECK (session_status IN ('active', 'completed', 'cancelled')),
  completed_at          timestamptz,
  completed_by          uuid REFERENCES auth.users(id),
  cancelled_at          timestamptz,
  cancelled_by          uuid REFERENCES auth.users(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id),

  CONSTRAINT harvest_sessions_completed_has_batch CHECK (
    session_status != 'completed' OR batch_registry_id IS NOT NULL
  ),
  CONSTRAINT harvest_sessions_completed_has_timestamp CHECK (
    session_status != 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT harvest_sessions_cancelled_no_batch CHECK (
    session_status != 'cancelled' OR batch_registry_id IS NULL
  ),
  CONSTRAINT harvest_sessions_adjusted_weight_positive CHECK (
    adjusted_weight_grams IS NULL OR adjusted_weight_grams > 0
  ),
  CONSTRAINT harvest_sessions_adjustment_reason_required CHECK (
    adjusted_weight_grams IS NULL OR adjustment_reason IS NOT NULL
  )
);

ALTER TABLE harvest_sessions ENABLE ROW LEVEL SECURITY;
```

### dry_rooms [D-2 — LIVE]

Physical rooms where harvested material is dried. Simple container identifiers — no table/section sub-structure.

```sql
CREATE TABLE IF NOT EXISTS dry_rooms (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  room_code     text        NOT NULL,
  capacity_lbs  numeric(8,2),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),

  CONSTRAINT dry_rooms_room_code_unique UNIQUE (room_code),
  CONSTRAINT dry_rooms_capacity_positive CHECK (
    capacity_lbs IS NULL OR capacity_lbs > 0
  )
);

ALTER TABLE dry_rooms ENABLE ROW LEVEL SECURITY;
```

**Notes:**
- `room_code` is unique and **immutable after creation** — enforced by trigger `trg_protect_dry_room_code` (mirrors the grow_rooms pattern).
- No tables or sections — dry rooms are simple identifiers.
- `capacity_lbs` is informational; not enforced by any constraint against binning session weights.
- Archive via `is_active = false`; no DELETE policy.

### binning_sessions [D-2 — LIVE]

Records the dry weight of harvested material after drying. One binning session per harvest session (1:1).

```sql
CREATE TABLE IF NOT EXISTS binning_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_session_id  uuid        NOT NULL REFERENCES harvest_sessions(id),
  dry_room_id         uuid        NOT NULL REFERENCES dry_rooms(id),
  batch_registry_id   uuid        NOT NULL REFERENCES batch_registry(id),
  dry_weight_grams    numeric(10,2) NOT NULL CHECK (dry_weight_grams > 0),
  bin_date            date        NOT NULL,
  session_status      text        NOT NULL DEFAULT 'active'
                        CHECK (session_status IN ('active', 'completed', 'cancelled')),
  completed_at        timestamptz,
  completed_by        uuid        REFERENCES auth.users(id),
  cancelled_at        timestamptz,
  cancelled_by        uuid        REFERENCES auth.users(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),

  CONSTRAINT binning_sessions_one_per_harvest UNIQUE (harvest_session_id),
  CONSTRAINT binning_sessions_completed_has_timestamp CHECK (
    session_status != 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT binning_sessions_cancelled_no_completion CHECK (
    NOT (session_status = 'cancelled' AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_binning_sessions_harvest_session_id
  ON binning_sessions(harvest_session_id);
CREATE INDEX IF NOT EXISTS idx_binning_sessions_batch_registry_id
  ON binning_sessions(batch_registry_id);

ALTER TABLE binning_sessions ENABLE ROW LEVEL SECURITY;
```

**Notes:**
- `UNIQUE (harvest_session_id)` — enforces the 1:1 constraint. A second binning session for the same harvest session is blocked at the DB level.
- `batch_registry_id` is denormalized from the linked harvest session. The application sets this on INSERT by reading `harvest_sessions.batch_registry_id`. This avoids a JOIN in every binning query and mirrors the pattern used in other session tables.
- A DB trigger (`trg_validate_binning_session_harvest`) validates on INSERT that the linked harvest session is `completed` and that the provided `batch_registry_id` matches `harvest_sessions.batch_registry_id`.
- No downstream trigger fires on completion — binning records dry weight only; no batch or inventory rows are created.
- Cancellation after completion is blocked (application-layer validation; `cancelled_no_completion` constraint is a DB backstop).

---

## RLS Policies

All tables use the standard authenticated-user pattern. The cultivation module does not need public access — only authenticated staff interact with it.

### grow_rooms

```sql
CREATE POLICY "Authenticated users can view grow rooms"
  ON grow_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert grow rooms"
  ON grow_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update grow rooms"
  ON grow_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

### plant_groups

```sql
CREATE POLICY "Authenticated users can view plant groups"
  ON plant_groups FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert plant groups"
  ON plant_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update plant groups"
  ON plant_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

### plant_group_stage_history

```sql
CREATE POLICY "Authenticated users can view stage history"
  ON plant_group_stage_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stage history"
  ON plant_group_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

Note: No UPDATE or DELETE policy on `plant_group_stage_history`. This table is an immutable audit log.

### plant_group_room_history

```sql
CREATE POLICY "Authenticated users can view room history"
  ON plant_group_room_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert room history"
  ON plant_group_room_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

Note: No UPDATE or DELETE policy on `plant_group_room_history`. This table is an immutable audit log.

### room_tables

```sql
CREATE POLICY "Authenticated users can view room tables"
  ON room_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room tables"
  ON room_tables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update room tables"
  ON room_tables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

Note: No DELETE policy on `room_tables`. Archive via `is_active = false`.

### room_sections

```sql
CREATE POLICY "Authenticated users can view room sections"
  ON room_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room sections"
  ON room_sections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update room sections"
  ON room_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

Note: No DELETE policy on `room_sections`. Archive via `is_active = false`.

### harvest_sessions

```sql
CREATE POLICY "Authenticated users can view harvest sessions"
  ON harvest_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert harvest sessions"
  ON harvest_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update harvest sessions"
  ON harvest_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

### dry_rooms [D-2 — LIVE]

```sql
CREATE POLICY "Authenticated users can view dry rooms"
  ON dry_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert dry rooms"
  ON dry_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update dry rooms"
  ON dry_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

Note: No DELETE policy on `dry_rooms`. Archive via `is_active = false`.

### binning_sessions [D-2 — LIVE]

```sql
CREATE POLICY "Authenticated users can view binning sessions"
  ON binning_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert binning sessions"
  ON binning_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update binning sessions"
  ON binning_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

Note: No DELETE policy on `binning_sessions`. Once created, a binning session is a permanent record. Cancel instead of delete.

---

## Triggers

### 1. Generate group_number on Plant Group Insert

Fires BEFORE INSERT on `plant_groups`. Generates the human-readable `group_number`.

**Important:** This trigger runs BEFORE the INSERT, so it validates that the strain has an abbreviation set before the row is created.

```sql
CREATE OR REPLACE FUNCTION fn_generate_plant_group_number()
RETURNS trigger AS $$
DECLARE
  v_abbrev    text;
  v_date_part text;
BEGIN
  SELECT abbreviation INTO v_abbrev
  FROM strains WHERE id = NEW.strain_id;

  IF v_abbrev IS NULL OR v_abbrev = '' THEN
    RAISE EXCEPTION
      'Cannot create plant group: strain has no abbreviation set. Set the abbreviation in Settings → Strains first.';
  END IF;

  v_date_part  := to_char(now(), 'YYMMDD');
  NEW.group_number := 'PG-' || v_date_part || '-' || v_abbrev;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_plant_group_number
BEFORE INSERT ON plant_groups
FOR EACH ROW
EXECUTE FUNCTION fn_generate_plant_group_number();
```

### 2. Validate Stage Transition

Fires BEFORE UPDATE on `plant_groups`. Blocks invalid stage transitions.

```sql
CREATE OR REPLACE FUNCTION fn_validate_plant_group_stage_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.growth_stage = NEW.growth_stage THEN
    RETURN NEW;
  END IF;

  IF OLD.growth_stage = 'harvested' THEN
    RAISE EXCEPTION 'Cannot transition plant group from harvested state';
  END IF;

  IF NOT (
    (OLD.growth_stage = 'clone'   AND NEW.growth_stage = 'veg')     OR
    (OLD.growth_stage = 'veg'     AND NEW.growth_stage = 'flower')  OR
    (OLD.growth_stage = 'flower'  AND NEW.growth_stage = 'harvested')
  ) THEN
    RAISE EXCEPTION 'Invalid stage transition: % → %', OLD.growth_stage, NEW.growth_stage;
  END IF;

  NEW.stage_entered_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_plant_group_stage
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.growth_stage IS DISTINCT FROM NEW.growth_stage)
EXECUTE FUNCTION fn_validate_plant_group_stage_transition();
```

### 3. Log Stage History

Fires AFTER UPDATE on `plant_groups` when `growth_stage` changes.

```sql
CREATE OR REPLACE FUNCTION fn_log_plant_group_stage_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plant_group_stage_history (
    plant_group_id,
    from_stage,
    to_stage,
    transitioned_at,
    transitioned_by
  ) VALUES (
    NEW.id,
    OLD.growth_stage,
    NEW.growth_stage,
    NEW.stage_entered_at,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_plant_group_stage_history
AFTER UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.growth_stage IS DISTINCT FROM NEW.growth_stage)
EXECUTE FUNCTION fn_log_plant_group_stage_history();
```

### 4. Log Room Transfer History

Fires AFTER UPDATE on `plant_groups` when `grow_room_id` changes.

**Note:** This trigger fires automatically when the service updates `grow_room_id`. The service must NOT also insert into `plant_group_room_history` — the trigger owns that insert.

```sql
CREATE OR REPLACE FUNCTION fn_log_plant_group_room_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plant_group_room_history (
    plant_group_id,
    from_room_id,
    to_room_id,
    moved_at,
    moved_by
  ) VALUES (
    NEW.id,
    OLD.grow_room_id,
    NEW.grow_room_id,
    now(),
    auth.uid()
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_plant_group_room_history
AFTER UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.grow_room_id IS DISTINCT FROM NEW.grow_room_id)
EXECUTE FUNCTION fn_log_plant_group_room_history();
```

### 5. Harvest Session Completion → Create Batch

Fires BEFORE UPDATE on `harvest_sessions` when `session_status` changes to `'completed'`.

This is the critical integration trigger. The COALESCE fallback has been **removed** — if a strain has no abbreviation, the trigger raises a hard error.

```sql
CREATE OR REPLACE FUNCTION fn_complete_harvest_session()
RETURNS trigger AS $$
DECLARE
  v_strain_id      uuid;
  v_strain_name    text;
  v_strain_abbrev  text;
  v_room_code      text;
  v_batch_number   text;
  v_batch_id       uuid;
  v_date_prefix    text;
BEGIN
  IF NEW.session_status != 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT pg.strain_id, gr.room_code
  INTO v_strain_id, v_room_code
  FROM plant_groups pg
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  WHERE pg.id = NEW.plant_group_id;

  SELECT name, abbreviation INTO v_strain_name, v_strain_abbrev
  FROM strains WHERE id = v_strain_id;
  -- Note: uses strains.name (NOT strains.display_name) — verified correct field for batch_registry.strain

  IF v_strain_abbrev IS NULL OR v_strain_abbrev = '' THEN
    RAISE EXCEPTION
      'Cannot complete harvest: strain "%" has no abbreviation set. Set the abbreviation in Settings → Strains first.',
      v_strain_name;
  END IF;

  v_date_prefix  := to_char(NEW.harvest_date, 'YYMMDD');
  v_batch_number := v_date_prefix || '-' || v_strain_abbrev;

  INSERT INTO batch_registry (
    batch_number,
    strain,
    strain_id,
    harvest_date,
    initial_weight_grams,
    room,
    lifecycle_state,
    created_by
  ) VALUES (
    v_batch_number,
    v_strain_name,
    v_strain_id,
    NEW.harvest_date,
    NEW.wet_weight_grams,
    v_room_code,
    'created',
    NEW.completed_by
  )
  ON CONFLICT (batch_number) DO NOTHING
  RETURNING id INTO v_batch_id;

  IF v_batch_id IS NULL THEN
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = v_batch_number;
  END IF;

  NEW.batch_registry_id := v_batch_id;
  NEW.completed_at := COALESCE(NEW.completed_at, now());

  UPDATE plant_groups
  SET growth_stage = 'harvested', updated_at = now()
  WHERE id = NEW.plant_group_id;

  INSERT INTO batch_production_history (
    batch_id,
    event_type,
    source_weight_grams,
    notes,
    performed_by
  ) VALUES (
    v_batch_id,
    'batch_created',
    NEW.wet_weight_grams,
    'Batch created from harvest session ' || NEW.id,
    NEW.completed_by::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complete_harvest_session
BEFORE UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (NEW.session_status = 'completed' AND OLD.session_status = 'active')
EXECUTE FUNCTION fn_complete_harvest_session();
```

**Design notes:**
- No COALESCE fallback — abbreviation is required or trigger raises an exception.
- `ON CONFLICT (batch_number) DO NOTHING` handles same-strain same-day harvest: the second harvest session links to the existing batch.
- Trigger fires BEFORE UPDATE so it can set `NEW.batch_registry_id` and `NEW.completed_at` in one write.
- The `batch_production_history` insert creates the required audit trail entry.
- The `strain` text column (NOT NULL in batch_registry) is populated from `strains.name`.
- `source_weight_grams` and `performed_by` match the actual batch_production_history column names.
- `performed_by` is text type in batch_production_history, so `completed_by` (uuid) is cast to text.

### 6. Sync Weight Adjustment to batch_registry

Fires AFTER UPDATE on `harvest_sessions` when `adjusted_weight_grams` is set.

```sql
CREATE OR REPLACE FUNCTION fn_sync_harvest_weight_adjustment()
RETURNS trigger AS $$
BEGIN
  IF NEW.adjusted_weight_grams IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.batch_registry_id IS NULL THEN
    RAISE EXCEPTION 'Cannot adjust weight: no batch linked to this harvest session';
  END IF;

  IF NEW.adjusted_weight_grams <= 0 THEN
    RAISE EXCEPTION 'Adjusted weight must be greater than zero';
  END IF;

  IF NEW.adjustment_reason IS NULL OR NEW.adjustment_reason = '' THEN
    RAISE EXCEPTION 'Adjustment reason is required when adjusting harvest weight';
  END IF;

  UPDATE batch_registry
  SET initial_weight_grams = NEW.adjusted_weight_grams,
      updated_at = now()
  WHERE id = NEW.batch_registry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_harvest_weight_adjustment
AFTER UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (
  NEW.adjusted_weight_grams IS DISTINCT FROM OLD.adjusted_weight_grams
  AND NEW.adjusted_weight_grams IS NOT NULL
)
EXECUTE FUNCTION fn_sync_harvest_weight_adjustment();
```

**Design notes:**
- Trigger fires AFTER UPDATE because `batch_registry` is a separate table — no BEFORE/RETURNING mechanism needed.
- The CHECK constraints on `harvest_sessions` (positive value, reason required) are a first line of defense; the trigger re-validates for trigger-bypass paths.
- Original `wet_weight_grams` is never modified — it remains the historical record of the scale reading at harvest time.

### 7. Block Harvest Cancellation if Batch Exists

Fires BEFORE UPDATE on `harvest_sessions` when `session_status` changes to `'cancelled'`.

```sql
CREATE OR REPLACE FUNCTION fn_validate_harvest_cancellation()
RETURNS trigger AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.batch_registry_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot cancel harvest session: batch % already created. Cancel the batch instead.',
      (SELECT batch_number FROM batch_registry WHERE id = OLD.batch_registry_id);
  END IF;

  IF NEW.session_status = 'cancelled' THEN
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_harvest_cancellation
BEFORE UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (NEW.session_status = 'cancelled' AND OLD.session_status = 'active')
EXECUTE FUNCTION fn_validate_harvest_cancellation();
```

### 10. Clear Placement on Room Transfer (C-5B)

Fires AFTER UPDATE on `plant_groups` when `grow_room_id` changes. Automatically clears `room_table_id` and `room_section_id` so placement never points to a table/section in the old room.

```sql
CREATE OR REPLACE FUNCTION fn_clear_placement_on_room_transfer()
RETURNS trigger AS $$
BEGIN
  NEW.room_table_id := NULL;
  NEW.room_section_id := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clear_placement_on_room_transfer
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.grow_room_id IS DISTINCT FROM NEW.grow_room_id)
EXECUTE FUNCTION fn_clear_placement_on_room_transfer();
```

**Note:** BEFORE trigger so that `NEW` values are modified before the row is written. This fires on the same event as the room history logger (which is AFTER) — they do not conflict.

### 11. Validate Placement Room Consistency (C-5B)

Fires BEFORE UPDATE/INSERT on `plant_groups` when `room_table_id` is set. Ensures the referenced table belongs to the same room as the plant group.

```sql
CREATE OR REPLACE FUNCTION fn_validate_placement_room()
RETURNS trigger AS $$
DECLARE
  v_table_room_id uuid;
BEGIN
  IF NEW.room_table_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT grow_room_id INTO v_table_room_id
  FROM room_tables WHERE id = NEW.room_table_id;

  IF v_table_room_id IS NULL THEN
    RAISE EXCEPTION 'Placement error: room table not found';
  END IF;

  IF v_table_room_id != NEW.grow_room_id THEN
    RAISE EXCEPTION 'Placement error: table % belongs to a different room than plant group', NEW.room_table_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_placement_room
BEFORE INSERT OR UPDATE ON plant_groups
FOR EACH ROW
WHEN (NEW.room_table_id IS NOT NULL)
EXECUTE FUNCTION fn_validate_placement_room();
```

### 8. Block room_code Changes After Creation

```sql
CREATE OR REPLACE FUNCTION fn_protect_room_code()
RETURNS trigger AS $$
BEGIN
  IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
    RAISE EXCEPTION 'room_code is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_room_code
BEFORE UPDATE ON grow_rooms
FOR EACH ROW
WHEN (OLD.room_code IS DISTINCT FROM NEW.room_code)
EXECUTE FUNCTION fn_protect_room_code();
```

### 9. Block strain_id Changes After Creation

```sql
CREATE OR REPLACE FUNCTION fn_protect_plant_group_strain()
RETURNS trigger AS $$
BEGIN
  IF OLD.strain_id IS DISTINCT FROM NEW.strain_id THEN
    RAISE EXCEPTION 'strain_id is immutable after plant group creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_plant_group_strain
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.strain_id IS DISTINCT FROM NEW.strain_id)
EXECUTE FUNCTION fn_protect_plant_group_strain();
```

### 12. Block dry_room_code Changes After Creation [D-2 — LIVE]

Mirrors trigger 8. Fires BEFORE UPDATE on `dry_rooms` when `room_code` changes.

```sql
CREATE OR REPLACE FUNCTION fn_protect_dry_room_code()
RETURNS trigger AS $$
BEGIN
  IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
    RAISE EXCEPTION 'dry room room_code is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_dry_room_code
BEFORE UPDATE ON dry_rooms
FOR EACH ROW
WHEN (OLD.room_code IS DISTINCT FROM NEW.room_code)
EXECUTE FUNCTION fn_protect_dry_room_code();
```

### 13. Validate Binning Session on Insert [D-2 — LIVE]

Fires BEFORE INSERT on `binning_sessions`. Validates two things:
1. The linked harvest session is `completed` (not still active or cancelled)
2. The provided `batch_registry_id` matches `harvest_sessions.batch_registry_id`

```sql
CREATE OR REPLACE FUNCTION fn_validate_binning_session()
RETURNS trigger AS $$
DECLARE
  v_harvest_status       text;
  v_harvest_batch_id     uuid;
BEGIN
  SELECT session_status, batch_registry_id
  INTO v_harvest_status, v_harvest_batch_id
  FROM harvest_sessions
  WHERE id = NEW.harvest_session_id;

  IF v_harvest_status IS NULL THEN
    RAISE EXCEPTION 'Binning session error: harvest session not found';
  END IF;

  IF v_harvest_status != 'completed' THEN
    RAISE EXCEPTION
      'Cannot create binning session: harvest session is not completed (status: %)',
      v_harvest_status;
  END IF;

  IF v_harvest_batch_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot create binning session: harvest session has no linked batch';
  END IF;

  IF NEW.batch_registry_id IS DISTINCT FROM v_harvest_batch_id THEN
    RAISE EXCEPTION
      'Binning session error: batch_registry_id does not match the harvest session''s batch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_binning_session
BEFORE INSERT ON binning_sessions
FOR EACH ROW
EXECUTE FUNCTION fn_validate_binning_session();
```

**Design notes:**
- Trigger fires on INSERT only — the application sets `batch_registry_id` from the harvest session before inserting.
- The trigger is the final gate; the application should also validate the harvest session status before even showing the binning session form.
- No trigger fires on completion — completion just sets `session_status = 'completed'` and `completed_at`. No batch or inventory creation occurs.

---

## Integration with Existing Schema

### strains Table (existing) — VERIFIED AGAINST LIVE DB

`plant_groups.strain_id` references the existing `strains` table. No changes to `strains` are needed for C-2.

**Live schema facts (verified 2026-02-18):**
- `strains.abbreviation` — `text`, **nullable (YES)**, no NOT NULL constraint at the DB level
- `strains.name` — `text NOT NULL` — the canonical strain name field
- `strains.display_name` — `text NOT NULL` — a separate display label (may differ from `name`)
- `strains.dominance_type` — `text`, nullable — replaces what docs called `type`; values are `'indica'`, `'sativa'`, `'hybrid'`

`strains.abbreviation` being nullable is expected and intentional — enforcement is in the triggers, not the schema. Both the `fn_generate_plant_group_number` (BEFORE INSERT on plant_groups) and `fn_complete_harvest_session` (BEFORE UPDATE on harvest_sessions) triggers raise a hard exception if abbreviation is null or empty. There is **no automatic fallback**.

**Important:** The trigger uses `strains.name` (not `strains.display_name`) to populate `batch_registry.strain`. Use `name` consistently.

```sql
-- Verify before migration (should return is_nullable='YES'):
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'strains' AND column_name = 'abbreviation';
```

### batch_registry Table (existing) — VERIFIED AGAINST LIVE DB

`harvest_sessions.batch_registry_id` references the existing `batch_registry` table. The `created_by` column was added by migration `add_created_by_to_batch_registry` (pre-C-2 scaffolding). The cultivation module only INSERTs new rows; it does not modify existing rows except via the weight adjustment trigger.

**Live schema facts (verified 2026-02-18):**
- `batch_registry.strain_id` — `uuid`, **nullable (YES)**, **no FK constraint to strains** — referential integrity is application-enforced only. The INSERT will succeed regardless of the value.
- `batch_registry.initial_weight_grams` — `numeric`, **nullable (YES)** — the INSERT in the harvest trigger will succeed even with a NULL value, but the trigger always passes `NEW.wet_weight_grams` so it will never be null in practice.
- `batch_registry.strain` — `text NOT NULL` — the strain name string; must always be populated.

**Required columns used by the harvest trigger:**
- `batch_number` (text, NOT NULL) — auto-generated YYMMDD-ABBREV
- `strain` (text, NOT NULL) — strain name string, populated from `strains.name` (NOT `display_name`)
- `strain_id` (uuid, nullable, no FK) — the strain UUID; set for traceability but not enforced by DB
- `harvest_date` (date, nullable)
- `initial_weight_grams` (numeric, nullable) — wet weight from harvest session; overwritten by weight adjustment trigger if correction applied. **This stores the weight of the FIRST harvest session only** — see the same-day same-strain note below.
- `room` (text, nullable) — grow room code
- `lifecycle_state` (text, nullable, default `'created'`) — set to `'created'`
- `created_by` (uuid, nullable) — the user who completed the harvest

**Same-day same-strain note:** `initial_weight_grams` is set only on the first INSERT (via `ON CONFLICT DO NOTHING`). If a second harvest session for the same batch is completed the same day, `initial_weight_grams` retains the first session's weight. The second session's weight is preserved on the `harvest_sessions` row itself. For cumulative batch weight, use `SUM(wet_weight_grams) FROM harvest_sessions WHERE batch_registry_id = ?`.

### batch_production_history Table (existing)

The completion trigger inserts a `batch_created` event into this existing table.

**Required columns used by the harvest trigger:**
- `batch_id` (uuid, NOT NULL) — FK to batch_registry
- `event_type` (text, NOT NULL) — set to `'batch_created'`
- `source_weight_grams` (numeric) — the wet weight (note: NOT `input_weight`)
- `performed_by` (text) — the user uuid cast to text (note: column is `text` type, not `uuid` — explicit `::text` cast required)
- `notes` (text) — human-readable reference to the harvest session

### fn_generate_batch_number — not used

The cultivation completion trigger implements batch number generation inline. There is no separate `fn_generate_batch_number` function in the existing schema (documented as GAP-017 in BATCHES.md). If one is created in the future, the trigger should be updated to call it.

### fn_populate_batch_registry_id — NOT used by harvest_sessions

`harvest_sessions` does NOT use the existing `fn_populate_batch_registry_id` auto-population trigger. That trigger is designed for `trim_sessions` / `packaging_sessions` / `bucking_sessions`, which receive a `batch_id` text field from the UI and need it resolved to a `batch_registry_id` UUID FK.

`harvest_sessions` takes a different path: it has no `batch_id` text column at all. The `batch_registry_id` UUID FK is set directly by the `fn_complete_harvest_session` BEFORE UPDATE trigger, which creates the batch_registry row and captures the returned id.

Do NOT apply `fn_populate_batch_registry_id` to `harvest_sessions`.

---

## Migration Plan (COMPLETED)

All migrations have been run against the live database. The SQL files are committed to `supabase/migrations/` for version control and environment reproducibility.

### Migration C-2-1: Create Cultivation Tables ✅ COMPLETE

File: `supabase/migrations/20260219000000_create_cultivation_schema.sql`

Created (five tables, all with RLS enabled and policies applied):
- `grow_rooms`
- `plant_groups` (includes `group_number`, `mother_plant_group_id`, `is_mother`)
- `plant_group_stage_history`
- `plant_group_room_history`
- `harvest_sessions` (includes `adjusted_weight_grams`, `adjustment_reason`)

### Migration C-2-2: Create Cultivation Triggers ✅ COMPLETE

File: `supabase/migrations/20260219000100_create_cultivation_triggers.sql`

Created (in order, dependencies respected):
1. `fn_generate_plant_group_number` + `trg_generate_plant_group_number` (BEFORE INSERT on plant_groups)
2. `fn_validate_plant_group_stage_transition` + `trg_validate_plant_group_stage` (BEFORE UPDATE on plant_groups)
3. `fn_log_plant_group_stage_history` + `trg_log_plant_group_stage_history` (AFTER UPDATE on plant_groups)
4. `fn_log_plant_group_room_history` + `trg_log_plant_group_room_history` (AFTER UPDATE on plant_groups)
5. `fn_complete_harvest_session` + `trg_complete_harvest_session` (BEFORE UPDATE on harvest_sessions)
6. `fn_sync_harvest_weight_adjustment` + `trg_sync_harvest_weight_adjustment` (AFTER UPDATE on harvest_sessions)
7. `fn_validate_harvest_cancellation` + `trg_validate_harvest_cancellation` (BEFORE UPDATE on harvest_sessions)
8. `fn_protect_room_code` + `trg_protect_room_code` (BEFORE UPDATE on grow_rooms)
9. `fn_protect_plant_group_strain` + `trg_protect_plant_group_strain` (BEFORE UPDATE on plant_groups)

### Migration C-2-3: Seed Grow Rooms (optional)

Consult operator before seeding room data. This is data, not schema.

### Migration C-4-1: Create room_tables and room_sections ✅ COMPLETE

File: `supabase/migrations/20260219040000_create_room_tables_and_sections.sql`

Created (two tables, both with RLS enabled and authenticated-user policies applied):
- `room_tables` — physical tables inside grow rooms (table_number, table_name, total_sqft, is_active)
- `room_sections` — labeled subdivisions of a table (section_label, section_sqft, is_active)

Constraints:
- `room_tables`: UNIQUE(grow_room_id, table_number), CHECK(table_number > 0)
- `room_sections`: UNIQUE(room_table_id, section_label)

Indexes: `idx_room_tables_grow_room_id`, `idx_room_sections_room_table_id`

No new triggers — these tables are purely structural. Trigger work (if any) deferred to C-5 when plant group placement is wired.

**Purpose:** Validates the room layout data model before building the UI. Session C-5 will add FK columns to `plant_groups` to reference `room_tables` and `room_sections`.

### Migration C-5A-1: Add run dates to room_sections ✅ COMPLETE

File: `supabase/migrations/20260219050000_add_run_dates_to_room_sections.sql`

Added two nullable date columns to `room_sections`:
- `flip_date` (date, nullable) — date the section's current batch was flipped Veg → Flower
- `projected_harvest_date` (date, nullable) — expected harvest date for the current run

No new triggers or RLS policies — existing authenticated UPDATE policy covers the new columns. Both columns use `IF NOT EXISTS` guards for idempotency.

### Migration C-5B-1: Plant Group Placement FKs + Triggers ✅ COMPLETE

File: `supabase/migrations/20260219060000_add_plant_group_placement_columns.sql`

Changes to `plant_groups`:
- Added `room_table_id` (uuid, nullable) FK → `room_tables(id)`
- Added `room_section_id` (uuid, nullable) FK → `room_sections(id)`
- Added CHECK constraint `room_section_requires_table` (section requires table)
- Added partial indexes on both new FK columns (WHERE NOT NULL)

New triggers:
- `fn_clear_placement_on_room_transfer` + `trg_clear_placement_on_room_transfer` (BEFORE UPDATE on plant_groups when grow_room_id changes — clears placement columns)
- `fn_validate_placement_room` + `trg_validate_placement_room` (BEFORE INSERT OR UPDATE on plant_groups when room_table_id is set — validates table belongs to same room)

No new RLS policies — existing authenticated UPDATE policy on `plant_groups` covers the new columns.

### Migration D-2-1: Create dry_rooms and binning_sessions ✅ COMPLETE

File: `supabase/migrations/20260219165749_create_dry_rooms_and_binning_sessions.sql`

Creates two new tables (both with RLS enabled and authenticated-user policies applied):
- `dry_rooms` — simple container identifier for drying locations
- `binning_sessions` — dry weight records, 1:1 with harvest_sessions

New triggers:
- `fn_protect_dry_room_code` + `trg_protect_dry_room_code` (BEFORE UPDATE on dry_rooms when room_code changes — blocks immutability violation)
- `fn_validate_binning_session` + `trg_validate_binning_session` (BEFORE INSERT on binning_sessions — validates harvest session is completed and batch_registry_id matches)

Constraints:
- `dry_rooms`: UNIQUE(room_code), CHECK(capacity_lbs > 0 OR NULL)
- `binning_sessions`: UNIQUE(harvest_session_id), CHECK(dry_weight_grams > 0), completed_has_timestamp, cancelled_no_completion

Indexes: `idx_binning_sessions_harvest_session_id`, `idx_binning_sessions_batch_registry_id`

**No changes to existing tables.** All new schema.

---

## Frontend Module Structure (IMPLEMENTED)

The frontend module is fully implemented at `src/features/cultivation/`:

```
src/features/cultivation/
  components/
    CultivationDashboard.tsx      -- Top-level dashboard with stats and stage overview
    GrowRoomsManagement.tsx       -- List + manage rooms (Settings → Grow Rooms); includes Layout Builder (C-5B)
    PlantGroupsList.tsx           -- Active plant groups table with actions
    PlantGroupDetailPanel.tsx     -- Side panel: stage history + room history; placement selector (C-5B)
    NewPlantGroupModal.tsx        -- Create plant group (strain, room, mother selector)
    MoveToRoomModal.tsx           -- Room transfer modal; section assignment step (C-5B)
    HarvestSessionsList.tsx       -- Harvest sessions with tabs (Active/Completed/Cancelled)
    FlipRoomModal.tsx             -- Bulk flip room action modal (C-5B)
    RoomMapCard.tsx               -- Room map grid showing plant placements (C-5B)
    BinningSessionsView.tsx       -- Binning sessions with pending/active/completed tabs; onViewChange prop
    DryRoomsManagement.tsx        -- Dry rooms management (Settings → Dry Rooms)
    index.ts
  hooks/
    useGrowRooms.ts               -- State + CRUD for grow_rooms
    usePlantGroups.ts             -- State + CRUD for plant_groups with filter support
    useHarvestSessions.ts         -- State + CRUD for harvest_sessions with filter support
    useBinningSessions.ts         -- State + CRUD for binning_sessions with filter support
    useDryRooms.ts                -- State + CRUD for dry_rooms
    useRoomSections.ts            -- State + CRUD for room_tables/room_sections; run dates (C-5A/C-5B)
    usePlantGroupPlacement.ts     -- Placement state + updatePlacement; optional onSuccess callback (D-7)
    index.ts
  services/
    cultivation.service.ts        -- Supabase operations across all entities (29 operations)
    index.ts
  types/
    cultivation.types.ts          -- Interim type definitions (hand-authored; regenerate after schema changes)
    index.ts
  utils/                          -- NEW (D-7)
    strainValidation.ts           -- STRAIN_ABBREVIATION_REGEX + isValidStrainAbbreviation()
    index.ts
  index.ts
```

**Navigation:** Five routes wired in `App.tsx` (`cultivation-dashboard`, `cultivation-plants`, `cultivation-harvest`, `cultivation-binning`, `cultivation-rooms`). Sidebar navigation entry added in `sectionNavigation.ts`. Grow Rooms and Dry Rooms tabs added to Settings.

**Dashboard integration (D-7):** `CultivationWidget` in `src/features/dashboard/components/` provides an at-a-glance cultivation summary on the main Dashboard: active groups, active harvests, pending binning, stage distribution, and quick navigation links.

**Abbreviation validation (D-7):** `isValidStrainAbbreviation(abbreviation: string | null | undefined): boolean` is the single source of truth for the 3-letter uppercase check. All components import from `'../utils'`. Do not inline `/^[A-Z]{3}$/` — use the shared utility.

**`usePlantGroupPlacement` (D-7):** Accepts an optional `onSuccess?: () => void` second parameter. Callers that need to reload data after placement updates should pass a callback. Existing callers without the parameter continue to work unchanged.

---

## Service Layer Design (IMPLEMENTED)

The service is fully implemented in `src/features/cultivation/services/cultivation.service.ts` (29 operations — all entity groups complete):

```typescript
export const cultivationService = {
  // Grow Rooms
  listGrowRooms(): Promise<GrowRoom[]>
  createGrowRoom(data: CreateGrowRoomInput): Promise<GrowRoom>
  updateGrowRoom(id: string, data: UpdateGrowRoomInput): Promise<GrowRoom>
  archiveGrowRoom(id: string): Promise<GrowRoom>

  // Room Layout — Tables (C-5B)
  listRoomTables(growRoomId: string, opts?: { includeArchived?: boolean }): Promise<RoomTable[]>
  createRoomTable(data: CreateRoomTableInput): Promise<RoomTable>
  updateRoomTable(id: string, data: UpdateRoomTableInput): Promise<RoomTable>
  archiveRoomTable(id: string): Promise<RoomTable>

  // Room Layout — Sections (C-5A / C-5B)
  updateRoomSection(id: string, data: UpdateRoomSectionInput): Promise<RoomSection>
  createRoomSection(data: CreateRoomSectionInput): Promise<RoomSection>
  archiveRoomSection(id: string): Promise<RoomSection>

  // Flip Room (C-5B)
  flipRoom(data: FlipRoomInput): Promise<void>

  // Plant Groups
  listPlantGroups(filter?: { stage?: GrowthStage | 'active' }): Promise<PlantGroup[]>
  listPlantGroupsByRoom(growRoomId: string): Promise<PlantGroup[]>
  getPlantGroup(id: string): Promise<PlantGroup>
  createPlantGroup(data: CreatePlantGroupInput): Promise<PlantGroup>
  advanceStage(id: string, toStage: GrowthStage): Promise<PlantGroup>
  moveToRoom(id: string, toRoomId: string): Promise<PlantGroup>
  updatePlantGroupPlacement(id: string, data: UpdatePlantGroupPlacementInput): Promise<PlantGroup>
  setMotherStatus(id: string, isMother: boolean): Promise<PlantGroup>
  updatePlantGroupNotes(id: string, notes: string): Promise<PlantGroup>
  listMotherGroups(): Promise<PlantGroup[]>
  getStageHistory(id: string): Promise<PlantGroupStageHistory[]>
  getRoomHistory(id: string): Promise<PlantGroupRoomHistory[]>

  // Harvest Sessions
  listHarvestSessions(filter?: { status?: HarvestSessionStatus }): Promise<HarvestSession[]>
  createHarvestSession(data: CreateHarvestSessionInput): Promise<HarvestSession>
  completeHarvestSession(id: string): Promise<HarvestSession>
  cancelHarvestSession(id: string): Promise<HarvestSession>
  adjustHarvestWeight(id: string, adjustedWeight: number, reason: string): Promise<HarvestSession>

  // Dry Rooms [IMPLEMENTED]
  listDryRooms(): Promise<DryRoom[]>
  createDryRoom(data: CreateDryRoomInput): Promise<DryRoom>
  updateDryRoom(id: string, data: UpdateDryRoomInput): Promise<DryRoom>
  archiveDryRoom(id: string): Promise<DryRoom>

  // Binning Sessions [IMPLEMENTED]
  listBinningSessions(filter?: { status?: BinningSessionStatus }): Promise<BinningSession[]>
  listUnbinnedHarvestSessions(): Promise<HarvestSession[]>
  createBinningSession(data: CreateBinningSessionInput): Promise<BinningSession>
  completeBinningSession(id: string): Promise<BinningSession>
  cancelBinningSession(id: string): Promise<BinningSession>
}
```

**`moveToRoom` implementation note:** Updates only `grow_room_id`. The DB trigger `trg_log_plant_group_room_history` auto-inserts into `plant_group_room_history`. The service does NOT insert into that table.

**`createPlantGroup` implementation note:** Passes `group_number: 'PENDING'` on INSERT — the `trg_generate_plant_group_number` BEFORE INSERT trigger immediately replaces this with the correct `PG-YYMMDD-ABBREV` value before the row is committed.

**`createBinningSession` implementation note:** The application reads `harvest_sessions.batch_registry_id` and passes it as `batch_registry_id` in the insert payload. The DB trigger validates this matches the harvest session's batch. Never pass a user-supplied `batch_registry_id`; always derive it from the harvest session.

**`listUnbinnedHarvestSessions` implementation note:** Returns completed harvest sessions that have no corresponding `binning_sessions` row. Uses a two-step query: first fetches non-cancelled binning session harvest IDs, then excludes those from the completed harvest sessions list. The UUIDs must be quoted in the `.not('id', 'in', ...)` filter string: `("uuid1","uuid2")` not `uuid1,uuid2`.

---

## Type Definitions

```typescript
// cultivation.types.ts

export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mother' | 'mixed';
export type HarvestSessionStatus = 'active' | 'completed' | 'cancelled';

export interface GrowRoom {
  id: string;
  name: string;
  room_code: string;
  room_type: RoomType;
  capacity_plants: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface PlantGroup {
  id: string;
  group_number: string;
  name: string | null;
  strain_id: string;
  grow_room_id: string;
  mother_plant_group_id: string | null;
  room_table_id: string | null;    // C-5B: physical placement — table
  room_section_id: string | null;  // C-5B: physical placement — section
  is_mother: boolean;
  plant_count: number;
  growth_stage: GrowthStage;
  stage_entered_at: string;
  planted_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  // Joins (when fetched with select)
  strains?: { name: string; abbreviation: string | null };
  grow_rooms?: { name: string; room_code: string };
  mother_group?: Pick<PlantGroup, 'id' | 'group_number' | 'growth_stage'>;
  room_tables?: { table_number: number; table_name: string | null } | null;
  room_sections?: { section_label: string } | null;
}

export interface PlantGroupStageHistory {
  id: string;
  plant_group_id: string;
  from_stage: GrowthStage | null;
  to_stage: GrowthStage;
  transitioned_at: string;
  transitioned_by: string | null;
  notes: string | null;
}

export interface PlantGroupRoomHistory {
  id: string;
  plant_group_id: string;
  from_room_id: string;
  to_room_id: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
  // Joins
  from_room?: { name: string; room_code: string };
  to_room?: { name: string; room_code: string };
}

export interface HarvestSession {
  id: string;
  plant_group_id: string;
  harvest_date: string;
  wet_weight_grams: number;
  adjusted_weight_grams: number | null;
  adjustment_reason: string | null;
  plant_count_harvested: number;
  batch_registry_id: string | null;
  session_status: HarvestSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joins
  plant_groups?: Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'group_number'> & {
    strains?: { name: string; abbreviation: string | null };
    grow_rooms?: { room_code: string };
  };
  batch_registry?: { batch_number: string };
}

export interface RoomSection {
  id: string;
  room_table_id: string;
  section_label: string;
  section_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  flip_date: string | null;               // C-5A
  projected_harvest_date: string | null;  // C-5A
}

export interface RoomTable {
  id: string;
  grow_room_id: string;
  table_number: number;
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  sections: RoomSection[];
}

export type CreateGrowRoomInput = Pick<GrowRoom, 'name' | 'room_code' | 'room_type'> &
  Partial<Pick<GrowRoom, 'capacity_plants'>>;

export type UpdateGrowRoomInput = Partial<Pick<GrowRoom, 'name' | 'room_type' | 'capacity_plants' | 'is_active'>>;

export type CreateRoomTableInput = {
  grow_room_id: string;
  table_number: number;
  table_name?: string | null;
  total_sqft?: number | null;
};

export type UpdateRoomTableInput = Partial<{
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
}>;

export type CreateRoomSectionInput = {
  room_table_id: string;
  section_label: string;
  section_sqft?: number | null;
};

export type UpdateRoomSectionInput = Partial<Pick<RoomSection, 'flip_date' | 'projected_harvest_date' | 'section_sqft' | 'is_active'>>;

export type UpdatePlantGroupPlacementInput = {
  room_table_id: string | null;
  room_section_id: string | null;
};

export type FlipRoomInput = {
  grow_room_id: string;
  flip_date: string;
};

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes' | 'mother_plant_group_id' | 'is_mother'>>;

export type CreateHarvestSessionInput = Pick<HarvestSession, 'plant_group_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes'>>;

// Dry Rooms + Binning Sessions [D-2 — LIVE, fully implemented]

export type BinningSessionStatus = 'active' | 'completed' | 'cancelled';

export interface DryRoom {
  id: string;
  name: string;
  room_code: string;
  capacity_lbs: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface BinningSession {
  id: string;
  harvest_session_id: string;
  dry_room_id: string;
  batch_registry_id: string;
  dry_weight_grams: number;
  bin_date: string;
  session_status: BinningSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joins
  harvest_sessions?: Pick<HarvestSession, 'harvest_date' | 'wet_weight_grams' | 'adjusted_weight_grams'> & {
    plant_groups?: Pick<PlantGroup, 'group_number'> & {
      strains?: { name: string; abbreviation: string | null };
    };
  };
  dry_rooms?: { name: string; room_code: string };
  batch_registry?: { batch_number: string };
}

export type CreateDryRoomInput = Pick<DryRoom, 'name' | 'room_code'> &
  Partial<Pick<DryRoom, 'capacity_lbs'>>;

export type UpdateDryRoomInput = Partial<Pick<DryRoom, 'name' | 'capacity_lbs' | 'is_active'>>;

export type CreateBinningSessionInput = Pick<BinningSession, 'harvest_session_id' | 'dry_room_id' | 'batch_registry_id' | 'dry_weight_grams' | 'bin_date'> &
  Partial<Pick<BinningSession, 'notes'>>;
```

---

---

## Health Analysis

> **Performed:** 2026-02-19 (Session D-6)
> **Method:** Full code review of all components, hooks, services, types, migration files, and DB verification

### Summary

The cultivation module is architecturally complete and production-ready. All 9 tables, 13 triggers, 29 service operations, and all UI components are implemented and verified.

### Compatibility

- Routing: all 5 cultivation views wired in `App.tsx`
- Navigation: Cultivation section with 5 sub-tabs registered in `sectionNavigation.ts`
- Settings: Grow Rooms and Dry Rooms tabs both wired in `Settings.tsx`
- Auth: standard `useAuth()` pattern, authenticated-only RLS on all 9 tables
- Type system: cultivation types in `src/features/cultivation/types/`, re-exported via `@/types`
- No compatibility issues with the rest of the codebase

### Known Gaps (UX, not code defects)

1. **HarvestSessionsList → Batches linkage:** When a harvest session is completed, a `batch_registry` row is created automatically. There is no UI link from the completed harvest session row to the batch in the Batches module. Users must navigate to Batches manually. (Note: `BinningSessionsView` completed rows now have a batch navigation link as of D-7 — this gap applies only to `HarvestSessionsList`.)

2. **Dry Rooms in Settings only:** Dry rooms are managed under Settings → Dry Rooms. The Binning Sessions form shows a warning ("No active dry rooms — add one in Settings first") if none exist. This is correct UX but could confuse first-time users.

### Bug Fixed This Session

**`listUnbinnedHarvestSessions` UUID array format** (`cultivation.service.ts`)

The Supabase `.not('id', 'in', ...)` filter requires UUID values quoted inside the parentheses string. The original implementation joined them bare: `(uuid1,uuid2)`. The fix wraps each UUID in double quotes: `("uuid1","uuid2")`. This bug would have caused the Pending tab in Binning Sessions to show all completed harvests instead of only unbinned ones (silent wrong result, not a crash).

### Module Status

**COMPLETE** — all sessions C-1 through D-14 are done. The module is ready for production use.

---

## Document Version History

### v2.0 (2026-02-20)
- Session D-14: room-based harvest workflow with multi-weight entries
- Added `harvest_weight_entries` table to Schema Overview (new table, 11 total)
- Added `grow_room_id` and `dry_room_id` FK columns to `harvest_sessions` in Schema Overview
- Updated document version header and status

### v1.9 (2026-02-19)
- Session D-7: code quality, dashboard widget, and trigger tests
- Added `utils/` section to Frontend Module Structure documenting `strainValidation.ts` and `isValidStrainAbbreviation()`
- Added `BinningSessionsView.tsx` and `DryRoomsManagement.tsx` to component list (were implemented but unlisted)
- Added `useBinningSessions.ts` and `useDryRooms.ts` to hooks list (were implemented but unlisted)
- Updated `usePlantGroupPlacement` note with D-7 `onSuccess` callback addition
- Added Dashboard integration note for `CultivationWidget`
- Added Abbreviation validation note (single source of truth)
- Corrected Known Gap 1: `BinningSessionsView` now has a batch navigation link; gap scoped to `HarvestSessionsList` only
- Updated document version header and `Last Updated` footer

### v1.8 (2026-02-19)
- Session D-6: full module health analysis and status correction
- Updated document header: status changed from "SPECIFIED (D-1)" to "FULLY IMPLEMENTED — all 9 tables and 13 triggers are live"
- Corrected D-2 migration status from PENDING to COMPLETE throughout (schema overview, table definitions, RLS policies, triggers 12 and 13, migration plan entry with actual filename)
- Updated Service Layer Design: 29 operations noted, Dry Rooms and Binning Sessions no longer marked D-3 PENDING
- Updated `listUnbinnedHarvestSessions` implementation note: documented UUID quoting requirement in Supabase `.not()` filter
- Updated Type Definitions: removed D-3 PENDING comment
- Updated Navigation note: 5 routes, mentions Dry Rooms Settings tab
- Added Health Analysis section (compatibility, known gaps, bug fixed, module status)
- Added table of contents entry for Health Analysis section

### v1.7 (2026-02-19)
- Updated document header: D-1 specification added; 9 tables total when D-2 applied
- Added `dry_rooms` and `binning_sessions` to Schema Overview ER diagram (marked D-2 pending)
- Added Table Definitions for `dry_rooms` and `binning_sessions` (marked D-2 pending)
- Added RLS Policies for `dry_rooms` and `binning_sessions` (marked D-2 pending)
- Added Triggers 12 and 13: `trg_protect_dry_room_code` and `trg_validate_binning_session` (marked D-2 pending)
- Added Migration D-2-1 entry to Migration Plan (marked pending)
- Updated Service Layer Design: added Dry Rooms (4 ops) and Binning Sessions (5 ops) with D-3 pending notes
- Updated Type Definitions: added `BinningSessionStatus`, `DryRoom`, `BinningSession`, `CreateDryRoomInput`, `UpdateDryRoomInput`, `CreateBinningSessionInput` (marked D-3 pending)

### v1.6 (2026-02-19)
- Added `room_table_id` and `room_section_id` FK columns to `plant_groups` table definition (C-5B)
- Added CHECK constraint `room_section_requires_table` and partial indexes to `plant_groups`
- Added triggers 10 and 11: `trg_clear_placement_on_room_transfer` and `trg_validate_placement_room`
- Added Migration C-5B-1 entry to Migration Plan (marked complete)
- Updated Frontend Module Structure: added `FlipRoomModal.tsx`, `RoomMapCard.tsx`, `usePlantGroupPlacement.ts`
- Updated Service Layer Design: 24 operations, added `createRoomTable`, `updateRoomTable`, `archiveRoomTable`, `createRoomSection`, `archiveRoomSection`, `flipRoom`, `listPlantGroupsByRoom`, `updatePlantGroupPlacement`
- Updated Type Definitions: added `room_table_id`/`room_section_id` to `PlantGroup`; added `CreateRoomTableInput`, `UpdateRoomTableInput`, `CreateRoomSectionInput`, `UpdatePlantGroupPlacementInput`, `FlipRoomInput`
- Updated document header: sessions C-5B noted as complete

### v1.5 (2026-02-19)
- Added `flip_date` and `projected_harvest_date` columns to `room_sections` table definition (C-5A)
- Added Migration C-5A-1 entry to Migration Plan (marked complete)
- Added `RoomSection`, `RoomTable`, `UpdateRoomSectionInput` to Type Definitions section
- Added `listRoomTables` and `updateRoomSection` to Service Layer Design section
- Added `useRoomSections` hook to Frontend Module Structure
- Updated document header: sessions C-5A noted as complete

### v1.4 (2026-02-19)
- Added `room_tables` and `room_sections` to Schema Overview ER diagram
- Added full table definitions for `room_tables` and `room_sections` (C-4)
- Added RLS policies for `room_tables` and `room_sections`
- Added Migration C-4-1 entry to Migration Plan (marked complete)
- Updated document header: 7 tables, sessions C-2/C-3/C-4 noted as complete

### v1.3 (2026-02-19)
- Updated status from SPECIFICATION to IMPLEMENTED — all 5 tables and 9 triggers confirmed live
- Updated Migration Plan section: marked C-2-1 and C-2-2 as complete with actual migration filenames
- Updated Frontend Module Structure to reflect actual implemented component/hook/service files
- Updated Service Layer Design to reflect actual implemented function signatures (18 operations)
- Added `createPlantGroup` implementation note about `group_number: 'PENDING'` placeholder
- Updated document footer status

### v1.2 (2026-02-18)
- Live DB schema verification added to Integration section (verified against Supabase 2026-02-18)
- Corrected `strains` field names: `dominance_type` (not `type`), confirmed `name` vs `display_name` distinction
- Confirmed `strains.abbreviation` is nullable with no DB-level constraint — enforcement is trigger-only
- Confirmed `batch_registry.strain_id` is nullable with no FK constraint to strains — noted referential integrity is application-enforced
- Confirmed `batch_registry.initial_weight_grams` is nullable — trigger INSERT always provides value in practice
- Added "same-day same-strain note" explaining that `initial_weight_grams` stores first-session weight only; cumulative weight requires `SUM()` over `harvest_sessions`
- Added inline comment to `fn_complete_harvest_session` confirming `strains.name` (not `display_name`) is correct for `batch_registry.strain`
- Added `::text` cast note for `performed_by` in batch_production_history
- Added SQL verification query for `strains.abbreviation` nullability

### v1.1 (2026-02-18)
- Added `plant_group_room_history` table definition, RLS policies, and trigger (fn_log_plant_group_room_history)
- Added `mother_plant_group_id` and `is_mother` to `plant_groups` table definition
- Added `group_number` to `plant_groups` and trigger `fn_generate_plant_group_number` (BEFORE INSERT)
- Added `adjusted_weight_grams` and `adjustment_reason` to `harvest_sessions` table definition with CHECK constraints
- Added trigger `fn_sync_harvest_weight_adjustment` (AFTER UPDATE on harvest_sessions)
- Added `mother` to `room_type` CHECK constraint on `grow_rooms`
- Removed COALESCE fallback from `fn_complete_harvest_session` — abbreviation is now required with hard error
- Updated migration plan: C-2-1 now creates five tables (was four); C-2-2 now creates nine trigger+function pairs (was six)
- Updated service layer design: added `moveToRoom`, `setMotherStatus`, `getRoomHistory`, `adjustHarvestWeight`
- Updated type definitions: added `PlantGroupRoomHistory`, updated `PlantGroup` and `HarvestSession` interfaces

### v1.0 (2026-02-18)
- Initial architecture specification written during Session C-1

---

**Document Version:** 1.9
**Last Updated:** 2026-02-19
**Status:** FULLY IMPLEMENTED — all 9 tables and 13 triggers live; entire cultivation pipeline operational
