import { describe, expect, test } from "bun:test"

import type { RecurringBillPaymentRecord } from "@/lib/finance/types"
import type { RecurringBillRecord } from "@/lib/finance/types"
import {
  getBillOccurrenceStatementCycle,
  getDefaultResumeStartDate,
  getNextDueDateAfter,
  getOccurrenceDueDate,
  getRecurringBillDueStatus,
  inactiveTimestampForCutoffDate,
  resolveRecurringBillOccurrences,
  selectCurrentOccurrence,
} from "@/lib/finance/recurring-bill-schedule"

const TODAY = "2026-07-08"

function makeBill(
  overrides: Partial<
    Parameters<typeof resolveRecurringBillOccurrences>[0] &
      Pick<RecurringBillRecord, "credit_card_id">
  > = {},
) {
  return {
    frequency: "monthly" as const,
    first_due_date: "2026-05-15",
    total_payments: null,
    archived_at: null,
    paused_at: null,
    scheduled_end_date: null,
    scheduled_end_mode: null,
    amount_cents: 5000,
    credit_card_id: null,
    ...overrides,
  }
}

function makePayment(
  overrides: Partial<RecurringBillPaymentRecord> & { due_date: string },
) {
  return {
    id: `payment-${overrides.due_date}`,
    due_date: overrides.due_date,
    amount_cents: overrides.amount_cents ?? 5000,
    status: overrides.status ?? ("paid" as const),
    transaction_id:
      overrides.transaction_id !== undefined
        ? overrides.transaction_id
        : `transaction-${overrides.due_date}`,
    paid_at: overrides.paid_at ?? overrides.due_date,
  }
}

describe("getOccurrenceDueDate", () => {
  test("steps monthly preserving the anchor day", () => {
    expect(getOccurrenceDueDate("2026-05-15", "monthly", 0)).toBe("2026-05-15")
    expect(getOccurrenceDueDate("2026-05-15", "monthly", 1)).toBe("2026-06-15")
    expect(getOccurrenceDueDate("2026-05-15", "monthly", 8)).toBe("2027-01-15")
  })

  test("clamps month-end anchors in short months and restores them after", () => {
    expect(getOccurrenceDueDate("2026-01-31", "monthly", 1)).toBe("2026-02-28")
    expect(getOccurrenceDueDate("2026-01-31", "monthly", 2)).toBe("2026-03-31")
    expect(getOccurrenceDueDate("2026-01-31", "monthly", 3)).toBe("2026-04-30")
  })

  test("clamps Feb 29 anchors in non-leap years", () => {
    expect(getOccurrenceDueDate("2024-02-29", "yearly", 1)).toBe("2025-02-28")
    expect(getOccurrenceDueDate("2024-02-29", "yearly", 4)).toBe("2028-02-29")
  })

  test("steps yearly on the anchor month and day", () => {
    expect(getOccurrenceDueDate("2026-07-23", "yearly", 1)).toBe("2027-07-23")
    expect(getOccurrenceDueDate("2026-07-23", "yearly", 3)).toBe("2029-07-23")
  })
})

describe("getRecurringBillDueStatus", () => {
  test("classifies dates relative to today", () => {
    expect(getRecurringBillDueStatus("2026-07-04", TODAY)).toBe("overdue")
    expect(getRecurringBillDueStatus("2026-07-08", TODAY)).toBe("due-today")
    expect(getRecurringBillDueStatus("2026-07-15", TODAY)).toBe("due-soon")
    expect(getRecurringBillDueStatus("2026-07-16", TODAY)).toBe("upcoming")
  })
})

describe("resolveRecurringBillOccurrences", () => {
  test("accumulates every missed occurrence plus the next upcoming one", () => {
    const occurrences = resolveRecurringBillOccurrences(makeBill(), [], TODAY)

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-05-15",
      "2026-06-15",
      "2026-07-15",
    ])
    expect(occurrences.map((occurrence) => occurrence.status)).toEqual([
      "overdue",
      "overdue",
      "due-soon",
    ])
    expect(occurrences.map((occurrence) => occurrence.sequence)).toEqual([
      1, 2, 3,
    ])
  })

  test("resolves settled occurrences from payments with frozen amounts", () => {
    const payments = [
      makePayment({ due_date: "2026-05-15", amount_cents: 4500 }),
      makePayment({
        due_date: "2026-06-15",
        status: "skipped",
        transaction_id: null,
      }),
    ]
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ amount_cents: 9999 }),
      payments,
      TODAY,
    )

    expect(occurrences[0]?.status).toBe("paid")
    expect(occurrences[0]?.amountCents).toBe(4500)
    expect(occurrences[0]?.transactionId).toBe("transaction-2026-05-15")
    expect(occurrences[1]?.status).toBe("skipped")
    expect(occurrences[1]?.transactionId).toBeUndefined()
    expect(occurrences[2]?.status).toBe("due-soon")
    expect(occurrences[2]?.amountCents).toBe(9999)
  })

  test("stops at total_payments", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ total_payments: 2 }),
      [],
      TODAY,
    )

    expect(occurrences).toHaveLength(2)
    expect(occurrences.at(-1)?.dueDate).toBe("2026-06-15")
  })

  test("stops generating past the pause cutoff but keeps settled history", () => {
    const payments = [makePayment({ due_date: "2026-05-15" })]
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ paused_at: "2026-06-20T12:00:00.000Z" }),
      payments,
      TODAY,
    )

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-05-15",
      "2026-06-15",
    ])
  })

  test("excludes unsettled occurrences on or after the pause cutoff", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({
        first_due_date: "2026-08-10",
        paused_at: inactiveTimestampForCutoffDate("2026-08-10"),
      }),
      [],
      "2026-08-04",
      { includeAllFuture: true, throughDate: "2026-09-30" },
    )

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([])
  })

  test("keeps the current period when a card bill is ending on the next due date", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({
        first_due_date: "2026-07-28",
        scheduled_end_date: "2026-08-28",
      }),
      [],
      "2026-08-05",
      { includeAllFuture: true, throughDate: "2026-09-30" },
    )

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-07-28",
    ])
  })

  test("stops generating past the archive cutoff but keeps settled history", () => {
    const payments = [makePayment({ due_date: "2026-05-15" })]
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ archived_at: "2026-06-20T12:00:00.000Z" }),
      payments,
      TODAY,
    )

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-05-15",
      "2026-06-15",
    ])
    expect(occurrences[0]?.status).toBe("paid")
    expect(occurrences[1]?.status).toBe("overdue")
  })

  test("uses an explicit timezone for archive cutoffs without changing the default", () => {
    const boundaryBill = makeBill({
      first_due_date: "2026-08-01",
      total_payments: 1,
      archived_at: "2026-08-01T02:00:00.000Z",
    })
    const defaultOccurrences = resolveRecurringBillOccurrences(
      boundaryBill,
      [],
      TODAY,
      { throughDate: "2026-08-31" },
    )
    const zonedOccurrences = resolveRecurringBillOccurrences(
      boundaryBill,
      [],
      TODAY,
      {
        throughDate: "2026-08-31",
        archiveCutoffTimezone: "America/Mexico_City",
      },
    )

    expect(defaultOccurrences.map((occurrence) => occurrence.dueDate)).toEqual(
      [],
    )
    expect(zonedOccurrences).toEqual([])
  })

  test("extends past a settled future occurrence to the next unsettled one", () => {
    const payments = [
      makePayment({ due_date: "2026-05-15" }),
      makePayment({ due_date: "2026-06-15" }),
      makePayment({ due_date: "2026-07-15" }),
    ]
    const occurrences = resolveRecurringBillOccurrences(
      makeBill(),
      payments,
      TODAY,
    )

    expect(occurrences.at(-1)?.dueDate).toBe("2026-08-15")
    expect(occurrences.at(-1)?.status).toBe("upcoming")
  })

  test("yearly bills expose a single upcoming occurrence until due", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ frequency: "yearly", first_due_date: "2026-07-23" }),
      [],
      TODAY,
    )

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]?.dueDate).toBe("2026-07-23")
    expect(occurrences[0]?.status).toBe("upcoming")
  })

  test("one-time schedules resolve exactly one occurrence", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({
        frequency: "one_time",
        first_due_date: "2026-08-01",
        total_payments: 1,
      }),
      [],
      TODAY,
      { includeAllFuture: true },
    )

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toMatchObject({
      dueDate: "2026-08-01",
      sequence: 1,
      status: "upcoming",
    })
  })

  test("generates unsettled occurrences only through a bounded horizon", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ first_due_date: "2026-07-31" }),
      [],
      TODAY,
      { throughDate: "2026-10-15" },
    )

    expect(occurrences.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-07-31",
      "2026-08-31",
      "2026-09-30",
    ])
  })

  test("respects finite and archived schedules inside a bounded horizon", () => {
    const finite = resolveRecurringBillOccurrences(
      makeBill({
        first_due_date: "2026-07-15",
        total_payments: 2,
      }),
      [],
      TODAY,
      { throughDate: "2027-12-31" },
    )
    const archived = resolveRecurringBillOccurrences(
      makeBill({
        first_due_date: "2026-07-15",
        archived_at: "2026-08-20T12:00:00.000Z",
      }),
      [],
      TODAY,
      { throughDate: "2027-12-31" },
    )

    expect(finite.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-07-15",
      "2026-08-15",
    ])
    expect(archived.map((occurrence) => occurrence.dueDate)).toEqual([
      "2026-07-15",
      "2026-08-15",
    ])
  })
})

describe("selectCurrentOccurrence", () => {
  test("prefers the earliest unsettled occurrence", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill(),
      [makePayment({ due_date: "2026-05-15" })],
      TODAY,
    )

    expect(selectCurrentOccurrence(occurrences)?.dueDate).toBe("2026-06-15")
  })

  test("falls back to the last settled occurrence when all are settled", () => {
    const occurrences = resolveRecurringBillOccurrences(
      makeBill({ total_payments: 2 }),
      [
        makePayment({ due_date: "2026-05-15" }),
        makePayment({ due_date: "2026-06-15" }),
      ],
      TODAY,
    )

    expect(selectCurrentOccurrence(occurrences)?.dueDate).toBe("2026-06-15")
    expect(selectCurrentOccurrence(occurrences)?.status).toBe("paid")
  })
})

describe("getDefaultResumeStartDate", () => {
  test("returns the next schedule occurrence on or after today", () => {
    expect(getDefaultResumeStartDate("2026-05-15", "monthly", TODAY)).toBe(
      "2026-07-15",
    )
  })

  test("returns today for one-time bills whose due date already passed", () => {
    expect(getDefaultResumeStartDate("2026-05-15", "one_time", TODAY)).toBe(
      TODAY,
    )
  })
})

describe("getNextDueDateAfter", () => {
  test("returns the next due date strictly after today", () => {
    expect(
      getNextDueDateAfter(
        makeBill({ first_due_date: "2026-07-28", frequency: "monthly" }),
        "2026-08-05",
      ),
    ).toBe("2026-08-28")
  })

  test("returns null when no future due remains", () => {
    expect(
      getNextDueDateAfter(
        makeBill({
          frequency: "one_time",
          first_due_date: "2026-07-04",
          total_payments: 1,
        }),
        "2026-08-05",
      ),
    ).toBeNull()
  })
})

describe("getBillOccurrenceStatementCycle", () => {
  const card = { closing_day_of_month: 20, payment_due_day_of_month: 5 }

  test("attaches to the current cycle containing the due date", () => {
    const cycle = getBillOccurrenceStatementCycle("2026-07-04", card, [], TODAY)

    expect(cycle.periodStart).toBe("2026-06-21")
    expect(cycle.periodEnd).toBe("2026-07-20")
    expect(cycle.paymentDueDate).toBe("2026-08-05")
  })

  test("rolls forward past paid statements", () => {
    const cycle = getBillOccurrenceStatementCycle(
      "2026-07-04",
      card,
      [
        {
          period_start: "2026-06-21",
          period_end: "2026-07-20",
          lifecycle_status: "paid",
        },
      ],
      TODAY,
    )

    expect(cycle.periodStart).toBe("2026-07-21")
    expect(cycle.periodEnd).toBe("2026-08-20")
  })

  test("rolls forward across consecutive paid statements", () => {
    const cycle = getBillOccurrenceStatementCycle(
      "2026-05-04",
      card,
      [
        {
          period_start: "2026-04-21",
          period_end: "2026-05-20",
          lifecycle_status: "paid",
        },
        {
          period_start: "2026-05-21",
          period_end: "2026-06-20",
          lifecycle_status: "paid",
        },
      ],
      TODAY,
    )

    expect(cycle.periodStart).toBe("2026-06-21")
  })

  test("attaches to an unpaid statement in a past cycle", () => {
    const cycle = getBillOccurrenceStatementCycle(
      "2026-05-04",
      card,
      [
        {
          period_start: "2026-04-21",
          period_end: "2026-05-20",
          lifecycle_status: "open",
        },
      ],
      TODAY,
    )

    expect(cycle.periodStart).toBe("2026-04-21")
  })

  test("rolls elapsed cycles without a statement row into the current cycle", () => {
    // No purchases ever happened, so no statement rows exist. An occurrence
    // due two cycles ago must land on the current payable cycle instead of a
    // past cycle that will never get a statement.
    const cycle = getBillOccurrenceStatementCycle("2026-05-04", card, [], TODAY)

    expect(cycle.periodStart).toBe("2026-06-21")
    expect(cycle.periodEnd).toBe("2026-07-20")
  })
})
