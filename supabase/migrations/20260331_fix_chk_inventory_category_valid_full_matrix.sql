/*
  # Fix chk_inventory_category_valid — Full Product × Stage Matrix

  ## Problem
  The original CHECK constraint (added 2026-03-06) was incomplete — it covered only
  8 of the 18 valid categories. This caused two separate production outages by rejecting
  valid inserts for: flower_trimmed, smalls_trimmed, smalls_binned, smalls_packaged,
  trim_trimmed, fresh_frozen, rosin_aio, rosin_badder, rosin_jam.

  The constraint was dropped as an emergency hotfix (second incident, batch 260114-ASU).

  ## Changes
  1. DROP the old incomplete constraint (safety — it was dropped in prod but may exist
     in some environments).
  2. ADD the complete constraint covering all 18 categories from valid_categories,
     including inactive smalls_trimmed_legacy (FK safety).
  3. FIX fn_auto_set_inventory_category() trigger:
     - Add 'trimmed' to stage detection (was missing — caused "Flower Trimmed" → flower_bulk)
     - Fix trim type detection to capture "Trim Trimmed" (was excluded by NOT LIKE '%trimmed%')
     - Remove hardcoded 'trim_bulk' early-return for trim type (now uses v_type || '_' || v_stage)
     - Fix product_stage_id fallback: 'Trimmed' now maps to flower_trimmed (not flower_bulk)

  ## Note on enforcement layering
  The FK constraint fk_inventory_category (→ valid_categories) already enforces valid
  category values. This CHECK constraint provides defense-in-depth and faster rejection
  without a FK lookup. IMPORTANT: when new categories are added to valid_categories,
  this constraint must also be updated.

  ## Applies to
  - Production: fonreynkfeqywshijqpi
  - Staging:    cbxwippkzeszvxewhebd
*/

-- Step 1: Drop old incomplete constraint (safe if already gone)
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS chk_inventory_category_valid;

-- Step 2: Add complete constraint — all 18 categories from valid_categories
ALTER TABLE inventory_items
  ADD CONSTRAINT chk_inventory_category_valid
  CHECK (
    category IS NULL
    OR category IN (
      -- Legacy
      'binned',
      -- Flower
      'flower_binned',
      'flower_bucked',
      'flower_bulk',
      'flower_trimmed',
      'flower_packaged',
      -- Flower special
      'fresh_frozen',
      -- Rosin
      'rosin_aio',
      'rosin_badder',
      'rosin_jam',
      -- Smalls
      'smalls_binned',
      'smalls_bucked',
      'smalls_bulk',
      'smalls_trimmed',
      'smalls_trimmed_legacy',
      'smalls_packaged',
      -- Trim
      'trim_bulk',
      'trim_trimmed'
    )
  );

-- Step 3: Fix fn_auto_set_inventory_category()
CREATE OR REPLACE FUNCTION fn_auto_set_inventory_category()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stage_name  text;
  v_product_name text;
  v_type        text;
  v_stage       text;
BEGIN
  -- If category is already set, skip
  IF NEW.category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Primary path: derive from product_name (most reliable)
  IF NEW.product_name IS NOT NULL THEN
    v_product_name := lower(NEW.product_name);

    -- Special product types: fresh_frozen and rosin
    IF v_product_name LIKE '%fresh_frozen%' OR v_product_name LIKE '%fresh frozen%' THEN
      NEW.category := 'fresh_frozen';
      RETURN NEW;
    END IF;

    IF v_product_name LIKE '%rosin%' THEN
      IF    v_product_name LIKE '%badder%' THEN NEW.category := 'rosin_badder';
      ELSIF v_product_name LIKE '%jam%'    THEN NEW.category := 'rosin_jam';
      ELSIF v_product_name LIKE '%aio%'    THEN NEW.category := 'rosin_aio';
      ELSE                                      NEW.category := 'rosin_badder';
      END IF;
      RETURN NEW;
    END IF;

    -- Determine product type
    -- trim type: has 'trim' but is NOT smalls and NOT flower.
    -- Must NOT exclude '%trimmed%' — "Trim Trimmed" should still be trim type.
    IF v_product_name LIKE '%smalls%' THEN
      v_type := 'smalls';
    ELSIF v_product_name LIKE '%trim%'
          AND v_product_name NOT LIKE '%smalls%'
          AND v_product_name NOT LIKE '%flower%' THEN
      v_type := 'trim';
    ELSE
      v_type := 'flower';
    END IF;

    -- Determine stage
    IF    v_product_name LIKE '%binned%'   THEN v_stage := 'binned';
    ELSIF v_product_name LIKE '%bucked%'   THEN v_stage := 'bucked';
    ELSIF v_product_name LIKE '%trimmed%'  THEN v_stage := 'trimmed';
    ELSIF v_product_name LIKE '%packaged%'
       OR v_product_name LIKE '%1lb%'
       OR v_product_name LIKE '%454%'      THEN v_stage := 'packaged';
    ELSE                                        v_stage := 'bulk';
    END IF;

    -- Legacy 'binned' category: unlabelled product at binned stage
    IF v_stage = 'binned'
       AND v_product_name NOT LIKE '%flower%'
       AND v_product_name NOT LIKE '%smalls%' THEN
      NEW.category := 'binned';
      RETURN NEW;
    END IF;

    NEW.category := v_type || '_' || v_stage;
    RETURN NEW;
  END IF;

  -- Fallback: derive from product_stage_id when product_name is unavailable
  -- Defaults to flower type since stage alone does not identify the product type.
  IF NEW.product_stage_id IS NOT NULL THEN
    SELECT name INTO v_stage_name
    FROM product_stages
    WHERE id = NEW.product_stage_id;

    CASE v_stage_name
      WHEN 'Binned'   THEN NEW.category := 'flower_binned';
      WHEN 'Bucked'   THEN NEW.category := 'flower_bucked';
      WHEN 'Trimmed'  THEN NEW.category := 'flower_trimmed';   -- was incorrectly flower_bulk
      WHEN 'Packaged' THEN NEW.category := 'flower_packaged';
      ELSE                 NEW.category := 'flower_bulk';
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$;
