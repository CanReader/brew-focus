import { Task, TimerSession } from '../types';

const STALE_THRESHOLD_DAYS = 14;
const STALE_THRESHOLD_MS = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

/**
 * A task is "stale" when:
 *   - it's not completed, and
 *   - it has no due date pulling it forward, and
 *   - it was created more than 14 days ago, and
 *   - no focus session has touched it in the last 14 days.
 *
 * Stale ≠ neglected; the user shouldn't feel shamed. The UI uses this only
 * to provide a soft cue and to power a "Stale" filter chip.
 */
export function isTaskStale(task: Task, sessions: TimerSession[]): boolean {
  if (task.completed) return false;
  if (task.dueDate) return false; // dated tasks pull themselves forward; not stale
  const now = Date.now();
  if (now - task.createdAt < STALE_THRESHOLD_MS) return false;

  const cutoff = now - STALE_THRESHOLD_MS;
  const recentTouch = sessions.some(
    (s) => s.taskId === task.id && s.startedAt >= cutoff && s.phase === 'work'
  );
  return !recentTouch;
}

export function staleCount(tasks: Task[], sessions: TimerSession[]): number {
  return tasks.reduce((n, t) => n + (isTaskStale(t, sessions) ? 1 : 0), 0);
}
