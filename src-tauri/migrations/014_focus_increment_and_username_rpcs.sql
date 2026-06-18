-- 014: server-side RPCs the client already calls, plus defensive
-- username uniqueness + signup-profile RLS convergence.
--
-- Why a new migration instead of editing 001/006: those already ran on the
-- live database, so edits to them are inert. The desktop and mobile clients
-- ship code that calls these RPCs (with in-app fallbacks) — this file is what
-- actually creates them. Everything here is idempotent so it is safe to run on
-- a fresh database and on the existing one.

-- ============================================================
-- increment_focus_seconds: atomic per-day focus accumulation.
-- The old read-modify-write upsert lost increments when two clients
-- (two desktop windows, or desktop + mobile) wrote the same local-day row
-- concurrently. This does the add in a single statement under a row lock.
-- Returns the new running total so the client can sync its display.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_focus_seconds(p_date TEXT, p_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  -- Guard against a NULL/negative argument poisoning the running total.
  IF p_seconds IS NULL OR p_seconds < 0 THEN
    RAISE EXCEPTION 'p_seconds must be a non-negative integer';
  END IF;

  INSERT INTO public.focus_days (user_id, date, seconds)
  VALUES (auth.uid(), p_date, p_seconds)
  ON CONFLICT (user_id, date)
  DO UPDATE SET seconds = public.focus_days.seconds + EXCLUDED.seconds
  RETURNING seconds INTO v_total;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_focus_seconds(TEXT, INTEGER) TO authenticated;

-- ============================================================
-- is_username_taken: existence check that works even when the profiles
-- SELECT policy is locked down. Called pre-auth during signup, so it is
-- granted to anon as well. Case-insensitive to match the client, which
-- lowercases every username before storing it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_username_taken(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(trim(p_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_taken(TEXT) TO anon, authenticated;

-- ============================================================
-- email_for_username: resolve a login identifier to its email so users can
-- sign in by username. Runs before the session exists and must see rows even
-- when profiles.email is RLS-locked, hence SECURITY DEFINER + anon grant.
-- ============================================================
CREATE OR REPLACE FUNCTION public.email_for_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE lower(username) = lower(trim(p_username))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.email_for_username(TEXT) TO anon, authenticated;

-- ============================================================
-- Defensive username uniqueness. 006 declared the column UNIQUE, but a
-- case-insensitive index also blocks 'Bob' vs 'bob' duplicates (the client
-- lowercases, but a stray direct write or legacy row could collide).
-- Idempotent.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

-- ============================================================
-- Signup-profile insert policy convergence. The handle_new_user trigger is
-- authoritative, but the client also upserts its own profile right after
-- signUp; that write needs an INSERT policy. Recreate it idempotently so a
-- fresh DB matches the live one.
-- ============================================================
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
