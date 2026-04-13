-- Drop the two duplicate overloads of fn_apply_audit_adjustments.
-- Keep only the original 1-param version (p_audit_id uuid) -> jsonb
-- which uses auth.uid() internally and returns a full summary.
--
-- The duplicates were created by earlier migrations that used CREATE OR REPLACE
-- with different parameter signatures, which Postgres treats as new functions
-- rather than replacements. This caused an ambiguity error when Supabase RPC
-- tried to resolve which overload to call.

DROP FUNCTION IF EXISTS public.fn_apply_audit_adjustments(uuid, text);
DROP FUNCTION IF EXISTS public.fn_apply_audit_adjustments(uuid, uuid);
