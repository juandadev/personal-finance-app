import { describe, expect, test } from "bun:test"

import {
  assertDateNotAfterLocalToday,
  FUTURE_FINANCE_DATE_MESSAGE,
  getLocalIsoDate,
} from "@/lib/finance/local-date"

describe("local finance dates", () => {
  const boundaryInstant = new Date("2026-07-01T00:30:00.000Z")

  test("resolves today from the configured timezone at a date boundary", () => {
    expect(getLocalIsoDate(boundaryInstant, "America/Los_Angeles")).toBe(
      "2026-06-30",
    )
    expect(getLocalIsoDate(boundaryInstant, "Asia/Tokyo")).toBe("2026-07-01")
  })

  test("rejects a date after the profile's local today", () => {
    expect(() =>
      assertDateNotAfterLocalToday(
        "2026-07-01",
        "America/Los_Angeles",
        boundaryInstant,
      ),
    ).toThrow(FUTURE_FINANCE_DATE_MESSAGE)
  })

  test("allows today and historical dates", () => {
    expect(
      assertDateNotAfterLocalToday(
        "2026-06-30",
        "America/Los_Angeles",
        boundaryInstant,
      ),
    ).toBe("2026-06-30")
    expect(
      assertDateNotAfterLocalToday(
        "2024-01-15",
        "America/Los_Angeles",
        boundaryInstant,
      ),
    ).toBe("2026-06-30")
  })
})
