import { describe, expect, test } from "bun:test"

import {
  BETA_INVITE_ERROR_CODE,
  BETA_INVITE_ERROR_MESSAGE,
  toInvitationWebhookResponse,
} from "@/lib/auth/invitation-decision"

describe("invitation webhook decisions", () => {
  test("allows an accepted invitation without exposing internal metadata", () => {
    expect(
      toInvitationWebhookResponse({
        allowed: true,
        decisionCode: "INVITE_ACCEPTED",
      }),
    ).toEqual({ allowed: true })
  })

  test("uses one stable generic response for every rejected invitation", () => {
    expect(
      toInvitationWebhookResponse({
        allowed: false,
        decisionCode: BETA_INVITE_ERROR_CODE,
      }),
    ).toEqual({
      allowed: false,
      error_code: BETA_INVITE_ERROR_CODE,
      error_message: BETA_INVITE_ERROR_MESSAGE,
    })
  })
})
