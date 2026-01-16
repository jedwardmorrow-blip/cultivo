/*
  # Enhance Manifests for Multi-Stop Routes with Visual Maps

  1. Schema Changes
    - Add `origin_customer_id` column to manifests table
      - Nullable UUID reference to customers table
      - Null value indicates origin is the facility (Home)
    - Add `route_map_url` column to manifests table
      - Stores URL to generated static map image
    - Update `stop_number` column to integer type for proper ordering

  2. Security
    - Maintain existing RLS policies

  3. Notes
    - Origin customer ID allows tracking which dispensary the route starts from
    - Null origin means starting from facility
    - Route map URL will point to Supabase storage bucket or data URL
*/

-- Add origin_customer_id column to track route starting location
ALTER TABLE manifests
ADD COLUMN IF NOT EXISTS origin_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Add route_map_url column to store generated map image
ALTER TABLE manifests
ADD COLUMN IF NOT EXISTS route_map_url text;

-- Create index for origin lookups
CREATE INDEX IF NOT EXISTS idx_manifests_origin_customer ON manifests(origin_customer_id);

-- Add comment explaining null origin means facility
COMMENT ON COLUMN manifests.origin_customer_id IS 'Customer location where route originates. NULL means starting from facility (Home).';
COMMENT ON COLUMN manifests.route_map_url IS 'URL or data URL to static map image showing the route visualization.';
