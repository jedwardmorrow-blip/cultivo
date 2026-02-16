/*
  # Repair session 195fdd62 finalization status

  ## Problem
  Session 195fdd62 (SWF Bucked Flower, 600g) was incorrectly marked as
  finalized with only 200g packaged (260121-SWF-001). The old service code
  called the finalization RPC unconditionally, marking the session as fully
  finalized even though 400g remained unpackaged.

  ## Fix
  Reset finalization_status_bucked from 'finalized' to 'pending'. This
  re-exposes the session in the pending_conversion_sessions VIEW, which will
  show: 600g total - 200g already packaged = 400g remaining.

  ## Impact
  Combined SWF Bucked Flower pending: (600 + 900 + 800) - (200 + 800) = 1300g
  SWF Bucked Smalls remains unchanged at 700g.

  ## Changes
  - bucking_sessions: Reset finalization_status_bucked for session 195fdd62
*/

UPDATE bucking_sessions
SET finalization_status_bucked = 'pending'::finalization_status
WHERE id = '195fdd62-bcd7-45e0-bd9f-ccdcc26684c2'
  AND finalization_status_bucked = 'finalized'::finalization_status;
