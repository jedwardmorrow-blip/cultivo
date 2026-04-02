-- CUL-148 / CUL-152: Add Paperclip sync columns to tickets table
-- Supports the CULT AI Widget → Paperclip issue creation loop.
-- Safe to run on both production and staging (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).

-- Ensure tickets table exists (staging may not have it yet)
CREATE TABLE IF NOT EXISTS tickets (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by        UUID,
  chat_session_id    UUID,
  type               TEXT        NOT NULL,
  title              TEXT        NOT NULL,
  description        TEXT        NOT NULL,
  status             TEXT        DEFAULT 'open',
  severity           TEXT,
  bug_category       TEXT,
  priority           TEXT,
  request_type       TEXT,
  business_case      TEXT,
  affected_area      TEXT,
  ai_classification  JSONB,
  ai_analysis        TEXT,
  attachments        JSONB       DEFAULT '[]'::jsonb,
  resolved_at        TIMESTAMPTZ,
  resolved_by        UUID,
  resolution_notes   TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Add Paperclip sync tracking columns
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS paperclip_issue_id     TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS paperclip_sync_status  TEXT        DEFAULT 'pending'
    CHECK (paperclip_sync_status IN ('pending', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS paperclip_synced_at    TIMESTAMPTZ;
