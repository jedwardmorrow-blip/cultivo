/*
  # Add Label Print History Tracking

  ## Changes
  1. Add print history fields to labels table
    - `print_count` - Number of times label has been printed
    - `last_printed_at` - Timestamp of most recent print
    - `print_history` - JSON array of print timestamps with user info

  2. Update existing triggers
    - Modify printed_at behavior to track all prints, not just first

  ## Purpose
  Enable comprehensive print auditing for compliance and traceability:
  - Track how many times each label has been printed
  - Maintain full print history with timestamps
  - Support reprint auditing for regulatory compliance
  - Identify potential label waste or fraud

  ## Usage
  When marking a label as printed, the system will now:
  1. Increment print_count
  2. Update last_printed_at timestamp
  3. Append to print_history array with user ID and timestamp
*/

-- Add print history tracking columns to labels table
ALTER TABLE labels
ADD COLUMN IF NOT EXISTS print_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_printed_at timestamptz,
ADD COLUMN IF NOT EXISTS print_history jsonb DEFAULT '[]'::jsonb;

-- Backfill print_count for existing printed labels
UPDATE labels
SET print_count = 1,
    last_printed_at = printed_at,
    print_history = jsonb_build_array(
      jsonb_build_object(
        'printed_at', printed_at,
        'printed_by', NULL
      )
    )
WHERE printed_at IS NOT NULL
  AND print_count = 0;

-- Create function to track print history
CREATE OR REPLACE FUNCTION track_label_print()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID (null for anonymous/system prints)
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  -- If printed_at is being set (either first time or update)
  IF NEW.printed_at IS NOT NULL AND (OLD.printed_at IS NULL OR NEW.printed_at <> OLD.printed_at) THEN
    -- Increment print count
    NEW.print_count := COALESCE(OLD.print_count, 0) + 1;

    -- Update last printed timestamp
    NEW.last_printed_at := NEW.printed_at;

    -- Append to print history
    NEW.print_history := COALESCE(OLD.print_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'printed_at', NEW.printed_at,
        'printed_by', current_user_id,
        'print_number', NEW.print_count
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to track print history
DROP TRIGGER IF EXISTS track_label_print_trigger ON labels;
CREATE TRIGGER track_label_print_trigger
  BEFORE UPDATE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION track_label_print();

-- Create index for print history queries
CREATE INDEX IF NOT EXISTS idx_labels_print_count ON labels(print_count) WHERE print_count > 0;
CREATE INDEX IF NOT EXISTS idx_labels_last_printed_at ON labels(last_printed_at) WHERE last_printed_at IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN labels.print_count IS 'Total number of times this label has been printed';
COMMENT ON COLUMN labels.last_printed_at IS 'Timestamp of most recent print event';
COMMENT ON COLUMN labels.print_history IS 'JSON array of all print events with timestamps and user IDs';

-- Create view for label print analytics
CREATE OR REPLACE VIEW label_print_analytics AS
SELECT
  DATE(last_printed_at) as print_date,
  COUNT(*) as labels_printed,
  SUM(print_count) as total_prints,
  COUNT(CASE WHEN print_count > 1 THEN 1 END) as reprinted_labels,
  AVG(print_count) as avg_prints_per_label,
  MAX(print_count) as max_prints_for_single_label
FROM labels
WHERE last_printed_at IS NOT NULL
GROUP BY DATE(last_printed_at)
ORDER BY print_date DESC;

-- Grant access to authenticated users
GRANT SELECT ON label_print_analytics TO authenticated;

COMMENT ON VIEW label_print_analytics IS 'Daily analytics for label printing patterns and reprint frequency';
