import type { CreditCardDueStatus } from "@/lib/types"
import type {
  CreditCardRecord,
  CreditCardStatementRecord,
} from "@/lib/finance/types"

interface YearMonth {
  year: number
  month: number
}

export interface CreditCardStatementCycle {
  periodStart: string
  periodEnd: string
  paymentDueDate: string
}

function parseIsoDate(isoDate: string) {
  const [year = 0, month = 0, day = 0] = isoDate.split("-").map(Number)

  return { year, month, day }
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month))
}

function toIsoDate(year: number, month: number, day: number) {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-")
}

function addMonths({ year, month }: YearMonth, monthsToAdd: number): YearMonth {
  const date = new Date(year, month - 1 + monthsToAdd, 1)

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }
}

function dayAfter(isoDate: string) {
  const { year, month, day } = parseIsoDate(isoDate)
  const date = new Date(year, month - 1, day + 1)

  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function closingDateForMonth(
  year: number,
  month: number,
  closingDayOfMonth: number,
) {
  return toIsoDate(year, month, clampDay(year, month, closingDayOfMonth))
}

function dueDateForStatementEnd(
  periodEnd: string,
  closingDayOfMonth: number,
  paymentDueDayOfMonth: number,
) {
  const { year, month } = parseIsoDate(periodEnd)
  const dueMonth =
    paymentDueDayOfMonth <= closingDayOfMonth
      ? addMonths({ year, month }, 1)
      : { year, month }

  return toIsoDate(
    dueMonth.year,
    dueMonth.month,
    clampDay(dueMonth.year, dueMonth.month, paymentDueDayOfMonth),
  )
}

export function getCreditCardStatementCycle(
  postedAt: string,
  card: Pick<
    CreditCardRecord,
    "closing_day_of_month" | "payment_due_day_of_month"
  >,
): CreditCardStatementCycle {
  const postedDate = parseIsoDate(postedAt)
  const currentMonthEnd = closingDateForMonth(
    postedDate.year,
    postedDate.month,
    card.closing_day_of_month,
  )
  const endMonth =
    postedAt <= currentMonthEnd
      ? { year: postedDate.year, month: postedDate.month }
      : addMonths({ year: postedDate.year, month: postedDate.month }, 1)
  const previousEndMonth = addMonths(endMonth, -1)
  const previousEnd = closingDateForMonth(
    previousEndMonth.year,
    previousEndMonth.month,
    card.closing_day_of_month,
  )
  const periodEnd = closingDateForMonth(
    endMonth.year,
    endMonth.month,
    card.closing_day_of_month,
  )

  return {
    periodStart: dayAfter(previousEnd),
    periodEnd,
    paymentDueDate: dueDateForStatementEnd(
      periodEnd,
      card.closing_day_of_month,
      card.payment_due_day_of_month,
    ),
  }
}

export function getCreditCardDueStatus(
  statement: Pick<
    CreditCardStatementRecord,
    "lifecycle_status" | "payment_due_date"
  >,
  today = new Date().toISOString().slice(0, 10),
): CreditCardDueStatus {
  if (statement.lifecycle_status === "paid") {
    return "paid"
  }

  if (statement.payment_due_date < today) {
    return "overdue"
  }

  if (statement.payment_due_date === today) {
    return "due-today"
  }

  const dueDate = parseIsoDate(statement.payment_due_date)
  const todayDate = parseIsoDate(today)
  const dueTime = new Date(
    dueDate.year,
    dueDate.month - 1,
    dueDate.day,
  ).getTime()
  const todayTime = new Date(
    todayDate.year,
    todayDate.month - 1,
    todayDate.day,
  ).getTime()
  const daysUntilDue = Math.ceil((dueTime - todayTime) / 86_400_000)

  return daysUntilDue <= 7 ? "due-soon" : "upcoming"
}
