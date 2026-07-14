import type { Transaction } from "@/lib/types"
import type { TransactionFilters } from "./normalize"

function matchesAny(values: Set<string>, value?: string) {
  return values.size === 0 || (value !== undefined && values.has(value))
}

function matchesAmount(
  amount: number,
  range: TransactionFilters["amountRange"],
) {
  const absoluteAmount = Math.abs(amount)

  return (
    (range.min === undefined || absoluteAmount >= range.min) &&
    (range.max === undefined || absoluteAmount <= range.max)
  )
}

function matchesDate(postedAt: string, range: TransactionFilters["dateRange"]) {
  const date = postedAt.slice(0, 10)

  return (
    (range.from === undefined || date >= range.from) &&
    (range.to === undefined || date <= range.to)
  )
}

function matchesDirection(
  amount: number,
  direction: TransactionFilters["direction"],
) {
  if (!direction) return true

  return direction === "income" ? amount > 0 : amount < 0
}

export function sortTransactions(
  transactions: Transaction[],
  sort: TransactionFilters["sort"],
) {
  return [...transactions].sort((left, right) => {
    switch (sort) {
      case "latest":
        return right.postedAt.localeCompare(left.postedAt)
      case "oldest":
        return left.postedAt.localeCompare(right.postedAt)
      case "a-z":
        return left.name.localeCompare(right.name)
      case "z-a":
        return right.name.localeCompare(left.name)
      case "highest":
        return right.amount - left.amount
      case "lowest":
        return left.amount - right.amount
    }
  })
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
) {
  const query = filters.q.toLowerCase()
  const categories = new Set(filters.category)
  const budgets = new Set(filters.budget)
  const accounts = new Set(filters.account)
  const counterparties = new Set(filters.counterparty)
  const methods = new Set(filters.method)
  const cards = new Set(filters.card)

  const filtered = transactions.filter((transaction) => {
    const matchesSearch =
      !query ||
      transaction.name.toLowerCase().includes(query) ||
      transaction.concept.toLowerCase().includes(query) ||
      transaction.description?.toLowerCase().includes(query)
    const matchesBudget =
      budgets.size === 0 ||
      (transaction.budgetId
        ? budgets.has(transaction.budgetId)
        : budgets.has("unassigned"))

    return (
      matchesSearch &&
      matchesAny(categories, transaction.categoryId) &&
      matchesBudget &&
      matchesAny(accounts, transaction.accountId) &&
      matchesAny(counterparties, transaction.counterpartyId) &&
      matchesAny(methods, transaction.paymentMethod) &&
      matchesAny(cards, transaction.creditCardId) &&
      matchesDirection(transaction.amount, filters.direction) &&
      matchesDate(transaction.postedAt, filters.dateRange) &&
      matchesAmount(transaction.amount, filters.amountRange)
    )
  })

  return sortTransactions(filtered, filters.sort)
}
