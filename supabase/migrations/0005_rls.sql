-- 0005_rls.sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- USERS: any signed-in app user can read; only admins can mutate.
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (public.current_app_user() IS NOT NULL);

CREATE POLICY users_admin_all ON public.users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DONEES: any signed-in user can read/insert/update; no deletes.
CREATE POLICY donees_select ON public.donees
  FOR SELECT TO authenticated
  USING (public.current_app_user() IS NOT NULL);

CREATE POLICY donees_insert ON public.donees
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_user() IS NOT NULL);

CREATE POLICY donees_update ON public.donees
  FOR UPDATE TO authenticated
  USING (public.current_app_user() IS NOT NULL)
  WITH CHECK (public.current_app_user() IS NOT NULL);

-- FUNDS: read by all; admin-only write.
CREATE POLICY funds_select ON public.funds
  FOR SELECT TO authenticated
  USING (public.current_app_user() IS NOT NULL);

CREATE POLICY funds_admin_all ON public.funds
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DONATIONS: read by all; insert/update by any signed-in; no deletes.
CREATE POLICY donations_select ON public.donations
  FOR SELECT TO authenticated
  USING (public.current_app_user() IS NOT NULL);

CREATE POLICY donations_insert ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_user() IS NOT NULL
    AND created_by = (public.current_app_user()).id
  );

CREATE POLICY donations_update ON public.donations
  FOR UPDATE TO authenticated
  USING (public.current_app_user() IS NOT NULL)
  WITH CHECK (public.current_app_user() IS NOT NULL);
