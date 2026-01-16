/*
  # Add UPC and Barcode Fields to Labels Table

  1. Changes
    - Add `upc_code` field to store UPC product codes
    - Add `barcode_url` field to store generated CODE128 barcode image data URL
    - Add `barcode_format` field to track barcode type (CODE128, UPC-A, etc.)

  2. Purpose
    - Enable storage of product UPC codes for regulatory compliance
    - Cache generated barcode images to improve print performance
    - Support multiple barcode formats for different use cases
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'upc_code'
  ) THEN
    ALTER TABLE labels ADD COLUMN upc_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'barcode_url'
  ) THEN
    ALTER TABLE labels ADD COLUMN barcode_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'barcode_format'
  ) THEN
    ALTER TABLE labels ADD COLUMN barcode_format text DEFAULT 'CODE128';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_labels_upc_code ON labels(upc_code) WHERE upc_code IS NOT NULL;
