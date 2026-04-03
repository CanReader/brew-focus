import { create } from 'zustand';
import { TimerPhase, TimerSession } from '../types';
import Database from '@tauri-apps/plugin-sql';
import { nanoid } from '../utils/nanoid';

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load('sqlite:brewfocus.db');
  return _db;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

interface TimerStore {
  phase: TimerPhase;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  sessionCount: number;
  completedPomodoros: number;
  activeTaskId: string | null;
  sessions: TimerSession[];
  todayFocusSeconds: number;
  lastResetDate: string;
  isLoaded: boolean;

  loadState: (workDuration: number) => Promise<void>;
  checkDateReset: () => void;
  setPhase: (phase: TimerPhase, workDuration: number, shortBreakDuration: number, longBreakDuration: number) => void;
  tick: () => void;
  start: () => void;
  pause: () => void;
  reset: (workDuration: number) => void;
  skip: (workDuration: number, shortBreakDuration: number, longBreakDuration: number, longBreakInterval: number) => void;
  advancePhase: (workDuration: number, shortBreakDuration: number, longBreakDuration: number, longBreakInterval: number) => void;
  setActiveTask: (id: string | null) => void;
  recordSession: (phase: TimerPhase, duration: number, taskId?: string, taskTitle?: string, notes?: string) => Promise<void>;
  addFocusSeconds: (seconds: number) => Promise<void>;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  phase: 'work',
  secondsLeft: 30 * 60,
  totalSeconds: 30 * 60,
  isRunning: false,
  sessionCount: 0,
  completedPomodoros: 0,
  activeTaskId: null,
  sessions: [],
  todayFocusSeconds: 0,
  lastResetDate: todayStr(),
  isLoaded: false,

  loadState: async (workDuration) => {
    try {
      const db = await getDb();
      const today = todayStr();

      const sessionRows = await db.select<Record<string, unknown>[]>(
        'SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 100'
      );
      const sessions: TimerSession[] = sessionRows.map((r) => ({
        id: r.id as string,
        startedAt: r.startedAt as number,
        duration: r.duration as number,
        phase: r.phase as TimerPhase,
        taskId: r.taskId as string | undefined,
        taskTitle: r.taskTitle as string | undefined,
        notes: r.notes as string | undefined,
      }));

      const focusRows = await db.select<{ date: string; seconds: number }[]>(
        "SELECT * FROM focus_days WHERE date=?",
        [today]
      );
      const todayFocusSeconds = focusRows[0]?.seconds ?? 0;

      set({
        sessions,
        todayFocusSeconds,
        lastResetDate: today,
        secondsLeft: workDuration * 60,
        totalSeconds: workDuration * 60,
        isLoaded: true,
      });
    } catch (e) {
      console.warn('Failed to load timer state:', e);
      set({ isLoaded: true });
    }
  },

  checkDateReset: () => {
    const today = todayStr();
    if (get().lastResetDate !== today) {
      set({ todayFocusSeconds: 0, lastResetDate: today, sessions: [] });
    }
  },

  setPhase: (phase, workDuration, shortBreakDuration, longBreakDuration) => {
    let totalSeconds: number;
    switch (phase) {
      case 'work':
        totalSeconds = workDuration * 60;
        break;
      case 'shortBreak':
        totalSeconds = shortBreakDuration * 60;
        break;
      case 'longBreak':
        totalSeconds = longBreakDuration * 60;
        break;
    }
    set({ phase, secondsLeft: totalSeconds, totalSeconds, isRunning: false });
  },

  tick: () => {
    const { secondsLeft } = get();
    if (secondsLeft > 0) {
      set({ secondsLeft: secondsLeft - 1 });
    }
  },

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),

  reset: (workDuration) => {
    const totalSeconds = workDuration * 60;
    set({
      phase: 'work',
      secondsLeft: totalSeconds,
      totalSeconds,
      isRunning: false,
      sessionCount: 0,
      completedPomodoros: 0,
    });
  },

  skip: (workDuration, shortBreakDuration, longBreakDuration, longBreakInterval) => {
    get().advancePhase(workDuration, shortBreakDuration, longBreakDuration, longBreakInterval);
  },

  advancePhase: (workDuration, shortBreakDuration, longBreakDuration, longBreakInterval) => {
    const { phase, sessionCount, completedPomodoros } = get();
    let nextPhase: TimerPhase;
    let nextSessionCount = sessionCount;
    let nextCompletedPomodoros = completedPomodoros;

    if (phase === 'work') {
      nextCompletedPomodoros = completedPomodoros + 1;
      nextSessionCount = (sessionCount + 1) % longBreakInterval;
      if (nextSessionCount === 0) {
        nextPhase = 'longBreak';
      } else {
        nextPhase = 'shortBreak';
      }
    } else {
      nextPhase = 'work';
    }

    let totalSeconds: number;
    switch (nextPhase) {
      case 'work':
        totalSeconds = workDuration * 60;
        break;
      case 'shortBreak':
        totalSeconds = shortBreakDuration * 60;
        break;
      case 'longBreak':
        totalSeconds = longBreakDuration * 60;
        break;
    }

    set({
      phase: nextPhase,
      secondsLeft: totalSeconds,
      totalSeconds,
      isRunning: false,
      sessionCount: nextSessionCount,
      completedPomodoros: nextCompletedPomodoros,
    });
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  recordSession: async (phase, duration, taskId, taskTitle, notes?) => {
    const session: TimerSession = {
      id: nanoid(),
      startedAt: Date.now() - duration * 1000,
      duration,
      phase,
      taskId,
      taskTitle,
      notes,
    };
    const sessions = [session, ...get().sessions].slice(0, 100);
    set({ sessions });
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO sessions (id, startedAt, duration, phase, taskId, taskTitle, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [session.id, session.startedAt, session.duration, session.phase, session.taskId ?? null, session.taskTitle ?? null, notes ?? null]
      );
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  },

  addFocusSeconds: async (seconds) => {
    const newTotal = get().todayFocusSeconds + seconds;
    set({ todayFocusSeconds: newTotal });
    try {
      const db = await getDb();
      const today = todayStr();
      await db.execute(
        'INSERT OR REPLACE INTO focus_days (date, seconds) VALUES (?, ?)',
        [today, newTotal]
      );
    } catch (e) {
      console.warn('Failed to save focus time:', e);
    }
  },
}));
