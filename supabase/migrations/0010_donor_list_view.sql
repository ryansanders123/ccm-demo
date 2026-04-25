-- 0010_donor_list_view.sql
-- Aggregates donor + lifetime giving + last gift in a single query so the
-- /donors list doesn't have to page 12k+ donations to the app server.
-- security_invoker = true ensures RLS on donees/donations applies.

CREATE OR REPLACE VIEW public.donor_list_v
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.name,
  d.email,
  d.phone,
  COALESCE(SUM(don.amount) FILTER (WHERE don.voided_at IS NULL), 0)::numeric AS lifetime_total,
  COUNT(don.id) FILTER (WHERE don.voided_at IS NULL)::int AS gift_count,
  MAX(don.date_received) FILTER (WHERE don.voided_at IS NULL) AS last_gift_at
FROM public.donees d
LEFT JOIN public.donations don ON don.donee_id = d.id
GROUP BY d.id, d.name, d.email, d.phone;

GRANT SELECT ON public.donor_list_v TO authenticated;
