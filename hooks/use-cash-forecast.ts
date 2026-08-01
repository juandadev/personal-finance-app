"use client"

import { useEffect, useMemo, useState } from "react"

import { useFinance } from "@/hooks/use-finance"
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import { selectCashForecast } from "@/lib/finance/selectors"

function getTimeZoneOffset(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const zonedTime = Date.UTC(
    Number(values.get("year")),
    Number(values.get("month")) - 1,
    Number(values.get("day")),
    Number(values.get("hour")),
    Number(values.get("minute")),
    Number(values.get("second")),
  )

  return zonedTime - date.getTime()
}

function getNextLocalMidnight(now: Date, timezone: string) {
  const [year, month, day] = getForecastLocalDate(now, timezone)
    .split("-")
    .map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
  const targetWallTime = Date.UTC(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth(),
    nextDate.getUTCDate(),
  )
  let targetInstant = targetWallTime

  // Re-resolve once to account for a DST offset change at the date boundary.
  for (let iteration = 0; iteration < 2; iteration += 1) {
    targetInstant =
      targetWallTime - getTimeZoneOffset(new Date(targetInstant), timezone)
  }

  return targetInstant
}

export function useCashForecast() {
  const { state } = useFinance()
  const timezone = state.preferences.timezone
  const [asOf, setAsOf] = useState<Date | null>(null)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const refreshAndSchedule = () => {
      const now = new Date()
      setAsOf(now)

      const delay = Math.max(
        1_000,
        getNextLocalMidnight(now, timezone) - now.getTime() + 50,
      )
      timeoutId = setTimeout(refreshAndSchedule, delay)
    }

    refreshAndSchedule()

    return () => clearTimeout(timeoutId)
  }, [timezone])

  return useMemo(
    () => (asOf ? selectCashForecast(state, asOf) : null),
    [asOf, state],
  )
}
