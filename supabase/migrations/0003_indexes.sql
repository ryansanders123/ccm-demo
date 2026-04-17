-- 0003_indexes.sql
CREATE UNIQUE INDEX users_email_lower_idx  ON public.users (lower(email));
CREATE INDEX donations_date_idx            ON public.donations (date_received DESC);
CREATE INDEX donations_donee_idx           ON public.donations (donee_id);
CREATE INDEX donations_fund_idx            ON public.donations (fund_id);
CREATE INDEX donations_active_idx          ON public.donations (date_received DESC) WHERE voided_at IS NULL;
CREATE INDEX donees_name_trgm_idx          ON public.donees USING gin (name gin_trgm_ops);
CREATE INDEX donees_name_lower_idx         ON public.donees (lower(name));
