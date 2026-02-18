---
title: Cultivation Pre-Work — Phase D Risk Analysis
category: Planning & Architecture
updated: 2026-02-18
priority: Read before writing tests for critical paths
---

# Cultivation Pre-Work — Phase D Risk Analysis

> **Purpose:** Detailed analysis of the testing gaps identified in
> `docs/SYSTEM-HEALTH-ASSESSMENT.md`, with a prioritized plan for adding coverage to the
> highest-risk paths before the cultivation module goes live.
>
> **Read this document when:** An AI session is assigned to add test coverage to the system.

---

## Phase D Overview

Phase D is additive — it adds tests without changing any production code. It carries the
lowest rollback risk of all four phases. However, writing tests for complex business logic
requires deep familiarity with the codebase behavior, so this document includes explicit
context for each test target.

Phase D can run in parallel with cultivation scaffolding. The tests described here are for
**existing** post-production features. Cultivation-specific tests should be written alongside
the cultivation code, not here.

| Item | Target | Risk Level | Priority | Status |
|------|--------|------------|----------|--------|
| D1 | Session completion (all 3 types) | None | Highest | **Complete (2026-02-18)** |
| D2 | `inventoryMovement.service.ts` | None | Highest | **Complete (2026-02-18)** |
| D3 | Conversion finalization flow | None | High | **Partial (2026-02-18) — pure functions only** |
| D4 | Order fulfillment and status transitions | None | Medium | Pending |
| D5 | Batch allocation and ATP checks | None | Medium | Pending |

---

## Current Test Coverage State

There are 5 test files for ~45 service files:

| Test file | Service tested | Coverage assessment |
|-----------|----------------|---------------------|
| `error.service.test.ts` | `errorService` | Good — 6 test cases |
| `notification.service.test.ts` | `notificationService` | Good — 8 test cases |
| `customers.service.test.ts` | `customersService` | Partial — happy paths only |
| `utils.test.ts` | `src/lib/utils.ts` | Basic — formatters only |
| `productNaming.test.ts` | `src/lib/productNaming.ts` | Good — string parsing |

**Zero coverage on:**
- `sessions.service.ts` — session creation, completion, cancellation
- `inventoryMovement.service.ts` — the most critical write path in the system
- `conversions.service.ts` — finalization, variance logging, package creation
- `ordersService.ts` — order status transitions
- Any RPC-calling service

---

## Test Infrastructure Reference

Tests use Vitest with happy-dom. The Supabase client is mocked via
`src/__tests__/mocks/supabase.ts`. Test helpers are in `src/__tests__/helpers/testUtils.tsx`.
Fixtures are in `src/__tests__/fixtures/mockData.ts`.

Before writing new tests, read the existing test files to understand:
- How the Supabase mock is structured (it uses `vi.mock`)
- What fixtures already exist (avoid duplicating strain, product, and customer fixtures)
- How async service calls are tested (await + mock return values)

---

## D1: Session Completion Tests

### Why this is the highest-priority test target

A broken session completion function corrupts inventory records in ways that are difficult
to reverse. The inventory ledger is append-only and immutable — a wrong movement record
cannot be deleted. A missing completion record leaves a session in an inconsistent state
between `trim_sessions` and `inventory_movements`.

Session completion is also the entry point for conversion finalization. If `completeTrimSession`
inserts incorrect `big_buds_grams` values, the downstream conversion shows the wrong pending
weight. This has happened in production (see `docs/archive/sessions/SESSION-2025-12-02-...`).

### What to test

**For each session type (trim, bucking, packaging), test:**

1. **Happy path:** session is completed with valid data; verify the Supabase update is called
   with the correct fields and `session_status: 'completed'`

2. **Variance calculation:** verify that the variance shown in the UI (`pulled_weight - totalOutput`)
   is calculated correctly across edge cases:
   - All output fields are zero (variance = full pulled weight)
   - Output slightly exceeds pulled weight (negative variance)
   - `bucked_smalls_grams` is included in total (trim sessions only)

3. **Missing required fields:** verify that calling `completeTrimSession` without `big_buds_grams`
   does not produce a zero-weight inventory record

4. **Cancellation path:** `cancelTrimSession`, `cancelBuckingSession`, `cancelPackagingSession`
   — verify the cancelled session's inventory reservation is released

### Key service functions to test

```
sessions.service.ts:
  - completeTrimSession(sessionId, completionData)
  - completeBuckingSession(sessionId, completionData)
  - completePackagingSession(sessionId, completionData)
  - cancelTrimSession(sessionId, cancelData)
  - cancelBuckingSession(sessionId, cancelData)
  - cancelPackagingSession(sessionId, cancelData)
```

### Test file location

Create: `src/__tests__/unit/features/sessions/sessions.service.test.ts`

Follow the pattern in `src/__tests__/unit/features/customers/customers.service.test.ts` for
structure. Mock the Supabase client using the existing mock in `src/__tests__/mocks/supabase.ts`.

### What NOT to test in D1

- Do NOT test the database triggers (`on_trim_complete`, `on_bucking_complete`) — these run
  server-side and cannot be tested with the client-side mock. They are tested implicitly by
  the E2E workflow.
- Do NOT test the UI components (`TrimSessionCompleteModal.tsx`, etc.) in D1 — component
  tests require rendering and belong in D4+. D1 is service unit tests only.

---

## D2: inventoryMovement.service.ts Tests

### Why this is the highest-priority test target

`inventoryMovementService.recordMovement()` is the single entry point for all inventory
changes. Critical Rule #1 in `CLAUDE.md` states:

> **Never directly update inventory quantities.** Use `inventoryMovementService.recordMovement()`.
> Database triggers handle balance updates.

If `recordMovement` silently fails (returns without inserting), or inserts with incorrect
`kind` or `quantity_change` values, the inventory ledger becomes incorrect and the displayed
inventory quantities are wrong. This is the most consequential write operation in the system.

### What to test

1. **Happy path:** `recordMovement({ kind: 'adjustment', quantity_change: -50, ... })` calls
   `supabase.from('inventory_movements').insert()` with the correct payload

2. **kind validation:** verify that an invalid `kind` value (not in the movement enum) is
   rejected with a meaningful error before the database call

3. **batch_id validation:** verify that a null or undefined `batch_id` is rejected.
   Per Critical Rule #3: "batch_id is never null in inventory operations"

4. **Negative quantity handling:** `kind: 'consume'` should have a negative `quantity_change`.
   Verify the sign is correct (common source of bugs in inventory ledger systems).

5. **session_finalization bypass:** `reason_code: 'session_finalization'` is the bypass for
   Architecture Decision #1. Verify this reason code is passed through correctly to the DB call
   (the trigger bypasses balance updates for this reason code).

### Key function to test

```
inventoryMovement.service.ts:
  - recordMovement(movement)
```

Also test the helper/validator functions if any exist (check the file first).

### Test file location

Create: `src/__tests__/unit/services/inventoryMovement.service.test.ts`

### Critical context for writing this test

The Supabase mock must be configured to return success for `.insert()` calls. The test verifies
that `recordMovement` calls `.insert()` with the RIGHT arguments — not that the database actually
processes the movement (that is a DB-level concern, tested by running the real DB).

---

## D3: Conversion Finalization Tests

### Why this is a high-priority test target

The conversion finalization workflow is the most complex business logic path in the system.
It involves:
1. Fetching pending conversion sessions from the `pending_conversions` view
2. Calling the `finalize_session_aggregated` RPC
3. Creating inventory items for each finalized product
4. Logging any variances
5. Updating `conversion_packages.finalization_status`

This workflow has broken 4 times in production (see the archive session docs for
SESSION-2026-01-21, SESSION-2026-01-27, SESSION-2026-01-28, SESSION-2026-02-05). Each time,
the bug was discovered by a user seeing wrong data in the conversions view, not by a test.

### What to test

1. **`calculateVariance`:** Pure function — unit test with multiple input combinations:
   - expected = actual (zero variance)
   - actual < expected (positive variance, yield loss)
   - actual > expected (negative variance, yield gain — cannabis edge case)
   - Zero expected weight (edge case — should handle division by zero)

2. **`getProductStageIdFromProductName`:** Test the product name → stage ID mapping logic
   (currently the most common source of conversion finalization bugs):
   - "Bulk Flower (Trimmed)" → 'Trimmed' stage
   - "Packaged - [Strain] - 3.5g" → 'Packaged' stage
   - Unknown product name → error thrown
   - Cache hit on second call (cache is populated from first call mock)

3. **`getCategoryFromProductName`:** Test the category mapping:
   - Flower products → 'flower'
   - Smalls products → 'smalls'
   - Trim products → 'trim'
   - Packaged weight → correct category based on name

4. **`logVariance`:** Verify the insert payload includes all required compliance fields
   (session_id, batch_id, expected_grams, actual_grams, reason)

### Test file location

Create: `src/__tests__/unit/features/inventory/conversions.service.test.ts`

### Important note on RPC testing

`finalizeConversion` calls `supabase.rpc('finalize_session_aggregated', ...)`. Testing this
function fully requires mocking the RPC response. The existing mock structure may not support
`.rpc()` calls — extend `src/__tests__/mocks/supabase.ts` to add `rpc` mocking if needed.

For D3, prioritize testing the pure functions (`calculateVariance`, `getCategoryFromProductName`,
`getProductStageIdFromProductName`) first. The RPC-calling functions are harder to mock and
belong in integration tests.

---

## D4: Order Status Transition Tests

### What to test

The order pipeline status machine has these transitions:

```
draft → pending → confirmed → ready_for_delivery → completed
                             ↘ cancelled (from any state)
```

Test that:
1. Moving an order to `ready_for_delivery` triggers the inventory deduction
2. `cancelled` status correctly releases any inventory reservations
3. Invalid transitions (e.g., `completed → pending`) are rejected

### Test file location

Create: `src/__tests__/unit/features/orders/orders.service.test.ts`

---

## D5: Batch Allocation and ATP Tests

### What to test

ATP (Available-to-Promise) is enforced at the database trigger level. Unit tests cannot
test the trigger. What CAN be tested:

1. `batchAllocation.service.ts` — batch selection logic for strain-matching
2. `getAvailableInventory()` — verify the filter logic returns only non-reserved inventory
3. `getBatchesForStrain()` — verify the strain matching logic

### Test file location

Create: `src/__tests__/unit/features/batches/batchAllocation.service.test.ts`

---

## Phase D Execution Order

Phase D is the only phase where items can be done in parallel. Recommended order within D:

```
D2 first  → inventoryMovement tests; most critical writes; fastest to implement
D1 second → Session completion tests; high complexity but well-defined inputs
D3 third  → Conversion finalization; start with pure functions only
D4, D5    → Can be done anytime after the codebase is stable
```

**One session recommendation:** In a single focused session, write D2 and the pure function
tests for D3. These can be completed in under 2 hours of focused work and provide the highest
risk coverage for the lowest implementation complexity.

---

## Test Writing Rules for This Codebase

These rules must be followed for all Phase D tests to avoid introducing noise into the test
suite.

1. **Mock Supabase, not logic.** Use `src/__tests__/mocks/supabase.ts`. Never hit the real
   database in a unit test.

2. **Test behaviors, not implementations.** Test that `recordMovement` passes the right
   arguments to the DB call — not that it calls `supabase.from('inventory_movements')` in
   a specific way that might change if the service is refactored.

3. **Name tests after the business rule.** Use:
   ```typescript
   it('rejects a movement with null batch_id per Critical Rule #3')
   it('passes reason_code=session_finalization through for trigger bypass')
   ```
   Not:
   ```typescript
   it('calls insert with correct data')
   ```

4. **Document what the test is protecting.** Add a comment referencing the architecture
   decision or Critical Rule that the test enforces. This context is lost when tests are
   written without explanation.

5. **Do NOT test Supabase internals.** Do not assert that `.from('table')` was called —
   the mock already validates this. Assert the business outcome: the right payload, the right
   error message, the right returned data.

---

## Risk Summary Table

| Item | Existing Features at Risk | Risk Level | Test Complexity |
|------|--------------------------|------------|-----------------|
| D1 | Sessions | None | Medium |
| D2 | Inventory movement | None | Low-Medium |
| D3 | Conversions | None | High (RPC mocking) |
| D4 | Orders | None | Medium |
| D5 | Batch allocation | None | Low |

---

## Phase D Relationship to Cultivation

**D1 and D2 tests are templates for cultivation session tests.** When the cultivation module
adds grow sessions and harvest sessions, the test structure from D1 should be directly reused.
Write the cultivation session tests at the same time as the cultivation session service — not
after.

**D3 pure function tests are regression guards.** The `getProductStageIdFromProductName` and
`getCategoryFromProductName` functions will need to be extended for cultivation product types
(e.g., "Live Plant - [Strain]", "Harvested Material - [Strain]"). Tests written in D3 will
immediately catch if an extension breaks an existing mapping.

**D5 ATP tests will need cultivation-specific cases.** When cultivation inventory is added to
the ledger, the ATP constraint applies to those items too. Add cultivation-stage inventory
fixtures to `mockData.ts` when starting the cultivation module.
