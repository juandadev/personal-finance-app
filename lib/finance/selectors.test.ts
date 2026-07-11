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
