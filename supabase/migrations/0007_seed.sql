-- 0007_seed.sql
INSERT INTO public.donees (name) VALUES ('Anon')
  ON CONFLICT DO NOTHING;

INSERT INTO public.funds (name) VALUES ('General')
  ON CONFLICT (name) DO NOTHING;
