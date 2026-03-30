import { create } from 'zustand';
import { TimerPhase, TimerSession } from '../types';
import { LazyStore } from '@tauri-apps/plugin-store';
import { nanoid } from '../utils/nanoid';

const SESSIONS_KEY = 'sessions';
const TODAY_FOCUS_KEY = 'todayFocus';

const store = new LazyStore('brew-focus.json');

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
  recordSession: (phase: TimerPhase, duration: number, taskId?: string, taskTitle?: string) => Promise<void>;
  addFocusSeconds: (seconds: number) => Promise<void>;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  phase: 'work',
  secondsLeft: 25 * 60,
  totalSeconds: 25 * 60,
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
      const savedSessions = await store.get<TimerSession[]>(SESSIONS_KEY);
      const todayFocusData = await store.get<{ date: string; seconds: number }>(TODAY_FOCUS_KEY);
      const today = todayStr();
      const todayFocusSeconds =
        todayFocusData && todayFocusData.date === today ? todayFocusData.seconds : 0;
      set({
        sessions: savedSessions || [],
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

  recordSession: async (phase, duration, taskId, taskTitle) => {
    const session: TimerSession = {
      id: nanoid(),
      startedAt: Date.now() - duration * 1000,
      duration,
      phase,
      taskId,
      taskTitle,
    };
    const sessions = [session, ...get().sessions].slice(0, 100);
    set({ sessions });
    try {
      await store.set(SESSIONS_KEY, sessions);
      await store.save();
    } catch (e) {
      console.warn('Failed to save sessions:', e);
    }
  },

  addFocusSeconds: async (seconds) => {
    const newTotal = get().todayFocusSeconds + seconds;
    set({ todayFocusSeconds: newTotal });
    try {
      await store.set(TODAY_FOCUS_KEY, { date: todayStr(), seconds: newTotal });
      await store.save();
    } catch (e) {
      console.warn('Failed to save focus time:', e);
    }
  },
}));
