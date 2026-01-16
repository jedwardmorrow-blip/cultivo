/*
  # Add Missing INSERT and DELETE Policies for app_settings
  
  1. Changes
    - Add INSERT policy for authenticated users to create new settings
    - Add DELETE policy for authenticated users to remove settings
  
  2. Problem Being Solved
    - Settings component fails when trying to save new routing settings
    - The previous migration only added SELECT and UPDATE policies
    - Users need INSERT permission to create new setting records
  
  3. Security
    - Policies restricted to authenticated users only
    - Follows same pattern as UPDATE policy
*/

-- Add INSERT policy for app_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_settings' 
    AND policyname = 'Authenticated users can insert app_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert app_settings" 
      ON app_settings 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true)';
  END IF;
END $$;

-- Add DELETE policy for app_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_settings' 
    AND policyname = 'Authenticated users can delete app_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete app_settings" 
      ON app_settings 
      FOR DELETE 
      TO authenticated 
      USING (true)';
  END IF;
END $$;