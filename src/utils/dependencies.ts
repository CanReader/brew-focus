import { Task } from '../types';

/**
 * The set of incomplete dependencies blocking `task`. Empty when the task
 * has no blockers (or all blockers are done / missing).
 */
export function blockingTasks(task: Task, all: Task[]): Task[] {
  if (!task.dependsOn || task.dependsOn.length === 0) return [];
  const map = new Map(all.map((t) => [t.id, t]));
  return task.dependsOn
    .map((id) => map.get(id))
    .filter((t): t is Task => !!t && !t.completed);
}

export function isTaskBlocked(task: Task, all: Task[]): boolean {
  return blockingTasks(task, all).length > 0;
}

/**
 * Cycle detection. Returns the set of task ids that, if added to `task.dependsOn`,
 * would create a cycle (i.e. tasks that already depend transitively on `task`).
 */
export function cyclicForbiddenIds(task: Task, all: Task[]): Set<string> {
  const forbidden = new Set<string>([task.id]);

  // Walk the reverse dependency graph: which tasks depend (directly or
  // transitively) on `task`? Adding any of them as a dependency would close
  // a cycle.
  const stack: string[] = [task.id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const t of all) {
      if (t.dependsOn?.includes(current) && !forbidden.has(t.id)) {
        forbidden.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return forbidden;
}

/**
 * Candidates the user is allowed to add as dependencies of `task`:
 *   - same project (or both unprojected)
 *   - not the task itself
 *   - not already a dependency
 *   - not in the cyclic-forbidden set
 */
export function dependencyCandidates(task: Task, all: Task[]): Task[] {
  const forbidden = cyclicForbiddenIds(task, all);
  const existing = new Set(task.dependsOn ?? []);
  return all.filter((t) =>
    t.id !== task.id &&
    !existing.has(t.id) &&
    !forbidden.has(t.id) &&
    (t.projectId ?? null) === (task.projectId ?? null)
  );
}
