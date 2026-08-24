import { describe, expect, test } from "bun:test"
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto"

import {
  NeonWebhookVerificationError,
  verifyNeonBeforeCreateWebhook,
} from "@/lib/auth/neon-webhook"

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000"
const KEY_ID = "webhook-test-key"

function createSignedWebhook(
  privateKey: KeyObject,
  timestamp: number,
  payloadOverrides: Record<string, unknown> = {},
) {
  const payload = {
    event_id: EVENT_ID,
    event_type: "user.before_create",
    timestamp: new Date(timestamp).toISOString(),
    context: {
      endpoint_id: "ep-test",
      project_name: "Finance",
    },
    user: {
      id: "auth-user-id",
      email: "invited@example.com",
      email_verified: false,
    },
    event_data: {
      auth_provider: "credential",
      ip_address: "192.0.2.1",
      user_agent: "test",
    },
    ...payloadOverrides,
  }
  const rawBody = Buffer.from(JSON.stringify(payload), "utf8")
  const protectedHeader = Buffer.from(
    JSON.stringify({ alg: "EdDSA", typ: "JWS", kid: KEY_ID }),
    "utf8",
  ).toString("base64url")
  const payloadBase64 = rawBody.toString("base64url")
  const signaturePayloadBase64 = Buffer.from(
    `${timestamp}.${payloadBase64}`,
    "utf8",
  ).toString("base64url")
  const signingInput = `${protectedHeader}.${signaturePayloadBase64}`
  const signature = sign(
    null,
    Buffer.from(signingInput, "utf8"),
    privateKey,
  ).toString("base64url")

  return {
    headers: new Headers({
      "content-type": "application/json",
      "x-neon-signature": `${protectedHeader}..${signature}`,
      "x-neon-signature-kid": KEY_ID,
      "x-neon-timestamp": String(timestamp),
      "x-neon-event-type": "user.before_create",
      "x-neon-event-id": EVENT_ID,
      "x-neon-delivery-attempt": "1",
    }),
    rawBody,
  }
}

function createJwk(publicKey: KeyObject) {
  const exportedKey = publicKey.export({ format: "jwk" })

  if (typeof exportedKey.x !== "string") {
    throw new Error("Expected an Ed25519 public key.")
  }

  return {
    alg: "EdDSA" as const,
    use: "sig" as const,
    kid: KEY_ID,
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    x: exportedKey.x,
  }
}

describe("Neon Auth webhook verification", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const jwk = createJwk(publicKey)

  test("verifies the documented detached Ed25519 JWS construction", async () => {
    const now = Date.now()
    const webhook = createSignedWebhook(privateKey, now)

    const payload = await verifyNeonBeforeCreateWebhook(
      webhook.rawBody,
      webhook.headers,
      {
        now,
        getJwk: async () => jwk,
      },
    )

    expect(payload.event_id).toBe(EVENT_ID)
    expect(payload.user.email).toBe("invited@example.com")
  })

  test("accepts a before-create payload without a persisted user id", async () => {
    const now = Date.now()
    const webhook = createSignedWebhook(privateKey, now, {
      user: {
        email: "invited@example.com",
        email_verified: false,
      },
    })

    const payload = await verifyNeonBeforeCreateWebhook(
      webhook.rawBody,
      webhook.headers,
      {
        now,
        getJwk: async () => jwk,
      },
    )

    expect(payload.user.id).toBeUndefined()
  })

  test("rejects a body changed after signing", async () => {
    const now = Date.now()
    const webhook = createSignedWebhook(privateKey, now)
    const alteredBody = Buffer.from(
      webhook.rawBody.toString("utf8").replace("invited", "attacker"),
      "utf8",
    )

    await expect(
      verifyNeonBeforeCreateWebhook(alteredBody, webhook.headers, {
        now,
        getJwk: async () => jwk,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE",
    } satisfies Partial<NeonWebhookVerificationError>)
  })

  test("rejects stale signed deliveries", async () => {
    const now = Date.now()
    const timestamp = now - 5 * 60 * 1000 - 1
    const webhook = createSignedWebhook(privateKey, timestamp)

    await expect(
      verifyNeonBeforeCreateWebhook(webhook.rawBody, webhook.headers, {
        now,
        getJwk: async () => jwk,
      }),
    ).rejects.toMatchObject({
      code: "STALE_TIMESTAMP",
    } satisfies Partial<NeonWebhookVerificationError>)
  })
})
