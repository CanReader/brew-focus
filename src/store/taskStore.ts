import { create } from 'zustand';
import {
  Task, Priority, DueDate, Project, ProjectStatus, RepeatType, SubTask, Milestone,
  TaskStatus, TaskType, ProjectLink,
} from '../types';
import { calculateNextDueDate } from '../utils/repeatUtils';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { nanoid } from '../utils/nanoid';
import { useActivityStore } from './activityStore';
import { useSettingsStore } from './settingsStore';
import { useTimerStore } from './timerStore';
import { playTaskComplete } from '../utils/sounds';

// ── Row mappers ───────────────────────────────────────────────────────────────
// Supabase returns JSONB columns as real JS objects, not strings

function nullable<T>(v: unknown): T | undefined {
  return v == null ? undefined : (v as T);
}

function rowToTask(row: Record<string, unknown>): Task {
  const rawStatus = (row.status as string) || (row.completed ? 'done' : 'todo');
  const completed = Boolean(row.completed);
  // Defensive: enforce invariant on read in case an old row predates the migration.
  const status: TaskStatus = (completed && rawStatus !== 'done')
    ? 'done'
    : (!completed && rawStatus === 'done')
      ? 'todo'
      : (rawStatus as TaskStatus);
  return {
    id: row.id as string,
    title: row.title as string,
    completed,
    priority: row.priority as Priority,
    pomodoroEstimate: (row.pomodoroEstimate as number) ?? 1,
    pomodoroCompleted: (row.pomodoroCompleted as number) ?? 0,
    tags: (row.tags as string[]) ?? [],
    subtasks: (row.subtasks as SubTask[]) ?? [],
    notes: (row.notes as string) || '',
    createdAt: row.createdAt as number,
    completedAt: row.completedAt as number | undefined,
    dueDate: row.dueDate as DueDate | undefined,
    projectId: row.projectId as string | undefined,
    reminder: row.reminder as number | undefined,
    repeatType: (row.repeatType as RepeatType) || 'none',
    status,
    type: ((row.type as string) || 'task') as TaskType,
    milestoneId: row.milestoneId as string | undefined,
    dependsOn: (row.dependsOn as string[]) ?? [],
    sortOrder: row.sortOrder as number | undefined,
    boardPosition: row.boardPosition as number | undefined,
    customWorkDuration: row.customWorkDuration as number | undefined,
    customShortBreakDuration: row.customShortBreakDuration as number | undefined,
    customLongBreakDuration: row.customLongBreakDuration as number | undefined,
    skipLongBreak: nullable<boolean>(row.skipLongBreak),
    customLongBreakInterval: row.customLongBreakInterval as number | undefined,
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    description: (row.description as string) || '',
    status: ((row.status as string) || 'active') as ProjectStatus,
    targetDate: row.targetDate as number | undefined,
    createdAt: row.createdAt as number,
    milestones: (row.milestones as Milestone[]) ?? [],
    links: (row.links as ProjectLink[]) ?? [],
    notes: (row.notes as string) || '',
    archived: Boolean(row.archived),
    priority: ((row.priority as string) || 'p3') as Priority,
    icon: row.icon as string | undefined,
    weeklyFocusGoalHrs: row.weeklyFocusGoalHrs as number | undefined,
    customWorkDuration: row.customWorkDuration as number | undefined,
    customShortBreakDuration: row.customShortBreakDuration as number | undefined,
    customLongBreakDuration: row.customLongBreakDuration as number | undefined,
    customLongBreakInterval: row.customLongBreakInterval as number | undefined,
    skipLongBreak: nullable<boolean>(row.skipLongBreak),
  };
}

// ── Store interface ───────────────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
  isLoaded: boolean;
  loadTasks: () => Promise<void>;
  addTask: (title: string, priority?: Priority, projectId?: string, dueDate?: DueDate, pomodoroEstimate?: number, opts?: { type?: TaskType; milestoneId?: string }) => Promise<void>;
  updateTask: (id: string, partial: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  setTaskBoardPosition: (id: string, status: TaskStatus, position: number) => Promise<void>;
  reorderTasks: (tasks: Task[]) => Promise<void>;
  setActiveTask: (id: string | null) => Promise<void>;
  incrementPomodoroCompleted: (id: string) => Promise<void>;
  addProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, partial: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string, archived?: boolean) => Promise<void>;
  addProjectLink: (projectId: string, label: string, url: string) => Promise<void>;
  removeProjectLink: (projectId: string, linkId: string) => Promise<void>;
  _seedProjectFromTemplate: (
    projectId: string,
    icon: string | undefined,
    milestones: { title: string; targetDate?: number }[],
    starterTasks: { title: string; type?: TaskType; priority?: Priority; pomodoroEstimate?: number }[],
    defaults?: {
      customWorkDuration?: number;
      customShortBreakDuration?: number;
      customLongBreakDuration?: number;
      customLongBreakInterval?: number;
      skipLongBreak?: boolean;
    },
  ) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (taskId: string, orderedIds: string[]) => Promise<void>;
  addTag: (taskId: string, tag: string) => Promise<void>;
  removeTag: (taskId: string, tag: string) => Promise<void>;
  addMilestone: (projectId: string, title: string, targetDate?: number) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<void>;
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  activeTaskId: null,
  isLoaded: false,

  loadTasks: async () => {
    const userId = await getCurrentUserId();
    if (!userId) { set({ isLoaded: true }); return; }
    try {
      const [{ data: taskRows }, { data: projectRows }, { data: metaRow }] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).order('sortOrder', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', userId).order('createdAt', { ascending: true }),
        supabase.from('settings').select('value').eq('user_id', userId).eq('key', 'activeTaskId').maybeSingle(),
      ]);

      const rawTasks = (taskRows ?? []).map(rowToTask);
      const projects = (projectRows ?? []).map(rowToProject);
      let activeTaskId: string | null = null;
      // Two-shape parse: a TEXT column gives back the stringified JSON
      // (`"abc"`), while a JSONB column gives back the already-parsed value.
      // The previous version tried JSON.parse only, so JSONB rows would always
      // throw and silently lose the persisted active task across reloads.
      const raw = metaRow?.value;
      if (typeof raw === 'string') {
        try { activeTaskId = JSON.parse(raw); }
        catch { activeTaskId = raw || null; }
      } else if (raw !== null && raw !== undefined) {
        activeTaskId = raw as string;
      }

      // Orphan sweep: any task pointing at a projectId that no longer exists
      // (e.g. a project that failed to persist before this fix landed) gets
      // its projectId nulled in memory AND in Supabase, so the task surfaces
      // in Inbox-style views instead of haunting a ghost project.
      const projectIds = new Set(projects.map((p) => p.id));
      const orphanIds: string[] = [];
      const tasks = rawTasks.map((t) => {
        if (t.projectId && !projectIds.has(t.projectId)) {
          orphanIds.push(t.id);
          return { ...t, projectId: undefined };
        }
        return t;
      });

      set({ tasks, projects, activeTaskId, isLoaded: true });

      if (orphanIds.length > 0) {
        console.warn(`Detached ${orphanIds.length} orphaned task(s) from missing project(s).`);
        // Fire-and-forget — we already updated local state, this just persists.
        void supabase
          .from('tasks')
          .update({ projectId: null })
          .in('id', orphanIds)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) console.warn('Could not persist orphan cleanup:', error);
          });
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
      set({ isLoaded: true });
    }
  },

  addTask: async (title, priority = 'p4', projectId, dueDate: DueDate = null, pomodoroEstimate = 1, opts) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const id = nanoid();
    const createdAt = Date.now();
    const maxOrder = get().tasks.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), 0);
    // Append at the end of the 'todo' column on the board.
    const maxBoardPos = get().tasks
      .filter((t) => t.status === 'todo' && t.projectId === projectId)
      .reduce((m, t) => Math.max(m, t.boardPosition ?? 0), 0);
    const newTask: Task = {
      id, title: title.trim(), completed: false, priority, pomodoroEstimate, pomodoroCompleted: 0,
      tags: [], subtasks: [], notes: '', createdAt, dueDate, projectId, repeatType: 'none',
      status: 'todo',
      type: opts?.type ?? 'task',
      milestoneId: opts?.milestoneId,
      dependsOn: [],
      boardPosition: maxBoardPos + 1024,
      sortOrder: maxOrder + 1,
    };
    set({ tasks: [newTask, ...get().tasks] });
    try {
      await supabase.from('tasks').insert({
        id, user_id: userId, title: newTask.title, completed: false,
        priority, pomodoroEstimate, pomodoroCompleted: 0,
        tags: [], subtasks: [], notes: '', createdAt,
        completedAt: null, dueDate: dueDate ?? null, projectId: projectId ?? null,
        reminder: null, repeatType: 'none',
        status: 'todo',
        type: newTask.type,
        milestoneId: newTask.milestoneId ?? null,
        dependsOn: [],
        boardPosition: newTask.boardPosition,
        customWorkDuration: null, customShortBreakDuration: null, customLongBreakDuration: null,
        skipLongBreak: false, customLongBreakInterval: null, sortOrder: maxOrder + 1,
      });
      useActivityStore.getState().log('task.created', {
        taskId: id, projectId: projectId ?? undefined,
        payload: { title: newTask.title, type: newTask.type },
      });
    } catch (e) {
      console.warn('Failed to add task:', e);
    }
  },

  updateTask: async (id, partial) => {
    const before = get().tasks.find((t) => t.id === id);
    // Maintain the completed↔status invariant in one place. If a caller flips
    // either side, the other tracks automatically — keeps the DB CHECK happy.
    const merged: Partial<Task> = { ...partial };
    if (partial.status !== undefined && partial.completed === undefined) {
      merged.completed = partial.status === 'done';
      if (merged.completed && !partial.completedAt) merged.completedAt = Date.now();
      if (!merged.completed) merged.completedAt = undefined;
    } else if (partial.completed !== undefined && partial.status === undefined) {
      merged.status = partial.completed ? 'done' : 'todo';
      if (partial.completed && !partial.completedAt) merged.completedAt = Date.now();
      if (!partial.completed) merged.completedAt = undefined;
    }
    const tasks = get().tasks.map((t) => t.id === id ? { ...t, ...merged } : t);
    set({ tasks });

    // Activity events for meaningful changes (best-effort, non-blocking).
    if (before) {
      const after = tasks.find((t) => t.id === id)!;
      const log = useActivityStore.getState().log;
      if (before.status !== after.status) {
        log('task.status_changed', {
          taskId: id, projectId: after.projectId,
          payload: { from: before.status, to: after.status },
        });
      }
      if (before.priority !== after.priority) {
        log('task.priority_changed', {
          taskId: id, projectId: after.projectId,
          payload: { from: before.priority, to: after.priority },
        });
      }
      if (before.milestoneId !== after.milestoneId) {
        log('task.milestone_changed', {
          taskId: id, projectId: after.projectId,
          payload: { from: before.milestoneId, to: after.milestoneId },
        });
      }
      if (before.projectId !== after.projectId) {
        log('task.project_changed', {
          taskId: id, projectId: after.projectId,
          payload: { from: before.projectId, to: after.projectId },
        });
      }
    }
    const userId = await getCurrentUserId();
    if (!userId) return;
    if (!tasks.find((t) => t.id === id)) return;
    // Partial write: persist ONLY the columns this call actually changed (the
    // keys in `merged`), never the whole row. The previous full-row writer
    // clobbered fields owned by other code paths — e.g. a title edit overwrote
    // pomodoroCompleted with a stale value, silently losing a concurrent
    // timer-driven increment. Column names match Task keys 1:1.
    const dbPatch: Record<string, unknown> = {};
    for (const k of Object.keys(merged) as (keyof Task)[]) {
      const v = merged[k];
      dbPatch[k] = v === undefined ? null : v;
    }
    if ('notes' in dbPatch && dbPatch.notes == null) dbPatch.notes = '';
    if (Object.keys(dbPatch).length === 0) return;
    try {
      // supabase-js resolves with { error } instead of throwing, so check it
      // explicitly — a silently-swallowed RLS/constraint failure looked like a
      // successful edit that then vanished on the next load.
      const { error } = await supabase.from('tasks').update(dbPatch).eq('id', id).eq('user_id', userId);
      if (error) console.warn('Failed to update task:', error.message);
    } catch (e) {
      console.warn('Failed to update task:', e);
    }
  },

  setTaskStatus: async (id, status) => {
    await get().updateTask(id, { status });
  },

  setTaskBoardPosition: async (id, status, position) => {
    await get().updateTask(id, { status, boardPosition: position });
  },

  deleteTask: async (id) => {
    const prevActive = get().activeTaskId;
    const activeTaskId = prevActive === id ? null : prevActive;
    set({ tasks: get().tasks.filter((t) => t.id !== id), activeTaskId });
    // Keep the timer store's active-task reference in sync — otherwise the
    // timer keeps pointing at a deleted task id and records the next completed
    // session against it. taskStore.activeTaskId and timerStore.activeTaskId
    // are normally synced by callers; deletion is the one path that isn't.
    if (prevActive === id) useTimerStore.getState().setActiveTask(null);
    useActivityStore.getState().clearForTask(id);
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
      if (activeTaskId !== prevActive) {
        await supabase.from('settings').upsert(
          { user_id: userId, key: 'activeTaskId', value: JSON.stringify(null) },
          { onConflict: 'user_id,key' }
        );
      }
    } catch (e) {
      console.warn('Failed to delete task:', e);
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    const completedAt = completed ? Date.now() : undefined;
    const status: TaskStatus = completed ? 'done' : (task.status === 'done' ? 'todo' : task.status);
    set({ tasks: get().tasks.map((t) => t.id === id ? { ...t, completed, completedAt, status } : t) });
    useActivityStore.getState().log(completed ? 'task.completed' : 'task.uncompleted', {
      taskId: id, projectId: task.projectId,
      payload: { title: task.title },
    });
    // Reward sound on incomplete → complete only (never on uncomplete).
    if (completed) {
      const s = useSettingsStore.getState().settings;
      if (s.soundNotifications) {
        void playTaskComplete(s.soundVolume ?? 70);
      }
    }
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ completed, completedAt: completedAt ?? null, status })
        .eq('id', id).eq('user_id', userId);

      if (completed && task.repeatType && task.repeatType !== 'none') {
        const newId = nanoid();
        const newCreatedAt = Date.now();
        const newDueDate = calculateNextDueDate(task.dueDate ?? null, task.repeatType);
        const maxOrder = get().tasks.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), 0);
        const maxBoardPos = get().tasks
          .filter((t) => t.status === 'todo' && t.projectId === task.projectId)
          .reduce((m, t) => Math.max(m, t.boardPosition ?? 0), 0);
        const newTask: Task = {
          ...task, id: newId, createdAt: newCreatedAt, completed: false,
          completedAt: undefined, pomodoroCompleted: 0, dueDate: newDueDate,
          status: 'todo', boardPosition: maxBoardPos + 1024, sortOrder: maxOrder + 1,
        };
        await supabase.from('tasks').insert({
          id: newId, user_id: userId, title: newTask.title, completed: false,
          priority: newTask.priority, pomodoroEstimate: newTask.pomodoroEstimate, pomodoroCompleted: 0,
          tags: newTask.tags, subtasks: newTask.subtasks, notes: newTask.notes ?? '',
          createdAt: newCreatedAt, completedAt: null, dueDate: newDueDate ?? null,
          projectId: newTask.projectId ?? null, reminder: newTask.reminder ?? null,
          repeatType: newTask.repeatType ?? 'none',
          status: 'todo',
          type: newTask.type,
          milestoneId: newTask.milestoneId ?? null,
          dependsOn: [],
          boardPosition: newTask.boardPosition,
          customWorkDuration: newTask.customWorkDuration ?? null,
          customShortBreakDuration: newTask.customShortBreakDuration ?? null,
          customLongBreakDuration: newTask.customLongBreakDuration ?? null,
          skipLongBreak: newTask.skipLongBreak ?? false,
          customLongBreakInterval: newTask.customLongBreakInterval ?? null,
          sortOrder: maxOrder + 1,
        });
        set({ tasks: [newTask, ...get().tasks] });
      }
    } catch (e) {
      console.warn('Failed to toggle task:', e);
    }
  },

  reorderTasks: async (tasks) => {
    set({ tasks });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await Promise.all(
        tasks.map((t, i) =>
          supabase.from('tasks').update({ sortOrder: i }).eq('id', t.id).eq('user_id', userId)
        )
      );
    } catch (e) {
      console.warn('Failed to reorder tasks:', e);
    }
  },

  setActiveTask: async (id) => {
    set({ activeTaskId: id });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('settings').upsert(
        { user_id: userId, key: 'activeTaskId', value: JSON.stringify(id) },
        { onConflict: 'user_id,key' }
      );
    } catch (e) {
      console.warn('Failed to set active task:', e);
    }
  },

  incrementPomodoroCompleted: async (id) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      const tasks = get().tasks.map((t) => t.id === id ? { ...t, pomodoroCompleted: t.pomodoroCompleted + 1 } : t);
      set({ tasks });
      return;
    }
    try {
      const { data: row } = await supabase
        .from('tasks')
        .select('pomodoroCompleted')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      const next = (row?.pomodoroCompleted ?? 0) + 1;
      await supabase.from('tasks').update({ pomodoroCompleted: next })
        .eq('id', id).eq('user_id', userId);
      const tasks = get().tasks.map((t) => t.id === id ? { ...t, pomodoroCompleted: next } : t);
      set({ tasks });
    } catch (e) {
      console.warn('Failed to increment pomodoro count:', e);
      const tasks = get().tasks.map((t) => t.id === id ? { ...t, pomodoroCompleted: t.pomodoroCompleted + 1 } : t);
      set({ tasks });
    }
  },

  addProject: async (name, color) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const project: Project = {
      id: nanoid(), name, color, description: '', status: 'active',
      createdAt: Date.now(), milestones: [], links: [], notes: '',
      archived: false, priority: 'p3',
    };
    set({ projects: [...get().projects, project] });
    // Supabase JS client returns { error } instead of throwing on most failures
    // (RLS, missing column, constraint violation). The previous version only
    // caught thrown errors and silently ignored response errors — leaving the
    // project in local state until reload, then orphaning any tasks created in
    // it. Now we check `error` explicitly, roll back the optimistic add, and
    // rethrow so the UI can react.
    const rollback = () => set({ projects: get().projects.filter((p) => p.id !== project.id) });
    try {
      const { error } = await supabase.from('projects').insert({
        id: project.id, user_id: userId, name, color,
        description: '', status: 'active', createdAt: project.createdAt,
        targetDate: null, milestones: [],
        links: [], notes: '', archived: false, priority: 'p3', icon: null,
        weeklyFocusGoalHrs: null,
        customWorkDuration: null, customShortBreakDuration: null,
        customLongBreakDuration: null, customLongBreakInterval: null,
        skipLongBreak: false,
      });
      if (error) {
        rollback();
        console.error('Failed to add project (Supabase rejected insert):', error);
        throw new Error(`Could not save project "${name}": ${error.message}`);
      }
    } catch (e) {
      // network / unexpected
      rollback();
      console.error('Failed to add project:', e);
      throw e;
    }
  },

  updateProject: async (id, partial) => {
    const projects = get().projects.map((p) => p.id === id ? { ...p, ...partial } : p);
    set({ projects });
    const userId = await getCurrentUserId();
    if (!userId) return;
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    try {
      await supabase.from('projects').update({
        name: proj.name, color: proj.color, description: proj.description ?? '',
        status: proj.status ?? 'active', targetDate: proj.targetDate ?? null,
        milestones: proj.milestones ?? [],
        links: proj.links ?? [],
        notes: proj.notes ?? '',
        archived: proj.archived ?? false,
        priority: proj.priority ?? 'p3',
        icon: proj.icon ?? null,
        weeklyFocusGoalHrs: proj.weeklyFocusGoalHrs ?? null,
        customWorkDuration: proj.customWorkDuration ?? null,
        customShortBreakDuration: proj.customShortBreakDuration ?? null,
        customLongBreakDuration: proj.customLongBreakDuration ?? null,
        customLongBreakInterval: proj.customLongBreakInterval ?? null,
        skipLongBreak: proj.skipLongBreak ?? false,
      }).eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to update project:', e);
    }
  },

  deleteProject: async (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    const tasks = get().tasks.map((t) => t.projectId === id ? { ...t, projectId: undefined } : t);
    set({ projects, tasks });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('projects').delete().eq('id', id).eq('user_id', userId);
      await supabase.from('tasks').update({ projectId: null }).eq('projectId', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to delete project:', e);
    }
  },

  archiveProject: async (id, archived = true) => {
    await get().updateProject(id, { archived });
  },

  /**
   * Internal helper used by the template flow — appends already-prepared
   * milestones to a project (created moments earlier).
   */
  _seedProjectFromTemplate: async (
    projectId: string,
    icon: string | undefined,
    milestones: { title: string; targetDate?: number }[],
    starterTasks: { title: string; type?: TaskType; priority?: Priority; pomodoroEstimate?: number }[],
    defaults?: {
      customWorkDuration?: number;
      customShortBreakDuration?: number;
      customLongBreakDuration?: number;
      customLongBreakInterval?: number;
      skipLongBreak?: boolean;
    },
  ) => {
    const seeded: Milestone[] = milestones.map((m) => ({
      id: nanoid(), title: m.title.trim(), completed: false, targetDate: m.targetDate,
    }));
    await get().updateProject(projectId, {
      milestones: seeded,
      icon,
      ...(defaults?.customWorkDuration !== undefined       ? { customWorkDuration: defaults.customWorkDuration } : {}),
      ...(defaults?.customShortBreakDuration !== undefined ? { customShortBreakDuration: defaults.customShortBreakDuration } : {}),
      ...(defaults?.customLongBreakDuration !== undefined  ? { customLongBreakDuration: defaults.customLongBreakDuration } : {}),
      ...(defaults?.customLongBreakInterval !== undefined  ? { customLongBreakInterval: defaults.customLongBreakInterval } : {}),
      ...(defaults?.skipLongBreak !== undefined            ? { skipLongBreak: defaults.skipLongBreak } : {}),
    });
    for (const t of starterTasks) {
      await get().addTask(t.title, t.priority ?? 'p4', projectId, null, t.pomodoroEstimate ?? 1, { type: t.type });
    }
  },

  addProjectLink: async (projectId, label, url) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const link: ProjectLink = { id: nanoid(), label: label.trim(), url: url.trim() };
    if (!link.label || !link.url) return;
    await get().updateProject(projectId, { links: [...(project.links ?? []), link] });
  },

  removeProjectLink: async (projectId, linkId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    await get().updateProject(projectId, { links: (project.links ?? []).filter((l) => l.id !== linkId) });
  },

  // ── Subtasks ──────────────────────────────────────────────────────────────

  addSubtask: async (taskId, title) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtask: SubTask = { id: nanoid(), title: title.trim(), completed: false };
    const subtasks = [...task.subtasks, subtask];
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ subtasks }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to add subtask:', e); }
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ subtasks }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to toggle subtask:', e); }
  },

  updateSubtask: async (taskId, subtaskId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => s.id === subtaskId ? { ...s, title: trimmed } : s);
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ subtasks }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to update subtask:', e); }
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.filter((s) => s.id !== subtaskId);
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ subtasks }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to delete subtask:', e); }
  },

  reorderSubtasks: async (taskId, orderedIds) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const byId = new Map(task.subtasks.map((s) => [s.id, s]));
    const subtasks = orderedIds.map((id) => byId.get(id)).filter((s): s is typeof task.subtasks[number] => !!s);
    if (subtasks.length !== task.subtasks.length) return;
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ subtasks }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to reorder subtasks:', e); }
  },

  // ── Tags ──────────────────────────────────────────────────────────────────

  addTag: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task || task.tags.includes(tag)) return;
    const tags = [...task.tags, tag];
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, tags } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ tags }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to add tag:', e); }
  },

  removeTag: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tags = task.tags.filter((t) => t !== tag);
    set({ tasks: get().tasks.map((t) => t.id === taskId ? { ...t, tags } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ tags }).eq('id', taskId).eq('user_id', userId);
    } catch (e) { console.warn('Failed to remove tag:', e); }
  },

  // ── Milestones ────────────────────────────────────────────────────────────

  addMilestone: async (projectId, title, targetDate?) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const milestone: Milestone = { id: nanoid(), title: title.trim(), completed: false, targetDate };
    await get().updateProject(projectId, { milestones: [...project.milestones, milestone] });
  },

  toggleMilestone: async (projectId, milestoneId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const target = project.milestones.find((m) => m.id === milestoneId);
    if (!target) return;
    const willBeCompleted = !target.completed;
    const milestones = project.milestones.map((m) => m.id === milestoneId ? { ...m, completed: willBeCompleted } : m);
    // Reward sound on incomplete → complete only — same rule as toggleTask.
    if (willBeCompleted) {
      const s = useSettingsStore.getState().settings;
      if (s.soundNotifications) playTaskComplete(s.soundVolume ?? 70);
    }
    await get().updateProject(projectId, { milestones });
  },

  deleteMilestone: async (projectId, milestoneId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    await get().updateProject(projectId, { milestones: project.milestones.filter((m) => m.id !== milestoneId) });
  },
}));
