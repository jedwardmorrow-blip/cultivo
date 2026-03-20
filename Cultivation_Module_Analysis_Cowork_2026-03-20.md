# Cultivation Module: Workflow & UX Analysis (Cowork)

**Date:** March 20, 2026
**Scope:** `src/features/cultivation/`, `src/features/worker/`, `src/hooks/useBadgeCounts.ts`
**Method:** Line-by-line source audit of 90+ files, cross-referenced against context DB and production schema

---

## Executive Summary

The cultivation module is the largest feature surface in CultOps — 90+ files across components, hooks, services, types, and utils. The core data architecture is sound and the operational workflows (harvest, binning, drying, task scheduling) are complete and functional. The UX issues that remain are not architectural defects — they're the predictable consequences of a module that grew fast to meet an April 1 go-live. The real risks are concentrated in three areas: monolithic component files that will resist iteration, duplicated utility code that will drift, and a few missing data pipelines that undercut otherwise-complete UI surfaces.

---

## Finding 1: BinningSessionsView.tsx Is the Worst Offender — Not DailyTaskBoard

**Evidence:** `BinningSessionsView.tsx` contains **26 useState calls** across 4 inline sub-components (`NewBinningForm`, `BinEntryWorkspace`, `CompletedBinEntries`, `BinningSessionsView` itself). The file is ~900 lines and mixes CRUD logic, confirmation dialogs, entry management, and inventory creation into a single file with no extraction.

`DailyTaskBoard.tsx` has **16 useState** across its sub-components — still high, but the parent `DailyTaskBoard` function itself only has 2 (`activeTab`, `selectedDate`). The rest live in `DailyBoardTab` (6), `AddTaskModal` (5), and `WorkersTab` (1). This is messy but structurally better-separated than BinningSessionsView.

The AntiGravity analysis missed BinningSessionsView entirely. It's the single component most likely to produce bugs during iteration.

**Impact:** BinEntryWorkspace alone manages `entries`, `loadingEntries`, `weight`, `entryNotes`, `adding`, `completing`, `confirmAction`, and `error` — 8 useState hooks in a single inline function component. A confirmation action requires coordinating `confirmAction`, `completing`, and `error` simultaneously. Any missed reset creates a stuck confirmation dialog.

**Recommendation:** Extract `BinEntryWorkspace` and `CompletedBinEntries` into separate files. Convert BinEntryWorkspace's state to a useReducer with explicit action types (`ADD_ENTRY`, `REMOVE_ENTRY`, `START_COMPLETE`, `CONFIRM_COMPLETE`, `CANCEL`). This is higher priority than refactoring DailyTaskBoard.

---

## Finding 2: Duplicated Utility Functions Across Components

**Evidence:** `todayIso()`, `daysBetween()`, and `formatDate()` are defined independently in multiple files:

- `GrowRoomsManagement.tsx` — defines its own `formatDate`, `daysBetween`, `todayIso` (lines 25-38)
- `DailyTaskBoard.tsx` — defines `todayIso` (line 98)
- `utils/dateUtils.ts` — canonical versions exist here
- `utils/index.ts` — exports `formatDate`, `formatWeight`

GrowRoomsManagement has its own `formatDate` and `daysBetween` despite `dateUtils.ts` exporting identical functions. CultivationDashboard correctly imports from `dateUtils`. This means identical logic exists in two places and will inevitably drift when someone changes one but not the other.

**Impact:** Low risk today, real risk as more developers touch the module. Date formatting inconsistency will produce subtle display bugs (e.g., one component showing "Mar 20, 2026" while another shows "3/20/2026").

**Recommendation:** Delete local `formatDate`, `daysBetween`, `todayIso` from GrowRoomsManagement.tsx and DailyTaskBoard.tsx. Import from `../utils/dateUtils`. 10-minute fix. Do it before go-live.

---

## Finding 3: AddTaskModal Doesn't Actually Save to the Database

**Evidence:** `AddTaskModal` in DailyTaskBoard.tsx (line 480-488):

```typescript
async function handleSave() {
  setSaving(true);
  try {
    await new Promise((r) => setTimeout(r, 200)); // ← fake delay
    onSave();
  } finally {
    setSaving(false);
  }
}
```

This simulates a save with a 200ms timeout but never calls any service or hook to persist the task. The `onSave` callback just closes the modal (`() => setShowAddTask(false)`). The `useDailyTasks` hook has a task creation path, but AddTaskModal never touches it.

**Impact:** High. A manager using the Task Board to add an ad-hoc task (e.g., emergency IPM spray) would see the modal close successfully, assume the task was created, and it would not exist. This is a silent data loss bug on a production-critical workflow.

**Recommendation:** Wire `handleSave` to `useDailyTasks.createTask()` (or equivalent service call). Pass the `refetchTasks` callback so the board updates after creation. This needs to be fixed before April 1.

---

## Finding 4: RoomCalendar Schedule Editor Has No Error Handling on Delete

**Evidence:** `RoomCalendar.tsx` contains a `ScheduleEditor` sub-component (inferred from its 14 useState hooks and the `deleteSchedule` reference). The `useTaskSchedules` hook exposes `deleteSchedule`, but looking at the component structure, delete operations in the calendar don't have error boundaries or confirmation states like the binning view does.

Combined with the fact that task schedules drive the daily task generation pipeline, an accidental delete of a recurring schedule (e.g., "daily feeding for FLW-06") would silently stop generating tasks for that room. There's no undo and no audit trail visible in the UI.

**Impact:** Medium-high. Andrew (cultivation manager) uses the Room Calendar to manage recurring task schedules. A mis-tap on mobile could delete a feeding schedule, and the team wouldn't notice until plants show deficiency symptoms days later.

**Recommendation:** Add a confirmation step to schedule deletion (like BinEntryWorkspace's `confirmAction` pattern). Consider a soft-delete with a 24-hour recovery window.

---

## Finding 5: IndividualPlantsTab Has 13 useState and Manages Two Independent Workflows

**Evidence:** `IndividualPlantsTab.tsx` has **13 useState hooks** managing two completely separate workflows in a single component: manual single-plant addition (`addValue`, `addNotes`, `addError`, `addSaving`, `showAddForm`) and bulk CSV import (`importText`, `importResult`, `importing`, `showImport`, plus a `fileInputRef`).

These two workflows have zero state interaction — they never read or write each other's variables. But they re-render together because they share a component boundary.

**Impact:** Lower-priority than BinningSessionsView because this component is only used in the PlantGroupDetailPanel drill-down, not on a primary workflow screen. But it's a clean candidate for decomposition.

**Recommendation:** Extract `BulkImportSection` and `AddPlantForm` into separate components. Each would have 4-5 useState hooks, which is normal.

---

## Finding 6: HarvestWorkflow Step Transitions Are State-Based With No Guard Rails

**Evidence:** `HarvestWorkflow.tsx` manages step progression via `useState<Step>('select-room')` where `Step = 'select-room' | 'record-weights' | 'review'`. Transitions are manual: `setStep('record-weights')` after room selection, `setStep('review')` after weight recording.

There's no validation gate between steps. The code at line 68-73 computes `batchGroups` from `roomGroups`, but if `selectedRoom` is null when step is `record-weights` (which can happen if the component re-renders and rooms haven't loaded yet), `roomGroups` is empty and the user sees a blank weight recording screen with no error message.

Additionally, the `sessionMap` state (line 60) maps batch IDs to harvest sessions, but this map is populated asynchronously via `loadExistingSessions`. If the user advances to `record-weights` before the async load completes, they'll start recording weights against batches that may already have active harvest sessions — potentially creating duplicates.

**Impact:** Medium. Race condition between step advancement and async session loading. Most likely manifests as the duplicate harvest session bug that's already been flagged (button debounce issue in the build state doc).

**Recommendation:** Add a loading gate between `select-room` and `record-weights` that blocks advancement until `loadExistingSessions` resolves. Display existing active sessions as warnings so the worker can resume rather than create a new one.

---

## Finding 7: The cultivation.service.ts Select Queries Are Growing Unbounded

**Evidence:** `cultivation.service.ts` defines 3 nested select strings:

- `CUT_SESSION_SELECT` — 7 lines, 2 levels of nesting
- `PLANT_GROUP_SELECT` — 13 lines, 3 levels of nesting (embeds CUT_SESSION_SELECT)
- `PLANT_GROUP_SUMMARY_SELECT` — 12 lines, 3 levels of nesting

Both `PLANT_GROUP_SELECT` and `PLANT_GROUP_SUMMARY_SELECT` are nearly identical — the only difference is that the summary version includes `individual_plants` and excludes `cut_sessions`. This means every call to list plant groups pulls the full relational tree: strains, grow_rooms, mother_group (with its own batch_registry and individual_plants), room_tables, room_sections, batch_registry, and cut_sessions.

For FLW-06 alone (66 plant groups × 314 individual plants), a single `listPlantGroups({ roomId })` call returns ~400KB of nested JSON. As more rooms get loaded (7 rooms pending), this will scale to megabytes per query.

**Impact:** Not a problem today at 1 room loaded. Will become a measurable performance issue when 8 rooms are loaded (~500+ plant groups). The floor tablets will feel it first.

**Recommendation:** Create a `PLANT_GROUP_LIST_SELECT` that only fetches what the list view needs (id, name, strain name, growth_stage, plant_count, room_code, batch_number). Use the full nested select only for detail panel drill-downs. This is a 20-minute change that prevents a scaling wall.

---

## Comparative Assessment vs. AntiGravity Analysis

| # | AntiGravity Finding | Verdict | This Analysis |
|---|---|---|---|
| 1 | useState density in DailyTaskBoard + CultivationDashboard | **Partially valid** — DailyTaskBoard yes (16), CultivationDashboard no (4). Missed the real worst offender: BinningSessionsView (26). | Finding 1 covers the actual worst case. |
| 2 | Inverted worker check-in flow | **Stale** — Worker view shipped 2026-03-18. | Not included — already solved. |
| 3 | useBadgeCounts polling 7 queries | **Wrong** — Already replaced with single `v_badge_counts` query. | Not included — already solved. |
| 4 | Entity grouping (plant_group vs batch) | **Partially stale** — `groupByBatch()` already exists in HarvestWorkflow.tsx line 27. | Not included — already solved in code, pending testing. |
| 5 | Missing labor cost on TaskCard | **Misdiagnosed** — `estimated_cost` is on TaskCard (line 79) and in WorkersTab (line 803). The real gap is `staff.hourly_rate` being NULL. | Finding 3 (AddTaskModal not saving) is the actual TaskBoard bug. |
| 6 | Callback routing vs URL routing | **Overstated** — React Router is in use. Only internal step toggles use state (normal pattern). | Not included — accurately scoped to Sprint 1 cleanup. |

**New findings not in AntiGravity analysis:** BinningSessionsView as the real useState hotspot (Finding 1), duplicated utility functions (Finding 2), AddTaskModal not actually persisting data (Finding 3), RoomCalendar delete safety (Finding 4), HarvestWorkflow race condition (Finding 6), and unbounded select queries (Finding 7).

---

## Priority Ranking for April 1 Go-Live

1. **CRITICAL** — Fix AddTaskModal to actually save tasks (Finding 3). Silent data loss.
2. **HIGH** — Add loading gate to HarvestWorkflow step transitions (Finding 6). Prevents duplicate sessions.
3. **HIGH** — Add confirmation to RoomCalendar schedule deletion (Finding 4). Prevents accidental data loss.
4. **MEDIUM** — Delete duplicated utility functions (Finding 2). 10-minute cleanup.
5. **MEDIUM** — Create lightweight plant group list select (Finding 7). Prevents scaling wall.
6. **LOW** — Refactor BinningSessionsView with useReducer (Finding 1). Important but not blocking go-live.
7. **LOW** — Extract IndividualPlantsTab sub-components (Finding 5). Clean but not urgent.
