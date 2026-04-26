-- 009_project_management.sql
-- Postgres / Supabase migration. Run in Supabase SQL Editor.
-- Adds richer project-management fields. All adds are idempotent (IF NOT EXISTS).
-- Existing rows backfill cleanly; no data loss.

-- ── tasks: richer task model ─────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS status         text   NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS "type"         text   NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS "milestoneId"  text,
  ADD COLUMN IF NOT EXISTS "dependsOn"    jsonb  NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "boardPosition" double precision;

-- Backfill status from existing completed flag (one-time, idempotent).
UPDATE tasks
SET status = CASE WHEN completed THEN 'done' ELSE 'todo' END
WHERE status IS NULL OR status = ''
   OR (completed = true  AND status <> 'done')
   OR (completed = false AND status =  'done');

-- Invariant: completed iff status = 'done'. Belt-and-braces; the app maintains this too.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_completed_status_consistent;
ALTER TABLE tasks ADD CONSTRAINT tasks_completed_status_consistent
  CHECK (
    (completed = true  AND status =  'done') OR
    (completed = false AND status <> 'done')
  );

-- Allowed status values.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'done', 'blocked'));

-- Indexes that matter for board / per-project queries.
CREATE INDEX IF NOT EXISTS idx_tasks_user_status        ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_project       ON tasks (user_id, "projectId");
CREATE INDEX IF NOT EXISTS idx_tasks_user_milestone     ON tasks (user_id, "milestoneId");
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_board  ON tasks (user_id, status, "boardPosition");

-- ── projects: richer project model ────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS links     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes     text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS archived  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority  text    NOT NULL DEFAULT 'p3',
  ADD COLUMN IF NOT EXISTS icon      text;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_priority_check;
ALTER TABLE projects ADD CONSTRAINT projects_priority_check
  CHECK (priority IN ('p1', 'p2', 'p3', 'p4'));

CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects (user_id, archived);

-- ── sessions: per-project focus time ──────────────────────────────────────────

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS "projectId" text;

-- Backfill projectId on past sessions from the task that owned them.
-- Safe to re-run: only fills nulls.
UPDATE sessions s
SET "projectId" = t."projectId"
FROM tasks t
WHERE t.id = s."taskId" AND s."projectId" IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_project_started
  ON sessions (user_id, "projectId", "startedAt" DESC);
