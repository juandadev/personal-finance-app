import "server-only"

import { z } from "zod"

import type { InvitationAuthorization } from "@/lib/auth/invitation-decision"
import { getAuthDatabasePool } from "@/lib/db/auth-client"

const invitationAuthorizationRowSchema = z.discriminatedUnion("allowed", [
  z.object({
    allowed: z.literal(true),
    decision_code: z.literal("INVITE_ACCEPTED"),
  }),
  z.object({
    allowed: z.literal(false),
    decision_code: z.literal("BETA_INVITE_REQUIRED"),
  }),
])

interface AuthorizeInvitationInput {
  eventId: string
  eventTimestamp: string
  email: string
  userId: string | null
  authProvider: "credential" | "google" | "github" | "vercel"
}

export async function authorizeBetaInvitation(
  input: AuthorizeInvitationInput,
): Promise<InvitationAuthorization> {
  const result = await getAuthDatabasePool().query(
    `SELECT allowed, decision_code
     FROM finance_auth.authorize_beta_invitation($1, $2, $3, $4, $5)`,
    [
      input.eventId,
      input.eventTimestamp,
      input.email,
      input.userId,
      input.authProvider,
    ],
  )

  const row = invitationAuthorizationRowSchema.parse(result.rows[0])

  if (row.allowed) {
    return {
      allowed: true,
      decisionCode: row.decision_code,
    }
  }

  return {
    allowed: false,
    decisionCode: row.decision_code,
  }
}
