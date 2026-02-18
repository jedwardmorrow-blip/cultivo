---
title: CULTIVATION-ARCHITECTURE
category: Cultivation Module
version: 1.2
updated: 2026-02-18
status: SPECIFICATION — not yet implemented
---

# CULTIVATION — Architecture & Database Design

> **Status:** SPECIFICATION — no migrations have been run yet.
> **Audience:** AI building Session C-2 (migrations) and Session C-3 (UI).
> **Purpose:** Complete, unambiguous database schema, RLS, triggers, and integration design.
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
│                                                                      │
│  plant_groups                                                        │
│  ├─ PK: id uuid                                                      │
│  ├─ group_number text UNIQUE NOT NULL  (auto-generated PG-YYMMDD-ABV)│
│  ├─ FK: strain_id → strains(id)  [immutable]                        │
│  ├─ FK: grow_room_id → grow_rooms(id)                               │
│  ├─ FK: mother_plant_group_id → plant_groups(id)  [nullable]        │
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
│  ├─ wet_weight_grams numeric NOT NULL                                │
│  ├─ adjusted_weight_grams numeric  [nullable, post-entry correction] │
│  ├─ adjustment_reason text  [nullable, required when adjusted]       │
│  └─ session_status text  ['active','completed','cancelled']         │
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
  is_mother              boolean NOT NULL DEFAULT false,
  plant_count            integer NOT NULL CHECK (plant_count > 0),
  growth_stage           text NOT NULL DEFAULT 'clone'
                           CHECK (growth_stage IN ('clone', 'veg', 'flower', 'harvested')),
  stage_entered_at       timestamptz NOT NULL DEFAULT now(),
  planted_date           date,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_groups ENABLE ROW LEVEL SECURITY;
```

**Note:** `group_number` is generated by trigger `trg_generate_plant_group_number` (BEFORE INSERT). It is declared NOT NULL but the trigger always sets it — no application code should populate this column.

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

## Migration Plan

Four migrations, in order:

### Migration C-2-1: Create Cultivation Tables

File: `YYYYMMDD_create_cultivation_schema.sql`

Creates (five tables, all with RLS enabled and policies applied):
- `grow_rooms`
- `plant_groups` (includes `group_number`, `mother_plant_group_id`, `is_mother`)
- `plant_group_stage_history`
- `plant_group_room_history`
- `harvest_sessions` (includes `adjusted_weight_grams`, `adjustment_reason`)

### Migration C-2-2: Create Cultivation Triggers

File: `YYYYMMDD_create_cultivation_triggers.sql`

Creates (in order, dependencies respected):
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

File: `YYYYMMDD_seed_cultivation_rooms.sql`

Seeds the initial grow rooms based on the facility's actual room layout. This is data, not schema — consult the operator before running.

---

## Frontend Module Structure

Following the existing feature module pattern:

```
src/features/cultivation/
  components/
    GrowRoomForm.tsx              -- Create/edit grow room
    GrowRoomsManagement.tsx       -- List + manage rooms (settings screen)
    PlantGroupForm.tsx            -- Create plant group (strain, room, mother selector)
    PlantGroupsList.tsx           -- Active plant groups table
    PlantGroupDetail.tsx          -- Stage history + room history inline view
    MoveToRoomModal.tsx           -- Room transfer modal (independent of stage advance)
    HarvestSessionForm.tsx        -- Start/complete harvest
    HarvestSessionsList.tsx       -- History of harvest sessions
    HarvestWeightAdjustModal.tsx  -- Post-completion weight correction modal
    CultivationDashboard.tsx      -- Top-level view with tabs
    index.ts
  hooks/
    useGrowRooms.ts               -- CRUD + realtime for grow_rooms
    usePlantGroups.ts             -- CRUD + realtime for plant_groups
    useHarvestSessions.ts         -- CRUD + realtime for harvest_sessions
    index.ts
  services/
    cultivation.service.ts        -- All Supabase queries for cultivation
    index.ts
  types/
    cultivation.types.ts          -- All cultivation interfaces
    index.ts
  index.ts
```

**Naming conventions:** Follow the exact pattern of `src/features/sessions/` (the closest analogue). Services export typed async functions. Hooks wrap services with loading/error state.

---

## Service Layer Design

```typescript
// cultivation.service.ts — exported function signatures (not yet implemented)

export const cultivationService = {
  // Grow Rooms
  listGrowRooms(): Promise<GrowRoom[]>
  createGrowRoom(data: CreateGrowRoomInput): Promise<GrowRoom>
  updateGrowRoom(id: string, data: UpdateGrowRoomInput): Promise<GrowRoom>
  archiveGrowRoom(id: string): Promise<void>

  // Plant Groups
  listPlantGroups(filter?: { stage?: GrowthStage }): Promise<PlantGroup[]>
  createPlantGroup(data: CreatePlantGroupInput): Promise<PlantGroup>
  advanceStage(id: string, toStage: GrowthStage): Promise<PlantGroup>
  moveToRoom(id: string, toRoomId: string, notes?: string): Promise<PlantGroup>
  setMotherStatus(id: string, isMother: boolean): Promise<PlantGroup>
  getStageHistory(id: string): Promise<PlantGroupStageHistory[]>
  getRoomHistory(id: string): Promise<PlantGroupRoomHistory[]>

  // Harvest Sessions
  listHarvestSessions(filter?: { status?: HarvestSessionStatus }): Promise<HarvestSession[]>
  createHarvestSession(data: CreateHarvestSessionInput): Promise<HarvestSession>
  completeHarvestSession(id: string): Promise<HarvestSession>
  cancelHarvestSession(id: string): Promise<HarvestSession>
  adjustHarvestWeight(id: string, adjustedWeight: number, reason: string): Promise<HarvestSession>
}
```

**`moveToRoom` implementation note:** This function updates only `grow_room_id` on `plant_groups`. The DB trigger `trg_log_plant_group_room_history` handles inserting into `plant_group_room_history` automatically. The service must NOT also insert into that table.

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

export type CreateGrowRoomInput = Pick<GrowRoom, 'name' | 'room_code' | 'room_type'> &
  Partial<Pick<GrowRoom, 'capacity_plants'>>;

export type UpdateGrowRoomInput = Partial<Pick<GrowRoom, 'name' | 'room_type' | 'capacity_plants' | 'is_active'>>;

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes' | 'mother_plant_group_id' | 'is_mother'>>;

export type CreateHarvestSessionInput = Pick<HarvestSession, 'plant_group_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes'>>;
```

---

## Document Version History

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

**Document Version:** 1.2
**Last Updated:** 2026-02-18
**Status:** SPECIFICATION — implementation pending Session C-2
