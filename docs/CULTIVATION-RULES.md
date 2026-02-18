---
title: CULTIVATION-RULES
category: Cultivation Module
version: 1.0
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

**Same-day same-strain rule:** If a batch already exists for `YYMMDD-STRAIN`, the `ON CONFLICT DO NOTHING` path in the trigger links the harvest session to the existing batch. Both harvest sessions (from different plant groups or different rooms) share one batch record.

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

## Decisions Made (and Why)

### Decision: Group-level tracking, not individual plant tracking

Individual plant RFID tag tracking (as required by some state compliance systems) is out of scope. This system tracks plant groups (a set of same-strain plants moving together). The `plant_count` field satisfies basic count requirements without per-plant overhead.

**Rationale:** The operator's current paper-based process groups plants. The digital system mirrors that workflow. Individual plant tracking can be added later without schema changes to the core tables (it would be a separate `plant_tags` table with FK to `plant_groups`).

---

### Decision: Batch number is auto-generated, not user-entered

When a harvest session completes, the batch number is generated by the system as `YYMMDD-STRAIN`. The user never types a batch number.

**Rationale:** Manual entry is the source of the typo and format errors documented in GAP-017. The trigger uses `strains.abbreviation` as the strain code component, which is already validated and consistent.

**Implication:** The existing `BatchManagement.tsx` "Create Batch" form (manual entry) remains available for edge cases but is no longer the primary batch creation path.

---

### Decision: Harvest session completion is a two-step UI action

The user fills in wet weight and plant count, then clicks "Save" (creates `session_status = 'active'`). A second click ("Complete Harvest") fires the trigger that creates the batch.

**Rationale:** Separating data entry from batch creation gives the user a chance to review the numbers before committing. Once the batch is created, it cannot be easily reversed.

---

### Decision: Same-strain same-day harvests share a batch

If two plant groups (e.g., Room A and Room B) of the same strain are harvested on the same day, their harvest sessions both link to the same `batch_registry` row.

**Rationale:** This matches the existing batch number format (`YYMMDD-STRAIN`) and the existing documentation in `BATCHES.md`. Combined weight from both harvests accumulates in one batch, which is how the operation works physically.

**Implication:** `harvest_sessions.batch_registry_id` is a many-to-one relationship (many harvest sessions can point to one batch). This is expected and handled by the trigger's `ON CONFLICT DO NOTHING` path.

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

---

**Document Version:** 1.0
**Last Updated:** 2026-02-18
**Status:** SPECIFICATION — rules are locked. No changes without explicit discussion.
