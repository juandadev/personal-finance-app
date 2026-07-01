export const MONTHLY_BUDGET_RESET_HOUR_UTC = 12

export function formatPeriod(date: Date) {
  return date.toISOString().slice(0, 7)
}

export function getCurrentPeriod(date = new Date()) {
  if (
    date.getUTCDate() === 1 &&
    date.getUTCHours() < MONTHLY_BUDGET_RESET_HOUR_UTC
  ) {
    return getPreviousPeriod(date)
  }

  return formatPeriod(date)
}

export function getPreviousPeriod(date = new Date()) {
  return formatPeriod(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  )
}

export function getNextPeriod(period: string) {
  const [year, month] = period.split("-").map(Number)

  return formatPeriod(new Date(Date.UTC(year, month, 1)))
}
