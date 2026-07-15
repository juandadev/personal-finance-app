import { describe, expect, test } from "bun:test"

import { selectFinanceViewModel } from "@/lib/finance/selectors"
import type {
  CreditCardStatementRecord,
  FinanceState,
  RecurringBillPaymentRecord,
} from "@/lib/finance/types"

const TODAY = "2026-07-08"

function makeState(
  overrides: Partial<FinanceState> = {},
  billOverrides: Partial<FinanceState["recurringBills"][number]> = {},
): FinanceState {
  const recurringBills =
    overrides.recurringBills ??
    (billOverrides.id
      ? [
          {
            id: "bill-1",
            user_id: "user-1",
            counterparty_id: "merchant-1",
            concept: "Installment purchase",
            amount_cents: 10000,
            currency: "MXN",
            frequency: "monthly",
            first_due_date: "2026-08-01",
            total_payments: 3,
            credit_card_id: "card-1",
            category_id: "category-1",
            archived_at: null,
            ...billOverrides,
          },
        ]
      : [])

  return {
    preferences: {
      user_id: "user-1",
      default_currency: "MXN",
      timezone: "America/Mexico_City",
    },
    accounts: [],
    accountSummaries: [],
    categories: [
      {
        id: "category-1",
        user_id: "user-1",
        name: "Bills",
        slug: "bills",
        theme_color: "chart-1",
      },
    ],
    counterparties: [
      {
        id: "merchant-1",
        user_id: "user-1",
        display_name: "Merchant",
        avatar_url: null,
        type: "merchant",
        theme_color: "chart-2",
        notes: null,
        is_account_owner: false,
      },
    ],
    transactions: [],
    budgets: [],
    budgetSummaries: [],
    budgetTransactionAssignments: [],
    pots: [],
    recurringBills,
    recurringBillPayments: [],
    creditCards: [
      {
        id: "card-1",
        user_id: "user-1",
        nickname: "Test Card",
        issuer: "Bank",
        network: "Visa",
        last_four: "4242",
        expiration_month: 12,
        expiration_year: 2030,
        credit_limit_cents: 100000,
        closing_day_of_month: 20,
        payment_due_day_of_month: 5,
        theme_color: "chart-3",
        archived_at: null,
      },
    ],
    creditCardStatements: [],
    creditCardPayments: [],
    cashForecastSettings: null,
    cashForecastAdjustments: [],
    ...overrides,
  }
}

function makePayment(
  overrides: Partial<RecurringBillPaymentRecord> & { due_date: string },
): RecurringBillPaymentRecord {
  return {
    id: `payment-${overrides.due_date}`,
    user_id: "user-1",
    recurring_bill_id: "bill-1",
    due_date: overrides.due_date,
    amount_cents: overrides.amount_cents ?? 10000,
    status: overrides.status ?? "paid",
    transaction_id:
      overrides.transaction_id === undefined
        ? `transaction-${overrides.due_date}`
        : overrides.transaction_id,
    paid_at: overrides.paid_at ?? overrides.due_date,
  }
}

function makeStatement(
  overrides: Partial<CreditCardStatementRecord> = {},
): CreditCardStatementRecord {
  return {
    id: "statement-1",
    user_id: "user-1",
    credit_card_id: "card-1",
    period_start: "2026-06-21",
    period_end: "2026-07-20",
    payment_due_date: "2026-08-05",
    statement_amount_cents: 0,
    lifecycle_status: "open",
    paid_at: null,
    ...overrides,
  }
}

function selectCard(state: FinanceState) {
  const card = selectFinanceViewModel(state, TODAY).creditCards[0]

  if (!card) {
    throw new Error("Expected test credit card.")
  }

  return card
}

function selectBill(state: FinanceState, today = TODAY) {
  const bill = selectFinanceViewModel(state, today).recurringBills[0]

  if (!bill) {
    throw new Error("Expected recurring bill.")
  }

  return bill
}

describe("selectFinanceViewModel credit reservation", () => {
  test("reserves all unpaid finite card installments immediately", () => {
    const card = selectCard(makeState({}, { id: "bill-1" }))

    expect(card.currentStatementAmount).toBe(0)
    expect(card.reservedInstallmentAmount).toBe(300)
    expect(card.availableCredit).toBe(700)
  })

  test("paid installments reduce the reservation", () => {
    const card = selectCard(
      makeState(
        {
          recurringBillPayments: [makePayment({ due_date: "2026-08-01" })],
        },
        { id: "bill-1" },
      ),
    )

    expect(card.reservedInstallmentAmount).toBe(200)
    expect(card.availableCredit).toBe(800)
  })

  test("skipped installments reduce the reservation", () => {
    const card = selectCard(
      makeState(
        {
          recurringBillPayments: [
            makePayment({
              due_date: "2026-08-01",
              status: "skipped",
              transaction_id: null,
            }),
          ],
        },
        { id: "bill-1" },
      ),
    )

    expect(card.reservedInstallmentAmount).toBe(200)
    expect(card.availableCredit).toBe(800)
  })

  test("indefinite card bills do not reserve future credit", () => {
    const card = selectCard(
      makeState({}, { id: "bill-1", total_payments: null }),
    )

    expect(card.reservedInstallmentAmount).toBe(0)
    expect(card.availableCredit).toBe(1000)
  })

  test("finite non-card bills do not reserve card credit", () => {
    const card = selectCard(
      makeState({}, { id: "bill-1", credit_card_id: null }),
    )

    expect(card.reservedInstallmentAmount).toBe(0)
    expect(card.availableCredit).toBe(1000)
  })

  test("pending statement lines are not double-counted as reserved installments", () => {
    const card = selectCard(
      makeState(
        {},
        {
          id: "bill-1",
          amount_cents: 10000,
          first_due_date: "2026-07-04",
          total_payments: 2,
        },
      ),
    )

    expect(card.currentStatementAmount).toBe(100)
    expect(card.reservedInstallmentAmount).toBe(100)
    expect(card.availableCredit).toBe(800)
    expect(
      card.currentStatementAmount +
        card.reservedInstallmentAmount +
        card.availableCredit,
    ).toBe(card.creditLimit)
  })

  test("archived finite bills stop reserving occurrences after the archive cutoff", () => {
    const card = selectCard(
      makeState(
        {},
        {
          id: "bill-1",
          first_due_date: "2026-08-01",
          total_payments: 5,
          archived_at: "2026-09-15T00:00:00.000Z",
        },
      ),
    )

    expect(card.reservedInstallmentAmount).toBe(200)
    expect(card.availableCredit).toBe(800)
  })

  test("available credit can become negative", () => {
    const card = selectCard(
      makeState(
        {
          creditCards: [
            {
              id: "card-1",
              user_id: "user-1",
              nickname: "Test Card",
              issuer: "Bank",
              network: "Visa",
              last_four: "4242",
              expiration_month: 12,
              expiration_year: 2030,
              credit_limit_cents: 10000,
              closing_day_of_month: 20,
              payment_due_day_of_month: 5,
              theme_color: "chart-3",
              archived_at: null,
            },
          ],
        },
        {
          id: "bill-1",
          amount_cents: 6000,
          total_payments: 2,
        },
      ),
    )

    expect(card.reservedInstallmentAmount).toBe(120)
    expect(card.availableCredit).toBe(-20)
  })
})

describe("selectFinanceViewModel credit-card total pending", () => {
  const overdueStatement = makeStatement({
    id: "statement-june",
    period_start: "2026-05-21",
    period_end: "2026-06-20",
    payment_due_date: "2026-07-15",
    statement_amount_cents: 1_904_619,
  })
  const activeStatement = makeStatement({
    id: "statement-july",
    period_start: "2026-06-21",
    period_end: "2026-07-20",
    payment_due_date: "2026-08-15",
    statement_amount_cents: 137_487,
  })

  test("uses the oldest due-soon statement for card status while preserving the active statement", () => {
    const viewModel = selectFinanceViewModel(
      makeState({
        creditCardStatements: [overdueStatement, activeStatement],
      }),
      "2026-07-11",
    )
    const card = viewModel.creditCards[0]

    expect(card?.currentStatement?.id).toBe("statement-july")
    expect(card?.currentStatementAmount).toBe(1374.87)
    expect(card?.totalPendingAmount).toBe(20_421.06)
    expect(card?.oldestPayableStatement?.id).toBe("statement-june")
    expect(card?.hasOverdueStatement).toBe(false)
    expect(card?.dueStatus).toBe("due-soon")
    expect(card?.availableCredit).toBe(-19_421.06)
    expect(viewModel.totalCreditCardPendingBalance).toBe(20_421.06)
    expect(
      viewModel.creditCardSummary.find(
        (summary) => summary.label === "Due Soon / Overdue",
      ),
    ).toEqual({
      label: "Due Soon / Overdue",
      count: 1,
      amount: 20_421.06,
      color: "chart-2",
    })
    expect(
      viewModel.creditCardSummary.find(
        (summary) => summary.label === "Upcoming",
      )?.count,
    ).toBe(0)
  })

  test("uses overdue status when any unpaid statement is past due", () => {
    const card = selectFinanceViewModel(
      makeState({
        creditCardStatements: [overdueStatement, activeStatement],
      }),
      "2026-07-16",
    ).creditCards[0]

    expect(card?.currentStatement?.id).toBe("statement-july")
    expect(card?.totalPendingAmount).toBe(20_421.06)
    expect(card?.hasOverdueStatement).toBe(true)
    expect(card?.dueStatus).toBe("overdue")
  })

  test("includes pending recurring bills once in the aggregate and available credit", () => {
    const card = selectCard(
      makeState(
        {
          creditCardStatements: [
            makeStatement({
              id: "statement-june",
              period_start: "2026-05-21",
              period_end: "2026-06-20",
              payment_due_date: "2026-07-05",
              statement_amount_cents: 25_000,
            }),
          ],
        },
        {
          id: "bill-1",
          amount_cents: 10_000,
          first_due_date: "2026-07-04",
          total_payments: 3,
        },
      ),
    )

    expect(card.totalPendingAmount).toBe(350)
    expect(card.oldestPayableStatement?.id).toBe("statement-june")
    expect(card.reservedInstallmentAmount).toBe(200)
    expect(card.availableCredit).toBe(450)
  })

  test("removes paid statements from the aggregate and updates the payment target", () => {
    const card = selectCard(
      makeState({
        creditCardStatements: [
          {
            ...overdueStatement,
            lifecycle_status: "paid",
            paid_at: "2026-07-12",
          },
          activeStatement,
        ],
      }),
    )

    expect(card.totalPendingAmount).toBe(1374.87)
    expect(card.oldestPayableStatement?.id).toBe("statement-july")
  })
})

describe("selectFinanceViewModel recurring bill status presentation", () => {
  test("keeps a non-card bill's original due date and status", () => {
    const bill = selectBill(
      makeState(
        {},
        {
          id: "bill-1",
          credit_card_id: null,
          first_due_date: "2026-07-04",
        },
      ),
    )

    expect(bill.currentOccurrence?.dueDate).toBe("2026-07-04")
    expect(bill.currentOccurrence?.statusDueDate).toBeUndefined()
    expect(bill.status).toBe("overdue")
  })

  test("uses a virtual statement cycle's payment due date for a card bill", () => {
    const bill = selectBill(
      makeState({}, { id: "bill-1", first_due_date: "2026-07-04" }),
    )

    expect(bill.currentOccurrence?.dueDate).toBe("2026-07-04")
    expect(bill.currentOccurrence?.statusDueDate).toBe("2026-08-05")
    expect(bill.status).toBe("upcoming")
  })

  test("transitions a card bill using its attached statement payment due date", () => {
    const state = makeState(
      { creditCardStatements: [makeStatement()] },
      { id: "bill-1", first_due_date: "2026-07-04" },
    )

    expect(selectBill(state, "2026-07-28").status).toBe("upcoming")
    expect(selectBill(state, "2026-07-29").status).toBe("due-soon")
    expect(selectBill(state, "2026-08-05").status).toBe("due-today")
    expect(selectBill(state, "2026-08-06").status).toBe("overdue")
  })

  test("preserves settled card occurrence statuses", () => {
    const bill = selectBill(
      makeState(
        {
          recurringBillPayments: [
            makePayment({ due_date: "2026-07-04" }),
            makePayment({
              due_date: "2026-08-04",
              status: "skipped",
              transaction_id: null,
            }),
          ],
        },
        { id: "bill-1", first_due_date: "2026-07-04" },
      ),
      "2026-08-08",
    )

    expect(bill.occurrences[0]?.status).toBe("paid")
    expect(bill.occurrences[0]?.statusDueDate).toBeUndefined()
    expect(bill.occurrences[1]?.status).toBe("skipped")
    expect(bill.occurrences[1]?.statusDueDate).toBeUndefined()
  })

  test("includes overdue card bills in the warning summary aggregate", () => {
    const viewModel = selectFinanceViewModel(
      makeState(
        { creditCardStatements: [makeStatement()] },
        { id: "bill-1", first_due_date: "2026-07-04" },
      ),
      "2026-08-06",
    )
    const dueSoonSummary = viewModel.recurringBillsSummary.find(
      (summary) => summary.label === "Due Soon",
    )

    expect(dueSoonSummary).toEqual({
      label: "Due Soon",
      amount: 100,
      count: 1,
      color: "warning",
    })
  })
})
