import { describe, expect, test } from "bun:test"

import { resolveSchedulerDatabaseUrl } from "@/lib/env/scheduler-url-policy"

const schedulerUrl = "postgresql://scheduler@localhost/finance"
const databaseUrl = "postgresql://app@localhost/finance"

describe("resolveSchedulerDatabaseUrl", () => {
  test("prefers the dedicated scheduler URL when it is valid", () => {
    expect(
      resolveSchedulerDatabaseUrl({
        databaseUrl,
        nodeEnv: "development",
        schedulerUrl,
      }),
    ).toBe(schedulerUrl)
  })

  test("falls back to DATABASE_URL only in local development", () => {
    expect(
      resolveSchedulerDatabaseUrl({
        databaseUrl,
        nodeEnv: "development",
        schedulerUrl: undefined,
      }),
    ).toBe(databaseUrl)

    expect(
      resolveSchedulerDatabaseUrl({
        databaseUrl,
        nodeEnv: "production",
        schedulerUrl: undefined,
      }),
    ).toBeNull()
  })

  test("rejects blank or non-postgres scheduler URLs", () => {
    expect(
      resolveSchedulerDatabaseUrl({
        databaseUrl,
        nodeEnv: "development",
        schedulerUrl: "   ",
      }),
    ).toBe(databaseUrl)

    expect(
      resolveSchedulerDatabaseUrl({
        databaseUrl,
        nodeEnv: "production",
        schedulerUrl: "https://example.com",
      }),
    ).toBeNull()
  })
})
