import type { FinanceState } from "./types"

export function createInitialFinanceState(): FinanceState {
  return {
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
  }
}
