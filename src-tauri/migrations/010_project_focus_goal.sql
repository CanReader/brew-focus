-- 010_project_focus_goal.sql
-- Adds an optional weekly focus goal per project.
-- Idempotent.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "weeklyFocusGoalHrs" double precision;
