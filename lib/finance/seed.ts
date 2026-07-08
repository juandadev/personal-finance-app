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

const demoUserId = accountsSeed[0]?.user_id ?? "demo-user"
const categoryThemeColors = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "finance-purple",
  "finance-turquoise",
  "finance-brown",
  "finance-magenta",
  "finance-blue",
  "finance-grey",
] as const
const categoriesById = new Map(
  categoriesSeed.map((category) => [category.id, category]),
)
const counterpartiesById = new Map(
  counterpartiesSeed.map((counterparty) => [counterparty.id, counterparty]),
)
const categoriesSeedRows = categoriesSeed.map((category, index) => ({
  ...category,
  user_id: demoUserId,
  theme_color: categoryThemeColors[index % categoryThemeColors.length],
}))
const counterpartiesSeedRows = counterpartiesSeed.map(
  (counterparty, index) => ({
    ...counterparty,
    avatar_url: counterparty.avatar_url ?? null,
    theme_color: categoryThemeColors[index % categoryThemeColors.length],
    notes: null,
  }),
)
const transactionsSeedRows = transactionsSeed.map((transaction) => {
  const category = categoriesById.get(transaction.category_id)
  const counterparty = counterpartiesById.get(transaction.counterparty_id)

  return {
    ...transaction,
    concept:
      transaction.description ??
      category?.name ??
      counterparty?.display_name ??
      "Manual transaction",
    is_voucher_expense: false,
    payment_method: "bank_account",
    credit_card_id: null,
    credit_card_statement_id: null,
  }
})
const potsSeedRows = potsSeed.map((pot) => ({
  ...pot,
  due_date:
    "due_date" in pot && typeof pot.due_date === "string" ? pot.due_date : null,
}))

export const financeSeed: FinanceState = {
  preferences: {
    user_id: demoUserId,
    default_currency: "USD",
    timezone: "America/Mexico_City",
  },
  accounts: accountsSeed,
  accountSummaries: accountSummariesSeed,
  categories: categoriesSeedRows,
  counterparties: counterpartiesSeedRows,
  transactions: transactionsSeedRows,
  budgets: budgetsSeed,
  budgetSummaries: budgetSummariesSeed,
  budgetTransactionAssignments: [],
  pots: potsSeedRows,
  recurringBills: recurringBillsSeed,
  creditCards: [],
  creditCardStatements: [],
  creditCardPayments: [],
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
    creditCards: financeSeed.creditCards.map((card) => ({ ...card })),
    creditCardStatements: financeSeed.creditCardStatements.map((statement) => ({
      ...statement,
    })),
    creditCardPayments: financeSeed.creditCardPayments.map((payment) => ({
      ...payment,
    })),
  }
}
