/*
  # Allocation Transformation Triggers

  ## Overview
  This migration creates trigger functions that automatically transform allocations
  as inventory moves through processing stages. When bucked material is trimmed,
  allocations are split and transformed to reflect the actual bulk output.

  ## Functions Created

  ### 1. transform_allocations_on_trim_complete()
  Triggered when trim session completes:
  - Finds all bucked allocations linked to the session
  - Marks original bucked allocations as 'consumed'
  - Creates new bulk allocations based on actual output (flower, smalls, trim)
  - Calculates variance between projected and actual yields
  - Detects shortfalls and creates notifications
  - Links new allocations to parent via parent_allocation_id

  ### 2. check_allocation_shortfalls()
  Helper function to check if order requirements are still met after transformation

  ### 3. create_allocation_shortfall_notification()
  Creates system notifications when shortfalls are detected
*/

-- Function: Check if order item has sufficient allocations after transformation
CREATE OR REPLACE FUNCTION check_allocation_shortfalls(p_order_item_id uuid)
RETURNS TABLE(
  has_shortfall boolean,
  required_quantity numeric,
  allocated_quantity numeric,
  shortfall_quantity numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.quantity > COALESCE(SUM(oia.allocated_quantity), 0) as has_shortfall,
    oi.quantity as required_quantity,
    COALESCE(SUM(oia.allocated_quantity), 0) as allocated_quantity,
    oi.quantity - COALESCE(SUM(oia.allocated_quantity), 0) as shortfall_quantity
  FROM order_items oi
  LEFT JOIN order_item_allocations oia ON oia.order_item_id = oi.id
    AND oia.allocation_status IN ('reserved', 'confirmed')
  WHERE oi.id = p_order_item_id
  GROUP BY oi.id, oi.quantity;
END;
$$ LANGUAGE plpgsql;

-- Function: Create shortfall notification
CREATE OR REPLACE FUNCTION create_allocation_shortfall_notification(
  p_order_id uuid,
  p_order_item_id uuid,
  p_shortfall numeric,
  p_product_name text
)
RETURNS void AS $$
DECLARE
  v_order_number text;
BEGIN
  -- Get order number
  SELECT order_number INTO v_order_number
  FROM orders WHERE id = p_order_id;

  -- Create notification
  INSERT INTO system_notifications (
    notification_type,
    severity,
    title,
    message,
    related_entity_type,
    related_entity_id,
    action_required,
    action_url
  )
  VALUES (
    'allocation_shortfall',
    'critical',
    'Allocation Shortfall Detected - Order ' || v_order_number,
    'After processing, order item "' || p_product_name || '" is short ' || p_shortfall || 'g. Re-allocation required.',
    'order_item',
    p_order_item_id,
    true,
    '/orders/' || p_order_id
  );

  -- Update order status to flag for review
  UPDATE orders
  SET
    status = CASE
      WHEN status = 'ready_for_delivery' THEN 'pending'
      ELSE status
    END
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Transform allocations when trim session completes
CREATE OR REPLACE FUNCTION transform_allocations_on_trim_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_allocation RECORD;
  v_new_flower_id uuid;
  v_new_smalls_id uuid;
  v_new_trim_id uuid;
  v_total_conversion_rate numeric;
  v_flower_weight numeric;
  v_smalls_weight numeric;
  v_trim_weight numeric;
  v_shortfall_check RECORD;
  v_product_name text;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN

    -- Calculate total conversion rate for variance tracking
    v_total_conversion_rate := (NEW.big_buds_grams + NEW.small_buds_grams + NEW.trim_grams) / NULLIF(NEW.pulled_weight, 0);

    -- Find all bucked allocations that should be linked to this session
    -- Match by strain and active_trim_session_id
    FOR v_allocation IN
      SELECT
        oia.*,
        oi.quantity as order_item_quantity,
        p.name as product_name
      FROM order_item_allocations oia
      JOIN order_items oi ON oi.id = oia.order_item_id
      JOIN products p ON p.id = oi.product_id
      WHERE oia.active_trim_session_id = NEW.id
        AND oia.inventory_type = 'bulk'
        AND oia.workflow_stage = 'in_trimming'
        AND oia.allocation_status IN ('reserved', 'confirmed')
    LOOP

      -- Calculate proportional weights for this allocation based on pulled weight
      -- This handles cases where multiple allocations are in the same trim session
      v_flower_weight := (v_allocation.allocated_quantity / NULLIF(NEW.pulled_weight, 0)) * NEW.big_buds_grams;
      v_smalls_weight := (v_allocation.allocated_quantity / NULLIF(NEW.pulled_weight, 0)) * NEW.small_buds_grams;
      v_trim_weight := (v_allocation.allocated_quantity / NULLIF(NEW.pulled_weight, 0)) * NEW.trim_grams;

      -- Mark original allocation as consumed
      UPDATE order_item_allocations
      SET
        allocation_status = 'consumed',
        consumed_at = now(),
        variance_grams = (v_flower_weight + v_smalls_weight + v_trim_weight) - v_allocation.allocated_quantity,
        is_transformed = true,
        transformation_session_id = NEW.id,
        updated_at = now()
      WHERE id = v_allocation.id;

      -- Create new bulk inventory records if they don't exist yet
      -- (This happens in handle_trim_session_complete, but we reference them here)

      -- Create flower allocation if flower was produced
      IF v_flower_weight > 0 THEN
        -- Find or use the bulk inventory created by handle_trim_session_complete
        SELECT id INTO v_new_flower_id
        FROM internal_bulk_inventory
        WHERE strain = NEW.strain
          AND batch_id = NEW.batch_id
          AND product_type = 'flower'
          AND source_package_id = NEW.package_id
          AND trim_date = NEW.session_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_new_flower_id IS NOT NULL THEN
          INSERT INTO order_item_allocations (
            order_id,
            order_item_id,
            inventory_type,
            inventory_id,
            strain,
            product_type,
            allocated_quantity,
            allocation_status,
            workflow_stage,
            parent_allocation_id,
            projected_quantity,
            transformation_session_id,
            notes,
            allocated_by
          )
          VALUES (
            v_allocation.order_id,
            v_allocation.order_item_id,
            'bulk',
            v_new_flower_id,
            v_allocation.strain,
            'flower',
            v_flower_weight,
            v_allocation.allocation_status,
            'trimmed',
            v_allocation.id,
            v_allocation.projected_quantity,
            NEW.id,
            'Auto-transformed from bucked allocation after trim session',
            'system'
          );

          -- Update bulk inventory allocated weight
          UPDATE internal_bulk_inventory
          SET allocated_weight_grams = allocated_weight_grams + v_flower_weight
          WHERE id = v_new_flower_id;
        END IF;
      END IF;

      -- Create smalls allocation if smalls were produced
      IF v_smalls_weight > 0 THEN
        SELECT id INTO v_new_smalls_id
        FROM internal_bulk_inventory
        WHERE strain = NEW.strain
          AND batch_id = NEW.batch_id
          AND product_type = 'smalls'
          AND source_package_id = NEW.package_id
          AND trim_date = NEW.session_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_new_smalls_id IS NOT NULL THEN
          INSERT INTO order_item_allocations (
            order_id,
            order_item_id,
            inventory_type,
            inventory_id,
            strain,
            product_type,
            allocated_quantity,
            allocation_status,
            workflow_stage,
            parent_allocation_id,
            projected_quantity,
            transformation_session_id,
            notes,
            allocated_by
          )
          VALUES (
            v_allocation.order_id,
            v_allocation.order_item_id,
            'bulk',
            v_new_smalls_id,
            v_allocation.strain,
            'smalls',
            v_smalls_weight,
            v_allocation.allocation_status,
            'trimmed',
            v_allocation.id,
            v_allocation.projected_quantity,
            NEW.id,
            'Auto-transformed from bucked allocation after trim session',
            'system'
          );

          -- Update bulk inventory allocated weight
          UPDATE internal_bulk_inventory
          SET allocated_weight_grams = allocated_weight_grams + v_smalls_weight
          WHERE id = v_new_smalls_id;
        END IF;
      END IF;

      -- Create trim allocation if trim was produced (usually not allocated to orders, but track for completeness)
      IF v_trim_weight > 0 THEN
        SELECT id INTO v_new_trim_id
        FROM internal_bulk_inventory
        WHERE strain = NEW.strain
          AND batch_id = NEW.batch_id
          AND product_type = 'trim'
          AND source_package_id = NEW.package_id
          AND trim_date = NEW.session_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_new_trim_id IS NOT NULL AND v_allocation.product_name ILIKE '%trim%' THEN
          INSERT INTO order_item_allocations (
            order_id,
            order_item_id,
            inventory_type,
            inventory_id,
            strain,
            product_type,
            allocated_quantity,
            allocation_status,
            workflow_stage,
            parent_allocation_id,
            projected_quantity,
            transformation_session_id,
            notes,
            allocated_by
          )
          VALUES (
            v_allocation.order_id,
            v_allocation.order_item_id,
            'bulk',
            v_new_trim_id,
            v_allocation.strain,
            'trim',
            v_trim_weight,
            v_allocation.allocation_status,
            'trimmed',
            v_allocation.id,
            v_allocation.projected_quantity,
            NEW.id,
            'Auto-transformed from bucked allocation after trim session',
            'system'
          );

          -- Update bulk inventory allocated weight
          UPDATE internal_bulk_inventory
          SET allocated_weight_grams = allocated_weight_grams + v_trim_weight
          WHERE id = v_new_trim_id;
        END IF;
      END IF;

      -- Check for shortfalls after transformation
      SELECT * INTO v_shortfall_check
      FROM check_allocation_shortfalls(v_allocation.order_item_id);

      IF v_shortfall_check.has_shortfall THEN
        -- Create notification for shortfall
        PERFORM create_allocation_shortfall_notification(
          v_allocation.order_id,
          v_allocation.order_item_id,
          v_shortfall_check.shortfall_quantity,
          v_allocation.product_name
        );
      END IF;

    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for allocation transformation
DROP TRIGGER IF EXISTS allocation_transformation_trigger ON trim_sessions;
CREATE TRIGGER allocation_transformation_trigger
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION transform_allocations_on_trim_complete();

-- Function: Update allocated weights when allocations are created
CREATE OR REPLACE FUNCTION update_inventory_allocated_weight()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add to allocated weight
    IF NEW.inventory_type = 'bucked' THEN
      UPDATE internal_bucked_inventory
      SET allocated_weight_grams = allocated_weight_grams + NEW.allocated_quantity
      WHERE package_id = NEW.inventory_id;
    ELSIF NEW.inventory_type = 'bulk' THEN
      UPDATE internal_bulk_inventory
      SET allocated_weight_grams = allocated_weight_grams + NEW.allocated_quantity
      WHERE id = NEW.inventory_id::uuid;
    ELSIF NEW.inventory_type = 'packaged' THEN
      UPDATE internal_packaged_inventory
      SET units_allocated = units_allocated + NEW.allocated_quantity::integer
      WHERE id = NEW.inventory_id::uuid;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove from allocated weight
    IF OLD.inventory_type = 'bucked' THEN
      UPDATE internal_bucked_inventory
      SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - OLD.allocated_quantity)
      WHERE package_id = OLD.inventory_id;
    ELSIF OLD.inventory_type = 'bulk' THEN
      UPDATE internal_bulk_inventory
      SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - OLD.allocated_quantity)
      WHERE id = OLD.inventory_id::uuid;
    ELSIF OLD.inventory_type = 'packaged' THEN
      UPDATE internal_packaged_inventory
      SET units_allocated = GREATEST(0, units_allocated - OLD.allocated_quantity::integer)
      WHERE id = OLD.inventory_id::uuid;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle quantity changes
    IF NEW.allocated_quantity != OLD.allocated_quantity THEN
      IF NEW.inventory_type = 'bucked' THEN
        UPDATE internal_bucked_inventory
        SET allocated_weight_grams = allocated_weight_grams - OLD.allocated_quantity + NEW.allocated_quantity
        WHERE package_id = NEW.inventory_id;
      ELSIF NEW.inventory_type = 'bulk' THEN
        UPDATE internal_bulk_inventory
        SET allocated_weight_grams = allocated_weight_grams - OLD.allocated_quantity + NEW.allocated_quantity
        WHERE id = NEW.inventory_id::uuid;
      ELSIF NEW.inventory_type = 'packaged' THEN
        UPDATE internal_packaged_inventory
        SET units_allocated = units_allocated - OLD.allocated_quantity::integer + NEW.allocated_quantity::integer
        WHERE id = NEW.inventory_id::uuid;
      END IF;
    END IF;

    -- Handle status changes (released allocations)
    IF OLD.allocation_status IN ('reserved', 'confirmed') AND NEW.allocation_status IN ('released', 'consumed') THEN
      IF NEW.inventory_type = 'bucked' THEN
        UPDATE internal_bucked_inventory
        SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.allocated_quantity)
        WHERE package_id = NEW.inventory_id;
      ELSIF NEW.inventory_type = 'bulk' THEN
        UPDATE internal_bulk_inventory
        SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.allocated_quantity)
        WHERE id = NEW.inventory_id::uuid;
      ELSIF NEW.inventory_type = 'packaged' THEN
        UPDATE internal_packaged_inventory
        SET units_allocated = GREATEST(0, units_allocated - NEW.allocated_quantity::integer)
        WHERE id = NEW.inventory_id::uuid;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory allocated weight updates
DROP TRIGGER IF EXISTS allocation_inventory_weight_trigger ON order_item_allocations;
CREATE TRIGGER allocation_inventory_weight_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_item_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_allocated_weight();

COMMENT ON FUNCTION transform_allocations_on_trim_complete() IS 'Automatically transforms bucked allocations to bulk allocations when trim session completes';
COMMENT ON FUNCTION check_allocation_shortfalls(uuid) IS 'Checks if order item has sufficient allocations after transformation';
COMMENT ON FUNCTION create_allocation_shortfall_notification(uuid, uuid, numeric, text) IS 'Creates system notification when allocation shortfall is detected';
COMMENT ON FUNCTION update_inventory_allocated_weight() IS 'Maintains allocated_weight_grams in sync with allocations';
