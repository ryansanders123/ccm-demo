-- 0023_pds_report_rpc.sql
-- Public-schema RPC wrappers for PDS report data. The pds schema is not exposed
-- through Supabase's REST API, so app code calls these guarded functions.

CREATE OR REPLACE FUNCTION public.pds_ar_vr_vh_rows()
RETURNS TABLE (
  county text,
  gender text,
  age_segment text,
  flg_dem text,
  flg_rep text,
  voting_recency text,
  records integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pds
AS $$
  SELECT
    s.county,
    s.gender,
    s.age_segment,
    s.flg_dem,
    s.flg_rep,
    s.voting_recency,
    s.records
  FROM pds.ar_vr_vh_summary s
  WHERE public.is_app_user();
$$;

CREATE OR REPLACE FUNCTION public.pds_accudata_ubi_rows()
RETURNS TABLE (
  state text,
  zip text,
  ubi integer,
  households integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pds
AS $$
  SELECT
    s.state,
    s.zip,
    s.ubi,
    s.households
  FROM pds.accudata_ubi s
  WHERE public.is_app_user();
$$;

GRANT EXECUTE ON FUNCTION public.pds_ar_vr_vh_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pds_accudata_ubi_rows() TO authenticated;
