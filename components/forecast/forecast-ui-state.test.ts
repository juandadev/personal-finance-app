import { describe, expect, test } from "bun:test"

import {
  createForecastItemSchema,
  getForecastActivityPagination,
  getForecastItemPeriodOptions,
  getHorizonStartPeriod,
  isForecastPeriodPreviewing,
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
  }

  test("retains a past start only for the existing monthly outflow", () => {
    expect(schema.safeParse(values).success).toBe(true)
    expect(
      schema.safeParse({
        ...values,
        kind: "additional_income",
        repeatMonthly: false,
      }).success,
    ).toBe(false)
    expect(schema.safeParse({ ...values, repeatMonthly: false }).success).toBe(
      false,
    )
  })

  test("removes a past option and resets it when recurrence no longer applies", () => {
    expect(
      getForecastItemPeriodOptions({
        kind: "planned_outflow",
        periods: PERIODS,
        repeatMonthly: true,
        retainedMonthlyStartPeriod: PAST_PERIOD,
      }),
    ).toEqual([PAST_PERIOD, ...PERIODS])
    expect(
      getForecastItemPeriodOptions({
        kind: "planned_outflow",
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
    }

    expect(
      createForecastItemSchema(PERIODS).safeParse(currentItem).success,
    ).toBe(true)
    expect(
      getForecastItemPeriodOptions({
        kind: "additional_income",
        periods: PERIODS,
        repeatMonthly: false,
      })[0],
    ).toBe(currentPeriod)
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
