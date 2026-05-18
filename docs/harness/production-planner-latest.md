# Production Planner Harness Report

Generated: 2026-05-18T22:56:27.957Z

Purpose: keep the Sostanza demo, live Cultivo planner, and Cultivo design/data contracts honest before planner work starts or ships.

## Summary

Overall score: 99%

Checks: 50 pass, 1 warn, 0 fail.

Plain-English read:

- The live planner exists and is wired to Supabase views.
- The polished Sostanza/lab planner exists in the prod-planner-b worktree and carries richer demo behavior.
- Both the Cultivo lab planner and standalone Sostanza stakeholder demo are first-class harness inputs.
- Demo-to-live parity checks are currently green for the planner bridge surface.
- Data contract still has warnings; planned_cycles remains a bridge until fully superseded.
- Design-system checks currently pass for live planner chrome.
- Intuitive-design checks currently pass for the planner harness scope.
- Browser-flow checks currently pass for the Sostanza Plan a Cycle stakeholder path.

## Recommended Next Move

The read-only lifecycle bridge, RPC-first create path, minimal cohort form, and mother-batch lineage path are now the base. The next useful slice is adding hold-back/retire actions, or a final design-system pass if demo polish is the priority.

## Target Coverage

### PASS - Sostanza demo repo is discoverable

The harness can see the standalone sostanza-demo repo that backs the stakeholder demo URL.

Evidence: `/Users/justinmorrow/Desktop/Claude/sostanza-demo`

### PASS - Sostanza demo Vercel target is identified

The harness found the Vercel project metadata for the live demo target.

Evidence: `/Users/justinmorrow/Desktop/Claude/sostanza-demo/.vercel/project.json`

### PASS - Cultivo and Sostanza deploy targets are separate

Cultivo planner changes deploy to the cultivo project, while sostanza.gopraxis.ai is backed by the separate sostanza-demo project. Treat stakeholder-demo changes as a second repo/deploy step.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/.vercel/project.json; /Users/justinmorrow/Desktop/Claude/sostanza-demo/.vercel/project.json`

### PASS - Cultivo planner changes are mirrored to Sostanza when needed

No Cultivo-only planner source changes are currently in flight, or the standalone Sostanza demo has matching planner work.

Evidence: `cultivo changed: none; sostanza changed: none`

### PASS - Both demo targets are first-class harness inputs

The harness validates the Cultivo lab planner target and the standalone Sostanza stakeholder-demo target.

Evidence: `lab target: /Users/justinmorrow/Desktop/Claude/cultivo-worktrees/prod-planner-b; stakeholder target: /Users/justinmorrow/Desktop/Claude/sostanza-demo`

### PASS - Standalone Sostanza planner includes cycle-contract surface

The standalone Sostanza demo includes the cycle-contract route behavior that the stakeholder URL depends on.

Evidence: `/Users/justinmorrow/Desktop/Claude/sostanza-demo/src/features/lab/production-planner/SostanzaBureauPlanner.tsx`

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

## UX / Intuitive Design

### PASS - Intuitive design rubric is present

The harness has a written rubric for judging natural action hierarchy and comprehension.

Evidence: `docs/harness/ux-intuitive-design-rubric.md`

### PASS - Orientation is explicit

The screen should make location and mode obvious through the title and Current/Planning mode controls.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Primary action is named in user language

The planning modal names the object being created and labels the final action as Create Batch Group.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Action hierarchy has primary, secondary, and escape

The planner form should expose one dominant create action, one quieter add-strain action, and a clear cancel/close path.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Risk context appears before commitment

Confidence warnings appear before the operator commits the plan.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Capacity context is near composition

Room capacity and planned plant total are shown near batch-group composition.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Mother context is close to strain selection

Mother group selection should live directly below the strain row it affects.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - Navigation affordances are discoverable

Room rows and plus controls expose basic affordances, but screenshot review should still verify the click targets read naturally.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Clickable/detail affordance does not rely only on hover title

Interactive timeline elements have more than hover-title affordance or are not treated as record drilldowns.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

### PASS - Recovery paths are available

The modal supports close/cancel, removing a strain row, and deleting an existing planned cycle.

Evidence: `src/features/production-planner/components/PlannedCycleForm.tsx`

### PASS - High-level planning context precedes alerts

Planning inventory context should appear before transient alerts so the screen reads from operating substrate to exceptions.

Evidence: `src/features/production-planner/components/ProductionPlannerView.tsx`

## Browser Flow

### PASS - Sostanza Plan a Cycle browser report is loaded

The latest browser harness report was generated at 2026-05-18T22:40:32.501Z against http://127.0.0.1:5177/?demo=sostanza#.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Sostanza stakeholder demo opens with planner actions

1 top action, 6 gap cards

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Clone shortfall blocks create with recovery actions

RESOLVE BEFORE CREATE Singapore Sling 458 UNCOVERED CUTS USE OUTSIDE CLONES REDUCE TO 200 MOM CUTS PICK MOMS

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Clone recovery enables create

READY TO CREATE BATCH GROUP.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Veg overload is a soft warning with auto recovery

VEG CAPACITY WARNING VEG-01 PEAKS 976/840 This plan can still be created, but veg labor or bench space needs review before May 25, 2026. USE AUTO · VEG-02

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Flower capacity block has guided recovery actions

FLOWER CAPACITY BLOCK FLW-01 HOLDS 252 PLANTS; THIS PLAN HAS 420 Resolve the plant count or move to a room that fits before creating the batch group. REDUCE TO 252 PLANTS USE FLW-06

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Flower capacity recovery paths clear the block

Reduce-to-cap and use-room recovery both cleared the flower capacity block.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Finalize shows fixed confirmation banner

FINALIZED · 1-STRAIN BATCH GROUP · 420 PLANTS planned into FLW-06 ADDED TO PLANNING VIEW · CLIENT ONLY ×

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - Mobile warning layouts stay inside viewport

warning width 336px inside 390px viewport

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

### PASS - No browser console errors

Browser flow check completed without additional notes.

Evidence: `/Users/justinmorrow/Desktop/Claude/cultivo/docs/harness/browser/sostanza-plan-cycle-browser-report.json`

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

### PASS - Writes prefer fn_plan_cycle over legacy planned_cycles

Live create path attempts fn_plan_cycle first and only falls back to planned_cycles while the RPC is not deployed.

Evidence: `src/features/production-planner/services/plannedCyclesService.ts`

### PASS - Sample-size data is surfaced before planning

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

### PASS - Batch-group planning has a live bridge

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
