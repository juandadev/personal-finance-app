import {
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey,
} from "node:crypto"

import { z } from "zod"

const FIVE_MINUTES_MS = 5 * 60 * 1000
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000
const JWKS_REFRESH_BACKOFF_MS = 30 * 1000
const MAX_JWKS_BYTES = 64 * 1024

const base64UrlSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/)
const authProviderSchema = z.enum(["credential", "google", "github", "vercel"])

const webhookHeadersSchema = z.object({
  signature: z.string().min(1),
  kid: z.string().min(1).max(256),
  timestamp: z.string().regex(/^\d{13}$/),
  eventType: z.literal("user.before_create"),
  eventId: z.string().uuid(),
  deliveryAttempt: z.coerce.number().int().min(1).max(3),
})

const detachedJwsHeaderSchema = z
  .object({
    alg: z.literal("EdDSA"),
    kid: z.string().min(1).max(256),
    typ: z.literal("JWS").optional(),
  })
  .strict()

const webhookJwkSchema = z
  .object({
    kty: z.literal("OKP"),
    crv: z.literal("Ed25519"),
    x: base64UrlSchema,
    kid: z.string().min(1).max(256),
    alg: z.literal("EdDSA").optional(),
    use: z.literal("sig").optional(),
  })
  .passthrough()

const jwksSchema = z.object({
  keys: z.array(webhookJwkSchema).min(1).max(20),
})

export const neonBeforeCreatePayloadSchema = z
  .object({
    event_id: z.string().uuid(),
    event_type: z.literal("user.before_create"),
    timestamp: z.string().datetime({ offset: true }),
    context: z
      .object({
        endpoint_id: z.string().min(1),
        project_name: z.string().min(1),
      })
      .strict(),
    user: z
      .object({
        id: z.string().min(1).max(1024).optional(),
        email: z.string().trim().email().max(320),
        name: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
        role: z.string().nullable().optional(),
        banned: z.boolean().nullable().optional(),
        email_verified: z.boolean().optional(),
        phone_number: z.string().nullable().optional(),
        phone_number_verified: z.boolean().optional(),
        created_at: z.string().datetime({ offset: true }).optional(),
        updated_at: z.string().datetime({ offset: true }).optional(),
        ban_reason: z.string().nullable().optional(),
        ban_expires: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional(),
        two_factor_enabled: z.boolean().optional(),
        is_anonymous: z.boolean().optional(),
      })
      .strict(),
    event_data: z
      .object({
        auth_provider: authProviderSchema,
        ip_address: z.string().min(1),
        user_agent: z.string(),
        signup_metadata: z.record(z.unknown()).optional(),
      })
      .strict(),
  })
  .strict()

export type NeonBeforeCreatePayload = z.infer<
  typeof neonBeforeCreatePayloadSchema
>

type WebhookJwk = z.infer<typeof webhookJwkSchema>

interface VerificationOptions {
  now?: number
  getJwk?: (kid: string) => Promise<WebhookJwk>
}

interface JwksCache {
  expiresAt: number
  keys: Map<string, WebhookJwk>
}

let jwksCache: JwksCache | null = null
let refreshNotBefore = 0

export class NeonWebhookVerificationError extends Error {
  constructor(
    readonly code:
      | "INVALID_HEADERS"
      | "INVALID_JWS"
      | "INVALID_SIGNATURE"
      | "INVALID_PAYLOAD"
      | "STALE_TIMESTAMP"
      | "UNKNOWN_KEY"
      | "JWKS_UNAVAILABLE",
    readonly detail?: string,
  ) {
    super(code)
    this.name = "NeonWebhookVerificationError"
  }
}

function getRequiredHeader(headers: Headers, name: string) {
  return headers.get(name) ?? ""
}

function parseWebhookHeaders(headers: Headers) {
  const result = webhookHeadersSchema.safeParse({
    signature: getRequiredHeader(headers, "x-neon-signature"),
    kid: getRequiredHeader(headers, "x-neon-signature-kid"),
    timestamp: getRequiredHeader(headers, "x-neon-timestamp"),
    eventType: getRequiredHeader(headers, "x-neon-event-type"),
    eventId: getRequiredHeader(headers, "x-neon-event-id"),
    deliveryAttempt: getRequiredHeader(headers, "x-neon-delivery-attempt"),
  })

  if (!result.success) {
    throw new NeonWebhookVerificationError("INVALID_HEADERS")
  }

  return result.data
}

function parseDetachedJws(signature: string, expectedKid: string) {
  const parts = signature.split(".")

  if (parts.length !== 3 || parts[1] !== "") {
    throw new NeonWebhookVerificationError("INVALID_JWS")
  }

  const [headerBase64, , signatureBase64] = parts
  const signatureResult = base64UrlSchema.safeParse(signatureBase64)

  if (!headerBase64 || !signatureResult.success) {
    throw new NeonWebhookVerificationError("INVALID_JWS")
  }

  let decodedHeader: unknown

  try {
    decodedHeader = JSON.parse(
      Buffer.from(headerBase64, "base64url").toString("utf8"),
    )
  } catch {
    throw new NeonWebhookVerificationError("INVALID_JWS")
  }

  const headerResult = detachedJwsHeaderSchema.safeParse(decodedHeader)

  if (!headerResult.success || headerResult.data.kid !== expectedKid) {
    throw new NeonWebhookVerificationError("INVALID_JWS")
  }

  const signatureBytes = Buffer.from(signatureResult.data, "base64url")

  if (signatureBytes.length !== 64) {
    throw new NeonWebhookVerificationError("INVALID_JWS")
  }

  return {
    headerBase64,
    signatureBytes,
  }
}

function assertFreshTimestamp(timestamp: number, now: number) {
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(now - timestamp) > FIVE_MINUTES_MS
  ) {
    throw new NeonWebhookVerificationError("STALE_TIMESTAMP")
  }
}

function getJwksUrl() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL

  if (!baseUrl) {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/.well-known/jwks.json`)

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  return url
}

async function fetchJwks(now: number) {
  let response: Response

  try {
    response = await fetch(getJwksUrl(), {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    })
  } catch {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  if (!response.ok) {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  const rawJwks = await response.text()

  if (Buffer.byteLength(rawJwks, "utf8") > MAX_JWKS_BYTES) {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(rawJwks)
  } catch {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  const parsedJwks = jwksSchema.safeParse(parsedJson)

  if (!parsedJwks.success) {
    throw new NeonWebhookVerificationError("JWKS_UNAVAILABLE")
  }

  jwksCache = {
    expiresAt: now + JWKS_CACHE_TTL_MS,
    keys: new Map(parsedJwks.data.keys.map((key) => [key.kid, key])),
  }

  return jwksCache
}

async function getCachedJwk(kid: string): Promise<WebhookJwk> {
  const now = Date.now()
  let cache = jwksCache

  if (!cache || cache.expiresAt <= now) {
    cache = await fetchJwks(now)
  }

  const cachedKey = cache.keys.get(kid)

  if (cachedKey) {
    return cachedKey
  }

  if (now >= refreshNotBefore) {
    refreshNotBefore = now + JWKS_REFRESH_BACKOFF_MS
    cache = await fetchJwks(now)

    const refreshedKey = cache.keys.get(kid)

    if (refreshedKey) {
      return refreshedKey
    }
  }

  throw new NeonWebhookVerificationError("UNKNOWN_KEY")
}

export async function verifyNeonBeforeCreateWebhook(
  rawBody: Uint8Array,
  headers: Headers,
  options: VerificationOptions = {},
): Promise<NeonBeforeCreatePayload> {
  const parsedHeaders = parseWebhookHeaders(headers)
  const now = options.now ?? Date.now()
  const headerTimestamp = Number(parsedHeaders.timestamp)

  assertFreshTimestamp(headerTimestamp, now)

  const detachedJws = parseDetachedJws(
    parsedHeaders.signature,
    parsedHeaders.kid,
  )
  const jwk = await (options.getJwk ?? getCachedJwk)(parsedHeaders.kid)

  if (jwk.kid !== parsedHeaders.kid) {
    throw new NeonWebhookVerificationError("UNKNOWN_KEY")
  }

  const payloadBase64 = Buffer.from(rawBody).toString("base64url")
  const signaturePayload = `${parsedHeaders.timestamp}.${payloadBase64}`
  const signaturePayloadBase64 = Buffer.from(signaturePayload, "utf8").toString(
    "base64url",
  )
  const signingInput = `${detachedJws.headerBase64}.${signaturePayloadBase64}`

  let signatureValid = false

  try {
    const publicKey = createPublicKey({
      key: jwk as JsonWebKey,
      format: "jwk",
    })
    signatureValid = verifySignature(
      null,
      Buffer.from(signingInput, "utf8"),
      publicKey,
      detachedJws.signatureBytes,
    )
  } catch {
    throw new NeonWebhookVerificationError("INVALID_SIGNATURE")
  }

  if (!signatureValid) {
    throw new NeonWebhookVerificationError("INVALID_SIGNATURE")
  }

  let parsedBody: unknown

  try {
    parsedBody = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(rawBody),
    )
  } catch {
    throw new NeonWebhookVerificationError("INVALID_PAYLOAD")
  }

  const payloadResult = neonBeforeCreatePayloadSchema.safeParse(parsedBody)

  if (!payloadResult.success) {
    const detail = payloadResult.error.issues
      .slice(0, 10)
      .map((issue) => `${issue.path.join(".") || "payload"}:${issue.code}`)
      .join(",")

    throw new NeonWebhookVerificationError("INVALID_PAYLOAD", detail)
  }

  const payloadTimestamp = Date.parse(payloadResult.data.timestamp)
  assertFreshTimestamp(payloadTimestamp, now)

  if (
    payloadResult.data.event_id !== parsedHeaders.eventId ||
    payloadResult.data.event_type !== parsedHeaders.eventType
  ) {
    throw new NeonWebhookVerificationError("INVALID_PAYLOAD")
  }

  return payloadResult.data
}
