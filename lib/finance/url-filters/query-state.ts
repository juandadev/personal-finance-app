import {
  parseAsFloat,
  parseAsInteger,
  parseAsNativeArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server"
import type { BillStatus, SortOption } from "@/lib/types"

const queryOptions = {
  history: "replace" as const,
  shallow: true,
}

export const sortValues = [
  "latest",
  "oldest",
  "a-z",
  "z-a",
  "highest",
  "lowest",
] as const satisfies readonly SortOption[]

const transactionPaymentMethodValues = [
  "bank_account",
  "credit_card",
  "voucher",
  "credit_card_payment",
] as const

const transactionDirectionValues = ["income", "expense"] as const

const billFrequencyValues = ["monthly", "yearly"] as const

const billStatusValues = [
  "paid",
  "skipped",
  "upcoming",
  "due-soon",
  "due-today",
  "overdue",
] as const satisfies readonly BillStatus[]

const billSourceValues = ["bank_account", "credit_card"] as const
const billLifecycleValues = ["all", "active", "archived"] as const
const billScheduleValues = ["ongoing", "finite"] as const

export const transactionQueryParsers = {
  q: parseAsString.withDefault("").withOptions(queryOptions),
  sort: parseAsStringLiteral(sortValues)
    .withDefault("latest")
    .withOptions(queryOptions),
  page: parseAsInteger.withDefault(1).withOptions(queryOptions),
  category: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  budget: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  account: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  counterparty: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  method: parseAsNativeArrayOf(
    parseAsStringLiteral(transactionPaymentMethodValues),
  ).withOptions(queryOptions),
  card: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  direction: parseAsStringLiteral(transactionDirectionValues).withOptions(
    queryOptions,
  ),
  from: parseAsString.withOptions(queryOptions),
  to: parseAsString.withOptions(queryOptions),
  minAmount: parseAsFloat.withOptions(queryOptions),
  maxAmount: parseAsFloat.withOptions(queryOptions),
}

export type TransactionQueryState = {
  q: string
  sort: SortOption
  page: number
  category: string[]
  budget: string[]
  account: string[]
  counterparty: string[]
  method: (typeof transactionPaymentMethodValues)[number][]
  card: string[]
  direction: (typeof transactionDirectionValues)[number] | null
  from: string | null
  to: string | null
  minAmount: number | null
  maxAmount: number | null
}

export const recurringBillQueryParsers = {
  q: parseAsString.withDefault("").withOptions(queryOptions),
  sort: parseAsStringLiteral(sortValues)
    .withDefault("latest")
    .withOptions(queryOptions),
  page: parseAsInteger.withDefault(1).withOptions(queryOptions),
  category: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  counterparty: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  frequency: parseAsNativeArrayOf(
    parseAsStringLiteral(billFrequencyValues),
  ).withOptions(queryOptions),
  status: parseAsNativeArrayOf(
    parseAsStringLiteral(billStatusValues),
  ).withOptions(queryOptions),
  dueFrom: parseAsString.withOptions(queryOptions),
  dueTo: parseAsString.withOptions(queryOptions),
  minAmount: parseAsFloat.withOptions(queryOptions),
  maxAmount: parseAsFloat.withOptions(queryOptions),
  source: parseAsNativeArrayOf(
    parseAsStringLiteral(billSourceValues),
  ).withOptions(queryOptions),
  card: parseAsNativeArrayOf(parseAsString).withOptions(queryOptions),
  lifecycle: parseAsStringLiteral(billLifecycleValues)
    .withDefault("all")
    .withOptions(queryOptions),
  schedule: parseAsStringLiteral(billScheduleValues).withOptions(queryOptions),
}

export type RecurringBillQueryState = {
  q: string
  sort: SortOption
  page: number
  category: string[]
  counterparty: string[]
  frequency: (typeof billFrequencyValues)[number][]
  status: BillStatus[]
  dueFrom: string | null
  dueTo: string | null
  minAmount: number | null
  maxAmount: number | null
  source: (typeof billSourceValues)[number][]
  card: string[]
  lifecycle: (typeof billLifecycleValues)[number]
  schedule: (typeof billScheduleValues)[number] | null
}

export function hasActiveTransactionQuery(query: TransactionQueryState) {
  return (
    query.q !== "" ||
    query.sort !== "latest" ||
    query.page !== 1 ||
    query.category.length > 0 ||
    query.budget.length > 0 ||
    query.account.length > 0 ||
    query.counterparty.length > 0 ||
    query.method.length > 0 ||
    query.card.length > 0 ||
    query.direction !== null ||
    query.from !== null ||
    query.to !== null ||
    query.minAmount !== null ||
    query.maxAmount !== null
  )
}

export function hasActiveRecurringBillQuery(query: RecurringBillQueryState) {
  return (
    query.q !== "" ||
    query.sort !== "latest" ||
    query.page !== 1 ||
    query.category.length > 0 ||
    query.counterparty.length > 0 ||
    query.frequency.length > 0 ||
    query.status.length > 0 ||
    query.dueFrom !== null ||
    query.dueTo !== null ||
    query.minAmount !== null ||
    query.maxAmount !== null ||
    query.source.length > 0 ||
    query.card.length > 0 ||
    query.lifecycle !== "all" ||
    query.schedule !== null
  )
}
