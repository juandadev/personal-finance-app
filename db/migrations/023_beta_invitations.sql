DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'finance_auth_gate'
  ) THEN
    CREATE ROLE finance_auth_gate NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  ELSIF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'finance_auth_gate'
      AND (
        rolcanlogin
        OR rolsuper
        OR rolcreatedb
        OR rolcreaterole
        OR rolinherit
        OR rolreplication
        OR rolbypassrls
      )
  ) THEN
    RAISE EXCEPTION 'finance_auth_gate exists with unsafe role attributes';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO finance_auth_gate',
    current_database()
  );
END
$$;

CREATE SCHEMA IF NOT EXISTS finance_auth;
REVOKE ALL ON SCHEMA finance_auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA finance_auth
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE IF NOT EXISTS beta_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_user_id text,
  accepted_auth_provider text,
  accepted_at timestamptz,
  created_by text NOT NULL,
  created_reason text NOT NULL,
  revoked_by text,
  revoked_reason text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_invitations_email_normalized_check CHECK (
    email = lower(btrim(email))
    AND length(email) BETWEEN 3 AND 320
  ),
  CONSTRAINT beta_invitations_email_unique UNIQUE (email),
  CONSTRAINT beta_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT beta_invitations_acceptance_check CHECK (
    (accepted_at IS NULL
      AND accepted_user_id IS NULL
      AND accepted_auth_provider IS NULL)
    OR
    (accepted_at IS NOT NULL
      AND accepted_user_id IS NOT NULL
      AND accepted_auth_provider IS NOT NULL)
  ),
  CONSTRAINT beta_invitations_provider_check CHECK (
    accepted_auth_provider IS NULL
    OR accepted_auth_provider IN ('credential', 'google', 'github', 'vercel')
  ),
  CONSTRAINT beta_invitations_revocation_check CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL)
    OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revoked_reason IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS beta_invitations_accepted_identity_unique
  ON beta_invitations (accepted_auth_provider, accepted_user_id)
  WHERE accepted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS beta_invitations_expires_at_idx
  ON beta_invitations (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_webhook_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  normalized_email text NOT NULL,
  user_id text NOT NULL,
  auth_provider text NOT NULL,
  allowed boolean NOT NULL,
  decision_code text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_webhook_events_event_type_check CHECK (
    event_type = 'user.before_create'
  ),
  CONSTRAINT auth_webhook_events_email_normalized_check CHECK (
    normalized_email = lower(btrim(normalized_email))
    AND length(normalized_email) BETWEEN 3 AND 320
  ),
  CONSTRAINT auth_webhook_events_provider_check CHECK (
    auth_provider IN ('credential', 'google', 'github', 'vercel')
  )
);

REVOKE ALL ON TABLE beta_invitations FROM PUBLIC, finance_auth_gate;
REVOKE ALL ON TABLE auth_webhook_events FROM PUBLIC, finance_auth_gate;

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
    OR p_user_id IS NULL
    OR btrim(p_user_id) = ''
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
      AND (
        v_invitation.accepted_user_id IS DISTINCT FROM p_user_id
        OR v_invitation.accepted_auth_provider IS DISTINCT FROM p_auth_provider
      )
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
    SET accepted_user_id = p_user_id,
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
GRANT USAGE ON SCHEMA finance_auth TO finance_auth_gate;
GRANT EXECUTE ON FUNCTION finance_auth.authorize_beta_invitation(
  uuid,
  timestamptz,
  text,
  text,
  text
) TO finance_auth_gate;
