import { describe, expect, test } from "bun:test"

import { buildCreditCardObligations } from "@/lib/finance/credit-card-obligations"
import type {
  CreditCardRecord,
  CreditCardStatementRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

const card: CreditCardRecord = {
  id: "card-1",
  user_id: "user-1",
  nickname: "Daily Card",
  issuer: "Bank",
  network: "Visa",
  last_four: "4242",
  expiration_month: 12,
  expiration_year: 2030,
  credit_limit_cents: 100_000,
  closing_day_of_month: 20,
  payment_due_day_of_month: 5,
  theme_color: "chart-1",
  archived_at: null,
  annuality_enabled: false,
  annuality_amount_cents: null,
  annuality_anniversary_month: null,
  annuality_anniversary_day: null,
  annuality_payment_count: null,
}

const bill: RecurringBillRecord = {
  id: "bill-1",
  user_id: "user-1",
  counterparty_id: "merchant-1",
  concept: "Internet",
  amount_cents: 10_000,
  currency: "USD",
  frequency: "monthly",
  first_due_date: "2026-07-10",
  total_payments: 2,
  credit_card_id: card.id,
  category_id: "category-1",
  archived_at: null,
}

const statement: CreditCardStatementRecord = {
  id: "statement-1",
  user_id: "user-1",
  credit_card_id: card.id,
  period_start: "2026-06-21",
  period_end: "2026-07-20",
  payment_due_date: "2026-08-05",
  statement_amount_cents: 25_000,
  lifecycle_status: "open",
  paid_at: null,
}

const transaction: TransactionRecord = {
  id: "transaction-1",
  user_id: "user-1",
  account_id: "account-1",
  counterparty_id: "merchant-1",
  category_id: "category-1",
  concept: "Groceries",
  amount_cents: -25_000,
  is_voucher_expense: false,
  payment_method: "credit_card",
  credit_card_id: card.id,
  credit_card_statement_id: statement.id,
  posted_at: "2026-07-02",
  description: null,
  created_at: "2026-07-02T00:00:00.000Z",
}

function build(
  overrides: Partial<Parameters<typeof buildCreditCardObligations>[0]> = {},
) {
  return buildCreditCardObligations({
    cards: [card],
    statements: [statement],
    cardPayments: [],
    transactions: [transaction],
    recurringBills: [bill],
    recurringBillPayments: [],
    asOfDate: "2026-07-08",
    throughDate: "2026-09-30",
    ...overrides,
  })
}

describe("buildCreditCardObligations", () => {
  test("combines persisted balances and pending bills exactly once", () => {
    const persisted = build().find(
      (obligation) => obligation.statementId === statement.id,
    )

    expect(persisted?.statementAmountCents).toBe(25_000)
    expect(persisted?.pendingBillAmountCents).toBe(10_000)
    expect(persisted?.amountCents).toBe(35_000)
    expect(persisted?.pendingBillLines).toHaveLength(1)
    expect(persisted?.statementChargeLines).toEqual([
      {
        key: "transaction:transaction-1",
        transactionId: "transaction-1",
        label: "Groceries",
        postedAt: "2026-07-02",
        amountCents: 25_000,
      },
    ])
  })

  test("creates virtual future statement obligations", () => {
    const virtual = build().find(
      (obligation) => obligation.periodStart === "2026-07-21",
    )

    expect(virtual?.isVirtual).toBe(true)
    expect(virtual?.paymentDueDate).toBe("2026-09-05")
    expect(virtual?.amountCents).toBe(10_000)
  })

  test("does not project settled bill occurrences", () => {
    const obligations = build({
      recurringBillPayments: [
        {
          id: "bill-payment-1",
          user_id: "user-1",
          recurring_bill_id: bill.id,
          due_date: "2026-07-10",
          amount_cents: 10_000,
          status: "paid",
          transaction_id: "transaction-2",
          paid_at: "2026-07-10",
        },
      ],
    })
    const persisted = obligations.find(
      (obligation) => obligation.statementId === statement.id,
    )

    expect(persisted?.pendingBillAmountCents).toBe(0)
    expect(
      obligations.flatMap((obligation) => obligation.pendingBillLines),
    ).toHaveLength(1)
  })

  test("marks statements with persisted payments as paid", () => {
    const persisted = build({
      cardPayments: [
        {
          id: "card-payment-1",
          user_id: "user-1",
          credit_card_id: card.id,
          statement_id: statement.id,
          source_account_id: "account-1",
          cashflow_transaction_id: "cashflow-1",
          amount_cents: 25_000,
          paid_at: "2026-08-01",
        },
      ],
    }).find((obligation) => obligation.statementId === statement.id)

    expect(persisted?.isPaid).toBe(true)
  })

  test("adds pending annuality installments to statement totals", () => {
    const obligations = build({
      cards: [
        {
          ...card,
          annuality_enabled: true,
          annuality_amount_cents: 30_000,
          annuality_anniversary_month: 7,
          annuality_anniversary_day: 10,
          annuality_payment_count: 1,
        },
      ],
      asOfDate: "2026-07-15",
      throughDate: "2026-07-15",
    })
    const withAnnuality = obligations.find(
      (obligation) => obligation.pendingAnnualityAmountCents > 0,
    )

    expect(withAnnuality?.pendingAnnualityLines).toHaveLength(1)
    expect(withAnnuality?.pendingAnnualityAmountCents).toBe(30_000)
    expect(withAnnuality?.amountCents).toBeGreaterThanOrEqual(30_000)
  })
})
