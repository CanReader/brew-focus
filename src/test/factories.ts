import type { Task, TimerSession } from '../types';

let n = 0;

export function makeTask(partial: Partial<Task> = {}): Task {
  n++;
  return {
    id: `t${n}`,
    title: `task ${n}`,
    completed: false,
    priority: 'p4',
    pomodoroEstimate: 1,
    pomodoroCompleted: 0,
    tags: [],
    subtasks: [],
    notes: '',
    createdAt: Date.now(),
    dueDate: null,
    repeatType: 'none',
    status: 'todo',
    type: 'task',
    dependsOn: [],
    ...partial,
  } as Task;
}

export function makeSession(partial: Partial<TimerSession> = {}): TimerSession {
  n++;
  return {
    id: `s${n}`,
    phase: 'work',
    duration: 25 * 60,
    startedAt: Date.now(),
    ...partial,
  } as TimerSession;
}
