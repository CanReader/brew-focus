-- 015: security hardening for findings from `supabase db advisors --type security`.
--
-- None of these were exploitable (every SECURITY DEFINER function below already
-- self-guards on auth.uid()), but they tighten least-privilege and clear the
-- linter warnings before the production release.

-- ── delete_user / export_user_data ──────────────────────────────────────────
-- Both are authenticated-only account operations that self-scope to auth.uid().
-- Supabase's default privileges had also granted EXECUTE to anon, exposing them
-- at /rest/v1/rpc/* without a session. Drop anon; keep authenticated.
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.export_user_data() FROM anon;

-- ── handle_new_user ─────────────────────────────────────────────────────────
-- Trigger function on auth.users. It had a mutable search_path and was exposed
-- as a public RPC. Pin search_path and revoke all direct EXECUTE — the trigger
-- still fires (triggers run the function regardless of EXECUTE grants), it just
-- can no longer be invoked directly via the REST API.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ── coffee_cup_variants_touch_updated_at ────────────────────────────────────
-- SECURITY INVOKER updated_at trigger; just pin its search_path.
CREATE OR REPLACE FUNCTION public.coffee_cup_variants_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Note: "Leaked password protection" (HaveIBeenPwned) is an Auth project setting,
-- not SQL — enable it in Dashboard → Authentication → Password security.
