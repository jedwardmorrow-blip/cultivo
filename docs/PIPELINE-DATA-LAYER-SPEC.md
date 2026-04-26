# Pipeline data-layer spec

For the COO Pipeline surface (canonical persona `cultivo_persona_coo`). Two views to add to the shared cult-ops production database `fonreynkfeqywshijqpi`. Pattern matches the existing `vp_*` view layer used by Performance Loop (read-only, additive, reversible via `DROP VIEW`).

**Status.** Spec only. No DDL applied. Apply in a separate implementation session.

**Naming.** `vp_batch_pipeline` and `vp_contract_allocation`. Keeping the `vp_` prefix consistent with Performance Loop (Path C decision from session 364).

**Source tables and views.** All exist already.

  `batch_registry` — canonical batch master (id, batch_number, strain, room, lifecycle_state, *_started_at timestamps per stage, status).
  `batch_stage_tracking` — per-stage weight, allocated, available, location.
  `batch_projections` — projected_weight_grams per source/target stage transition.
  `batch_allocation_summary` — totals: total_weight, total_allocated, allocation_percentage, over_allocation thresholds.
  `batch_allocation_overview` — current_stage, current_weight_grams, estimated_final_weight_grams, eighths/halves/pounds demand vs capacity, allocation_status.
  `batch_lifecycle_events` — stage transitions log with from_state, to_state, event_timestamp.
  `order_items` — order_id, batch_id, strain, quantity, unit_price, subtotal, demand_unit, status.
  `orders` (joined for account_name and contracted delivery date).



## vp_batch_pipeline

One row per active batch. Powers the six stage columns (Clone, Veg, Flower, Dry/Cure, Package, Allocated), the at-risk count KPI, and the right-rail at-risk panel.

**Columns.**

| Column | Type | Source | Notes |
|---|---|---|---|
| batch_id | uuid | batch_registry.id | PK for the row |
| batch_number | text | batch_registry.batch_number | mono identifier in UI (e.g., 240306-WCAKE) |
| strain | text | batch_registry.strain | label |
| strain_id | uuid | batch_registry.strain_id | for joins |
| room | text | batch_registry.room | label |
| current_stage | text | batch_registry.lifecycle_state | normalized: clone, veg, flower, dry, cure, package, allocated, completed |
| stage_entered_at | timestamptz | derived from *_started_at | latest stage transition timestamp |
| day_in_stage | int | now() - stage_entered_at | integer days since stage entry |
| stage_target_days | int | strain default + override | from a strain_stage_targets table or hardcoded defaults until that exists |
| days_to_next_stage | int | stage_target_days - day_in_stage | negative = overdue |
| current_weight_grams | numeric | batch_allocation_overview.current_weight_grams | live weight |
| projected_weight_grams | numeric | batch_allocation_overview.estimated_final_weight_grams | projection at allocated stage |
| allocated_weight_grams | numeric | batch_allocation_summary.total_allocated | committed |
| unallocated_weight_grams | numeric | projected - allocated | free supply |
| allocation_pct | numeric | batch_allocation_summary.allocation_percentage | 0-100, can exceed 100 if overcommitted |
| projected_revenue_cents | bigint | sum(order_items.subtotal where batch_id matches) + (unallocated * avg_strain_sell_price) | revenue at current contracts plus projection on free supply |
| status | text | derived (see below) | nominal, attention, urgent, at_risk |
| health_note | text | derived (see below) | one-line operator-readable summary |
| coa_status | text | batch_registry.coa_status | for compliance overlay |
| harvest_date | date | batch_registry.harvest_date | for week-of grouping |
| created_at | timestamptz | batch_registry.created_at | for ordering |
| updated_at | timestamptz | greatest(batch_registry.updated_at, batch_allocation_summary.updated_at) | freshness signal |

**Status derivation rules.** Pure SQL, no app logic.

  `urgent` — `allocation_pct > 100` OR `days_to_next_stage < -3` OR `is_quarantined = true`.
  `attention` — `allocation_pct BETWEEN 90 AND 100` OR `days_to_next_stage BETWEEN -3 AND 0` OR (`current_stage = 'flower'` AND `coa_status IN ('expired','rejected')`).
  `at_risk` — projection deficit: `projected_weight_grams - allocated_weight_grams < 0` (allocated more than will exist).
  `nominal` — none of the above.

**Health note derivation.** `CASE` expression building a short string from the most material signal:

  if `at_risk`: `format('%s lbs deficit projected vs allocation, %sd to harvest', deficit_lbs, days_to_next_stage)`
  if `urgent` due to over-allocation: `format('over-allocated %s%%', allocation_pct)`
  if `urgent` due to overdue stage: `format('%sd overdue in %s', abs(days_to_next_stage), current_stage)`
  if `attention`: `format('%s, watch', attention_reason)`
  if `nominal`: `'on plan'`

**DDL skeleton.**

```sql
CREATE OR REPLACE VIEW public.vp_batch_pipeline
WITH (security_invoker = true)
AS
WITH stage_started AS (
  SELECT
    br.id AS batch_id,
    br.lifecycle_state AS current_stage,
    CASE br.lifecycle_state
      WHEN 'clone'    THEN br.clone_date::timestamptz
      WHEN 'veg'      THEN br.veg_started_at
      WHEN 'flower'   THEN br.flower_started_at
      WHEN 'drying'   THEN br.drying_started_at
      WHEN 'cure'     THEN br.cure_start_date
      WHEN 'bucking'  THEN br.bucking_started_at
      WHEN 'trimming' THEN br.trimming_started_at
      WHEN 'packaging'THEN br.packaging_started_at
      WHEN 'completed'THEN br.completed_at
      ELSE br.updated_at
    END AS stage_entered_at
  FROM batch_registry br
),
stage_targets AS (
  SELECT 'clone'::text     AS stage, 14  AS target_days UNION ALL
  SELECT 'veg'::text,        21          UNION ALL
  SELECT 'flower'::text,     63          UNION ALL
  SELECT 'drying'::text,     10          UNION ALL
  SELECT 'cure'::text,       21          UNION ALL
  SELECT 'bucking'::text,    3           UNION ALL
  SELECT 'trimming'::text,   5           UNION ALL
  SELECT 'packaging'::text,  3
),
batch_revenue AS (
  SELECT
    oi.batch_id,
    SUM(oi.subtotal * 100)::bigint AS booked_revenue_cents
  FROM order_items oi
  WHERE oi.batch_id IS NOT NULL
    AND oi.status NOT IN ('cancelled','void')
  GROUP BY oi.batch_id
)
SELECT
  br.id                                AS batch_id,
  br.batch_number,
  br.strain,
  br.strain_id,
  br.room,
  COALESCE(br.lifecycle_state, br.status) AS current_stage,
  ss.stage_entered_at,
  GREATEST(0, EXTRACT(day FROM (now() - ss.stage_entered_at))::int) AS day_in_stage,
  st.target_days                       AS stage_target_days,
  (st.target_days - EXTRACT(day FROM (now() - ss.stage_entered_at))::int) AS days_to_next_stage,
  bao.current_weight_grams,
  bao.estimated_final_weight_grams     AS projected_weight_grams,
  bas.total_allocated                  AS allocated_weight_grams,
  GREATEST(0, bao.estimated_final_weight_grams - COALESCE(bas.total_allocated,0)) AS unallocated_weight_grams,
  bas.allocation_percentage            AS allocation_pct,
  COALESCE(brv.booked_revenue_cents, 0) AS projected_revenue_cents,
  CASE
    WHEN bas.allocation_percentage > 100 THEN 'urgent'
    WHEN br.is_quarantined = true        THEN 'urgent'
    WHEN (st.target_days - EXTRACT(day FROM (now() - ss.stage_entered_at))::int) < -3 THEN 'urgent'
    WHEN bao.estimated_final_weight_grams - COALESCE(bas.total_allocated,0) < 0      THEN 'at_risk'
    WHEN bas.allocation_percentage BETWEEN 90 AND 100                                THEN 'attention'
    WHEN (st.target_days - EXTRACT(day FROM (now() - ss.stage_entered_at))::int) BETWEEN -3 AND 0 THEN 'attention'
    ELSE 'nominal'
  END AS status,
  -- health_note as a derived CASE; pseudo-code below, expand on implementation
  NULL::text                           AS health_note,
  br.coa_status::text,
  br.harvest_date,
  br.created_at,
  GREATEST(br.updated_at, COALESCE(bas.updated_at, br.updated_at)) AS updated_at
FROM batch_registry br
LEFT JOIN stage_started ss ON ss.batch_id = br.id
LEFT JOIN stage_targets st ON st.stage = COALESCE(br.lifecycle_state, br.status)
LEFT JOIN batch_allocation_overview bao ON bao.batch_id = br.id
LEFT JOIN batch_allocation_summary  bas ON bas.batch_id = br.id
LEFT JOIN batch_revenue             brv ON brv.batch_id = br.id
WHERE br.archived_at IS NULL
  AND br.depleted_at IS NULL
  AND COALESCE(br.lifecycle_state, br.status) NOT IN ('archived','depleted','cancelled');
```

**Open implementation questions.**

  1. `stage_targets` is hardcoded in the spec. Two options for production: (a) move to a `strain_stage_targets` table keyed on `strain_id` with per-strain overrides, (b) keep hardcoded with one global default. Recommend (a) for accuracy; defer until the second tenant lands and creates demand for per-strain overrides.
  2. Revenue projection on unallocated weight requires an `avg_strain_sell_price` lookup. The spec returns booked revenue only; unallocated projection is a follow-up that needs a `strain_sell_price` view derived from `order_items` historical averages.
  3. `health_note` is left NULL in the DDL. The full CASE expression is involved enough to warrant building it iteratively against real data once the view is materialized. Spec writes the rules above; the implementer codes them.
  4. `current_stage` normalization. `batch_registry.lifecycle_state` and `batch_registry.status` overlap. Pick one canonical column; recommend `lifecycle_state`. If both are non-null and disagree, that is a data-quality issue surfaced as `attention`.
  5. `security_invoker = true` is set so the view honors RLS on the underlying tables. Consistent with `vp_*` views from Performance Loop.



## vp_contract_allocation

One row per batch-order-item pair. Powers the bottom 6-week contract allocation timeline strip and the right-rail Revenue-by-batch projection panel.

**Columns.**

| Column | Type | Source | Notes |
|---|---|---|---|
| order_item_id | uuid | order_items.id | PK |
| batch_id | uuid | order_items.batch_id | FK to batches |
| order_id | uuid | order_items.order_id | FK to orders |
| account_id | uuid | orders.customer_id | FK to customers |
| account_name | text | customers.name | label |
| strain | text | order_items.strain | label |
| strain_id | uuid | order_items.strain_id | for joins |
| demand_unit | text | order_items.demand_unit | eighth, half, pound, gram |
| allocated_quantity | numeric | order_items.quantity | committed units |
| allocated_weight_grams | numeric | derived from quantity * unit_weight | computed via demand_unit conversion table |
| unit_price_cents | bigint | order_items.unit_price * 100 | mono in UI |
| subtotal_cents | bigint | order_items.subtotal * 100 | revenue commitment |
| contracted_delivery_date | date | orders.delivery_date or orders.expected_delivery | for the 6-week timeline grouping |
| delivery_week_iso | text | derived from contracted_delivery_date | YYYY-Www |
| order_status | text | orders.status | open, allocated, fulfilled, cancelled |
| item_status | text | order_items.status | open, allocated, partial, fulfilled, cancelled |
| contract_status | text | derived | allocated, partial, unallocated, overcommitted |
| created_at | timestamptz | order_items.created_at | for ordering |

**Contract status derivation.**

  `allocated` — `item_status = 'allocated'` and `batch_id IS NOT NULL`.
  `partial` — `item_status = 'partial'` or `soft_reserved_qty > 0 AND quantity > soft_reserved_qty`.
  `unallocated` — `batch_id IS NULL`.
  `overcommitted` — derived from the parent batch's allocation_pct > 100.

**DDL skeleton.**

```sql
CREATE OR REPLACE VIEW public.vp_contract_allocation
WITH (security_invoker = true)
AS
WITH unit_weights AS (
  SELECT 'eighth'::text  AS demand_unit, 3.5    AS grams_per_unit UNION ALL
  SELECT 'half'::text,                   14.0                    UNION ALL
  SELECT 'pound'::text,                  453.592                 UNION ALL
  SELECT 'gram'::text,                   1.0                     UNION ALL
  SELECT 'unit'::text,                   1.0
)
SELECT
  oi.id                                AS order_item_id,
  oi.batch_id,
  oi.order_id,
  o.customer_id                        AS account_id,
  c.name                               AS account_name,
  oi.strain,
  oi.strain_id,
  oi.demand_unit,
  oi.quantity                          AS allocated_quantity,
  (oi.quantity * COALESCE(uw.grams_per_unit, 1)) AS allocated_weight_grams,
  (oi.unit_price * 100)::bigint        AS unit_price_cents,
  (oi.subtotal   * 100)::bigint        AS subtotal_cents,
  COALESCE(o.delivery_date, o.expected_delivery_date) AS contracted_delivery_date,
  to_char(COALESCE(o.delivery_date, o.expected_delivery_date), 'IYYY-"W"IW') AS delivery_week_iso,
  o.status::text                       AS order_status,
  oi.status::text                      AS item_status,
  CASE
    WHEN oi.batch_id IS NULL                                          THEN 'unallocated'
    WHEN oi.status::text = 'allocated' AND oi.batch_id IS NOT NULL    THEN 'allocated'
    WHEN oi.status::text = 'partial'
      OR (oi.soft_reserved_qty > 0 AND oi.quantity > oi.soft_reserved_qty) THEN 'partial'
    ELSE 'allocated'
  END AS contract_status,
  oi.created_at
FROM order_items oi
JOIN orders o    ON o.id = oi.order_id
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN unit_weights uw ON uw.demand_unit = oi.demand_unit
WHERE oi.is_sample = false
  AND oi.test_mode = false
  AND oi.status NOT IN ('cancelled','void');
```

**Open implementation questions.**

  1. `unit_weights` is hardcoded. Move to a real table if the operator adds more demand units.
  2. `orders.delivery_date` and `orders.expected_delivery_date` column names need verification; pick the one the existing app uses.
  3. The `overcommitted` contract status requires a join to `vp_batch_pipeline.allocation_pct`. Handle in the UI by joining the two views, or add it as a column on `vp_contract_allocation` if it gets queried often.



## How the Pipeline surface uses these views

**KPI strip.**

  Batches in flight. `SELECT count(*) FROM vp_batch_pipeline WHERE current_stage NOT IN ('completed','depleted')`.
  Projected harvest 30d. `SELECT sum(projected_weight_grams) / 453.592 FROM vp_batch_pipeline WHERE current_stage IN ('flower','drying','cure') AND days_to_next_stage <= 30`.
  Projected harvest 31-90d. Same with `BETWEEN 31 AND 90`.
  Projected revenue 30d. `SELECT sum(subtotal_cents) FROM vp_contract_allocation WHERE contracted_delivery_date BETWEEN now() AND now() + interval '30 days' AND contract_status = 'allocated'`.
  Allocated to orders. `SELECT sum(allocated_weight_grams) FROM vp_batch_pipeline WHERE current_stage IN ('flower','drying','cure','bucking','trimming','packaging')`.
  At-risk count. `SELECT count(*) FROM vp_batch_pipeline WHERE status IN ('at_risk','urgent')`.

**Stage columns.** `SELECT * FROM vp_batch_pipeline WHERE current_stage = $1 ORDER BY days_to_next_stage ASC`.

**Right-rail At-risk panel.** `SELECT batch_number, strain, room, status, health_note, days_to_next_stage FROM vp_batch_pipeline WHERE status IN ('at_risk','urgent') ORDER BY days_to_next_stage ASC LIMIT 20`.

**Right-rail Revenue-by-batch.** `SELECT batch_id, batch_number, strain, projected_revenue_cents FROM vp_batch_pipeline WHERE current_stage NOT IN ('completed','depleted') ORDER BY projected_revenue_cents DESC LIMIT 30`.

**Bottom 6-week contract allocation timeline.** `SELECT delivery_week_iso, contract_status, sum(subtotal_cents) AS revenue_cents, count(*) AS items FROM vp_contract_allocation WHERE contracted_delivery_date BETWEEN now() AND now() + interval '6 weeks' GROUP BY delivery_week_iso, contract_status ORDER BY delivery_week_iso`.



## Migration plan

  1. Apply `CREATE OR REPLACE VIEW public.vp_batch_pipeline ...` and `CREATE OR REPLACE VIEW public.vp_contract_allocation ...` to the prod project `fonreynkfeqywshijqpi`. Both are read-only and reversible via `DROP VIEW`.
  2. Verify `security_invoker = true` honors RLS on the underlying tables. Test as a Cult Cannabis user; should see all rows for their tenant only.
  3. Add a `usePipelineData.ts` hook in cultivo at `src/features/cultivation/components/pipeline/` (mirror the Performance Loop pattern) that queries both views.
  4. Build the Pipeline component against the spec in `cultivo-design-handoff.md`. Mock the design from Claude Design first, then wire data.
  5. Add the route `/pipeline` to `src/App.tsx` behind the COO persona. Default route for COO on login.
  6. Write canonical row `cultivo_pipeline_data_layer` in the World Model documenting the views are now live.



## Reversibility

```sql
DROP VIEW IF EXISTS public.vp_contract_allocation;
DROP VIEW IF EXISTS public.vp_batch_pipeline;
```

Zero state mutation. Safe to apply, safe to roll back.
