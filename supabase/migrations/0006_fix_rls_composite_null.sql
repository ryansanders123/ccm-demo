-- 0006_fix_rls_composite_null.sql
-- Fix: `current_app_user() IS NOT NULL` was always FALSE because the function
-- returns a composite row (public.users), and PG's composite IS NOT NULL is
-- TRUE only when *every* field is non-null. Rows with a NULL first_login_at,
-- invited_by, or removed_at therefore failed the check and silently filtered
-- every SELECT.

CREATE OR REPLACE FUNCTION public.is_app_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND removed_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_user() TO authenticated;

-- Rewrite policies to use is_app_user() instead of the broken composite check.

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (public.is_app_user());

DROP POLICY IF EXISTS donees_select ON public.donees;
CREATE POLICY donees_select ON public.donees
  FOR SELECT TO authenticated
  USING (public.is_app_user());

DROP POLICY IF EXISTS donees_insert ON public.donees;
CREATE POLICY donees_insert ON public.donees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_app_user());

DROP POLICY IF EXISTS donees_update ON public.donees;
CREATE POLICY donees_update ON public.donees
  FOR UPDATE TO authenticated
  USING (public.is_app_user())
  WITH CHECK (public.is_app_user());

DROP POLICY IF EXISTS funds_select ON public.funds;
CREATE POLICY funds_select ON public.funds
  FOR SELECT TO authenticated
  USING (public.is_app_user());

DROP POLICY IF EXISTS donations_select ON public.donations;
CREATE POLICY donations_select ON public.donations
  FOR SELECT TO authenticated
  USING (public.is_app_user());

DROP POLICY IF EXISTS donations_insert ON public.donations;
CREATE POLICY donations_insert ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_app_user()
    AND created_by = (public.current_app_user()).id
  );

DROP POLICY IF EXISTS donations_update ON public.donations;
CREATE POLICY donations_update ON public.donations
  FOR UPDATE TO authenticated
  USING (public.is_app_user())
  WITH CHECK (public.is_app_user());
