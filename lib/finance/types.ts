import type {
  Budget,
  CreditCard,
  CreditCardSummary,
  Pot,
  RecurringBill,
  RecurringBillSummary,
  SummaryStat,
  Transaction,
  TransactionCategory,
} from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"
import type { BudgetCloseStatus } from "./budget-balance"

export type CurrencyCode = "USD" | "MXN"
export type AccountType = "checking" | "savings" | "credit"
export type CounterpartyType = "person" | "merchant"
export type BillFrequency = "monthly" | "yearly" | "one_time"
export type RecurringBillPaymentStatus = "paid" | "skipped"
export type TransactionPaymentMethod =
  "bank_account" | "credit_card" | "voucher" | "credit_card_payment"
export type CreditCardStatementLifecycleStatus = "open" | "closed" | "paid"
export type CashForecastAdjustmentKind = "additional_income" | "planned_outflow"
export type CashForecastAdjustmentRecurrence = "once" | "monthly"
export type CashForecastExclusionSourceType =
  | "budget_projection"
  | "default_income"
  | "recurring_bill"
  | "additional_income"
  | "planned_outflow"
export type PotMovementDirection = "deposit" | "withdraw"
export type PotMovementSource =
  | { type: "direct" }
  | {
      type: "primary_account"
      categoryId?: FinanceRecordId | null
      concept?: string | null
      postedAt?: string | null
    }
  | { type: "pot"; potId: FinanceRecordId }

export type FinanceUserId = string
export type FinanceRecordId = string

export interface PotMovementRequest {
  potId: FinanceRecordId
  amountCents: number
  direction: PotMovementDirection
  source: PotMovementSource
}

export interface UserPreferencesRecord {
  user_id: FinanceUserId
  default_currency: CurrencyCode
  timezone: string
  hideAmounts: boolean
}

export interface AccountRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  name: string
  type: AccountType
  currency: CurrencyCode
  current_balance_cents: number
  is_primary: boolean
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
  is_account_owner: boolean
}

export interface TransactionRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  account_id: FinanceRecordId
  counterparty_id: FinanceRecordId
  category_id: FinanceRecordId
  concept: string
  amount_cents: number
  is_voucher_expense: boolean
  payment_method: TransactionPaymentMethod
  credit_card_id: FinanceRecordId | null
  credit_card_statement_id: FinanceRecordId | null
  posted_at: string
  description: string | null
  created_at: string
}

export interface BudgetRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  category_id: FinanceRecordId
  period: string
  limit_cents: number
  monthly_voucher_coverage_cents: number
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

export type { BudgetCloseStatus } from "./budget-balance"

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
  over_cents: number
  status: BudgetCloseStatus
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
  concept: string
  amount_cents: number
  currency: CurrencyCode
  frequency: BillFrequency
  first_due_date: string
  total_payments: number | null
  credit_card_id: FinanceRecordId | null
  category_id: FinanceRecordId
  archived_at: string | null
  paused_at: string | null
  scheduled_end_date: string | null
  scheduled_end_mode: "pause" | "archive" | null
}

export type RecurringBillPaymentSource =
  { type: "bank_account" } | { type: "credit_card"; creditCardId: string }

export interface RecurringBillPaymentRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  recurring_bill_id: FinanceRecordId
  due_date: string
  amount_cents: number
  status: RecurringBillPaymentStatus
  transaction_id: FinanceRecordId | null
  paid_at: string
}

export interface CreditCardRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  nickname: string
  issuer: string
  network: string
  last_four: string
  expiration_month: number
  expiration_year: number
  credit_limit_cents: number
  closing_day_of_month: number
  payment_due_day_of_month: number
  theme_color: ThemeColor
  archived_at: string | null
  annuality_enabled: boolean
  annuality_amount_cents: number | null
  annuality_anniversary_month: number | null
  annuality_anniversary_day: number | null
  annuality_payment_count: number | null
}

export interface CreditCardAnnualityOverrideRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  credit_card_id: FinanceRecordId
  anniversary_year: number
  installment_index: number
  amount_cents: number
  created_at: string
  updated_at: string
}

export interface CreditCardStatementRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  credit_card_id: FinanceRecordId
  period_start: string
  period_end: string
  payment_due_date: string
  statement_amount_cents: number
  lifecycle_status: CreditCardStatementLifecycleStatus
  paid_at: string | null
}

export interface CreditCardPaymentRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  credit_card_id: FinanceRecordId
  statement_id: FinanceRecordId
  source_account_id: FinanceRecordId
  cashflow_transaction_id: FinanceRecordId
  amount_cents: number
  paid_at: string
}

export interface CashForecastSettingsRecord {
  user_id: FinanceUserId
  default_monthly_income_cents: number
  included_budget_category_ids: FinanceRecordId[]
  created_at: string
  updated_at: string
}

export interface CashForecastAdjustmentRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  kind: CashForecastAdjustmentKind
  name: string
  amount_cents: number
  start_period: string
  recurrence: CashForecastAdjustmentRecurrence
  created_at: string
  updated_at: string
}

export interface CashForecastExclusionRecord {
  id: FinanceRecordId
  user_id: FinanceUserId
  source_type: CashForecastExclusionSourceType
  source_key: string
  period: string
  created_at: string
}

export type NewBudgetRecord = Omit<BudgetRecord, "user_id">
export type NewPotRecord = Omit<PotRecord, "user_id">
export type NewCategoryRecord = Omit<CategoryRecord, "user_id">
export type NewCounterpartyRecord = Omit<
  CounterpartyRecord,
  "user_id" | "is_account_owner"
>
export type NewTransactionRecord = Omit<
  TransactionRecord,
  "user_id" | "created_at"
>
export type NewCreditCardRecord = Omit<CreditCardRecord, "user_id">
export type NewRecurringBillRecord = Omit<RecurringBillRecord, "user_id">

export type RecurringBillLifecycleField =
  "archived_at" | "paused_at" | "scheduled_end_date" | "scheduled_end_mode"

export type CreatableRecurringBillRecord = Omit<
  NewRecurringBillRecord,
  RecurringBillLifecycleField
>

export type UpdatableRecurringBillRecord = Omit<
  RecurringBillRecord,
  "id" | "user_id" | RecurringBillLifecycleField
>
export type NewCashForecastAdjustmentRecord = Omit<
  CashForecastAdjustmentRecord,
  "user_id" | "created_at" | "updated_at"
>

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
  recurringBillPayments: RecurringBillPaymentRecord[]
  creditCards: CreditCardRecord[]
  creditCardStatements: CreditCardStatementRecord[]
  creditCardPayments: CreditCardPaymentRecord[]
  creditCardAnnualityOverrides: CreditCardAnnualityOverrideRecord[]
  cashForecastSettings: CashForecastSettingsRecord | null
  cashForecastAdjustments: CashForecastAdjustmentRecord[]
  cashForecastExclusions: CashForecastExclusionRecord[]
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
  manualBillsDueReminder: RecurringBill[]
  totalBillsAmount: number
  creditCards: CreditCard[]
  creditCardSummary: CreditCardSummary[]
  totalCreditCardPendingBalance: number
}
