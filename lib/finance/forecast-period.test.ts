import { describe, expect, test } from "bun:test"

import {
  formatForecastPeriodLabel,
  getForecastCountingStart,
  getForecastCurrentPeriod,
  getForecastEndPeriod,
  getForecastEndValidationMessage,
  getForecastLocalDate,
  getForecastPeriods,
  getInclusiveForecastMonthCount,
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

  test("counts remaining months from the later of the start and current month", () => {
    expect(getForecastCountingStart("2026-01", "2026-10")).toBe("2026-10")
    expect(getForecastCountingStart("2027-03", "2026-10")).toBe("2027-03")
    expect(getInclusiveForecastMonthCount("2026-10", "2027-01")).toBe(4)
    expect(getForecastEndPeriod("2026-10", 4)).toBe("2027-01")
    expect(getForecastEndPeriod("2026-10", 60)).toBe("2031-09")
    expect(getForecastEndPeriod("2026-11", 3)).toBe("2027-01")
    expect(getForecastEndPeriod("2027-03", 3)).toBe("2027-05")
  })

  test("rejects an end before the counting start or beyond 60 months", () => {
    expect(
      getForecastEndValidationMessage("2026-11", "2026-10", "2026-10"),
    ).toBe("Choose an end month on or after the start month.")
    expect(
      getForecastEndValidationMessage("2026-01", "2026-09", "2026-10"),
    ).toBe("Choose an end month on or after the current month.")
    expect(
      getForecastEndValidationMessage("2026-01", "2031-10", "2026-10"),
    ).toBe("Choose an end month within 60 months.")
    expect(
      getForecastEndValidationMessage("2026-01", "2031-09", "2026-10"),
    ).toBeNull()
  })
})
