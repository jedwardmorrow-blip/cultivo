/*
  # Fix activity log user_id foreign key target

  1. Changes
    - Drop FK `customer_activity_log_user_id_fkey` that points to `auth.users(id)`
    - Add new FK from `customer_activity_log.user_id` to `public.user_profiles(id)` with ON DELETE SET NULL
    - This aligns with how `crm_tasks.assigned_user_id` and `crm_visit_schedule.user_id`
      already reference `user_profiles(id)` and allows PostgREST to resolve the
      `user_profiles:user_id(full_name)` embedded join in the activity log query

  2. Why
    - PostgREST cannot infer a transitive relationship from `customer_activity_log.user_id`
      through `auth.users` to `user_profiles`. The join `user_profiles:user_id(full_name)`
      fails with "Could not find a relationship between 'customer_activity_log' and 'user_id'
      in the schema cache".
    - Pointing the FK directly at `user_profiles(id)` (which itself FKs to `auth.users(id)`)
      gives PostgREST the direct path it needs while preserving referential integrity.

  3. Safety
    - No data changes; all existing `user_id` values in `customer_activity_log` are valid
      `user_profiles.id` values since `user_profiles.id` mirrors `auth.users.id`.
*/

ALTER TABLE customer_activity_log
  DROP CONSTRAINT IF EXISTS customer_activity_log_user_id_fkey;

ALTER TABLE customer_activity_log
  ADD CONSTRAINT customer_activity_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
