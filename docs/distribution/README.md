Cultivo Distribution Surface — Redesign Docs

These are SNAPSHOTS for offline / out-of-brain reference. The canonical sources of truth live in the Praxis World Model brain (Supabase project `uayyhluztelnfxfvdhyt`). If these snapshots conflict with the brain, the brain wins.

Read order

1. `cultivo-brief-distribution.md` — one-page session-opening brief per `cultivo_design_process_v1`. Names the surface, persona, the question, the data contract reference, the success criterion, what carries forward, what changes, what's added, the layout proposal, the constraints, and the lane assignment (Lane 1 Claude Design canvas).
2. `cultivo-prompt-distribution-claude-design.md` — the orienting prompt to paste into a fresh Claude Design canvas session for Step 2 (variants).
3. `laura-distribution-context.md` — 31KB synthesis of 27 brain rows on Laura Gonzalez (Distribution Coordinator + Post-Production Manager at Cult Cannabis), her workflows, her feature requests, the discovery-sprint findings.

Canonical brain rows (query Supabase `uayyhluztelnfxfvdhyt`)

- `cultops_feature_spec` row id `06f02652-7f7d-4fa9-8e5e-fb68f6545253` — reviewed Distribution data + behavior contract. Source SHA cult-ops `5dc4940`. Status `reviewed`, reviewed_by `justin`, reviewed_at 2026-04-26.
- `business_context` row `cultops_distribution_philosophy` (2026-04-07) — the historical Cult Ops Step 1 Philosophy that drove the existing surface. Carries forward the Calendar + Map metaphor and adjacency rules.
- `business_context` row `cultops_distribution_philosophy_v2_supersedes` id `5a16cd72-5925-453d-8569-fb3e2608f3c1` (2026-04-26) — the supersession addendum. Maps what carries forward verbatim, what's superseded by the new DS, what's added.
- `business_context` row `cultivo_persona_distribution_coordinator` — persona contract.
- `business_context` row `cultivo_design_process_v1` — current process doctrine (Steps 0-6, lane assignment, scorecards, kill list, supersession of dual-track default).
- `business_context` row `cultivo_lint_baseline_2026_04_26` — migration backlog the redesign feeds into.
- `business_context` row `cultops_development_process` — the canonical Cult Ops 3-step (Philosophy then Specification then Implementation), ancestor of `cultivo_design_process_v1`.
- `system_rules.cultivo_workflow #1` (critical, active) — gates port briefs behind a reviewed `cultops_feature_spec` row.

Companion artifacts elsewhere on disk

- `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/` — canonical DS package (CLAUDE.md, brand-tokens.css, System Reference HTML, mockups, pr-package).
- `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-app-ref-2026-04-26/reference/` — `DistributionCommandCenter.tsx`, `DistributionKpiStrip.tsx`, `distribution-constants.ts` copied for design reference. Do not port styles; understand the surface.

Lane and next step

Lane 1, Claude Design canvas. Step 2 deliverable is two artboards minimum at 1366 landscape (default state + crisis state), proposed `--zone-*` token deltas, and a five-line decision note appended to the `cultivo_surface_scorecards` brain row. Full deliverable spec in the prompt.

Out of scope (queue separately)

Partial-return flow, multi-facility staff_id scoping, two-tab InventoryDrawer concurrency, browser-vs-facility timezone math, document dispatch role permissions UI, dry/cure-built-into-Distribution as workflow (v2 follow-up).
