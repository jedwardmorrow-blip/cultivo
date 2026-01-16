/*
  # Support Location-Based Route Origins

  1. Schema Changes
    - Make `origin_customer_id` nullable in delivery_routes
    - Add `origin_location_id` column to support facility/location origins
    - Update unique constraint to handle both customer and location origins
    - Add check constraint to ensure either customer or location origin is set

  2. Index Updates
    - Add index on origin_location_id for performance
    - Update composite index to handle location-based origins

  3. Data Integrity
    - Ensure exactly one origin type (customer OR location) is set
    - Maintain foreign key integrity for customer references

  4. Backward Compatibility
    - Existing customer-to-customer routes remain valid
    - New location-to-customer routes now supported

  5. Use Cases
    - Facility-to-customer routes (e.g., "facility" -> customer)
    - Customer-to-customer routes (existing functionality)
    - Enables proper manifest generation from any origin location
*/

-- Drop existing unique constraint
ALTER TABLE delivery_routes
DROP CONSTRAINT IF EXISTS unique_customer_route_pair;

-- Make origin_customer_id nullable to allow location-based origins
ALTER TABLE delivery_routes
ALTER COLUMN origin_customer_id DROP NOT NULL;

-- Add origin_location_id column for location-based origins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'origin_location_id'
  ) THEN
    ALTER TABLE delivery_routes
    ADD COLUMN origin_location_id text;
  END IF;
END $$;

-- Add check constraint to ensure exactly one origin type is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_origin_type'
  ) THEN
    ALTER TABLE delivery_routes
    ADD CONSTRAINT check_origin_type CHECK (
      (origin_customer_id IS NOT NULL AND origin_location_id IS NULL) OR
      (origin_customer_id IS NULL AND origin_location_id IS NOT NULL)
    );
  END IF;
END $$;

-- Create new unique constraint that handles both origin types
-- For customer origins: (origin_customer_id, destination_customer_id) must be unique
-- For location origins: (origin_location_id, destination_customer_id) must be unique
CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_origin_route
ON delivery_routes(origin_customer_id, destination_customer_id)
WHERE origin_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_location_origin_route
ON delivery_routes(origin_location_id, destination_customer_id)
WHERE origin_location_id IS NOT NULL;

-- Add index on origin_location_id for performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_origin_location
ON delivery_routes(origin_location_id)
WHERE origin_location_id IS NOT NULL;

-- Add composite index for location-based route lookups
CREATE INDEX IF NOT EXISTS idx_delivery_routes_location_destination
ON delivery_routes(origin_location_id, destination_customer_id)
WHERE origin_location_id IS NOT NULL;

-- Add helpful comment to table
COMMENT ON COLUMN delivery_routes.origin_customer_id IS
'Customer ID when route origin is another customer location. Mutually exclusive with origin_location_id.';

COMMENT ON COLUMN delivery_routes.origin_location_id IS
'Location identifier (e.g., "facility") when route origin is a facility or fixed location. Mutually exclusive with origin_customer_id.';
