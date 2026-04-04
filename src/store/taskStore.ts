import { create } from 'zustand';
import { Task, Priority, DueDate, Project, ProjectStatus, RepeatType, SubTask, Milestone } from '../types';
import { calculateNextDueDate } from '../utils/repeatUtils';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { nanoid } from '../utils/nanoid';

// ── Row mappers ───────────────────────────────────────────────────────────────
// Supabase returns JSONB columns as real JS objects, not strings

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
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
    customWorkDuration: row.customWorkDuration as number | undefined,
    customShortBreakDuration: row.customShortBreakDuration as number | undefined,
    customLongBreakDuration: row.customLongBreakDuration as number | undefined,
    skipLongBreak: Boolean(row.skipLongBreak),
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
  };
}

// ── Store interface ───────────────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
  isLoaded: boolean;
  loadTasks: () => Promise<void>;
  addTask: (title: string, priority?: Priority, projectId?: string, dueDate?: DueDate, pomodoroEstimate?: number) => Promise<void>;
  updateTask: (id: string, partial: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  reorderTasks: (tasks: Task[]) => Promise<void>;
  setActiveTask: (id: string | null) => Promise<void>;
  incrementPomodoroCompleted: (id: string) => Promise<void>;
  addProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, partial: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
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

      const tasks = (taskRows ?? []).map(rowToTask);
      const projects = (projectRows ?? []).map(rowToProject);
      let activeTaskId: string | null = null;
      try { activeTaskId = metaRow?.value ? JSON.parse(metaRow.value) : null; } catch { /**/ }

      set({ tasks, projects, activeTaskId, isLoaded: true });
    } catch (e) {
      console.warn('Failed to load tasks:', e);
      set({ isLoaded: true });
    }
  },

  addTask: async (title, priority = 'p4', projectId?, dueDate: DueDate = null, pomodoroEstimate = 1) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const id = nanoid();
    const createdAt = Date.now();
    const maxOrder = get().tasks.reduce((m, t) => Math.max(m, (t as unknown as { sortOrder?: number }).sortOrder ?? 0), 0);
    const newTask: Task = {
      id, title: title.trim(), completed: false, priority, pomodoroEstimate, pomodoroCompleted: 0,
      tags: [], subtasks: [], notes: '', createdAt, dueDate, projectId, repeatType: 'none',
    };
    set({ tasks: [newTask, ...get().tasks] });
    try {
      await supabase.from('tasks').insert({
        id, user_id: userId, title: newTask.title, completed: false,
        priority, pomodoroEstimate, pomodoroCompleted: 0,
        tags: [], subtasks: [], notes: '', createdAt,
        completedAt: null, dueDate: dueDate ?? null, projectId: projectId ?? null,
        reminder: null, repeatType: 'none',
        customWorkDuration: null, customShortBreakDuration: null, customLongBreakDuration: null,
        skipLongBreak: false, customLongBreakInterval: null, sortOrder: maxOrder + 1,
      });
    } catch (e) {
      console.warn('Failed to add task:', e);
    }
  },

  updateTask: async (id, partial) => {
    const tasks = get().tasks.map((t) => t.id === id ? { ...t, ...partial } : t);
    set({ tasks });
    const userId = await getCurrentUserId();
    if (!userId) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await supabase.from('tasks').update({
        title: task.title, completed: task.completed, priority: task.priority,
        pomodoroEstimate: task.pomodoroEstimate, pomodoroCompleted: task.pomodoroCompleted,
        tags: task.tags, subtasks: task.subtasks, notes: task.notes ?? '',
        completedAt: task.completedAt ?? null, dueDate: task.dueDate ?? null,
        projectId: task.projectId ?? null, reminder: task.reminder ?? null,
        repeatType: task.repeatType ?? 'none',
        customWorkDuration: task.customWorkDuration ?? null,
        customShortBreakDuration: task.customShortBreakDuration ?? null,
        customLongBreakDuration: task.customLongBreakDuration ?? null,
        skipLongBreak: task.skipLongBreak ?? false,
        customLongBreakInterval: task.customLongBreakInterval ?? null,
      }).eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to update task:', e);
    }
  },

  deleteTask: async (id) => {
    const prevActive = get().activeTaskId;
    const activeTaskId = prevActive === id ? null : prevActive;
    set({ tasks: get().tasks.filter((t) => t.id !== id), activeTaskId });
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
    set({ tasks: get().tasks.map((t) => t.id === id ? { ...t, completed, completedAt } : t) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('tasks').update({ completed, completedAt: completedAt ?? null })
        .eq('id', id).eq('user_id', userId);

      if (completed && task.repeatType && task.repeatType !== 'none') {
        const newId = nanoid();
        const newCreatedAt = Date.now();
        const newDueDate = calculateNextDueDate(task.dueDate ?? null, task.repeatType);
        const maxOrder = get().tasks.reduce((m, t) => Math.max(m, (t as unknown as { sortOrder?: number }).sortOrder ?? 0), 0);
        const newTask: Task = { ...task, id: newId, createdAt: newCreatedAt, completed: false, completedAt: undefined, pomodoroCompleted: 0, dueDate: newDueDate };
        await supabase.from('tasks').insert({
          id: newId, user_id: userId, title: newTask.title, completed: false,
          priority: newTask.priority, pomodoroEstimate: newTask.pomodoroEstimate, pomodoroCompleted: 0,
          tags: newTask.tags, subtasks: newTask.subtasks, notes: newTask.notes ?? '',
          createdAt: newCreatedAt, completedAt: null, dueDate: newDueDate ?? null,
          projectId: newTask.projectId ?? null, reminder: newTask.reminder ?? null,
          repeatType: newTask.repeatType ?? 'none',
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
    const tasks = get().tasks.map((t) => t.id === id ? { ...t, pomodoroCompleted: t.pomodoroCompleted + 1 } : t);
    set({ tasks });
    const userId = await getCurrentUserId();
    if (!userId) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await supabase.from('tasks').update({ pomodoroCompleted: task.pomodoroCompleted })
        .eq('id', id).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to increment pomodoro count:', e);
    }
  },

  addProject: async (name, color) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const project: Project = { id: nanoid(), name, color, description: '', status: 'active', createdAt: Date.now(), milestones: [] };
    set({ projects: [...get().projects, project] });
    try {
      await supabase.from('projects').insert({
        id: project.id, user_id: userId, name, color,
        description: '', status: 'active', createdAt: project.createdAt,
        targetDate: null, milestones: [],
      });
    } catch (e) {
      console.warn('Failed to add project:', e);
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
    const milestones = project.milestones.map((m) => m.id === milestoneId ? { ...m, completed: !m.completed } : m);
    await get().updateProject(projectId, { milestones });
  },

  deleteMilestone: async (projectId, milestoneId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    await get().updateProject(projectId, { milestones: project.milestones.filter((m) => m.id !== milestoneId) });
  },
}));
