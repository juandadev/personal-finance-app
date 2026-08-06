export const BETA_INVITE_ERROR_CODE = "BETA_INVITE_REQUIRED"
export const BETA_INVITE_ERROR_MESSAGE =
  "Registration is not available for this account."

export type InvitationAuthorization =
  | {
      allowed: true
      decisionCode: "INVITE_ACCEPTED"
    }
  | {
      allowed: false
      decisionCode: typeof BETA_INVITE_ERROR_CODE
    }

export type InvitationWebhookResponse =
  | { allowed: true }
  | {
      allowed: false
      error_code: typeof BETA_INVITE_ERROR_CODE
      error_message: typeof BETA_INVITE_ERROR_MESSAGE
    }

export function toInvitationWebhookResponse(
  authorization: InvitationAuthorization,
): InvitationWebhookResponse {
  if (authorization.allowed) {
    return { allowed: true }
  }

  return {
    allowed: false,
    error_code: BETA_INVITE_ERROR_CODE,
    error_message: BETA_INVITE_ERROR_MESSAGE,
  }
}
