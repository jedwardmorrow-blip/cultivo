/*
  # Enable Supabase Realtime Publication

  This migration adds all tables that have active frontend realtime subscriptions
  to the `supabase_realtime` publication. Without this, all `.on('postgres_changes', ...)`
  subscriptions silently receive no events.

  1. Tables Added to Realtime Publication
    - `inventory_items` — used by Inventory context, packaging data, inventory pipeline dashboard
    - `orders` — used by Orders context, order workflow status dashboard widget
    - `order_items` — used by Orders context, batch allocation overview widget
    - `conversion_packages` — used by Inventory context for conversion tracking
    - `batch_registry` — used by batch management for quality grade updates
    - `trim_sessions` — used by trim sessions list, production dashboard
    - `bucking_sessions` — used by bucking sessions list, production dashboard
    - `packaging_sessions` — used by packaging sessions list, production dashboard
    - `crm_tasks` — used by CRM sales queue, task manager
    - `crm_visit_schedule` — used by CRM sales queue, visit calendar

  2. Important Notes
    - The `supabase_realtime` publication must contain each table for Postgres
      change events to be broadcast to connected clients
    - Uses `IF NOT EXISTS`-style safety via `ALTER PUBLICATION ... ADD TABLE` 
      wrapped in exception handling to avoid errors if a table is already added
    - This single migration activates all 14 existing realtime subscriptions
      across the entire application
*/

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'inventory_items',
      'orders',
      'order_items',
      'conversion_packages',
      'batch_registry',
      'trim_sessions',
      'bucking_sessions',
      'packaging_sessions',
      'crm_tasks',
      'crm_visit_schedule'
    ])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
