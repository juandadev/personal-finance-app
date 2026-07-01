import { format } from "date-fns"

import { MONTHLY_BUDGET_RESET_HOUR_UTC } from "./period"

function getNextMonthlyResetDate(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const isBeforeThisMonthReset =
    now.getUTCDate() === 1 && now.getUTCHours() < MONTHLY_BUDGET_RESET_HOUR_UTC
  const resetMonth = isBeforeThisMonthReset ? month : month + 1

  return new Date(Date.UTC(year, resetMonth, 1, MONTHLY_BUDGET_RESET_HOUR_UTC))
}

function getDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))

  return new Date(
    Number(values.get("year")),
    Number(values.get("month")) - 1,
    Number(values.get("day")),
    Number(values.get("hour")),
    Number(values.get("minute")),
  )
}

export function formatMonthlyBudgetResetTime(timeZone: string) {
  return format(
    getDateInTimeZone(getNextMonthlyResetDate(), timeZone),
    "h:mm a",
  )
}
