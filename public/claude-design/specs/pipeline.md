CULTIVO PIPELINE
The Operational P&L for Incoming Revenue
Module specification

Working name: Pipeline. Internal alias: Batch Overview. The data and intent below are fixed; the surface label is yours to set.

This document specifies what Pipeline must do, the data it has to work with, the discipline rules it must respect, and the lines it must not cross. It does not specify layout, visual hierarchy, interaction patterns, or aesthetic execution. Those are yours. Read this as the brief you would receive from a product lead with deep domain context: every constraint here exists for a real reason rooted in how cultivation businesses make money, lose money, and decide what to plant next. The shape of the answer is your craft.

Brain canonicals this spec depends on
v_batch_lifecycle consumer contract (row 371aa73b) is the read source
cultops_lineage_contract (row 4c33c4b5) is the schema spine
canonical_revenue_definitions (row 170679e8) is the revenue rule set, Justin-approved
inventory_revenue_model_corrections_2026_03_15 (row 0c221ef4) is the conversion-yield discipline, Justin-confirmed
revenue_stability_levers (row 5f47a4be) names the three levers Cult Cannabis is actually pulling
yield_tracking_requirements (row 5fa1a4ef) names cultivation primary metrics
cultivo_persona_coo (row 2874b142) names this surface as the COO default
cultops_inventory_philosophy (row 3b0baa61) defines the pantry-vs-ledger separation
cultops_design_philosophy (row d5515bf4) is the seven plus five principles
cultivo_architecture_strategy (row c0b655a0) defines the working-instrument aesthetic
cultivo_design_handoff_protocol (row 263f8d8b) defines who owns what

Section 1. The purpose

A cultivation business is a portfolio of biological assets in motion. At any moment Cult Cannabis, or any operator running on Cultivo, holds dozens of batches at varying stages of work-in-progress: some growing, some drying, some being processed, some sitting packaged, some partially sold. Each batch is capital tied up. The capital sits at risk until it converts to cash.

Pipeline is the operational P&L for incoming revenue. It answers one central executive question:

What does the company own right now, what is it worth, where is it stuck, what is at risk, and what is the timeline and cost to actualize that revenue.

That is the whole job of the surface. Every element on the page must serve that question. If it does not, it does not belong here.

The five clauses of the central question are not interchangeable. Own and worth are the static read on the asset base. Stuck and at risk are the friction signals. Timeline and cost to actualize is the forward read: how many days until each batch converts to cash, and what production work and capital outlay stand between today and that conversion. The COO does not just want to know what the company owns; they want to know when it becomes money and what it costs to get there.

Section 2. The reader and the moment

The default reader is the COO. At Cult Cannabis scale this is Justin, who also serves as CEO. At larger scale the role splits into COO, CFO, and CEO; until then collapse all three into COO. Pipeline is the COO's default landing module on login.

The moment is the start of the day. The COO opens Pipeline before opening anything else. Within five seconds the COO must have read the answer to four questions: how much is in flight, how much is at rest in each stage, how much is on track to close this month, what is at risk. If the COO has to scroll, click, or filter to get those answers, the surface has failed.

The secondary readers are the CFO (when the role exists separately), the Cultivation Manager, and the Post-Production Manager. They use the same canvas with persona-defaulted filter and emphasis. Persona switching is one toggle in the header. There is no separate screen per persona.

Section 3. What the surface must answer

The COO opens Pipeline and the surface must answer, in order of priority:

Question one. What does the company own right now.
This is the rollup of all batches in flight, expressed as grams and dollars. Grams of sellable inventory, grams of work-in-progress, total grams in the system, gross projected revenue at current strain pricing, allocated revenue (committed to open orders), realized revenue (shipped and delivered).

Question two. Where is the capital stuck.
This is grams-at-rest by stage. Grams that have entered a stage and not advanced within the expected duration window. The brain's revenue_stability_levers row makes this concrete: 199 lbs of bulk-ready flower currently sitting unsold is the single largest leverage point at Cult Cannabis right now. Pipeline must make this kind of stuck capital impossible to miss. If a stage is holding more than its expected throughput, the stage announces itself.

Question three. What is on track to close this month.
This is the Pipeline-side input to the canonical projected revenue number defined in row 170679e8. Pipeline projected is what the asset base could realize if it converts at current pricing and current allocation rate. The gap between Pipeline projected and Orders projected (from canonical_revenue_definitions) is the sales-pipeline gap, and the surface should expose the gap, not just the inputs.

Question four. What is at risk.
This is the set of batches with high projected revenue and low confidence, batches with allocated revenue but no shipped grams past expected fulfillment, batches in inventory with no COA, orphan-tier batches with active state, and batches running long in stage past their expected cycle time.

Question five. What is the timeline and cost to actualize that revenue.
This is the forward read on the asset base. For every batch in flight, two numbers: estimated days-to-cash (the sum of remaining expected stage durations from the batch's current stage through closed) and estimated cost-to-actualize (the dollars of remaining production work standing between today and that conversion, expressed as gross cost outlay across remaining stages, not net margin). Rolled up across the portfolio, these become the answers to "when does the asset base convert to cash" and "how much do we have to spend to get there." For Cult Cannabis the cost-to-actualize today is dominated by hand-trim labor and packaging materials per the brain's row 0c221ef4; the surface displays this as gross cost only, never as net margin, because net is a separate project pending labor cost capture. The discipline rule for question five is the same as the discipline rule for gross projected revenue: display gross, label gross, never present an estimate as a realized number, never imply net.

Section 4. The data contract

Single source: v_batch_lifecycle. No other table or view. The Pipeline surface does not query batch_registry, inventory_items, plant_groups, or order_items directly. If the data is not in v_batch_lifecycle, it is not in Pipeline.

Coverage is 292 of 292 batches via the three-arm UNION (inv_arm, pg_arm, skeleton_arm), all returned as one shape with a confidence column that names the provenance.

Field clusters and what they answer

Identity cluster, on every row.
batch_id (uuid, internal only), batch_code, strain_name, room_code, stage, lifecycle_state, confidence.

Position cluster, the asset valuation. This is the heart of question one.
sellable_now_g, pipeline_raw_g, total_potential_g.
Gross projected revenue is computed as total_potential_g times strain wholesale price. The price source is open question 1 below. Net projected revenue is explicitly out of scope for v1; the brain's row 0c221ef4 says wait until labor cost is captured. Pipeline displays gross only and labels it gross.
Strain rollups: strain_avail_flower_g, strain_avail_smalls_g, strain_avail_packaged_g.

Conversion-yield discipline. From row 0c221ef4, Justin-confirmed:
Wet-to-sellable working assumption is 18 percent.
Wet-to-dry (binning) is approximately 22 percent for most strains; Animal Tsunami is an outlier at 17.6 percent.
Dry-to-sellable (bucking plus trim) is approximately 70 percent blended.
For batches still in cultivation or drying, total_potential_g is an estimate, not a realized value, and Pipeline must label it as such with a confidence indicator. Strain-specific outliers must be respected. The surface never displays an estimated number as if it were realized. Discipline rule: gross price per gram is not net revenue per gram, and we are explicitly displaying gross because net is a separate project.

Stage cluster, the flow of work-in-progress through the company.
stage (derived enum, six buckets: cultivation, drying, processing_pending, processing, inventory, closed).
For each stage, the grams currently held in that stage across the portfolio, derived by summing batch positions whose stage equals the bucket.
For each stage, the grams-at-rest, defined as grams in a stage where days_in_stage exceeds the expected duration for that stage. Expected stage durations live in a small lookup that Claude Code will provide; for v1 the working assumptions are: cultivation 60 to 90 days from clone to harvest depending on strain, drying 10 to 14 days, processing_pending 0 to 7 days, processing 14 to 30 days, inventory 0 to 14 days for packaged.

Time-to-cash cluster, the forward read on the asset base. This is the answer to question five.
days_to_cash_estimate per batch, computed as the sum of remaining expected stage durations from the batch's current stage through closed, minus days_in_stage on the current stage (because the batch is partway through it). For a batch already in inventory, days_to_cash_estimate is the expected inventory-to-shipped duration, which v1 hardcodes as 14 days for packaged inventory and 21 days for bulk-available inventory.
projected_close_date per batch, derived as today plus days_to_cash_estimate.
Rolled up across the portfolio: gross projected revenue closing within 30 days, 60 days, 90 days, and beyond 90 days. These four buckets are the executive answer to when the asset base becomes cash.

Cost-to-actualize cluster, the second half of the answer to question five.
Per batch, an estimated cost-to-actualize expressed in gross dollars, computed as the sum of remaining-stage cost factors. The cost factors per stage are working assumptions for v1, set per the brain's row 0c221ef4 channel economics:
Cultivation remaining: roughly 0.30 dollars per projected sellable gram remaining in stage (light, water, nutrient, labor proxy; v1 working assumption).
Drying remaining: roughly 0.05 dollars per projected sellable gram remaining (space and labor proxy).
Processing remaining (bucking plus trim): roughly 0.45 dollars per projected sellable gram for the packaged channel (hand-trim labor proxy), roughly 0.15 dollars per projected sellable gram for bulk channel (machine trim proxy).
Packaging remaining: roughly 0.20 dollars per projected sellable gram for packaged channel (materials and packaging labor), zero for bulk.
Inventory remaining: zero (no production work remaining; only sales effort, which is out of scope for cost-to-actualize in v1).
These factors are gross production cost proxies, not full net margin inputs. The surface labels them as gross cost-to-actualize and never represents them as net margin. The factors live in a small lookup that Claude Code maintains; v1 hardcodes them, v2 makes them strain-and-channel-specific. The COO knows these are working assumptions; the surface must communicate that honestly via a confidence indicator on the cost-to-actualize number, not by hiding the assumption.

Channel attribution. Cost-to-actualize depends on whether the batch is destined for the packaged channel (higher gross cost, higher gross revenue) or the bulk channel (lower gross cost, lower gross revenue). v_batch_lifecycle does not yet expose batch-level channel intent. v1 derives channel from current state heuristically (bulk_flower_g and bulk_smalls_g imply bulk; packaged_g implies packaged), and falls back to a strain-level default for batches in cultivation or drying. v2 adds a batch_registry.channel_intent column maintained by the COO. v1 hardcodes the heuristic.

Cycle-time cluster, drill-down only at the COO level.
days_in_stage on every batch, compared against the expected stage duration. Surfaced inline as a small signal (over, under, on track) on each row, expanded into the full cycle-time table on drill-in. The COO uses this when something looks wrong, not as a primary read; the Cultivation Manager and Post-Production Manager use it as a primary read in their persona variants.

Cultivation cluster, populated when stage is cultivation or drying.
flower_plants, veg_plants, next_harvest_date, days_in_stage.

Drying cluster, populated when stage is drying or later.
total_wet_weight_g, total_dry_weight_g, total_water_loss_g, batch_wet_to_dry_loss_pct, first_bin_date.

Post-harvest weight cluster, populated when stage is processing or later.
binned_g, bucked_g, bulk_flower_g, bulk_smalls_g, packaged_g, trim_g.

Yield cluster, drill-down for COO and Cultivation Manager.
bucking_flower_pct, trimming_big_bud_pct, wet_to_dry_pct.
Strain-level rollups of these are the input to the planting-decision question Cult Cannabis asks every harvest cycle: which strains pay back the square foot.

Commerce cluster, the answer to question three and the input to the gap.
allocated_orders, allocated_lines, allocated_units, allocated_revenue.
shipped_g, sold_value.
The realization side here will read low for v1 because of D16 (68 percent of completed revenue has NULL order_items.batch_id). The surface must render this honestly, not fabricate attribution. The realization panel should label the attribution gap so the COO does not misread it.

Waste and loss cluster, drill-down only.
waste_grams, total_loss_g, loss_confidence.

Timestamp cluster, drill-down only.
drying_started_at, bucking_started_at, trimming_started_at, packaging_started_at, completed_at, depleted_at.

Confidence cluster, the data-quality discriminator.
confidence column with six tiers: high, medium, low, none, cultivation_only, orphan.
The surface respects the tier. Orphan batches are hidden from the default view (D15: 23 active-state orphans surface here). The count of hidden orphan-tier batches renders as a small chip in the page header at all times: "23 batches hidden by confidence" with an open action that toggles them visible. Hiding without surfacing the count is dishonest by omission; the chip preserves the executive read while keeping the data debt visible.
Cultivation_only batches show only the clusters that have data; commerce panels collapse to a single empty-state line.
Low-confidence batches render their position numbers with a single-character confidence sigil after the number (recommend lowercase letter mapping: h, m, l, n, c, o for the six tiers; high tier renders no sigil since it is the default).

Section 5. The six things Pipeline must surface every time it loads

These are the non-negotiables. Pick the visual treatment, but every one of these must be present and readable within the first viewport.

One. Total assets in flight, expressed as four numbers: grams in flight, gross projected revenue, allocated revenue, realized revenue. This is the executive answer to question one. No chart; numbers in IBM Plex Mono.

Two. Grams at rest by stage. Six numbers, one per stage bucket, with the at-rest portion called out for any stage where it exceeds a threshold (recommend 25 percent of stage total but Claude Design owns the treatment). This is the executive answer to question two. The visual must make stuck stages louder than calm stages without being noisy when nothing is stuck.

Three. The pipeline-to-orders gap, rendered as a triplet. Three numbers, not one: Pipeline projected (gross), Orders projected (canonical definition from row 170679e8), gap. A bare subtracted number loses directionality. The triplet preserves it. Positive gap means asset base supports revenue not yet booked into the order book; this is sales headroom. Negative gap means orders are committed against assets that may not realize; this is a fulfillment or production risk. The COO reads the triplet and immediately knows whether the constraint is sales or production.

Four. The at-risk list, with category badges. A short list of batches flagged for attention, capped at 5 to 7 items so it does not become noise. Each entry names the batch, the reason, and a category badge that tells the COO what kind of problem they are looking at. Five categories, each routing to a different owning module on drill-in:
revenue-at-risk (high projected revenue with low confidence, low-confidence position numbers; routes to Inventory Command Center for data review)
fulfillment-at-risk (allocated but not shipped past expected fulfillment date; routes to Orders)
compliance-at-risk (in inventory with no COA, COA failed; routes to Inventory Command Center COA Desk)
operations-at-risk (running long in stage past expected duration, packaging throughput lag; routes to Production Hub or Cultivation Command Center as appropriate)
data-hygiene (orphan-tier with active state, denormalized strain label drift; routes to data review tooling)
The badge is one or two characters in Plex Mono with a stage-color accent dot, not a long word. The COO scans badges first, then reads which batches have which problems.

Five. The cash-conversion curve. Visualize, do not tabulate. Across four time buckets (30 days, 60 days, 90 days, beyond 90 days), two paired bars per bucket: gross projected revenue (the dollars coming in) and gross cost-to-actualize (the dollars going out to make those dollars come in). The shape of the curve across the four buckets is the answer to question five; precision is in the deep-dive, not on the canvas. The COO reads the shape: is revenue front-loaded or trailing, is cost front-loaded or trailing, is the implicit headroom (revenue minus cost per bucket) growing or shrinking. Total gross projected revenue across all four buckets renders as a single Plex Mono number above the chart. Total gross cost-to-actualize renders as a single Plex Mono number paired with it. This is the most demanding visual problem in the surface; it rewards careful design and earns the largest single block of canvas after the four-number rollup.

Six. The full batch list, below the fold. The list is the deep read, not the executive read; it does not occupy first-viewport real estate. The COO reads the rollup (elements one through five) in five seconds, then scrolls into the list when something prompts a drill-in. Two sort modes in the list header: by attention (default; sorts by category-weighted at-risk score so the most concerning batches surface first) and by value (sorts by total_potential_g descending). Each row shows identity, stage with confidence sigil, position numbers, a small time-to-cash indicator (days to projected close), and any active at-risk category badges. Tap any row to enter the single-batch deep-dive.

The realization gap rendering. Wherever realized revenue is shown (rollup, persona variants, deep-dive commerce panel), the unattributed remainder is rendered as its own visible bucket alongside attributed shipped, never silently omitted. D16 (68 percent of completed revenue has NULL order_items.batch_id) is real for v1. The realized column reads as: attributed shipped + unattributed remainder = total realized, with the unattributed portion explicitly labeled.

Section 5-A. The page header

The Cultivo shell provides the global nav (left rail or top bar; separate concern). The page-level Pipeline header is part of this design and is the most contested real estate on the surface. Five elements, single row at canonical width, in this priority order:

One. Persona switch. Default surfaces the active user's persona from user_profiles. Toggle exposes the four variants named in section 7. Visible chrome should communicate "this is what you're looking through," not feel like a settings menu.

Two. Date stamp and refresh signal. The COO needs to know the data is fresh. Today's date in Plex Mono plus a small relative-time chip ("updated 2 minutes ago") with a manual refresh action.

Three. Story-of-the-day banner ticker. Single-line, one item at a time, 8-second cycle, server-generated per persona block, dismissible per session. One row of vertical real estate, no more.

Four. Confidence chip cluster. The orphan-tier hidden count chip lives here ("23 hidden by confidence · open"). Plus a confidence-toggle for surfacing low-confidence batches if the COO wants to expand the set being displayed.

Five. Density toggle. Comfortable (default) and compact. The toggle re-balances the whole canvas, not just row height: in compact mode, the rollup tightens, the cash-conversion chart shrinks, and the full batch list expands to fill recovered vertical space.

The header is a single horizontal row at canonical width. At 1024 portrait it collapses: persona switch and density toggle stay primary, the banner moves to a second row, the date stamp and confidence chip cluster become a small dropdown action.

Section 6. The single-batch deep-dive

The drill-in surface is the asset card for one batch. It is not a separate route in the IA; it is an in-place expansion or overlay using the established Cultivo Framer Motion layoutId pattern from cultivation_command_center_spec.

The deep-dive must answer:

What is this batch right now. Identity, current stage, plant counts, room, days in stage, position numbers, gross projected revenue, confidence.

What did it come from. Cultivation history: harvest date, harvest session reference, wet weight, dry weight, water loss, dry yield ratio.

What has happened to it since. Stage timeline: each station from cultivation through closed, with timestamps, weights passed through, and inter-stage loss rendered as small inline deltas. This is the production history rendered as a single read.

What is its market position. Allocations: open orders against this batch with order codes and committed revenue. Realization: shipped grams, sold value, and the gap to gross projected. If realization is low because of attribution gaps (D16), label it.

What is its timeline and cost to actualize. Days-to-cash estimate (days from today until the batch is projected to close), projected close date, and gross cost-to-actualize broken down by remaining stage. The breakdown shows, per remaining stage, the number of days expected and the dollars of gross production cost expected. The COO reads this and understands "this batch is 47 days from cash, with 12k of remaining production cost split across 30 days of cultivation, 12 days of drying, and 5 days of trim and packaging." The deep-dive labels this honestly: gross cost only, working assumptions for the cost factors, channel attribution noted (packaged or bulk).

What is its quality and compliance state. COA badge with state (curing, pending sampling, testing in progress, results in, available, failed). Tap to view COA detail. If no COA, render an empty state with a single action that hands off to the relevant module.

What is its cycle-time profile. Drill-down panel showing days in each stage compared to expected duration. This is the COO's drill-down from question four when something looks wrong, and the Cultivation Manager's primary read in their persona variant.

The deep-dive does not edit. It is read-only. Edit affordances live in their owning modules: stage advancement in Production Hub, allocation in Orders, COA submission in Inventory Command Center. When the deep-dive surfaces a number that needs action (an unallocated batch in inventory, a packaged batch with no COA, a stuck stage), it offers a single explicit handoff link to the owning module with the batch pre-selected. No inline edits.

Section 7. The four persona variants

The same canvas, with filter-and-emphasis defaults set per persona. Persona switch is one toggle in the header. The data contract does not change.

COO and CFO collapsed (default).
Sort: total_potential_g descending.
Stage filter: all stages visible.
Emphasis: position cluster, commerce cluster, and time-to-cash cluster prominent. Cost-to-actualize visible as the second half of the time-to-cash rollup. Cycle-time and yield clusters demoted to drill-down.
Story-of-the-day banner surfaces: revenue-at-risk batches (low confidence with high projected revenue), contract allocation gaps (allocated revenue near zero on packaged batches), packaging throughput lag against the 25 lbs per week target from revenue_stability_levers, and any 30-day-window cash-conversion shortfall against rolling burn rate.

CFO accounting toggle (when CFO role exists separately).
Sort: completed_at descending, then projected close date ascending for in-flight.
Stage filter: defaults to packaged plus inventory plus closed.
Emphasis: realized revenue, projected close, and time-to-cash rollup. Cost-to-actualize is the most prominent secondary number for the CFO because it is the cash outlay required to bring the asset base to revenue. In-flight batches collapse to a single rollup line at the bottom.
Story-of-the-day banner surfaces: realization gap by attribution (D16 visibility), batches at risk of write-down, projected close vs prior period, and 30-day cash-conversion vs 30-day projected outlay.

Cultivation Manager.
Sort: next_harvest_date ascending.
Stage filter: defaults to cultivation plus drying.
Emphasis: cultivation cluster and cycle-time cluster. Plant counts and days-in-stage prominent. Position cluster demoted but visible. Strain yield rollups surfaced inline (which strains are paying back the square foot).
Story-of-the-day banner surfaces: ready-to-harvest batches in the next 7 days, batches running long in cultivation or drying past expected duration, IPM and environmental flags from sibling modules.

Post-Production Manager.
Sort: first_bin_date descending.
Stage filter: defaults to drying through packaged.
Emphasis: stage cluster, post-harvest weight cluster, yield cluster. Throughput against the 25 lbs per week packaging target prominent.
Story-of-the-day banner surfaces: sessions running below projected throughput, yield deltas vs projection at strain level, batches stuck in processing_pending past expected duration.

Section 8. The discipline rules Claude Design must respect

The surface trusts the post-reconciliation frozen state and never displays variance. Variance lives in Audits, not here.

Gross projected revenue is the only revenue projection displayed. Never present it as net. Net is a separate project pending labor cost capture per row 0c221ef4. Label gross explicitly so no reader misreads it as net.

Conversion factors are applied to estimate total_potential_g for batches in cultivation or drying. The 18 percent wet-to-sellable working assumption holds. Strain-specific outliers must be respected. Estimated numbers must be visually distinguishable from realized numbers. The COO must never misread an estimate as cash in the bank.

The realization panel never fabricates attribution. D16 is real and persistent for v1. Label the attribution gap honestly: shipped_g and sold_value reflect only directly-attributed orders. The remaining completed revenue without batch attribution is named as such, not silently omitted.

The orphan tier (D15: 23 active-state orphans with no inventory_items and no plant_groups) is hidden from the default view. A confidence toggle lets the COO opt in. They are real batches that need cleanup; they should not pollute the executive read.

The cultivation_only tier renders only the clusters that have data. Commerce panels collapse to a single empty-state line. Position cluster is visible because total_potential_g is meaningful from drying weights.

The surface does not duplicate operational modules. Cultivation Command Center owns rooms and tasks. Production Hub owns sessions. Inventory Command Center owns SKUs and packages. Pipeline rolls up; it does not replace.

The surface is read-only. Decisions made here lead the user back into the operational module that owns the action, never into an inline edit on the Pipeline page itself.

Section 9. The aesthetic constraints

This surface is operator canvas. Background hex 0A0A0A. IBM Plex Sans for UI text. IBM Plex Mono for all numbers (weights, dollars, dates). IBM Plex Mono Italic for estimated numbers (any number derived from the conversion-yield discipline applied to non-realized weight, any number derived from the cost-to-actualize working assumptions, any forward-looking time-to-cash projection). Roman Plex Mono is reserved for realized values. The italic-vs-roman split is the primary typographic signal that distinguishes "estimated" from "cash in the bank." It is load-bearing; do not dilute it with secondary indicators that compete. IBM Plex Serif is forbidden on this surface; serif is reserved for public canvas.

Canonical artboard width is 1366 landscape (the partnership-demo midpoint). Tablet portrait at 1024 is the binding constraint and gets explicit collapse rules: the cash-conversion visualization demotes from full paired-bar chart to a horizontal strip; the at-risk list collapses to single-line entries with badge-and-batch-code only; the full batch list demotes to a virtualized scroll region with reduced column density. Desktop widths beyond 1440 expand row density and add a second column to the rollup, but never add new elements; if it does not earn its place at 1366, it does not earn its place at 1920.

No liquid glass, no gradient mesh, no atmospheric effects. The earlier liquid-glass design system from row e7d82014 is superseded by cultivo_architecture_strategy as of 2026-04-25. Do not import the older glass tile classes from CommandCenter.tsx into this surface.

Stage colors render as functional 6 pixel dots only. Never as fills, borders, or chart lines. The single warm-white accent is the only chrome accent.

Density modes. Comfortable mode is default. Compact mode collapses row height by approximately one-third and shrinks the Plex Mono number cells. Toggle lives in the header next to persona switch.

Token contract. Every color, type, and spacing value pulls from brand-tokens.css at CultivoDS/ui_kits/cult-ops-brand. If a needed token does not exist, name the gap in the handoff back to Claude Code.

Interaction patterns. The expandable bento card pattern from cultivation_command_center_spec (Framer Motion layoutId, AnimatePresence mode wait) is the established Cultivo motion contract. Pipeline adopts it for row expansion and deep-dive transitions so motion stays consistent across modules.

Tap targets meet minimum 44 pixels on the y-axis because partnership demos run on tablet.

Section 10. What Pipeline is not

Pipeline is not Inventory Command Center. Inventory is the pantry: what is on the shelf right now, organized by strain and SKU. Pipeline is the ledger of the assets that flow through the pantry, organized by batch as financial unit. Different question, different surface.

Pipeline is not Cultivation Command Center. Cultivation Command Center is the room-level operations console where Andrew lives. It owns tasks, environmental, and harvest workflow. Pipeline rolls up cultivation state; it does not replace the operations console.

Pipeline is not Production Hub. Production Hub is the post-harvest sessions console where Laura lives. It owns crew throughput and session execution. Pipeline rolls up production state; it does not replace the execution console.

Pipeline is not Audits. Audits owns variance, reconciliation, and discrepancy triage. Pipeline trusts the frozen state.

Pipeline is not Reports. Reports is the historical analytics surface. Pipeline is the live operational P&L.

Pipeline is not a transactional surface. Read-only.

Section 11. Out of scope for v1

Net revenue projection. Pending labor cost capture. Out of scope per row 0c221ef4 discipline.

Multi-tenancy. Phase 3 concern per cultivo_architecture_strategy. Single-tenant Cult Cannabis only for v1.

Mobile-first. Tablet and desktop only for v1. Phone view is phase 2.

Inline edits. Read-only surface. All edits route to owning modules.

Permission model and RLS implementation. Claude Code owns. Persona filtering on the client uses user_profiles.data_domains; the data contract returns the same view to every authorized reader.

Cross-tenant comparison. Out of scope until phase 3.

Section 12. Open questions for resolution before mocking begins

One. Strain wholesale price source. Gross projected revenue is total_potential_g times strain wholesale price. Today no canonical strain wholesale price exists in v_batch_lifecycle or in any other view. Three options:
Option A. Add strain.wholesale_price column to strains table, manually maintained by COO. Fastest. Requires admin surface to maintain.
Option B. Derive strain wholesale price from rolling 90-day shipped_g and sold_value rolled up per strain. Self-maintaining. Cold-start problem for new strains.
Option C. Hybrid. Manual override on strain row, fallback to derived 90-day rolling. Recommend Option C.
Decision needed before mocking; affects both the data contract and the admin surface.

Two. Expected stage duration source. The grams-at-rest calculation and the days-to-cash estimate both depend on a lookup of expected duration per stage. For v1, hardcode the working assumptions named in section 4. For v2, expected stage duration becomes strain-specific and lives in a strains.expected_durations jsonb column. Confirm v1 hardcoded approach before mocking.

Two-A. Cost-to-actualize factor source. The cost-to-actualize calculation depends on per-stage gross cost factors named in section 4. For v1, hardcode the working assumptions (cultivation 0.30, drying 0.05, processing 0.45 packaged or 0.15 bulk, packaging 0.20 packaged or 0 bulk, all in dollars per projected sellable gram). For v2, factors become strain-and-channel-specific and live in a small lookup table maintained by the COO. The v1 surface labels these as working assumptions and renders a confidence indicator on the cost-to-actualize number. Confirm v1 hardcoded approach before mocking.

Two-B. Channel intent source. Cost-to-actualize is channel-dependent. v1 derives channel from current state heuristically (bulk_flower_g and bulk_smalls_g imply bulk; packaged_g implies packaged; pre-harvest batches default to a strain-level channel hint). v2 adds a batch_registry.channel_intent column maintained by the COO at planting decision time. Confirm v1 heuristic approach before mocking.

Three. Story-of-the-day banner generation. Resolved. Banner is a single-line ticker, one item visible at a time, persona-aware, generated server-side via the existing cultops-ai-chat persona block. The ticker cycles through persona-relevant items every 8 seconds with a soft fade transition. No carousel chrome, no stacked cards, no multi-line variants. The banner occupies one row of header real estate, dismissible per session. This forces the rest of the canvas to assume one row of banner real estate, no more.

Four. The gap rendering. Resolved. The gap renders as a triplet on the summary strip: Pipeline projected, Orders projected, gap. Three numbers, not one. Visual treatment (typography weighting, separator chrome, color of the gap number when negative) is at design discretion.

Five. COA empty state action. The deep-dive shows COA state. If a packaged batch has no COA, the empty state names a single action: request COA. Confirm the action handoff target. Inventory Command Center COA Desk is the operational owner per cultops_inventory_philosophy; recommend the action routes there with the batch pre-selected.

Section 12-A. Working assumptions confirmed in v4 review

These are working assumptions for v1, captured here so they do not get lost between this spec and the first artboard. All are revisable based on what the canvas teaches us once mocked.

Italic load-bearing test. Mock two treatments side-by-side at canonical 1366 COO default in comfortable mode: treatment A is italic Plex Mono on every estimated number including rollup totals (the canvas declares itself as a forward read), treatment B is italic on line items with roman rollup totals plus a small estimate-share indicator near the rollup. The discipline rule is the distinction between estimated and realized; the mechanism is the proposed italic split. If treatment B preserves the distinction without the lean, treatment B wins. Run this as a paired artboard, not as a debate.

At-risk category weighting for v1. Priority order with working weights:
Fulfillment-at-risk weighted by allocated_revenue dollar exposure (highest priority).
Revenue-at-risk weighted by total_potential_g times wholesale price, gated to confidence medium or lower.
Compliance-at-risk weighted by stage proximity to ship; packaged-with-no-COA outranks curing-with-no-COA.
Operations-at-risk weighted by days-over-expected as a percentage of expected duration.
Data-hygiene weighted lowest, capped at one slot in the list so orphan-tier never crowds out real revenue or fulfillment problems.
This is a v1 working assumption. Real weighting comes from watching the COO use the list for two weeks and adjusting. Capture it in the implementation as a small weighting lookup, not as hardcoded constants buried in a query.

Banner first-paint pause. Twelve seconds before the ticker starts cycling. The COO opens Pipeline for the morning read; the first scan must not be interrupted by motion. Twelve seconds clears the five-second test plus a beat for the first-pass at-risk scan, then the ticker activates and cycles every eight seconds thereafter.

Compact-mode chart floor. Paired bars below 180 pixels tall become unreadable. At that threshold the cash-conversion element demotes to a horizontal sparkline strip: same four bucket markers, revenue line above, cost line below, no axis labels. The strip preserves the shape of the conversion curve (the executive read) at the cost of precision (which lives in the deep-dive anyway). Mock both the comfortable paired-bar version and the compact sparkline version.

Override/derived badge placement. Deep-dive only. The badge appears on the deep-dive's gross-projected-revenue line where the price source is meaningful for understanding the number. It does not appear on the full list or the rollup; those assume the price is whatever it is and the user trusts it. The eventual strain admin surface is the second place those badges live; that surface is a separate spec.

Realization remainder typography. Roman Plex Mono for both attributed shipped and unattributed remainder (both are realized values). Distinguish via a small "u" sigil after unattributed remainder, or a parenthetical "unattrib" inline label. Same pattern as the confidence sigils. Mock both treatments at canonical viewport so the typographic noise floor stays manageable.

Header collapse at 1024 portrait. Rollup wins. If the two-row header pushes the four-number rollup below the fold, header collapses harder: date stamp and confidence cluster fold into a single icon-button that opens a dropdown, banner stays on row two but renders smaller type. The four-number rollup plus the at-risk list summary plus the cash-conversion strip-mode chart must all fit above the fold on 1024 portrait. That constraint dominates everything else in the collapse.

Visual hierarchy starting frame for the canonical 1366 artboard. Largest type on rollup totals, second-largest on cash-conversion chart summary numbers, third on at-risk batch codes, smallest on stage-bucket numbers (their visual treatment carries them). This is a starting frame; refine on the canvas.

Section 12-B. Required reading: the data fixture

Before drawing the first artboard, read /Users/justinmorrow/Desktop/Claude/cultivo-batch-overview-fixture.json. Fifteen real batches pulled from production v_batch_lifecycle on 2026-04-26, hand-picked across the variant space: every stage, every confidence tier, packaged and bulk channel mix, allocated and unallocated, three explicitly-stuck batches for the at-risk list, the orphan-tier edge case, the closed-and-depleted lifecycle terminus. Each row carries a `_persona_note` field naming what the row is meant to teach.

Use the fixture for three things. First, type-size against real magnitudes: sellable_now_g is four to five digits per row, allocated_revenue is four to five digits per row, sold_value is four to five digits per row, the rollup totals are six figures. Second, texture the canvas with real strings: real batch codes (260126-GAS, 251212-SWF, 260218-CHP), real strain names (Capulator Junky, Cherry Paloma, Stay Puft, Hawaiian Snowcone), real room codes (FLW-06, FLW-08, VEG-02). Plex Mono sitting next to Plex Sans only finds its rhythm against real strings. Third, sense the distribution: 87 of 292 batches are cultivation, 67 inventory, 102 closed (52 of those orphan-tier and hidden by default). The fixture also includes the strain wholesale price table (derived from 90-day rolling sold_value over shipped_g per Option C), the conversion factor working assumptions, the stage duration assumptions, and the cost-to-actualize factor table — all in one place so mocks can render the rollup numbers honestly.

If a fixture row tempts you to invent a number not present, surface that gap as a question instead. The fixture is small on purpose; if it doesn't give you what you need to answer something, that's the spec's problem to solve, not yours to guess at.

Section 13. The handoff back to engineering

When you ship mocks plus a token gap list, Claude Code will:
Confirm v_batch_lifecycle column shape against the contract; flag any mock that depends on a field not in the view.
Resolve open question 1 (strain wholesale price source) with a migration if Option A or C is chosen.
Resolve open questions 2-A and 2-B (cost factor and channel intent sources) with the v1 hardcoded lookups and a v2 migration path.
Add any missing brand tokens to brand-tokens.css.
Implement the surface with persona filtering wired to user_profiles plus user_context_preferences.
Wire the story-of-the-day banner to the cultops-ai-chat persona block per open question 3.
Write implementation lessons back to lessons_learned.

End of spec.
