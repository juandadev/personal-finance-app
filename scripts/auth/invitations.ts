import { Pool } from "pg"
import { z } from "zod"

const emailSchema = z.string().trim().toLowerCase().email().max(320)

const statusSchema = z.enum(["active", "accepted", "expired", "revoked", "all"])

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  bun run auth:invites create <email> --expires-in <7d|24h> --actor <name> --reason <reason>",
      "  bun run auth:invites revoke <email> --actor <name> --reason <reason>",
      "  bun run auth:invites list [--status active|accepted|expired|revoked|all]",
    ].join("\n"),
  )
}

function parseOptions(args: string[]) {
  const options = new Map<string, string>()

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    const value = args[index + 1]

    if (!name?.startsWith("--") || !value || value.startsWith("--")) {
      usage()
    }

    options.set(name.slice(2), value)
  }

  return options
}

function requireOption(options: Map<string, string>, name: string) {
  const value = options.get(name)?.trim()

  if (!value) {
    throw new Error(`--${name} is required.`)
  }

  return value
}

function parseExpiry(value: string) {
  const match = /^([1-9]\d*)(h|d)$/.exec(value)

  if (!match) {
    throw new Error(
      "--expires-in must use a positive duration such as 24h or 7d.",
    )
  }

  const amount = Number(match[1])
  const unitMilliseconds =
    match[2] === "h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const durationMilliseconds = amount * unitMilliseconds

  if (
    !Number.isSafeInteger(durationMilliseconds) ||
    durationMilliseconds > 365 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Invitation expiry cannot exceed 365 days.")
  }

  return new Date(Date.now() + durationMilliseconds)
}

async function createInvitation(
  pool: Pool,
  emailArgument: string | undefined,
  optionArguments: string[],
) {
  if (!emailArgument) {
    usage()
  }

  const email = emailSchema.parse(emailArgument)
  const options = parseOptions(optionArguments)
  const expiresAt = parseExpiry(requireOption(options, "expires-in"))
  const actor = requireOption(options, "actor")
  const reason = requireOption(options, "reason")

  const result = await pool.query(
    `INSERT INTO public.beta_invitations (
       email,
       expires_at,
       created_by,
       created_reason
     )
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, expires_at, created_by, created_reason, created_at`,
    [email, expiresAt.toISOString(), actor, reason],
  )

  console.table(result.rows)
}

async function revokeInvitation(
  pool: Pool,
  emailArgument: string | undefined,
  optionArguments: string[],
) {
  if (!emailArgument) {
    usage()
  }

  const email = emailSchema.parse(emailArgument)
  const options = parseOptions(optionArguments)
  const actor = requireOption(options, "actor")
  const reason = requireOption(options, "reason")

  const result = await pool.query(
    `UPDATE public.beta_invitations
     SET revoked_at = now(),
         revoked_by = $2,
         revoked_reason = $3,
         updated_at = now()
     WHERE email = $1
       AND revoked_at IS NULL
       AND accepted_at IS NULL
     RETURNING id, email, expires_at, revoked_at, revoked_by, revoked_reason`,
    [email, actor, reason],
  )

  if (result.rowCount !== 1) {
    throw new Error(
      "No pending, non-revoked invitation exists for that email address.",
    )
  }

  console.table(result.rows)
}

async function listInvitations(pool: Pool, optionArguments: string[]) {
  const options = parseOptions(optionArguments)
  const status = statusSchema.parse(options.get("status") ?? "active")

  const result = await pool.query(
    `SELECT
       id,
       email,
       expires_at,
       CASE
         WHEN accepted_at IS NOT NULL THEN 'accepted'
         WHEN revoked_at IS NOT NULL THEN 'revoked'
         WHEN expires_at <= now() THEN 'expired'
         ELSE 'active'
       END AS status,
       accepted_user_id,
       accepted_auth_provider,
       accepted_at,
       created_by,
       created_reason,
       revoked_by,
       revoked_reason,
       created_at,
       updated_at
     FROM public.beta_invitations
     WHERE $1 = 'all'
       OR ($1 = 'accepted' AND accepted_at IS NOT NULL)
       OR ($1 = 'revoked' AND accepted_at IS NULL AND revoked_at IS NOT NULL)
       OR (
         $1 = 'expired'
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at <= now()
       )
       OR (
         $1 = 'active'
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > now()
       )
     ORDER BY created_at DESC`,
    [status],
  )

  console.table(result.rows)
}

async function main() {
  const connectionString =
    process.env.INVITATION_OPERATOR_DATABASE_URL ??
    process.env.DATABASE_DIRECT_URL

  if (!connectionString) {
    throw new Error(
      "INVITATION_OPERATOR_DATABASE_URL or DATABASE_DIRECT_URL is required.",
    )
  }

  const [command, emailOrOption, ...remainingArguments] = process.argv.slice(2)
  const pool = new Pool({ connectionString, max: 1 })

  try {
    if (command === "create") {
      await createInvitation(pool, emailOrOption, remainingArguments)
      return
    }

    if (command === "revoke") {
      await revokeInvitation(pool, emailOrOption, remainingArguments)
      return
    }

    if (command === "list") {
      const optionArguments = emailOrOption
        ? [emailOrOption, ...remainingArguments]
        : []
      await listInvitations(pool, optionArguments)
      return
    }

    usage()
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Invitation command failed."
  console.error(message)
  process.exitCode = 1
})
