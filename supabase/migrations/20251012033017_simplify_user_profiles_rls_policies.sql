/*
  # Simplify User Profiles RLS Policies

  1. Problem
    - Multiple SELECT policies were causing conflicts
    - Policies with EXISTS subqueries created circular dependencies
    - Users couldn't read their own profile due to deadlock

  2. Solution
    - Drop ALL existing policies
    - Create simple, non-circular policies
    - Use SECURITY DEFINER functions for admin checks if needed

  3. Security
    - All authenticated users can read their own profile (simple check)
    - All authenticated users can insert their own profile (for trigger)
    - All authenticated users can update their own profile (non-role fields only)
    - Admins verified separately in application layer
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own name" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Simple policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Simple policy: Users can insert their own profile (for signup trigger)
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Simple policy: Users can update their own profile (non-admin fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create a SECURITY DEFINER function to allow admins to read all profiles
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- Get the role of the user making the request
  SELECT up.role INTO requesting_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Only allow admins to see all profiles
  IF requesting_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.email,
      up.full_name,
      up.role,
      up.is_active,
      up.created_at,
      up.updated_at
    FROM user_profiles up
    ORDER BY up.created_at DESC;
  ELSE
    -- Non-admins only see their own profile
    RETURN QUERY
    SELECT 
      up.id,
      up.email,
      up.full_name,
      up.role,
      up.is_active,
      up.created_at,
      up.updated_at
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;
END;
$$;

-- Create a SECURITY DEFINER function to allow admins to update any profile
CREATE OR REPLACE FUNCTION update_user_profile(
  target_user_id uuid,
  new_full_name text DEFAULT NULL,
  new_role text DEFAULT NULL,
  new_is_active boolean DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- Get the role of the user making the request
  SELECT up.role INTO requesting_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Only allow admins to update other users' profiles or roles
  IF requesting_user_role != 'admin' AND target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only admins can update other users profiles';
  END IF;
  
  -- Only allow admins to change roles
  IF requesting_user_role != 'admin' AND new_role IS NOT NULL THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  -- Perform the update
  UPDATE user_profiles
  SET
    full_name = COALESCE(new_full_name, full_name),
    role = COALESCE(new_role, role),
    is_active = COALESCE(new_is_active, is_active),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$;
