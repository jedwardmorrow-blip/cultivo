---
title: CULTIVATION
category: Cultivation Module
version: 1.0
updated: 2026-02-18
status: SPECIFICATION — not yet implemented
---

# CULTIVATION - Grow Room & Plant Lifecycle Module

> **Status:** SPECIFICATION — database schema, API, and UI are NOT YET BUILT.
> **Session:** C-1 (documentation). Session C-2 will produce migrations. Session C-3 will produce the UI.
> **Purpose:** Complete specification for tracking plants from clone/seed through harvest, linking directly into the existing batch and inventory pipeline.
> **Cross-References:** [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md), [CULTIVATION-RULES.md](./CULTIVATION-RULES.md), [BATCHES.md](./BATCHES.md), [SESSIONS.md](./SESSIONS.md)

---

## TABLE OF CONTENTS

1. [Why This Module Exists](#why-this-module-exists)
2. [Scope](#scope)
3. [Module Entities](#module-entities)
4. [Lifecycle Overview](#lifecycle-overview)
5. [Grow Rooms](#grow-rooms)
6. [Plant Groups (Batches)](#plant-groups-batches)
7. [Growth Stages](#growth-stages)
8. [Harvest Sessions](#harvest-sessions)
9. [Harvest → Batch Handoff](#harvest--batch-handoff)
10. [Compliance Fields](#compliance-fields)
11. [UI Screens](#ui-screens)
12. [Navigation Integration](#navigation-integration)
13. [Open Questions & Deferred Items](#open-questions--deferred-items)

---

## Why This Module Exists

The existing system begins at "batch created" — the moment material is binned after harvest. Everything before that point (what rooms plants were in, what strain, how long they vegged, actual harvest date, wet weight) is recorded manually on paper or not at all.

The Cultivation module closes this gap by:

1. Recording the plant count and strain per grow room
2. Tracking growth stage transitions (Clone → Veg → Flower → Harvest)
3. Generating a **harvest session** that produces the initial wet weight and directly creates the `batch_registry` record
4. Eliminating manual batch number entry (batch number auto-generated from harvest date + strain abbreviation)

**Result:** The full traceability chain becomes: Plant → Harvest Session → Batch → Processing Sessions → Inventory → Orders → Delivery.

---

## Scope

### In Scope (Session C-2 + C-3)

- Grow room management (create, edit, archive)
- Plant group tracking (strain, count, stage, room)
- Growth stage transitions with timestamps
- Harvest session (weighing, batch creation trigger)
- Basic compliance fields (AZDHS-required: room ID, plant count, harvest date)
- Navigation entry under a new "Cultivation" section

### Out of Scope (explicitly deferred)

- Individual plant-level RFID/tag tracking
- Nutrient / feeding logs
- Environmental sensor integration (temperature, humidity, CO2)
- Mother plant / clone lineage tracking
- Photo documentation
- Yield forecasting / predictive analytics
- Multi-facility / remote grow site support

These items are deferred to future phases and must NOT be scaffolded now to avoid premature complexity.

---

## Module Entities

```
┌──────────────────────────────────────────────────────────────────────┐
│ CULTIVATION MODULE — ENTITY MAP                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  grow_rooms                                                           │
│  ├─ id, name, room_code (unique), capacity_plants                    │
│  ├─ room_type: 'clone' | 'veg' | 'flower' | 'mixed'                  │
│  └─ is_active, created_at                                            │
│                                                                       │
│  plant_groups                                                         │
│  ├─ id, name (optional label)                                        │
│  ├─ strain_id → strains.id (FK, immutable after creation)            │
│  ├─ grow_room_id → grow_rooms.id (mutable — plants move rooms)       │
│  ├─ plant_count (integer, required)                                  │
│  ├─ growth_stage: 'clone'|'veg'|'flower'|'harvested'                 │
│  ├─ stage_entered_at (timestamptz, updated on each transition)       │
│  ├─ planted_date (date, when clones/seeds placed)                    │
│  └─ notes, created_at, created_by                                    │
│                                                                       │
│  plant_group_stage_history  (immutable log)                          │
│  ├─ id, plant_group_id, from_stage, to_stage                        │
│  ├─ transitioned_at, transitioned_by                                 │
│  └─ notes                                                            │
│                                                                       │
│  harvest_sessions                                                     │
│  ├─ id, plant_group_id → plant_groups.id                             │
│  ├─ harvest_date (date, required)                                    │
│  ├─ wet_weight_grams (numeric, required)                             │
│  ├─ plant_count_harvested (integer — may differ from group total)    │
│  ├─ batch_registry_id → batch_registry.id (set on completion)       │
│  ├─ session_status: 'active' | 'completed' | 'cancelled'            │
│  ├─ completed_at, completed_by                                       │
│  └─ notes                                                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Lifecycle Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ CULTIVATION LIFECYCLE                                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. GROW ROOM EXISTS (admin creates once)                            │
│     └─ grow_rooms: Room A (flower), Room B (veg), Clone Room         │
│                                                                       │
│  2. PLANT GROUP CREATED (manager)                                    │
│     ├─ strain_id selected                                            │
│     ├─ plant_count entered                                           │
│     ├─ grow_room_id assigned                                         │
│     └─ growth_stage = 'clone'                                        │
│                                                                       │
│  3. STAGE TRANSITIONS (manager, as plants progress)                  │
│     clone → veg → flower                                             │
│     ├─ Each transition: stage_entered_at updated                     │
│     └─ Each transition: plant_group_stage_history row inserted       │
│                                                                       │
│  4. HARVEST SESSION CREATED (manager, when flower is ready)         │
│     ├─ harvest_date set                                              │
│     ├─ wet_weight_grams entered                                      │
│     └─ session_status = 'active'                                     │
│                                                                       │
│  5. HARVEST SESSION COMPLETED (manager confirms)                     │
│     ├─ DB trigger creates batch_registry row:                        │
│     │  ├─ batch_number = YYMMDD-STRAIN (auto-generated)             │
│     │  ├─ strain_id = plant_group.strain_id                         │
│     │  ├─ harvest_date = harvest_session.harvest_date               │
│     │  ├─ initial_weight_grams = harvest_session.wet_weight_grams   │
│     │  ├─ room = grow_room.room_code                                 │
│     │  └─ lifecycle_state = 'created'                               │
│     ├─ harvest_sessions.batch_registry_id = new batch UUID          │
│     └─ plant_group.growth_stage = 'harvested'                       │
│                                                                       │
│  6. BATCH ENTERS EXISTING PIPELINE                                   │
│     └─ batch_registry.lifecycle_state = 'created'                   │
│        └─ Batch appears in bucking queue (existing workflow)         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Grow Rooms

### Purpose

Grow rooms are the physical spaces where plants live. They are referenced by plant groups and appear on harvest records as required by AZDHS.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | Primary key |
| `name` | text | yes | Human-readable name ("Room A") |
| `room_code` | text | yes | Short code, unique ("RA", "CLONE") |
| `room_type` | text | yes | `clone`, `veg`, `flower`, or `mixed` |
| `capacity_plants` | integer | no | Max plant count (informational) |
| `is_active` | boolean | yes | Default true; archive instead of delete |
| `created_at` | timestamptz | auto | |

### Rules

- `room_code` is unique and immutable after creation (compliance records reference it)
- Rooms cannot be deleted; set `is_active = false` to retire
- A room can hold plant groups of any stage (room_type is informational)

---

## Plant Groups (Batches)

### Purpose

A plant group is a set of plants of the same strain that move through the grow together. It is the pre-harvest equivalent of a batch. One plant group yields one or more harvest sessions (normally one).

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | |
| `name` | text | no | Optional label, e.g. "Batch A Clone Set" |
| `strain_id` | uuid | yes | FK → strains; immutable after creation |
| `grow_room_id` | uuid | yes | FK → grow_rooms; mutable |
| `plant_count` | integer | yes | Count of plants in this group |
| `growth_stage` | text | yes | `clone`, `veg`, `flower`, `harvested` |
| `stage_entered_at` | timestamptz | yes | Set on creation, updated on transition |
| `planted_date` | date | no | Date clones/seeds were placed |
| `notes` | text | no | |
| `created_at` | timestamptz | auto | |
| `created_by` | uuid | auto | FK → auth.users |

### Stage Machine

Valid transitions (enforced by DB trigger):

```
clone → veg
veg → flower
flower → harvested   (only via completing a harvest_session)
```

Backward transitions are **not permitted**. A group cannot move from `veg` back to `clone`.

`harvested` is a terminal state. The group remains visible in history but cannot be modified.

---

## Growth Stages

Four stages map to real-world cultivation phases:

| Stage | Description | Typical Duration |
|-------|-------------|-----------------|
| `clone` | Rooted clone or seedling, pre-veg | 1–3 weeks |
| `veg` | Vegetative growth, extended light period | 4–8 weeks |
| `flower` | Flowering under reduced light | 7–12 weeks |
| `harvested` | Terminal — plant has been cut | N/A |

**Duration tracking:** The system records `stage_entered_at` on each transition. Stage durations are calculated as the difference between consecutive `transitioned_at` values in `plant_group_stage_history`.

---

## Harvest Sessions

### Purpose

A harvest session is the event of cutting a plant group. It captures the wet weight of the harvested material and, on completion, automatically creates the downstream `batch_registry` record.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | |
| `plant_group_id` | uuid | yes | FK → plant_groups |
| `harvest_date` | date | yes | Actual cut date |
| `wet_weight_grams` | numeric | yes | Total wet weight at harvest |
| `plant_count_harvested` | integer | yes | May be < group total if partial harvest |
| `batch_registry_id` | uuid | no | Populated by trigger on completion |
| `session_status` | text | yes | `active`, `completed`, `cancelled` |
| `completed_at` | timestamptz | no | Set on completion |
| `completed_by` | uuid | no | FK → auth.users |
| `notes` | text | no | |

### Completion Trigger

When `session_status` is set to `completed`, a DB trigger fires:

1. Generates `batch_number` using `fn_generate_batch_number(strain_id, harvest_date)`
2. Inserts into `batch_registry` with:
   - `batch_number` = generated value
   - `strain_id` = plant_group.strain_id
   - `harvest_date` = harvest_session.harvest_date
   - `initial_weight_grams` = harvest_session.wet_weight_grams
   - `room` = grow_room.room_code
   - `lifecycle_state` = 'created'
   - `created_by` = harvest_session.completed_by
3. Sets `harvest_sessions.batch_registry_id` = new batch UUID
4. Sets `plant_groups.growth_stage` = 'harvested'
5. Inserts `plant_group_stage_history` record

### Cancellation

A harvest session may be cancelled if the weight entry was incorrect before any batch activity occurs.

- `session_status = 'cancelled'` sets `cancelled_at` and `cancelled_by`
- If `batch_registry_id` is already set: cancellation is **blocked** (batch exists downstream)
- If no batch yet: cancellation proceeds; plant group reverts to `flower` stage

---

## Harvest → Batch Handoff

This is the critical integration point between the Cultivation module and the existing pipeline.

```
harvest_sessions (cultivation)
         │
         │  on completion trigger
         ▼
batch_registry (existing)
  lifecycle_state = 'created'
         │
         ▼  (existing workflow, unchanged)
  Bucking queue → Trim → Package → Orders → Delivery
```

**Key invariants at handoff:**

1. `batch_registry.strain_id` is copied from `plant_groups.strain_id` — never entered manually
2. `batch_registry.initial_weight_grams` is the wet weight from harvest — not the dry/processed weight
3. `batch_registry.room` is copied from `grow_rooms.room_code` — not a free-text field
4. `batch_number` is auto-generated — never manually typed by the user
5. The existing batch lifecycle trigger system picks up from `lifecycle_state = 'created'` with zero changes

---

## Compliance Fields

AZDHS (Arizona Department of Health Services) requires the following information for each harvest:

| Requirement | Source in System |
|-------------|-----------------|
| Facility license number | `app_settings.license_number` (existing) |
| Harvest date | `harvest_sessions.harvest_date` |
| Strain name | `strains.name` via `plant_groups.strain_id` |
| Plant count harvested | `harvest_sessions.plant_count_harvested` |
| Grow room identifier | `grow_rooms.room_code` |
| Wet weight | `harvest_sessions.wet_weight_grams` |
| Responsible employee | `harvest_sessions.completed_by` |

All required fields are enforced as NOT NULL at the DB level.

---

## UI Screens

### 1. Grow Rooms (Settings sub-section)

Location: Settings → Grow Rooms

| Action | Description |
|--------|-------------|
| List | Table of rooms: name, code, type, capacity, status |
| Create | Modal form: name, room_code, room_type, capacity_plants |
| Edit | Same fields, except room_code is read-only |
| Archive | Toggle is_active; removes from plant group selects |

### 2. Plant Groups (Cultivation main screen)

Location: Cultivation → Plant Groups

| View | Description |
|------|-------------|
| Active | Groups in clone, veg, or flower stage |
| Harvested | Groups with growth_stage = 'harvested' |

| Action | Description |
|--------|-------------|
| Create | Strain, room, count, planted date |
| Advance Stage | Button: "Move to Veg" / "Move to Flower" — one click, confirmed |
| Start Harvest | Opens harvest session form (flower stage only) |
| View History | Stage history log for the group |

### 3. Harvest Sessions

Location: Cultivation → Harvest Sessions (tab or sub-nav)

| View | Description |
|------|-------------|
| Active | Sessions with status = 'active' |
| Completed | Sessions with status = 'completed', showing linked batch_number |

| Action | Description |
|--------|-------------|
| Start | Plant group, harvest date, wet weight, plant count |
| Complete | Confirmation step showing batch number to be created |
| Cancel | Only available if no batch yet created |

---

## Navigation Integration

The Cultivation module appears as a new top-level section in the sidebar, between Dashboard and Sessions (reflecting the real-world sequence of operations).

```
Dashboard
Cultivation          ← NEW
  Plant Groups
  Harvest Sessions
Sessions
  Trim
  Bucking
  Packaging
Inventory
...
```

Implementation note: the section navigation is driven by `src/shared/components/navigation/sectionNavigation.ts` (the `sectionDefinitions` array). A new section entry with sub-items is added there. Each view ID must also have a corresponding `case` in `App.tsx`'s `renderView()` switch. Note: `menuStructure.ts` is a legacy hamburger-drawer menu file and is NOT where the cultivation entry goes.

---

## Open Questions & Deferred Items

| Item | Decision | Rationale |
|------|----------|-----------|
| Multiple harvests per plant group | Allowed (one harvest session per cut event; group remains active until all plants cut) | Some operations do partial harvests |
| Room transfers (plant group moves rooms) | Allowed by updating `grow_room_id`; logged via notes field | Plants move to flower room from veg room |
| Same batch number on same-strain same-day harvest | Existing rule applies: both harvest sessions share same batch number via UNIQUE constraint resolution | See BATCHES.md |
| Wet weight required? | Yes — it is the initial_weight_grams source of truth; cannot complete harvest without it | Required for yield analytics |
| Can a batch be created without going through Cultivation? | Yes — existing manual batch creation (BatchManagement.tsx) remains supported indefinitely | Legacy data and edge cases |

---

## Document Version History

### v1.0 (2026-02-18)
- Initial specification written during Session C-1 (documentation-only)
- No code or migrations produced in this session
- Covers: scope, entities, lifecycle, grow rooms, plant groups, stages, harvest sessions, handoff, compliance, UI, navigation

---

**Document Version:** 1.0
**Last Updated:** 2026-02-18
**Status:** SPECIFICATION — implementation pending Session C-2
**Review:** Required before Session C-2 begins
