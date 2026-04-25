-- 0009_donee_address_split.sql
-- Add structured address columns to donees so tax exports / mail-merge can use
-- them. The legacy single-string `address` column stays as a display-only
-- field. Backfill via scripts/backfill-donee-addresses.mjs after migration.

ALTER TABLE public.donees
  ADD COLUMN address_line1 text,
  ADD COLUMN address_line2 text,
  ADD COLUMN city          text,
  ADD COLUMN state         text,
  ADD COLUMN zip           text;
