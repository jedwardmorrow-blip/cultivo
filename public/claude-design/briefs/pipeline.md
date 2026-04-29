# Cultivo Pipeline / Batch Overview — Session Brief

One-page session opener for the Cultivo COO Pipeline surface. Read this first, then the companion docs in priority order.

## Surface

**Cultivo Pipeline.** Internal alias: Batch Overview. The COO's default landing module on login. Read-only.

## Persona

**COO** (`cultivo_persona_coo`, brain id `2874b142-d832-4dca-b1cd-5f866ebb9229`). At Cult Cannabis scale Justin holds COO + CFO + CEO. The surface defaults to COO and offers persona-toggle filter-and-emphasis variants for CFO, Cultivation Manager, Post-Production Manager. One canvas, four reads.

## Question to answer

What does the company own right now, what is it worth, where is it stuck, what is at risk, and what is the timeline and cost to actualize that revenue.

Five clauses, not interchangeable. Own and worth are static. Stuck and at-risk are friction. Timeline-and-cost-to-actualize is the forward read.

## Success criterion

The COO opens Pipeline at start of day. Within five seconds, four answers are visible without scroll, click, or filter: how much is in flight, how much is at rest in each stage, how much is on track to close this month, what is at risk. If those four answers require any interaction, the surface failed.

## Data contract

Single read source: `v_batch_lifecycle` (consumer contract row `371aa73b` in brain). Real fixture: 15 production batches at [cultivo-batch-overview-fixture.json](cultivo-batch-overview-fixture.json) covering all six stages, all six confidence tiers, packaged + bulk channel mix, three explicitly-stuck batches, orphan tier, closed-and-depleted terminus.

Discipline: gross projected revenue only, never net margin in v1. 18 percent wet-to-sellable conversion factor with strain-specific outliers respected. Estimates visually distinguished from realized via italic Plex Mono load-bearing for estimates, roman for realized.

## Aesthetic

Operator canvas `#0A0A0A`. IBM Plex Sans for UI, Plex Mono for numbers. No liquid glass, no gradient mesh, no backdrop blur. Stage colors as 6px functional dots only, never as fills or backgrounds. Single warm-white accent `#E8E0D4`. Hairlines, not cards. See `brand-tokens.css` for the contract.

## Six non-negotiables in first viewport

1. Total assets in flight as four numbers: grams in flight, gross projected revenue, allocated, realized.
2. Grams-at-rest by stage with stuck-stage callouts.
3. The pipeline-to-orders revenue gap rendered as a triplet (projected, allocated, realized).
4. At-risk list capped at 5-7 items with five category badges.
5. Cash-conversion paired-bar visualization (time-to-cash + cost-to-actualize across 30 / 60 / 90 / 90+ day buckets).
6. Full batch list below the fold with row drill-in to single-batch deep-dive.

## Discipline rules

Read-only. Edits route to owning modules. Gross numbers only. Override flag visible on any number that came from a manual override vs derived. Italic Plex Mono = estimate; roman = realized. Orphan tier hidden by default with count chip in header. Cultivation_only confidence tier degrades clusters gracefully. D16 attribution gap (68 percent of completed revenue has NULL `order_items.batch_id`) labeled honestly as unattributed-remainder bucket; do not hide it.

## Out of scope for v1

Net revenue, multi-tenancy, mobile-first, inline edits, RLS implementation, cross-tenant comparison, labor cost capture (deferred per row `0c221ef4`).

## Companion docs (read in this order)

1. **[cultivo-batch-overview-spec.md](cultivo-batch-overview-spec.md)** — full spec, 13 sections + 5-A + 12-A + 12-B + 13. Sections 1-3 are this brief in long form; sections 4-9 are the data contract and aesthetic constraints; sections 10-12 are out-of-scope and open questions.
2. **[cultivo-batch-overview-fixture.json](cultivo-batch-overview-fixture.json)** — 15 real production batches plus distribution metadata for typography sizing.
3. **`cultivo_pipeline_batch_asset_spec`** brain row (id `db0b8d63`) — canonical version of the spec.
4. **`cultivo_persona_coo`** brain row (id `2874b142`) — persona contract.

## Open questions for paired-mock resolution

Four questions Claude Design returns mocks for at Gate A (per spec section 12-A working assumptions, all confirmed for v1, only the visual treatment is open):

  Italic-vs-roman cadence on rollup numbers when projected and realized sit adjacent.
  Banner first-paint exact behavior (12s pause then 8s cycle, server-generated; first-paint visual is open).
  Compact chart floor visual when paired-bar demotes to sparkline strip below 180px tall.
  Override / derived badge typography on the override flag.

## Engineering dependencies (do not block design)

  `task_tracker` `1444ff8c` — strain wholesale price columns + admin override.
  `task_tracker` `68987d7e` — `expected_stage_durations` and `cost_to_actualize_factors` lookup tables.
  `task_tracker` `73d55395` (D15), `50029649` (D16), `3d9f38a7` (D17) — known data quality bugs.

## Process

This surface ships through `cultivo_design_process_v1`. Step 2 runs both Claude Design canvas (Track A) and Claude Code worktrees (Track B) in parallel against the same brief and fixture. Both tracks return artifact + five-line decision note. Justin scores both at Gate A on three axes (speed, quality, token-headroom-left), appends to `cultivo_surface_scorecards`, picks the shipping artifact. Track B is the variant most likely to benefit from the real fixture; Track A is the variant most likely to benefit from the canvas + tweaks-panel for token A/Bs.
