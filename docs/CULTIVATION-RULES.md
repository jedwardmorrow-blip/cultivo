---
title: CULTIVATION-RULES
category: Cultivation Module
version: 1.2
updated: 2026-02-18
status: SPECIFICATION — not yet implemented
---

# CULTIVATION — Invariants, Rules, and Constraints

> **Status:** SPECIFICATION — rules are locked before implementation begins.
> **Purpose:** Authoritative list of every constraint, invariant, and design decision for the cultivation module. Read this before writing any migration or UI code.
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

## Error Messages

Standard error messages the UI must handle from the API:

| Trigger Error | UI Message to Show |
|---------------|-------------------|
| `Cannot transition plant group from harvested state` | "This group has already been harvested and cannot be modified." |
| `Invalid stage transition: %` | "Invalid stage change. Please refresh and try again." |
| `Cannot cancel harvest session: batch % already created` | "Harvest cannot be cancelled — the batch {batch_number} has already been created. Use Batch Management to quarantine the batch if needed." |
| `strain_id is immutable after plant group creation` | "The strain cannot be changed after a group is created." |
| `room_code is immutable after creation` | "Room code cannot be changed after creation." |
| `Cannot create plant group: strain has no abbreviation set` | "This strain does not have an abbreviation set. Go to Settings → Strains and add an abbreviation before creating a plant group." |
| `Cannot complete harvest: strain "%" has no abbreviation set` | "Cannot complete harvest — the strain {name} has no abbreviation set. Go to Settings → Strains and add an abbreviation first." |
| `Cannot adjust weight: no batch linked to this harvest session` | "Weight adjustment is not available — no batch is linked to this harvest session." |
| `Adjusted weight must be greater than zero` | "Adjusted weight must be greater than zero." |
| `Adjustment reason is required when adjusting harvest weight` | "Please provide a reason for the weight adjustment." |

---

## Testing Requirements (Phase D)

The following scenarios must have test coverage before Session C-3 ships:

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

---

**Document Version:** 1.2
**Last Updated:** 2026-02-18
**Status:** SPECIFICATION — rules are locked. No changes without explicit discussion.
