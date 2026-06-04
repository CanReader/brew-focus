import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, verifyPasswordWithoutSessionSwap } from '../utils/supabase';

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

// Username→email and username-availability go through SECURITY DEFINER RPCs so
// the `profiles` table can be locked to own-row reads (otherwise the anon role
// could enumerate everyone's email). We try the RPC first and fall back to a
// direct select when it isn't deployed yet, so the client is safe regardless
// of backend deploy order. NOTE: backend must deploy the RPCs BEFORE locking
// the RLS policy, or both paths return null and login/signup break.
async function resolveEmailForUsername(uname: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('email_for_username', { p_username: uname });
  if (!error) return typeof data === 'string' ? data : null;
  // RPC not deployed yet — fall back to the direct read (works pre-RLS-lock).
  const { data: profile } = await supabase.from('profiles').select('email').eq('username', uname).single();
  return (profile?.email as string | undefined) ?? null;
}

async function isUsernameTaken(uname: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_taken', { p_username: uname });
  if (!error) return data === true;
  // Fallback until the RPC is deployed.
  const { data: existing } = await supabase.from('profiles').select('username').eq('username', uname).maybeSingle();
  return !!existing;
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

let _authInitialized = false;
let _authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  resetEmailSent: false,

  initialize: async () => {
    if (_authInitialized) return;
    _authInitialized = true;

    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, session, isLoading: false });
    } catch {
      set({ isLoading: false });
    }

    _authSubscription?.unsubscribe();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
    _authSubscription = data.subscription;
  },

  signIn: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });

    // If input doesn't look like an email, resolve email by username (via RPC,
    // falling back to a direct read until the RPC is deployed).
    let email = usernameOrEmail;
    if (!usernameOrEmail.includes('@')) {
      const resolved = await resolveEmailForUsername(usernameOrEmail.toLowerCase().trim());
      if (!resolved) {
        set({ error: 'No account found with that username.', isLoading: false });
        return false;
      }
      email = resolved;
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

    // Check username availability before creating account (via RPC, with a
    // direct-read fallback until the RPC is deployed).
    if (await isUsernameTaken(username.toLowerCase().trim())) {
      set({ error: 'That username is already taken.', isLoading: false });
      return { success: false, needsConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase().trim() },
        emailRedirectTo: 'brewfocus://auth/callback',
      },
    });
    if (error) {
      set({ error: mapError(error.message), isLoading: false });
      return { success: false, needsConfirmation: false };
    }

    // Supabase's anti-enumeration: signUp for an already-registered, confirmed
    // email returns `{user: {identities: []}, session: null}` with no error.
    // Surface this so the user isn't told to check their inbox for nothing.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      set({ error: 'An account with this email already exists. Try signing in.', isLoading: false });
      return { success: false, needsConfirmation: false };
    }

    // Insert profile row (trigger may also do this — upsert to be safe).
    // If RLS rejects this (e.g. email confirmation required so no session yet),
    // the trigger is authoritative. Log the error so it isn't invisible.
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        email,
      }, { onConflict: 'id' });
      if (profileErr) console.warn('Profile upsert after signup failed:', profileErr.message);
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'brewfocus://auth/callback',
    });
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
    const currentUsername = (currentUser.user_metadata?.username as string | undefined)?.toLowerCase();

    // Skip the availability check on a no-op self-rename so is_username_taken
    // (which can't express the old .neq(self) exclusion) doesn't false-positive.
    // Matches the mobile client's rename flow.
    if (cleaned !== currentUsername && await isUsernameTaken(cleaned)) {
      return { success: false, error: 'That username is already taken.' };
    }

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

    const verified = await verifyPasswordWithoutSessionSwap(currentUser.email, currentPassword);
    if (!verified) return { success: false, error: 'Current password is incorrect.' };

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) return { success: false, error: mapError(updateErr.message) };

    return { success: true };
  },

  updateAvatar: async (file) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: 'Not authenticated.' };

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${currentUser.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('Avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) return { success: false, error: uploadErr.message };

    const { data: { publicUrl } } = supabase.storage.from('Avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: authErr } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (authErr) return { success: false, error: mapError(authErr.message) };

    const { error: profErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);
    if (profErr) console.warn('Failed to update avatar on profiles row:', profErr.message);

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
