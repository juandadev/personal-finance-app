import type { SortOption } from "@/lib/types"
import type {
  RecurringBillQueryState,
  TransactionQueryState,
} from "./query-state"

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type DateRange = {
  from?: string
  to?: string
}

export type AmountRange = {
  min?: number
  max?: number
}

export type TransactionFilters = {
  q: string
  sort: SortOption
  page: number
  category: string[]
  budget: string[]
  account: string[]
  counterparty: string[]
  method: TransactionQueryState["method"]
  card: string[]
  direction?: NonNullable<TransactionQueryState["direction"]>
  dateRange: DateRange
  amountRange: AmountRange
}

export type RecurringBillFilters = {
  q: string
  sort: SortOption
  page: number
  category: string[]
  counterparty: string[]
  frequency: RecurringBillQueryState["frequency"]
  status: RecurringBillQueryState["status"]
  dueDateRange: DateRange
  amountRange: AmountRange
  source: RecurringBillQueryState["source"]
  card: string[]
  lifecycle: RecurringBillQueryState["lifecycle"]
  schedule?: NonNullable<RecurringBillQueryState["schedule"]>
}

function isIsoDate(value: string | null): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

function normalizeRange<T>(
  from: T | undefined,
  to: T | undefined,
  compare: (left: T, right: T) => number,
) {
  if (from !== undefined && to !== undefined && compare(from, to) > 0) {
    return {}
  }

  return { from, to }
}

function normalizeStringList(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function normalizeAmount(value: number | null) {
  return value !== null && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function normalizePage(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 1
}

export function normalizeTransactionFilters(
  query: TransactionQueryState,
): TransactionFilters {
  const dateRange = normalizeRange(
    isIsoDate(query.from) ? query.from : undefined,
    isIsoDate(query.to) ? query.to : undefined,
    (left, right) => left.localeCompare(right),
  )
  const amountRange = normalizeRange(
    normalizeAmount(query.minAmount),
    normalizeAmount(query.maxAmount),
    (left, right) => left - right,
  )

  return {
    q: query.q.trim(),
    sort: query.sort,
    page: normalizePage(query.page),
    category: normalizeStringList(query.category),
    budget: normalizeStringList(query.budget),
    account: normalizeStringList(query.account),
    counterparty: normalizeStringList(query.counterparty),
    method: query.method,
    card: normalizeStringList(query.card),
    direction: query.direction ?? undefined,
    dateRange,
    amountRange: {
      min: amountRange.from,
      max: amountRange.to,
    },
  }
}

export function normalizeRecurringBillFilters(
  query: RecurringBillQueryState,
): RecurringBillFilters {
  const dueDateRange = normalizeRange(
    isIsoDate(query.dueFrom) ? query.dueFrom : undefined,
    isIsoDate(query.dueTo) ? query.dueTo : undefined,
    (left, right) => left.localeCompare(right),
  )
  const amountRange = normalizeRange(
    normalizeAmount(query.minAmount),
    normalizeAmount(query.maxAmount),
    (left, right) => left - right,
  )

  return {
    q: query.q.trim(),
    sort: query.sort,
    page: normalizePage(query.page),
    category: normalizeStringList(query.category),
    counterparty: normalizeStringList(query.counterparty),
    frequency: query.frequency,
    status: query.status,
    dueDateRange,
    amountRange: {
      min: amountRange.from,
      max: amountRange.to,
    },
    source: query.source,
    card: normalizeStringList(query.card),
    lifecycle: query.lifecycle,
    schedule: query.schedule ?? undefined,
  }
}
