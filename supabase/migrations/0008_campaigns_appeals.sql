-- 0008_campaigns_appeals.sql
-- Adds Campaigns and Appeals as independent dimensions on donations.
-- Decisions:
--   * Campaign and Appeal are independent (no FK between them).
--   * Donation must have at least one of {fund_id, campaign_id, appeal_id} set.
--   * fund_id therefore becomes nullable.
--   * Imported rows already have fund_id, so the CHECK passes for them.

CREATE TABLE public.campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  goal_amount  numeric(12,2),
  start_date   date,
  end_date     date,
  archived_at  timestamptz,
  created_by   uuid REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appeals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  archived_at  timestamptz,
  created_by   uuid REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations
  ALTER COLUMN fund_id DROP NOT NULL;

ALTER TABLE public.donations
  ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  ADD COLUMN appeal_id   uuid REFERENCES public.appeals(id)   ON DELETE RESTRICT;

ALTER TABLE public.donations
  ADD CONSTRAINT donations_taxonomy_chk
  CHECK (fund_id IS NOT NULL OR campaign_id IS NOT NULL OR appeal_id IS NOT NULL);

CREATE INDEX donations_campaign_id_idx ON public.donations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX donations_appeal_id_idx   ON public.donations(appeal_id)   WHERE appeal_id   IS NOT NULL;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals   ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.is_app_user());

CREATE POLICY campaigns_admin_all ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY appeals_select ON public.appeals
  FOR SELECT TO authenticated
  USING (public.is_app_user());

CREATE POLICY appeals_admin_all ON public.appeals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
