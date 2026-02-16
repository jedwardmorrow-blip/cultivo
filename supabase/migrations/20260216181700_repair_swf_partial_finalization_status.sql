/*
  # Repair SWF Bucking Sessions: Partial Finalization Data Fix

  ## Problem
  Two Swamp Water Fumez (251105-SWF) bucking sessions were incorrectly marked
  as fully finalized after a partial conversion. The user created a 400g bulk bag
  from a combined 1700g output (sessions 87e1699f + a40765a9), and the RPC
  marked BOTH sessions as finalized, causing the remaining 1300g to disappear
  from the pending conversions view.

  ## Fix Applied
  1. Reset finalization_status_bucked to 'pending' for the two affected sessions
  2. Update the conversion package's source_session_ids to reference only one
     session (prevents double-counting in the VIEW's LEFT JOIN)

  ## Sessions Affected
  - 87e1699f (900g flower, completed 2026-01-27)
  - a40765a9 (800g flower, completed 2026-02-16)

  ## Package Affected
  - 260216-SWF-001 (400g, created 2026-02-16)
    Was: source_session_ids = [87e1699f, a40765a9]
    Now: source_session_ids = [87e1699f]

  ## Expected Result After Migration
  The pending_conversion_sessions view will show a Bulk Flower (Bucked) bucket
  for 251105-SWF with 1300g remaining (1700g total - 400g already packaged).

  ## Related
  - Architecture Decision #9: Partial Conversion Support
  - Service fix in conversions.service.ts (conditional RPC call)
*/

-- Step 1: Reset the two bucking sessions back to pending
UPDATE bucking_sessions
SET
  finalization_status_bucked = 'pending',
  finalized_at_bucked = NULL,
  finalized_by_bucked = NULL
WHERE id IN (
  '87e1699f-113f-4ed2-be4f-715dee90a9a6',
  'a40765a9-8f58-4c8c-897c-2072d820524c'
)
AND finalization_status_bucked = 'finalized';

-- Step 2: Fix the package source_session_ids to reference only one session
-- This prevents double-counting in the VIEW's LEFT JOIN
UPDATE conversion_packages
SET source_session_ids = '["87e1699f-113f-4ed2-be4f-715dee90a9a6"]'::jsonb
WHERE id = '5fde305f-843b-4f8a-9086-032ae4a6e1c7'
AND source_session_ids @> '"87e1699f-113f-4ed2-be4f-715dee90a9a6"'::jsonb
AND source_session_ids @> '"a40765a9-8f58-4c8c-897c-2072d820524c"'::jsonb;
