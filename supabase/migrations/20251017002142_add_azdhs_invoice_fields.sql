/*
  # Add AZDHS-Compliant Invoice Fields
  
  ## Overview
  This migration adds all required fields for generating AZDHS-compliant invoices
  with full strain metadata, company branding, and customer license information.
  
  ## Changes
  
  ### 1. Company Settings (app_settings table)
  Add company branding and license information:
  - company_brand_name: "CULT Cannabis" (public brand name)
  - company_license_name: "Kind Meds Inc" (legal license holder name)
  
  ### 2. THC Tracking (inventory_items table)
  Add batch-level cannabinoid testing results:
  - thc_percentage: THC test results (varies by batch)
  - cbd_percentage: CBD test results (optional, for future use)
  
  ### 3. Order Item Discounts (order_items table)
  Add line-item discount tracking:
  - discount_amount: Discount applied to individual line items
  
  ### 4. Customer Credits (customers table)
  Add customer account credit system:
  - account_credit_balance: Store credit available for customer
  
  ## Notes
  - THC percentage is stored at inventory_items level because it varies per batch
  - Strain metadata (dominance, lineage) already exists in strain_metadata table
  - All new fields are nullable to avoid breaking existing data
  - Invoice will display: Strain, Dominance, THC%, Lineage, Batch, Package ID
*/

-- Add company branding settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_brand_name', 'CULT Cannabis', 'text', 'Public brand name for invoices and documents', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_license_name', 'Kind Meds Inc', 'text', 'Legal name as it appears on cultivation license', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Add THC tracking to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'thc_percentage'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN thc_percentage numeric;
    COMMENT ON COLUMN inventory_items.thc_percentage IS 'THC percentage from lab test results for this batch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'cbd_percentage'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN cbd_percentage numeric;
    COMMENT ON COLUMN inventory_items.cbd_percentage IS 'CBD percentage from lab test results for this batch';
  END IF;
END $$;

-- Add discount tracking to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_amount numeric DEFAULT 0;
    COMMENT ON COLUMN order_items.discount_amount IS 'Discount amount applied to this line item';
  END IF;
END $$;

-- Add customer credit balance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_credit_balance'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_credit_balance numeric DEFAULT 0;
    COMMENT ON COLUMN customers.account_credit_balance IS 'Store credit balance available for this customer';
  END IF;
END $$;