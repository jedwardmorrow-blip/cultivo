# Production Planner Harness Report

Generated: 2026-05-14T21:54:23.943Z

Purpose: keep the Sostanza demo, live Cultivo planner, and Cultivo design/data contracts honest before planner work starts or ships.

## Summary

Overall score: 98%

Checks: 23 pass, 1 warn, 0 fail.

Plain-English read:

- The live planner exists and is wired to Supabase views.
- The polished Sostanza/lab planner exists in the prod-planner-b worktree and carries richer demo behavior.
- The first live bridge is in place: live planner rows can now read batch lifecycle and render cohort identity read-only.
- The live create path now attempts fn_plan_cycle first, with planned_cycles fallback until the database RPC is deployed.
- The live planner now has a minimal multi-strain cohort form with visible data-honesty guardrails.
- Mother batch group lineage now has a live schema/RPC/UI path; the remaining work is hold-back and retire actions.
- The design-system gap is concrete: live planner chrome still has raw palette/stage-tint/prose issues that the harness can now call out before more polish lands.

## Recommended Next Move

The read-only lifecycle bridge, RPC-first create path, minimal cohort form, and mother-batch lineage path are now the base. The next useful slice is adding hold-back/retire actions, or a final design-system pass if demo polish is the priority.

## File Coverage

### PASS - Live planner view exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Live planner hook exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/src/features/production-planner/hooks/useProductionPlanner.ts`

### PASS - Live planned-cycle service exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/src/features/production-planner/services/plannedCyclesService.ts`

### PASS - Live planned-cycle form exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Live planner types exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/src/features/production-planner/types.ts`

### PASS - Demo planner view exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo-worktrees/prod-planner-b/src/features/lab/production-planner/LabProductionPlanner.tsx`

### PASS - Demo planner hook exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo-worktrees/prod-planner-b/src/features/lab/production-planner/useLabPlannerData.ts`

### PASS - Sostanza fixture exists

Source file was found and included in the harness read.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo-worktrees/prod-planner-b/src/features/lab/production-planner/sostanza-mock.ts`

## Design Contract

### PASS - Surface treatment is known

Production Planner is assigned Treatment A: hairline grid / instrument mode.

Evidence: `docs/design-system/PHASE-1-SURFACE-GUIDE.md`

### PASS - No raw palette classes in live planner chrome

Live planner chrome uses semantic tokens for state styling.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Stage color is not used as panel fill or border

No obvious stage-color panel fills were found in the live planner.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Instrument UI avoids prose

No obvious prose sentence was found in the planner instrument chrome.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Radius stays inside instrument bounds

No rounded-lg planner chrome was found.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

## Data Contract

### PASS - Live planner reads room occupancy

The current live planner should keep reading the room occupancy contract until the cycle bridge replaces it.

Evidence: `src/features/production-planner/hooks/useProductionPlanner.ts`

### PASS - Live planner reads strain stats

The planner can show strain-level performance, but recommendations still need sample-size/confidence guards.

Evidence: `src/features/production-planner/hooks/useProductionPlanner.ts`

### WARN - Live planning path still depends on planned_cycles

The world model says planned_cycles is a legacy single-strain path and should be superseded by cycle/batch-group planning. Treat this as a bridge, not the destination.

Evidence: `src/features/production-planner/hooks/useProductionPlanner.ts`

### PASS - Writes use legacy planned_cycles table

Live create path attempts fn_plan_cycle first and only falls back to planned_cycles while the RPC is not deployed.

Evidence: `src/features/production-planner/services/plannedCyclesService.ts`

### PASS - Sample-size data exists but is not enforced

Live cohort form surfaces harvest-count and conversion-session confidence warnings before plan creation.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

## Demo-To-Live Parity

### PASS - Sostanza fixture is explicit

Demo mode has a named Sostanza fixture. Good: the harness can compare a known scenario instead of generic mock data.

Evidence: `src/features/lab/production-planner/useLabPlannerData.ts`

### PASS - Live and demo read batch lifecycle

The live planner now has a read-only batch lifecycle bridge, so it can render the same batch identity model the polished lab planner uses.

Evidence: `src/features/production-planner/hooks/useProductionPlanner.ts`

### PASS - Demo renders batch-grouped Gantt identity

Live planner collapses lifecycle-backed rows into cohort bars using cycle_id or batch-code prefix identity.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Mother batch groups have a live lineage path

Live planner reads v_mother_batch_groups and can attach mother lineage to fn_plan_cycle strain rows.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Batch-group planning is mock/demo behavior

Live mode has a minimal multi-strain cohort form that submits fn_plan_cycle-shaped payloads.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Demo carries data-honesty flags

Demo data layer tracks confidence/synthetic state. Live planner should inherit this visual honesty before planner recommendations become trusted.

Evidence: `src/features/lab/production-planner/useLabPlannerData.ts`

## How To Use This

Run `npm run harness:planner` at four moments:

1. Before starting planner work.
2. After changing the Sostanza/demo planner.
3. Before porting demo behavior into the live planner.
4. Before deployment or stakeholder demo.

The harness is intentionally strict about warnings. A warning does not mean stop; it means name the tradeoff before continuing.
