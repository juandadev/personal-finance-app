import type { BillStatus } from "@/lib/types"
import type {
  CreditCardRecord,
  CreditCardStatementRecord,
  RecurringBillPaymentRecord,
  RecurringBillRecord,
} from "@/lib/finance/types"
import {
  getCreditCardStatementCycle,
  type CreditCardStatementCycle,
} from "@/lib/finance/credit-card-cycle"

export const DUE_SOON_WINDOW_DAYS = 7

// Safety cap for schedule generation loops (an indefinite weekly bill would
// still stay far below this over the app's lifetime).
const MAX_GENERATED_OCCURRENCES = 1200

export interface RecurringBillOccurrenceState {
  dueDate: string
  sequence: number
  amountCents: number
  status: BillStatus
  paymentId?: string
  transactionId?: string
  paidAt?: string
}

type ScheduleFields = Pick<
  RecurringBillRecord,
  | "frequency"
  | "first_due_date"
  | "total_payments"
  | "archived_at"
  | "amount_cents"
>

type PaymentFields = Pick<
  RecurringBillPaymentRecord,
  "id" | "due_date" | "amount_cents" | "status" | "transaction_id" | "paid_at"
>

function parseIsoDate(isoDate: string) {
  const [year = 0, month = 0, day = 0] = isoDate.split("-").map(Number)

  return { year, month, day }
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function toIsoDate(year: number, month: number, day: number) {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-")
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Due date for the nth occurrence (0-based) of a schedule anchored at
 * `firstDueDate`. The anchor day is preserved and clamped per target month,
 * so an anchor on the 31st lands on Feb 28 and back on Mar 31.
 */
export function getOccurrenceDueDate(
  firstDueDate: string,
  frequency: RecurringBillRecord["frequency"],
  occurrenceIndex: number,
): string {
  const anchor = parseIsoDate(firstDueDate)

  if (frequency === "yearly") {
    const year = anchor.year + occurrenceIndex

    return toIsoDate(
      year,
      anchor.month,
      Math.min(anchor.day, daysInMonth(year, anchor.month)),
    )
  }

  const monthCursor = new Date(
    anchor.year,
    anchor.month - 1 + occurrenceIndex,
    1,
  )
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth() + 1

  return toIsoDate(year, month, Math.min(anchor.day, daysInMonth(year, month)))
}

export function getRecurringBillDueStatus(
  dueDate: string,
  today = todayIsoDate(),
): Exclude<BillStatus, "paid" | "skipped"> {
  if (dueDate < today) {
    return "overdue"
  }

  if (dueDate === today) {
    return "due-today"
  }

  const due = parseIsoDate(dueDate)
  const now = parseIsoDate(today)
  const dueTime = new Date(due.year, due.month - 1, due.day).getTime()
  const todayTime = new Date(now.year, now.month - 1, now.day).getTime()
  const daysUntilDue = Math.ceil((dueTime - todayTime) / 86_400_000)

  return daysUntilDue <= DUE_SOON_WINDOW_DAYS ? "due-soon" : "upcoming"
}

/**
 * Resolves a bill's occurrences as of `today`: every occurrence due on or
 * before today plus enough future occurrences to always include the next
 * unsettled one. Settled occurrences resolve from payment rows (frozen
 * amounts); unsettled ones derive their status from the due date.
 */
export function resolveRecurringBillOccurrences(
  bill: ScheduleFields,
  payments: PaymentFields[],
  today = todayIsoDate(),
): RecurringBillOccurrenceState[] {
  const paymentsByDueDate = new Map(
    payments.map((payment) => [payment.due_date, payment]),
  )
  const archivedCutoff = bill.archived_at?.slice(0, 10) ?? null
  const occurrences: RecurringBillOccurrenceState[] = []

  for (let index = 0; index < MAX_GENERATED_OCCURRENCES; index += 1) {
    if (bill.total_payments !== null && index >= bill.total_payments) {
      break
    }

    const dueDate = getOccurrenceDueDate(
      bill.first_due_date,
      bill.frequency,
      index,
    )
    const payment = paymentsByDueDate.get(dueDate)

    if (archivedCutoff !== null && dueDate > archivedCutoff && !payment) {
      break
    }

    if (payment) {
      occurrences.push({
        dueDate,
        sequence: index + 1,
        amountCents: payment.amount_cents,
        status: payment.status,
        paymentId: payment.id,
        transactionId: payment.transaction_id ?? undefined,
        paidAt: payment.paid_at,
      })
    } else {
      occurrences.push({
        dueDate,
        sequence: index + 1,
        amountCents: bill.amount_cents,
        status: getRecurringBillDueStatus(dueDate, today),
      })

      if (dueDate > today) {
        break
      }
    }
  }

  return occurrences
}

/**
 * The occurrence the user should act on or see next: the earliest unsettled
 * one, or the latest settled one when everything is settled.
 */
export function selectCurrentOccurrence(
  occurrences: RecurringBillOccurrenceState[],
): RecurringBillOccurrenceState | undefined {
  return (
    occurrences.find(
      (occurrence) =>
        occurrence.status !== "paid" && occurrence.status !== "skipped",
    ) ?? occurrences.at(-1)
  )
}

/**
 * Statement cycle a card-assigned bill occurrence attaches to. Starting from
 * the cycle containing the due date, the occurrence rolls forward past:
 *
 * - cycles whose statement is already paid (frozen history), and
 * - fully elapsed cycles that never got a statement row (statement rows are
 *   only created by purchases, so a subscription-only card would otherwise
 *   trap occurrences in cycles that can never be paid).
 *
 * It lands on the first cycle with an unpaid statement row, or the current
 * cycle (or the one right after it when the current statement is already
 * paid) even if no row exists yet.
 */
export function getBillOccurrenceStatementCycle(
  dueDate: string,
  card: Pick<
    CreditCardRecord,
    "closing_day_of_month" | "payment_due_day_of_month"
  >,
  statements: Pick<
    CreditCardStatementRecord,
    "period_start" | "period_end" | "lifecycle_status"
  >[],
  today = todayIsoDate(),
): CreditCardStatementCycle {
  const statementStatusByPeriodStart = new Map(
    statements.map((statement) => [
      statement.period_start,
      statement.lifecycle_status,
    ]),
  )
  const currentCycle = getCreditCardStatementCycle(today, card)

  let cycle = getCreditCardStatementCycle(dueDate, card)

  // Bounded: each step moves one cycle forward.
  for (let step = 0; step < MAX_GENERATED_OCCURRENCES; step += 1) {
    const status = statementStatusByPeriodStart.get(cycle.periodStart)

    if (status !== undefined && status !== "paid") {
      return cycle
    }

    if (status === undefined && cycle.periodEnd >= currentCycle.periodEnd) {
      return cycle
    }

    const { year, month, day } = parseIsoDate(cycle.periodEnd)
    const next = new Date(year, month - 1, day + 1)

    cycle = getCreditCardStatementCycle(
      toIsoDate(next.getFullYear(), next.getMonth() + 1, next.getDate()),
      card,
    )
  }

  return cycle
}
