/*
  # Add Label Voiding System

  ## Overview
  Implements automatic label voiding when orders are cancelled or package assignments
  are removed. Voided labels are excluded from printing and marked for compliance tracking.

  ## 1. Schema Changes
     - Add `voided_at` timestamp to labels table
     - Add `voided_by` user reference to labels table
     - Add `void_reason` text field to labels table
     - Add `is_voided` computed check for queries

  ## 2. Voiding Logic
     - When order cancelled: void all labels for that order's assignments
     - When assignment deleted: void the associated label
     - When assignment updated: void old label, create new one
     - Voided labels remain in database for audit trail

  ## 3. Triggers
     - Auto-void labels when package assignment is deleted
     - Auto-void all order labels when order status = 'cancelled'
     - Prevent printing of voided labels via validation

  ## 4. Views
     - Active labels view (excludes voided)
     - Voided labels audit view
     - Label lifecycle tracking

  ## 5. Security
     - Only authenticated users can void labels
     - Voiding is logged with user and timestamp
     - Voided labels remain visible for audit
*/

-- =====================================================
-- SECTION 1: Add Voiding Columns to Labels Table
-- =====================================================

-- Add voided_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE labels ADD COLUMN voided_at timestamptz;
  END IF;
END $$;