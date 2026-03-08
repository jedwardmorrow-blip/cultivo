-- ============================================================
-- Extensions
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 6
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql VERSION '1.5.11';
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions VERSION '1.11';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions VERSION '1.3';
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog VERSION '1.0';
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault VERSION '0.3.1';
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions VERSION '1.1';
