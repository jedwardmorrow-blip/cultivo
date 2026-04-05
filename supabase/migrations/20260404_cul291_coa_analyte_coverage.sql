-- CUL-291: COA analyte coverage audit vs AZDHS Table 3.1
-- Adds pass/fail flags for the 4 required test categories and cbda_percentage for potency completeness.
-- Individual analyte readings remain in the lab COA PDF (system of record).

ALTER TABLE certificates_of_analysis
  ADD COLUMN IF NOT EXISTS pesticides_pass boolean,
  ADD COLUMN IF NOT EXISTS heavy_metals_pass boolean,
  ADD COLUMN IF NOT EXISTS microbials_pass boolean,
  ADD COLUMN IF NOT EXISTS residual_solvents_pass boolean,
  ADD COLUMN IF NOT EXISTS cbda_percentage numeric;

COMMENT ON COLUMN certificates_of_analysis.pesticides_pass IS 'AZDHS Table 3.1 Section D: 57 pesticides pass/fail. Detail in PDF.';
COMMENT ON COLUMN certificates_of_analysis.heavy_metals_pass IS 'AZDHS Table 3.1 Section B: As, Cd, Pb, Hg pass/fail. Detail in PDF.';
COMMENT ON COLUMN certificates_of_analysis.microbials_pass IS 'AZDHS Table 3.1 Section A: E.coli, Salmonella, Aspergillus, Mycotoxins pass/fail. Detail in PDF.';
COMMENT ON COLUMN certificates_of_analysis.residual_solvents_pass IS 'AZDHS Table 3.1 Section C: ~21 solvents pass/fail (products only). Detail in PDF.';
COMMENT ON COLUMN certificates_of_analysis.cbda_percentage IS 'AZDHS Table 3.1 Section E: CBDa potency analyte.';
