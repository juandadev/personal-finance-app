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

export type CurrencyCode = "USD" | "MXN"
export type AccountType = "checking" | "savings" | "credit"
export type CounterpartyType = "person" | "merchant"
export type BillFrequency = "monthly"

export type FinanceUserId = string
export type FinanceRecordId = string

export interface UserPreferencesRecord {
  user_id: FinanceUserId
  default_currency: CurrencyCode
  timezone: string
}

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
  user_id: FinanceUserId
  name: TransactionCategory
  slug: string
  theme_color: ThemeColor
}

export interface CounterpartyRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  display_name: string
  avatar_url: string | null
  type: CounterpartyType
  theme_color: ThemeColor
  notes: string | null
}

export interface TransactionRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  account_id: FinanceRecordId
  counterparty_id: FinanceRecordId
  category_id: FinanceRecordId
  concept: string
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

export interface BudgetTransactionAssignmentRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  budget_id: FinanceRecordId
  transaction_id: FinanceRecordId
  assigned_amount_cents: number
}

export type MonthlyReportModule = "budgets"
export type MonthlyReportRunStatus = "running" | "completed" | "failed"

export interface MonthlyReportRunRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  period: string
  module: MonthlyReportModule
  status: MonthlyReportRunStatus
  started_at: string
  completed_at: string | null
  error_message: string | null
}

export interface BudgetMonthlySnapshotRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  monthly_report_run_id: FinanceRecordId
  period: string
  source_budget_id: FinanceRecordId
  category_id: FinanceRecordId
  category_name: string
  theme_color: ThemeColor
  limit_cents: number
  spent_cents: number
  free_cents: number
  assigned_transaction_count: number
}

export interface PotRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  name: string
  balance_cents: number
  target_cents: number
  theme_color: ThemeColor
  due_date: string | null
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
export type NewCategoryRecord = Omit<CategoryRecord, "user_id">
export type NewCounterpartyRecord = Omit<CounterpartyRecord, "user_id">
export type NewTransactionRecord = Omit<TransactionRecord, "user_id">

export interface FinanceState {
  preferences: UserPreferencesRecord
  accounts: AccountRecord[]
  accountSummaries: AccountSummaryRecord[]
  categories: CategoryRecord[]
  counterparties: CounterpartyRecord[]
  transactions: TransactionRecord[]
  budgets: BudgetRecord[]
  budgetSummaries: BudgetSummaryRecord[]
  budgetTransactionAssignments: BudgetTransactionAssignmentRecord[]
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
