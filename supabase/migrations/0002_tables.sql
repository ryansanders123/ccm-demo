-- 0002_tables.sql
CREATE TABLE public.users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE REFERENCES auth.users(id),
  email          citext NOT NULL UNIQUE,
  role           text NOT NULL CHECK (role IN ('admin','user')),
  invited_at     timestamptz NOT NULL DEFAULT now(),
  invited_by     uuid REFERENCES public.users(id),
  first_login_at timestamptz,
  last_login_at  timestamptz,
  removed_at     timestamptz
);

CREATE TABLE public.donees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text,
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.users(id)
);

CREATE TABLE public.funds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.donations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donee_id                uuid NOT NULL REFERENCES public.donees(id),
  fund_id                 uuid NOT NULL REFERENCES public.funds(id),
  type                    text NOT NULL CHECK (type IN ('cash','check','online')),
  amount                  numeric(12,2) NOT NULL CHECK (amount > 0),
  date_received           date NOT NULL DEFAULT current_date,
  check_number            text,
  reference_id            text,
  note                    text,
  created_by              uuid NOT NULL REFERENCES public.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  voided_at               timestamptz,
  voided_by               uuid REFERENCES public.users(id),
  void_reason             text,
  replaced_by_donation_id uuid REFERENCES public.donations(id),
  CONSTRAINT check_requires_check_number CHECK ((type = 'check')  = (check_number IS NOT NULL)),
  CONSTRAINT online_requires_reference   CHECK ((type = 'online') = (reference_id IS NOT NULL)),
  CONSTRAINT void_fields_consistent      CHECK ((voided_at IS NULL) = (voided_by IS NULL AND void_reason IS NULL))
);
