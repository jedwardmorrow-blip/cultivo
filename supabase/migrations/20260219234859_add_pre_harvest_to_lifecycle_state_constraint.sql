/*
  # Add pre_harvest to valid_batch_lifecycle_state constraint

  The trigger fn_generate_plant_group_number inserts batch_registry rows with
  lifecycle_state = 'pre_harvest', but the existing check constraint
  valid_batch_lifecycle_state does not include that value.

  This migration drops and recreates the constraint to include 'pre_harvest'
  alongside all other valid lifecycle states.
*/

ALTER TABLE batch_registry DROP CONSTRAINT IF EXISTS valid_batch_lifecycle_state;

ALTER TABLE batch_registry ADD CONSTRAINT valid_batch_lifecycle_state
  CHECK (lifecycle_state = ANY (ARRAY[
    'pre_harvest',
    'clone',
    'veg',
    'flower',
    'drying',
    'created',
    'bucked',
    'in_trim',
    'bulk_available',
    'in_packaging',
    'packaged',
    'partially_depleted',
    'depleted',
    'archived',
    'fresh_frozen',
    'lab',
    'quarantined'
  ]));
