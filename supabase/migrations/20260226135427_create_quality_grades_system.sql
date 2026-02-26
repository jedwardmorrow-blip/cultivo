/*
  # Create Quality Grades System

  1. New Tables
    - `quality_grades` - Reference table for grade definitions
      - `id` (uuid, primary key)
      - `code` (text, unique) - Machine-readable code: CULT, B, C, D, UNDEFINED
      - `label` (text) - Display label: "CULT", "B Grade", "C Grade", "D Grade", "Ungraded"
      - `sort_order` (integer) - Display ordering
      - `color_class` (text) - Tailwind color token for UI rendering
      - `description` (text) - Human-readable description
      - `is_active` (boolean) - Whether this grade can be assigned
      - `created_at` / `updated_at` (timestamptz)
    - `quality_grade_history` - Audit trail for grade changes
      - `id` (uuid, primary key)
      - `entity_type` (text) - "batch" or "inventory_item"
      - `entity_id` (uuid) - FK to batch_registry or inventory_items
      - `previous_grade_id` (uuid, nullable) - FK to quality_grades
      - `new_grade_id` (uuid, nullable) - FK to quality_grades
      - `changed_by` (uuid, nullable) - FK to auth.users
      - `reason` (text, nullable)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `batch_registry` - Added `quality_grade_id` (uuid, nullable FK)
    - `inventory_items` - Added `quality_grade_id` (uuid, nullable FK)

  3. Security
    - RLS enabled on both new tables
    - Authenticated users can read quality_grades
    - Authenticated users can read/insert quality_grade_history
    - Batch and inventory grade columns are updateable by authenticated users

  4. Indexes
    - Index on batch_registry.quality_grade_id
    - Index on inventory_items.quality_grade_id
    - Index on quality_grade_history(entity_type, entity_id)

  5. Notes
    - NULL quality_grade_id means "ungraded" (equivalent to UNDEFINED grade)
    - Inventory items with NULL inherit the batch-level grade in the UI
    - No business rules enforce grading - it is purely informational
*/

-- Create quality_grades reference table
CREATE TABLE IF NOT EXISTS quality_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color_class text NOT NULL DEFAULT 'gray',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quality_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality grades"
  ON quality_grades
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed the five grade tiers
INSERT INTO quality_grades (code, label, sort_order, color_class, description) VALUES
  ('UNDEFINED', 'Ungraded', 0, 'gray', 'Not yet graded - inventory moves through the system normally'),
  ('CULT', 'CULT', 1, 'emerald', 'Top-tier quality - premium flower meeting the highest standards'),
  ('B', 'B Grade', 2, 'sky', 'Good quality flower suitable for standard distribution'),
  ('C', 'C Grade', 3, 'amber', 'Acceptable quality - may have minor cosmetic issues'),
  ('D', 'D Grade', 4, 'rose', 'Below standard - suitable for extraction or secondary processing')
ON CONFLICT (code) DO NOTHING;

-- Create quality_grade_history audit table
CREATE TABLE IF NOT EXISTS quality_grade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('batch', 'inventory_item')),
  entity_id uuid NOT NULL,
  previous_grade_id uuid REFERENCES quality_grades(id),
  new_grade_id uuid REFERENCES quality_grades(id),
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quality_grade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read grade history"
  ON quality_grade_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert grade history"
  ON quality_grade_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add quality_grade_id to batch_registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'quality_grade_id'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN quality_grade_id uuid REFERENCES quality_grades(id);
  END IF;
END $$;

-- Add quality_grade_id to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'quality_grade_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN quality_grade_id uuid REFERENCES quality_grades(id);
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_batch_registry_quality_grade ON batch_registry(quality_grade_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_quality_grade ON inventory_items(quality_grade_id);
CREATE INDEX IF NOT EXISTS idx_quality_grade_history_entity ON quality_grade_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_quality_grade_history_created ON quality_grade_history(created_at DESC);
