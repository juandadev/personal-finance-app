import type {
  Budget,
  Pot,
  RecurringBill,
  RecurringBillSummary,
  SummaryStat,
  Transaction,
  TransactionCategory,
} from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"

export type CurrencyCode = "USD"
export type AccountType = "checking" | "savings" | "credit"
export type CounterpartyType = "person" | "merchant"
export type BillFrequency = "monthly"

export interface AccountRecord {
  id: string
  name: string
  type: AccountType
  currency: CurrencyCode
  currentBalanceCents: number
}

export interface AccountSummaryRecord {
  id: string
  accountId: string
  period: string
  incomeCents: number
  expenseCents: number
}

export interface CategoryRecord {
  id: string
  name: TransactionCategory
  slug: string
  sortOrder: number
}

export interface CounterpartyRecord {
  id: string
  displayName: string
  avatarUrl: string
  type: CounterpartyType
}

export interface TransactionRecord {
  id: string
  accountId: string
  counterpartyId: string
  categoryId: string
  amountCents: number
  postedAt: string
  description: string | null
}

export interface BudgetRecord {
  id: string
  categoryId: string
  period: string
  limitCents: number
  themeColor: ThemeColor
}

export interface BudgetSummaryRecord {
  budgetId: string
  spentCents: number
}

export interface PotRecord {
  id: string
  name: string
  balanceCents: number
  targetCents: number
  themeColor: ThemeColor
  sortOrder: number
}

export interface RecurringBillRecord {
  id: string
  counterpartyId: string
  amountCents: number
  currency: CurrencyCode
  frequency: BillFrequency
  dueDayOfMonth: number
  status: RecurringBill["status"]
}

export interface FinanceState {
  accounts: AccountRecord[]
  accountSummaries: AccountSummaryRecord[]
  categories: CategoryRecord[]
  counterparties: CounterpartyRecord[]
  transactions: TransactionRecord[]
  budgets: BudgetRecord[]
  budgetSummaries: BudgetSummaryRecord[]
  pots: PotRecord[]
  recurringBills: RecurringBillRecord[]
}

export interface FinanceViewModel {
  summaryStats: SummaryStat[]
  pots: Pot[]
  totalSaved: number
  budgets: Budget[]
  budgetSpent: number
  budgetLimit: number
  transactions: Transaction[]
  transactionCategories: TransactionCategory[]
  recurringBills: RecurringBill[]
  recurringBillsSummary: RecurringBillSummary[]
  totalBillsAmount: number
}
