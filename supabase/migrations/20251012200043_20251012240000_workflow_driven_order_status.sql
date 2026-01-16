/*
  # Workflow-Driven Order Status System

  ## Overview
  Transforms order fulfillment from manual checkbox tracking to automatic workflow-driven 
  status updates. Order statuses are now derived from actual inventory stages as items 
  move through trim and packaging sessions.

  ## Key Changes
  1. Remove redundant manual tracking from order_fulfillment_checklist
  2. Add workflow_stage enum and tracking to order_item_allocations
  3. Create automated triggers that link sessions to allocations
  4. Build computed views for automatic status derivation
  5. Add session linking for bidirectional visibility

  ## Workflow Stages
  - allocated: Inventory reserved
  - in_trimming: Currently being trimmed in active session
  - trimmed: Trim complete, ready for packaging
  - in_packaging: Currently being packaged in active session  
  - packaged: Packaging complete, ready for labeling
  - labeled: Labels applied manually
  - coa_attached: COA attached manually
  - ready_for_delivery: All steps complete, ready to ship

  ## Automation
  When trim/packaging sessions start or complete, allocations for matching strains
  automatically update their workflow_stage, providing real-time status tracking.
*/

-- Drop old views that depend on columns we're modifying
DROP VIEW IF EXISTS order_fulfillment_status CASCADE;

-- Remove redundant manual tracking columns
ALTER TABLE order_fulfillment_checklist
DROP COLUMN IF EXISTS trim_complete,
DROP COLUMN IF EXISTS packaging_complete,
DROP COLUMN IF EXISTS labeling_complete,
DROP COLUMN IF EXISTS coa_attached;

-- Add timestamp fields for manual stages
ALTER TABLE order_fulfillment_checklist
ADD COLUMN IF NOT EXISTS label_applied_at timestamptz,
ADD COLUMN IF NOT EXISTS coa_attached_at timestamptz;

-- Create workflow stage enum
DO $$ BEGIN
  CREATE TYPE allocation_workflow_stage AS ENUM (
    'allocated',
    'in_trimming',
    'trimmed',
    'in_packaging',
    'packaged',
    'labeled',
    'coa_attached',
    'ready_for_delivery'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add workflow tracking fields to allocations
ALTER TABLE order_item_allocations
ADD COLUMN IF NOT EXISTS workflow_stage allocation_workflow_stage DEFAULT 'allocated',
ADD COLUMN IF NOT EXISTS active_trim_session_id uuid REFERENCES trim_sessions(id),
ADD COLUMN IF NOT EXISTS active_packaging_session_id uuid REFERENCES packaging_sessions(id),
ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS trimming_started_at timestamptz,
ADD COLUMN IF NOT EXISTS trimming_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS packaging_started_at timestamptz,
ADD COLUMN IF NOT EXISTS packaging_completed_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_allocations_trim_session ON order_item_allocations(active_trim_session_id);
CREATE INDEX IF NOT EXISTS idx_allocations_packaging_session ON order_item_allocations(active_packaging_session_id);
CREATE INDEX IF NOT EXISTS idx_allocations_workflow_stage ON order_item_allocations(workflow_stage);

-- View: order_item_workflow_status
-- Computes current stage from allocations
CREATE OR REPLACE VIEW order_item_workflow_status AS
SELECT
  oi.id as order_item_id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  COUNT(oia.id) as total_allocations,
  CASE
    WHEN COUNT(oia.id) = 0 THEN 'awaiting_allocation'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'ready_for_delivery') = COUNT(oia.id) THEN 'ready_for_delivery'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('coa_attached', 'ready_for_delivery')) > 0 THEN 'coa_attached'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'labeled'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('packaged', 'labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'packaged'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_packaging') > 0 THEN 'in_packaging'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('trimmed', 'in_packaging', 'packaged', 'labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'trimmed'
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_trimming') > 0 THEN 'in_trimming'
    ELSE 'allocated'
  END as current_stage,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'allocated') as allocated_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_trimming') as in_trimming_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'trimmed') as trimmed_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_packaging') as in_packaging_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'packaged') as packaged_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'labeled') as labeled_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'coa_attached') as coa_attached_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'ready_for_delivery') as ready_count,
  ROUND(
    AVG(
      CASE oia.workflow_stage
        WHEN 'allocated' THEN 20
        WHEN 'in_trimming' THEN 30
        WHEN 'trimmed' THEN 40
        WHEN 'in_packaging' THEN 50
        WHEN 'packaged' THEN 70
        WHEN 'labeled' THEN 85
        WHEN 'coa_attached' THEN 95
        WHEN 'ready_for_delivery' THEN 100
        ELSE 0
      END
    )::numeric,
    0
  ) as progress_percentage,
  STRING_AGG(DISTINCT ts.id::text, ',') FILTER (WHERE oia.active_trim_session_id IS NOT NULL) as active_trim_sessions,
  STRING_AGG(DISTINCT ps.id::text, ',') FILTER (WHERE oia.active_packaging_session_id IS NOT NULL) as active_packaging_sessions,
  MAX(oia.stage_entered_at) as last_stage_change
FROM order_items oi
LEFT JOIN order_item_allocations oia ON oia.order_item_id = oi.id
  AND oia.allocation_status IN ('reserved', 'confirmed')
LEFT JOIN trim_sessions ts ON ts.id = oia.active_trim_session_id
LEFT JOIN packaging_sessions ps ON ps.id = oia.active_packaging_session_id
GROUP BY oi.id, oi.order_id, oi.product_id, oi.quantity;

-- View: order_workflow_summary
-- Order-level workflow aggregation
CREATE OR REPLACE VIEW order_workflow_summary AS
SELECT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  o.status as order_status,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  COUNT(DISTINCT oi.id) as total_items,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation') as items_awaiting_allocation,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'allocated') as items_allocated,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'in_trimming') as items_in_trimming,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'trimmed') as items_trimmed,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'in_packaging') as items_in_packaging,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'packaged') as items_packaged,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'labeled') as items_labeled,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'coa_attached') as items_with_coa,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') as items_ready,
  CASE
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation') = COUNT(DISTINCT oi.id) THEN 'not_started'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') = COUNT(DISTINCT oi.id) THEN 'ready_to_ship'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage IN ('packaged', 'labeled', 'coa_attached')) = COUNT(DISTINCT oi.id) THEN 'ready_for_labeling'
    ELSE 'in_production'
  END as overall_stage,
  ROUND(AVG(oiws.progress_percentage)::numeric, 0) as overall_progress_percentage,
  CASE
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') = COUNT(DISTINCT oi.id) THEN true
    ELSE false
  END as ready_to_ship,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN order_item_workflow_status oiws ON oiws.order_item_id = oi.id
WHERE o.archived = false
GROUP BY o.id, o.order_number, o.customer_id, o.status, o.requested_delivery_date, o.scheduled_delivery_date, o.created_at, o.updated_at;

-- View: session_order_links  
-- Shows which sessions affect which orders
CREATE OR REPLACE VIEW session_order_links AS
SELECT DISTINCT
  ts.id as session_id,
  'trim' as session_type,
  ts.session_status,
  ts.trimmer_name as worker_name,
  ts.strain,
  oia.order_id,
  o.order_number,
  COUNT(DISTINCT oia.order_item_id) as affected_items,
  ts.started_at as session_started_at,
  ts.completed_at as session_completed_at
FROM trim_sessions ts
INNER JOIN order_item_allocations oia ON oia.active_trim_session_id = ts.id
INNER JOIN orders o ON o.id = oia.order_id
GROUP BY ts.id, ts.session_status, ts.trimmer_name, ts.strain, oia.order_id, o.order_number, ts.started_at, ts.completed_at

UNION ALL

SELECT DISTINCT
  ps.id as session_id,
  'packaging' as session_type,
  ps.session_status,
  ps.packager_name as worker_name,
  ps.strain,
  oia.order_id,
  o.order_number,
  COUNT(DISTINCT oia.order_item_id) as affected_items,
  ps.started_at as session_started_at,
  ps.completed_at as session_completed_at
FROM packaging_sessions ps
INNER JOIN order_item_allocations oia ON oia.active_packaging_session_id = ps.id
INNER JOIN orders o ON o.id = oia.order_id
GROUP BY ps.id, ps.session_status, ps.packager_name, ps.strain, oia.order_id, o.order_number, ps.started_at, ps.completed_at;

-- Function: Link allocations to trim session when it starts
CREATE OR REPLACE FUNCTION link_allocations_to_trim_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'active' AND (OLD.session_status IS NULL OR OLD.session_status != 'active') THEN
    UPDATE order_item_allocations
    SET
      active_trim_session_id = NEW.id,
      workflow_stage = 'in_trimming',
      trimming_started_at = now(),
      stage_entered_at = now(),
      updated_at = now()
    WHERE strain = NEW.strain
      AND workflow_stage = 'allocated'
      AND inventory_type = 'bulk'
      AND allocation_status IN ('reserved', 'confirmed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update allocations when trim session completes
CREATE OR REPLACE FUNCTION update_allocations_on_trim_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    UPDATE order_item_allocations
    SET
      workflow_stage = 'trimmed',
      trimming_completed_at = now(),
      stage_entered_at = now(),
      updated_at = now()
    WHERE active_trim_session_id = NEW.id
      AND workflow_stage = 'in_trimming';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Link allocations to packaging session when it starts
CREATE OR REPLACE FUNCTION link_allocations_to_packaging_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'active' AND (OLD.session_status IS NULL OR OLD.session_status != 'active') THEN
    UPDATE order_item_allocations
    SET
      active_packaging_session_id = NEW.id,
      workflow_stage = 'in_packaging',
      packaging_started_at = now(),
      stage_entered_at = now(),
      updated_at = now()
    WHERE strain = NEW.strain
      AND workflow_stage IN ('trimmed', 'allocated')
      AND inventory_type = 'bulk'
      AND allocation_status IN ('reserved', 'confirmed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update allocations when packaging session completes
CREATE OR REPLACE FUNCTION update_allocations_on_packaging_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    UPDATE order_item_allocations
    SET
      workflow_stage = 'packaged',
      packaging_completed_at = now(),
      stage_entered_at = now(),
      updated_at = now()
    WHERE active_packaging_session_id = NEW.id
      AND workflow_stage = 'in_packaging';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trim_session_allocation_link_trigger ON trim_sessions;
CREATE TRIGGER trim_session_allocation_link_trigger
  AFTER INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION link_allocations_to_trim_session();

DROP TRIGGER IF EXISTS trim_session_complete_trigger ON trim_sessions;
CREATE TRIGGER trim_session_complete_trigger
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_allocations_on_trim_complete();

DROP TRIGGER IF EXISTS packaging_session_allocation_link_trigger ON packaging_sessions;
CREATE TRIGGER packaging_session_allocation_link_trigger
  AFTER INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION link_allocations_to_packaging_session();

DROP TRIGGER IF EXISTS packaging_session_complete_trigger ON packaging_sessions;
CREATE TRIGGER packaging_session_complete_trigger
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_allocations_on_packaging_complete();

-- Update fulfillment checklist based on allocations
CREATE OR REPLACE FUNCTION update_fulfillment_from_allocations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE order_fulfillment_checklist
  SET
    inventory_allocated = EXISTS(
      SELECT 1 FROM order_item_allocations
      WHERE order_item_id = order_fulfillment_checklist.order_item_id
      AND allocation_status IN ('reserved', 'confirmed')
    ),
    updated_at = now()
  WHERE order_item_id IN (
    SELECT DISTINCT order_item_id
    FROM order_item_allocations
    WHERE id = COALESCE(NEW.id, OLD.id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS allocation_fulfillment_update_trigger ON order_item_allocations;
CREATE TRIGGER allocation_fulfillment_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_item_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_fulfillment_from_allocations();
