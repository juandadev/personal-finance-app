import { describe, expect, test } from "bun:test"

import { createInitialFinanceState } from "@/lib/finance/seed"

describe("createInitialFinanceState", () => {
  test("returns a blank finance state", () => {
    expect(createInitialFinanceState()).toEqual({
      preferences: {
        user_id: "",
        default_currency: "USD",
        timezone: "America/Mexico_City",
        hideAmounts: false,
      },
      accounts: [],
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
      cashForecastSettings: null,
      cashForecastAdjustments: [],
      cashForecastExclusions: [],
    })
  })

  test("returns independent collection instances", () => {
    const first = createInitialFinanceState()
    const second = createInitialFinanceState()

    expect(first.accounts).not.toBe(second.accounts)
    expect(first.cashForecastAdjustments).not.toBe(
      second.cashForecastAdjustments,
    )
    expect(first.cashForecastExclusions).not.toBe(second.cashForecastExclusions)
  })
})
