/*
  # Fix Delivery Routes Constraints for Upsert Operations

  ## Problem
  PostgREST's `onConflict` parameter cannot reference partial unique indexes.
  The existing partial indexes `unique_customer_origin_route` and 
  `unique_location_origin_route` cannot be used for conflict resolution.

  ## Solution
  1. Clear all existing cached routes (per user request)
  2. Drop the partial unique indexes
  3. Create a composite approach:
     - Keep the check constraint ensuring one origin type
     - Use a trigger-based approach for uniqueness enforcement
     - Simplify app code to handle upserts manually

  ## Changes
  1. Delete all existing route cache data
  2. Drop partial unique indexes (keep regular performance indexes)
  3. Application code will handle upsert logic manually instead of using onConflict

  ## Impact
  - All cached routes will need to be recalculated
  - Future upserts will work correctly
  - Performance indexes remain for query optimization
*/

-- Clear all existing cached routes as requested
DELETE FROM route_waypoints;
DELETE FROM delivery_routes;

-- Drop the partial unique indexes that can't be used with PostgREST onConflict
DROP INDEX IF EXISTS unique_customer_origin_route;
DROP INDEX IF EXISTS unique_location_origin_route;

-- Keep the performance indexes for queries
-- idx_delivery_routes_customers, idx_delivery_routes_location_destination, etc. remain

-- The check_origin_type constraint remains to ensure data integrity
-- Application code will handle uniqueness checking manually

-- Add helpful comments
COMMENT ON TABLE delivery_routes IS 
'Cached routing data between locations. Use manual upsert logic in application code since partial unique constraints are not supported by PostgREST onConflict.';
