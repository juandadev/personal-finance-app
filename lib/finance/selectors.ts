import type { Budget, RecurringBill, TransactionCategory } from "@/lib/types"
import type {
  BudgetRecord,
  CategoryRecord,
  CounterpartyRecord,
  FinanceState,
  FinanceViewModel,
  RecurringBillRecord,
  TransactionRecord,
} from "./types"

function centsToDollars(cents: number): number {
  return cents / 100
}

function byId<T extends { id: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]))
}

function getRequired<T>(
  records: Map<string, T>,
  id: string,
  recordName: string,
): T {
  const record = records.get(id)

  if (!record) {
    throw new Error(`Missing ${recordName} record for id "${id}"`)
  }

  return record
}

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const localDate = new Date(year, month - 1, day)

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(localDate)
}

function selectTransactionCategories(
  categories: CategoryRecord[],
): TransactionCategory[] {
  return categories.map((category) => category.name)
}

function selectTransactions(
  transactions: TransactionRecord[],
  categories: Map<string, CategoryRecord>,
  counterparties: Map<string, CounterpartyRecord>,
) {
  return transactions.map((transaction) => {
    const category = getRequired(
      categories,
      transaction.category_id,
      "category",
    )
    const counterparty = getRequired(
      counterparties,
      transaction.counterparty_id,
      "counterparty",
    )

    return {
      id: transaction.id,
      name: counterparty.display_name,
      avatarUrl: counterparty.avatar_url,
      amount: centsToDollars(transaction.amount_cents),
      date: formatDisplayDate(transaction.posted_at),
      category: category.name,
    }
  })
}

function selectBudgets(
  budgets: BudgetRecord[],
  budgetSummaries: FinanceState["budgetSummaries"],
  categories: Map<string, CategoryRecord>,
): Budget[] {
  const spendingByBudgetId = new Map(
    budgetSummaries.map((summary) => [summary.budget_id, summary.spent_cents]),
  )

  return budgets.map((budget) => {
    const category = getRequired(categories, budget.category_id, "category")

    return {
      category: category.name,
      maximum: centsToDollars(budget.limit_cents),
      spent: centsToDollars(spendingByBudgetId.get(budget.id) ?? 0),
      color: budget.theme_color,
    }
  })
}

function selectRecurringBills(
  recurringBills: RecurringBillRecord[],
  counterparties: Map<string, CounterpartyRecord>,
): RecurringBill[] {
  return recurringBills.map((bill) => {
    const counterparty = getRequired(
      counterparties,
      bill.counterparty_id,
      "counterparty",
    )

    return {
      id: bill.id,
      name: counterparty.display_name,
      avatarUrl: counterparty.avatar_url,
      amount: centsToDollars(bill.amount_cents),
      dueDay: bill.due_day_of_month,
      status: bill.status,
    }
  })
}

function selectRecurringBillsSummary(
  recurringBills: RecurringBill[],
): FinanceViewModel["recurringBillsSummary"] {
  const paidAmount = recurringBills
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + bill.amount, 0)
  const upcomingAmount = recurringBills
    .filter((bill) => bill.status === "upcoming" || bill.status === "due-soon")
    .reduce((sum, bill) => sum + bill.amount, 0)
  const dueSoonAmount = recurringBills
    .filter((bill) => bill.status === "due-soon")
    .reduce((sum, bill) => sum + bill.amount, 0)

  return [
    { label: "Paid Bills", amount: paidAmount, color: "chart-1" },
    {
      label: "Total Upcoming",
      amount: upcomingAmount,
      color: "chart-4",
    },
    { label: "Due Soon", amount: dueSoonAmount, color: "chart-2" },
  ]
}

function selectSummaryStats(
  state: FinanceState,
): FinanceViewModel["summaryStats"] {
  const primaryAccount = state.accounts[0]
  const accountSummary = state.accountSummaries[0]

  return [
    {
      label: "Current Balance",
      amount: centsToDollars(primaryAccount?.current_balance_cents ?? 0),
      variant: "primary",
    },
    {
      label: "Income",
      amount: centsToDollars(accountSummary?.income_cents ?? 0),
      variant: "default",
    },
    {
      label: "Expenses",
      amount: centsToDollars(accountSummary?.expense_cents ?? 0),
      variant: "default",
    },
  ]
}

export function selectFinanceViewModel(state: FinanceState): FinanceViewModel {
  const categories = byId(state.categories)
  const counterparties = byId(state.counterparties)
  const pots = state.pots.map((pot) => ({
    id: pot.id,
    name: pot.name,
    amount: centsToDollars(pot.balance_cents),
    target: centsToDollars(pot.target_cents),
    color: pot.theme_color,
  }))
  const budgets = selectBudgets(
    state.budgets,
    state.budgetSummaries,
    categories,
  )
  const transactions = selectTransactions(
    state.transactions,
    categories,
    counterparties,
  )
  const recurringBills = selectRecurringBills(
    state.recurringBills,
    counterparties,
  )
  const totalBillsAmount = recurringBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  )

  return {
    summaryStats: selectSummaryStats(state),
    pots,
    totalSaved: pots.reduce((sum, pot) => sum + pot.amount, 0),
    budgets,
    budgetSpent: budgets.reduce((sum, budget) => sum + budget.spent, 0),
    budgetLimit: budgets.reduce((sum, budget) => sum + budget.maximum, 0),
    transactions,
    transactionCategories: selectTransactionCategories(state.categories),
    recurringBills,
    recurringBillsSummary: selectRecurringBillsSummary(recurringBills),
    totalBillsAmount,
  }
}
