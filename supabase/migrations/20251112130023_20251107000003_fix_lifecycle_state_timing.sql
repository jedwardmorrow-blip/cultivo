/*
  # Batch 1.3: Correct Lifecycle State Timing
  
  ## Purpose
  Moves lifecycle_state updates from session START to session COMPLETION.
  Adds cancellation rollback logic.
  
  ## Changes
  1. Create trigger functions for session completion (trim & packaging)
  2. Create trigger functions for session cancellation
  3. Remove premature lifecycle_state updates from existing code
  4. Add lifecycle_state transition validation
  
  ## Safety
  - Does NOT modify existing session rows
  - Adds triggers for FUTURE sessions only
  - Idempotent: Checks for existing triggers/functions
*/

-- Read the full migration file
