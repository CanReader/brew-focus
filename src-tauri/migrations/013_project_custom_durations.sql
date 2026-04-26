-- 013_project_custom_durations.sql
-- Postgres / Supabase migration. Run in Supabase SQL Editor.
-- Adds per-project default Pomodoro durations. Resolution order at runtime is
-- task override → project override → global setting. NULL means "fall through".
-- All adds are idempotent (IF NOT EXISTS); existing rows backfill cleanly.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "customWorkDuration"        int,
  ADD COLUMN IF NOT EXISTS "customShortBreakDuration"  int,
  ADD COLUMN IF NOT EXISTS "customLongBreakDuration"   int,
  ADD COLUMN IF NOT EXISTS "customLongBreakInterval"   int,
  ADD COLUMN IF NOT EXISTS "skipLongBreak"             boolean NOT NULL DEFAULT false;
