import { getNextPeriod } from "@/lib/finance/period"
import { getLocalIsoDate } from "@/lib/finance/local-date"

export function getForecastLocalDate(asOf: Date, timezone: string): string {
  return getLocalIsoDate(asOf, timezone)
}

export function getForecastCurrentPeriod(asOf: Date, timezone: string): string {
  return getForecastLocalDate(asOf, timezone).slice(0, 7)
}

export function getForecastPeriods(
  asOf: Date,
  timezone: string,
  count = 13,
): string[] {
  const periods: string[] = []
  let period = getForecastCurrentPeriod(asOf, timezone)

  for (let index = 0; index < count; index += 1) {
    periods.push(period)
    period = getNextPeriod(period)
  }

  return periods
}

export function getPeriodEndDate(period: string): string {
  const [year = 0, month = 0] = period.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return `${period}-${lastDay.toString().padStart(2, "0")}`
}

export const MAXIMUM_FORECAST_REMAINING_MONTHS = 60

export function shiftForecastPeriod(period: string, monthOffset: number) {
  const [year = 0, month = 1] = period.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + monthOffset, 1))

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export function getInclusiveForecastMonthCount(
  startPeriod: string,
  endPeriod: string,
) {
  const [startYear = 0, startMonth = 1] = startPeriod.split("-").map(Number)
  const [endYear = 0, endMonth = 1] = endPeriod.split("-").map(Number)

  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
}

export function getForecastCountingStart(
  startPeriod: string,
  currentPeriod: string,
) {
  return startPeriod > currentPeriod ? startPeriod : currentPeriod
}

export function getForecastEndPeriod(
  countingStart: string,
  remainingMonths: number,
) {
  return shiftForecastPeriod(countingStart, remainingMonths - 1)
}

export function getForecastEndValidationMessage(
  startPeriod: string,
  endPeriod: string,
  currentPeriod: string,
) {
  const countingStart = getForecastCountingStart(startPeriod, currentPeriod)

  if (endPeriod < countingStart) {
    return countingStart === startPeriod
      ? "Choose an end month on or after the start month."
      : "Choose an end month on or after the current month."
  }

  const remainingMonths = getInclusiveForecastMonthCount(
    countingStart,
    endPeriod,
  )

  if (
    remainingMonths < 1 ||
    remainingMonths > MAXIMUM_FORECAST_REMAINING_MONTHS
  ) {
    return "Choose an end month within 60 months."
  }

  return null
}

export function formatForecastPeriodLabel(period: string): string {
  const [year = 0, month = 0] = period.split("-").map(Number)

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}
