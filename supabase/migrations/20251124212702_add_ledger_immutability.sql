/*
  # Ledger Immutability Constraints

  1. Purpose
    - Enforce append-only ledger pattern
    - Prevent modification of historical movements
    - Maintain audit trail integrity
    - Support regulatory compliance

  2. Policies
    - Block UPDATE on inventory_movements (use correcting entries instead)
    - Block DELETE on inventory_movements (preserve complete history)
    - Optional: Block direct on_hand_qty updates (staged rollout)

  3. Exception Handling
    - Admin role can still perform emergency operations
    - Correcting entries (RECONCILIATION) are the proper way to fix errors

  4. Notes
    - Part of Phase 6: Database Triggers
    - Movements are append-only after this migration
    - Use RECONCILIATION movements to correct errors
*/

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Movements are immutable" ON inventory_movements;
DROP POLICY IF EXISTS "Movements cannot be deleted" ON inventory_movements;
DROP POLICY IF EXISTS "Block direct on_hand_qty updates" ON inventory_items;

-- Policy 1: Block updates to movements (append-only ledger)
CREATE POLICY "Movements are immutable"
  ON inventory_movements
  FOR UPDATE
  TO authenticated
  USING (
    -- Only allow admins to update in emergency situations
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Movements are immutable" ON inventory_movements IS
  'Movements cannot be updated - ledger is append-only. Admins can update for emergency repairs. Use correcting entries for normal corrections.';

-- Policy 2: Block deletes of movements (preserve audit trail)
CREATE POLICY "Movements cannot be deleted"
  ON inventory_movements
  FOR DELETE
  TO authenticated
  USING (
    -- Only allow admins to delete in emergency situations
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Movements cannot be deleted" ON inventory_movements IS
  'Movements cannot be deleted - preserves complete audit trail. Admins can delete for emergency repairs. Use correcting entries (RECONCILIATION) for normal corrections.';

-- Policy 3: Block direct on_hand_qty updates (optional - can be enabled later)
-- NOTE: This policy is commented out initially for staged rollout
-- Uncomment after service migration is complete

/*
CREATE POLICY "Block direct on_hand_qty updates"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow update if NOT changing on_hand_qty
    -- OR if user is admin
    (
      (OLD.on_hand_qty IS NOT DISTINCT FROM inventory_items.on_hand_qty)
      OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      )
    )
  );

COMMENT ON POLICY "Block direct on_hand_qty updates" ON inventory_items IS
  'Prevents direct quantity updates - forces use of inventory_movements ledger. Admins can still update for emergency repairs.';
*/

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS
  'Helper function to check if current user has admin role';

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
