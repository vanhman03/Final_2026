-- =============================================================================
-- Migration: Screen-time rolling 24-hour window
-- Description:
--   1. Adds all EduKids-specific columns that the backend expects but are
--      currently absent from the `profiles` table (user_id, display_name,
--      screen_time_limit, total_watch_time, points, badges, pin_hash,
--      game_history, screen_time_reset_at, last_active_date,
--      videos_watched_count).
--   2. Replaces the old `increment_watch_time` RPC (if any) with the final
--      version that returns (total_watch_time, screen_time_limit,
--      screen_time_reset_at).
--   3. Adds a `user_roles` table if it does not exist yet.
--
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EduKids columns on profiles
-- ---------------------------------------------------------------------------

-- user_id: FK to auth.users, used by all backend queries as the lookup key
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- display_name: shown in the UI (backend falls back to email prefix)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- screen_time_limit: daily limit in minutes (default 60)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS screen_time_limit integer NOT NULL DEFAULT 60;

-- total_watch_time: minutes consumed in the current 24-hour window
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_watch_time integer NOT NULL DEFAULT 0;

-- screen_time_reset_at: anchor timestamp of the current 24-hour window.
-- When NOW() >= screen_time_reset_at + INTERVAL '24 hours' a reset is due.
-- Defaults to NOW() so brand-new rows start a fresh window immediately.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS screen_time_reset_at timestamptz NOT NULL DEFAULT now();

-- last_active_date: kept for historical reference; no longer drives resets
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- videos_watched_count: lifetime video count
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS videos_watched_count integer NOT NULL DEFAULT 0;

-- points / badges / game_history: gamification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS game_history jsonb NOT NULL DEFAULT '[]';

-- pin_hash: SHA-256 hex of the parental PIN (set by the backend)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash text;

-- ---------------------------------------------------------------------------
-- 2. Index: fast lookup by user_id
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx
  ON public.profiles (user_id);

-- ---------------------------------------------------------------------------
-- 3. user_roles table (role = 'admin' | 'parent')
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'parent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role; admins can read all
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. increment_watch_time(uuid) — atomic +1, returns current row values
--
--    Called every minute by the frontend interval.
--    The window-expiry check (24-hour rollover) is intentionally handled
--    in the Express route so the backend owns all business logic; this
--    function only does the safe atomic increment inside an active window.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_watch_time(p_user_id uuid)
RETURNS TABLE (
  total_watch_time    integer,
  screen_time_limit   integer,
  screen_time_reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_watch_time = profiles.total_watch_time + 1,
    updated_at       = now()
  WHERE user_id = p_user_id;

  RETURN QUERY
    SELECT p.total_watch_time,
           p.screen_time_limit,
           p.screen_time_reset_at
    FROM public.profiles p
    WHERE p.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_watch_time(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.increment_watch_time IS
  'Atomically increments total_watch_time by 1 minute for the given user and '
  'returns the updated (total_watch_time, screen_time_limit, screen_time_reset_at). '
  'Window-expiry / reset logic is handled in the Express backend.';

-- ---------------------------------------------------------------------------
-- 5. Trigger: auto-create a profile row when a new auth user signs up
--    (only runs if the trigger does not already exist)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, screen_time_reset_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. RLS on profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only read/write their own profile row
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role (used by the Express backend) bypasses RLS automatically.
