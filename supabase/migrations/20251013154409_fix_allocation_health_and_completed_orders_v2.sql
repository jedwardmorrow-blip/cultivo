/*
  # Fix Allocation Health and Completed Order Display

  ## Issues Fixed
  1. AllocationHealth component queries `archived` field but it's not in the view's SELECT
  2. Completed orders without allocations show as needing allocation instead of 100% complete
  3. Orders not run through the allocation system appear broken

  ## Changes
  1. Add `archived` field to order_workflow_summary view
  2. For completed orders with no allocations, mark them as 100% allocated (legacy orders)
  3. Update the view logic to handle orders without workflow data gracefully
*/

-- Drop and recreate order_workflow_summary with archived field and better handling
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
  -- For completed orders with no allocations, show as fully allocated (legacy orders)
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
GRANT SELECT ON order_workflow_summary TO authenticated;
GRANT SELECT ON order_workflow_summary TO anon;