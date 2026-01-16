/*
  # Add 'bucking' to pending_conversions session_type constraint

  ## Problem
  The pending_conversions table has a check constraint that only allows
  'trim' and 'packaging' as session_type values. This prevents bucking
  sessions from creating pending conversions.

  ## Solution
  Drop and recreate the constraint to include 'bucking' as a valid value.

  ## Changes
  - Drops existing constraint: pending_conversions_session_type_check
  - Creates new constraint allowing: 'bucking', 'trim', 'packaging'
*/

-- Drop the existing constraint
ALTER TABLE pending_conversions
DROP CONSTRAINT IF EXISTS pending_conversions_session_type_check;

-- Add the updated constraint with 'bucking' included
ALTER TABLE pending_conversions
ADD CONSTRAINT pending_conversions_session_type_check
CHECK (session_type = ANY (ARRAY['bucking'::text, 'trim'::text, 'packaging'::text]));

COMMENT ON CONSTRAINT pending_conversions_session_type_check ON pending_conversions IS
'Ensures session_type is one of: bucking, trim, or packaging';
