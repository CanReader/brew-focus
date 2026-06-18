-- 014: server-side RPCs the client already calls but no migration ever created.
--
-- Why a new migration instead of editing 001/006: those already ran on the
-- live database, so edits to them are inert. The desktop and mobile clients
-- ship code that calls these RPCs (with in-app fallbacks) — this file is what
-- actually creates them. Every function uses CREATE OR REPLACE so a re-run is
-- safe on both a fresh database and the existing one.
--
-- Security note: is_username_taken and email_for_username run pre-auth (during
-- signup / username login) and must see profiles rows even when the profiles
-- SELECT/email columns are RLS-locked — hence SECURITY DEFINER + an `anon`
-- grant. They expose only a boolean (taken/not) and the email for a known
-- username, which the login flow needs anyway; no other columns leak.

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
-- increment_pomodoro_completed: atomic per-task pomodoro counter.
-- The client used to SELECT then UPDATE, which lost an increment when two
-- pomodoros completed concurrently (two windows, or fullscreen + widget).
-- Scoped to the caller's own row via auth.uid(); returns the new count.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_pomodoro_completed(p_task_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.tasks
  SET "pomodoroCompleted" = COALESCE("pomodoroCompleted", 0) + 1
  WHERE id = p_task_id AND user_id = auth.uid()
  RETURNING "pomodoroCompleted" INTO v_count;

  RETURN v_count; -- NULL if the row doesn't exist / isn't the caller's
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_pomodoro_completed(TEXT) TO authenticated;

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

-- Note: UNIQUE(username) and the signup-profile INSERT RLS policy already live
-- in 006_profiles.sql, so they are intentionally NOT duplicated here.
