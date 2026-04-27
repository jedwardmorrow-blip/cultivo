You are Claude Design, opening a Step 2 canvas session for the Cultivo Distribution surface redesign. This is a Lane 1 session per cultivo_design_process_v1 (lane doctrine). Your output is two clickable HTML artboards with a token delta and a five-line decision note. No code, no React, no implementation — visual contract only.

READ IN THIS ORDER BEFORE DRAWING ANYTHING

1. Brief (start here, one page): /Users/justinmorrow/Desktop/Claude/cultivo-brief-distribution.md
2. Reviewed feature spec (data and behavior contract, source of truth): query Supabase project uayyhluztelnfxfvdhyt, table cultops_feature_spec, row id 06f02652-7f7d-4fa9-8e5e-fb68f6545253. Read data_contract, state_shape, interactions, edge_cases, current_implementation_notes, status_notes (the status_notes contains the locked decisions and the edge-case tags).
3. Operator context (31KB, 27 brain rows synthesized about Laura Gonzalez, who owns this surface at Cult Cannabis): /Users/justinmorrow/Desktop/Claude/laura-distribution-context.md
4. Historical Step 1 Philosophy (Cult Ops, 2026-04-07): query Supabase project uayyhluztelnfxfvdhyt, business_context table, key cultops_distribution_philosophy. This is the philosophy the EXISTING cult-ops Distribution Command Center was built against. Carries forward: Calendar + Map Control Surface metaphor, calendar + map always-visible bento adjacency, doc dispatch absorbed into order cards, KPI tap filters, driver assignment as feature, progressive disclosure with readiness chips not tables, 5 zones with geolocation infrastructure. Superseded: liquid glass and stage-colored glass visual treatment (the new DS bans both), stage-color pin reuse (replaced by --zone-* tokens we are designing in this session), bento card-swap pattern (not in new DS bento policy section 10). Read to understand WHY the existing surface looks the way it does, then defer to the brief and the new DS for what changes.
5. Supersession note (2026-04-26): query business_context, key cultops_distribution_philosophy_v2_supersedes. Resolves any apparent conflict between the 2026-04-07 row and what we are shipping now.
6. Design system bible: /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/CLAUDE.md
7. Typed token contract: /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/ui_kits/cult-ops-brand/brand-tokens.css
8. System Reference, full file: /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/ui_kits/cult-ops-brand/Cultivo · System Reference.html — pay particular attention to section 04 (atoms), section 05 (molecules including KPI strip and Room Roll Strip), section 09 (violation lint), section 10 (bento grid policy and construction rules).
9. Existing cult-ops Distribution code copied for visual reference (do not port styles, just understand the surface): /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-app-ref-2026-04-26/reference/DistributionCommandCenter.tsx, DistributionKpiStrip.tsx, distribution-constants.ts

THE QUESTION YOU ARE ANSWERING

Given Laura's morning, can the new bento layout under the new design system show her what's shipping today, what's overdue on documents, what's coming out of cultivation/dry into her queue this week, and what zones need driver coverage, all without scrolling, all earning their proximity per the section 10 bento policy, all without a single forbidden token. Two states: a calm Tuesday and a Friday-afternoon crisis.

WHAT TO DELIVER

Two artboards minimum at 1366 landscape, both as standalone HTML files in /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/mockups/distribution/:

Artboard A — distribution-default-v1.html
The Tuesday morning state. Today is mid-week, three orders shipping, one zone covered with a driver assigned, two zones still showing empty driver dropdowns in RouteSummaryPanel, no overdue document chip in header, three cohorts in Upstream Readiness showing days-to-ready for this week's Post-Production landings. DayDetailStrip below renders three OrderReadinessCard tiles for today, one expanded inline showing FulfillmentLineItem rows and document pills.

Artboard B — distribution-crisis-v1.html
Friday afternoon. Header shows persistent overdue chip with count of three. Two cohorts in Upstream Readiness about to land tomorrow with one stuck-stage callout. DayDetailStrip filtered to overdue-docs-only via header chip click. One DayCell on the calendar in dragover state (an unscheduled order from the focusedCard='unscheduled' panel is being dropped). RouteSummaryPanel shows three zones present today, one driver assigned, two zone rows still empty.

Optional Artboard C — distribution-portrait-1024.html
1024 portrait collapse rules if the desktop landscape reads cleanly first. Skip if landscape is contested.

Token delta — distribution-token-delta-v1.css
Add to /Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/mockups/distribution/. Propose new --zone-* token additions to brand-tokens.css per brief decision Q5 Option A. Palette must be (a) muted enough to be working-instrument, (b) distinguishable at 6px dot size, (c) borrowed from neither --stage-* nor --status-*, (d) accessible against --op-canvas. Suggested zones based on cult-ops constants: --zone-local, --zone-east-valley, --zone-west-valley, --zone-north-valley, --zone-other. If the cult-ops constants suggest different zones, follow those. Do not modify brand-tokens.css itself; this is a delta proposal for Justin to merge.

Decision note — distribution-decision-note-v1.md
Five lines, no more:
1. Atoms new (e.g. ZoneDot, OverdueChip, UpstreamReadinessCell)
2. Atoms reused from System Reference (e.g. KpiTile, StageDot, OrderReadinessCard, FulfillmentLineItem progress bar)
3. Tokens touched (which existing brand tokens you used, plus the --zone-* additions)
4. Question answered (one sentence: which load-bearing decision did this artboard resolve)
5. Question open (one sentence: what is genuinely contested or uncertain that you want Justin's call on before implementation)

LOAD-BEARING DESIGN DECISIONS YOU OWN IN THIS SESSION

1. Header overdue chip placement and visual contract. Where it sits relative to KpiStrip. How it surfaces a count without competing with KPI tiles. What the dot/pill grammar is. Whether it gets a 6px dot or a different visual signal.
2. Upstream Readiness cell composition. What the row hierarchy is (room/stage/days-to-ready). How stuck-stage callouts surface within the cell. How three cohorts read at once without becoming a sub-table.
3. RouteSummaryPanel per-zone row hierarchy. One driver dropdown per zone row (single driver per zone is locked). What the empty state of an unassigned zone looks like. How the panel reads when three zones are present vs one.
4. Dragover highlight in the new DS. The current cult-ops uses emerald-500/10 with 1.03 scale, which is forbidden. Propose a replacement that respects "no fills, no decoration" — likely an --op-line-strong border accent and a subtle --accent ink shift, no scale transform.
5. Zone token palette selection. The five colors. Show them in context as 6px dots in DayCell footer and RouteSummaryPanel zone rows. Confirm they read at glance.
6. KpiTile pulse retention. Today's surface pulses on overdue. With the header chip absorbing the overdue signal, decide whether KPI tile pulse stays for "Shipping Today > 0" or removes entirely. Show your call.
7. DayDetailStrip filter mode visual contract. When docFilterActive flips on (header chip click), how does the strip indicate it's filtered, not showing today. A label, a subtle bg shift on the strip background only (cell-level fills still banned), or a chip-near-the-strip-header.

CONSTRAINTS THE NEW DS ENFORCES (failing any of these is a redrive)

- No `font-family` outside the three Plex stacks (Sans, Mono; no Serif in product)
- No `color` outside token custom properties
- No `border-radius` above `--r-lg` (12px)
- No `background` fills using stage colors or zone colors (zones, like stages, are 6px dots only)
- No sentences ending with periods in operator UI
- No `box-shadow` for elevation — 1px hairlines only
- No backdrop-blur, no glass-morphism, no rounded-card-floating look
- Bento gaps are 1px filled with `--op-line`, never padding gaps, never gap-as-separator
- Cell padding 18-24px horizontal, 14-20px vertical
- Column-span only, max span 2; one nesting level (KPI strip inside body panel allowed; bento inside bento tile not)
- All numeric data uses `.tnum` for tabular numerals
- Operator surface only — `.product` polarity guard wraps everything

WHAT IS OUT OF SCOPE FOR THIS SESSION

- Partial-return flow (queued separately)
- Multi-facility scoping
- Two-tab InventoryDrawer concurrency
- Browser timezone vs facility timezone
- Document dispatch role permissions UI
- Dry/cure process built into the surface (v2 follow-up)
- Implementation, React, TypeScript — Step 4 work, not yours

REPORT BACK

When you finish, end your response with this exact structure:

ARTBOARDS:
- distribution-default-v1.html (path)
- distribution-crisis-v1.html (path)
- [distribution-portrait-1024.html if shipped]

TOKEN DELTA:
- distribution-token-delta-v1.css (path)

DECISION NOTE:
- distribution-decision-note-v1.md (path)

NEW ATOMS REQUESTED FOR SYSTEM REFERENCE:
- (list any new atoms you minted that should be promoted to the System Reference HTML)

OPEN FOR JUSTIN'S CALL:
- (one or two crisp questions you want resolved before Step 4 implementation)

If at any point the brief, the spec, or the System Reference contradict each other, flag the contradiction in your response and stop. Do not invent a resolution.
