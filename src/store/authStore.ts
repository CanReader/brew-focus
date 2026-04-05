import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

function mapError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect username/email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.includes('Unable to validate email')) return 'Please enter a valid email address.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
  if (msg.includes('duplicate key') && msg.includes('username')) return 'That username is already taken.';
  return msg;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  resetEmailSent: boolean;
  initialize: () => Promise<void>;
  signIn: (usernameOrEmail: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<boolean>;
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

  signIn: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });

    // If input doesn't look like an email, look up email by username
    let email = usernameOrEmail;
    if (!usernameOrEmail.includes('@')) {
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', usernameOrEmail.toLowerCase().trim())
        .single();
      if (lookupErr || !profile) {
        set({ error: 'No account found with that username.', isLoading: false });
        return false;
      }
      email = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return false;
    }
    set({ user: data.user, session: data.session, isLoading: false });
    return true;
  },

  signUp: async (email, password, username) => {
    set({ isLoading: true, error: null });

    // Check username availability before creating account
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    if (existing) {
      set({ error: 'That username is already taken.', isLoading: false });
      return { success: false, needsConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase().trim() } },
    });
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return { success: false, needsConfirmation: false };
    }

    // Insert profile row (trigger may also do this — upsert to be safe)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        email,
      }, { onConflict: 'id' });
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

  updateUsername: async (newUsername) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: 'Not authenticated.' };

    const cleaned = newUsername.toLowerCase().trim();

    // Check availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .neq('id', currentUser.id)
      .maybeSingle();
    if (existing) return { success: false, error: 'That username is already taken.' };

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ username: cleaned })
      .eq('id', currentUser.id);
    if (profileErr) return { success: false, error: mapError(profileErr.message) };

    const { error: authErr } = await supabase.auth.updateUser({ data: { username: cleaned } });
    if (authErr) return { success: false, error: mapError(authErr.message) };

    const { data: { user } } = await supabase.auth.getUser();
    set({ user });
    return { success: true };
  },

  updatePassword: async (currentPassword, newPassword) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.email) return { success: false, error: 'Not authenticated.' };

    // Verify current password
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });
    if (verifyErr) return { success: false, error: 'Current password is incorrect.' };

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) return { success: false, error: mapError(updateErr.message) };

    return { success: true };
  },

  updateAvatar: async (file) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: 'Not authenticated.' };

    // Upload to Supabase Storage bucket "avatars"
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${currentUser.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('Avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) return { success: false, error: uploadErr.message };

    // Get public URL with cache-buster
    const { data: { publicUrl } } = supabase.storage.from('Avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: authErr } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (authErr) return { success: false, error: mapError(authErr.message) };

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);

    const { data: { user } } = await supabase.auth.getUser();
    set({ user });
    return { success: true };
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc('delete_user');
    if (error) return false;
    window.location.reload();
    return true;
  },
}));
