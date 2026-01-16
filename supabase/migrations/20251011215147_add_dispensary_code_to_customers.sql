/*
  # Add Dispensary Code Column and Populate Customers

  1. Changes
    - Add `dispensary_code` column to customers table (3 characters, uppercase, unique)
    - Populate all existing customers with their assigned 3-letter codes
    - Add constraint to ensure codes are exactly 3 uppercase letters
    - Add unique constraint to prevent duplicate codes

  2. Dispensary Code Assignments
    - Sol Flower: SOL
    - All Greens: ALG
    - Deeply Rooted: DPR
    - The Green Halo: GRH
    - Kind Meds: KMD
    - Sticky Saguaro: STK
    - ANC: ANC
    - Arizona Organix: ARO
    - Prime at Park: PRP
    - Prime at Speedway: PRS
    - Sunday Goods: SUN
    - The Flower Shop: FLS
    - Trulieve: TRU
    - Ponderosa: PON
    - Timeless: TML
    - The Best Dispensary: TBD
    - Noble Herb: NOB
    - Story - North Chandler: SNC
    - Story - South Chandler: SSC
    - Story - Bell: SBL
    - Story - Havasu: SHV
    - Story - Tolleson: STL
    - Story - Grand: SGR
    - Story - McDowell: SMC
    - Story - Williams: SWL
    - Story - Bullhead City: SBC
    - Story - 7th Ave: S7A
    - Story - Dunlap: SDN
    - Story - Litchfield: SLF
    - Superior Dispensary: SUP
    - Sea of Green LLC: SOG
    - Nature Med: NMD
    - Tree Junky: TRJ

  3. Security
    - No changes to RLS policies
*/

-- Add dispensary_code column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dispensary_code text;

-- Populate dispensary codes for all existing customers
UPDATE customers SET dispensary_code = 'SOL' WHERE name = 'Sol Flower';
UPDATE customers SET dispensary_code = 'ALG' WHERE name = 'All Greens';
UPDATE customers SET dispensary_code = 'DPR' WHERE name = 'Deeply Rooted';
UPDATE customers SET dispensary_code = 'GRH' WHERE name = 'The Green Halo';
UPDATE customers SET dispensary_code = 'KMD' WHERE name = 'Kind Meds';
UPDATE customers SET dispensary_code = 'STK' WHERE name = 'Sticky Saguaro';
UPDATE customers SET dispensary_code = 'ANC' WHERE name = 'ANC';
UPDATE customers SET dispensary_code = 'ARO' WHERE name = 'Arizona Organix';
UPDATE customers SET dispensary_code = 'PRP' WHERE name = 'Prime at Park';
UPDATE customers SET dispensary_code = 'PRS' WHERE name = 'Prime at Speedway';
UPDATE customers SET dispensary_code = 'SUN' WHERE name = 'Sunday Goods';
UPDATE customers SET dispensary_code = 'FLS' WHERE name = 'The Flower Shop';
UPDATE customers SET dispensary_code = 'TRU' WHERE name = 'Trulieve';
UPDATE customers SET dispensary_code = 'PON' WHERE name = 'Ponderosa';
UPDATE customers SET dispensary_code = 'TML' WHERE name = 'Timeless';
UPDATE customers SET dispensary_code = 'TBD' WHERE name = 'The Best Dispensary';
UPDATE customers SET dispensary_code = 'NOB' WHERE name = 'Noble Herb';
UPDATE customers SET dispensary_code = 'SNC' WHERE name = 'Story - North Chandler';
UPDATE customers SET dispensary_code = 'SSC' WHERE name = 'Story - South Chandler';
UPDATE customers SET dispensary_code = 'SBL' WHERE name = 'Story - Bell';
UPDATE customers SET dispensary_code = 'SHV' WHERE name = 'Story - Havasu';
UPDATE customers SET dispensary_code = 'STL' WHERE name = 'Story - Tolleson';
UPDATE customers SET dispensary_code = 'SGR' WHERE name = 'Story - Grand';
UPDATE customers SET dispensary_code = 'SMC' WHERE name = 'Story - McDowell';
UPDATE customers SET dispensary_code = 'SWL' WHERE name = 'Story - Williams';
UPDATE customers SET dispensary_code = 'SBC' WHERE name = 'Story - Bullhead City';
UPDATE customers SET dispensary_code = 'S7A' WHERE name = 'Story - 7th Ave';
UPDATE customers SET dispensary_code = 'SDN' WHERE name = 'Story - Dunlap';
UPDATE customers SET dispensary_code = 'SLF' WHERE name = 'Story - Litchfield';
UPDATE customers SET dispensary_code = 'SUP' WHERE name = 'Superior Dispensary';
UPDATE customers SET dispensary_code = 'SOG' WHERE name = 'Sea of Green LLC';
UPDATE customers SET dispensary_code = 'NMD' WHERE name = 'Nature Med';
UPDATE customers SET dispensary_code = 'TRJ' WHERE name = 'Tree Junky';
