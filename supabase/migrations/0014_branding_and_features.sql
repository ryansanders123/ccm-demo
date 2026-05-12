-- 0014_branding_and_features.sql
-- Per-org branding and feature flags. Moves what was global env-var
-- configuration (NEXT_PUBLIC_ORG_NAME / LOGO_URL / SUPPORT_EMAIL /
-- ADDRESS / TAX_STATEMENT) into rows on public.organizations so each
-- tenant can have its own. Adds a `features` jsonb so different orgs
-- can hide pieces of the app they don't use (campaigns, appeals,
-- tax-summary, import).
--
-- Backfills CCMC with sensible defaults (burgundy brand, all features
-- on) and WRH with everything off — WRH is a reports-only tenant that
-- shouldn't see donation features if a user lands on this app.
--
-- RLS unchanged: organizations_select (added in 0011) gates by
-- id = current_org_id(), and the org switcher updates current_org_id
-- to a row the user has a user_organizations row for.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url           text,
  ADD COLUMN IF NOT EXISTS primary_color      text,
  ADD COLUMN IF NOT EXISTS support_email      text,
  ADD COLUMN IF NOT EXISTS mailing_address    text,
  ADD COLUMN IF NOT EXISTS tax_statement_text text,
  ADD COLUMN IF NOT EXISTS features           jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow members of an org to read its branding so the layout can render
-- it (previous select policy was scoped to current_org_id only, which is
-- right for the active org but doesn't help the org switcher render
-- *other* orgs' names + logos). Widen to: any user_organizations
-- membership grants read.
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organizations uo
      JOIN public.users u ON u.id = uo.user_id
      WHERE u.auth_user_id = auth.uid()
        AND u.removed_at IS NULL
        AND uo.organization_id = organizations.id
    )
  );

-- Seed CCMC: burgundy brand from the cutover spec; every feature on.
UPDATE public.organizations
SET logo_url       = COALESCE(logo_url, '/logo.png'),
    primary_color  = COALESCE(primary_color, '#751411'),
    features       = features
                     || jsonb_build_object(
                          'campaigns',   true,
                          'appeals',     true,
                          'tax_summary', true,
                          'import',      true,
                          'exports',     true
                        )
WHERE slug = 'ccmc';

-- Seed WRH: reports-only org, no donation features. Branding left blank
-- (WRH portal has its own UI).
UPDATE public.organizations
SET features = features
               || jsonb_build_object(
                    'campaigns',   false,
                    'appeals',     false,
                    'tax_summary', false,
                    'import',      false,
                    'exports',     false
                  )
WHERE slug = 'wrh';

-- Verification: every org has a features object (NOT NULL default
-- ensures this); CCMC has its brand color set.
DO $$
DECLARE
  feat_count int;
BEGIN
  SELECT count(*) INTO feat_count FROM public.organizations WHERE features IS NULL;
  IF feat_count > 0 THEN RAISE EXCEPTION 'organizations has % rows with NULL features', feat_count; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE slug = 'ccmc' AND primary_color IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'CCMC brand not seeded';
  END IF;
END$$;
