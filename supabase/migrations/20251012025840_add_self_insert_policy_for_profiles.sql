/*
  # Add Self-Insert Policy for User Profiles
  
  1. Changes
    - Add policy allowing users to insert their own profile during signup
    - This ensures the signup flow works even if the trigger fails
  
  2. Security
    - Users can only insert a profile with their own user ID
    - This prevents users from creating profiles for other users
*/

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
