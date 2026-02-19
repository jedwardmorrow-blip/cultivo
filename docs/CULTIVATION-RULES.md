---
title: CULTIVATION-RULES
category: Cultivation Module
version: 1.8
updated: 2026-02-19
status: IMPLEMENTED (C-37) + NEW (C-38 to C-42 — E-1 individual plants)
---

# CULTIVATION — Invariants, Rules, and Constraints

> **Status:** Invariants C-1 through C-29 are enforced by live DB triggers and application-layer validation. Invariants C-30 through C-37 are specified for D-2/D-3 (dry rooms and binning sessions).
> **Purpose:** Authoritative list of every constraint, invariant, and design decision for the cultivation module. Read before modifying any cultivation code.
> **Cross-References:** [CULTIVATION.md](./CULTIVATION.md), [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md)

---

## INVARIANTS (Non-Negotiable)

```
┌──────────────────────────────────────────────────────────────────────┐
│ CULTIVATION INVARIANTS                                               │
├──────────────────────────────────────────────────────────────────────┤
│ C-1.  strain_id on plant_groups is immutable after creation         │
│ C-2.  room_code on grow_rooms is immutable after creation           │
│ C-3.  Growth stage transitions are forward-only (no rollback)       │
│ C-4.  Only flower-stage groups may have harvest sessions started    │
│ C-5.  Completing a harvest session always creates a batch_registry  │
│        row (or links to existing if same strain + date)              │
│ C-6.  Cancellation of a harvest session is blocked once             │
│        batch_registry_id is set                                      │
│ C-7.  plant_group_stage_history is append-only (no UPDATE/DELETE)   │
│ C-8.  wet_weight_grams must be > 0 to complete a harvest session    │
│ C-9.  plant_count_harvested must be > 0                             │
│ C-10. Grow rooms cannot be deleted — only archived (is_active=false)│
│ C-11. strains.abbreviation must be set before creating a plant      │
│        group or completing a harvest for that strain                 │
│ C-12. plant_group_room_history is append-only (no UPDATE/DELETE)    │
│ C-13. Room transfer and stage advance are independent actions       │
│        (updating grow_room_id does not change growth_stage and      │
│        vice versa)                                                   │
│ C-14. adjusted_weight_grams must be > 0 if set                     │
│ C-15. adjustment_reason is required when adjusted_weight_grams      │
│        is set                                                        │
│ C-16. group_number is immutable after creation                      │
│ C-17. batch_registry.initial_weight_grams is single-session weight, │
│        not cumulative batch weight. The first harvest session's      │
│        wet_weight_grams is stored there via ON CONFLICT DO NOTHING.  │
│        Subsequent same-batch harvest sessions do not update it.      │
│        For cumulative batch weight, always use:                      │
│        SUM(wet_weight_grams) FROM harvest_sessions                   │
│        WHERE batch_registry_id = ?                                   │
│ C-18. room_tables rows are never hard-deleted — archive via         │
│        is_active = false. Application must prevent archiving a       │
│        table that has active plant groups assigned to it (C-5+).    │
│ C-19. room_sections rows are never hard-deleted — archive via       │
│        is_active = false. section_label uniqueness per table is      │
│        enforced by DB constraint (UNIQUE room_table_id, label).      │
│ C-20. room_table.total_sqft and room_section.section_sqft are both  │
│        optional. No denormalized sqft total is stored on grow_rooms; │
│        room-level area is derived by summing room_tables.total_sqft. │
│ C-21. table_number must be a positive integer (DB CHECK > 0).       │
│        table_number values are unique per room (UNIQUE constraint)   │
│        but do not need to be sequential.                             │
│ C-22. flip_date and projected_harvest_date on room_sections are     │
│        nullable, mutable operational notes. They change with every  │
│        run. No trigger tracks changes; no audit log is maintained.  │
│        Both may be null at any time without constraint violations.  │
│ C-23. Flip date is set by the explicit "Flip Room" action, not by   │
│        direct manual date entry. Re-triggering the action with a    │
│        corrected date overwrites the flip date on all sections in   │
│        the room. The flip date is stored on room_sections (per      │
│        C-22) and advanced to all active plant groups in the room.   │
│ C-24. projected_harvest_date is a mutable planning note, separately │
│        editable per section in the operational view. It is never    │
│        set by the Flip Room action.                                 │
│ C-25. Actual harvest date is individual to a harvest_session, not   │
│        to the room or section. harvest_sessions.harvest_date is the │
│        authoritative record. Section dates (flip, projected) are    │
│        planning aids; harvest_session.harvest_date is compliance.   │
│ C-26. Plant placement (room_table_id, room_section_id) is stored    │
│        directly on plant_groups (not a separate placement table).   │
│        It reflects current operational position, not audit history. │
│        Room transfer history remains in plant_group_room_history.   │
│ C-27. Settings owns room/table/section structure (create, archive,  │
│        rename). The Cultivation view owns plant actions only (flip, │
│        harvest, move, kill). These surfaces are strictly separated. │
│ C-28. The "Flip Room" action is a bulk action. All active plant     │
│        groups in the room (growth_stage != 'harvested') are         │
│        advanced to 'flower' stage in a single service call. The     │
│        flip_date is written to all active sections in the room.     │
│        Groups already at 'flower' or 'harvested' are not affected.  │
│ C-29. Plant group actions (flip, harvest, kill, move) form a        │
│        defined family. New plant actions must be added to this      │
│        family in cultivationService; never invented ad-hoc in       │
│        component code. All actions that change growth_stage must    │
│        go through advanceStage() or the action-specific method.     │
│ C-30. dry_rooms.room_code is immutable after creation. [D-2]       │
│        Binning session records reference it. Enforced by trigger    │
│        trg_protect_dry_room_code.                                   │
│ C-31. Dry rooms cannot be deleted — only archived (is_active=false).│
│        [D-2] No DELETE RLS policy on dry_rooms.                     │
│ C-32. A binning session may only be created for a harvest session   │
│        with session_status = 'completed'. Enforced by DB trigger    │
│        trg_validate_binning_session (BEFORE INSERT). Application    │
│        must also validate before showing the creation form.         │
│ C-33. One binning session per harvest session (1:1). Enforced by   │
│        UNIQUE(harvest_session_id) on binning_sessions. [D-2]        │
│ C-34. binning_sessions.batch_registry_id must match the linked      │
│        harvest_sessions.batch_registry_id. Application derives it   │
│        from the harvest session; DB trigger validates the match.    │
│        Never accept a user-supplied batch_registry_id directly.     │
│ C-35. dry_weight_grams must be > 0 (DB CHECK constraint). [D-2]   │
│ C-36. Binning session cancellation after completion is blocked.     │
│        [D-2] If data was entered incorrectly, the notes field is    │
│        the correction mechanism. No "re-open completed" workflow.   │
│ C-37. Binning sessions do not create or modify inventory. [D-2]    │
│        They are data-capture records only. All inventory creation   │
│        continues through the existing processing session pipeline.  │
│ C-38. Individual plant IDs are stored on individual_plants.        │
│        state_plant_id is a 12-digit numeric string (text, not int) │
│        matching the AZ seed-to-sale import format. UNIQUE across   │
│        the entire system. Format enforced by DB CHECK constraint.  │
│ C-39. A batch_registry row is created when a plant group is        │
│        created (lifecycle_state = 'pre_harvest'). The batch number │
│        uses the planted_date (or today if not set) + abbreviation. │
│        plant_groups.batch_registry_id is set by the trigger.       │
│ C-40. Harvest completion updates the existing pre_harvest batch    │
│        row (sets harvest_date, initial_weight_grams, room,         │
│        lifecycle_state='created'). If no existing batch row is     │
│        linked (legacy group), fall-back INSERT is used.            │
│ C-41. individual_plants.is_active = false marks dead/removed       │
│        plants. Rows are never hard-deleted. Deactivated plants     │
│        are shown crossed-out in the UI.                            │
│ C-42. Individual plant IDs may be bulk-imported via               │
│        cultivationService.bulkImportIndividualPlants(). Duplicate  │
│        state_plant_ids are silently skipped (ignoreDuplicates).    │
│        Invalid-format IDs are returned in the errors list.        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Rule Detail

### C-1: strain_id is Immutable

**Rule:** Once a plant group is created with a `strain_id`, that value cannot be changed.

**Enforcement:** DB trigger `trg_protect_plant_group_strain` raises an exception on any UPDATE that changes `strain_id`.

**Rationale:** The strain determines the downstream batch number, COA requirements, and compliance records. Changing strain retroactively would break batch traceability.

**Edge case:** If the wrong strain was selected, the plant group must be archived (or deleted if no harvest session exists) and a new one created. There is no "change strain" workflow.

---

### C-2: room_code is Immutable

**Rule:** `grow_rooms.room_code` cannot be changed after creation.

**Enforcement:** DB trigger `trg_protect_room_code`.

**Rationale:** Room codes appear in `batch_registry.room` on historical records. Changing the code would corrupt the audit trail.

**Note:** The `name` field (human-readable label) CAN be updated. Only the short `room_code` is locked.

---

### C-3: Growth Stage Transitions are Forward-Only

**Rule:** Valid transitions are only:
- `clone` → `veg`
- `veg` → `flower`
- `flower` → `harvested`

No other transitions are permitted. There is no backward movement.

**Enforcement:** DB trigger `trg_validate_plant_group_stage` raises exception on invalid transitions.

**Rationale:** Cannabis cultivation is a one-way biological process. Allowing backward transitions would corrupt stage duration analytics and audit trails.

**Design note:** The `harvested` state is terminal. Once a group reaches `harvested`, no further updates are permitted to `growth_stage`.

---

### C-4: Only Flower-Stage Groups May Be Harvested

**Rule:** A `harvest_session` can only be created for a plant group with `growth_stage = 'flower'`.

**Enforcement:** Application-layer validation in `cultivationService.createHarvestSession()`. DB constraint via `CHECK` is not required (the trigger enforces the terminal transition).

**Rationale:** Harvesting a clone or veg plant is either an error (wrong group selected) or out-of-scope (early termination). If early termination is ever needed, a separate workflow must be defined.

---

### C-5: Completing a Harvest Always Creates or Links a Batch

**Rule:** When `harvest_sessions.session_status` is set to `'completed'`, a `batch_registry` row MUST exist and be linked via `batch_registry_id` before the transaction commits.

**Enforcement:** DB trigger `trg_complete_harvest_session` creates the batch (or finds the existing one for same-strain same-day harvests) and sets `NEW.batch_registry_id` in the BEFORE UPDATE trigger.

**DB constraint:** `CONSTRAINT harvest_sessions_completed_has_batch CHECK (session_status != 'completed' OR batch_registry_id IS NOT NULL)` — the constraint fires after the trigger, guaranteeing the trigger ran correctly.

**Same-day same-strain rule:** If a batch already exists for `YYMMDD-ABBREV`, the `ON CONFLICT DO NOTHING` path in the trigger links the harvest session to the existing batch. Both harvest sessions (from different plant groups or different rooms) share one batch record.

---

### C-6: Cannot Cancel a Harvest Session Once Batch Exists

**Rule:** If `batch_registry_id` is set on a harvest session, cancellation is blocked.

**Enforcement:** DB trigger `trg_validate_harvest_cancellation`.

**Error message:** "Cannot cancel harvest session: batch {batch_number} already created. Cancel the batch instead."

**Rationale:** Once the batch exists, downstream operations (bucking sessions, inventory items) may already reference it. The correct path is to manage the batch via the existing `batch_registry` quarantine or cancellation workflow.

---

### C-7: Stage History is Append-Only

**Rule:** Rows in `plant_group_stage_history` cannot be updated or deleted.

**Enforcement:** No UPDATE or DELETE RLS policy exists on this table. Any attempt to update or delete will be rejected.

**Rationale:** Stage history is a compliance audit trail. Mutability would undermine its evidentiary value.

---

### C-8 and C-9: Harvest Session Weight and Count

**Rule:** `wet_weight_grams > 0` and `plant_count_harvested > 0` are required to complete a harvest session.

**Enforcement:** DB CHECK constraints on the `harvest_sessions` table.

**Rationale:** Zero-weight harvests are a data entry error. The system must not create a batch with no initial weight.

---

### C-10: Rooms Cannot Be Deleted

**Rule:** `grow_rooms` rows are never deleted. To retire a room, set `is_active = false`.

**Enforcement:** No DELETE RLS policy on `grow_rooms`. Application does not expose a delete action.

**Rationale:** Historical plant groups and harvest sessions reference grow rooms. Deletion would break foreign key references and audit trails.

---

### C-11: Strain Abbreviation is Required for Cultivation Operations

**Rule:** `strains.abbreviation` must be a non-null, non-empty string before:
1. A plant group can be created for that strain
2. A harvest session for a plant group of that strain can be completed

**Enforcement:**
- Plant group creation: DB trigger `trg_generate_plant_group_number` (BEFORE INSERT) raises exception if abbreviation is null or empty.
- Harvest completion: DB trigger `trg_complete_harvest_session` (BEFORE UPDATE) raises exception if abbreviation is null or empty.

**Error message (plant group creation):** "Cannot create plant group: strain has no abbreviation set. Set the abbreviation in Settings → Strains first."

**Error message (harvest completion):** `Cannot complete harvest: strain "{name}" has no abbreviation set. Set the abbreviation in Settings → Strains first.`

**Rationale:** The batch number format `YYMMDD-ABBREV` requires a user-defined abbreviation. There is no safe automatic fallback — a silently wrong batch number would break traceability. The user must intentionally set the abbreviation in Settings → Strains (Products → Strains).

**Implication:** The COALESCE fallback that was in the v1.0 trigger spec has been removed. Any strain that has never had an abbreviation set cannot participate in the cultivation workflow until the abbreviation is added.

---

### C-12: Room History is Append-Only

**Rule:** Rows in `plant_group_room_history` cannot be updated or deleted.

**Enforcement:** No UPDATE or DELETE RLS policy exists on this table.

**Rationale:** Room transfer history is an operational audit trail. Mutability would allow falsification of movement records.

---

### C-13: Room Transfer and Stage Advance are Independent

**Rule:** Updating `grow_room_id` on a plant group (room transfer) does not change `growth_stage`. Updating `growth_stage` (stage advance) does not change `grow_room_id`. These are two distinct actions.

**Enforcement:** Application-layer: "Move to Room" and "Advance Stage" are separate UI buttons that call separate service functions (`moveToRoom` vs `advanceStage`). Neither function modifies the field owned by the other.

**Rationale:** In real-world cultivation, plants may be moved to a new room before or after a stage change — sometimes days apart. Coupling them would force artificial simultaneity that doesn't reflect operations.

---

### C-14 and C-15: Weight Adjustment Constraints

**Rule:** When `adjusted_weight_grams` is set on a harvest session:
- It must be greater than zero
- `adjustment_reason` must also be set (non-null, non-empty)

**Enforcement:**
- DB CHECK constraints: `harvest_sessions_adjusted_weight_positive` and `harvest_sessions_adjustment_reason_required`
- DB trigger `trg_sync_harvest_weight_adjustment` re-validates and raises exception on violation (for trigger-bypass paths)

**Rationale:** Weight adjustments are a correction mechanism for data entry errors. An adjustment without a reason provides no audit trail value and cannot be reviewed for legitimacy.

---

### C-16: group_number is Immutable After Creation

**Rule:** `plant_groups.group_number` cannot be changed after the row is created.

**Enforcement:** No explicit trigger is defined for this — group_number is set by the BEFORE INSERT trigger and the column has no update path in the service layer. If an explicit immutability trigger is desired, add `fn_protect_plant_group_number` in migration C-2-2.

**Rationale:** The group_number is a human-readable identifier that may appear in physical records (printed labels, verbal references). Changing it retroactively would break that reference chain.

---

### C-17: initial_weight_grams is Single-Session Weight, Not Cumulative Batch Weight

**Rule:** `batch_registry.initial_weight_grams` stores the wet weight of the **first** harvest session that created the batch. For same-strain same-day harvests (multiple plant groups harvested the same day), only the first session's weight is stored there. Subsequent sessions sharing the same batch_registry row do NOT update `initial_weight_grams` — their weight is preserved only on their own `harvest_sessions.wet_weight_grams` column.

**Enforcement:** DB-level: `ON CONFLICT (batch_number) DO NOTHING` in `fn_complete_harvest_session` — the INSERT is silently skipped for the second session. No exception is raised; the trigger proceeds to link `batch_registry_id` from the existing row.

**Consumers must know:**
- Any display of "total batch harvest weight" must query `SUM(wet_weight_grams) FROM harvest_sessions WHERE batch_registry_id = ?`
- `initial_weight_grams` alone is insufficient for batches with multiple harvest sessions
- The weight adjustment trigger (`trg_sync_harvest_weight_adjustment`) overwrites `initial_weight_grams` with the adjusted value for the first session only — this is expected

**Rationale:** `initial_weight_grams` is reference/display data on the batch record. The authoritative weight ledger is the `harvest_sessions` rows themselves. This design is consistent with how `initial_weight_grams` is used downstream (yield analytics compares it against processed weights as an approximate reference, not a precise regulatory figure).

---

### C-18: room_tables Cannot Be Hard-Deleted

**Rule:** `room_tables` rows are never deleted. To retire a table, set `is_active = false`.

**Enforcement:** No DELETE RLS policy on `room_tables`. When plant group placement is implemented (C-5), the application must additionally block archiving a table that has active plant groups assigned to it.

**Rationale:** Mirrors the `grow_rooms` soft-delete pattern. Tables may be referenced by historical plant group placement records once C-5 is implemented — hard deletion would break those references.

---

### C-19: room_sections Cannot Be Hard-Deleted

**Rule:** `room_sections` rows are never deleted. To retire a section, set `is_active = false`.

**Enforcement:** No DELETE RLS policy on `room_sections`. `section_label` uniqueness per table is enforced by the DB UNIQUE constraint `(room_table_id, section_label)`.

**Rationale:** Section records will be referenced by plant group placements once C-5 is implemented. Deletion would break historical placement records.

---

### C-20: Square Footage is Optional and Not Denormalized

**Rule:** `room_tables.total_sqft` and `room_sections.section_sqft` are both nullable. No sqft total is stored on `grow_rooms`. Room-level area must be calculated by summing `room_tables.total_sqft` for active tables in that room.

**Enforcement:** Both columns are nullable at the DB level. No trigger enforces section totals summing to table total — these are informational fields, not ledger quantities.

**Rationale:** Sqft data is for space utilization reporting only. Not all operators track it. Forcing it as required would block basic table setup for operators who don't use it.

---

### C-23: Flip Date is Set by Explicit Action, Not Manual Entry

**Rule:** The flip date is written to `room_sections.flip_date` by the "Flip Room" service action (`cultivationService.flipRoom()`). It is not a directly-editable field in the Cultivation view. If the wrong date is accidentally selected, the operator re-triggers the "Flip Room" action with the corrected date — this overwrites the flip date on all sections in the room.

**When sections already have flip dates:** The modal shows the current date for reference and re-labels as "Update Flip Date." This is the correction path (addresses Q3 from planning).

**What the action does:**
1. Writes `flip_date` to all `room_sections` belonging to the room (via all active `room_tables`)
2. Calls `advanceStage()` for each plant group in the room whose `growth_stage` is NOT already `flower` or `harvested`
3. Groups already at `flower` or `harvested` are skipped silently (not an error)

**Error case:** If no groups in the room are eligible for advancement, the action still writes the flip date to sections — the operator may be recording a date retroactively.

---

### C-24: projected_harvest_date is Separately Editable

**Rule:** `room_sections.projected_harvest_date` is edited independently, per section, in the operational view. It is NOT set by the Flip Room action. It can be updated at any time by clicking the date field in the Section Run Dates panel (Settings view) or the Room Map card (Cultivation view).

**Rationale:** Projected harvest date is a planning estimate that operators adjust as the run progresses. It is semantically different from the flip date (which is a historical fact) and should not be coupled to the flip action.

---

### C-25: Harvest Date is Per-Session, Not Per-Room

**Rule:** The authoritative harvest date for compliance purposes is `harvest_sessions.harvest_date`. The section's `projected_harvest_date` is a planning estimate and is never automatically set from harvest session data.

**Rationale:** A room may have multiple harvest sessions on different days (partial harvests across sections, different plant groups harvested at different times). There is no single room-level harvest date that would be accurate across all scenarios.

---

### C-26: Placement is Stored Directly on plant_groups

**Rule:** `plant_groups.room_table_id` (uuid, nullable, FK → `room_tables`) and `plant_groups.room_section_id` (uuid, nullable, FK → `room_sections`) store the plant group's current physical position. These are the only placement fields. There is no separate `plant_placements` table.

**DB-level enforcement:**
- Trigger `trg_clear_placement_on_room_transfer`: fires AFTER UPDATE on `plant_groups` when `grow_room_id` changes; automatically sets `room_table_id = NULL` and `room_section_id = NULL` so the placement is never left pointing to a table in the old room.
- Trigger `trg_validate_placement_room`: fires BEFORE UPDATE/INSERT on `plant_groups` when `room_table_id` is set; raises exception if `room_table_id.grow_room_id != plant_groups.grow_room_id`.

**CHECK constraint:** `room_section_requires_table` — if `room_section_id` is set, `room_table_id` must also be set (section without table is invalid).

---

### C-27: Settings and Cultivation Views Are Strictly Separated

**Rule:** Settings → Grow Rooms is the only surface for creating, archiving, or renaming rooms, tables, and sections. The Cultivation view (Plant Groups, Room Map) contains only plant-focused actions. No room structural CRUD appears in the Cultivation view.

**Rationale:** This follows the existing pattern (drivers and vehicles live in Settings; strains live in Products; grow rooms live in Settings). Mixing structural admin UI into operational screens creates confusion about where to go.

**Implication for Room Map:** If a room has no tables/sections configured, the Room Map card shows an empty state message directing the operator to Settings → Grow Rooms to configure layout. It does not offer inline layout creation.

---

### C-28: Flip Room is a Bulk Stage Advance

**Rule:** The "Flip Room" action operates on all non-harvested, non-flower plant groups in a room simultaneously. The service method `cultivationService.flipRoom({ grow_room_id, flip_date })`:
1. Fetches all `room_sections` for the room (via all active `room_tables`)
2. Sets `flip_date` on each section
3. Fetches all `plant_groups` in the room with `growth_stage` NOT IN `('flower', 'harvested')`
4. Calls `advanceStage(id, 'flower')` for each eligible group sequentially

**Partial eligibility is fine:** A room may have a mix of veg, clone, and already-flower groups. Only veg and clone groups are advanced. Already-flower groups are unaffected.

**Error handling:** If a single group fails to advance (e.g., invalid stage transition trigger rejects it), the service propagates the error and the caller shows it. Partial flips are NOT silently accepted — the operator should review and retry.

---

### C-29: Plant Actions Form a Defined Family

**Rule:** The following are the defined plant group actions. All must be implemented in `cultivationService` and called from UI components via the service. No ad-hoc direct Supabase queries for stage or placement changes in component code.

| Action | Service method | Changes |
|--------|---------------|---------|
| Advance stage | `advanceStage(id, toStage)` | `growth_stage` |
| Move to room | `moveToRoom(id, toRoomId)` | `grow_room_id` (triggers clear placement) |
| Update placement | `updatePlantGroupPlacement(id, input)` | `room_table_id`, `room_section_id` |
| Flip room (bulk) | `flipRoom(input)` | `growth_stage` on eligible groups + `flip_date` on sections |
| Toggle mother | `setMotherStatus(id, bool)` | `is_mother` |
| Update notes | `updatePlantGroupNotes(id, notes)` | `notes` |
| Start harvest | `createHarvestSession(input)` | creates `harvest_sessions` row |
| Complete harvest | `completeHarvestSession(id)` | triggers batch creation, sets `growth_stage = harvested` |

**Extensibility:** When adding a new plant action, add it to this table in the documentation before adding the service method.

---

### C-22: flip_date and projected_harvest_date are Mutable Operational Notes

**Rule:** `room_sections.flip_date` and `room_sections.projected_harvest_date` are nullable date columns that may be freely set, updated, or cleared by any authenticated user at any time. They are not audit records and are not subject to immutability constraints.

**Enforcement:** No triggers. No audit log. The existing authenticated UPDATE policy on `room_sections` is sufficient.

**Why section-level (not room-level):** A single grow room can contain multiple simultaneous batch runs across different sections (e.g., VEG-01 feeding two different FLW room batches). Tracking dates at the room level would require a single date for the whole room, which is incorrect when sections are on different flip/harvest schedules. Sections are the correct unit of granularity.

**UI computed values from these dates:**
- "Day N of flower" — `(today - flip_date) + 1` (shown when flip_date is set)
- "Run length" — `projected_harvest_date - flip_date` total days (shown when both dates are set)
- "Days to harvest" countdown — `projected_harvest_date - today` (shown when projected_harvest_date is set)
  - Amber when ≤ 7 days remaining
  - Red when overdue (projected_harvest_date is in the past)

**Rationale:** These dates change with every cultivation run. Logging every update would produce noise with no compliance value. The original wet weight, batch number, and stage history are the compliance-critical audit records — not operational scheduling dates.

---

### C-21: table_number Must Be a Positive Integer, Unique Per Room

**Rule:** `table_number` must be > 0 (DB CHECK constraint). Within a room, each table number must be unique (UNIQUE constraint on `grow_room_id, table_number`). Table numbers do not need to be sequential or start at 1.

**Enforcement:** DB CHECK `room_tables_number_positive` and UNIQUE constraint `room_tables_unique_number_per_room`.

**Rationale:** Operators may label tables as they exist physically (e.g., skip numbers for removed tables, start at arbitrary values). Enforcing sequence would require renumbering when tables are added or removed.

---

### C-30: dry_room_code is Immutable After Creation [D-2]

**Rule:** `dry_rooms.room_code` cannot be changed after creation.

**Enforcement:** DB trigger `trg_protect_dry_room_code` (to be created in migration D-2-1). Mirrors the `trg_protect_room_code` pattern on `grow_rooms`.

**Rationale:** Room codes appear in binning session records and any compliance exports derived from them. Changing the code retroactively would corrupt historical records.

---

### C-31: Dry Rooms Cannot Be Deleted [D-2]

**Rule:** `dry_rooms` rows are never deleted. To retire a dry room, set `is_active = false`.

**Enforcement:** No DELETE RLS policy on `dry_rooms`. Application does not expose a delete action.

**Rationale:** Binning sessions reference dry room IDs. Hard deletion would break foreign key references and audit trails.

---

### C-32: Binning Session Requires a Completed Harvest Session [D-2]

**Rule:** A `binning_session` can only be created for a `harvest_session` with `session_status = 'completed'`. A harvest session that is still `active` (not yet completed) has no batch yet — there is no batch to bin against. A `cancelled` harvest session produced no material to dry.

**Enforcement:** DB trigger `trg_validate_binning_session` (BEFORE INSERT on `binning_sessions`) raises an exception if the linked harvest session is not `completed`. Application-layer validation must also prevent showing the binning session creation form for non-completed harvest sessions.

**Error message:** "Cannot create binning session: harvest session is not completed (status: {status})"

---

### C-33: One Binning Session Per Harvest Session (1:1) [D-2]

**Rule:** Each `harvest_session` may have at most one `binning_session`. A second attempt to create a binning session for the same harvest session is blocked.

**Enforcement:** `UNIQUE (harvest_session_id)` constraint on `binning_sessions`.

**Rationale:** A harvest session produces one physical batch of dried material. There is no workflow where the same harvest material is binned twice. If a binning session was entered incorrectly, cancel it and create a new one (if still active), or add a correction note (if completed).

**Same-batch total dry weight:** Multiple harvest sessions may share a `batch_registry` row (same-strain same-day). Each has its own binning session with its own dry weight. Total batch dry weight = `SUM(dry_weight_grams) FROM binning_sessions WHERE batch_registry_id = ? AND session_status = 'completed'`.

---

### C-34: batch_registry_id on Binning Sessions is Derived, Not User-Supplied [D-2]

**Rule:** The application must read `harvest_sessions.batch_registry_id` and pass it as `batch_registry_id` when creating a binning session. The DB trigger validates this match on INSERT. A user-supplied batch ID that differs from the harvest session's linked batch is rejected.

**Enforcement:** DB trigger `trg_validate_binning_session` (BEFORE INSERT) compares `NEW.batch_registry_id` with `harvest_sessions.batch_registry_id` and raises an exception if they differ.

**Rationale:** The batch association must be consistent with the harvest session. Allowing operators to select a batch independently would create orphaned or incorrectly linked binning records.

---

### C-35: dry_weight_grams Must Be Greater Than Zero [D-2]

**Rule:** `binning_sessions.dry_weight_grams` must be > 0.

**Enforcement:** DB CHECK constraint on `binning_sessions`.

**Rationale:** A zero dry weight is a data entry error. Binning sessions represent real physical material that has been weighed.

---

### C-36: Completed Binning Sessions Cannot Be Cancelled [D-2]

**Rule:** Once a binning session has `session_status = 'completed'`, it cannot be cancelled or re-opened. If the dry weight was entered incorrectly, the operator must add a correction note.

**Enforcement:** DB CHECK constraint `binning_sessions_cancelled_no_completion` blocks any row where both `session_status = 'cancelled'` AND `completed_at IS NOT NULL`. Application must not offer a cancel action on completed sessions.

**Rationale:** Completed binning sessions are the authoritative dry weight record for a harvest. Cancelling them post-completion would create ambiguity in the batch history.

---

### C-37: Binning Sessions Do Not Create or Modify Inventory [D-2]

**Rule:** Completing a binning session does not trigger any inventory creation, inventory movement, or batch lifecycle state change. Binning is a data-capture milestone only.

**Enforcement:** No completion trigger on `binning_sessions` (by design). The existing batch pipeline handles inventory creation when processing sessions are finalized.

**Rationale:** The batch already exists when binning occurs. The dry weight recorded in the binning session is a reference figure that operators use when starting a bucking session. Actual inventory quantities are managed by the movement ledger independently. Adding an inventory trigger here would duplicate creation and violate the "Finalization = Creation" pattern (Architecture Decision 1).

---

## Decisions Made (and Why)

### Decision: Group-level tracking, not individual plant tracking

Individual plant RFID tag tracking (as required by some state compliance systems) is out of scope. This system tracks plant groups (a set of same-strain plants moving together). The `plant_count` field satisfies basic count requirements without per-plant overhead.

**Rationale:** The operator's current paper-based process groups plants. The digital system mirrors that workflow. Individual plant tracking can be added later without schema changes to the core tables (it would be a separate `plant_tags` table with FK to `plant_groups`).

---

### Decision: Batch number is auto-generated, not user-entered

When a harvest session completes, the batch number is generated by the system as `YYMMDD-ABBREV`. The user never types a batch number.

**Rationale:** Manual entry is the source of the typo and format errors documented in GAP-017. The trigger uses `strains.abbreviation` as the strain code component, which is already validated and consistent.

**Implication:** The existing `BatchManagement.tsx` "Create Batch" form (manual entry) remains available for edge cases but is no longer the primary batch creation path.

---

### Decision: Strain abbreviation is user-defined and required

The abbreviation used in batch number generation (`YYMMDD-ABBREV`) is set manually by operators in Settings → Strains. There is no system-generated fallback.

**Rationale:** Abbreviations appear on physical labels, compliance documents, and batch records. They must be operator-chosen and consistent. A system-generated abbreviation (e.g., first 3 characters of strain name) would be unreliable and might conflict with existing naming conventions already in use.

**Implication:** Before any cultivation operations can begin for a strain, an operator must set the abbreviation in Settings → Strains. The UI should surface a clear warning if a strain in use has no abbreviation.

---

### Decision: Mother plants are a flag, not a separate entity

A plant group is designated as a mother by setting `is_mother = true`. There is no separate `mother_plants` table. Mother groups progress through the standard lifecycle and can be harvested.

**Rationale:** Mothers are the same biological entity as any other plant group — they are just being used for a specific purpose (cutting clones). A flag is simpler than a separate entity and avoids duplicating all lifecycle fields.

**Implication:** `is_mother` is mutable (can be toggled). The constraint is application-layer: when a mother is harvested, the UI sets `is_mother = false` as part of the harvest completion flow.

---

### Decision: Clone lineage is a simple optional FK

`plant_groups.mother_plant_group_id` is a nullable self-referencing FK. It is set once at clone group creation and is not subsequently changed.

**Rationale:** Lineage tracing is primarily a reporting/audit use case. A single FK per group (pointing to the direct mother) satisfies the core requirement. Multi-generational lineage can be resolved by traversing the FK chain.

---

### Decision: Room transfer logging is trigger-driven

When the service calls `moveToRoom` (which updates `plant_groups.grow_room_id`), the DB trigger `trg_log_plant_group_room_history` automatically inserts the history record. The service does NOT insert directly into `plant_group_room_history`.

**Rationale:** Keeps the audit log consistent regardless of how `grow_room_id` is updated. Any path that changes the room — service layer, direct SQL, admin tools — is automatically logged. This mirrors the pattern used for stage history.

---

### Decision: Harvest session completion is a two-step UI action

The user fills in wet weight and plant count, then clicks "Save" (creates `session_status = 'active'`). A second click ("Complete Harvest") fires the trigger that creates the batch.

**Rationale:** Separating data entry from batch creation gives the user a chance to review the numbers before committing. Once the batch is created, it cannot be easily reversed.

---

### Decision: Same-strain same-day harvests share a batch

If two plant groups (e.g., Room A and Room B) of the same strain are harvested on the same day, their harvest sessions both link to the same `batch_registry` row.

**Rationale:** This matches the existing batch number format (`YYMMDD-ABBREV`) and the existing documentation in `BATCHES.md`. Both harvests contribute to one batch, which is how the operation works physically.

**Implication:** `harvest_sessions.batch_registry_id` is a many-to-one relationship (many harvest sessions can point to one batch). This is expected and handled by the trigger's `ON CONFLICT DO NOTHING` path.

**Weight accounting for same-batch harvests (Invariant C-17):**
`batch_registry.initial_weight_grams` stores only the FIRST harvest session's `wet_weight_grams` — the `ON CONFLICT DO NOTHING` means the second session's weight is silently not written to that column. This is not data loss: the second session's weight lives on the `harvest_sessions` row itself.

Consumers of `initial_weight_grams` (yield analytics, batch detail views) must understand that this field is "first harvest weight" not "total batch harvest weight." For total batch harvest weight, query:

```sql
SELECT SUM(wet_weight_grams)
FROM harvest_sessions
WHERE batch_registry_id = ? AND session_status = 'completed';
```

The weight adjustment trigger (`trg_sync_harvest_weight_adjustment`) also writes to `initial_weight_grams` when `adjusted_weight_grams` is set. For same-batch multi-harvest scenarios, this means adjusting the first session's weight overwrites `initial_weight_grams` with the corrected first-session value — it does not account for other sessions. This is acceptable because `initial_weight_grams` is display/reference data; actual inventory quantities are managed by the movement ledger independently.

---

### Decision: Weight adjustments overwrite batch_registry.initial_weight_grams

When `adjusted_weight_grams` is set, the trigger updates `batch_registry.initial_weight_grams` to the adjusted value. The original `wet_weight_grams` on the harvest session remains unchanged as an audit record.

**Rationale:** `batch_registry.initial_weight_grams` is a reference field used for yield analytics. Displaying the corrected weight there ensures analytics reflect accurate data. The uncorrected value is preserved on the source record for accountability.

---

### Decision: No environmental or nutrient tracking

Feeding logs, temperature/humidity data, and environmental sensor integration are explicitly out of scope.

**Rationale:** These features require integrations (sensors, IoT) and workflows that are a separate product decision. Adding table columns now for data that will not be collected creates dead schema.

---

### Decision: Grow Rooms managed in Settings, not Cultivation

Grow rooms change infrequently and are configured by admins. The Cultivation main screen focuses on day-to-day operations (plant groups, harvests). Room management lives in Settings → Grow Rooms.

**Rationale:** Matches the pattern of other reference data (drivers, vehicles are in Settings; strains are in Products → Strains).

---

### Decision: Dry Rooms managed in Settings, not Cultivation [D-1]

Dry rooms are reference data that change infrequently. They follow the same pattern as grow rooms — configured in Settings by admins, referenced by operational records (binning sessions) in the Cultivation view.

**Rationale:** Consistent with grow rooms, drivers, and vehicles. Operators do not create dry rooms during daily operation.

---

### Decision: Binning is Data-Capture Only, Not Inventory Creation [D-1]

The binning session records dry weight after drying. It does not trigger any inventory creation or modification. The batch already exists (created by the harvest session completion trigger). Inventory is created later, during processing session finalization, through the existing pipeline.

**Rationale:** Respects the "Finalization = Creation" principle (Architecture Decision 1). Dry weight at binning is a reference figure for operators, not the point at which material enters the inventory ledger. The inventory ledger is managed exclusively by the processing session pipeline. Coupling dry weight recording to inventory creation would introduce a second inventory creation path, which would conflict with the existing system and create reconciliation problems.

**Implication:** Completing a binning session has no effect on `inventory_items`, `inventory_movements`, or `batch_registry.lifecycle_state`. The batch continues through its lifecycle (bucking queue, trim, packaging) as if binning never happened — because from the pipeline's perspective, binning is not a pipeline event.

---

### Decision: batch_registry_id is Denormalized on binning_sessions [D-1]

`binning_sessions.batch_registry_id` is a copy of `harvest_sessions.batch_registry_id`. It is set by the application on INSERT and validated by a DB trigger.

**Rationale:** Avoids a JOIN through `harvest_sessions` on every binning session query. The value is derived data (not independently set), but the query convenience is significant — most binning session views need the batch number for display. The trigger validation ensures this field stays consistent with the source harvest session.

---

## Error Messages

Standard error messages the UI must handle from the API:

| Trigger Error | UI Message to Show |
|---------------|-------------------|
| `Cannot transition plant group from harvested state` | "This group has already been harvested and cannot be modified." |
| `Invalid stage transition: %` | "Invalid stage change. Please refresh and try again." |
| `Cannot cancel harvest session: batch % already created` | "Harvest cannot be cancelled — the batch {batch_number} has already been created. Use Batch Management to quarantine the batch if needed." |
| `strain_id is immutable after plant group creation` | "The strain cannot be changed after a group is created." |
| `room_code is immutable after creation` | "Room code cannot be changed after creation." |
| `dry room room_code is immutable after creation` | "Dry room code cannot be changed after creation." |
| `Cannot create plant group: strain has no abbreviation set` | "This strain does not have an abbreviation set. Go to Settings → Strains and add an abbreviation before creating a plant group." |
| `Cannot complete harvest: strain "%" has no abbreviation set` | "Cannot complete harvest — the strain {name} has no abbreviation set. Go to Settings → Strains and add an abbreviation first." |
| `Cannot adjust weight: no batch linked to this harvest session` | "Weight adjustment is not available — no batch is linked to this harvest session." |
| `Adjusted weight must be greater than zero` | "Adjusted weight must be greater than zero." |
| `Adjustment reason is required when adjusting harvest weight` | "Please provide a reason for the weight adjustment." |
| `Binning session error: harvest session not found` | "The selected harvest session could not be found. Please refresh and try again." |
| `Cannot create binning session: harvest session is not completed (status: %)` | "Binning sessions can only be created for completed harvest sessions." |
| `Cannot create binning session: harvest session has no linked batch` | "The harvest session has no linked batch. Complete the harvest session first." |
| `Binning session error: batch_registry_id does not match the harvest session's batch` | "Internal error: batch mismatch. Please refresh and try again." |

---

## Testing Requirements (Phase D)

The following scenarios should have test coverage. Sessions C-2 and C-3 are complete; these tests remain as recommended additions:

| Scenario | Type |
|----------|------|
| Valid stage transitions (clone→veg, veg→flower) | Unit (service) |
| Invalid stage transitions blocked | Unit (service) |
| Harvest session completion creates batch | Integration (DB trigger) |
| Same-strain same-day: second harvest links to existing batch | Integration (DB trigger) |
| Cancel harvest session with no batch: succeeds | Unit (service) |
| Cancel harvest session with batch: blocked | Integration (DB trigger) |
| strain_id immutability | Integration (DB trigger) |
| room_code immutability | Integration (DB trigger) |
| Plant group creation blocked if strain has no abbreviation | Integration (DB trigger) |
| Harvest completion blocked if strain has no abbreviation | Integration (DB trigger) |
| Room transfer creates room history row | Integration (DB trigger) |
| Room transfer does not change growth_stage | Unit (service) |
| Stage advance does not change grow_room_id | Unit (service) |
| Weight adjustment updates batch_registry.initial_weight_grams | Integration (DB trigger) |
| Weight adjustment without reason is blocked | Integration (DB constraint) |
| Mother group FK: clone group creation with valid mother | Unit (service) |
| group_number auto-generated with correct format PG-YYMMDD-ABBREV | Integration (DB trigger) |
| Binning session blocked for non-completed harvest session | Integration (DB trigger, D-2) |
| Binning session blocked if harvest session already has one | Integration (DB constraint, D-2) |
| batch_registry_id mismatch rejected on binning session insert | Integration (DB trigger, D-2) |
| dry_weight_grams = 0 rejected | Integration (DB constraint, D-2) |
| Completed binning session cannot be cancelled | Integration (DB constraint, D-2) |
| dry_room_code immutability | Integration (DB trigger, D-2) |
| Total batch dry weight = SUM across binning_sessions | Unit (service query, D-3) |

---

## Document Version History

### v1.7 (2026-02-19)
- Added invariants C-30 through C-37 (dry room code immutability, dry room no-delete, binning session requires completed harvest, 1:1 constraint, derived batch_registry_id, dry weight > 0, no cancellation after completion, no inventory creation)
- Added rule detail sections for C-30 through C-37
- Added binning-related error messages to Error Messages table
- Added binning-related test scenarios to Testing Requirements
- Added a new Decisions section entry for "Binning is data-capture only, not inventory creation"
- Updated header version and status

### v1.6 (2026-02-19)
- Added invariants C-23 through C-29 (flip action, harvest date ownership, placement storage, Settings/Cultivation separation, bulk flip semantics, action family)
- Added rule detail sections for C-23 through C-29
- Updated header version

### v1.5 (2026-02-19)
- Added invariant C-22 (flip_date/projected_harvest_date are mutable operational notes, not audit records)
- Added rule detail section for C-22 including UI computed value definitions
- Updated header version

### v1.4 (2026-02-19)
- Added invariants C-18 through C-21 (room_tables/room_sections soft-delete, sqft optionality, table_number uniqueness)
- Added rule detail sections for C-18, C-19, C-20, C-21
- Updated header version

### v1.3 (2026-02-19)
- Updated status from SPECIFICATION to IMPLEMENTED
- Updated Testing Requirements preamble to reflect C-2/C-3 completion

### v1.2 (2026-02-18)
- Invariants C-1 through C-17 finalized (C-17 added: initial_weight_grams is single-session weight)
- Error messages table added
- Testing requirements (Phase D) added

### v1.1 (2026-02-18)
- Added invariants C-12 through C-16 (room history, independent actions, weight adjustment constraints, group_number immutability)

### v1.0 (2026-02-18)
- Initial invariant set (C-1 through C-11) written during Session C-1

---

**Document Version:** 1.7
**Last Updated:** 2026-02-19
**Status:** IMPLEMENTED (C-1–C-29 live) + SPECIFIED (C-30–C-37 pending D-2 migration)
