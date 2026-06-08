import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in desktop/.env.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verifies a password without clobbering the current session.
 * Creates an isolated client with persistSession: false so the sign-in does
 * not replace the active user's session in localStorage.
 */
export async function verifyPasswordWithoutSessionSwap(email: string, password: string): Promise<boolean> {
  const ephemeral = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await ephemeral.auth.signInWithPassword({ email, password });
  if (!error) {
    // scope: 'local' tears down only this ephemeral session. The default
    // 'global' scope revokes every refresh token for the user server-side,
    // which would silently log the real app session out on its next refresh.
    await ephemeral.auth.signOut({ scope: 'local' }).catch(() => {});
  }
  return !error;
}

/**
 * Returns the current authenticated user's ID, or null if not signed in.
 *
 * Uses the locally-cached session rather than getUser(). getUser() makes a
 * network round-trip on every call — and there is one call per store mutation
 * (~36 sites) — which adds latency and, worse, resolves to null whenever the
 * device is offline. That made every write silently bail (optimistic update
 * stays in memory, never persists, then vanishes on next load) even though a
 * perfectly valid session existed. getSession() reads from local storage and
 * transparently refreshes an expired token, so writes survive offline / flaky
 * networks. Row-Level Security still enforces real authorization server-side.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
