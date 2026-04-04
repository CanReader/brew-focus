import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

function mapError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.includes('Unable to validate email')) return 'Please enter a valid email address.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
  return msg;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  resetEmailSent: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  resetEmailSent: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, session, isLoading: false });
    } catch {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return false;
    }
    set({ user: data.user, session: data.session, isLoading: false });
    return true;
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return { success: false, needsConfirmation: false };
    }
    // If session exists, email confirmation is disabled — signed in immediately
    if (data.session) {
      set({ user: data.user, session: data.session, isLoading: false });
      return { success: true, needsConfirmation: false };
    }
    // Email confirmation required
    set({ isLoading: false });
    return { success: true, needsConfirmation: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // Reload the page to cleanly reset all store state
    window.location.reload();
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null, resetEmailSent: false });
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return false;
    }
    set({ resetEmailSent: true, isLoading: false });
    return true;
  },

  clearError: () => set({ error: null }),
}));
