import { Task, TimerSession, Project } from '../../types';

/**
 * Per-project focus seconds. Prefers the denormalized `projectId` on the
 * session row; falls back to looking up the task's current project for
 * legacy rows that pre-date the migration.
 */
export function projectFocusSeconds(
  sessions: TimerSession[],
  tasks: Task[],
  projectId: string,
  sinceMs?: number,
): number {
  const taskProject = new Map(tasks.map((t) => [t.id, t.projectId]));
  return sessions.reduce((total, s) => {
    if (s.phase !== 'work') return total;
    if (sinceMs !== undefined && s.startedAt < sinceMs) return total;
    const pid = s.projectId ?? (s.taskId ? taskProject.get(s.taskId) : undefined);
    return pid === projectId ? total + s.duration : total;
  }, 0);
}

/** Tasks scoped to a project — non-archived view. */
export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

export function projectCompletion(tasks: Task[], projectId: string): { done: number; total: number; pct: number } {
  const scoped = tasksForProject(tasks, projectId);
  const done = scoped.filter((t) => t.completed).length;
  const total = scoped.length;
  return { done, total, pct: total === 0 ? 0 : done / total };
}

export function daysToDeadline(targetDate?: number): number | null {
  if (!targetDate) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = targetDate - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function startOfWeekMs(): number {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export function formatHrs(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function visibleProjects(projects: Project[], filter: 'active' | 'on_hold' | 'completed' | 'archived' | 'all'): Project[] {
  if (filter === 'archived') return projects.filter((p) => p.archived);
  if (filter === 'all') return projects.filter((p) => !p.archived);
  return projects.filter((p) => !p.archived && p.status === filter);
}
