/*
  # Add Authenticated User Access to Strain Metadata

  1. Changes
    - Adds RLS policy for authenticated users to access strain_metadata table
    - Allows authenticated users to read and manage strain metadata

  2. Security
    - Authenticated users have full access to strain metadata
    - This is required for trim sessions and other workflows
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can manage strain_metadata" ON strain_metadata;

-- Add policy for authenticated users to manage strain_metadata
CREATE POLICY "Authenticated users can manage strain_metadata"
  ON strain_metadata
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
