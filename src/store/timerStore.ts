import { create } from 'zustand';
import { TimerPhase, TimerSession } from '../types';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { nanoid } from '../utils/nanoid';

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
  rateMood: (sessionId: string, mood: number) => Promise<void>;
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
    const userId = await getCurrentUserId();
    if (!userId) {
      set({ isLoaded: true, secondsLeft: workDuration * 60, totalSeconds: workDuration * 60 });
      return;
    }
    try {
      const today = todayStr();

      const { data: sessionRows } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('startedAt', { ascending: false })
        .limit(100);

      const sessions: TimerSession[] = (sessionRows ?? []).map((r) => ({
        id: r.id as string,
        startedAt: r.startedAt as number,
        duration: r.duration as number,
        phase: r.phase as TimerPhase,
        taskId: r.taskId as string | undefined,
        taskTitle: r.taskTitle as string | undefined,
        notes: r.notes as string | undefined,
        mood: r.mood != null ? (r.mood as number) : undefined,
      }));

      const { data: focusRow } = await supabase
        .from('focus_days')
        .select('seconds')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      const todayFocusSeconds = focusRow?.seconds ?? 0;

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
      case 'work':        totalSeconds = workDuration * 60;       break;
      case 'shortBreak':  totalSeconds = shortBreakDuration * 60; break;
      case 'longBreak':   totalSeconds = longBreakDuration * 60;  break;
    }
    set({ phase, secondsLeft: totalSeconds, totalSeconds, isRunning: false });
  },

  tick: () => {
    const { secondsLeft } = get();
    if (secondsLeft > 0) set({ secondsLeft: secondsLeft - 1 });
  },

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),

  reset: (workDuration) => {
    const totalSeconds = workDuration * 60;
    set({ phase: 'work', secondsLeft: totalSeconds, totalSeconds, isRunning: false, sessionCount: 0, completedPomodoros: 0 });
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
      nextPhase = nextSessionCount === 0 ? 'longBreak' : 'shortBreak';
    } else {
      nextPhase = 'work';
    }

    let totalSeconds: number;
    switch (nextPhase) {
      case 'work':        totalSeconds = workDuration * 60;       break;
      case 'shortBreak':  totalSeconds = shortBreakDuration * 60; break;
      case 'longBreak':   totalSeconds = longBreakDuration * 60;  break;
    }

    set({ phase: nextPhase, secondsLeft: totalSeconds, totalSeconds, isRunning: false, sessionCount: nextSessionCount, completedPomodoros: nextCompletedPomodoros });
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  recordSession: async (phase, duration, taskId, taskTitle, notes) => {
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

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('sessions').insert({
        id: session.id,
        user_id: userId,
        startedAt: session.startedAt,
        duration: session.duration,
        phase: session.phase,
        taskId: session.taskId ?? null,
        taskTitle: session.taskTitle ?? null,
        notes: session.notes ?? null,
      });
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  },

  rateMood: async (sessionId, mood) => {
    set({ sessions: get().sessions.map((s) => s.id === sessionId ? { ...s, mood } : s) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('sessions').update({ mood }).eq('id', sessionId).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to save mood:', e);
    }
  },

  addFocusSeconds: async (seconds) => {
    const newTotal = get().todayFocusSeconds + seconds;
    set({ todayFocusSeconds: newTotal });

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      const today = todayStr();
      await supabase.from('focus_days').upsert(
        { user_id: userId, date: today, seconds: newTotal },
        { onConflict: 'user_id,date' }
      );
    } catch (e) {
      console.warn('Failed to save focus time:', e);
    }
  },
}));
