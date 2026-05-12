-- 0022_security_hardening.sql
-- Tighten multi-tenant admin boundaries and CSV/export-era schema risks.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS platform_admin boolean NOT NULL DEFAULT false;

-- Preserve the current platform operators before future tenant admins are
-- onboarded. New org admins should be user_organizations.role='admin' only.
UPDATE public.users
SET platform_admin = true
WHERE role = 'admin'
  AND platform_admin = false;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT COALESCE((SELECT platform_admin FROM public.current_app_user()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- The app no longer needs this view. It was a definer view over public.users
-- plus auth.identities, so revoke direct access and force invoker semantics.
ALTER VIEW IF EXISTS public.users_with_providers SET (security_invoker = true);
REVOKE ALL ON public.users_with_providers FROM authenticated;

DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_organizations uo
      JOIN public.users u ON u.id = uo.user_id
      WHERE u.auth_user_id = auth.uid()
        AND u.removed_at IS NULL
        AND uo.organization_id = organizations.id
    )
  );

DROP POLICY IF EXISTS user_organizations_select ON public.user_organizations;
DROP POLICY IF EXISTS user_organizations_admin_all ON public.user_organizations;
DROP POLICY IF EXISTS user_orgs_self_read ON public.user_organizations;
DROP POLICY IF EXISTS user_orgs_admin_all ON public.user_organizations;

CREATE POLICY user_organizations_select ON public.user_organizations
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR (public.is_admin() AND organization_id = public.current_org_id())
  );

CREATE POLICY user_organizations_admin_all ON public.user_organizations
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR (public.is_admin() AND organization_id = public.current_org_id())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (public.is_admin() AND organization_id = public.current_org_id())
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_organizations_role_check'
      AND conrelid = 'public.user_organizations'::regclass
  ) THEN
    ALTER TABLE public.user_organizations
      ADD CONSTRAINT user_organizations_role_check
      CHECK (role IN ('admin', 'member')) NOT VALID;
    ALTER TABLE public.user_organizations
      VALIDATE CONSTRAINT user_organizations_role_check;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.donations_same_org_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.donees d
    WHERE d.id = NEW.donee_id
      AND d.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'donee_id must belong to the donation organization';
  END IF;

  IF NEW.fund_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.funds f
    WHERE f.id = NEW.fund_id
      AND f.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'fund_id must belong to the donation organization';
  END IF;

  IF NEW.campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = NEW.campaign_id
      AND c.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'campaign_id must belong to the donation organization';
  END IF;

  IF NEW.appeal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appeals a
    WHERE a.id = NEW.appeal_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'appeal_id must belong to the donation organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donations_same_org_guard_trg ON public.donations;
CREATE TRIGGER donations_same_org_guard_trg
BEFORE INSERT OR UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.donations_same_org_guard();

CREATE OR REPLACE FUNCTION public.donee_external_refs_same_org_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.donees d
    WHERE d.id = NEW.donee_id
      AND d.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'donee external ref must belong to the donee organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donee_external_refs_same_org_guard_trg
  ON public.donee_external_refs;
CREATE TRIGGER donee_external_refs_same_org_guard_trg
BEFORE INSERT OR UPDATE ON public.donee_external_refs
FOR EACH ROW EXECUTE FUNCTION public.donee_external_refs_same_org_guard();
