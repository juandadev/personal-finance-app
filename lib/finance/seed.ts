import accountSummariesSeed from "@/data/account-summaries.json"
import accountsSeed from "@/data/accounts.json"
import budgetSummariesSeed from "@/data/budget-summaries.json"
import budgetsSeed from "@/data/budgets.json"
import categoriesSeed from "@/data/categories.json"
import counterpartiesSeed from "@/data/counterparties.json"
import potsSeed from "@/data/pots.json"
import recurringBillsSeed from "@/data/recurring-bills.json"
import transactionsSeed from "@/data/transactions.json"
import type { FinanceState } from "./types"

export const financeSeed: FinanceState = {
  preferences: {
    user_id: accountsSeed[0]?.user_id ?? "demo-user",
    default_currency: "USD",
    timezone: "America/Mexico_City",
  },
  accounts: accountsSeed,
  accountSummaries: accountSummariesSeed,
  categories: categoriesSeed,
  counterparties: counterpartiesSeed,
  transactions: transactionsSeed,
  budgets: budgetsSeed,
  budgetSummaries: budgetSummariesSeed,
  budgetTransactionAssignments: [],
  pots: potsSeed,
  recurringBills: recurringBillsSeed,
} as FinanceState

export function createInitialFinanceState(): FinanceState {
  return {
    preferences: { ...financeSeed.preferences },
    accounts: financeSeed.accounts.map((account) => ({ ...account })),
    accountSummaries: financeSeed.accountSummaries.map((summary) => ({
      ...summary,
    })),
    categories: financeSeed.categories.map((category) => ({ ...category })),
    counterparties: financeSeed.counterparties.map((counterparty) => ({
      ...counterparty,
    })),
    transactions: financeSeed.transactions.map((transaction) => ({
      ...transaction,
    })),
    budgets: financeSeed.budgets.map((budget) => ({ ...budget })),
    budgetSummaries: financeSeed.budgetSummaries.map((summary) => ({
      ...summary,
    })),
    budgetTransactionAssignments: financeSeed.budgetTransactionAssignments.map(
      (assignment) => ({ ...assignment }),
    ),
    pots: financeSeed.pots.map((pot) => ({ ...pot })),
    recurringBills: financeSeed.recurringBills.map((bill) => ({ ...bill })),
  }
}
