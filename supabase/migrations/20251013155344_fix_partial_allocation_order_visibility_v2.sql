/*
  # Fix Partial Allocation Order Visibility

  ## Problem
  Orders with partial allocations don't show up properly:
  - If an order has 5 items and 3 are allocated, it should show in:
    1. Awaiting allocation (for the 2 unallocated items)
    2. In production (for the 3 allocated items)

  ## Solution
  The current view marks an order item based on allocation workflow stages.
  For partial allocations, we should show the most advanced stage while
  still acknowledging there are unallocated portions.

  ## Changes
  Keep the existing logic but add fields to track partial allocation status
  so that orders can be filtered properly at the application level.
*/

-- Drop and recreate the view with partial allocation tracking
DROP VIEW IF EXISTS order_item_workflow_status CASCADE;

CREATE OR REPLACE VIEW order_item_workflow_status AS
SELECT
  oi.id as order_item_id,
  oi.order_id,
  oi.product_id,
  oi.quantity as requested_quantity,
  COUNT(oia.id) as total_allocations,
  COALESCE(SUM(oia.allocated_quantity) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')), 0) as total_allocated_quantity,
  CASE
    -- No allocations at all
    WHEN COUNT(oia.id) = 0 THEN 'awaiting_allocation'
    -- All allocations are ready for delivery
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'ready_for_delivery') = COUNT(oia.id) THEN 'ready_for_delivery'
    -- Some allocations have COA attached
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('coa_attached', 'ready_for_delivery')) > 0 THEN 'coa_attached'
    -- Some allocations are labeled
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'labeled'
    -- Some allocations are packaged
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('packaged', 'labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'packaged'
    -- Some allocations are in packaging
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_packaging') > 0 THEN 'in_packaging'
    -- Some allocations are trimmed
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage IN ('trimmed', 'in_packaging', 'packaged', 'labeled', 'coa_attached', 'ready_for_delivery')) > 0 THEN 'trimmed'
    -- Some allocations are in trimming
    WHEN COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_trimming') > 0 THEN 'in_trimming'
    -- Has allocations but still in allocated stage
    ELSE 'allocated'
  END as current_stage,
  -- Track if this item still needs more allocation
  CASE
    WHEN COUNT(oia.id) = 0 THEN true
    ELSE false
  END as needs_allocation,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'allocated') as allocated_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_trimming') as in_trimming_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'trimmed') as trimmed_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'in_packaging') as in_packaging_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'packaged') as packaged_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'labeled') as labeled_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'coa_attached') as coa_attached_count,
  COUNT(oia.id) FILTER (WHERE oia.workflow_stage = 'ready_for_delivery') as ready_count,
  ROUND(
    COALESCE(AVG(
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
    ), 0)::numeric,
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

-- Recreate order_workflow_summary with better handling
DROP VIEW IF EXISTS order_workflow_summary CASCADE;

CREATE OR REPLACE VIEW order_workflow_summary AS
SELECT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  o.status as order_status,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  o.archived,
  COUNT(DISTINCT oi.id) as total_items,
  -- Count items that need allocation (no allocations at all)
  CASE 
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN 0
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation')
  END as items_awaiting_allocation,
  CASE 
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN COUNT(DISTINCT oi.id)
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'allocated')
  END as items_allocated,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'in_trimming') as items_in_trimming,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'trimmed') as items_trimmed,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'in_packaging') as items_in_packaging,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'packaged') as items_packaged,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'labeled') as items_labeled,
  COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'coa_attached') as items_with_coa,
  CASE 
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN COUNT(DISTINCT oi.id)
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery')
  END as items_ready,
  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN 'ready_to_ship'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation') = COUNT(DISTINCT oi.id) THEN 'not_started'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') = COUNT(DISTINCT oi.id) THEN 'ready_to_ship'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage IN ('packaged', 'labeled', 'coa_attached')) = COUNT(DISTINCT oi.id) THEN 'ready_for_labeling'
    ELSE 'in_production'
  END as overall_stage,
  CASE 
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN 100
    ELSE ROUND(COALESCE(AVG(oiws.progress_percentage), 0)::numeric, 0)
  END as overall_progress_percentage,
  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN true
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') = COUNT(DISTINCT oi.id) THEN true
    ELSE false
  END as ready_to_ship,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN order_item_allocations oia ON oia.order_item_id = oi.id
  AND oia.allocation_status IN ('reserved', 'confirmed')
LEFT JOIN order_item_workflow_status oiws ON oiws.order_item_id = oi.id
GROUP BY o.id, o.order_number, o.customer_id, o.status, o.requested_delivery_date, o.scheduled_delivery_date, o.archived, o.created_at, o.updated_at;

-- Grant permissions
GRANT SELECT ON order_item_workflow_status TO authenticated;
GRANT SELECT ON order_item_workflow_status TO anon;
GRANT SELECT ON order_workflow_summary TO authenticated;
GRANT SELECT ON order_workflow_summary TO anon;