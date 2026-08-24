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

export function localDateToEndOfDayInstant(
  isoDate: string,
  timezone: string,
): string {
  const [year = 0, month = 0, day = 0] = isoDate.split("-").map(Number)
  const base = Date.UTC(year, month - 1, day, 23, 59, 59, 999)

  for (let offsetHours = 0; offsetHours < 48; offsetHours += 1) {
    const candidate = new Date(base - offsetHours * 3_600_000)

    if (getLocalIsoDate(candidate, timezone) === isoDate) {
      return candidate.toISOString()
    }
  }

  return new Date(base).toISOString()
}
