---
title: CULTIVATION
category: Cultivation Module
version: 1.6
updated: 2026-02-19
status: IMPLEMENTED — fully operational in production
---

# CULTIVATION - Grow Room & Plant Lifecycle Module

> **Status:** IMPLEMENTED — database schema, triggers, service layer, and UI are all built and live. Room layout tables (room_tables, room_sections) added in C-4. Run dates (flip_date, projected_harvest_date) on room_sections added in C-5A. Plant group placement FKs, Layout Builder, Flip Room action, and Room Map grid added in C-5B.
> **Session history:** C-1 (documentation), C-2 (migrations + triggers), C-3 (UI), C-4 (room layout schema), C-5A (run dates on sections), C-5B (plant placement + flip + room map) — all complete.
> **Purpose:** Complete reference for tracking plants from clone/seed through harvest, linking directly into the existing batch and inventory pipeline.
> **Cross-References:** [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md), [CULTIVATION-RULES.md](./CULTIVATION-RULES.md), [BATCHES.md](./BATCHES.md), [SESSIONS.md](./SESSIONS.md)

---

## TABLE OF CONTENTS

1. [Why This Module Exists](#why-this-module-exists)
2. [Scope](#scope)
3. [Module Entities](#module-entities)
4. [Lifecycle Overview](#lifecycle-overview)
5. [Grow Rooms](#grow-rooms)
6. [Plant Groups (Batches)](#plant-groups-batches)
7. [Mother Plants](#mother-plants)
8. [Growth Stages](#growth-stages)
9. [Room Transfers](#room-transfers)
10. [Harvest Sessions](#harvest-sessions)
11. [Harvest Weight Adjustments](#harvest-weight-adjustments)
12. [Harvest → Batch Handoff](#harvest--batch-handoff)
13. [Compliance Fields](#compliance-fields)
14. [UI Screens](#ui-screens)
15. [Navigation Integration](#navigation-integration)
16. [Strain Abbreviation — Mandatory System Requirement](#strain-abbreviation--mandatory-system-requirement)
17. [Open Questions & Deferred Items](#open-questions--deferred-items)

---

## Why This Module Exists

The existing system begins at "batch created" — the moment material is binned after harvest. Everything before that point (what rooms plants were in, what strain, how long they vegged, actual harvest date, wet weight) is recorded manually on paper or not at all.

The Cultivation module closes this gap by:

1. Recording the plant count and strain per grow room
2. Tracking growth stage transitions (Clone → Veg → Flower → Harvest)
3. Tracking room transfers independently of stage advances
4. Recording mother plant lineage so each clone batch traces back to its source
5. Generating a **harvest session** that produces the initial wet weight and directly creates the `batch_registry` record
6. Eliminating manual batch number entry (batch number auto-generated from harvest date + strain abbreviation)

**Result:** The full traceability chain becomes: Mother Plant → Clone Group → Harvest Session → Batch → Processing Sessions → Inventory → Orders → Delivery.

---

## Scope

### Implemented (Sessions C-2 + C-3 + C-4 + C-5A + C-5B — complete)

- Grow room management (create, edit, archive) — Settings → Grow Rooms
- Room table and section structure — DB schema (C-4) + Layout Builder UI in Settings → Grow Rooms (C-5B)
- Run date tracking per section (flip date, projected harvest date, Day N counter, run length, countdown) — C-5A
- Plant group placement (room_table_id, room_section_id FKs on plant_groups) — C-5B
- Room Map grid in Cultivation view (tables × sections grid, plant group occupancy per cell) — C-5B
- Flip Room action (bulk stage advance to flower + set flip date on all sections in room) — C-5B
- Section-aware Move to Room flow (optional section assignment after room transfer) — C-5B
- Plant group tracking (strain, count, stage, room) — Cultivation → Plant Groups
- Mother plant designation and clone lineage (mother_plant_group_id FK)
- Growth stage transitions with timestamps
- Room transfer logging as an independent action
- Harvest session (weighing, batch creation trigger) — Cultivation → Harvest Sessions
- Post-harvest weight adjustment (for data entry corrections)
- Basic compliance fields (AZDHS-required: room ID, plant count, harvest date)
- Navigation entry under "Cultivation" section in sidebar

### Out of Scope (explicitly deferred)

- Individual plant-level RFID/tag tracking
- Nutrient / feeding logs
- Environmental sensor integration (temperature, humidity, CO2)
- Photo documentation
- Yield forecasting / predictive analytics
- Multi-facility / remote grow site support
- Partial harvests (plant group stays active after cutting some plants)
- Cancellation after a batch has been created via harvest

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
│  ├─ room_type: 'clone' | 'veg' | 'flower' | 'mother' | 'mixed'      │
│  └─ is_active, created_at                                            │
│                                                                       │
│  room_tables  [C-4 — DB schema only; UI pending C-5+]                │
│  ├─ id, grow_room_id → grow_rooms.id                                 │
│  ├─ table_number (integer, unique per room, required)                │
│  ├─ table_name (text, optional human label)                          │
│  ├─ total_sqft (numeric, optional)                                   │
│  └─ is_active, created_at, created_by                                │
│                                                                       │
│  room_sections  [C-4 schema; C-5A adds run date fields]              │
│  ├─ id, room_table_id → room_tables.id                               │
│  ├─ section_label (text, unique per table, required)                 │
│  ├─ section_sqft (numeric, optional)                                 │
│  ├─ flip_date (date, nullable) — date section's batch flipped to FLW│
│  ├─ projected_harvest_date (date, nullable) — expected harvest date  │
│  └─ is_active, created_at, created_by                                │
│                                                                       │
│  plant_groups                                                         │
│  ├─ id, group_number (human-readable, auto-generated)                │
│  ├─ name (optional label)                                            │
│  ├─ strain_id → strains.id (FK, immutable after creation)            │
│  ├─ grow_room_id → grow_rooms.id (mutable — plants move rooms)       │
│  ├─ mother_plant_group_id → plant_groups.id (nullable self-ref FK)   │
│  ├─ room_table_id → room_tables.id (nullable — current placement)    │
│  ├─ room_section_id → room_sections.id (nullable — current placement)│
│  ├─ is_mother (boolean — designates as a source mother plant)        │
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
│  plant_group_room_history  (immutable log)                           │
│  ├─ id, plant_group_id, from_room_id, to_room_id                    │
│  ├─ moved_at, moved_by                                               │
│  └─ notes                                                            │
│                                                                       │
│  harvest_sessions                                                     │
│  ├─ id, plant_group_id → plant_groups.id                             │
│  ├─ harvest_date (date, required)                                    │
│  ├─ wet_weight_grams (numeric, required)                             │
│  ├─ adjusted_weight_grams (numeric, nullable — post-entry correction)│
│  ├─ adjustment_reason (text, nullable — required if adjusted)        │
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
│  2. MOTHER GROUP CREATED (optional, manager)                         │
│     ├─ strain_id selected                                            │
│     ├─ is_mother = true                                              │
│     └─ growth_stage = 'clone' (advances to flower normally)          │
│                                                                       │
│  3. CLONE GROUP CREATED (manager)                                    │
│     ├─ strain_id selected                                            │
│     ├─ mother_plant_group_id = selected mother group (optional)      │
│     ├─ plant_count entered                                           │
│     ├─ grow_room_id assigned                                         │
│     └─ growth_stage = 'clone'                                        │
│                                                                       │
│  4. ROOM TRANSFER (independent action — manager)                     │
│     ├─ grow_room_id updated on plant_groups                          │
│     └─ plant_group_room_history row inserted                         │
│                                                                       │
│  5. STAGE TRANSITIONS (manager, as plants progress)                  │
│     clone → veg → flower                                             │
│     ├─ Each transition: stage_entered_at updated                     │
│     └─ Each transition: plant_group_stage_history row inserted       │
│                                                                       │
│  6. HARVEST SESSION CREATED (manager, when flower is ready)         │
│     ├─ harvest_date set                                              │
│     ├─ wet_weight_grams entered                                      │
│     └─ session_status = 'active'                                     │
│                                                                       │
│  7. HARVEST SESSION COMPLETED (manager confirms)                     │
│     ├─ DB trigger validates strain has abbreviation set              │
│     ├─ DB trigger creates batch_registry row:                        │
│     │  ├─ batch_number = YYMMDD-ABBREV (from strains.abbreviation)  │
│     │  ├─ strain_id = plant_group.strain_id                         │
│     │  ├─ harvest_date = harvest_session.harvest_date               │
│     │  ├─ initial_weight_grams = harvest_session.wet_weight_grams   │
│     │  ├─ room = grow_room.room_code                                 │
│     │  └─ lifecycle_state = 'created'                               │
│     ├─ harvest_sessions.batch_registry_id = new batch UUID          │
│     └─ plant_group.growth_stage = 'harvested'                       │
│                                                                       │
│  8. WEIGHT ADJUSTMENT (optional, if error discovered)               │
│     ├─ adjusted_weight_grams set on harvest_session                  │
│     ├─ adjustment_reason required                                    │
│     └─ DB trigger updates batch_registry.initial_weight_grams       │
│                                                                       │
│  9. BATCH ENTERS EXISTING PIPELINE                                   │
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
| `room_type` | text | yes | `clone`, `veg`, `flower`, `mother`, or `mixed` |
| `capacity_plants` | integer | no | Max plant count (informational) |
| `is_active` | boolean | yes | Default true; archive instead of delete |
| `created_at` | timestamptz | auto | |

### Rules

- `room_code` is unique and immutable after creation (compliance records reference it)
- Rooms cannot be deleted; set `is_active = false` to retire
- A room can hold plant groups of any stage (room_type is informational only)
- `mother` room type added to support dedicated mother plant rooms

### Room Layout (Tables and Sections)

Each grow room can be subdivided into numbered tables, and each table can be further subdivided into labeled sections. This structure was added in Session C-4.

**room_tables** — a physical table inside a grow room:
- Identified by `table_number` (positive integer, unique within the room)
- Optional `table_name` for a human-readable label (e.g., "Back Wall Left")
- Optional `total_sqft` for space tracking
- Soft-delete via `is_active = false`

**room_sections** — a labeled subdivision of a table:
- Identified by `section_label` (e.g., "A", "B", "01", "Left"), unique within the table
- Optional `section_sqft` for section-level space tracking
- Soft-delete via `is_active = false`

**Current status (C-4):** The `room_tables` and `room_sections` tables are live in the database with RLS enabled. No UI management screen exists yet — that is planned for Session C-5 alongside plant group placement. No plant group columns reference these tables yet; those FK columns (`room_table_id`, `room_section_id`) will be added to `plant_groups` in C-5.

**Square footage:** Total room sqft is derived by summing `room_tables.total_sqft` (no denormalized total on `grow_rooms`). Section totals are not required to sum to table totals — these are informational fields only.

---

## Plant Groups (Batches)

### Purpose

A plant group is a set of plants of the same strain that move through the grow together. It is the pre-harvest equivalent of a batch. One plant group yields one harvest session (normally).

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | |
| `group_number` | text | auto | Human-readable ID, e.g. `PG-260218-OGK`. Auto-generated on insert. |
| `name` | text | no | Optional label, e.g. "Batch A Clone Set" |
| `strain_id` | uuid | yes | FK → strains; immutable after creation |
| `grow_room_id` | uuid | yes | FK → grow_rooms; mutable (updated by Move to Room action) |
| `mother_plant_group_id` | uuid | no | FK → plant_groups (self-ref); the mother group clones were cut from |
| `is_mother` | boolean | no | True if this group is designated as a mother plant source. Default false. |
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

### group_number Format

Auto-generated on INSERT by DB trigger as `PG-YYMMDD-ABBREV`, where:
- `YYMMDD` is the creation date
- `ABBREV` is `strains.abbreviation` (same strain abbreviation used in batch numbers)

If a strain has no abbreviation, the trigger raises an error — the same enforcement applied to harvest completion. Users must set the abbreviation before creating a plant group for that strain.

This gives operators a human-readable reference (e.g., `PG-260218-OGK`) that is distinct from but visually consistent with the batch number format (`260218-OGK`).

---

## Mother Plants

### Purpose

A mother plant is a plant group designated as the source from which clones are cut. Mother plants may be in any growth stage — they often live permanently in a dedicated mother room and can transition through clone → veg → flower like any other group. The `is_mother` flag simply designates that this group is actively used as a clone source.

### Rules

- Any plant group may be designated as a mother by setting `is_mother = true`
- `is_mother` can be toggled by managers at any time — it is not immutable
- When creating a clone group, the user may optionally select a mother group via `mother_plant_group_id`
- `mother_plant_group_id` references another row in `plant_groups` (self-referencing FK)
- The selected mother group must be an active (non-harvested) plant group at the time of clone creation
- A mother group can source any number of clone groups (one-to-many relationship)
- Mother groups advance through stages, get harvested, and create batches exactly like non-mother groups — `is_mother` does not change their lifecycle
- When a mother group is harvested, its `is_mother` flag should be set to `false` as part of the harvest completion (handled in the UI, not enforced by DB trigger)

### UI Behavior

- Clone group creation form shows a "Source Mother" optional selector, filtered to `is_mother = true` AND `growth_stage != 'harvested'`
- Plant group detail view shows "Mother: {group_number}" if `mother_plant_group_id` is set
- Plant group detail view shows "Clones Cut From This Group: {count}" if any child groups reference it
- Mother groups are indicated with a badge in the plant groups list

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

**Stage advance and room transfer are independent actions.** A plant must be moved to the appropriate room before or after advancing stage — they are not coupled. The "Advance Stage" button and the "Move to Room" button are separate UI actions on the plant group detail view.

---

## Room Transfers

### Purpose

Plants are frequently moved between rooms as they progress (e.g., from clone room to veg room, from veg room to flower room). These transfers must be logged independently of stage transitions — a room move does not imply a stage change, and a stage change does not imply a room move.

### How It Works

1. Manager selects a plant group and clicks "Move to Room"
2. A modal prompts for the destination room and optional notes
3. On confirmation:
   - `plant_groups.grow_room_id` is updated to the new room
   - A row is inserted into `plant_group_room_history`
4. The stage is not changed

### plant_group_room_history Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | auto | |
| `plant_group_id` | uuid | yes | FK → plant_groups |
| `from_room_id` | uuid | yes | FK → grow_rooms |
| `to_room_id` | uuid | yes | FK → grow_rooms |
| `moved_at` | timestamptz | auto | |
| `moved_by` | uuid | no | FK → auth.users |
| `notes` | text | no | |

This table is **append-only** (no UPDATE or DELETE RLS policy), mirroring the immutability of `plant_group_stage_history`.

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
| `adjusted_weight_grams` | numeric | no | Corrected weight; set after completion if entry error discovered |
| `adjustment_reason` | text | no | Required when `adjusted_weight_grams` is set |
| `plant_count_harvested` | integer | yes | May be < group total if partial harvest |
| `batch_registry_id` | uuid | no | Populated by trigger on completion |
| `session_status` | text | yes | `active`, `completed`, `cancelled` |
| `completed_at` | timestamptz | no | Set on completion |
| `completed_by` | uuid | no | FK → auth.users |
| `notes` | text | no | |

### Completion Trigger

When `session_status` is set to `completed`, a DB trigger fires:

1. Validates that `strains.abbreviation` is NOT NULL — raises an error if missing (see invariant C-11)
2. Generates `batch_number` as `YYMMDD-ABBREV` using the strain's abbreviation
3. Inserts into `batch_registry` (or finds existing for same-strain same-day harvests)
4. Sets `harvest_sessions.batch_registry_id` = batch UUID
5. Sets `plant_groups.growth_stage` = 'harvested'
6. Inserts `plant_group_stage_history` record
7. Inserts `batch_production_history` audit record

### Cancellation

A harvest session may be cancelled only if no batch has been created yet (i.e., `session_status = 'active'`).

- If `batch_registry_id` is already set: cancellation is **blocked** (batch exists downstream)
- If no batch yet: cancellation proceeds; plant group reverts to `flower` stage

---

## Harvest Weight Adjustments

### Purpose

After a harvest session is completed, the wet weight may need to be corrected if a data entry error is discovered (e.g., scale was tared incorrectly, wrong unit entered).

### How It Works

1. Manager opens a completed harvest session and clicks "Adjust Weight"
2. A modal prompts for the corrected weight and a mandatory reason
3. On confirmation:
   - `harvest_sessions.adjusted_weight_grams` is set to the new value
   - `harvest_sessions.adjustment_reason` is set
   - A DB trigger updates `batch_registry.initial_weight_grams` to the adjusted value
   - The original `wet_weight_grams` is preserved for audit purposes

### Rules

- `adjusted_weight_grams` must be > 0
- `adjustment_reason` is required whenever `adjusted_weight_grams` is set
- The adjustment can only be made on sessions with `session_status = 'completed'`
- Adjustments are permitted even after the batch has entered the downstream pipeline (the weight field on batch_registry is display/reference data at that point; the actual inventory quantities are managed by the movement ledger)
- Only one adjustment is supported per harvest session. A second adjustment overwrites the first (the reason field should describe the full correction history if multiple errors occurred)

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

1. `batch_registry.strain_id` is copied from `plant_groups.strain_id` — never entered manually. Note: the DB has no FK constraint on this column; referential integrity is application-enforced.
2. `batch_registry.initial_weight_grams` is the wet weight from the **first** harvest session — not the dry/processed weight, and not a sum across multiple same-day harvests. For total batch harvest weight across multiple sessions, query `SUM(wet_weight_grams)` from `harvest_sessions`.
3. `batch_registry.room` is copied from `grow_rooms.room_code` — not a free-text field
4. `batch_number` is auto-generated using `strains.abbreviation` — the abbreviation must be set by the user in Settings → Strains (Products → Strains) before harvest can complete. **Exactly 3 uppercase letters required.**
5. `batch_registry.strain` (the name text column) is populated from `strains.name` — NOT `strains.display_name`. These may differ; use `name` consistently.
6. The existing batch lifecycle trigger system picks up from `lifecycle_state = 'created'` with zero changes

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
| Wet weight | `harvest_sessions.wet_weight_grams` (or `adjusted_weight_grams` if set) |
| Responsible employee | `harvest_sessions.completed_by` |

All required fields are enforced as NOT NULL at the DB level.

---

## UI Screens

### 1. Grow Rooms (Settings sub-section)

Location: Settings → Grow Rooms

| Action | Description |
|--------|-------------|
| List | Cards per room: name, code, type, capacity, status |
| Create | Modal form: name, room_code, room_type, capacity_plants |
| Edit | Same fields, except room_code is read-only |
| Archive | Toggle is_active; removes from plant group selects |
| Expand (flower rooms only) | Chevron toggle reveals Section Run Dates panel |
| Configure Layout | Accordion per room card — opens Layout Builder |

#### Section Run Dates Panel (flower rooms only)

Flower room cards have an expandable panel listing all active sections for that room, organized by table. Each section row shows:

| Display | Source | Notes |
|---------|--------|-------|
| Section label | `room_sections.section_label` | e.g. "A", "B" |
| Flip Date | `room_sections.flip_date` | Click to edit inline; shows "Set flip date" placeholder if null |
| "Day N" badge | `(today - flip_date) + 1` | Only shown when flip_date is set |
| Projected Harvest | `room_sections.projected_harvest_date` | Click to edit inline; shows "Set harvest date" placeholder if null |
| Run length | `projected_harvest_date - flip_date` in days | e.g. "63-day run"; shown when both dates set |
| Countdown | `projected_harvest_date - today` | "in N days" (gray), "N days overdue" (red), amber when ≤ 7 days |

Dates are edited by clicking the date field inline — no modal required. Enter or blur saves; Escape cancels. An X button clears a set date back to null.

These dates are tracked per section because a single room can hold multiple simultaneous batch runs across different sections (each on its own flip/harvest schedule). See Invariant C-22.

#### Layout Builder (C-5B — all room types)

Each room card has a "Configure Layout" accordion at the bottom. When expanded:

- Table list: each active table shows its number, optional name, optional sqft, and an Archive button
- Under each table: list of active sections with section label, optional sqft, Archive button
- "Add Section" form per table: section label (required) + optional sqft; Enter or Save button to commit
- "Add Table" form at the bottom of the list: table number (required, positive integer), optional name and sqft
- "Show archived" toggle per room: unhides archived tables and sections with Restore buttons
- Validation: table number must be a positive integer; duplicate table number within the room is blocked client-side before submit

Actions call `cultivationService.createRoomTable`, `updateRoomTable`, `archiveRoomTable`, `createRoomSection`, `archiveRoomSection` and reload via `useRoomSections`.

### 1a. Room Map (Cultivation view — per room)

The Room Map is a new view surface in the Cultivation Dashboard showing a grid visualization of plant placements per room. It uses the `RoomMapCard` component.

**Collapsed state (per room card):** room code badge, room type, room name, live Day N badge if flip date is set on any section, harvest countdown if projected harvest date is set.

**Expanded state:**
- Flip date displayed read-only with Day N count (e.g., "Day 32 of flower")
- "Flip Room" button → opens `FlipRoomModal`
- Room Map grid: tables as columns, sections as rows; occupied cells show strain abbreviation badge + plant count from the group's `room_table_id`/`room_section_id`; empty cells are dim placeholders
- Strain legend below the grid: abbreviation, full strain name, total plant count, group numbers
- If no tables/sections configured: message directing user to Settings → Grow Rooms to configure layout
- Non-flower rooms: simplified list of groups with stage, count; no flip/harvest dates; no grid unless tables configured

### 1b. Flip Room Action (C-5B)

The "Flip Room" button in the Room Map opens `FlipRoomModal`:

- Header: "Flip [Room Name]" — or "Update Flip Date for [Room Name]" if sections already have flip dates
- Current flip date shown for reference (if set)
- Date picker defaulting to today (editable)
- Summary: "N plant groups will advance to flower stage"
- List of eligible groups (group number, strain abbreviation, current stage)
- Groups already at flower/harvested shown separately as "N groups already in flower — not affected"
- Confirm button calls `cultivationService.flipRoom({ grow_room_id, flip_date })`
- This satisfies the correction path: re-triggering with a corrected date simply overwrites the stored date (Invariant C-23)

### 2. Plant Groups (Cultivation main screen)

Location: Cultivation → Plant Groups

| View | Description |
|------|-------------|
| Active | Groups in clone, veg, or flower stage |
| Harvested | Groups with growth_stage = 'harvested' |

| Action | Description |
|--------|-------------|
| Create | Strain, room, count, planted date, optional source mother selector |
| Advance Stage | Button: "Move to Veg" / "Move to Flower" — one click, confirmed |
| Move to Room | Independent button — room selector + optional notes, no stage change |
| Start Harvest | Opens harvest session form (flower stage only) |
| Toggle Mother | "Mark as Mother" / "Remove Mother Status" toggle button |
| View History | Stage history and room transfer history inline on group detail |

### 3. Harvest Sessions

Location: Cultivation → Harvest Sessions (tab or sub-nav)

| View | Description |
|------|-------------|
| Active | Sessions with status = 'active' |
| Completed | Sessions with status = 'completed', showing linked batch_number |

| Action | Description |
|--------|-------------|
| Start | Plant group, harvest date, wet weight, plant count |
| Complete | Confirmation step showing batch number to be created and strain abbreviation used |
| Cancel | Only available if no batch yet created |
| Adjust Weight | Available on completed sessions — prompts for corrected weight and reason |

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

## Strain Abbreviation — Mandatory System Requirement

### What It Is

`strains.abbreviation` is a user-defined short code that forms the strain component of batch numbers (`YYMMDD-ABBREV`) and plant group IDs (`PG-YYMMDD-ABBREV`). It must be set in Settings → Strains (Products → Strains in the navigation) before any cultivation operations can proceed for that strain.

### Enforcement

This is enforced at two hard stops in the DB trigger layer — there is no fallback or workaround:

| Trigger | Table | Fires | Blocks if abbreviation missing |
|---------|-------|-------|-------------------------------|
| `trg_generate_plant_group_number` | `plant_groups` | BEFORE INSERT | Plant group creation for that strain |
| `trg_complete_harvest_session` | `harvest_sessions` | BEFORE UPDATE | Harvest completion for that strain |

Both raise a named exception with a user-readable message pointing to Settings → Strains.

### Format Requirements

- Exactly **3 uppercase letters** (e.g., `OGK`, `SGA`, `GDP`)
- The UI form at Settings → Strains must enforce this BEFORE saving:
  - Real-time validation with visible error message
  - Forced uppercase transform on input
  - Save button disabled until exactly 3 characters, all letters
  - Existing strains without a valid abbreviation must show a visible warning badge

> The screenshot in the planning session confirms the format is already `SGA` (3 letters) for Strawguava — this is the correct format. Session C-3 will harden the UI validation to enforce this on save.

### Pre-Flight Check Before C-2

Run this query before starting migration C-2-1 to identify any strains currently missing abbreviations:

```sql
SELECT id, name, abbreviation
FROM strains
WHERE is_active = true AND (abbreviation IS NULL OR abbreviation = '');
```

Any strains returned here cannot be used in cultivation until their abbreviation is set. This is not a blocker for C-2 (migrations), but must be resolved before operators begin using the cultivation UI.

### Downstream Impact

`strains.abbreviation` also feeds the existing post-production package ID system (`consolidated_packages`) — it is not exclusive to cultivation. Any strain missing an abbreviation affects BOTH cultivation plant group creation AND post-production package ID generation for that strain.

---

## Open Questions & Deferred Items

| Item | Decision | Rationale |
|------|----------|-----------|
| Multiple harvests per plant group | Allowed (one harvest session per cut event; group remains active until all plants cut) | Some operations do partial harvests |
| Same batch number on same-strain same-day harvest | Existing rule applies: both harvest sessions share same batch number via UNIQUE constraint resolution | See BATCHES.md |
| Wet weight required? | Yes — it is the initial_weight_grams source of truth; cannot complete harvest without it | Required for yield analytics |
| Can a batch be created without going through Cultivation? | Yes — existing manual batch creation (BatchManagement.tsx) remains supported indefinitely | Legacy data and edge cases |
| Can a mother group also be a clone of another mother? | Yes — `mother_plant_group_id` is a simple FK, no constraint prevents chaining | Keeps schema simple; multi-gen lineage visible by traversing the FK chain |

---

## Document Version History

### v1.6 (2026-02-19)
- Updated session history to include C-5B
- Updated Scope → Implemented to include placement FKs, Layout Builder, Room Map, Flip Room action, section-aware Move flow
- Added `room_table_id` and `room_section_id` to `plant_groups` in Module Entities section
- Updated UI Screens → Grow Rooms: added "Configure Layout" action, Layout Builder section (1a), Room Map section (1b), Flip Room Action section
- Updated footer version and status

### v1.5 (2026-02-19)
- Updated session history to include C-5A
- Updated Scope → Implemented to include run date tracking on sections
- Updated `room_sections` in Module Entities to show flip_date and projected_harvest_date fields
- Updated UI Screens — Grow Rooms section: added Section Run Dates Panel description with full display table
- Updated footer version and status

### v1.4 (2026-02-19)
- Updated session history to include C-4
- Updated Scope → Implemented to include room table and section structure
- Added `room_tables` and `room_sections` to Module Entities section
- Added Room Layout subsection under Grow Rooms (tables, sections, current status, sqft notes)
- Updated header version and status

### v1.3 (2026-02-19)
- Updated status from SPECIFICATION to IMPLEMENTED — sessions C-2 and C-3 complete
- Updated Scope section to reflect implemented features
- Updated footer version and status

### v1.2 (2026-02-18)
- Added Strain Abbreviation section (section 16) — mandatory 3-letter format, DB enforcement points, pre-flight check query, downstream impact on package ID system
- Corrected Harvest → Batch Handoff invariants: `initial_weight_grams` is first-session only (not cumulative); `batch_registry.strain` uses `strains.name` not `strains.display_name`; noted `strain_id` has no DB FK constraint
- Updated TOC with new section 16

### v1.1 (2026-02-18)
- Added mother plant tracking: `is_mother` flag, `mother_plant_group_id` self-referencing FK, Mother Plants section
- Added `group_number` auto-generated human-readable ID to plant_groups
- Added room transfer logging: `plant_group_room_history` table, Room Transfers section, independent Move to Room action
- Added harvest weight adjustment: `adjusted_weight_grams` + `adjustment_reason` on harvest_sessions, weight adjustment trigger spec, Harvest Weight Adjustments section
- Hardened batch number generation: abbreviation is now required (not COALESCE'd); harvest and plant group creation both blocked if strain has no abbreviation
- Added `mother` room_type to grow_rooms
- Removed COALESCE fallback from scope — trigger now raises error on null abbreviation
- Removed "Mother plant / clone lineage tracking" from Out of Scope list
- Updated Scope section to reflect room transfers and weight adjustments

### v1.0 (2026-02-18)
- Initial specification written during Session C-1 (documentation-only)

---

**Document Version:** 1.6
**Last Updated:** 2026-02-19
**Status:** IMPLEMENTED — 7 tables + placement FKs live (C-5B); Layout Builder, Room Map, and Flip Room action live
