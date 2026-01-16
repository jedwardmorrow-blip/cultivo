/*
  # Fix User Profile Creation Trigger
  
  1. Changes
    - Drop and recreate the handle_new_user function with better error handling
    - Ensure SECURITY DEFINER is set to bypass RLS
    - Add explicit error logging
  
  2. Security
    - Function runs with definer's privileges (bypasses RLS)
    - First user automatically gets admin role
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  new_role text;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  
  -- Determine role (first user is admin)
  IF user_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'user';
  END IF;
  
  -- Insert new profile
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_role,
    true
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
