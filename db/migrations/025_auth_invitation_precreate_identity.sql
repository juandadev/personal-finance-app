-- Neon user.before_create events do not have a persisted user id yet. Bind an
-- accepted invitation to the signed webhook event instead, while retaining an
-- optional user id for providers that include one.
DROP INDEX IF EXISTS beta_invitations_accepted_identity_unique;

ALTER TABLE beta_invitations
  ADD COLUMN accepted_event_id uuid;

ALTER TABLE beta_invitations
  DROP CONSTRAINT beta_invitations_acceptance_check;

ALTER TABLE beta_invitations
  ADD CONSTRAINT beta_invitations_acceptance_check CHECK (
    (
      accepted_at IS NULL
      AND accepted_event_id IS NULL
      AND accepted_user_id IS NULL
      AND accepted_auth_provider IS NULL
    )
    OR
    (
      accepted_at IS NOT NULL
      AND accepted_event_id IS NOT NULL
      AND accepted_auth_provider IS NOT NULL
    )
  );

CREATE UNIQUE INDEX beta_invitations_accepted_event_unique
  ON beta_invitations (accepted_event_id)
  WHERE accepted_at IS NOT NULL;

CREATE UNIQUE INDEX beta_invitations_accepted_identity_unique
  ON beta_invitations (accepted_auth_provider, accepted_user_id)
  WHERE accepted_at IS NOT NULL AND accepted_user_id IS NOT NULL;

ALTER TABLE auth_webhook_events
  ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION finance_auth.authorize_beta_invitation(
  p_event_id uuid,
  p_event_timestamp timestamptz,
  p_email text,
  p_user_id text,
  p_auth_provider text
)
RETURNS TABLE (allowed boolean, decision_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_invitation public.beta_invitations%ROWTYPE;
BEGIN
  IF p_event_id IS NULL
    OR p_event_timestamp IS NULL
    OR v_email IS NULL
    OR v_email = ''
    OR p_auth_provider NOT IN ('credential', 'google', 'github', 'vercel')
  THEN
    RAISE EXCEPTION 'Invalid invitation authorization input.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_event_id::text, 0)
  );

  RETURN QUERY
  SELECT events.allowed, events.decision_code
  FROM public.auth_webhook_events AS events
  WHERE events.event_id = p_event_id;

  IF FOUND THEN
    RETURN;
  END IF;

  SELECT invitations.*
  INTO v_invitation
  FROM public.beta_invitations AS invitations
  WHERE invitations.email = v_email
  FOR UPDATE;

  IF NOT FOUND
    OR v_invitation.revoked_at IS NOT NULL
    OR v_invitation.expires_at <= pg_catalog.now()
    OR (
      v_invitation.accepted_at IS NOT NULL
      AND v_invitation.accepted_event_id IS DISTINCT FROM p_event_id
    )
  THEN
    INSERT INTO public.auth_webhook_events (
      event_id,
      event_type,
      event_timestamp,
      normalized_email,
      user_id,
      auth_provider,
      allowed,
      decision_code
    )
    VALUES (
      p_event_id,
      'user.before_create',
      p_event_timestamp,
      v_email,
      p_user_id,
      p_auth_provider,
      false,
      'BETA_INVITE_REQUIRED'
    );

    RETURN QUERY SELECT false, 'BETA_INVITE_REQUIRED'::text;
    RETURN;
  END IF;

  IF v_invitation.accepted_at IS NULL THEN
    UPDATE public.beta_invitations
    SET accepted_event_id = p_event_id,
        accepted_user_id = p_user_id,
        accepted_auth_provider = p_auth_provider,
        accepted_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = v_invitation.id;
  END IF;

  INSERT INTO public.auth_webhook_events (
    event_id,
    event_type,
    event_timestamp,
    normalized_email,
    user_id,
    auth_provider,
    allowed,
    decision_code
  )
  VALUES (
    p_event_id,
    'user.before_create',
    p_event_timestamp,
    v_email,
    p_user_id,
    p_auth_provider,
    true,
    'INVITE_ACCEPTED'
  );

  RETURN QUERY SELECT true, 'INVITE_ACCEPTED'::text;
END;
$$;

REVOKE ALL ON FUNCTION finance_auth.authorize_beta_invitation(
  uuid,
  timestamptz,
  text,
  text,
  text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance_auth.authorize_beta_invitation(
  uuid,
  timestamptz,
  text,
  text,
  text
) TO finance_auth_gate;
