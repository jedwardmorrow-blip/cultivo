/*
  # Enable Multi-Stage Order Visibility for Partial Allocations

  ## Problem
  Orders with partial allocations only appear in one workflow column, even when they have:
  - Some items awaiting allocation
  - Other items in production

  Example: Sol Flower with 5 items where 3 are allocated should appear in BOTH:
  1. Awaiting Allocation (for the 2 unallocated items)
  2. In Production (for the 3 allocated items)

  ## Solution
  Add boolean flags to order_workflow_summary that indicate which workflow stages
  an order qualifies for. This allows the frontend to display orders in multiple
  columns simultaneously, with stage-specific item counts.

  ## New Fields
  - has_items_awaiting_allocation: true if any items need allocation
  - has_items_in_production: true if any items are being trimmed/packaged
  - has_items_ready_for_labeling: true if any items are packaged but not labeled
  - has_items_ready_to_ship: true if any items are fully complete

  These work alongside the existing overall_stage field which represents the
  most advanced stage of any item in the order.
*/

-- Drop and recreate order_workflow_summary with multi-stage flags
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

  -- Original stage counts (unchanged)
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

  -- Overall stage (most advanced) - unchanged
  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN 'ready_to_ship'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation') = COUNT(DISTINCT oi.id) THEN 'not_started'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') = COUNT(DISTINCT oi.id) THEN 'ready_to_ship'
    WHEN COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage IN ('packaged', 'labeled', 'coa_attached')) = COUNT(DISTINCT oi.id) THEN 'ready_for_labeling'
    ELSE 'in_production'
  END as overall_stage,

  -- Overall progress percentage - unchanged
  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN 100
    ELSE ROUND(COALESCE(AVG(oiws.progress_percentage), 0)::numeric, 0)
  END as overall_progress_percentage,

  -- NEW: Multi-stage visibility flags
  -- An order appears in a workflow column if it has ANY items at that stage
  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN false
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'awaiting_allocation') > 0
  END as has_items_awaiting_allocation,

  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN false
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage IN ('allocated', 'in_trimming', 'trimmed', 'in_packaging')) > 0
  END as has_items_in_production,

  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN false
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage IN ('packaged', 'labeled', 'coa_attached')) > 0
  END as has_items_ready_for_labeling,

  CASE
    WHEN o.status = 'completed' AND COUNT(DISTINCT oi.id) > 0 AND COUNT(oia.id) = 0 THEN true
    ELSE COUNT(DISTINCT oi.id) FILTER (WHERE oiws.current_stage = 'ready_for_delivery') > 0
  END as has_items_ready_to_ship,

  -- Ready to ship flag (all items complete) - unchanged
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
GRANT SELECT ON order_workflow_summary TO authenticated;
GRANT SELECT ON order_workflow_summary TO anon;
