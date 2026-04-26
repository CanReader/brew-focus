-- 011_activity_log.sql
-- Per-task activity log table.
-- Saved views and the daily focus queue ride on the existing `settings` table
-- (key/value JSON), so no new tables for those.
-- Idempotent.

CREATE TABLE IF NOT EXISTS activity_events (
  id          text  PRIMARY KEY,
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id     text,                                 -- soft ref; tasks may be deleted
  project_id  text  REFERENCES projects(id) ON DELETE CASCADE,
  type        text  NOT NULL,                       -- 'task.created', 'task.status_changed', etc.
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_user_task_created
  ON activity_events (user_id, task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_user_project_created
  ON activity_events (user_id, project_id, created_at DESC);

-- RLS: each user reads/writes only their own events.
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_events_select_own ON activity_events;
CREATE POLICY activity_events_select_own ON activity_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS activity_events_insert_own ON activity_events;
CREATE POLICY activity_events_insert_own ON activity_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS activity_events_delete_own ON activity_events;
CREATE POLICY activity_events_delete_own ON activity_events
  FOR DELETE USING (auth.uid() = user_id);
