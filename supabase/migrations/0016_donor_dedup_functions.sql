-- 0016_donor_dedup_functions.sql
-- Atomic merge + undo for donor dedup. Sits on top of 0015 (which
-- created donee_dup_rejections + donee_merges + the candidate engine).
--
-- Both functions are SECURITY DEFINER but enforce that the caller is
-- an admin of the active org via is_admin() + current_org_id().

CREATE OR REPLACE FUNCTION public.do_merge_donees(
  p_winner_id uuid,
  p_loser_id  uuid,
  p_merged jsonb  -- { name, email, phone, address_line1, address_line2, city, state, zip }
)
RETURNS uuid                                    -- the donee_merges.id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_org_id        uuid;
  v_winner_before public.donees%ROWTYPE;
  v_winner_after  public.donees%ROWTYPE;
  v_loser_before  public.donees%ROWTYPE;
  v_loser_refs    jsonb;
  v_donations_moved uuid[];
  v_merged_by     uuid;
  v_merge_id      uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;
  v_org_id := public.current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no active organization';
  END IF;
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'cannot merge a donor with itself';
  END IF;

  SELECT id INTO v_merged_by FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;

  SELECT * INTO v_winner_before FROM public.donees
    WHERE id = p_winner_id AND organization_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'winner not found in active org'; END IF;
  SELECT * INTO v_loser_before  FROM public.donees
    WHERE id = p_loser_id  AND organization_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'loser not found in active org';  END IF;

  -- Snapshot the loser's external_refs before we move them.
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.source_name, r.external_id), '[]'::jsonb)
    INTO v_loser_refs
  FROM public.donee_external_refs r
  WHERE r.donee_id = p_loser_id;

  -- 1. Reassign donations and capture the moved ids for undo.
  WITH moved AS (
    UPDATE public.donations
       SET donee_id = p_winner_id
     WHERE donee_id = p_loser_id
     RETURNING id
  )
  SELECT array_agg(id) INTO v_donations_moved FROM moved;
  v_donations_moved := COALESCE(v_donations_moved, ARRAY[]::uuid[]);

  -- 2. Move external_refs to winner; skip rows that would collide on
  --    (organization_id, source_name, external_id) because the winner
  --    already has the same ref.
  WITH ins AS (
    INSERT INTO public.donee_external_refs (donee_id, source_name, external_id, organization_id)
    SELECT p_winner_id, r.source_name, r.external_id, r.organization_id
      FROM public.donee_external_refs r
     WHERE r.donee_id = p_loser_id
    ON CONFLICT (organization_id, source_name, external_id) DO NOTHING
    RETURNING 1
  ) SELECT 1 FROM ins LIMIT 0;
  DELETE FROM public.donee_external_refs WHERE donee_id = p_loser_id;

  -- 3. Apply admin-chosen field values to the winner.
  UPDATE public.donees
     SET name              = COALESCE(p_merged->>'name',              name),
         email             = NULLIF(COALESCE(p_merged->>'email',         email),         ''),
         phone             = NULLIF(COALESCE(p_merged->>'phone',         phone),         ''),
         address_line1     = NULLIF(COALESCE(p_merged->>'address_line1', address_line1), ''),
         address_line2     = NULLIF(COALESCE(p_merged->>'address_line2', address_line2), ''),
         city              = NULLIF(COALESCE(p_merged->>'city',          city),          ''),
         state             = NULLIF(COALESCE(p_merged->>'state',         state),         ''),
         zip               = NULLIF(COALESCE(p_merged->>'zip',           zip),           '')
   WHERE id = p_winner_id;

  SELECT * INTO v_winner_after FROM public.donees WHERE id = p_winner_id;

  -- 4. Audit row. Hard-delete the loser only after the snapshot is safely stored.
  INSERT INTO public.donee_merges
    (organization_id, winner_id, loser_id, snapshot, donations_moved, merged_by)
  VALUES (
    v_org_id,
    p_winner_id,
    p_loser_id,
    jsonb_build_object(
      'winner_before',       to_jsonb(v_winner_before),
      'winner_after',        to_jsonb(v_winner_after),
      'loser_before',        to_jsonb(v_loser_before),
      'loser_external_refs', v_loser_refs,
      'donations_moved',     to_jsonb(v_donations_moved)
    ),
    cardinality(v_donations_moved),
    v_merged_by
  )
  RETURNING id INTO v_merge_id;

  -- 5. Hard-delete loser. Cascade removes any leftover refs (should be
  --    none — we already deleted them above).
  DELETE FROM public.donees WHERE id = p_loser_id;

  RETURN v_merge_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.do_merge_donees(uuid, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.do_undo_merge(p_merge_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_org_id    uuid;
  v_undoer    uuid;
  v_winner_id uuid;
  v_loser_id  uuid;
  v_snap      jsonb;
  v_loser_before  jsonb;
  v_winner_before jsonb;
  v_donations_moved uuid[];
  v_loser_refs jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;
  v_org_id := public.current_org_id();

  SELECT id INTO v_undoer FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;

  SELECT winner_id, loser_id, snapshot
    INTO v_winner_id, v_loser_id, v_snap
  FROM public.donee_merges
  WHERE id = p_merge_id AND organization_id = v_org_id AND undone_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'merge not found or already undone'; END IF;

  IF v_winner_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.donees WHERE id = v_winner_id) THEN
    RAISE EXCEPTION 'cannot undo: winner was subsequently merged into another donor';
  END IF;

  v_loser_before  := v_snap->'loser_before';
  v_winner_before := v_snap->'winner_before';
  v_loser_refs    := v_snap->'loser_external_refs';
  SELECT array_agg(value::uuid) INTO v_donations_moved
    FROM jsonb_array_elements_text(v_snap->'donations_moved');
  v_donations_moved := COALESCE(v_donations_moved, ARRAY[]::uuid[]);

  -- 1. Re-insert the loser at its original id.
  INSERT INTO public.donees (
    id, organization_id, name, email, phone, address, address_line1, address_line2,
    city, state, zip, created_at, created_by
  ) VALUES (
    (v_loser_before->>'id')::uuid,
    (v_loser_before->>'organization_id')::uuid,
    v_loser_before->>'name',
    NULLIF(v_loser_before->>'email', ''),
    NULLIF(v_loser_before->>'phone', ''),
    NULLIF(v_loser_before->>'address', ''),
    NULLIF(v_loser_before->>'address_line1', ''),
    NULLIF(v_loser_before->>'address_line2', ''),
    NULLIF(v_loser_before->>'city', ''),
    NULLIF(v_loser_before->>'state', ''),
    NULLIF(v_loser_before->>'zip', ''),
    (v_loser_before->>'created_at')::timestamptz,
    NULLIF(v_loser_before->>'created_by', '')::uuid
  );

  -- 2. Re-insert the loser's external_refs.
  INSERT INTO public.donee_external_refs (donee_id, source_name, external_id, organization_id)
  SELECT
    (ref->>'donee_id')::uuid,
    ref->>'source_name',
    ref->>'external_id',
    (ref->>'organization_id')::uuid
  FROM jsonb_array_elements(v_loser_refs) AS ref
  ON CONFLICT (organization_id, source_name, external_id) DO NOTHING;

  -- 3. Move donations back to the loser.
  IF cardinality(v_donations_moved) > 0 THEN
    UPDATE public.donations
       SET donee_id = v_loser_id
     WHERE id = ANY(v_donations_moved);
  END IF;

  -- 4. Restore the winner's pre-merge field values.
  UPDATE public.donees
     SET name          = v_winner_before->>'name',
         email         = NULLIF(v_winner_before->>'email', ''),
         phone         = NULLIF(v_winner_before->>'phone', ''),
         address_line1 = NULLIF(v_winner_before->>'address_line1', ''),
         address_line2 = NULLIF(v_winner_before->>'address_line2', ''),
         city          = NULLIF(v_winner_before->>'city', ''),
         state         = NULLIF(v_winner_before->>'state', ''),
         zip           = NULLIF(v_winner_before->>'zip', '')
   WHERE id = v_winner_id;

  -- 5. Mark the merge as undone (keep the row for history visibility).
  UPDATE public.donee_merges
     SET undone_at = now(), undone_by = v_undoer
   WHERE id = p_merge_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.do_undo_merge(uuid) TO authenticated;
