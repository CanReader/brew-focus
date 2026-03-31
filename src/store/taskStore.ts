import { create } from 'zustand';
import { Task, Priority, DueDate, Project, RepeatType, SubTask } from '../types';
import Database from '@tauri-apps/plugin-sql';
import { nanoid } from '../utils/nanoid';

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load('sqlite:brewfocus.db');
  return _db;
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
    priority: row.priority as Priority,
    pomodoroEstimate: row.pomodoroEstimate as number,
    pomodoroCompleted: row.pomodoroCompleted as number,
    tags: JSON.parse((row.tags as string) || '[]'),
    subtasks: JSON.parse((row.subtasks as string) || '[]'),
    createdAt: row.createdAt as number,
    completedAt: row.completedAt as number | undefined,
    dueDate: row.dueDate as DueDate | undefined,
    projectId: row.projectId as string | undefined,
    reminder: row.reminder as number | undefined,
    repeatType: (row.repeatType as RepeatType) || 'none',
    customWorkDuration: row.customWorkDuration as number | undefined,
    customShortBreakDuration: row.customShortBreakDuration as number | undefined,
    customLongBreakDuration: row.customLongBreakDuration as number | undefined,
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    createdAt: row.createdAt as number,
  };
}

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
  // Projects
  addProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, partial: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  // Subtasks
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  // Tags
  addTag: (taskId: string, tag: string) => Promise<void>;
  removeTag: (taskId: string, tag: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  activeTaskId: null,
  isLoaded: false,

  loadTasks: async () => {
    try {
      const db = await getDb();
      const taskRows = await db.select<Record<string, unknown>[]>(
        'SELECT * FROM tasks ORDER BY sortOrder ASC'
      );
      const projectRows = await db.select<Record<string, unknown>[]>(
        'SELECT * FROM projects ORDER BY createdAt ASC'
      );
      const metaRows = await db.select<{ key: string; value: string | null }[]>(
        "SELECT * FROM meta WHERE key = 'activeTaskId'"
      );

      const tasks = taskRows.map(rowToTask);
      const projects = projectRows.map(rowToProject);
      const activeTaskId = metaRows[0]?.value ?? null;

      set({ tasks, projects, activeTaskId, isLoaded: true });
    } catch (e) {
      console.warn('Failed to load tasks from SQLite:', e);
      set({ isLoaded: true });
    }
  },

  addTask: async (title, priority = 'p4', projectId?, dueDate: DueDate = null, pomodoroEstimate: number = 1) => {
    const id = nanoid();
    const createdAt = Date.now();
    const maxOrder = get().tasks.reduce((m, t) => Math.max(m, (t as unknown as { sortOrder?: number }).sortOrder ?? 0), 0);
    const newTask: Task = {
      id,
      title: title.trim(),
      completed: false,
      priority,
      pomodoroEstimate,
      pomodoroCompleted: 0,
      tags: [],
      subtasks: [],
      createdAt,
      dueDate,
      projectId,
      repeatType: 'none',
    };
    try {
      const db = await getDb();
      await db.execute(
        `INSERT INTO tasks (id, title, completed, priority, pomodoroEstimate, pomodoroCompleted,
          tags, subtasks, createdAt, completedAt, dueDate, projectId, reminder, repeatType,
          customWorkDuration, customShortBreakDuration, customLongBreakDuration, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, newTask.title, 0, priority, pomodoroEstimate, 0,
          '[]', '[]', createdAt, null, dueDate ?? null, projectId ?? null, null, 'none',
          null, null, null, maxOrder + 1,
        ]
      );
      set({ tasks: [newTask, ...get().tasks] });
    } catch (e) {
      console.warn('Failed to add task:', e);
    }
  },

  updateTask: async (id, partial) => {
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, ...partial } : t));
    set({ tasks });
    try {
      const db = await getDb();
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      await db.execute(
        `UPDATE tasks SET title=?, completed=?, priority=?, pomodoroEstimate=?, pomodoroCompleted=?,
          tags=?, subtasks=?, completedAt=?, dueDate=?, projectId=?, reminder=?, repeatType=?,
          customWorkDuration=?, customShortBreakDuration=?, customLongBreakDuration=?
         WHERE id=?`,
        [
          task.title, task.completed ? 1 : 0, task.priority, task.pomodoroEstimate, task.pomodoroCompleted,
          JSON.stringify(task.tags), JSON.stringify(task.subtasks),
          task.completedAt ?? null, task.dueDate ?? null, task.projectId ?? null,
          task.reminder ?? null, task.repeatType ?? 'none',
          task.customWorkDuration ?? null, task.customShortBreakDuration ?? null, task.customLongBreakDuration ?? null,
          id,
        ]
      );
    } catch (e) {
      console.warn('Failed to update task:', e);
    }
  },

  deleteTask: async (id) => {
    const tasks = get().tasks.filter((t) => t.id !== id);
    const prevActive = get().activeTaskId;
    const activeTaskId = prevActive === id ? null : prevActive;
    set({ tasks, activeTaskId });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM tasks WHERE id=?', [id]);
      if (activeTaskId !== prevActive) {
        await db.execute("UPDATE meta SET value=? WHERE key='activeTaskId'", [null]);
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
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed, completedAt } : t
    );
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE tasks SET completed=?, completedAt=? WHERE id=?',
        [completed ? 1 : 0, completedAt ?? null, id]
      );
    } catch (e) {
      console.warn('Failed to toggle task:', e);
    }
  },

  reorderTasks: async (tasks) => {
    set({ tasks });
    try {
      const db = await getDb();
      for (let i = 0; i < tasks.length; i++) {
        await db.execute('UPDATE tasks SET sortOrder=? WHERE id=?', [i, tasks[i].id]);
      }
    } catch (e) {
      console.warn('Failed to reorder tasks:', e);
    }
  },

  setActiveTask: async (id) => {
    set({ activeTaskId: id });
    try {
      const db = await getDb();
      await db.execute("UPDATE meta SET value=? WHERE key='activeTaskId'", [id]);
    } catch (e) {
      console.warn('Failed to set active task:', e);
    }
  },

  incrementPomodoroCompleted: async (id) => {
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, pomodoroCompleted: t.pomodoroCompleted + 1 } : t
    );
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE tasks SET pomodoroCompleted=pomodoroCompleted+1 WHERE id=?',
        [id]
      );
    } catch (e) {
      console.warn('Failed to increment pomodoro count:', e);
    }
  },

  addProject: async (name, color) => {
    const project: Project = { id: nanoid(), name, color, createdAt: Date.now() };
    set({ projects: [...get().projects, project] });
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO projects (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
        [project.id, project.name, project.color, project.createdAt]
      );
    } catch (e) {
      console.warn('Failed to add project:', e);
    }
  },

  updateProject: async (id, partial) => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, ...partial } : p));
    set({ projects });
    try {
      const db = await getDb();
      const proj = projects.find((p) => p.id === id);
      if (!proj) return;
      await db.execute(
        'UPDATE projects SET name=?, color=? WHERE id=?',
        [proj.name, proj.color, id]
      );
    } catch (e) {
      console.warn('Failed to update project:', e);
    }
  },

  deleteProject: async (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    const tasks = get().tasks.map((t) =>
      t.projectId === id ? { ...t, projectId: undefined } : t
    );
    set({ projects, tasks });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM projects WHERE id=?', [id]);
      await db.execute("UPDATE tasks SET projectId=NULL WHERE projectId=?", [id]);
    } catch (e) {
      console.warn('Failed to delete project:', e);
    }
  },

  addSubtask: async (taskId, title) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtask: SubTask = { id: nanoid(), title: title.trim(), completed: false };
    const subtasks = [...task.subtasks, subtask];
    const tasks = get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t);
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute('UPDATE tasks SET subtasks=? WHERE id=?', [JSON.stringify(subtasks), taskId]);
    } catch (e) {
      console.warn('Failed to add subtask:', e);
    }
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const tasks = get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t);
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute('UPDATE tasks SET subtasks=? WHERE id=?', [JSON.stringify(subtasks), taskId]);
    } catch (e) {
      console.warn('Failed to toggle subtask:', e);
    }
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.filter((s) => s.id !== subtaskId);
    const tasks = get().tasks.map((t) => t.id === taskId ? { ...t, subtasks } : t);
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute('UPDATE tasks SET subtasks=? WHERE id=?', [JSON.stringify(subtasks), taskId]);
    } catch (e) {
      console.warn('Failed to delete subtask:', e);
    }
  },

  addTag: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.tags.includes(tag)) return;
    const tags = [...task.tags, tag];
    const tasks = get().tasks.map((t) => t.id === taskId ? { ...t, tags } : t);
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute('UPDATE tasks SET tags=? WHERE id=?', [JSON.stringify(tags), taskId]);
    } catch (e) {
      console.warn('Failed to add tag:', e);
    }
  },

  removeTag: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tags = task.tags.filter((t) => t !== tag);
    const tasks = get().tasks.map((t) => t.id === taskId ? { ...t, tags } : t);
    set({ tasks });
    try {
      const db = await getDb();
      await db.execute('UPDATE tasks SET tags=? WHERE id=?', [JSON.stringify(tags), taskId]);
    } catch (e) {
      console.warn('Failed to remove tag:', e);
    }
  },
}));
