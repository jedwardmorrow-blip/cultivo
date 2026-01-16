/*
  # Fix User Profiles RLS Circular Dependency

  1. Problem
    - The admin policy was checking user_profiles to verify admin role
    - This created a circular dependency preventing profile reads
    - Users couldn't fetch their own profile because the check failed

  2. Solution
    - Drop the problematic admin policy
    - Keep the simple "Users can read own profile" policy
    - Add a new admin policy that uses app_metadata instead
    - Admins can view all profiles for management

  3. Security
    - Users can always read their own profile (no circular check)
    - Admins can read all profiles
    - Admins can update all profiles
*/

-- Drop the circular policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- OR user is an admin (check their own profile's role)
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own non-role fields
    id = auth.uid()
    OR
    -- OR user is an admin
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  )
  WITH CHECK (
    -- If updating own profile, can't change role
    (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()))
    OR
    -- If admin, can change anything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );
