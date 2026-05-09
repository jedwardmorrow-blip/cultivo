# Phase 4 Mom Planning Migration

Schema + backfill plan for the mom planning surface. Drafted 2026-05-09 against cult prod (`fonreynkfeqywshijqpi`). Not yet applied — execution belongs in a dedicated migration session.

## Why this is its own session

The DDL is small (4 columns, ~60 lines of SQL including idempotent backfill). The application work is heavier: typed schema regen, plant_groups query updates across the existing Cultivo app, RLS policy verification on new columns, and the demo's mock-to-live swap path in `useLabPlannerData`. Bundling DDL with feature work creates diff noise and increases the chance of a "while I'm here" mistake on a single-tenant production database.

## Pre-flight findings (cult prod, verified 2026-05-09)

`plant_groups`:

  - 677 total rows
  - 94 with `is_mother = true`
  - 65 distinct mom strains, 135 total physical mom plants (`plant_count` 1–2, avg 1.44)
  - 93 mom rows in MOM-01, 1 stray in VEG-01 (real operator data, surface should support both)
  - Existing `name` column populated as `<Strain> - <Room>` or `<Strain> #N - <Room>`

`batch_registry.mother_plant_group_ids` (backfill source for `cuts_taken_lifetime`):

  - 78 distinct mom plant_groups.id appear across the array values
  - Of those, 77 resolve to existing plant_groups rows; 1 references a deleted row (orphan)
  - Max 3 cuts per mom group, avg 1.47 cuts per mom group, so Cult moms have light cut histories
  - Backfill must be join-tolerant (LEFT JOIN, ignore unresolvable IDs)

`cycles` (source for `source_cycle_id`):

  - 7 cycles populated, all post-flip
  - Only 13 of 94 mom rows (the 7 sourced from FLW-08 on 2026-01-26 and 6 from FLW-06 on 2026-02-17) match `mom.planted_date = cycle.actual_flip_date AND same room`
  - The remaining 81 mom rows mostly come from a single bulk roster sync on 2026-04-03 with no recoverable cycle source
  - Decision: leave `source_cycle_id` NULL on backfill; populate forward via the hold-back UI

## Schema changes

```sql
ALTER TABLE plant_groups
  ADD COLUMN health text NOT NULL DEFAULT 'healthy'
    CHECK (health IN ('healthy', 'declining', 'needs_replacement'));

ALTER TABLE plant_groups
  ADD COLUMN cuts_taken_lifetime int NOT NULL DEFAULT 0;

ALTER TABLE plant_groups
  ADD COLUMN cuts_max_rotations int NOT NULL DEFAULT 4;

ALTER TABLE plant_groups
  ADD COLUMN source_cycle_id uuid REFERENCES cycles(id);
```

Choice notes:

  - `health` is text + CHECK rather than a Postgres enum. Adding values to a text+CHECK is a one-line ALTER; adding values to an enum requires `ALTER TYPE ... ADD VALUE` outside a transaction and is harder to manage in a Supabase migration.
  - `cuts_taken_lifetime` and `cuts_max_rotations` are `int NOT NULL DEFAULT`. Instant DDL on Postgres 11+; no table rewrite.
  - `source_cycle_id` references `cycles(id)`. NULL is allowed because backfill can't infer the source for 81 rows; the hold-back UI populates it forward.

## Indexes

```sql
CREATE INDEX idx_plant_groups_source_cycle_id
  ON plant_groups (source_cycle_id)
  WHERE source_cycle_id IS NOT NULL;

CREATE INDEX idx_plant_groups_needs_attention
  ON plant_groups (health)
  WHERE is_mother = true AND health <> 'healthy';
```

The first supports the mom roster grouped-by-source-MBG query. The second supports the action queue's replacements-due query.

## Backfill

```sql
-- cuts_taken_lifetime: count occurrences in batch_registry.mother_plant_group_ids.
WITH cut_counts AS (
  SELECT mom_id, COUNT(*) AS cuts
  FROM batch_registry, unnest(mother_plant_group_ids) AS mom_id
  WHERE mother_plant_group_ids IS NOT NULL
    AND array_length(mother_plant_group_ids, 1) > 0
  GROUP BY mom_id
)
UPDATE plant_groups pg
SET cuts_taken_lifetime = cc.cuts
FROM cut_counts cc
WHERE pg.id = cc.mom_id
  AND pg.is_mother = true;
```

Expected effect: 77 rows updated (the 1 orphan reference is silently ignored by the join). Other 17 mom rows stay at 0.

`health` and `cuts_max_rotations` use the column defaults; no row updates needed.

`source_cycle_id` stays NULL. Forward population happens through the hold-back UI in Phase 5.

## RLS

`plant_groups` already has RLS in place. Verify that read policies don't filter on the new columns and that write policies allow updating `health`, `cuts_taken_lifetime`, `cuts_max_rotations` for users who can update mom rows. Confirm by SELECT before and after migration with a non-admin role.

## Testing

Run on a Supabase database branch first. Steps:

  1. Create branch from prod, apply migration there
  2. Confirm: `SELECT id, health, cuts_taken_lifetime, cuts_max_rotations FROM plant_groups WHERE is_mother = true LIMIT 12;` returns sensible values
  3. Confirm: `SELECT COUNT(*) FROM plant_groups WHERE cuts_taken_lifetime > 0;` returns 77
  4. Run typed-schema regen (`supabase gen types typescript`) and rebuild the app on the branch
  5. Smoke-test the existing planner against the branch — no regressions in non-mom code paths
  6. Merge branch to prod

## Live-mode swap path for the demo

Once the migration lands in prod, the demo's mock-to-live swap is a query-layer change in `useLabPlannerData.fetchLive`:

  - `motherBatchGroups` derives from `plant_groups WHERE is_mother = true`, grouped by `source_cycle_id` (NULL groups go into a "Pre-Phase-4 mom roster" bucket until operator-assigned)
  - Per-mom `health`, `cuts_taken_lifetime`, `cuts_max_rotations` come straight from the columns
  - `last_cut_date` derives from `MAX(batch_registry.clone_date)` across rows where this mom appears in `mother_plant_group_ids`

The drawer UI does not change. The typed shape in `planner-mock.ts` (`MotherIndividual`, `MotherBatchGroup`) is identical to the live shape after Phase 4.

## Phase 5 (deferred)

  - Hold-back action RPC: `fn_hold_back_moms(cycle_id uuid, picks jsonb)` — atomically creates plant_groups rows with `is_mother = true`, `source_cycle_id = $1`, plant_count from picks
  - Replacement RPC: `fn_retire_mom(plant_groups_id uuid, reason text)` — sets is_mother = false (or adds a retired flag) plus an audit-log row
  - Mom audit log table: `mom_health_assessments(plant_groups_id, assessed_at, assessed_by, health, notes)` — long-term audit, drives the "last assessed" column in the roster
  - Operator UI for hold-back: triggered from the planner's flower-flip action queue when a flower batch group is within 14 days of flip

## Rollback

```sql
ALTER TABLE plant_groups DROP COLUMN source_cycle_id;
ALTER TABLE plant_groups DROP COLUMN cuts_max_rotations;
ALTER TABLE plant_groups DROP COLUMN cuts_taken_lifetime;
ALTER TABLE plant_groups DROP COLUMN health;
DROP INDEX IF EXISTS idx_plant_groups_source_cycle_id;
DROP INDEX IF EXISTS idx_plant_groups_needs_attention;
```

No data loss on rollback because backfilled values can be recomputed from `batch_registry.mother_plant_group_ids` and the columns are additive.
