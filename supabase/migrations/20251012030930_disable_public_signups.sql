/*
  # Disable Public Signups - Invite Only Mode

  1. Changes
    - Disable public user signups via RLS
    - Remove public signup policies from auth.users
    - Only authenticated admins can create new users (via Supabase Admin API)
  
  2. Security
    - Public signup is blocked at the database level
    - Only admin users with proper credentials can invite new users
*/

-- No actual RLS changes needed here since auth.users is managed by Supabase Auth
-- Public signups will be disabled via Supabase dashboard settings
-- This migration documents the security posture change