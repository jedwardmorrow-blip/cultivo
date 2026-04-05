-- CUL-290: Add individual cannabinoid columns for AZDHS Total THC formula
-- Formula: Total THC = Δ9-THC + (0.877 × THCa) + Δ8-THC + Δ10-THC
-- Existing thc_percentage column retains the lab-reported "Total THC" value.
-- New columns store individual cannabinoid readings for audit/recalculation.

ALTER TABLE certificates_of_analysis
  ADD COLUMN IF NOT EXISTS thca_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS delta8_thc_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS delta10_thc_percentage NUMERIC;

COMMENT ON COLUMN certificates_of_analysis.thc_percentage IS 'Lab-reported Total THC (or Δ9-THC if components parsed separately)';
COMMENT ON COLUMN certificates_of_analysis.thca_percentage IS 'THCa percentage from COA — used in AZDHS formula: Total THC includes 0.877 × THCa';
COMMENT ON COLUMN certificates_of_analysis.delta8_thc_percentage IS 'Δ8-THC percentage from COA — included in AZDHS Total THC calculation';
COMMENT ON COLUMN certificates_of_analysis.delta10_thc_percentage IS 'Δ10-THC percentage from COA — included in AZDHS Total THC calculation';
