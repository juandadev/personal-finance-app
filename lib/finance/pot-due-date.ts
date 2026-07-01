import { intervalToDuration, isAfter, startOfDay } from "date-fns"

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export function formatDateToISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function parseISODateToLocalDate(value: string | null | undefined) {
  if (!value || !isoDatePattern.test(value)) {
    return undefined
  }

  const [yearValue, monthValue, dayValue] = value.split("-").map(Number)
  const date = new Date(yearValue, monthValue - 1, dayValue)

  if (
    date.getFullYear() !== yearValue ||
    date.getMonth() !== monthValue - 1 ||
    date.getDate() !== dayValue
  ) {
    return undefined
  }

  return date
}

export function isFutureISODate(
  value: string | null | undefined,
  now = new Date(),
) {
  const date = parseISODateToLocalDate(value)

  if (!date) {
    return false
  }

  return isAfter(startOfDay(date), startOfDay(now))
}

export function formatPotDueDateRemaining(
  value: string | null | undefined,
  now = new Date(),
) {
  const date = parseISODateToLocalDate(value)

  if (!date || !isAfter(startOfDay(date), startOfDay(now))) {
    return null
  }

  const duration = intervalToDuration({
    start: startOfDay(now),
    end: startOfDay(date),
  })
  const parts = [
    formatDurationUnit("year", duration.years),
    formatDurationUnit("month", duration.months),
    formatDurationUnit("day", duration.days),
  ].filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  return `Due in ${parts.join(", ")}`
}

function formatDurationUnit(unit: "year" | "month" | "day", value = 0) {
  if (value <= 0) {
    return null
  }

  return `${value} ${unit}${value === 1 ? "" : "s"}`
}
