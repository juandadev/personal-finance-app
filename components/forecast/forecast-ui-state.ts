import { z } from "zod"

import type { CashForecastAdjustmentKind } from "@/lib/finance/types"
import {
  currencyCentsSchema,
  requiredStringSchema,
} from "@/lib/forms/validation"

const MAXIMUM_MONEY_CENTS = 2_147_483_647
const HORIZON_PERIOD_ERROR = "Choose a month in the forecast horizon."

export type ForecastItemValues = {
  kind: CashForecastAdjustmentKind
  name: string
  amount: string
  startPeriod: string
  repeatMonthly: boolean
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
    })
    .superRefine((value, context) => {
      const canRetainPastPeriod =
        retainedMonthlyStartPeriod !== undefined &&
        value.startPeriod === retainedMonthlyStartPeriod &&
        value.repeatMonthly

      if (periods.includes(value.startPeriod) || canRetainPastPeriod) {
        return
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: HORIZON_PERIOD_ERROR,
        path: ["startPeriod"],
      })
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
