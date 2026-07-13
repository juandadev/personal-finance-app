import type { FinanceState } from "./types"

export function createInitialFinanceState(): FinanceState {
  return {
    preferences: {
      user_id: "",
      default_currency: "USD",
      timezone: "America/Mexico_City",
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
  }
}
