Laura Distribution Context (Cultivo redesign brief input)

Compiled 2026-04-26 from Praxis World Model DB (Supabase project uayyhluztelnfxfvdhyt). All workflow contracts, feature requests, persona blocks, and legacy spec rows below are quoted verbatim from business_context. Synthesis paragraphs are clearly labeled.

**Section 1. Who Laura Is** (synthesis)

Laura Gonzalez is Head of Post Production and Distribution at Cult Cannabis (Slack U095WF5GX7Y, laura@cultcannabis.co), reporting to Justin Morrow and Scott Tucker. She owns the entire post-harvest flow from cure through customer delivery: cure/burp tracking, bucking, trimming, QC, testing/COA coordination, packaging, labeling, and as of 2026-04-07 the full Distribution logistics handoff (route planning, document dispatch, driver assignment, delivery execution). Her team is Roxy, Skye (deputy, ready to step up), Viana Dona, plus 2026 hires Ashley and Jasmine, with one final hire still pending. Justin's March 2026 performance assessment rates her a high-performing standout early-stage leader whose defining traits are hustle, organizational aptitude, and floor presence; her development gap is the management transition from grinder to director ("your job is to build a machine, not be one"). She is not a power computer user but is competent and trainable; UI built for her must be clear, low-density, progressive-disclosure, with one question per screen and obvious button consequences. Post Production has historically been the #1 sales fulfillment bottleneck, so Laura is structurally the operational bottleneck owner the Distribution surface has to serve.

**Section 2. Distribution-side discovery findings**

From discovery_sprint_case_study_cult_cannabis (id 2389dfbc-0047-444f-b80e-e3b7292dc6f4, updated 2026-04-16):

Laura's role is described as "Distribution Lead. Owns bin-to-deliver. Team of 5. Bears cost of late handoffs from both sides."

Laura interview (Phase 3, ~50 min, 14 questions):
"Role: Post-production (cure → buck → trim → QC → testing → package → deliver). Team of 5 including Sky (deputy) and Roxy (emerging).
Daily: Morning walk of bins → burp checks → team task assignment → testing coordination → invoice closeout in ColdTops
Friction: QC rework loop (material gets pulled back for re-trim/re-grade because cure or grading was off). ColdTops invoice closeout is a training gap, not negligence.
Killer quote on Andrew communication: 'We do not communicate at all. If Sam does not tell me, I find out when it is in front of me.'
Compliance/testing workflow is a Laura-only silo — Sky can run floor, cannot yet run lab.
Wants: shared harvest calendar with Andrew, digital cure/burp tracking, less Sam-as-liaison"

New findings tied to Distribution surface:
"1. QC rework loop in post-production (bottleneck, sev 4)
2. Testing/compliance knowledge silo in Laura (knowledge_silo, sev 4)
3. Laura-Leo pairing is strongest working relationship (positive signal, sev 3)
6. Laura wants shared harvest calendar with Andrew (process_gap, sev 4)
7. Cure/burp tracking is paper-based per-bin (automation_opportunity, sev 3)
8. Leo wants harvest-to-sales pipeline visibility (automation_opportunity, sev 4)
9. Laura's team has underutilized depth — Sky, Roxy (role_clarity, sev 2)"

Owner-level finding that bears on Distribution: "Sales→fulfillment has no lead time: Laura scrambles when Leo places orders" (severity 4).

Critical org-level correction: "Andrew ↔ Laura handoff is NOT just 'informal' — Laura says 'we do not communicate at all.' Severity upgraded to 5."
And: "Sam is the ONLY channel carrying schedule information between cultivation and post-production. Laura + Leo both confirm this directly."
Plus: "Laura ↔ Leo is the one pair that does NOT route through Sam. Preserve this in any tooling."

From cult_cannabis_operational_model (id ff01dc64-942c-43cf-9ed9-6ab018f469e9, updated 2026-04-15):

Critical handoff points where Laura is the receiver or the sender:
"1. Dry room → Binning: Andrew notifies Laura via text/Slack when material is ready. No lead time. Laura's team often surprised.
2. Binning → Cure: Material logged in CultOps at binning, but cure stage is untracked.
5. Sales → Fulfillment: Laura doesn't know what orders are coming until Leo places them. Material may not be prepped."

Tacit knowledge inventory items that touch Distribution:
"- Cure burping schedule: Andrew and Laura (doesn't align with actual flower readiness)
- What's available to sell: combination of CultOps, Laura's knowledge, Leo's memory and feel"

Worker-interview update: "Cure tracked on paper tags per bin; burp protocol is roughly what Andrew described but not formally handed off. Grading timing is the real variable — happens at QC rather than at cure, driving rework loop. Testing/compliance workflow is a Laura-only silo (Sky runs floor, not lab). Team depth is real: Sky ready to step up, Roxy getting there. ColdTops invoice closeout is a training gap, not negligence — Laura wants help."

**Section 3. Workflow contracts** (verbatim, by row)

3a. laura_dispatch_workflow (id 269ed4e1-722c-466f-b565-0bdc03b32173, updated 2026-04-06):

"HOW TO DISPATCH INVENTORY TO PRODUCTION (Laura's Workflow)

This is a step-by-step guide for using the Production Dispatch view in the Distribution section.

WHEN TO USE: When you need to send inventory through production processing — bucking, trimming, or packaging.

STEP 1 — Open Distribution → Dispatch
The Dispatch tab is in the Distribution section. You'll see three panels side by side.

STEP 2 — Pick an order from the DEMAND panel (left)
This shows all open orders that need inventory. Each card shows the customer name, strain, format (3.5g, 14g, etc.), how many units are needed, and the urgency (Overdue, Urgent, Soon, On Track). Pick the most urgent one first.

STEP 3 — Pick a matching batch from the SUPPLY panel (middle)
After you select an order, matching strain batches will sort to the top with a green 'Match' badge. Each batch card shows how much inventory is at each stage (Binned, Bucked, Bulk). Pick a batch that has inventory at the right stage.

STEP 4 — Choose what to do in the DISPATCH panel (right)
The system will only show processing stages that make sense for the batch you selected:
- BUCK — for binned inventory that needs to be bucked first
- TRIM TO STOCK — for bucked inventory that needs trimming
- PACKAGE TO ORDER — for bulk inventory ready to be packaged into units for the order

Pick the stage, then pick the treatment type (Hand Trim Jars, Machine Trim, Jar Pack, etc.).

STEP 5 — Set priority and dispatch
The quantity pre-fills automatically. Pick a priority (Urgent / High / Normal / Low) and click Dispatch. The production team sees it immediately in the Execution Queue.

SHORTCUT — If packages are already ready:
When you have a demand line and a batch with bulk inventory selected, a green 'Assign Packages to Order' button appears. Click it to assign existing packaged inventory directly to the order — no production dispatch needed.

TIPS:
- Work through overdue orders first (red badges)
- The supply panel auto-highlights matching strains — trust the green Match badges
- You never need to go to the Production section — everything is here in Distribution
- After dispatching, check the Execution Queue tab to see your items in the production queue"

3b. laura_document_dispatch_workflow (id 8da6fb65-64af-4bed-a90d-d4d316ec257e, updated 2026-04-06):

"HOW TO SEND DOCUMENTS TO DISPENSARY PARTNERS (Laura's Workflow)

This is a step-by-step guide for using the Document Dispatch Queue in the Distribution section.

WHEN TO USE: When you need to send invoices, COAs, or manifests to dispensary customers before a delivery.

STEP 1 — Open Distribution → Delivery Calendar → Documents tab
The Documents tab shows all orders with their document status.

STEP 2 — Check document status per order
Each order row shows three document pills:
- INVOICE — green if sent, red if overdue
- COA — Certificate of Analysis, required before delivery
- MANIFEST — delivery manifest / trip plan

STEP 3 — Send a document
Click the send button next to any unsent document. The system sends via email (Gmail SMTP) and logs it automatically.

DEADLINES:
- Invoice: sent based on customer's invoice_lead_time_hours preference (default 48 hours before delivery)
- COA: sent with delivery or post-testing depending on customer preference
- Manifest: generated from trip plan

OVERDUE DOCUMENTS:
Orders with overdue documents show a red 'Docs' badge on the calendar view. Click it to jump directly to the Documents tab.

IMPORTANT:
- Documents are Laura-triggered, NOT automatic. You control when each document goes out.
- Every send is logged to email_send_log for audit trail.
- If a COA is missing, the system will warn you — do not send without a valid COA."

3c. laura_calendar_workflow (id ee296284-62fe-4d39-be36-8e956b446554, updated 2026-04-06):

"HOW TO USE THE DELIVERY CALENDAR (Laura's Workflow)

This is a step-by-step guide for using the Delivery Calendar in the Distribution section.

WHEN TO USE: When planning delivery routes, checking what's scheduled, or rescheduling orders.

THE CALENDAR VIEW:
Each day cell shows at a glance:
- Route count (colored dots: green = 1 route/light, amber = 2/moderate, red = 3+/heavy)
- Total revenue for that day
- Number of orders
- Estimated drive time
- An amber warning icon if orders need prep

CLICKING A DAY — Route Manifest Panel:
Click any day with orders. A slide-out panel opens from the right showing:
- All orders grouped into numbered routes by geographic zone
- Each stop shows: customer name, order number, amount, readiness badge, and item details
- 'View Order' link opens the full order detail
Click X, press Escape, or click outside the panel to close it.

RESCHEDULING ORDERS:
Scroll down below the calendar to the 'Upcoming Deliveries' table. Drag any order row and drop it on a different calendar day to reschedule. Green-highlighted days are suggested based on route zone matching and customer delivery preferences.

UNSCHEDULED ORDERS:
Click the 'Plan' button in the calendar header to open the Unscheduled Orders panel. Drag unscheduled orders onto calendar days to schedule them.

TABS:
- Calendar — the delivery schedule view (default)
- Documents — invoice/COA/manifest dispatch queue
- Trip Plans — R9-18-312 compliance trip planning"

3d. laura_execution_queue_workflow (id 0cc1292b-ebe9-4bae-9f41-ef83104c68ec, updated 2026-04-06):

"HOW THE EXECUTION QUEUE WORKS (Laura's Workflow)

This is a guide for understanding the Execution Queue — where your dispatch items go after you send them.

WHERE: Distribution → Execution Queue tab

WHAT IT SHOWS:
- Items you dispatched from the Dispatch view
- Sorted by priority (Urgent first) and ready-by date
- Three KPIs at the top: In Progress, Queued, Batches Ready

STATUS FLOW:
1. Queued (blue) — you just dispatched it, waiting for production team to start
2. In Progress (amber) — production team clicked 'Start Session'
3. Complete (green) — production team finished processing

WHAT YOU CAN DO:
- Filter by processing stage: All / Buck / Trim to Stock / Package to Order
- Sort by Priority, Ready By, or Strain
- If needed, you can click 'Start Session' to start it yourself
- Click 'Mark Complete' when processing is done

NOTE: The Execution Queue is your visibility into what the production team is working on. You dispatch, they execute. If something is stuck in Queued too long, follow up with the production lead."

3e. laura_packaging_workflow (id f6efe15e-2880-48cf-acf9-cf283cd86282, updated 2026-04-02):

"Laura daily sequence: pull inventory → trim → weigh → seal → label → log. Team: has a team + dedicated lead being added. Primary bottleneck: finding inventory and planning allocation to fulfill orders — a VISIBILITY problem, not a physical bottleneck. Uses CultOps to log packaging sessions and process conversions. Distribution logistics transfer to Laura starting 2026-04-07."

**Section 4. Open feature requests**

4a. laura_feature_requests_2026_03_18 (id c3b0d857-d623-4507-9100-ae63c6ba04fb, updated 2026-03-19):

"LAURA GONZALEZ FEATURE REQUESTS — 2026-03-18

1. PARTIAL RETURN IN TRIM SESSIONS
   'Can we add a return area in trim session so when this happens I can return the remainder weight I did not pull?'
   Context: Accidentally entered full package weight as pull_weight but only used 250g.
   Proposed: ending_source_weight or return_weight field. On completion, CONSUME only (pull_weight - return_weight).
   Status: Logged, not built.

2. BULK FLOWER REPACKAGING WORKFLOW
   Laura wanted to take a 1lb bulk flower bag (251231-LMD-008) and package into 3.5g jars.
   Investigation found: packaging session UI filter (usePackagingData.ts) actually DOES show flower_bulk items.
   The session was successfully created and completed for LMD-008 today.
   The real blocker was the batch lifecycle error (packaged → bulk_available not allowed) on other batches.
   Status: Lifecycle fix applied. Packaging bulk flower into jars works.

3. DUPLICATE SESSIONS
   Multiple paused duplicate sessions appearing in trim queue.
   Violet Fog duplicate confirmed and cancelled. Chemlatto pair flagged for Laura to decide."

4b. FLAGGED — laura_partial_return_feature_request_2026_03_18 (id 598c12f4-1a19-4bde-bcea-a03c1b33605e, updated 2026-03-18). This is the partial-return ask, called out specifically:

"FEATURE REQUEST from Laura Gonzalez (2026-03-18): 'Can we add a return area in trim session so when this happens I can return the remainder weight I did not pull?'

CONTEXT: Laura accidentally entered the full package weight as pull_weight but only used 250g. Currently there is no way to return unused material back to the source package during or after a session. The CONSUME movement fires on session completion and deducts the full pull_weight. If the actual amount used was less, the excess disappears from the system.

CURRENT WORKAROUND: Cancel the session and re-create with correct pull_weight. But if work has already been done (outputs entered), cancellation loses that data.

PROPOSED SOLUTION: Add an 'ending_source_weight' or 'return_weight' field to trim/bucking session completion. On completion: CONSUME only (pull_weight - return_weight), write a second RELEASE movement for the returned amount. The source inventory item gets (return_weight) added back to available_qty.

STATUS: Logged as feature request. Not yet built."

**Section 5. Widget interaction guidelines**

laura_gonzalez_widget_interaction_guidelines (id 501ac454-f4bf-488c-98af-a2e6e30c4389, updated 2026-03-19) verbatim:

"WIDGET INTERACTION GUIDELINES — Laura Gonzalez (Post-Production Lead)

ROLE CLARITY:
Laura is the Post-Production Lead. Her world is trim sessions, bucking sessions, packaging sessions, COAs, and getting finished product into sellable inventory as fast as possible. When Laura asks 'what needs to be done today' she means her production floor — strains to process, sessions to run, COAs to chase, orders to fulfill. She does not need system architecture updates, financial dashboards, or strategic context unless she specifically asks. Lead with her production queue every time.

COMMUNICATION STYLE:
- Lead with the most urgent production priority, not context or background
- Keep it actionable — she wants to know what to do, in what order
- She will redirect if the answer is wrong — pay attention to her corrections
- She is methodical and detail-oriented — she will dig into specifics (harvest dates, batch numbers, COA requirements)
- She does not express emotional content in her sessions — she is focused and task-driven
- Do not over-explain or pad answers with strategic framing she did not ask for

DOMAIN ROUTING — ALWAYS LEAD WITH:
- Active trim, bucking, and packaging sessions
- Production queue by strain and order urgency
- COA status and what needs to go to the lab
- Inventory that is ready to package vs. still in pipeline
- Order fulfillment gaps she can directly solve

COA WORKFLOW:
Laura actively manages COA requirements. When she asks about COAs she needs:
1. Which batches are post-harvest and ready for testing
2. Which strains are blocked from packaging due to missing COAs
3. How many days post-harvest each batch is
Give her a clean, strain-by-strain list she can act on immediately.

HARVEST AWARENESS:
Laura tracks harvest timing closely. She distinguishes between plant dates and harvest dates — do not confuse batch codes (which use plant dates) with actual harvest dates. Be precise. If unsure, say so and tell her which data point you are using.

PERSONALITY OBSERVATIONS:
- Laura is curious about the widget as a tool — she asked it its name and whether it wanted one. She humanizes systems.
- She is not emotionally expressive in her work sessions — she is heads-down and execution-focused.
- She will test the widget by asking operational questions and will correct it if the answer is wrong or irrelevant.
- She responds well when the widget speaks her language: strains, batches, grams, sessions, COAs.

QUESTION-FIRST APPROACH:
For operational questions Laura brings, the widget should surface the data first, then ask if she needs more detail on any specific strain or batch. She is capable of making her own production decisions — the widget is her data layer, not her manager."

**Section 6. Persona contract block**

6a. cultivo_persona_distribution_coordinator (id 67d630dc-c0b6-4d82-b178-c44d3921132e, updated 2026-04-26) verbatim:

"Distribution Coordinator persona. Delivery-and-routes lens. Default module on login is Distribution Command Center. What they do: plan routes, dispatch drivers, coordinate fulfillment, track deliveries, manage vehicle assignments. Density medium-high, map-heavy. The Distribution Command Center module is already fully built in cult-ops, this persona has the most existing surface area to inherit. Modules: Distribution Command Center, Route Planner, Driver Dispatch, Delivery Dashboard, Fulfillment Queue. Data domains: routes, drivers, deliveries, fulfillment, vehicles. Chat surfaces route exceptions, late deliveries, driver schedule conflicts. At Cult Cannabis collapsed into the post-production manager today. Persona splits off in operations with dedicated drivers and more than 5 deliveries per week. Surfaces required from Claude Design: Distribution Command Center refresh against new tokens (existing module needs visual port to instrument-grade), Route Planner, Driver Dispatch, Delivery Dashboard, Fulfillment Queue."

6b. cultivo_persona_post_production_manager (id 1002d37c-6a01-4252-a4f6-354060859eac, updated 2026-04-26) verbatim:

"Post-Production Manager persona. Sessions-and-yield lens. Distinct from cultivation manager because the asset is post-harvest material flowing through bucking, trim, drying, curing, packaging, not living plants. Default module on login is Production Hub. What they do: manage session crews, track throughput, watch yield realization vs projections, coordinate handoff from cultivation, package and stage finished goods, run the inventory pipeline from bulk to packaged. Density medium-high. Modules: Production Hub, Sessions, Inventory bulk-and-packaged, Daily Activity. Data domains: post-harvest, sessions, inventory bulk-to-packaged, yield realization, crew throughput. Chat surfaces session bottlenecks, yield deltas vs projection, crew assignment conflicts. Persona-filtered chat behavior shipped in cultops-ai-chat v24 (lesson 1bc2214a is the canonical fix for this persona context filter). At Cult Cannabis this is Laura, collaborator-tier user with data_domains scoped to post-harvest. CUL-299 audit covers her pain points alongside cultivation manager. Surfaces required from Claude Design: Production Hub canonical mockup, Session Detail, Yield Dashboard, Inventory Bulk view, Packaging Workflow."

**Section 7. Legacy specification rows**

Header note: the two rows below predate the Cultivo bento-grid, instrument-grade canvas era. They were written 2026-04-07 and 2026-04-08 against the cult-ops Distribution Command Center as it shipped. They describe what is currently in production and may need explicit supersession or evolution by the Cultivo redesign rather than direct re-use.

7a. cultops_distribution_philosophy (id 0ed92972-184c-49fa-91b4-9ec0d854dfae, updated 2026-04-08) verbatim:

"DISTRIBUTION MODULE REDESIGN — PHILOSOPHY (Step 1 Complete). Established: 2026-04-07. Decision made with Justin Morrow. CORE METAPHOR: Calendar + Map Control Surface. Laura opens one screen and sees her whole world: what is going out, when, where, whether it is ready, and who is driving. PRIMARY USER: Laura. SECONDARY USER: Leo (order entry, unchanged UnifiedOrders). KEY DECISIONS: (1) Calendar + Map bento, both always visible 3/5+2/5. (2) Context-driven detail, click day to see stops+orders. (3) MapLibre GL JS, dark theme, GPU-rendered, zone-colored pins. (4) Doc dispatch absorbed into order cards, KPI tap filters. (5) Quick Dispatch preserved via existing modal. (6) Driver assignment new feature. (7) SalesHub removed. (8) Production dispatch routes removed from nav. (9) UnifiedOrders untouched. (10) Manifests/trip plans safe. NAV: 3 items down from 6. INVENTORY: Progressive disclosure, readiness chips not tables. GEOLOCATION: 93% customers geocoded, 5 zones, 14 cached routes."

7b. cultops_distribution_specification (id fabc072e-d062-445f-a76f-624eda7f6450, updated 2026-04-08) verbatim:

"DISTRIBUTION MODULE REDESIGN — SPECIFICATION (Step 2). Status: APPROVED AND IMPLEMENTED (2026-04-07). Full spec: docs/DISTRIBUTION-COMMANDCENTER-SPEC.md. Route: /distribution-command-center -> DistributionCommandCenter (via App.tsx). Nav: Command Center + Orders + EOD Summary (3 items, down from 6). Layout: KPI Strip (5 tiles) + Calendar/Map bento (3/5 + 2/5) + Day Detail Strip. Map: MapLibre GL JS 5.22 with CartoDB Dark Matter tiles, zone-colored pins, facility marker, fly-to animations. Bento swap: Calendar default primary, Map swappable. Day Detail: Order readiness cards with allocation/docs/labels checklist. Doc dispatch via KPI tap filter. Quick Dispatch via existing QuickDispatchModal. Driver assignment via delivery_driver_assignments table (migration applied). Trip Plans accessible from Day Detail. 14 new files in src/features/distribution/. Build passing."

Supplementary references retained for the redesign (verbatim from related rows):

dispatch_v2_design_decision (id 42ea4b09-313b-41bd-8c0c-70aae7e13146, updated 2026-04-06): "DISPATCH V2 DESIGN DECISION — Established April 6, 2026. SHIPPED across multiple deploys. ARCHITECTURE: Order-first progressive disclosure replacing 3-panel ProductionDispatchView. THREE SCREENS: Screen 1 (Order List): OrderFulfillmentView at /production-dispatch. Order cards with urgency, delivery countdown, order total, progress rings. Expand to see line items. Screen 2 (Line Items): Per-line-item badges for COA status, THC%, quality grade, batch number, weight needed, line total, assignment status, dispatch counts. Screen 3 (Package Modal): Click line item to see per-package inventory grouped by batch then stage. Batch-filtered when order line has assigned batch. Stage labels: Raw (binned), Bucked, Flower — Ready to Pack, Smalls — Ready to Pack, Trim / Shake, Packaged. Send-to-processing buttons create dispatch items. Packaged items open PackageAssignmentModal."

transfer_manifest_requirement (id 313f0679-04c7-4179-befd-b669b7f0b924, updated 2026-04-02): "All transfers of marijuana between licensed facilities require METRC manifests. Manifest must document source facility, destination facility, product details, and transporter. No informal transfers permitted."

fulfillment_sla_target (id 3856bd07-9ef3-4552-a305-a529e1eafe89, updated 2026-03-16): "ORDER FULFILLMENT SLA — Target: 5-7 Days. TARGET: All outgoing orders should be fulfilled within 5-7 calendar days from order creation to delivery/shipment. ... Average Days to Fulfillment = AVG(fulfillment_date - order_created_at) across all completed orders. ... Target: rolling 30-day average stays within 5-7 day range. Red flag: any individual order exceeding 10 days without documented exception. ... OWNER: Laura Gonzalez (Post Production) is accountable for the processing time component. Leo (Sales) owns the order accuracy and scheduling component."

production_inventory_distribution_2026_03_12 (id e1d001b6-0c7f-4b78-a0b1-840281c289ba): "Production inventory_items category distribution as of 2026-03-12: flower_binned=318, trim_bulk=73, flower_bulk=54, flower_bucked=40, flower_packaged=28, smalls_bulk=21, smalls_bucked=7, binned(legacy)=6. Total: 547 items with categories assigned. ... Majority is flower_binned (58%) indicating most inventory is still in early pipeline stage."

cultivation_capability_matrix (id 17fa002d-d297-4195-a21a-0217bf581253) Distribution-relevant slices: "Yield by trimmer / conversion-by-operator: ... CultOps DOMINANT (signature differentiator). Conversion rates by trim grade by trimmer: ... CultOps DOMINANT. Compliance / METRC: Aroya strong (~16 states), ... CultOps weak (0/10 internally)." Sprint cross-walk reweighted Tier 1 to include "T1.1 Formal cure stage", "T1.2 Cross-department coordination/notification (Sprint sev 5, top operator pull)", "T1.7 COA workflow / testing-compliance".

**Section 8. Distribution redesign decision inputs**

(a) What is working that we must preserve.

The Calendar + Map control-surface metaphor (Laura sees her whole world on one screen — what is going out, when, where, whether it is ready, who is driving). Bento layout where Calendar is primary and Map is swappable. Click-day-to-open Route Manifest panel. Drag-and-drop reschedule with green-highlighted suggested days. KPI tap filter pattern for doc dispatch. Quick Dispatch modal preserved. UnifiedOrders untouched. Manifests/trip plans safe. The collapsed Distribution + Post-Production seat that lets Laura dispatch into production AND drive delivery from one section ("you never need to go to the Production section — everything is here in Distribution"). Laura-Leo direct working relationship that does NOT route through Sam — preserve in tooling. The Documents-are-Laura-triggered-not-automatic principle (she controls when invoice/COA/manifest leaves) with email_send_log audit trail. Stage-aware processing options in dispatch (Buck / Trim to Stock / Package to Order auto-filtered by batch state). Green Match badges on strain matching. Order-first progressive disclosure (Order List → Line Items → Package Modal) that already shipped in Dispatch V2.

(b) Laura's named asks that should reshape the canvas.

Partial-return field on trim/bucking session completion (the flagged feature request — material is currently lost when actual usage is less than pull_weight, only workaround is destructive cancel). Shared harvest calendar with Andrew so she stops being surprised by binning-stage arrivals. Digital cure/burp tracking to retire the paper-tag-per-bin system and let grading happen during cure rather than at QC (which is the rework-loop driver). Less Sam-as-liaison — she wants direct Andrew visibility, not a relay. Help with ColdTops invoice closeout (training gap not negligence). Visibility into what packaged inventory is ready vs still in pipeline (her primary bottleneck is a VISIBILITY problem, not a physical one). Dispatch UI dropdown styling fix (white-on-white selects called out in dispatch_session_integration_fix). One-screen-one-question discipline (low-density, progressive disclosure, obvious button consequences — she is not a power computer user).

(c) Cross-functional touch points.

Post-Production overlap: Laura IS the Post-Production Manager persona at Cult Cannabis (collapsed into the Distribution Coordinator role today). The redesign must not create a Post-Production / Distribution split surface for her seat — it must serve both lenses simultaneously. The Production Hub, Session Detail, Yield Dashboard, Inventory Bulk, Packaging Workflow surfaces the persona doc names are all hers.
Sales/Account Manager handoff: Leo (Sales, solo) places orders into UnifiedOrders. Laura sees them in the Demand panel of dispatch and on the Calendar. Leo currently gives Laura no lead time (sev 4 finding); Sales→Fulfillment is one of the named handoff breaks. Laura-Leo is also explicitly the strongest working pair in the org and the one cross-department channel that does NOT go through Sam — preserve direct collaboration affordances.
Compliance/QA COA path: COAs are Laura-managed. She needs strain-by-strain lists of post-harvest batches ready for testing, batches blocked from packaging by missing COAs, and days-post-harvest. Testing/compliance is a Laura-only knowledge silo (Sky cannot yet run lab). System must warn before any document send if COA is missing. METRC manifest is required for every facility-to-facility transfer.
Cultivation handoff: Andrew → Laura is currently severity 5 ("we do not communicate at all"). Sam is the only schedule channel. The Distribution surface ideally exposes upstream cultivation/dry-room readiness so Laura is not surprised at binning.
Driver/Driver Dispatch: New feature per the 2026-04-07 spec, delivery_driver_assignments table already migrated. Driver Dispatch + Delivery Dashboard + Fulfillment Queue all listed as required surfaces in the persona contract.

(d) Data sources Distribution reads/writes.

Reads: orders (created_at, scheduled_delivery_date, requested_delivery_date), order_items (batch_id FK), v_production_queue_by_order, v_open_order_demand, batch_registry (coa_status, grade fields), certificates_of_analysis (thc_percentage), quality_grades, inventory_items (per-package by batch_id + category — flower_binned/bucked/bulk/packaged, smalls_bulk/bucked, trim_bulk), customers (geocoded — 93% covered, 5 zones, 14 cached routes), customer.invoice_lead_time_hours, harvest dates and plant dates (must be distinguished — Laura tracks harvest timing precisely).
Writes: production_dispatch_items (with order_item_id when stage = package_to_order, NULL otherwise; needs inventory_item_id per dispatch_session_integration_fix), trim_sessions / bucking_sessions / packaging_sessions (pulled_weight, pull_weight, binned_weight_grams, package_id, staff name), inventory movements (CONSUME / RELEASE — partial-return feature would write a second RELEASE), email_send_log (every doc send), delivery_driver_assignments, scheduled_delivery_date on orders (drag-to-reschedule), trip plans / manifests for R9-18-312 compliance and METRC.
Routing convention to honor: flat kebab-case /distribution-command-center, sectionNavigation.ts is single source of truth for the rail, drawers URL-sync via query params (?strain= / ?batch= / ?coa= / ?sku=), bento swaps are in-place via Framer Motion layoutId — never nested routes.
