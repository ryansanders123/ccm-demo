-- 0006_triggers.sql

-- Donation updates may only touch void-related columns.
CREATE OR REPLACE FUNCTION public.donations_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.donee_id        IS DISTINCT FROM OLD.donee_id        THEN RAISE EXCEPTION 'donee_id is immutable'; END IF;
  IF NEW.fund_id         IS DISTINCT FROM OLD.fund_id         THEN RAISE EXCEPTION 'fund_id is immutable'; END IF;
  IF NEW.type            IS DISTINCT FROM OLD.type            THEN RAISE EXCEPTION 'type is immutable'; END IF;
  IF NEW.amount          IS DISTINCT FROM OLD.amount          THEN RAISE EXCEPTION 'amount is immutable'; END IF;
  IF NEW.date_received   IS DISTINCT FROM OLD.date_received   THEN RAISE EXCEPTION 'date_received is immutable'; END IF;
  IF NEW.check_number    IS DISTINCT FROM OLD.check_number    THEN RAISE EXCEPTION 'check_number is immutable'; END IF;
  IF NEW.reference_id    IS DISTINCT FROM OLD.reference_id    THEN RAISE EXCEPTION 'reference_id is immutable'; END IF;
  IF NEW.note            IS DISTINCT FROM OLD.note            THEN RAISE EXCEPTION 'note is immutable'; END IF;
  IF NEW.created_by      IS DISTINCT FROM OLD.created_by      THEN RAISE EXCEPTION 'created_by is immutable'; END IF;
  IF NEW.created_at      IS DISTINCT FROM OLD.created_at      THEN RAISE EXCEPTION 'created_at is immutable'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER donations_immutable_fields_trg
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.donations_immutable_fields();

-- Protect the "last admin": can't demote or remove if they're the only active admin.
CREATE OR REPLACE FUNCTION public.users_last_admin_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  active_admin_count int;
BEGIN
  IF OLD.role = 'admin' AND OLD.removed_at IS NULL THEN
    IF NEW.role <> 'admin' OR NEW.removed_at IS NOT NULL THEN
      SELECT count(*) INTO active_admin_count
      FROM public.users
      WHERE role = 'admin' AND removed_at IS NULL AND id <> OLD.id;

      IF active_admin_count = 0 THEN
        RAISE EXCEPTION 'cannot demote or remove the last active admin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_last_admin_guard_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.users_last_admin_guard();
