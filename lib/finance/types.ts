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

export type FinanceUserId = string
export type FinanceRecordId = string

export interface AccountRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  name: string
  type: AccountType
  currency: CurrencyCode
  current_balance_cents: number
}

export interface AccountSummaryRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  account_id: FinanceRecordId
  period: string
  income_cents: number
  expense_cents: number
}

export interface CategoryRecord {
  id: FinanceRecordId
  name: TransactionCategory
  slug: string
}

export interface CounterpartyRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  display_name: string
  avatar_url: string
  type: CounterpartyType
}

export interface TransactionRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  account_id: FinanceRecordId
  counterparty_id: FinanceRecordId
  category_id: FinanceRecordId
  amount_cents: number
  posted_at: string
  description: string | null
}

export interface BudgetRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  category_id: FinanceRecordId
  period: string
  limit_cents: number
  theme_color: ThemeColor
}

export interface BudgetSummaryRecord {
  user_id: FinanceUserId
  budget_id: FinanceRecordId
  spent_cents: number
}

export interface PotRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  name: string
  balance_cents: number
  target_cents: number
  theme_color: ThemeColor
}

export interface RecurringBillRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  counterparty_id: FinanceRecordId
  amount_cents: number
  currency: CurrencyCode
  frequency: BillFrequency
  due_day_of_month: number
  status: RecurringBill["status"]
}

export type NewBudgetRecord = Omit<BudgetRecord, "user_id">
export type NewPotRecord = Omit<PotRecord, "user_id">

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
