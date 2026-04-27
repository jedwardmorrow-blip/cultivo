Cultivo Brief: Distribution Surface (v1 redesign)

One-page session-opening brief per cultivo_design_process_v1. Read this first, then the companions named at the bottom in order.

Surface
Distribution Command Center, ported from cult-ops `/distribution-command-center` to Cultivo as the canonical Distribution surface.

Persona
Distribution Coordinator (canonical). At Cult Cannabis today the seat is held by Laura Gonzalez, who also wears Post-Production Manager — those Post-Production-internal operations stay in the Post-Production surface. Distribution pulls visibility and gating from upstream (cultivation, dry, cure) and pushes instructions downstream into Post-Production. Persona contract row `cultivo_persona_distribution_coordinator`. Operator profile and discovery-sprint findings in `laura-distribution-context.md`.

The question this surface answers
Given everything in flight upstream, scheduled for delivery, awaiting documents, and out for return, what does Laura need to do today to keep the day from going sideways, and what is at risk for the next 7 days that she should be acting on now.

Data contract reference
`cultops_feature_spec` row id `06f02652-7f7d-4fa9-8e5e-fb68f6545253` (status reviewed, source SHA `5dc4940`). Reads, writes, RPCs, state shape, interactions, edge cases, code smells, and port-faithfully vs fix-during-port tags all live there. Do not re-state the contract in mockups; reference the spec id.

Success criterion (one sentence)
Laura opens the surface in the morning and within 15 seconds knows (a) what is shipping today and whether it is ready, (b) what document sends are overdue, (c) what is coming out of cultivation/dry into her Post-Production queue this week, with no scrolling, no hunting, and no second screen.

What is being preserved (port-faithfully)
The bento grid is the redesign reverence. Five-column primary/secondary structure with DayDetailStrip below works because Laura uses calendar-and-map proximity to schedule, calendar-and-unscheduled-list proximity to drag-place, and calendar-and-route-summary proximity to assign drivers. All four proximities serve named decisions per System Reference section 10. Drag-and-drop with smart-suggestion glow stays. Real-time postgres_changes on orders stays. Document pills with sent/pending/overdue stays (with new header chip in addition). Per-zone driver dropdown in RouteSummaryPanel stays. Inline FulfillmentLineItem expansion in OrderReadinessCard stays. Tabular numerals stay.

What is changing (fix-during-port)
Glass-morphism token (GLASS, backdrop-blur, bg-white/[N], rounded-2xl shadow stack) replaced with `--op-surface`, `--op-surface-2`, `--op-line` hairlines per new DS. Stage colors removed from zone borders (banned as borders/fills in new DS). New `--zone-*` token palette minted in brand-tokens.css and used as 6px functional dot markers consistent with stage-dot grammar. Emerald-500/10 dragover highlight reframed using `--op-line-strong` plus `--accent`. Pulse animations reviewed against new motion spec; KpiTile pulse stays only if subtle, removed otherwise. InProductionPanel pulse-glow border removed (encode as text or pill instead). Rounded floating cards replaced with 1px hairline cells per bento policy. Drag-orphan useEffect cleanup added. Tied unscheduled total_amount sort gets secondary sort by order id.

What is being added (new functionality)
Three additions to the canvas:

1. Persistent overdue document chip in the page header, separate from the KpiStrip. Survives across calendar days and selections, clears only when every overdue doc is sent. Click filters DayDetailStrip to overdue orders only. Optional daily 8 AM toast/banner if anything carries over from yesterday. Every send remains human-triggered with email_send_log audit. Decision rationale: Q4 Option A, the dashboard is the instrument, not the operator.

2. Upstream Readiness bento cell in the secondary panel. Renders room/stage/days-to-ready for the cultivation cohort feeding the next 7 days of dispatch. Source: `v_batch_lifecycle` view (already canonical per `cultivo_pipeline_batch_asset_spec`). Solves the Andrew-to-Laura severity-5 handoff gap from discovery: "we do not communicate at all. If Sam does not tell me, I find out when it is in front of me." Read-only in v1.

3. Per-zone driver row in RouteSummaryPanel. Single driver per zone, not per day. The current single-driver-per-date model is replaced because zone is a first-class operator decision and the smart-suggestion algorithm already scores by zone proximity (+3). The panel renders one row per zone present on the selected day, each with its own driver dropdown. Drives a zone-filtered DayDetailStrip when a zone driver row is selected.

Layout proposal (load-bearing for the brief)
Header (above bento): page title left, persistent overdue chip + KpiStrip pinned right.
Primary panel `lg:col-span-3` (min-w-500px): DeliveryCalendarGrid by default; swaps to UnscheduledPanel-expanded or DistributionMap-expanded on focusedCard change. AnimatePresence on swap.
Secondary panel `lg:col-span-2`: stacked, top to bottom — DeliveryCalendarMini, RouteSummaryPanel (now per-zone driver rows), Upstream Readiness (NEW), InProductionPanel.
DayDetailStrip below both, full viewport width. Renders OrderReadinessCard list for selectedDate or for the docFilterActive set or for the zone-filtered set.

Bento earns it (per System Reference section 10)
- Calendar adjacent to map: "where am I going on this day"
- Calendar adjacent to unscheduled: "when does this orphan order go"
- Calendar adjacent to RouteSummaryPanel: "is each zone covered today"
- Calendar adjacent to Upstream Readiness: "what's about to land in my Post-Production queue"
- DayDetailStrip below: "what is the readiness of each order today" (progressive disclosure)
- Header overdue chip + KPI strip: "what needs my attention right now"

Zone token palette (proposal for brand-tokens.css addition)
`--zone-local`, `--zone-east-valley`, `--zone-west-valley`, `--zone-north-valley`, `--zone-other`. Palette to be selected by Claude Design from a working-instrument-aligned set (muted, distinguishable at 6px, none borrowed from `--stage-*` or `--status-*`). Placement: 6px dot markers only — never fills, borders, backgrounds, or chart lines.

Constraints
- Operator surface only. `.product` polarity guard. No serif anywhere.
- Plex Sans for everything except numbers/codes/timestamps (Plex Mono).
- No `box-shadow` for elevation. 1px hairlines only.
- No sentences ending in periods in operator UI (move to chat or delete).
- Bento gaps are 1px filled with `--op-line`, never padding gaps, never gap-as-separator. Cell padding 18-24px h, 14-20px v.
- Column-span only, max span 2. One nesting level. KPI strip inside body panel allowed; bento inside bento tile not.
- All numeric data uses `.tnum` for tabular numerals.
- Real-data fixture required at Step 2 (see companions).

Surface treatment map (per Phase 1 guide, DS v7)
The new DS doctrine specifies three treatments and tells you which region uses which. For Distribution, all three appear:

- Header KpiStrip (5 KPI cells): A · Hairline. Comparison across cells is the job.
- Header overdue chip: atom-level, no A/B/C classification. Stand-alone chip pattern.
- DeliveryCalendarGrid (primary, 30+ day cells): A · Hairline. Matches the Production Planner precedent for dense scheduling data. Drag-target affordance handled with hover row highlight + 2px left accent rule, not card identity.
- DeliveryCalendarMini (secondary): A · Hairline.
- DistributionMap (primary or expanded): media surface inside a B · Gapped container.
- UnscheduledPanel expanded (primary swap): B · Gapped. Draggable cards need card identity.
- UnscheduledPanel compact (sidebar, top-3): B · Gapped.
- RouteSummaryPanel (per-zone driver rows): C · Hybrid. Outer panel gapped; per-zone rows hairline.
- Upstream Readiness cell (NEW): C · Hybrid. Outer panel gapped; cohort rows (room/stage/days-to-ready) hairline.
- InProductionPanel: C · Hybrid.
- DayDetailStrip (horizontal OrderReadinessCard list): B · Gapped. Cards expand individually.
- OrderReadinessCard expanded: card flips from B to C when expanded. Outer card gapped; FulfillmentLineItem rows + document pills inside use hairline.
- InventoryDrawer modal: C · Hybrid (modals are explicitly C per the doctrine).

The marquee call: the calendar is HAIRLINE, not bento-of-cards. This kills the v5-era assumption of "hairline everywhere" and prevents the alternate failure mode of "gapped cards everywhere" which would destroy scan speed on the calendar and the KpiStrip. Hover affordance, drag-target highlight, and selection state on hairline cells use a 2px left accent (`--op-line-strong` then `--accent` on engaged), not background fills or scale transforms.

DS v7 doctrine source
- Brain row `cultivo_surface_treatments_v1` — canonical doctrine row, distilled from v7
- `_inbound/cultivo-ds-7-2026-04-26/CLAUDE.md` "Three surface treatments" section
- `_inbound/cultivo-ds-7-2026-04-26/phase-0-rebrand/PHASE-1-SURFACE-GUIDE.md` — full per-surface migration guide

Out of scope (queue separately)
- Partial-return flow (decision 2; data-integrity bug, addressed as backend-first work item)
- Multi-facility staff_id scoping (defer to mockup)
- Concurrent driver assignment race (backend-side fix, separate ticket)
- Two-tab InventoryDrawer real-time (separate ticket)
- Browser timezone vs facility timezone (separate ticket)
- Dry/cure process built INTO the surface as workflow (v2 follow-up per decision 3; v1 surfaces signal only)
- Document dispatch role permissions (defer to mockup; assumed backend-enforced for v1)

Lane assignment (per cultivo_design_process_v1 lane doctrine)
Lane 1, Claude Design canvas. Justified: the brief is dense with visual-composition questions — header chip placement against KpiStrip, Upstream Readiness cell visual contract, zone token palette selection, bento cell hierarchy when DayDetailStrip is filtered, drag-target highlight reframing without emerald-500/10. None of these are answerable by USING the surface; they are answerable by LOOKING at it. Step 4 implementation by Claude Code per Lane 3.

Step 2 deliverables expected from Claude Design
1. Two artboards minimum at 1366 landscape: (a) default state, today's calendar with one zone covered, two zones uncovered, no overdue docs, three orders in Upstream Readiness; (b) crisis state, three overdue docs in header chip, dragover state on a calendar cell, Upstream Readiness showing two cohorts about to land tomorrow.
2. Token deltas: proposed `--zone-*` palette as additions to brand-tokens.css.
3. Five-line decision note: atoms new, atoms reused, tokens touched, question answered, question open. Append to `cultivo_surface_scorecards`.
4. Optional: 1024 portrait collapse rules if the artboard reads cleanly at desktop.

Companions (read in this order)
1. `cultops_feature_spec` row id `06f02652-7f7d-4fa9-8e5e-fb68f6545253` — the data and behavior contract. Source of truth for everything below the brief.
2. `/Users/justinmorrow/Desktop/Claude/laura-distribution-context.md` — 31KB synthesis of 27 brain rows on Laura, her workflows, her feature requests, and the discovery-sprint findings. Read for the operator profile and the cross-functional handoffs.
3. Brain row `cultops_distribution_philosophy` (2026-04-07) — the historical Cult Ops Step 1 Philosophy that drove the existing Distribution Command Center. Still valid: Calendar + Map Control Surface metaphor, calendar + map always-visible bento adjacency, doc dispatch absorbed into order cards, KPI tap filters, driver assignment as feature, progressive disclosure with readiness chips not tables, 5 zones with geolocation infrastructure. Superseded: liquid glass and stage-colored glass visual treatment (banned by new DS), stage-color pin reuse (replaced by `--zone-*` tokens), bento card-swap pattern (not in new DS bento policy section 10). Read to understand WHY the existing surface looks the way it does, then defer to this brief and the new DS for what changes.
4. Brain row `cultops_distribution_philosophy_v2_supersedes` (2026-04-26) — the formal supersession note linking the historical philosophy forward to this brief and the reviewed spec. Resolves any conflict between the 2026-04-07 row and what we are shipping now.
5. `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/CLAUDE.md` and `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/ui_kits/cult-ops-brand/brand-tokens.css` — DS philosophy and the typed token contract.
6. `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-ds-2026-04-26/ui_kits/cult-ops-brand/Cultivo · System Reference.html` section 10 (bento policy) and section 09 (violation lint).
7. `/Users/justinmorrow/Desktop/Claude/_inbound/cultivo-app-ref-2026-04-26/reference/DistributionCommandCenter.tsx`, `DistributionKpiStrip.tsx`, `distribution-constants.ts` — current cult-ops Distribution code copied for design reference.

V2 follow-up (post-redesign roadmap stub)
Build the dry/cure process directly into the Distribution surface as a workflow. Today the cohort lifecycle ends at "ready for Post-Production"; v2 brings dry-down tracking, cure-aging timers, moisture/temp telemetry, and the Post-Production receive flow into the same surface. Persona expansion: Cultivation Manager and Post-Production Manager become collaborators on the same surface alongside Distribution Coordinator. Scope to be drafted as a separate brief once v1 ships and Laura's daily use validates the v1 layout.
