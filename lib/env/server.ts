import "server-only"

import { z } from "zod"

import { resolveSchedulerDatabaseUrl } from "@/lib/env/scheduler-url-policy"

const postgresUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "must be a PostgreSQL connection URL",
  )

function readRequired(
  name: string,
  schema: z.ZodType<string> = z.string().min(1),
) {
  const parsed = schema.safeParse(process.env[name])

  if (!parsed.success) {
    throw new Error(`${name} is missing or invalid.`)
  }

  return parsed.data
}

export function getDatabaseUrl() {
  return readRequired("DATABASE_URL", postgresUrlSchema)
}

export function getDatabaseDirectUrl() {
  return readRequired("DATABASE_DIRECT_URL", postgresUrlSchema)
}

export function getSchedulerDatabaseUrl() {
  const schedulerUrl = resolveSchedulerDatabaseUrl({
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    schedulerUrl: process.env.SCHEDULER_DATABASE_URL,
  })

  if (!schedulerUrl) {
    throw new Error("SCHEDULER_DATABASE_URL is missing or invalid.")
  }

  return schedulerUrl
}

export function getAuthDatabaseUrl() {
  return readRequired("AUTH_DATABASE_URL", postgresUrlSchema)
}

export function getNeonAuthBaseUrl() {
  return readRequired("NEON_AUTH_BASE_URL", z.string().url())
}

export function getNeonAuthCookieSecret() {
  return readRequired("NEON_AUTH_COOKIE_SECRET", z.string().min(32))
}

export function getCronSecret() {
  return readRequired("CRON_SECRET", z.string().min(32))
}

function readNoticeValue(name: string, developmentFallback: string) {
  const value = process.env[name]?.trim()

  if (value) return value

  if (process.env.NODE_ENV !== "production") {
    return developmentFallback
  }

  throw new Error(`${name} is required for the production privacy notice.`)
}

export function getPrivacyNoticeConfig() {
  return {
    controllerName: readNoticeValue("PRIVACY_CONTROLLER_NAME", "Juan Martínez"),
    controllerAddress: readNoticeValue(
      "PRIVACY_CONTROLLER_ADDRESS",
      "Zapopan, Jalisco, México",
    ),
    privacyEmail: readNoticeValue(
      "PRIVACY_CONTACT_EMAIL",
      "juanda.martinezn@gmail.com",
    ),
    securityEmail: readNoticeValue(
      "SECURITY_CONTACT_EMAIL",
      "juanda.martinezn@gmail.com",
    ),
  }
}
