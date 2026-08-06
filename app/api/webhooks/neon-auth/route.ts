import {
  NeonWebhookVerificationError,
  verifyNeonBeforeCreateWebhook,
} from "@/lib/auth/neon-webhook"
import { authorizeBetaInvitation } from "@/lib/auth/invitations"
import { toInvitationWebhookResponse } from "@/lib/auth/invitation-decision"
import {
  logSecurityEvent,
  logServerError,
} from "@/lib/observability/server-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_WEBHOOK_BYTES = 32 * 1024

function verificationDenied(status: number) {
  return Response.json(
    {
      allowed: false,
      error_code: "WEBHOOK_VERIFICATION_FAILED",
      error_message: "Registration could not be authorized.",
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  )
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return verificationDenied(415)
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0")

  if (
    !Number.isSafeInteger(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > MAX_WEBHOOK_BYTES
  ) {
    return verificationDenied(413)
  }

  const rawBody = new Uint8Array(await request.arrayBuffer())

  if (rawBody.byteLength === 0 || rawBody.byteLength > MAX_WEBHOOK_BYTES) {
    return verificationDenied(413)
  }

  let payload

  try {
    payload = await verifyNeonBeforeCreateWebhook(rawBody, request.headers)
  } catch (error) {
    const reason =
      error instanceof NeonWebhookVerificationError
        ? error.code
        : "UNEXPECTED_VERIFICATION_ERROR"
    const detail =
      error instanceof NeonWebhookVerificationError ? error.detail : undefined

    logSecurityEvent("neon_auth_webhook_verification_failed", {
      reason,
      detail,
    })
    return verificationDenied(401)
  }

  try {
    const authorization = await authorizeBetaInvitation({
      eventId: payload.event_id,
      eventTimestamp: payload.timestamp,
      email: payload.user.email,
      userId: payload.user.id ?? null,
      authProvider: payload.event_data.auth_provider,
    })

    return Response.json(toInvitationWebhookResponse(authorization), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    logServerError("neon_auth_invitation_authorization_failed", error)
    return verificationDenied(503)
  }
}
