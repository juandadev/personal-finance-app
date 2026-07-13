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

export function formatForecastPeriodLabel(period: string): string {
  const [year = 0, month = 0] = period.split("-").map(Number)

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}
