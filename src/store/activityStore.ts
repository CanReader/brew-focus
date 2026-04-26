import { create } from 'zustand';
import { ActivityEvent, ActivityEventType } from '../types';
import { supabase, getCurrentUserId } from '../utils/supabase';
import { nanoid } from '../utils/nanoid';

interface ActivityStore {
  events: ActivityEvent[];
  isLoaded: boolean;
  loadEvents: () => Promise<void>;
  log: (
    type: ActivityEventType,
    opts: { taskId?: string; projectId?: string; payload?: Record<string, unknown> },
  ) => Promise<void>;
  clearForTask: (taskId: string) => Promise<void>;
}

function rowToEvent(r: Record<string, unknown>): ActivityEvent {
  return {
    id: r.id as string,
    taskId: r.task_id as string | undefined,
    projectId: r.project_id as string | undefined,
    type: r.type as ActivityEventType,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: r.created_at as number,
  };
}

const RECENT_LIMIT = 500;

export const useActivityStore = create<ActivityStore>((set, get) => ({
  events: [],
  isLoaded: false,

  loadEvents: async () => {
    const userId = await getCurrentUserId();
    if (!userId) { set({ isLoaded: true }); return; }
    try {
      const { data } = await supabase
        .from('activity_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT);
      const events = (data ?? []).map(rowToEvent);
      set({ events, isLoaded: true });
    } catch (e) {
      console.warn('Failed to load activity events:', e);
      set({ isLoaded: true });
    }
  },

  log: async (type, { taskId, projectId, payload }) => {
    const event: ActivityEvent = {
      id: nanoid(),
      taskId,
      projectId,
      type,
      payload: payload ?? {},
      createdAt: Date.now(),
    };
    // Optimistic prepend, capped.
    set({ events: [event, ...get().events].slice(0, RECENT_LIMIT) });

    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('activity_events').insert({
        id: event.id,
        user_id: userId,
        task_id: event.taskId ?? null,
        project_id: event.projectId ?? null,
        type: event.type,
        payload: event.payload,
        created_at: event.createdAt,
      });
    } catch (e) {
      console.warn('Failed to log activity event:', e);
    }
  },

  clearForTask: async (taskId) => {
    set({ events: get().events.filter((e) => e.taskId !== taskId) });
    const userId = await getCurrentUserId();
    if (!userId) return;
    try {
      await supabase.from('activity_events').delete().eq('task_id', taskId).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed to clear task activity:', e);
    }
  },
}));
