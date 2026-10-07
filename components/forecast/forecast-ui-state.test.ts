import { describe, expect, test } from "bun:test"

import {
  createForecastItemSchema,
  getForecastActivityPagination,
  getForecastEndPeriodOptions,
  getForecastItemEndDefaults,
  getForecastItemPeriodOptions,
  getHorizonStartPeriod,
  getResolvedForecastEndPeriod,
  isForecastPeriodPreviewing,
  reconcileForecastEndWithStart,
} from "@/components/forecast/forecast-ui-state"

const PERIODS = ["2026-07", "2026-08", "2026-09"]
const PAST_PERIOD = "2026-06"

describe("forecast item period state", () => {
  const schema = createForecastItemSchema(PERIODS, PAST_PERIOD)
  const values = {
    kind: "planned_outflow" as const,
    name: "Insurance",
    amount: "100",
    startPeriod: PAST_PERIOD,
    repeatMonthly: true,
    endChoice: "none" as const,
    endPeriod: "",
    remainingMonths: "",
  }

  test("retains a past start for either existing monthly adjustment", () => {
    expect(schema.safeParse(values).success).toBe(true)
    expect(
      schema.safeParse({
        ...values,
        kind: "additional_income",
      }).success,
    ).toBe(true)
    expect(schema.safeParse({ ...values, repeatMonthly: false }).success).toBe(
      false,
    )
  })

  test("removes a past option and resets it when recurrence no longer applies", () => {
    expect(
      getForecastItemPeriodOptions({
        periods: PERIODS,
        repeatMonthly: true,
        retainedMonthlyStartPeriod: PAST_PERIOD,
      }),
    ).toEqual([PAST_PERIOD, ...PERIODS])
    expect(
      getForecastItemPeriodOptions({
        periods: PERIODS,
        repeatMonthly: false,
        retainedMonthlyStartPeriod: PAST_PERIOD,
      }),
    ).toEqual(PERIODS)
    expect(getHorizonStartPeriod(PAST_PERIOD, PERIODS)).toBe(PERIODS[0])
  })

  test("accepts the current period for new forecast items", () => {
    const currentPeriod = PERIODS[0]!
    const currentItem = {
      kind: "additional_income" as const,
      name: "Current-month reimbursement",
      amount: "100",
      startPeriod: currentPeriod,
      repeatMonthly: false,
      endChoice: "none" as const,
      endPeriod: "",
      remainingMonths: "",
    }

    expect(
      createForecastItemSchema(PERIODS).safeParse(currentItem).success,
    ).toBe(true)
    expect(
      getForecastItemPeriodOptions({
        periods: PERIODS,
        repeatMonthly: false,
      })[0],
    ).toBe(currentPeriod)
  })
})

describe("forecast item end month", () => {
  const periods = ["2026-10", "2026-11", "2026-12", "2027-01"]

  test("keeps an open-ended monthly item free of an end", () => {
    expect(
      getForecastItemEndDefaults({
        recurrence: "monthly",
        startPeriod: "2026-01",
        endPeriod: null,
        periods,
      }),
    ).toEqual({
      endChoice: "none",
      endPeriod: "",
      remainingMonths: "",
    })
    expect(
      createForecastItemSchema(periods).safeParse({
        kind: "planned_outflow",
        name: "Rent",
        amount: "100",
        startPeriod: "2026-10",
        repeatMonthly: true,
        endChoice: "none",
        endPeriod: "",
        remainingMonths: "",
      }).success,
    ).toBe(true)
  })

  test("selects the month choice when the end is visible", () => {
    expect(
      getForecastItemEndDefaults({
        recurrence: "monthly",
        startPeriod: "2026-01",
        endPeriod: "2027-01",
        periods,
      }),
    ).toEqual({
      endChoice: "month",
      endPeriod: "2027-01",
      remainingMonths: "4",
    })
    expect(getForecastEndPeriodOptions(periods, "2026-10")).toEqual(periods)
  })

  test("selects the count choice when the end is past the forecast", () => {
    expect(
      getForecastItemEndDefaults({
        recurrence: "monthly",
        startPeriod: "2026-10",
        endPeriod: "2027-12",
        periods,
      }),
    ).toEqual({
      endChoice: "count",
      endPeriod: "2027-12",
      remainingMonths: "15",
    })
  })

  test("counts a future start from that start month", () => {
    expect(
      getResolvedForecastEndPeriod({
        repeatMonthly: true,
        endChoice: "count",
        endPeriod: "",
        remainingMonths: "3",
        startPeriod: "2026-11",
        currentPeriod: "2026-10",
      }),
    ).toBe("2027-01")
    expect(
      getResolvedForecastEndPeriod({
        repeatMonthly: true,
        endChoice: "count",
        endPeriod: "",
        remainingMonths: "3",
        startPeriod: "2027-03",
        currentPeriod: "2026-10",
      }),
    ).toBe("2027-05")
  })

  test("keeps the end month when the start moves, and clears it when the start passes it", () => {
    expect(
      reconcileForecastEndWithStart({
        startPeriod: "2026-12",
        currentPeriod: "2026-10",
        endChoice: "count",
        endPeriod: "2027-01",
        remainingMonths: "4",
      }),
    ).toEqual({
      endPeriod: "2027-01",
      remainingMonths: "2",
    })
    expect(
      reconcileForecastEndWithStart({
        startPeriod: "2027-03",
        currentPeriod: "2026-10",
        endChoice: "month",
        endPeriod: "2027-01",
        remainingMonths: "4",
      }),
    ).toEqual({
      endPeriod: "",
      remainingMonths: "",
    })
  })

  test("rejects an empty, partial, or too-long remaining count", () => {
    const schema = createForecastItemSchema(periods)
    const values = {
      kind: "additional_income" as const,
      name: "Bonus",
      amount: "100",
      startPeriod: "2026-10",
      repeatMonthly: true,
      endChoice: "count" as const,
      endPeriod: "",
      remainingMonths: "",
    }

    expect(schema.safeParse(values).success).toBe(false)
    expect(schema.safeParse({ ...values, remainingMonths: "0" }).success).toBe(
      false,
    )
    expect(
      schema.safeParse({ ...values, remainingMonths: "4.5" }).success,
    ).toBe(false)
    expect(schema.safeParse({ ...values, remainingMonths: "61" }).success).toBe(
      false,
    )
    expect(schema.safeParse({ ...values, remainingMonths: "60" }).success).toBe(
      true,
    )
    expect(
      schema.safeParse({
        ...values,
        endChoice: "month",
        endPeriod: "2027-02",
        remainingMonths: "",
      }).success,
    ).toBe(false)
  })

  test("drops the end when the item is saved as one-time", () => {
    expect(
      getResolvedForecastEndPeriod({
        repeatMonthly: false,
        endChoice: "month",
        endPeriod: "2027-01",
        remainingMonths: "4",
        startPeriod: "2026-10",
        currentPeriod: "2026-10",
      }),
    ).toBeNull()
  })
})

describe("forecast month selection state", () => {
  test("only identifies a different focused or hovered month as previewing", () => {
    expect(isForecastPeriodPreviewing(null, "2026-08")).toBe(false)
    expect(isForecastPeriodPreviewing("2026-08", "2026-08")).toBe(false)
    expect(isForecastPeriodPreviewing("2026-09", "2026-08")).toBe(true)
  })
})

describe("forecast activity pagination", () => {
  test("keeps an empty report on a valid first page", () => {
    expect(getForecastActivityPagination(0, 4)).toEqual({
      totalPages: 1,
      safePage: 1,
      startIndex: 0,
      endIndex: 10,
    })
  })

  test("moves back when deleting the only row on the last page", () => {
    expect(getForecastActivityPagination(21, 3)).toMatchObject({
      totalPages: 3,
      safePage: 3,
      startIndex: 20,
    })
    expect(getForecastActivityPagination(20, 3)).toMatchObject({
      totalPages: 2,
      safePage: 2,
      startIndex: 10,
    })
  })
})
