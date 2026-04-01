-- CUL-56: Gorilla Breath strain abbreviation GAB → GBH
-- CEO (Justin) confirmed on 2026-04-01 via Paperclip comment.
-- Existing batch 251127-GAB is immutable and unaffected.
-- New batches going forward will use GBH prefix.

UPDATE strains
SET abbreviation = 'GBH'
WHERE id = '6df1035d-606e-48ad-8418-460fb025e511'
  AND abbreviation = 'GAB';
