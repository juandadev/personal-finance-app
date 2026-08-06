import type { RecurringBill } from "@/lib/types"
import type { RecurringBillFilters } from "./normalize"

const urgencySortStatusPriority: Partial<
  Record<RecurringBill["status"], number>
> = {
  overdue: 0,
  "due-today": 1,
  "due-soon": 2,
  upcoming: 3,
}

function matchesAny(values: Set<string>, value?: string) {
  return values.size === 0 || (value !== undefined && values.has(value))
}

function matchesAmount(
  amount: number,
  range: RecurringBillFilters["amountRange"],
) {
  return (
    (range.min === undefined || amount >= range.min) &&
    (range.max === undefined || amount <= range.max)
  )
}

function matchesDate(
  dueDate: string,
  range: RecurringBillFilters["dueDateRange"],
) {
  return (
    (range.from === undefined || dueDate >= range.from) &&
    (range.to === undefined || dueDate <= range.to)
  )
}

function getBillSource(bill: RecurringBill) {
  return bill.creditCardId ? "credit_card" : "bank_account"
}

function getBillSchedule(bill: RecurringBill) {
  return bill.totalPayments === undefined ? "ongoing" : "finite"
}

export function nextDueDate(bill: RecurringBill) {
  return bill.currentOccurrence?.dueDate ?? bill.firstDueDate
}

function urgencySortRank(bill: RecurringBill) {
  return urgencySortStatusPriority[bill.status] ?? Number.POSITIVE_INFINITY
}

export function sortRecurringBills(
  bills: RecurringBill[],
  sort: RecurringBillFilters["sort"],
) {
  return [...bills].sort((left, right) => {
    switch (sort) {
      case "latest":
      case "oldest": {
        const statusComparison = urgencySortRank(left) - urgencySortRank(right)

        if (statusComparison !== 0) {
          return statusComparison
        }

        return sort === "latest"
          ? nextDueDate(left).localeCompare(nextDueDate(right))
          : nextDueDate(right).localeCompare(nextDueDate(left))
      }
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

export function filterRecurringBills(
  bills: RecurringBill[],
  filters: RecurringBillFilters,
) {
  const query = filters.q.toLowerCase()
  const categories = new Set(filters.category)
  const counterparties = new Set(filters.counterparty)
  const frequencies = new Set(filters.frequency)
  const statuses = new Set(filters.status)
  const sources = new Set(filters.source)
  const cards = new Set(filters.card)

  const filtered = bills.filter((bill) => {
    const matchesSearch =
      !query ||
      bill.name.toLowerCase().includes(query) ||
      bill.concept.toLowerCase().includes(query)
    const matchesLifecycle =
      filters.lifecycle === "all" ||
      (filters.lifecycle === "active"
        ? !bill.archivedAt && !bill.pausedAt
        : filters.lifecycle === "paused"
          ? Boolean(bill.pausedAt) && !bill.archivedAt
          : Boolean(bill.archivedAt))

    return (
      matchesSearch &&
      matchesLifecycle &&
      matchesAny(categories, bill.categoryId) &&
      matchesAny(counterparties, bill.counterpartyId) &&
      matchesAny(frequencies, bill.frequency) &&
      matchesAny(statuses, bill.status) &&
      matchesDate(nextDueDate(bill), filters.dueDateRange) &&
      matchesAmount(bill.amount, filters.amountRange) &&
      matchesAny(sources, getBillSource(bill)) &&
      matchesAny(cards, bill.creditCardId) &&
      (!filters.schedule || getBillSchedule(bill) === filters.schedule)
    )
  })

  return sortRecurringBills(filtered, filters.sort)
}
