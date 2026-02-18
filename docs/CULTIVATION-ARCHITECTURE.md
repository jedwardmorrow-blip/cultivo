---
title: CULTIVATION-ARCHITECTURE
category: Cultivation Module
version: 1.0
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
│  └─ is_active boolean DEFAULT true                                   │
│                                                                      │
│  plant_groups                                                        │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: strain_id → strains(id)  [immutable]                        │
│  ├─ FK: grow_room_id → grow_rooms(id)                               │
│  └─ growth_stage text  ['clone','veg','flower','harvested']         │
│                                                                      │
│  plant_group_stage_history                                           │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: plant_group_id → plant_groups(id)                           │
│  └─ immutable log (no UPDATE/DELETE allowed)                        │
│                                                                      │
│  harvest_sessions                                                    │
│  ├─ PK: id uuid                                                      │
│  ├─ FK: plant_group_id → plant_groups(id)                           │
│  ├─ FK: batch_registry_id → batch_registry(id)  [nullable, set on  │
│  │     completion]                                                   │
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
                  CHECK (room_type IN ('clone', 'veg', 'flower', 'mixed')),
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
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text,
  strain_id        uuid NOT NULL REFERENCES strains(id),
  grow_room_id     uuid NOT NULL REFERENCES grow_rooms(id),
  plant_count      integer NOT NULL CHECK (plant_count > 0),
  growth_stage     text NOT NULL DEFAULT 'clone'
                     CHECK (growth_stage IN ('clone', 'veg', 'flower', 'harvested')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  planted_date     date,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_groups ENABLE ROW LEVEL SECURITY;
```

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

### harvest_sessions

```sql
CREATE TABLE IF NOT EXISTS harvest_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id        uuid NOT NULL REFERENCES plant_groups(id),
  harvest_date          date NOT NULL,
  wet_weight_grams      numeric(10, 2) NOT NULL CHECK (wet_weight_grams > 0),
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
  USING (true);

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
  USING (true);

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
  USING (true);

CREATE POLICY "Authenticated users can insert stage history"
  ON plant_group_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

Note: No UPDATE or DELETE policy on `plant_group_stage_history`. This table is an immutable audit log.

### harvest_sessions

```sql
CREATE POLICY "Authenticated users can view harvest sessions"
  ON harvest_sessions FOR SELECT
  TO authenticated
  USING (true);

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

### 1. Validate Stage Transition

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

### 2. Log Stage History

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

### 3. Harvest Session Completion → Create Batch

Fires AFTER UPDATE on `harvest_sessions` when `session_status` changes to `'completed'`.

This is the critical integration trigger.

```sql
CREATE OR REPLACE FUNCTION fn_complete_harvest_session()
RETURNS trigger AS $$
DECLARE
  v_strain_id      uuid;
  v_room_code      text;
  v_batch_number   text;
  v_batch_id       uuid;
  v_date_prefix    text;
  v_strain_abbrev  text;
BEGIN
  IF NEW.session_status != 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT pg.strain_id, gr.room_code
  INTO v_strain_id, v_room_code
  FROM plant_groups pg
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  WHERE pg.id = NEW.plant_group_id;

  SELECT abbreviation INTO v_strain_abbrev
  FROM strains WHERE id = v_strain_id;

  v_date_prefix  := to_char(NEW.harvest_date, 'YYMMDD');
  v_batch_number := v_date_prefix || '-' || v_strain_abbrev;

  INSERT INTO batch_registry (
    batch_number,
    strain_id,
    harvest_date,
    initial_weight_grams,
    room,
    lifecycle_state,
    created_by
  ) VALUES (
    v_batch_number,
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
    input_weight,
    notes,
    created_by
  ) VALUES (
    v_batch_id,
    'batch_created',
    NEW.wet_weight_grams,
    'Batch created from harvest session ' || NEW.id,
    NEW.completed_by
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
- `ON CONFLICT (batch_number) DO NOTHING` handles same-strain same-day harvest: the second harvest session links to the existing batch.
- Trigger fires BEFORE UPDATE so it can set `NEW.batch_registry_id` and `NEW.completed_at` in one write.
- The `batch_production_history` insert creates the required audit trail entry.

### 4. Block Harvest Cancellation if Batch Exists

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

### 5. Block room_code Changes After Creation

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

### 6. Block strain_id Changes After Creation

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

### strains Table (existing)

`plant_groups.strain_id` references the existing `strains` table. No changes to `strains` are needed. The strain abbreviation field (`strains.abbreviation`) is used in batch number generation — confirm this column exists before running migration C-2.

```sql
-- Verify before migration:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'strains' AND column_name = 'abbreviation';
```

### batch_registry Table (existing)

`harvest_sessions.batch_registry_id` references the existing `batch_registry` table. No schema changes to `batch_registry` are required. The cultivation module only INSERTs new rows; it does not modify existing rows.

### batch_production_history Table (existing)

The completion trigger inserts a `batch_created` event into this existing table. The schema is already correct.

### fn_generate_batch_number (new, but consistent with existing docs)

`BATCHES.md` documents this function as "NOT IMPLEMENTED" (GAP-017). The cultivation completion trigger implements it inline. If a standalone `fn_generate_batch_number` function is ever created separately, the trigger should be updated to call it instead of inlining the logic.

---

## Migration Plan

Three migrations, in order:

### Migration C-2-1: Create Cultivation Tables

File: `YYYYMMDD_create_cultivation_schema.sql`

Creates:
- `grow_rooms`
- `plant_groups`
- `plant_group_stage_history`
- `harvest_sessions`

All four tables with RLS enabled and policies applied.

### Migration C-2-2: Create Cultivation Triggers

File: `YYYYMMDD_create_cultivation_triggers.sql`

Creates (in order):
1. `fn_validate_plant_group_stage_transition` + trigger
2. `fn_log_plant_group_stage_history` + trigger
3. `fn_complete_harvest_session` + trigger
4. `fn_validate_harvest_cancellation` + trigger
5. `fn_protect_room_code` + trigger
6. `fn_protect_plant_group_strain` + trigger

### Migration C-2-3: Seed Grow Rooms (optional)

File: `YYYYMMDD_seed_cultivation_rooms.sql`

Seeds the initial grow rooms based on the facility's actual room layout. This is data, not schema — consult the operator before running.

---

## Frontend Module Structure

Following the existing feature module pattern:

```
src/features/cultivation/
  components/
    GrowRoomForm.tsx          -- Create/edit grow room
    GrowRoomsManagement.tsx   -- List + manage rooms (settings screen)
    PlantGroupForm.tsx        -- Create/advance/view plant group
    PlantGroupsList.tsx       -- Active plant groups table
    HarvestSessionForm.tsx    -- Start/complete harvest
    HarvestSessionsList.tsx   -- History of harvest sessions
    CultivationDashboard.tsx  -- Top-level view with tabs
    index.ts
  hooks/
    useGrowRooms.ts           -- CRUD + realtime for grow_rooms
    usePlantGroups.ts         -- CRUD + realtime for plant_groups
    useHarvestSessions.ts     -- CRUD + realtime for harvest_sessions
    index.ts
  services/
    cultivation.service.ts    -- All Supabase queries for cultivation
    index.ts
  types/
    cultivation.types.ts      -- CultivationRoom, PlantGroup, HarvestSession interfaces
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
  getStageHistory(id: string): Promise<PlantGroupStageHistory[]>

  // Harvest Sessions
  listHarvestSessions(filter?: { status?: HarvestSessionStatus }): Promise<HarvestSession[]>
  createHarvestSession(data: CreateHarvestSessionInput): Promise<HarvestSession>
  completeHarvestSession(id: string): Promise<HarvestSession>
  cancelHarvestSession(id: string): Promise<HarvestSession>
}
```

---

## Type Definitions

```typescript
// cultivation.types.ts

export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mixed';
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
  name: string | null;
  strain_id: string;
  grow_room_id: string;
  plant_count: number;
  growth_stage: GrowthStage;
  stage_entered_at: string;
  planted_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  // Joins (when fetched with select)
  strains?: { name: string; abbreviation: string };
  grow_rooms?: { name: string; room_code: string };
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

export interface HarvestSession {
  id: string;
  plant_group_id: string;
  harvest_date: string;
  wet_weight_grams: number;
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
  plant_groups?: Pick<PlantGroup, 'strain_id' | 'grow_room_id'> & {
    strains?: { name: string };
    grow_rooms?: { room_code: string };
  };
  batch_registry?: { batch_number: string };
}

export type CreateGrowRoomInput = Pick<GrowRoom, 'name' | 'room_code' | 'room_type'> &
  Partial<Pick<GrowRoom, 'capacity_plants'>>;

export type UpdateGrowRoomInput = Partial<Pick<GrowRoom, 'name' | 'room_type' | 'capacity_plants' | 'is_active'>>;

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes'>>;

export type CreateHarvestSessionInput = Pick<HarvestSession, 'plant_group_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes'>>;
```

---

## Document Version History

### v1.0 (2026-02-18)
- Initial architecture specification written during Session C-1
- Covers: full schema, RLS, all triggers, migration plan, module structure, service signatures, type definitions

---

**Document Version:** 1.0
**Last Updated:** 2026-02-18
**Status:** SPECIFICATION — implementation pending Session C-2
