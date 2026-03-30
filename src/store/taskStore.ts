import { create } from 'zustand';
import { Task, Priority, DueDate, Project } from '../types';
import { LazyStore } from '@tauri-apps/plugin-store';
import { nanoid } from '../utils/nanoid';

const TASKS_KEY = 'tasks';
const ACTIVE_TASK_KEY = 'activeTaskId';
const PROJECTS_KEY = 'projects';

const store = new LazyStore('brew-focus.json');

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
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  activeTaskId: null,
  isLoaded: false,

  loadTasks: async () => {
    try {
      const savedTasks = await store.get<Task[]>(TASKS_KEY);
      const savedActiveId = await store.get<string | null>(ACTIVE_TASK_KEY);
      const savedProjects = await store.get<Project[]>(PROJECTS_KEY);
      set({
        tasks: savedTasks || [],
        projects: savedProjects || [],
        activeTaskId: savedActiveId || null,
        isLoaded: true,
      });
    } catch (e) {
      console.warn('Failed to load tasks from store:', e);
      set({ isLoaded: true });
    }
  },

  addTask: async (title, priority = 'p4', projectId?, dueDate: DueDate = null, pomodoroEstimate: number = 1) => {
    const newTask: Task = {
      id: nanoid(),
      title: title.trim(),
      completed: false,
      priority,
      pomodoroEstimate,
      pomodoroCompleted: 0,
      tags: [],
      createdAt: Date.now(),
      dueDate,
      projectId,
    };
    const tasks = [newTask, ...get().tasks];
    set({ tasks });
    await saveTasks(tasks);
  },

  updateTask: async (id, partial) => {
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, ...partial } : t));
    set({ tasks });
    await saveTasks(tasks);
  },

  deleteTask: async (id) => {
    const tasks = get().tasks.filter((t) => t.id !== id);
    const prevActive = get().activeTaskId;
    const activeTaskId = prevActive === id ? null : prevActive;
    set({ tasks, activeTaskId });
    await saveTasks(tasks);
    if (activeTaskId !== prevActive) await saveActiveTask(null);
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed, completedAt: completed ? Date.now() : undefined } : t
    );
    set({ tasks });
    await saveTasks(tasks);
  },

  reorderTasks: async (tasks) => {
    set({ tasks });
    await saveTasks(tasks);
  },

  setActiveTask: async (id) => {
    set({ activeTaskId: id });
    await saveActiveTask(id);
  },

  incrementPomodoroCompleted: async (id) => {
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, pomodoroCompleted: t.pomodoroCompleted + 1 } : t
    );
    set({ tasks });
    await saveTasks(tasks);
  },

  addProject: async (name, color) => {
    const project: Project = { id: nanoid(), name, color, createdAt: Date.now() };
    const projects = [...get().projects, project];
    set({ projects });
    await saveProjects(projects);
  },

  updateProject: async (id, partial) => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, ...partial } : p));
    set({ projects });
    await saveProjects(projects);
  },

  deleteProject: async (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    // Clear projectId from tasks belonging to this project
    const tasks = get().tasks.map((t) =>
      t.projectId === id ? { ...t, projectId: undefined } : t
    );
    set({ projects, tasks });
    await saveProjects(projects);
    await saveTasks(tasks);
  },
}));

async function saveTasks(tasks: Task[]) {
  try {
    await store.set(TASKS_KEY, tasks);
    await store.save();
  } catch (e) {
    console.warn('Failed to save tasks:', e);
  }
}

async function saveActiveTask(id: string | null) {
  try {
    await store.set(ACTIVE_TASK_KEY, id);
    await store.save();
  } catch (e) {
    console.warn('Failed to save active task:', e);
  }
}

async function saveProjects(projects: Project[]) {
  try {
    await store.set(PROJECTS_KEY, projects);
    await store.save();
  } catch (e) {
    console.warn('Failed to save projects:', e);
  }
}
