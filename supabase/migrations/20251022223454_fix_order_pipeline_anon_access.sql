/*
  # Fix order_pipeline view access for anonymous users

  1. Problem
    - order_pipeline view only grants SELECT to authenticated users
    - Anonymous users receive 400 errors when accessing the view
    - This blocks the orders page from loading properly

  2. Solution
    - Grant SELECT access to both authenticated AND anon roles
    - This allows the orders screen to load for all users

  3. Security Notes
    - The underlying orders table already has proper RLS policies
    - The view respects those policies automatically
    - Granting view access doesn't bypass table-level security
*/

-- Grant SELECT access to anonymous users on order_pipeline view
GRANT SELECT ON order_pipeline TO anon;

-- Verify authenticated users still have access (already granted in previous migration)
GRANT SELECT ON order_pipeline TO authenticated;
