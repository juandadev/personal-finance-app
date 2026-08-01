export const FUTURE_FINANCE_DATE_MESSAGE = "Choose today or an earlier date."

export function getLocalIsoDate(asOf: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asOf)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const year = values.get("year")
  const month = values.get("month")
  const day = values.get("day")

  if (!year || !month || !day) {
    throw new Error(`Could not resolve the local date for "${timezone}".`)
  }

  return `${year}-${month}-${day}`
}

export function assertDateNotAfterLocalToday(
  isoDate: string,
  timezone: string,
  asOf = new Date(),
): string {
  const localToday = getLocalIsoDate(asOf, timezone)

  if (isoDate > localToday) {
    throw new Error(FUTURE_FINANCE_DATE_MESSAGE)
  }

  return localToday
}
