import {
  parseAsFloat,
  parseAsInteger,
  parseAsNativeArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server"
import type { BillStatus, SortOption } from "@/lib/types"

const serverQueryOptions = {
  history: "replace" as const,
  shallow: false,
}

const clientQueryOptions = {
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

const billFrequencyValues = ["monthly", "yearly", "one_time"] as const

const billStatusValues = [
  "paid",
  "skipped",
  "upcoming",
  "due-soon",
  "due-today",
  "overdue",
] as const satisfies readonly BillStatus[]

const billSourceValues = ["bank_account", "credit_card"] as const
const billLifecycleValues = ["all", "active", "paused", "archived"] as const
const billScheduleValues = ["ongoing", "finite"] as const

export const transactionQueryParsers = {
  q: parseAsString.withDefault("").withOptions(serverQueryOptions),
  sort: parseAsStringLiteral(sortValues)
    .withDefault("latest")
    .withOptions(serverQueryOptions),
  page: parseAsInteger.withDefault(1).withOptions(serverQueryOptions),
  category: parseAsNativeArrayOf(parseAsString).withOptions(serverQueryOptions),
  budget: parseAsNativeArrayOf(parseAsString).withOptions(serverQueryOptions),
  account: parseAsNativeArrayOf(parseAsString).withOptions(serverQueryOptions),
  counterparty:
    parseAsNativeArrayOf(parseAsString).withOptions(serverQueryOptions),
  method: parseAsNativeArrayOf(
    parseAsStringLiteral(transactionPaymentMethodValues),
  ).withOptions(serverQueryOptions),
  card: parseAsNativeArrayOf(parseAsString).withOptions(serverQueryOptions),
  direction: parseAsStringLiteral(transactionDirectionValues).withOptions(
    serverQueryOptions,
  ),
  from: parseAsString.withOptions(serverQueryOptions),
  to: parseAsString.withOptions(serverQueryOptions),
  minAmount: parseAsFloat.withOptions(serverQueryOptions),
  maxAmount: parseAsFloat.withOptions(serverQueryOptions),
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
  q: parseAsString.withDefault("").withOptions(clientQueryOptions),
  sort: parseAsStringLiteral(sortValues)
    .withDefault("latest")
    .withOptions(clientQueryOptions),
  page: parseAsInteger.withDefault(1).withOptions(clientQueryOptions),
  category: parseAsNativeArrayOf(parseAsString).withOptions(clientQueryOptions),
  counterparty:
    parseAsNativeArrayOf(parseAsString).withOptions(clientQueryOptions),
  frequency: parseAsNativeArrayOf(
    parseAsStringLiteral(billFrequencyValues),
  ).withOptions(clientQueryOptions),
  status: parseAsNativeArrayOf(
    parseAsStringLiteral(billStatusValues),
  ).withOptions(clientQueryOptions),
  dueFrom: parseAsString.withOptions(clientQueryOptions),
  dueTo: parseAsString.withOptions(clientQueryOptions),
  minAmount: parseAsFloat.withOptions(clientQueryOptions),
  maxAmount: parseAsFloat.withOptions(clientQueryOptions),
  source: parseAsNativeArrayOf(
    parseAsStringLiteral(billSourceValues),
  ).withOptions(clientQueryOptions),
  card: parseAsNativeArrayOf(parseAsString).withOptions(clientQueryOptions),
  lifecycle: parseAsStringLiteral(billLifecycleValues)
    .withDefault("all")
    .withOptions(clientQueryOptions),
  schedule:
    parseAsStringLiteral(billScheduleValues).withOptions(clientQueryOptions),
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
