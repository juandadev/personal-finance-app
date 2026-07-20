import { describe, expect, test } from "bun:test"

import { buildCashForecast } from "@/lib/finance/cash-forecast"
import type {
  CashForecastAdjustmentRecord,
  CreditCardRecord,
  FinanceState,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

const AS_OF = new Date("2026-07-12T18:00:00.000Z")

function makeState(overrides: Partial<FinanceState> = {}): FinanceState {
  return {
    preferences: {
      user_id: "user-1",
      default_currency: "USD",
      timezone: "America/Mexico_City",
    },
    accounts: [
      {
        id: "account-1",
        user_id: "user-1",
        name: "Checking",
        type: "checking",
        currency: "USD",
        current_balance_cents: 100_000,
        is_primary: true,
      },
    ],
    accountSummaries: [],
    categories: [],
    counterparties: [],
    transactions: [],
    budgets: [],
    budgetSummaries: [],
    budgetTransactionAssignments: [],
    pots: [],
    recurringBills: [],
    recurringBillPayments: [],
    creditCards: [],
    creditCardStatements: [],
    creditCardPayments: [],
    cashForecastSettings: {
      user_id: "user-1",
      default_monthly_income_cents: 200_000,
      included_budget_category_ids: [],
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    cashForecastAdjustments: [],
    ...overrides,
  }
}

function makeAdjustment(
  overrides: Partial<CashForecastAdjustmentRecord> & {
    id: string
    kind: CashForecastAdjustmentRecord["kind"]
    start_period: string
  },
): CashForecastAdjustmentRecord {
  return {
    user_id: "user-1",
    name: overrides.id,
    amount_cents: 10_000,
    recurrence: "once",
    created_at: `2026-07-01T00:00:0${overrides.id.at(-1) ?? "0"}.000Z`,
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeBill(
  overrides: Partial<RecurringBillRecord> = {},
): RecurringBillRecord {
  return {
    id: "bill-1",
    user_id: "user-1",
    counterparty_id: "merchant-1",
    concept: "Rent",
    amount_cents: 10_000,
    currency: "USD",
    frequency: "monthly",
    first_due_date: "2026-07-20",
    total_payments: null,
    credit_card_id: null,
    category_id: "category-1",
    archived_at: null,
    ...overrides,
  }
}

function makeCard(overrides: Partial<CreditCardRecord> = {}): CreditCardRecord {
  return {
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
    ...overrides,
  }
}

function makeTransaction(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  return {
    id: "transaction-1",
    user_id: "user-1",
    account_id: "account-1",
    counterparty_id: "merchant-1",
    category_id: "category-1",
    concept: "Cash activity",
    amount_cents: -10_000,
    is_voucher_expense: false,
    payment_method: "bank_account",
    credit_card_id: null,
    credit_card_statement_id: null,
    posted_at: "2026-07-10",
    description: null,
    ...overrides,
  }
}

function makeOwnerCounterparty() {
  return {
    id: "owner-1",
    user_id: "user-1",
    display_name: "Juan Martinez",
    avatar_url: null,
    type: "person" as const,
    theme_color: "finance-grey" as const,
    notes: "Account owner",
    is_account_owner: true,
  }
}

function makeMerchantCounterparty() {
  return {
    id: "merchant-1",
    user_id: "user-1",
    display_name: "Employer",
    avatar_url: null,
    type: "merchant" as const,
    theme_color: "chart-2" as const,
    notes: null,
    is_account_owner: false,
  }
}

function makeSalaryCategory() {
  return {
    id: "cat-salary",
    user_id: "user-1",
    name: "Salary",
    slug: "salary",
    theme_color: "chart-1" as const,
  }
}

function makeIncomeForecastFixtures(
  overrides: Partial<FinanceState> = {},
): FinanceState {
  return makeState({
    categories: [makeSalaryCategory()],
    counterparties: [makeOwnerCounterparty(), makeMerchantCounterparty()],
    ...overrides,
  })
}

function expectReady(state: FinanceState) {
  const result = buildCashForecast(state, AS_OF)

  if (result.status !== "ready") {
    throw new Error(`Expected ready forecast, received ${result.reason}.`)
  }

  return result
}

describe("buildCashForecast blockers", () => {
  test("distinguishes missing settings from a valid zero income", () => {
    expect(
      buildCashForecast(makeState({ cashForecastSettings: null }), AS_OF),
    ).toEqual({ status: "blocked", reason: "missing-settings" })

    const ready = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
      }),
    )

    expect(ready.months[0]?.defaultIncomeCents).toBe(0)
  })

  test("blocks without a primary payment account", () => {
    expect(buildCashForecast(makeState({ accounts: [] }), AS_OF)).toEqual({
      status: "blocked",
      reason: "missing-primary-account",
    })
  })

  test("blocks mixed default or contributing recurring-bill currencies", () => {
    const defaultCurrencyMismatch = buildCashForecast(
      makeState({
        preferences: {
          ...makeState().preferences,
          default_currency: "MXN",
        },
      }),
      AS_OF,
    )
    const billCurrencyMismatch = buildCashForecast(
      makeState({
        recurringBills: [makeBill({ currency: "MXN" })],
      }),
      AS_OF,
    )
    const cardBillCurrencyMismatch = buildCashForecast(
      makeState({
        creditCards: [makeCard()],
        recurringBills: [
          makeBill({ currency: "MXN", credit_card_id: "card-1" }),
        ],
      }),
      AS_OF,
    )

    expect(defaultCurrencyMismatch).toMatchObject({
      status: "blocked",
      reason: "mixed-currency",
    })
    expect(billCurrencyMismatch).toMatchObject({
      status: "blocked",
      reason: "mixed-currency",
    })
    expect(cardBillCurrencyMismatch).toMatchObject({
      status: "blocked",
      reason: "mixed-currency",
    })
  })

  test("ignores differently-currency bills without forecast obligations", () => {
    const forecast = buildCashForecast(
      makeState({
        recurringBills: [
          makeBill({
            id: "historical-paid",
            currency: "MXN",
            first_due_date: "2026-06-01",
            total_payments: 1,
          }),
          makeBill({
            id: "archived-before-due",
            currency: "MXN",
            first_due_date: "2026-08-01",
            archived_at: "2026-07-01T12:00:00.000Z",
          }),
          makeBill({
            id: "outside-horizon",
            currency: "MXN",
            first_due_date: "2027-08-01",
          }),
        ],
        recurringBillPayments: [
          {
            id: "historical-payment",
            user_id: "user-1",
            recurring_bill_id: "historical-paid",
            due_date: "2026-06-01",
            amount_cents: 10_000,
            status: "paid",
            transaction_id: "transaction-1",
            paid_at: "2026-06-01",
          },
        ],
      }),
      AS_OF,
    )

    expect(forecast.status).toBe("ready")
  })

  test("blocks an archived differently-currency bill with an unpaid overdue occurrence", () => {
    expect(
      buildCashForecast(
        makeState({
          recurringBills: [
            makeBill({
              currency: "MXN",
              first_due_date: "2026-06-20",
              total_payments: 1,
              archived_at: "2026-06-21T12:00:00.000Z",
            }),
          ],
        }),
        AS_OF,
      ),
    ).toMatchObject({
      status: "blocked",
      reason: "mixed-currency",
    })
  })
})

describe("buildCashForecast projection", () => {
  test("reconstructs current opening from actual cash movement and projects remaining default income", () => {
    const forecast = expectReady(
      makeState({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 160_000,
          },
        ],
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "Salary",
            amount_cents: 80_000,
            posted_at: "2026-07-03",
          }),
          makeTransaction({
            id: "groceries",
            concept: "Groceries",
            amount_cents: -20_000,
            posted_at: "2026-07-05",
          }),
          makeTransaction({
            id: "card-purchase",
            amount_cents: -30_000,
            payment_method: "credit_card",
            credit_card_id: "card-1",
          }),
          makeTransaction({
            id: "voucher",
            amount_cents: -10_000,
            is_voucher_expense: true,
          }),
          makeTransaction({
            id: "other-account",
            account_id: "account-2",
            amount_cents: 500_000,
          }),
          makeTransaction({
            id: "future-dated",
            amount_cents: 500_000,
            posted_at: "2026-07-20",
          }),
        ],
      }),
    )
    const current = forecast.months[0]!

    expect(current).toMatchObject({
      period: "2026-07",
      isCurrentPeriod: true,
      openingBalanceCents: 100_000,
      actualIncomeCents: 80_000,
      actualOutflowCents: 20_000,
      defaultIncomeCents: 200_000,
      totalIncomeCents: 280_000,
      totalOutflowsCents: 20_000,
      endingBalanceCents: 360_000,
    })
    expect(current.activities.map((activity) => activity.key)).toEqual([
      "cash-transaction:salary",
      "cash-transaction:groceries",
      "default-income:2026-07",
    ])
    expect(
      current.activities.filter((activity) => activity.status === "actual"),
    ).toHaveLength(2)
    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      openingBalanceCents: 360_000,
      defaultIncomeCents: 200_000,
    })
  })

  test("includes current custom adjustments and carries positive or negative endings forward", () => {
    const positive = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        cashForecastAdjustments: [
          makeAdjustment({
            id: "adjustment-1",
            kind: "additional_income",
            start_period: "2026-07",
            amount_cents: 40_000,
          }),
          makeAdjustment({
            id: "adjustment-2",
            kind: "planned_outflow",
            start_period: "2026-07",
            amount_cents: 10_000,
          }),
          makeAdjustment({
            id: "adjustment-3",
            kind: "planned_outflow",
            start_period: "2026-07",
            recurrence: "monthly",
            amount_cents: 20_000,
          }),
        ],
      }),
    )
    const negative = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        cashForecastAdjustments: [
          makeAdjustment({
            id: "adjustment-1",
            kind: "planned_outflow",
            start_period: "2026-07",
            amount_cents: 150_000,
          }),
        ],
      }),
    )

    expect(positive.months[0]).toMatchObject({
      additionalIncomeCents: 40_000,
      plannedOutflowCents: 30_000,
      endingBalanceCents: 110_000,
    })
    expect(positive.months[1]).toMatchObject({
      openingBalanceCents: 110_000,
      plannedOutflowCents: 20_000,
      endingBalanceCents: 90_000,
    })
    expect(
      positive.months[0]?.activities
        .filter((activity) => activity.sourceType !== "cash_transaction")
        .every((activity) => activity.status === "pending"),
    ).toBe(true)
    expect(negative.months[0]?.endingBalanceCents).toBe(-50_000)
    expect(negative.months[1]?.openingBalanceCents).toBe(-50_000)
  })

  test("shows a settled direct bill only as its actual cash transaction", () => {
    const forecast = expectReady(
      makeState({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 90_000,
          },
        ],
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        recurringBills: [makeBill({ first_due_date: "2026-07-10" })],
        recurringBillPayments: [
          {
            id: "bill-payment-1",
            user_id: "user-1",
            recurring_bill_id: "bill-1",
            due_date: "2026-07-10",
            amount_cents: 10_000,
            status: "paid",
            transaction_id: "bill-cash-transaction",
            paid_at: "2026-07-10",
          },
        ],
        transactions: [
          makeTransaction({
            id: "bill-cash-transaction",
            concept: "Rent",
            amount_cents: -10_000,
          }),
        ],
      }),
    )
    const current = forecast.months[0]!

    expect(current.actualOutflowCents).toBe(10_000)
    expect(current.directBillOutflowCents).toBe(0)
    expect(current.activities).toHaveLength(1)
    expect(current.activities[0]).toMatchObject({
      key: "cash-transaction:bill-cash-transaction",
      sourceType: "cash_transaction",
      status: "actual",
    })
  })

  test("shows a paid card statement only as its actual cash payment", () => {
    const card = makeCard()
    const statement = {
      id: "statement-1",
      user_id: "user-1",
      credit_card_id: card.id,
      period_start: "2026-05-21",
      period_end: "2026-06-20",
      payment_due_date: "2026-07-20",
      statement_amount_cents: 25_000,
      lifecycle_status: "closed" as const,
      paid_at: "2026-07-08",
    }
    const forecast = expectReady(
      makeState({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 75_000,
          },
        ],
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        creditCardStatements: [statement],
        creditCardPayments: [
          {
            id: "card-payment-1",
            user_id: "user-1",
            credit_card_id: card.id,
            statement_id: statement.id,
            source_account_id: "account-1",
            cashflow_transaction_id: "card-cash-transaction",
            amount_cents: 25_000,
            paid_at: "2026-07-08",
          },
        ],
        transactions: [
          makeTransaction({
            id: "card-cash-transaction",
            concept: "Pay Daily Card statement",
            amount_cents: -25_000,
            payment_method: "credit_card_payment",
            credit_card_id: card.id,
            credit_card_statement_id: statement.id,
            posted_at: "2026-07-08",
          }),
        ],
      }),
    )
    const current = forecast.months[0]!

    expect(current.actualOutflowCents).toBe(25_000)
    expect(current.creditCardOutflowCents).toBe(0)
    expect(current.activities).toHaveLength(1)
    expect(current.activities[0]?.sourceType).toBe("cash_transaction")
  })

  test("counts each unpaid current obligation exactly once", () => {
    const card = makeCard()
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        recurringBills: [makeBill({ first_due_date: "2026-07-20" })],
        creditCards: [card],
        creditCardStatements: [
          {
            id: "statement-1",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-05-21",
            period_end: "2026-06-20",
            payment_due_date: "2026-07-20",
            statement_amount_cents: 25_000,
            lifecycle_status: "closed",
            paid_at: null,
          },
        ],
      }),
    )
    const current = forecast.months[0]!

    expect(current).toMatchObject({
      directBillOutflowCents: 10_000,
      creditCardOutflowCents: 25_000,
      totalOutflowsCents: 35_000,
      endingBalanceCents: 65_000,
    })
    expect(
      current.activities.filter(
        (activity) => activity.sourceType === "recurring_bill",
      ),
    ).toHaveLength(1)
    expect(
      current.activities.filter(
        (activity) => activity.sourceType === "credit_card_statement",
      ),
    ).toHaveLength(1)
  })

  test("returns current month plus 12 future periods across a year boundary", () => {
    const result = buildCashForecast(
      makeState(),
      new Date("2026-12-15T18:00:00.000Z"),
    )

    if (result.status !== "ready") {
      throw new Error(`Expected ready forecast, received ${result.reason}.`)
    }

    expect(result.months).toHaveLength(13)
    expect(result.months.map((month) => month.period)).toEqual([
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
      "2027-10",
      "2027-11",
      "2027-12",
    ])
  })

  test("reconciles current balance with pending obligations and current adjustments", () => {
    const card = makeCard()
    const state = makeState({
      recurringBills: [
        makeBill({
          first_due_date: "2026-06-20",
          total_payments: 3,
        }),
      ],
      recurringBillPayments: [
        {
          id: "bill-payment-1",
          user_id: "user-1",
          recurring_bill_id: "bill-1",
          due_date: "2026-06-20",
          amount_cents: 10_000,
          status: "paid",
          transaction_id: "transaction-1",
          paid_at: "2026-06-20",
        },
      ],
      creditCards: [card],
      creditCardStatements: [
        {
          id: "statement-1",
          user_id: "user-1",
          credit_card_id: card.id,
          period_start: "2026-05-21",
          period_end: "2026-06-20",
          payment_due_date: "2026-07-20",
          statement_amount_cents: 25_000,
          lifecycle_status: "closed",
          paid_at: null,
        },
      ],
      cashForecastAdjustments: [
        makeAdjustment({
          id: "adjustment-1",
          kind: "additional_income",
          start_period: "2026-07",
          recurrence: "monthly",
          amount_cents: 500_000,
        }),
        makeAdjustment({
          id: "adjustment-2",
          kind: "planned_outflow",
          start_period: "2026-07",
          recurrence: "monthly",
          amount_cents: 500_000,
        }),
      ],
    })
    const forecast = expectReady(state)

    expect(forecast.bridge).toMatchObject({
      startingBalanceCents: 100_000,
      directBillObligationsCents: 10_000,
      creditCardObligationsCents: 25_000,
      remainingObligationsCents: 35_000,
      pendingAdditionalIncomeCents: 500_000,
      pendingPlannedOutflowCents: 500_000,
      pendingOutflowsCents: 535_000,
      openingBalanceCents: 100_000,
    })
    expect(forecast.months[0]).toMatchObject({
      period: "2026-07",
      openingBalanceCents: 100_000,
      defaultIncomeCents: 200_000,
      endingBalanceCents: 265_000,
    })
  })

  test("returns 13 months and carries one-time and monthly changes cumulatively", () => {
    const forecast = expectReady(
      makeState({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 0,
          },
        ],
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 100_000,
        },
        cashForecastAdjustments: [
          makeAdjustment({
            id: "adjustment-1",
            kind: "additional_income",
            start_period: "2026-08",
            amount_cents: 50_000,
          }),
          makeAdjustment({
            id: "adjustment-4",
            kind: "additional_income",
            start_period: "2026-08",
            recurrence: "monthly",
            amount_cents: 30_000,
          }),
          makeAdjustment({
            id: "adjustment-2",
            kind: "planned_outflow",
            start_period: "2026-09",
            amount_cents: 20_000,
          }),
          makeAdjustment({
            id: "adjustment-3",
            kind: "planned_outflow",
            start_period: "2026-10",
            recurrence: "monthly",
            amount_cents: 10_000,
          }),
        ],
      }),
    )

    expect(forecast.months).toHaveLength(13)
    expect(forecast.months[0]).toMatchObject({
      period: "2026-07",
      defaultIncomeCents: 100_000,
      endingBalanceCents: 100_000,
    })
    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      additionalIncomeCents: 80_000,
      endingBalanceCents: 280_000,
    })
    expect(forecast.months[2]).toMatchObject({
      period: "2026-09",
      additionalIncomeCents: 30_000,
      plannedOutflowCents: 20_000,
      endingBalanceCents: 390_000,
    })
    expect(forecast.months[3]).toMatchObject({
      period: "2026-10",
      additionalIncomeCents: 30_000,
      plannedOutflowCents: 10_000,
      endingBalanceCents: 510_000,
    })
    expect(forecast.months.at(-1)?.period).toBe("2027-07")
    expect(forecast.months.at(-1)?.endingBalanceCents).toBe(1_590_000)
  })

  test("keeps negative balances valid and carries them forward", () => {
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        cashForecastAdjustments: [
          makeAdjustment({
            id: "adjustment-1",
            kind: "planned_outflow",
            start_period: "2026-08",
            recurrence: "monthly",
            amount_cents: 60_000,
          }),
        ],
      }),
    )

    expect(forecast.months[1]?.openingBalanceCents).toBe(100_000)
    expect(forecast.months[1]?.endingBalanceCents).toBe(40_000)
    expect(forecast.months[2]?.openingBalanceCents).toBe(40_000)
    expect(forecast.months[2]?.endingBalanceCents).toBe(-20_000)
    expect(forecast.months[3]?.openingBalanceCents).toBe(-20_000)
  })

  test("omits zero default-income activity while retaining zero income totals", () => {
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
      }),
    )

    expect(
      forecast.months.every(
        (month) =>
          month.totalIncomeCents === 0 && month.activities.length === 0,
      ),
    ).toBe(true)
  })

  test("uses direct-bill due months and excludes skipped and archived future occurrences", () => {
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        recurringBills: [
          makeBill({
            first_due_date: "2026-08-31",
            total_payments: 4,
            archived_at: "2026-09-15T00:00:00.000Z",
          }),
        ],
        recurringBillPayments: [
          {
            id: "bill-payment-1",
            user_id: "user-1",
            recurring_bill_id: "bill-1",
            due_date: "2026-08-31",
            amount_cents: 10_000,
            status: "skipped",
            transaction_id: null,
            paid_at: "2026-08-01",
          },
        ],
      }),
    )

    expect(forecast.months[1]?.directBillOutflowCents).toBe(0)
    expect(forecast.months[2]?.directBillOutflowCents).toBe(0)
  })

  test("interprets recurring-bill archive cutoffs in the configured timezone", () => {
    const card = makeCard()
    const archiveAtLocalJuly31 = "2026-08-01T02:00:00.000Z"
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        recurringBills: [
          makeBill({
            id: "direct-boundary",
            first_due_date: "2026-08-01",
            total_payments: 1,
            archived_at: archiveAtLocalJuly31,
          }),
          makeBill({
            id: "card-boundary",
            first_due_date: "2026-08-01",
            total_payments: 1,
            credit_card_id: card.id,
            archived_at: archiveAtLocalJuly31,
          }),
        ],
      }),
    )

    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      directBillOutflowCents: 0,
    })
    expect(forecast.months[2]).toMatchObject({
      period: "2026-09",
      creditCardOutflowCents: 0,
    })
  })

  test("places card bills in statement payment months and reconciles statement children", () => {
    const card = makeCard()
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        recurringBills: [
          makeBill({
            amount_cents: 5_000,
            first_due_date: "2026-07-15",
            total_payments: 1,
            credit_card_id: card.id,
          }),
        ],
        creditCardStatements: [
          {
            id: "statement-1",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-06-21",
            period_end: "2026-07-20",
            payment_due_date: "2026-08-05",
            statement_amount_cents: 30_000,
            lifecycle_status: "open",
            paid_at: null,
          },
        ],
        transactions: [
          {
            id: "transaction-1",
            user_id: "user-1",
            account_id: "account-1",
            counterparty_id: "merchant-1",
            category_id: "category-1",
            concept: "Known Purchase",
            amount_cents: -20_000,
            is_voucher_expense: false,
            payment_method: "credit_card",
            credit_card_id: card.id,
            credit_card_statement_id: "statement-1",
            posted_at: "2026-07-01",
            description: null,
          },
        ],
      }),
    )
    const august = forecast.months[1]
    const cardActivity = august?.activities.find(
      (activity) => activity.sourceType === "credit_card_statement",
    )

    expect(august?.creditCardOutflowCents).toBe(35_000)
    expect(cardActivity?.children?.map((child) => child.amountCents)).toEqual([
      -20_000, -5_000, -10_000,
    ])
    expect(
      cardActivity?.children?.reduce(
        (sum, child) => sum + child.amountCents,
        0,
      ),
    ).toBe(cardActivity?.amountCents)
  })

  test("projects a virtual card statement in its payment-due month", () => {
    const card = makeCard()
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        recurringBills: [
          makeBill({
            first_due_date: "2026-08-10",
            total_payments: 1,
            credit_card_id: card.id,
          }),
        ],
      }),
    )

    expect(forecast.months[1]?.creditCardOutflowCents).toBe(0)
    expect(forecast.months[2]).toMatchObject({
      period: "2026-09",
      creditCardOutflowCents: 10_000,
    })
  })

  test("places a one-time scheduled card charge in its statement payment month", () => {
    const card = makeCard()
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        recurringBills: [
          makeBill({
            frequency: "one_time",
            first_due_date: "2026-08-10",
            total_payments: 1,
            credit_card_id: card.id,
          }),
        ],
      }),
    )

    expect(forecast.months[1]?.creditCardOutflowCents).toBe(0)
    expect(forecast.months[2]).toMatchObject({
      period: "2026-09",
      creditCardOutflowCents: 10_000,
    })
  })

  test("excludes paid and zero-balance statements", () => {
    const card = makeCard()
    const forecast = expectReady(
      makeState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
        },
        creditCards: [card],
        creditCardStatements: [
          {
            id: "statement-paid",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-05-21",
            period_end: "2026-06-20",
            payment_due_date: "2026-08-05",
            statement_amount_cents: 50_000,
            lifecycle_status: "paid",
            paid_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: "statement-zero",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-06-21",
            period_end: "2026-07-20",
            payment_due_date: "2026-08-05",
            statement_amount_cents: 0,
            lifecycle_status: "open",
            paid_at: null,
          },
        ],
      }),
    )

    expect(forecast.months[1]?.creditCardOutflowCents).toBe(0)
  })
})

describe("buildCashForecast current-month income", () => {
  test("reduces remaining default income by salary received without double-counting", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 120_000,
          },
        ],
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "July salary",
            amount_cents: 80_000,
            category_id: "cat-salary",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-03",
          }),
        ],
      }),
    )
    const current = forecast.months[0]!

    expect(current).toMatchObject({
      actualIncomeCents: 80_000,
      defaultIncomeCents: 120_000,
      totalIncomeCents: 200_000,
      openingBalanceCents: 40_000,
      endingBalanceCents: 240_000,
    })
    expect(
      current.activities.find(
        (activity) => activity.sourceType === "default_income",
      ),
    ).toMatchObject({
      label: "Remaining Monthly Income",
      amountCents: 120_000,
      status: "pending",
    })
  })

  test("clamps remaining default income to zero when salary exceeds default", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 250_000,
          },
        ],
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "July salary",
            amount_cents: 250_000,
            category_id: "cat-salary",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-03",
          }),
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      actualIncomeCents: 250_000,
      defaultIncomeCents: 0,
      totalIncomeCents: 250_000,
      openingBalanceCents: 0,
      endingBalanceCents: 250_000,
    })
    expect(
      forecast.months[0]?.activities.some(
        (activity) => activity.sourceType === "default_income",
      ),
    ).toBe(false)
  })

  test("excludes pot withdrawals from forecast income while preserving opening balance", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 125_000,
          },
        ],
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "July salary",
            amount_cents: 20_000,
            category_id: "cat-salary",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-03",
          }),
          makeTransaction({
            id: "pot-withdrawal",
            concept: "Taken from Vacation",
            amount_cents: 5_000,
            counterparty_id: "owner-1",
            posted_at: "2026-07-05",
          }),
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      actualIncomeCents: 20_000,
      defaultIncomeCents: 180_000,
      totalIncomeCents: 200_000,
      openingBalanceCents: 100_000,
      endingBalanceCents: 300_000,
    })
    expect(
      forecast.months[0]?.activities.map((activity) => activity.key),
    ).toEqual(["cash-transaction:salary", "default-income:2026-07"])
  })

  test("excludes pot deposits from forecast outflow", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 115_000,
          },
        ],
        transactions: [
          makeTransaction({
            id: "pot-deposit",
            concept: "Deposit to Vacation",
            amount_cents: -5_000,
            counterparty_id: "owner-1",
            posted_at: "2026-07-05",
          }),
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      actualOutflowCents: 0,
      defaultIncomeCents: 200_000,
      totalIncomeCents: 200_000,
      openingBalanceCents: 120_000,
      endingBalanceCents: 320_000,
    })
    expect(forecast.months[0]?.activities).toHaveLength(1)
    expect(forecast.months[0]?.activities[0]?.sourceType).toBe("default_income")
  })

  test("counts non-salary income without reducing remaining default income", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        accounts: [
          {
            ...makeState().accounts[0]!,
            current_balance_cents: 123_000,
          },
        ],
        categories: [
          makeSalaryCategory(),
          {
            id: "cat-freelance",
            user_id: "user-1",
            name: "Freelance",
            slug: "freelance",
            theme_color: "chart-4",
          },
        ],
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "July salary",
            amount_cents: 20_000,
            category_id: "cat-salary",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-03",
          }),
          makeTransaction({
            id: "freelance",
            concept: "Design project",
            amount_cents: 3_000,
            category_id: "cat-freelance",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-06",
          }),
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      actualIncomeCents: 23_000,
      defaultIncomeCents: 180_000,
      totalIncomeCents: 203_000,
    })
  })

  test("keeps future months on the full saved default income", () => {
    const forecast = expectReady(
      makeIncomeForecastFixtures({
        transactions: [
          makeTransaction({
            id: "salary",
            concept: "July salary",
            amount_cents: 80_000,
            category_id: "cat-salary",
            counterparty_id: "merchant-1",
            posted_at: "2026-07-03",
          }),
        ],
      }),
    )

    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      actualIncomeCents: 0,
      defaultIncomeCents: 200_000,
      totalIncomeCents: 200_000,
    })
    expect(
      forecast.months[1]?.activities.find(
        (activity) => activity.sourceType === "default_income",
      ),
    ).toMatchObject({
      label: "Default Monthly Income",
    })
  })
})

describe("buildCashForecast budget projections", () => {
  const groceriesCategoryId = "11111111-1111-4111-8111-111111111111"
  const groceriesBudgetId = "22222222-2222-4222-8222-222222222222"
  const limitCents = 1_242_600
  const voucherCoverageCents = 356_600
  const oopCents = limitCents - voucherCoverageCents

  function groceriesState(overrides: Partial<FinanceState> = {}): FinanceState {
    return makeState({
      categories: [
        {
          id: groceriesCategoryId,
          user_id: "user-1",
          name: "Groceries",
          slug: "groceries",
          theme_color: "chart-3",
        },
      ],
      budgets: [
        {
          id: groceriesBudgetId,
          user_id: "user-1",
          category_id: groceriesCategoryId,
          period: "2026-07",
          limit_cents: limitCents,
          monthly_voucher_coverage_cents: voucherCoverageCents,
          theme_color: "chart-3",
        },
      ],
      cashForecastSettings: {
        ...makeState().cashForecastSettings!,
        default_monthly_income_cents: 0,
        included_budget_category_ids: [groceriesCategoryId],
      },
      ...overrides,
    })
  }

  test("projects future-month out-of-pocket as limit minus voucher coverage", () => {
    const forecast = expectReady(groceriesState())

    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      budgetProjectionOutflowCents: oopCents,
    })
    expect(
      forecast.months[1]?.activities.some(
        (activity) =>
          activity.sourceType === "budget_projection" &&
          activity.label === "Groceries" &&
          activity.amountCents === -oopCents,
      ),
    ).toBe(true)
  })

  test("reduces the payment-due month projection for card-assigned spend", () => {
    const card = makeCard()
    const chargeCents = 50_000
    const forecast = expectReady(
      groceriesState({
        creditCards: [card],
        creditCardStatements: [
          {
            id: "statement-1",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-06-21",
            period_end: "2026-07-20",
            payment_due_date: "2026-08-05",
            statement_amount_cents: chargeCents,
            lifecycle_status: "open",
            paid_at: null,
          },
        ],
        transactions: [
          makeTransaction({
            id: "grocery-card",
            concept: "Groceries Card",
            amount_cents: -chargeCents,
            payment_method: "credit_card",
            credit_card_id: card.id,
            credit_card_statement_id: "statement-1",
            category_id: groceriesCategoryId,
            posted_at: "2026-07-10",
          }),
        ],
        budgetTransactionAssignments: [
          {
            id: "assignment-1",
            user_id: "user-1",
            budget_id: groceriesBudgetId,
            transaction_id: "grocery-card",
            assigned_amount_cents: chargeCents,
          },
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      period: "2026-07",
      budgetProjectionOutflowCents: oopCents,
    })
    expect(forecast.months[1]).toMatchObject({
      period: "2026-08",
      budgetProjectionOutflowCents: oopCents - chargeCents,
      creditCardOutflowCents: chargeCents,
    })
    expect(
      (forecast.months[1]?.budgetProjectionOutflowCents ?? 0) +
        (forecast.months[1]?.creditCardOutflowCents ?? 0),
    ).toBe(oopCents)
  })

  test("reduces current-month projection for bank assignments", () => {
    const bankCents = 200_000
    const forecast = expectReady(
      groceriesState({
        transactions: [
          makeTransaction({
            id: "grocery-bank",
            concept: "Groceries Bank",
            amount_cents: -bankCents,
            payment_method: "bank_account",
            category_id: groceriesCategoryId,
            posted_at: "2026-07-08",
          }),
        ],
        budgetTransactionAssignments: [
          {
            id: "assignment-bank",
            user_id: "user-1",
            budget_id: groceriesBudgetId,
            transaction_id: "grocery-bank",
            assigned_amount_cents: bankCents,
          },
        ],
      }),
    )

    expect(forecast.months[0]?.budgetProjectionOutflowCents).toBe(
      oopCents - bankCents,
    )
  })

  test("ignores voucher assignments for budget projections", () => {
    const voucherCents = 100_000
    const forecast = expectReady(
      groceriesState({
        transactions: [
          makeTransaction({
            id: "grocery-voucher",
            concept: "Groceries Voucher",
            amount_cents: -voucherCents,
            is_voucher_expense: true,
            payment_method: "voucher",
            category_id: groceriesCategoryId,
            posted_at: "2026-07-08",
          }),
        ],
        budgetTransactionAssignments: [
          {
            id: "assignment-voucher",
            user_id: "user-1",
            budget_id: groceriesBudgetId,
            transaction_id: "grocery-voucher",
            assigned_amount_cents: voucherCents,
          },
        ],
      }),
    )

    expect(forecast.months[0]?.budgetProjectionOutflowCents).toBe(oopCents)
  })

  test("ignores voucher assignments even when voucher coverage is zero", () => {
    const voucherCents = 100_000
    const forecast = expectReady(
      groceriesState({
        budgets: [
          {
            id: groceriesBudgetId,
            user_id: "user-1",
            category_id: groceriesCategoryId,
            period: "2026-07",
            limit_cents: limitCents,
            monthly_voucher_coverage_cents: 0,
            theme_color: "chart-3",
          },
        ],
        transactions: [
          makeTransaction({
            id: "grocery-voucher",
            concept: "Groceries Voucher",
            amount_cents: -voucherCents,
            is_voucher_expense: true,
            payment_method: "voucher",
            category_id: groceriesCategoryId,
            posted_at: "2026-07-08",
          }),
        ],
        budgetTransactionAssignments: [
          {
            id: "assignment-voucher",
            user_id: "user-1",
            budget_id: groceriesBudgetId,
            transaction_id: "grocery-voucher",
            assigned_amount_cents: voucherCents,
          },
        ],
      }),
    )

    expect(forecast.months[0]?.budgetProjectionOutflowCents).toBe(limitCents)
  })

  test("reduces current-month projection once for same-month card dues", () => {
    const card = makeCard({
      closing_day_of_month: 10,
      payment_due_day_of_month: 25,
    })
    const chargeCents = 50_000
    const forecast = expectReady(
      groceriesState({
        creditCards: [card],
        creditCardStatements: [
          {
            id: "statement-july",
            user_id: "user-1",
            credit_card_id: card.id,
            period_start: "2026-06-11",
            period_end: "2026-07-10",
            payment_due_date: "2026-07-25",
            statement_amount_cents: chargeCents,
            lifecycle_status: "open",
            paid_at: null,
          },
        ],
        transactions: [
          makeTransaction({
            id: "grocery-card-july",
            concept: "Groceries Card",
            amount_cents: -chargeCents,
            payment_method: "credit_card",
            credit_card_id: card.id,
            credit_card_statement_id: "statement-july",
            category_id: groceriesCategoryId,
            posted_at: "2026-07-05",
          }),
        ],
        budgetTransactionAssignments: [
          {
            id: "assignment-july-card",
            user_id: "user-1",
            budget_id: groceriesBudgetId,
            transaction_id: "grocery-card-july",
            assigned_amount_cents: chargeCents,
          },
        ],
      }),
    )

    expect(forecast.months[0]).toMatchObject({
      period: "2026-07",
      budgetProjectionOutflowCents: oopCents - chargeCents,
      creditCardOutflowCents: chargeCents,
    })
    expect(
      (forecast.months[0]?.budgetProjectionOutflowCents ?? 0) +
        (forecast.months[0]?.creditCardOutflowCents ?? 0),
    ).toBe(oopCents)
  })

  test("omits budget projections when the category is not opted in", () => {
    const forecast = expectReady(
      groceriesState({
        cashForecastSettings: {
          ...makeState().cashForecastSettings!,
          default_monthly_income_cents: 0,
          included_budget_category_ids: [],
        },
      }),
    )

    expect(
      forecast.months.every(
        (month) => month.budgetProjectionOutflowCents === 0,
      ),
    ).toBe(true)
    expect(
      forecast.months.some((month) =>
        month.activities.some(
          (activity) => activity.sourceType === "budget_projection",
        ),
      ),
    ).toBe(false)
  })

  test("skips opted-in categories without an active budget", () => {
    const forecast = expectReady(
      groceriesState({
        budgets: [],
      }),
    )

    expect(forecast.months[1]?.budgetProjectionOutflowCents).toBe(0)
  })
})
