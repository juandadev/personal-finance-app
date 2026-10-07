import { z } from "zod"

import {
  MAXIMUM_FORECAST_REMAINING_MONTHS,
  formatForecastPeriodLabel,
  getForecastCountingStart,
  getForecastEndPeriod,
  getInclusiveForecastMonthCount,
} from "@/lib/finance/forecast-period"
import type {
  CashForecastAdjustmentKind,
  CashForecastAdjustmentRecurrence,
} from "@/lib/finance/types"
import {
  currencyCentsSchema,
  requiredStringSchema,
} from "@/lib/forms/validation"

const MAXIMUM_MONEY_CENTS = 2_147_483_647
const HORIZON_PERIOD_ERROR = "Choose a month in the forecast horizon."
const REMAINING_MONTHS_ERROR = "Enter a whole number from 1 to 60."
const END_MONTH_ERROR = "Choose an end month."

export type ForecastEndChoice = "none" | "month" | "count"

export type ForecastItemValues = {
  kind: CashForecastAdjustmentKind
  name: string
  amount: string
  startPeriod: string
  repeatMonthly: boolean
  endChoice: ForecastEndChoice
  endPeriod: string
  remainingMonths: string
}

export function createForecastItemSchema(
  periods: string[],
  retainedMonthlyStartPeriod?: string,
) {
  return z
    .object({
      kind: z.enum(["additional_income", "planned_outflow"]),
      name: requiredStringSchema("Enter a forecast item name.", 80),
      amount: currencyCentsSchema("Enter an amount greater than $0.").pipe(
        z.number().max(MAXIMUM_MONEY_CENTS, "Enter a smaller amount."),
      ),
      startPeriod: z.string(),
      repeatMonthly: z.boolean(),
      endChoice: z.enum(["none", "month", "count"]),
      endPeriod: z.string(),
      remainingMonths: z.string(),
    })
    .superRefine((value, context) => {
      const canRetainPastPeriod =
        retainedMonthlyStartPeriod !== undefined &&
        value.startPeriod === retainedMonthlyStartPeriod &&
        value.repeatMonthly

      if (!periods.includes(value.startPeriod) && !canRetainPastPeriod) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: HORIZON_PERIOD_ERROR,
          path: ["startPeriod"],
        })
      }

      if (!value.repeatMonthly || value.endChoice === "none") {
        return
      }

      const currentPeriod = periods[0] ?? ""
      const countingStart = getForecastCountingStart(
        value.startPeriod,
        currentPeriod,
      )

      if (value.endChoice === "month") {
        if (
          !getForecastEndPeriodOptions(periods, countingStart).includes(
            value.endPeriod,
          )
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: END_MONTH_ERROR,
            path: ["endPeriod"],
          })
        }

        return
      }

      if (!isValidRemainingMonths(value.remainingMonths)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: REMAINING_MONTHS_ERROR,
          path: ["remainingMonths"],
        })
      }
    })
}

export function getForecastItemPeriodOptions({
  periods,
  repeatMonthly,
  retainedMonthlyStartPeriod,
}: {
  periods: string[]
  repeatMonthly: boolean
  retainedMonthlyStartPeriod?: string
}) {
  if (
    retainedMonthlyStartPeriod &&
    repeatMonthly &&
    !periods.includes(retainedMonthlyStartPeriod)
  ) {
    return [retainedMonthlyStartPeriod, ...periods]
  }

  return periods
}

export function getForecastEndPeriodOptions(
  periods: string[],
  countingStart: string,
) {
  return periods.filter((period) => period >= countingStart)
}

export function isValidRemainingMonths(value: string) {
  return (
    /^\d+$/.test(value) &&
    Number(value) >= 1 &&
    Number(value) <= MAXIMUM_FORECAST_REMAINING_MONTHS
  )
}

export function getRemainingMonthsLabel(remainingMonths: number) {
  return remainingMonths === 1
    ? "1 remaining month"
    : `${remainingMonths} remaining months`
}

export function getForecastEndMonthLabel(endPeriod: string) {
  return `Ends ${formatForecastPeriodLabel(endPeriod)}`
}

export function getForecastItemEndDefaults({
  recurrence,
  startPeriod,
  endPeriod,
  periods,
}: {
  recurrence: CashForecastAdjustmentRecurrence
  startPeriod: string
  endPeriod: string | null
  periods: string[]
}) {
  const currentPeriod = periods[0] ?? ""

  if (recurrence !== "monthly" || !endPeriod || !currentPeriod) {
    return {
      endChoice: "none" as const,
      endPeriod: "",
      remainingMonths: "",
    }
  }

  const countingStart = getForecastCountingStart(startPeriod, currentPeriod)

  if (endPeriod < countingStart) {
    return {
      endChoice: "count" as const,
      endPeriod: "",
      remainingMonths: "",
    }
  }

  const remainingMonths = String(
    getInclusiveForecastMonthCount(countingStart, endPeriod),
  )
  const endChoice = getForecastEndPeriodOptions(
    periods,
    countingStart,
  ).includes(endPeriod)
    ? ("month" as const)
    : ("count" as const)

  return {
    endChoice,
    endPeriod,
    remainingMonths,
  }
}

export function reconcileForecastEndWithStart({
  startPeriod,
  currentPeriod,
  endChoice,
  endPeriod,
  remainingMonths,
}: {
  startPeriod: string
  currentPeriod: string
  endChoice: ForecastEndChoice
  endPeriod: string
  remainingMonths: string
}) {
  if (endChoice === "none" || !endPeriod) {
    return {
      endPeriod: "",
      remainingMonths: endChoice === "count" ? remainingMonths : "",
    }
  }

  const countingStart = getForecastCountingStart(startPeriod, currentPeriod)

  if (endPeriod < countingStart) {
    return {
      endPeriod: "",
      remainingMonths: "",
    }
  }

  return {
    endPeriod,
    remainingMonths: String(
      getInclusiveForecastMonthCount(countingStart, endPeriod),
    ),
  }
}

export function getResolvedForecastEndPeriod({
  repeatMonthly,
  endChoice,
  endPeriod,
  remainingMonths,
  startPeriod,
  currentPeriod,
}: {
  repeatMonthly: boolean
  endChoice: ForecastEndChoice
  endPeriod: string
  remainingMonths: string
  startPeriod: string
  currentPeriod: string
}) {
  if (!repeatMonthly || endChoice === "none") {
    return null
  }

  if (endChoice === "month") {
    return endPeriod || null
  }

  if (!isValidRemainingMonths(remainingMonths)) {
    return null
  }

  return getForecastEndPeriod(
    getForecastCountingStart(startPeriod, currentPeriod),
    Number(remainingMonths),
  )
}

export function getHorizonStartPeriod(
  currentPeriod: string,
  periods: string[],
) {
  return periods.includes(currentPeriod) ? currentPeriod : (periods[0] ?? "")
}

export function isForecastPeriodPreviewing(
  previewedPeriod: string | null,
  pinnedPeriod: string,
) {
  return previewedPeriod !== null && previewedPeriod !== pinnedPeriod
}

export function getForecastActivityPagination(
  activityCount: number,
  currentPage: number,
  pageSize = 10,
) {
  const normalizedCount = Math.max(0, activityCount)
  const totalPages = Math.max(1, Math.ceil(normalizedCount / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  return {
    totalPages,
    safePage,
    startIndex: (safePage - 1) * pageSize,
    endIndex: safePage * pageSize,
  }
}
