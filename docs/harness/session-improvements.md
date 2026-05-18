# Harness Session Improvements

## 2026-05-15 - Production Planner

- Done: add a first-class standalone Sostanza demo target to `npm run harness:planner`, so the harness validates `/Users/justinmorrow/Desktop/Claude/sostanza-demo` directly in addition to the `cultivo-worktrees/prod-planner-b` parity target.
- Done: add timestamped markdown snapshots under `docs/harness/runs/` plus `docs/harness/runs/index.json`, so `production-planner-latest.md` is no longer the only durable record.
- Done: add `npm run harness:planner:compare`, which compares the last two indexed runs and writes `docs/harness/production-planner-compare-latest.md`.
- Done: add an intuitive-design rubric and first-class UX checks to `npm run harness:planner`, so hierarchy, obvious actions, context placement, navigation, and recovery paths are assessed before planner work ships.
- Next: turn the hover-only cohort detail warning into either a visible detail affordance in the planner UI or a stricter accessibility/browser check in the harness.
- Next: fold browser harness results into the main score or a sibling compare report, especially the current 404 console errors.

## 2026-05-16 - Production Planner Closeout

- Next: have `harness:planner:strict` and `harness:planner:compare` ingest `docs/harness/browser/production-planner-browser-report.json`, so browser-only failures like 404 console errors and missing Mother Groups visibility cannot sit outside the reported 97% planner score.

## 2026-05-16 - Planner Contract Note

- Decision: keep the cycle-native migration additive until the stakeholder demo and production DB prove the new read/write path. Do not remove the `planned_cycles` bridge or edit/delete fallback in a way that can compromise demo usability.
- Next: focus UX review on the Plan-A-Cycle/New Batch Group modal before deeper contract migration work.

## 2026-05-18 - Sostanza Plan a Cycle Browser Coverage

- Done: add `npm run harness:planner:browser`, which launches the standalone Sostanza demo and exercises Plan a Cycle through source shortfall, mom-cut recovery, outside-clone recovery, veg soft warning, flower capacity block/recovery, finalize banner, mobile warning layout, and console-error checks.
- Done: fold the latest Sostanza browser report into `npm run harness:planner` under a first-class Browser Flow section, so the harness score now reflects actual stakeholder-demo UI behavior.
- Next: add screenshot artifacts for the browser harness when a check fails, so a failing report shows the exact UI state without requiring a re-run.
