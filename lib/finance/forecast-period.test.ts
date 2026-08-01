import { describe, expect, test } from "bun:test"

import {
  formatForecastPeriodLabel,
  getForecastCurrentPeriod,
  getForecastLocalDate,
  getForecastPeriods,
  getPeriodEndDate,
} from "@/lib/finance/forecast-period"

describe("forecast period helpers", () => {
  test("uses the configured timezone at local month boundaries without grace", () => {
    const asOf = new Date("2026-07-01T05:30:00.000Z")

    expect(getForecastLocalDate(asOf, "America/Mexico_City")).toBe("2026-06-30")
    expect(getForecastCurrentPeriod(asOf, "America/Mexico_City")).toBe(
      "2026-06",
    )
    expect(getForecastCurrentPeriod(asOf, "UTC")).toBe("2026-07")
  })

  test("returns the current month and ordered future months across a year boundary", () => {
    expect(
      getForecastPeriods(
        new Date("2026-11-15T12:00:00.000Z"),
        "America/Mexico_City",
        3,
      ),
    ).toEqual(["2026-11", "2026-12", "2027-01"])
  })

  test("resolves period ends and labels", () => {
    expect(getPeriodEndDate("2028-02")).toBe("2028-02-29")
    expect(getPeriodEndDate("2027-02")).toBe("2027-02-28")
    expect(formatForecastPeriodLabel("2027-02")).toBe("February 2027")
  })
})
