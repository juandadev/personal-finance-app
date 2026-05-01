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

function getOrderedCategories(categories: CategoryRecord[]): CategoryRecord[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
}

function selectTransactionCategories(
  categories: CategoryRecord[],
): TransactionCategory[] {
  return getOrderedCategories(categories).map((category) => category.name)
}

function selectTransactions(
  transactions: TransactionRecord[],
  categories: Map<string, CategoryRecord>,
  counterparties: Map<string, CounterpartyRecord>,
) {
  return transactions.map((transaction) => {
    const category = getRequired(categories, transaction.categoryId, "category")
    const counterparty = getRequired(
      counterparties,
      transaction.counterpartyId,
      "counterparty",
    )

    return {
      id: transaction.id,
      name: counterparty.displayName,
      avatarUrl: counterparty.avatarUrl,
      amount: centsToDollars(transaction.amountCents),
      date: formatDisplayDate(transaction.postedAt),
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
    budgetSummaries.map((summary) => [summary.budgetId, summary.spentCents]),
  )

  return budgets.map((budget) => {
    const category = getRequired(categories, budget.categoryId, "category")

    return {
      category: category.name,
      maximum: centsToDollars(budget.limitCents),
      spent: centsToDollars(spendingByBudgetId.get(budget.id) ?? 0),
      color: budget.themeColor,
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
      bill.counterpartyId,
      "counterparty",
    )

    return {
      id: bill.id,
      name: counterparty.displayName,
      avatarUrl: counterparty.avatarUrl,
      amount: centsToDollars(bill.amountCents),
      dueDay: bill.dueDayOfMonth,
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

export function selectFinanceViewModel(state: FinanceState): FinanceViewModel {
  const categories = byId(state.categories)
  const counterparties = byId(state.counterparties)
  const primaryAccount = state.accounts[0]
  const accountSummary = state.accountSummaries[0]
  const pots = [...state.pots]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((pot) => ({
      id: pot.id,
      name: pot.name,
      amount: centsToDollars(pot.balanceCents),
      target: centsToDollars(pot.targetCents),
      color: pot.themeColor,
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
    summaryStats: [
      {
        label: "Current Balance",
        amount: centsToDollars(primaryAccount.currentBalanceCents),
        variant: "primary",
      },
      {
        label: "Income",
        amount: centsToDollars(accountSummary.incomeCents),
        variant: "default",
      },
      {
        label: "Expenses",
        amount: centsToDollars(accountSummary.expenseCents),
        variant: "default",
      },
    ],
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
