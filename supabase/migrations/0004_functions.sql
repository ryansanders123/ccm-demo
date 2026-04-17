-- 0004_functions.sql
CREATE OR REPLACE FUNCTION public.current_app_user()
RETURNS public.users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT *
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND removed_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.current_app_user()), false);
$$;

GRANT EXECUTE ON FUNCTION public.current_app_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE VIEW public.users_with_providers AS
SELECT u.*,
       ARRAY(SELECT provider FROM auth.identities
             WHERE user_id = u.auth_user_id
             ORDER BY created_at) AS providers
FROM public.users u;

GRANT SELECT ON public.users_with_providers TO authenticated;
