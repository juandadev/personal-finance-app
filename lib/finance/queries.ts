import "server-only"

import type { PoolClient } from "pg"

import { withFinanceTransaction } from "@/lib/db/transaction"
import {
  ANNUALITY_CONCEPT,
  annualityDescription,
  getPendingAnnualityInstallmentsForPeriod,
  parseAnnualityDescription,
} from "@/lib/finance/credit-card-annuality"
import { getCreditCardStatementCycle } from "@/lib/finance/credit-card-cycle"
import {
  getBillOccurrenceStatementCycle,
  getNextDueDateAfter,
  inactiveTimestampForCutoffDate,
  resolveRecurringBillOccurrences,
  type RecurringBillOccurrenceState,
} from "@/lib/finance/recurring-bill-schedule"
import {
  assertDateNotAfterLocalToday,
  getLocalIsoDate,
} from "@/lib/finance/local-date"
import {
  buildTransactionQueryParts,
  getTransactionPageBounds,
  transactionPageFromSql,
  transactionPageSelectSql,
  TRANSACTION_PAGE_SIZE,
  type TransactionFilterOption,
  type TransactionPageRow,
} from "@/lib/finance/transaction-page-query"
import type { TransactionFilters } from "@/lib/finance/url-filters/normalize"
import type {
  AccountRecord,
  AccountSummaryRecord,
  BudgetRecord,
  BudgetSummaryRecord,
  BudgetTransactionAssignmentRecord,
  CashForecastAdjustmentRecord,
  CashForecastExclusionRecord,
  CashForecastExclusionSourceType,
  CashForecastSettingsRecord,
  CategoryRecord,
  CounterpartyRecord,
  CreditCardAnnualityOverrideRecord,
  CreditCardPaymentRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  FinanceState,
  NewCategoryRecord,
  NewCashForecastAdjustmentRecord,
  NewCounterpartyRecord,
  NewCreditCardRecord,
  NewRecurringBillRecord,
  NewTransactionRecord,
  PotMovementRequest,
  PotRecord,
  RecurringBillPaymentRecord,
  RecurringBillPaymentSource,
  RecurringBillRecord,
  TransactionRecord,
  UserPreferencesRecord,
} from "@/lib/finance/types"
import { getCurrentPeriod } from "@/lib/finance/period"
import { parseUiPreferences } from "@/lib/finance/ui-preferences"
import { formatDisplayDate } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"

type ProfileRow = Omit<UserPreferencesRecord, "hideAmounts"> & {
  ui_preferences: unknown
}

const defaultCategorySeeds: {
  name: string
  slug: string
  theme_color: ThemeColor
}[] = [
  { name: "Entertainment", slug: "entertainment", theme_color: "chart-1" },
  { name: "Bills", slug: "bills", theme_color: "chart-2" },
  { name: "Groceries", slug: "groceries", theme_color: "chart-3" },
  { name: "Dining Out", slug: "dining-out", theme_color: "chart-4" },
  { name: "Transportation", slug: "transportation", theme_color: "chart-5" },
  {
    name: "Personal Care",
    slug: "personal-care",
    theme_color: "finance-purple",
  },
  {
    name: "Emergency Fund",
    slug: "emergency-fund",
    theme_color: "finance-turquoise",
  },
  { name: "Education", slug: "education", theme_color: "finance-brown" },
  { name: "Lifestyle", slug: "lifestyle", theme_color: "finance-magenta" },
  { name: "Shopping", slug: "shopping", theme_color: "finance-blue" },
  { name: "General", slug: "general", theme_color: "finance-grey" },
]

const profileColumns = [
  "user_id",
  "default_currency",
  "timezone",
  "ui_preferences",
]
const accountColumns = [
  "user_id",
  "id",
  "name",
  "type",
  "currency",
  "current_balance_cents",
  "is_primary",
]
const accountSummaryColumns = [
  "user_id",
  "id",
  "account_id",
  "period",
  "income_cents",
  "expense_cents",
]
const counterpartyColumns = [
  "user_id",
  "id",
  "display_name",
  "avatar_url",
  "type",
  "theme_color",
  "notes",
  "is_account_owner",
]
const categoryColumns = ["user_id", "id", "name", "slug", "theme_color"]
const budgetColumns = [
  "user_id",
  "id",
  "category_id",
  "period",
  "limit_cents",
  "monthly_voucher_coverage_cents",
  "theme_color",
]
const transactionSelectColumns = [
  "user_id",
  "id",
  "account_id",
  "counterparty_id",
  "category_id",
  "concept",
  "amount_cents",
  "is_voucher_expense",
  "payment_method",
  "credit_card_id",
  "credit_card_statement_id",
  "posted_at::text AS posted_at",
  "description",
  "created_at::text AS created_at",
]
const budgetSummaryColumns = ["user_id", "budget_id", "spent_cents"]
const budgetAssignmentColumns = [
  "user_id",
  "id",
  "budget_id",
  "transaction_id",
  "assigned_amount_cents",
]
const potColumns = [
  "user_id",
  "id",
  "name",
  "balance_cents",
  "target_cents",
  "theme_color",
  "due_date::text AS due_date",
]
const recurringBillColumns = [
  "user_id",
  "id",
  "counterparty_id",
  "concept",
  "amount_cents",
  "currency",
  "frequency",
  "first_due_date::text AS first_due_date",
  "total_payments",
  "credit_card_id",
  "category_id",
  "archived_at::text AS archived_at",
  "paused_at::text AS paused_at",
  "scheduled_end_date::text AS scheduled_end_date",
  "scheduled_end_mode",
]
const recurringBillPaymentColumns = [
  "user_id",
  "id",
  "recurring_bill_id",
  "due_date::text AS due_date",
  "amount_cents",
  "status",
  "transaction_id",
  "paid_at::text AS paid_at",
]
const creditCardColumns = [
  "user_id",
  "id",
  "nickname",
  "issuer",
  "network",
  "last_four",
  "expiration_month",
  "expiration_year",
  "credit_limit_cents",
  "closing_day_of_month",
  "payment_due_day_of_month",
  "theme_color",
  "archived_at::text AS archived_at",
  "annuality_enabled",
  "annuality_amount_cents",
  "annuality_anniversary_month",
  "annuality_anniversary_day",
  "annuality_payment_count",
]
const creditCardAnnualityOverrideColumns = [
  "user_id",
  "id",
  "credit_card_id",
  "anniversary_year",
  "installment_index",
  "amount_cents",
  "created_at::text AS created_at",
  "updated_at::text AS updated_at",
]
const creditCardStatementColumns = [
  "user_id",
  "id",
  "credit_card_id",
  "period_start::text AS period_start",
  "period_end::text AS period_end",
  "payment_due_date::text AS payment_due_date",
  "statement_amount_cents",
  "lifecycle_status",
  "paid_at::text AS paid_at",
]
const creditCardPaymentColumns = [
  "user_id",
  "id",
  "credit_card_id",
  "statement_id",
  "source_account_id",
  "cashflow_transaction_id",
  "amount_cents",
  "paid_at::text AS paid_at",
]
const cashForecastSettingsColumns = [
  "user_id",
  "default_monthly_income_cents",
  "included_budget_category_ids",
  "created_at::text AS created_at",
  "updated_at::text AS updated_at",
]
const cashForecastAdjustmentColumns = [
  "user_id",
  "id",
  "kind",
  "name",
  "amount_cents",
  "start_period",
  "recurrence",
  "created_at::text AS created_at",
  "updated_at::text AS updated_at",
]
const cashForecastExclusionColumns = [
  "user_id",
  "id",
  "source_type",
  "source_key",
  "period",
  "created_at::text AS created_at",
]

/**
 * The shell receives one budget/current period of ordinary transaction rows.
 * Rows attached to unpaid card statements and annuality rows from the active
 * year window are included because app-wide card and forecast calculations
 * need them. Complete transaction history is only queried by page-scoped data
 * access.
 */
export const SHELL_TRANSACTION_WINDOW_PERIODS = 1
export const SHELL_ANNUALITY_LOOKBACK_YEARS = 1

async function ensureUserProfile(
  client: PoolClient,
  userId: string,
  displayName: string | null,
) {
  await client.query(
    `
      INSERT INTO profiles (user_id, display_name)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET display_name = COALESCE(excluded.display_name, profiles.display_name)
    `,
    [userId, displayName],
  )
}

async function ensureDefaultCategories(client: PoolClient, userId: string) {
  const existing = await client.query(
    "SELECT 1 FROM categories WHERE user_id = $1 LIMIT 1",
    [userId],
  )

  if (existing.rowCount) {
    return
  }

  for (const category of defaultCategorySeeds) {
    await client.query(
      `
        INSERT INTO categories (user_id, name, slug, theme_color)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
      [userId, category.name, category.slug, category.theme_color],
    )
  }
}

async function ensureOwnerContact(client: PoolClient, userId: string) {
  const existing = await client.query(
    `
      SELECT 1
      FROM counterparties
      WHERE user_id = $1
        AND is_account_owner
      LIMIT 1
    `,
    [userId],
  )

  if (existing.rowCount) {
    return
  }

  await client.query(
    `
      INSERT INTO counterparties (
        user_id,
        display_name,
        avatar_url,
        type,
        theme_color,
        notes,
        is_account_owner
      )
      VALUES ($1, 'Juan Martinez', null, 'person', 'finance-grey', 'Account owner', true)
      ON CONFLICT (user_id, lower(display_name))
      DO UPDATE SET is_account_owner = true
    `,
    [userId],
  )
}

function toPeriod(isoDate: string) {
  return isoDate.slice(0, 7)
}

async function getUserProfileTimezone(client: PoolClient, userId: string) {
  const result = await client.query<Pick<UserPreferencesRecord, "timezone">>(
    "SELECT timezone FROM profiles WHERE user_id = $1",
    [userId],
  )

  if (!result.rowCount) {
    throw new Error("Your profile is not ready yet. Refresh and try again.")
  }

  return result.rows[0].timezone
}

async function getUserLocalToday(client: PoolClient, userId: string) {
  const timezone = await getUserProfileTimezone(client, userId)

  return getLocalIsoDate(new Date(), timezone)
}

async function assertDateNotAfterUserLocalToday(
  client: PoolClient,
  userId: string,
  isoDate: string,
) {
  const timezone = await getUserProfileTimezone(client, userId)

  return assertDateNotAfterLocalToday(isoDate, timezone)
}

async function assertOneTimeScheduledCharge(
  client: PoolClient,
  userId: string,
  bill: Pick<
    RecurringBillRecord,
    "credit_card_id" | "first_due_date" | "frequency" | "total_payments"
  >,
  requireFutureDate: boolean,
) {
  if (bill.frequency !== "one_time") {
    return
  }

  if (!bill.credit_card_id) {
    throw new Error("Choose a credit card for a scheduled charge.")
  }

  if (bill.total_payments !== 1) {
    throw new Error("A scheduled charge must have exactly one payment.")
  }

  if (requireFutureDate) {
    const localToday = await getUserLocalToday(client, userId)

    if (bill.first_due_date <= localToday) {
      throw new Error("Choose a future charge date.")
    }
  }

  await getCreditCard(client, userId, bill.credit_card_id)
}

export async function loadFinanceShellState(
  userId: string,
  displayName: string | null,
): Promise<FinanceState> {
  return withFinanceTransaction(userId, async (client) => {
    await ensureUserProfile(client, userId, displayName)
    await ensureDefaultCategories(client, userId)
    await ensureOwnerContact(client, userId)
    const currentPeriod = getCurrentPeriod()
    const shellPeriodStart = `${currentPeriod}-01`
    const shellAnnualityStart = `${Number(currentPeriod.slice(0, 4)) - SHELL_ANNUALITY_LOOKBACK_YEARS}-01-01`

    const profile = await client.query<ProfileRow>(
      `SELECT ${profileColumns.join(", ")} FROM profiles WHERE user_id = $1`,
      [userId],
    )
    const profileRow = profile.rows[0]
    const uiPreferences = parseUiPreferences(profileRow.ui_preferences)
    const preferences: UserPreferencesRecord = {
      user_id: profileRow.user_id,
      default_currency: profileRow.default_currency,
      timezone: profileRow.timezone,
      hideAmounts: uiPreferences.hideAmounts,
    }
    const accounts = await client.query<AccountRecord>(
      `SELECT ${accountColumns.join(", ")} FROM accounts WHERE user_id = $1 ORDER BY id`,
      [userId],
    )
    const accountSummaries = await client.query<AccountSummaryRecord>(
      `SELECT ${accountSummaryColumns.join(", ")} FROM account_summaries WHERE user_id = $1 AND period = $2 ORDER BY id`,
      [userId, currentPeriod],
    )
    const categories = await client.query<CategoryRecord>(
      `SELECT ${categoryColumns.join(", ")} FROM categories WHERE user_id = $1 ORDER BY name, id`,
      [userId],
    )
    const counterparties = await client.query<CounterpartyRecord>(
      `SELECT ${counterpartyColumns.join(", ")} FROM counterparties WHERE user_id = $1 ORDER BY display_name, id`,
      [userId],
    )
    const transactions = await client.query<TransactionRecord>(
      `
        SELECT ${transactionSelectColumns.map((column) => `t.${column}`).join(", ")}
        FROM transactions t
        WHERE t.user_id = $1
          AND (
            t.posted_at >= $2::date
            OR (
              t.payment_method = 'credit_card'
              AND t.concept = $3
              AND t.posted_at >= $4::date
            )
            OR EXISTS (
              SELECT 1
              FROM credit_card_statements statement
              WHERE statement.user_id = t.user_id
                AND statement.id = t.credit_card_statement_id
                AND statement.lifecycle_status <> 'paid'
            )
          )
        ORDER BY t.posted_at DESC, t.created_at DESC, t.id
      `,
      [userId, shellPeriodStart, ANNUALITY_CONCEPT, shellAnnualityStart],
    )
    const budgets = await client.query<BudgetRecord>(
      `SELECT ${budgetColumns.join(", ")} FROM budgets WHERE user_id = $1 AND period = $2 ORDER BY id`,
      [userId, currentPeriod],
    )
    const budgetSummaries = await client.query<BudgetSummaryRecord>(
      `SELECT ${budgetSummaryColumns.join(", ")} FROM budget_summaries WHERE user_id = $1 ORDER BY budget_id`,
      [userId],
    )
    const budgetTransactionAssignments =
      await client.query<BudgetTransactionAssignmentRecord>(
        `
          SELECT ${budgetAssignmentColumns.map((column) => `bta.${column}`).join(", ")}
          FROM budget_transaction_assignments bta
          JOIN budgets b
            ON b.user_id = bta.user_id
            AND b.id = bta.budget_id
          WHERE bta.user_id = $1
            AND b.period = $2
          ORDER BY bta.created_at, bta.id
        `,
        [userId, currentPeriod],
      )
    const pots = await client.query<PotRecord>(
      `SELECT ${potColumns.join(", ")} FROM pots WHERE user_id = $1 ORDER BY created_at, id`,
      [userId],
    )
    const recurringBills = await client.query<RecurringBillRecord>(
      `SELECT ${recurringBillColumns.join(", ")} FROM recurring_bills WHERE user_id = $1 ORDER BY first_due_date, id`,
      [userId],
    )
    const recurringBillPayments =
      await client.query<RecurringBillPaymentRecord>(
        `SELECT ${recurringBillPaymentColumns.join(", ")} FROM recurring_bill_payments WHERE user_id = $1 ORDER BY due_date, id`,
        [userId],
      )
    const creditCards = await client.query<CreditCardRecord>(
      `SELECT ${creditCardColumns.join(", ")} FROM credit_cards WHERE user_id = $1 ORDER BY archived_at NULLS FIRST, created_at, id`,
      [userId],
    )
    const creditCardStatements = await client.query<CreditCardStatementRecord>(
      `SELECT ${creditCardStatementColumns.join(", ")} FROM credit_card_statements WHERE user_id = $1 ORDER BY payment_due_date DESC, id`,
      [userId],
    )
    const creditCardPayments = await client.query<CreditCardPaymentRecord>(
      `SELECT ${creditCardPaymentColumns.join(", ")} FROM credit_card_payments WHERE user_id = $1 ORDER BY paid_at DESC, id`,
      [userId],
    )
    const creditCardAnnualityOverrides =
      await client.query<CreditCardAnnualityOverrideRecord>(
        `SELECT ${creditCardAnnualityOverrideColumns.join(", ")} FROM credit_card_annuality_overrides WHERE user_id = $1 ORDER BY anniversary_year, installment_index, id`,
        [userId],
      )
    const cashForecastSettings = await client.query<CashForecastSettingsRecord>(
      `SELECT ${cashForecastSettingsColumns.join(", ")} FROM cash_forecast_settings WHERE user_id = $1`,
      [userId],
    )
    const cashForecastAdjustments =
      await client.query<CashForecastAdjustmentRecord>(
        `SELECT ${cashForecastAdjustmentColumns.join(", ")} FROM cash_forecast_adjustments WHERE user_id = $1 ORDER BY created_at, id`,
        [userId],
      )
    const cashForecastExclusions =
      await client.query<CashForecastExclusionRecord>(
        `SELECT ${cashForecastExclusionColumns.join(", ")} FROM cash_forecast_exclusions WHERE user_id = $1 ORDER BY period, source_type, source_key, id`,
        [userId],
      )
    const localToday = await getUserLocalToday(client, userId)
    const timezone = await getUserProfileTimezone(client, userId)
    const materializedRecurringBills =
      await materializeScheduledRecurringBillEnds(
        client,
        userId,
        recurringBills.rows,
        localToday,
        timezone,
      )

    return {
      preferences,
      accounts: accounts.rows,
      accountSummaries: accountSummaries.rows,
      categories: categories.rows,
      counterparties: counterparties.rows,
      transactions: transactions.rows,
      budgets: budgets.rows,
      budgetSummaries: budgetSummaries.rows,
      budgetTransactionAssignments: budgetTransactionAssignments.rows,
      pots: pots.rows,
      recurringBills: materializedRecurringBills,
      recurringBillPayments: recurringBillPayments.rows,
      creditCards: creditCards.rows,
      creditCardStatements: creditCardStatements.rows,
      creditCardPayments: creditCardPayments.rows,
      creditCardAnnualityOverrides: creditCardAnnualityOverrides.rows,
      cashForecastSettings: cashForecastSettings.rows[0] ?? null,
      cashForecastAdjustments: cashForecastAdjustments.rows,
      cashForecastExclusions: cashForecastExclusions.rows,
    }
  })
}

function getTransactionInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}

function getTransactionPaymentMethodLabel(row: TransactionPageRow) {
  switch (row.payment_method) {
    case "bank_account":
      return "Bank Account"
    case "credit_card":
      return row.credit_card_nickname && row.credit_card_last_four
        ? `${row.credit_card_nickname} •••• ${row.credit_card_last_four}`
        : "Credit Card"
    case "credit_card_payment":
      return row.credit_card_nickname
        ? `${row.credit_card_nickname} Payment`
        : "Card Payment"
    case "voucher":
      return "Voucher"
  }
}

function toTransactionView(row: TransactionPageRow): Transaction {
  return {
    id: row.id,
    name: row.counterparty_name,
    avatarUrl: row.counterparty_avatar_url ?? "",
    contactColor: row.counterparty_theme_color,
    contactInitials: getTransactionInitials(row.counterparty_name),
    amount: row.amount_cents / 100,
    accountId: row.account_id,
    counterpartyId: row.counterparty_id,
    categoryId: row.category_id,
    concept: row.concept,
    date: formatDisplayDate(row.posted_at),
    postedAt: row.posted_at,
    createdAt: row.created_at,
    isVoucherExpense: row.is_voucher_expense,
    paymentMethod: row.payment_method,
    creditCardId: row.credit_card_id ?? undefined,
    creditCardStatementId: row.credit_card_statement_id ?? undefined,
    paymentMethodLabel: getTransactionPaymentMethodLabel(row),
    category: row.category_name,
    description: row.description ?? undefined,
    budgetId: row.budget_id ?? undefined,
    budgetCategory: row.budget_category_name ?? undefined,
  }
}

export type TransactionPageData = {
  transactions: Transaction[]
  totalCount: number
  totalTransactionCount: number
  pagination: ReturnType<typeof getTransactionPageBounds>
  categoryOptions: TransactionFilterOption[]
}

export async function loadTransactionPage(
  userId: string,
  filters: TransactionFilters,
): Promise<TransactionPageData> {
  return withFinanceTransaction(userId, async (client) => {
    const query = buildTransactionQueryParts(userId, filters)
    const countResult = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        ${transactionPageFromSql}
        ${query.whereSql}
      `,
      query.values,
    )
    const totalCount = Number(countResult.rows[0]?.count ?? 0)
    const pagination = getTransactionPageBounds(
      totalCount,
      filters.page,
      TRANSACTION_PAGE_SIZE,
    )
    const limitParameter = `$${query.values.length + 1}`
    const offsetParameter = `$${query.values.length + 2}`

    const pageResult = await client.query<TransactionPageRow>(
      `
          ${transactionPageSelectSql}
          ${transactionPageFromSql}
          ${query.whereSql}
          ${query.orderBySql}
          LIMIT ${limitParameter}
          OFFSET ${offsetParameter}
        `,
      [...query.values, pagination.pageSize, pagination.offset],
    )
    const totalResult = await client.query<{ count: string }>(
      "SELECT count(*) AS count FROM transactions WHERE user_id = $1",
      [userId],
    )
    const categoriesResult = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM categories WHERE user_id = $1 ORDER BY name, id",
      [userId],
    )

    return {
      transactions: pageResult.rows.map(toTransactionView),
      totalCount,
      totalTransactionCount: Number(totalResult.rows[0]?.count ?? 0),
      pagination,
      categoryOptions: categoriesResult.rows.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    }
  })
}

export async function loadLatestTransactions(
  userId: string,
  limit: number,
): Promise<Transaction[]> {
  const safeLimit = Math.max(0, Math.min(10, Math.floor(limit)))

  if (safeLimit === 0) {
    return []
  }

  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<TransactionPageRow>(
      `
        ${transactionPageSelectSql}
        ${transactionPageFromSql}
        WHERE t.user_id = $1
        ORDER BY t.posted_at DESC, t.created_at DESC, t.id
        LIMIT $2
      `,
      [userId, safeLimit],
    )

    return result.rows.map(toTransactionView)
  })
}

async function assertUserRecord(
  client: PoolClient,
  table: "accounts" | "categories" | "counterparties",
  userId: string,
  id: string,
  label: string,
) {
  const result = await client.query(
    `SELECT 1 FROM ${table} WHERE user_id = $1 AND id = $2 LIMIT 1`,
    [userId, id],
  )

  if (!result.rowCount) {
    throw new Error(`${label} not found.`)
  }
}

async function applyTransactionEffects(
  client: PoolClient,
  userId: string,
  transaction: Pick<
    TransactionRecord,
    "account_id" | "amount_cents" | "posted_at"
  >,
  direction: 1 | -1,
) {
  const balanceDelta = transaction.amount_cents * direction
  const period = toPeriod(transaction.posted_at)

  const account = await applyAccountBalanceEffect(
    client,
    userId,
    transaction.account_id,
    balanceDelta,
  )
  const accountSummary = await applyAccountSummaryEffect(
    client,
    userId,
    transaction,
    period,
    direction,
  )

  return {
    account,
    accountSummary,
  }
}

async function applyAccountBalanceEffect(
  client: PoolClient,
  userId: string,
  accountId: string,
  balanceDelta: number,
) {
  const accountResult = await client.query<AccountRecord>(
    `
      UPDATE accounts
      SET current_balance_cents = current_balance_cents + $3
      WHERE user_id = $1 AND id = $2
      RETURNING ${accountColumns.join(", ")}
    `,
    [userId, accountId, balanceDelta],
  )

  if (!accountResult.rowCount) {
    throw new Error("Account not found.")
  }

  return accountResult.rows[0]
}

async function applyAccountSummaryEffect(
  client: PoolClient,
  userId: string,
  transaction: Pick<
    TransactionRecord,
    "account_id" | "amount_cents" | "posted_at"
  >,
  period: string,
  direction: 1 | -1,
) {
  const incomeDelta =
    transaction.amount_cents > 0 ? transaction.amount_cents * direction : 0
  const expenseDelta =
    transaction.amount_cents < 0
      ? Math.abs(transaction.amount_cents) * direction
      : 0

  const summaryResult = await client.query<AccountSummaryRecord>(
    `
      INSERT INTO account_summaries (
        user_id,
        account_id,
        period,
        income_cents,
        expense_cents
      )
      VALUES ($1, $2, $3, GREATEST($4::integer, 0), GREATEST($5::integer, 0))
      ON CONFLICT (user_id, account_id, period)
      DO UPDATE SET
        income_cents = account_summaries.income_cents + $4,
        expense_cents = account_summaries.expense_cents + $5
      RETURNING ${accountSummaryColumns.join(", ")}
    `,
    [userId, transaction.account_id, period, incomeDelta, expenseDelta],
  )

  return summaryResult.rows[0]
}

async function applyAccountEffectsIfNeeded(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  direction: 1 | -1,
) {
  switch (transaction.payment_method) {
    case "voucher":
      return null
    case "credit_card": {
      return {
        account: null,
        accountSummary: await applyAccountSummaryEffect(
          client,
          userId,
          transaction,
          toPeriod(transaction.posted_at),
          direction,
        ),
      }
    }
    case "credit_card_payment":
      return {
        account: await applyAccountBalanceEffect(
          client,
          userId,
          transaction.account_id,
          transaction.amount_cents * direction,
        ),
        accountSummary: null,
      }
    case "bank_account":
      return applyTransactionEffects(client, userId, transaction, direction)
  }
}

async function syncBudgetAssignment(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  budgetId: string | null,
) {
  if (transaction.amount_cents >= 0 || !budgetId) {
    await client.query(
      "DELETE FROM budget_transaction_assignments WHERE user_id = $1 AND transaction_id = $2",
      [userId, transaction.id],
    )
    return null
  }

  const result = await client.query<BudgetTransactionAssignmentRecord>(
    `
      WITH eligible_assignment AS (
        SELECT
          t.user_id,
          b.id AS budget_id,
          t.id AS transaction_id,
          abs(t.amount_cents) AS assigned_amount_cents
        FROM transactions t
        JOIN budgets b
          ON b.user_id = t.user_id
          AND b.id = $3
          AND b.period = $4
        WHERE t.user_id = $1
          AND t.id = $2
          AND t.amount_cents < 0
          AND to_char(t.posted_at, 'YYYY-MM') = b.period
      )
      INSERT INTO budget_transaction_assignments (
        user_id,
        budget_id,
        transaction_id,
        assigned_amount_cents
      )
      SELECT
        user_id,
        budget_id,
        transaction_id,
        assigned_amount_cents
      FROM eligible_assignment
      ON CONFLICT (user_id, transaction_id)
      DO UPDATE SET
        budget_id = excluded.budget_id,
        assigned_amount_cents = excluded.assigned_amount_cents
      RETURNING user_id, id, budget_id, transaction_id, assigned_amount_cents
    `,
    [userId, transaction.id, budgetId, getCurrentPeriod()],
  )

  if (!result.rowCount) {
    throw new Error(
      "Choose a current-month budget for this expense transaction.",
    )
  }

  return result.rows[0]
}

async function getCreditCard(
  client: PoolClient,
  userId: string,
  creditCardId: string,
) {
  const result = await client.query<CreditCardRecord>(
    `
      SELECT ${creditCardColumns.join(", ")}
      FROM credit_cards
      WHERE user_id = $1 AND id = $2
    `,
    [userId, creditCardId],
  )

  if (!result.rowCount) {
    throw new Error("Credit card not found.")
  }

  const card = result.rows[0]

  if (card.archived_at) {
    throw new Error("This credit card is archived.")
  }

  return card
}

async function ensureOpenCreditCardStatement(
  client: PoolClient,
  userId: string,
  card: CreditCardRecord,
  postedAt: string,
) {
  const cycle = getCreditCardStatementCycle(postedAt, card)
  const result = await client.query<CreditCardStatementRecord>(
    `
      INSERT INTO credit_card_statements (
        user_id,
        credit_card_id,
        period_start,
        period_end,
        payment_due_date,
        lifecycle_status
      )
      VALUES ($1, $2, $3, $4, $5, 'open')
      ON CONFLICT (user_id, credit_card_id, period_start, period_end)
      DO UPDATE SET payment_due_date = excluded.payment_due_date
      RETURNING ${creditCardStatementColumns.join(", ")}
    `,
    [userId, card.id, cycle.periodStart, cycle.periodEnd, cycle.paymentDueDate],
  )
  const statement = result.rows[0]

  if (statement.lifecycle_status === "paid") {
    throw new Error(
      "This purchase belongs to a paid card statement. Create an adjustment in the current statement instead.",
    )
  }

  return statement
}

async function prepareTransactionPaymentMethod(
  client: PoolClient,
  userId: string,
  transaction: NewTransactionRecord,
): Promise<NewTransactionRecord> {
  const paymentMethod =
    transaction.is_voucher_expense &&
    transaction.payment_method === "bank_account"
      ? "voucher"
      : transaction.payment_method

  switch (paymentMethod) {
    case "bank_account":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
        credit_card_id: null,
        credit_card_statement_id: null,
      }
    case "voucher":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: true,
        credit_card_id: null,
        credit_card_statement_id: null,
      }
    case "credit_card": {
      if (!transaction.credit_card_id) {
        throw new Error("Choose a credit card for this transaction.")
      }

      if (transaction.amount_cents >= 0) {
        throw new Error("Credit card purchases can only be expenses.")
      }

      const card = await getCreditCard(
        client,
        userId,
        transaction.credit_card_id,
      )
      const statement = await ensureOpenCreditCardStatement(
        client,
        userId,
        card,
        transaction.posted_at,
      )

      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
        credit_card_id: card.id,
        credit_card_statement_id: statement.id,
      }
    }
    case "credit_card_payment":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
      }
  }
}

async function insertTransactionRecord(
  client: PoolClient,
  userId: string,
  transaction: NewTransactionRecord,
) {
  const result = await client.query<TransactionRecord>(
    `
      INSERT INTO transactions (
        user_id,
        id,
        account_id,
        counterparty_id,
        category_id,
        concept,
        amount_cents,
        is_voucher_expense,
        payment_method,
        credit_card_id,
        credit_card_statement_id,
        posted_at,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING ${transactionSelectColumns.join(", ")}
    `,
    [
      userId,
      transaction.id,
      transaction.account_id,
      transaction.counterparty_id,
      transaction.category_id,
      transaction.concept,
      transaction.amount_cents,
      transaction.is_voucher_expense,
      transaction.payment_method,
      transaction.credit_card_id,
      transaction.credit_card_statement_id,
      transaction.posted_at,
      transaction.description,
    ],
  )

  return result.rows[0]
}

async function getPrimaryPaymentAccount(client: PoolClient, userId: string) {
  const accountResult = await client.query<AccountRecord>(
    `
      SELECT ${accountColumns.join(", ")}
      FROM accounts
      WHERE user_id = $1 AND type IN ('checking', 'savings')
      ORDER BY id
      LIMIT 1
    `,
    [userId],
  )

  if (!accountResult.rowCount) {
    throw new Error("Your payment account is not ready yet.")
  }

  return accountResult.rows[0]
}

async function applyCreditCardStatementEffectIfNeeded(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  direction: 1 | -1,
) {
  if (transaction.payment_method !== "credit_card") {
    return null
  }

  if (!transaction.credit_card_statement_id) {
    throw new Error("Credit card statement not found.")
  }

  const result = await client.query<CreditCardStatementRecord>(
    `
      UPDATE credit_card_statements
      SET statement_amount_cents = statement_amount_cents + $3
      WHERE user_id = $1
        AND id = $2
        AND lifecycle_status <> 'paid'
      RETURNING ${creditCardStatementColumns.join(", ")}
    `,
    [
      userId,
      transaction.credit_card_statement_id,
      Math.abs(transaction.amount_cents) * direction,
    ],
  )

  if (!result.rowCount) {
    throw new Error(
      "This purchase belongs to a paid card statement. Create an adjustment in the current statement instead.",
    )
  }

  return result.rows[0]
}

export async function insertCategory(
  userId: string,
  category: NewCategoryRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CategoryRecord>(
      `
        INSERT INTO categories (user_id, id, name, slug, theme_color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${categoryColumns.join(", ")}
      `,
      [userId, category.id, category.name, category.slug, category.theme_color],
    )

    return result.rows[0]
  })
}

export async function updateCategory(
  userId: string,
  id: string,
  updates: Partial<Omit<CategoryRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CategoryRecord>(
      `
        UPDATE categories
        SET
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          theme_color = COALESCE($4, theme_color)
        WHERE user_id = $1 AND id = $5
        RETURNING ${categoryColumns.join(", ")}
      `,
      [
        userId,
        updates.name ?? null,
        updates.slug ?? null,
        updates.theme_color ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Category not found.")
    }

    return result.rows[0]
  })
}

export async function deleteCategory(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const usage = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM (
          SELECT id FROM transactions WHERE user_id = $1 AND category_id = $2
          UNION ALL
          SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2
        ) used_category
      `,
      [userId, id],
    )

    if (Number(usage.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        "This category is used by transactions or budgets and cannot be deleted.",
      )
    }

    const result = await client.query(
      "DELETE FROM categories WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Category not found.")
    }
  })
}

export async function insertCounterparty(
  userId: string,
  counterparty: NewCounterpartyRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CounterpartyRecord>(
      `
        INSERT INTO counterparties (
          user_id,
          id,
          display_name,
          avatar_url,
          type,
          theme_color,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${counterpartyColumns.join(", ")}
      `,
      [
        userId,
        counterparty.id,
        counterparty.display_name,
        counterparty.avatar_url,
        counterparty.type,
        counterparty.theme_color,
        counterparty.notes,
      ],
    )

    return result.rows[0]
  })
}

export async function updateCounterparty(
  userId: string,
  id: string,
  updates: Partial<Omit<CounterpartyRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CounterpartyRecord>(
      `
        UPDATE counterparties
        SET
          display_name = COALESCE($2, display_name),
          avatar_url = CASE WHEN $3::boolean THEN $4 ELSE avatar_url END,
          type = COALESCE($5, type),
          theme_color = COALESCE($6, theme_color),
          notes = CASE WHEN $7::boolean THEN $8 ELSE notes END
        WHERE user_id = $1 AND id = $9
        RETURNING ${counterpartyColumns.join(", ")}
      `,
      [
        userId,
        updates.display_name ?? null,
        updates.avatar_url !== undefined,
        updates.avatar_url ?? null,
        updates.type ?? null,
        updates.theme_color ?? null,
        updates.notes !== undefined,
        updates.notes ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Contact not found.")
    }

    return result.rows[0]
  })
}

export async function deleteCounterparty(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const usage = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM (
          SELECT id FROM transactions WHERE user_id = $1 AND counterparty_id = $2
          UNION ALL
          SELECT id FROM recurring_bills WHERE user_id = $1 AND counterparty_id = $2
        ) used_counterparty
      `,
      [userId, id],
    )

    if (Number(usage.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        "This contact is used by transactions or recurring bills and cannot be deleted.",
      )
    }

    const result = await client.query(
      "DELETE FROM counterparties WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Contact not found.")
    }
  })
}

export async function insertTransaction(
  userId: string,
  transaction: NewTransactionRecord,
  budgetId: string | null,
) {
  return withFinanceTransaction(userId, async (client) => {
    await assertDateNotAfterUserLocalToday(
      client,
      userId,
      transaction.posted_at,
    )
    const preparedTransaction = await prepareTransactionPaymentMethod(
      client,
      userId,
      transaction,
    )
    await assertUserRecord(
      client,
      "accounts",
      userId,
      preparedTransaction.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      preparedTransaction.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      preparedTransaction.counterparty_id,
      "Contact",
    )

    const transactionResult = await client.query<TransactionRecord>(
      `
        INSERT INTO transactions (
          user_id,
          id,
          account_id,
          counterparty_id,
          category_id,
          concept,
          amount_cents,
          is_voucher_expense,
          payment_method,
          credit_card_id,
          credit_card_statement_id,
          posted_at,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        preparedTransaction.id,
        preparedTransaction.account_id,
        preparedTransaction.counterparty_id,
        preparedTransaction.category_id,
        preparedTransaction.concept,
        preparedTransaction.amount_cents,
        preparedTransaction.is_voucher_expense,
        preparedTransaction.payment_method,
        preparedTransaction.credit_card_id,
        preparedTransaction.credit_card_statement_id,
        preparedTransaction.posted_at,
        preparedTransaction.description,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const creditCardStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const budgetAssignment = await syncBudgetAssignment(
      client,
      userId,
      savedTransaction,
      budgetId,
    )

    return {
      transaction: savedTransaction,
      accounts: effects?.account ? [effects.account] : [],
      accountSummaries: effects?.accountSummary ? [effects.accountSummary] : [],
      creditCardStatements: creditCardStatement ? [creditCardStatement] : [],
      budgetAssignment,
    }
  })
}

export async function updateTransaction(
  userId: string,
  id: string,
  updates: Omit<NewTransactionRecord, "id">,
  budgetId: string | null,
) {
  return withFinanceTransaction(userId, async (client) => {
    await assertDateNotAfterUserLocalToday(client, userId, updates.posted_at)
    const existingResult = await client.query<TransactionRecord>(
      `
        SELECT ${transactionSelectColumns.join(", ")}
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    const preparedUpdates = await prepareTransactionPaymentMethod(
      client,
      userId,
      { id, ...updates },
    )
    await assertUserRecord(
      client,
      "accounts",
      userId,
      preparedUpdates.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      preparedUpdates.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      preparedUpdates.counterparty_id,
      "Contact",
    )

    const reversedEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const reversedStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const transactionResult = await client.query<TransactionRecord>(
      `
        UPDATE transactions
        SET
          account_id = $2,
          counterparty_id = $3,
          category_id = $4,
          concept = $5,
          amount_cents = $6,
          is_voucher_expense = $7,
          payment_method = $8,
          credit_card_id = $9,
          credit_card_statement_id = $10,
          posted_at = $11,
          description = $12
        WHERE user_id = $1 AND id = $13
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        preparedUpdates.account_id,
        preparedUpdates.counterparty_id,
        preparedUpdates.category_id,
        preparedUpdates.concept,
        preparedUpdates.amount_cents,
        preparedUpdates.is_voucher_expense,
        preparedUpdates.payment_method,
        preparedUpdates.credit_card_id,
        preparedUpdates.credit_card_statement_id,
        preparedUpdates.posted_at,
        preparedUpdates.description,
        id,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const appliedEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const appliedStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const budgetAssignment = await syncBudgetAssignment(
      client,
      userId,
      savedTransaction,
      budgetId,
    )

    return {
      transaction: savedTransaction,
      accounts: [
        ...(reversedEffects?.account ? [reversedEffects.account] : []),
        ...(appliedEffects?.account ? [appliedEffects.account] : []),
      ],
      accountSummaries: [
        ...(reversedEffects?.accountSummary
          ? [reversedEffects.accountSummary]
          : []),
        ...(appliedEffects?.accountSummary
          ? [appliedEffects.accountSummary]
          : []),
      ],
      creditCardStatements: [
        ...(reversedStatement ? [reversedStatement] : []),
        ...(appliedStatement ? [appliedStatement] : []),
      ],
      budgetAssignment,
    }
  })
}

export async function deleteTransaction(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const existingResult = await client.query<TransactionRecord>(
      `
        SELECT ${transactionSelectColumns.join(", ")}
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const creditCardStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )

    await client.query(
      "DELETE FROM budget_transaction_assignments WHERE user_id = $1 AND transaction_id = $2",
      [userId, id],
    )

    await client.query(
      "DELETE FROM transactions WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    return {
      id,
      accounts: effects?.account ? [effects.account] : [],
      accountSummaries: effects?.accountSummary ? [effects.accountSummary] : [],
      creditCardStatements: creditCardStatement ? [creditCardStatement] : [],
    }
  })
}

export async function insertCreditCard(
  userId: string,
  creditCard: NewCreditCardRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CreditCardRecord>(
      `
        INSERT INTO credit_cards (
          user_id,
          id,
          nickname,
          issuer,
          network,
          last_four,
          expiration_month,
          expiration_year,
          credit_limit_cents,
          closing_day_of_month,
          payment_due_day_of_month,
          theme_color,
          archived_at,
          annuality_enabled,
          annuality_amount_cents,
          annuality_anniversary_month,
          annuality_anniversary_day,
          annuality_payment_count
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18
        )
        RETURNING ${creditCardColumns.join(", ")}
      `,
      [
        userId,
        creditCard.id,
        creditCard.nickname,
        creditCard.issuer,
        creditCard.network,
        creditCard.last_four,
        creditCard.expiration_month,
        creditCard.expiration_year,
        creditCard.credit_limit_cents,
        creditCard.closing_day_of_month,
        creditCard.payment_due_day_of_month,
        creditCard.theme_color,
        creditCard.archived_at,
        creditCard.annuality_enabled,
        creditCard.annuality_amount_cents,
        creditCard.annuality_anniversary_month,
        creditCard.annuality_anniversary_day,
        creditCard.annuality_payment_count,
      ],
    )

    return result.rows[0]
  })
}

export async function updateCreditCard(
  userId: string,
  id: string,
  updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const existingResult = await client.query<CreditCardRecord>(
      `
        SELECT ${creditCardColumns.join(", ")}
        FROM credit_cards
        WHERE user_id = $1 AND id = $2
        FOR UPDATE
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Credit card not found.")
    }

    const existingCard = existingResult.rows[0]
    const nextClosingDay =
      updates.closing_day_of_month ?? existingCard.closing_day_of_month
    const nextPaymentDueDay =
      updates.payment_due_day_of_month ?? existingCard.payment_due_day_of_month
    const isChangingCycleDays =
      nextClosingDay !== existingCard.closing_day_of_month ||
      nextPaymentDueDay !== existingCard.payment_due_day_of_month

    if (isChangingCycleDays) {
      const unpaidStatementResult = await client.query(
        `
          SELECT 1
          FROM credit_card_statements
          WHERE user_id = $1
            AND credit_card_id = $2
            AND lifecycle_status <> 'paid'
          LIMIT 1
        `,
        [userId, id],
      )

      if (unpaidStatementResult.rowCount) {
        throw new Error(
          "Finish or close this card's current statement before changing its billing cycle or payment due day. This keeps existing purchases and statement history from being recalculated.",
        )
      }
    }

    const result = await client.query<CreditCardRecord>(
      `
        UPDATE credit_cards
        SET
          nickname = COALESCE($2, nickname),
          issuer = COALESCE($3, issuer),
          network = COALESCE($4, network),
          last_four = COALESCE($5, last_four),
          expiration_month = COALESCE($6, expiration_month),
          expiration_year = COALESCE($7, expiration_year),
          credit_limit_cents = COALESCE($8, credit_limit_cents),
          closing_day_of_month = COALESCE($9, closing_day_of_month),
          payment_due_day_of_month = COALESCE($10, payment_due_day_of_month),
          theme_color = COALESCE($11, theme_color),
          archived_at = CASE WHEN $12::boolean THEN $13::timestamptz ELSE archived_at END,
          annuality_enabled = CASE
            WHEN $14::boolean THEN $15::boolean
            ELSE annuality_enabled
          END,
          annuality_amount_cents = CASE
            WHEN $14::boolean THEN $16::integer
            ELSE annuality_amount_cents
          END,
          annuality_anniversary_month = CASE
            WHEN $14::boolean THEN $17::smallint
            ELSE annuality_anniversary_month
          END,
          annuality_anniversary_day = CASE
            WHEN $14::boolean THEN $18::smallint
            ELSE annuality_anniversary_day
          END,
          annuality_payment_count = CASE
            WHEN $14::boolean THEN $19::integer
            ELSE annuality_payment_count
          END
        WHERE user_id = $1 AND id = $20
        RETURNING ${creditCardColumns.join(", ")}
      `,
      [
        userId,
        updates.nickname ?? null,
        updates.issuer ?? null,
        updates.network ?? null,
        updates.last_four ?? null,
        updates.expiration_month ?? null,
        updates.expiration_year ?? null,
        updates.credit_limit_cents ?? null,
        updates.closing_day_of_month ?? null,
        updates.payment_due_day_of_month ?? null,
        updates.theme_color ?? null,
        updates.archived_at !== undefined,
        updates.archived_at ?? null,
        updates.annuality_enabled !== undefined,
        updates.annuality_enabled ?? false,
        updates.annuality_enabled === false
          ? null
          : (updates.annuality_amount_cents ??
            existingCard.annuality_amount_cents),
        updates.annuality_enabled === false
          ? null
          : (updates.annuality_anniversary_month ??
            existingCard.annuality_anniversary_month),
        updates.annuality_enabled === false
          ? null
          : (updates.annuality_anniversary_day ??
            existingCard.annuality_anniversary_day),
        updates.annuality_enabled === false
          ? null
          : (updates.annuality_payment_count ??
            existingCard.annuality_payment_count),
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Credit card not found.")
    }

    return result.rows[0]
  })
}

async function getDefaultPaymentCategory(client: PoolClient, userId: string) {
  const result = await client.query<CategoryRecord>(
    `
      SELECT ${categoryColumns.join(", ")}
      FROM categories
      WHERE user_id = $1 AND name IN ('Bills', 'General')
      ORDER BY CASE name WHEN 'Bills' THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [userId],
  )

  if (!result.rowCount) {
    throw new Error("Create a Bills or General category before paying cards.")
  }

  return result.rows[0]
}

async function ensureCardPaymentCounterparty(
  client: PoolClient,
  userId: string,
  card: CreditCardRecord,
) {
  const displayName = `${card.nickname} Payment`
  const existing = await client.query<CounterpartyRecord>(
    `
      SELECT ${counterpartyColumns.join(", ")}
      FROM counterparties
      WHERE user_id = $1 AND lower(display_name) = lower($2)
      LIMIT 1
    `,
    [userId, displayName],
  )

  if (existing.rowCount) {
    return existing.rows[0]
  }

  const result = await client.query<CounterpartyRecord>(
    `
      INSERT INTO counterparties (
        user_id,
        display_name,
        avatar_url,
        type,
        theme_color,
        notes
      )
      VALUES ($1, $2, NULL, 'merchant', $3, $4)
      RETURNING ${counterpartyColumns.join(", ")}
    `,
    [
      userId,
      displayName,
      card.theme_color,
      "Created automatically for credit card payments.",
    ],
  )

  return result.rows[0]
}

type RecurringBillWithContactRecord = RecurringBillRecord & {
  display_name: string
}

interface PendingBillOccurrence {
  bill: RecurringBillWithContactRecord
  occurrence: RecurringBillOccurrenceState
}

async function getRecurringBillPayments(
  client: PoolClient,
  userId: string,
  billId: string,
) {
  const result = await client.query<RecurringBillPaymentRecord>(
    `
      SELECT ${recurringBillPaymentColumns.join(", ")}
      FROM recurring_bill_payments
      WHERE user_id = $1 AND recurring_bill_id = $2
      ORDER BY due_date, id
    `,
    [userId, billId],
  )

  return result.rows
}

async function insertRecurringBillPaymentRow(
  client: PoolClient,
  userId: string,
  payment: Omit<RecurringBillPaymentRecord, "user_id" | "id">,
) {
  const result = await client.query<RecurringBillPaymentRecord>(
    `
      INSERT INTO recurring_bill_payments (
        user_id,
        recurring_bill_id,
        due_date,
        amount_cents,
        status,
        transaction_id,
        paid_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${recurringBillPaymentColumns.join(", ")}
    `,
    [
      userId,
      payment.recurring_bill_id,
      payment.due_date,
      payment.amount_cents,
      payment.status,
      payment.transaction_id,
      payment.paid_at,
    ],
  )

  return result.rows[0]
}

/**
 * Unsettled occurrences (due date reached) of bills assigned to this card
 * that attach to this statement's cycle, with paid statements rolled past.
 * Bill rows are locked so concurrent settlements conflict instead of
 * double-charging.
 */
async function getPendingBillOccurrencesForStatement(
  client: PoolClient,
  userId: string,
  card: Pick<
    CreditCardRecord,
    "id" | "closing_day_of_month" | "payment_due_day_of_month"
  >,
  statement: Pick<CreditCardStatementRecord, "period_start">,
  today: string,
): Promise<PendingBillOccurrence[]> {
  const billsResult = await client.query<RecurringBillWithContactRecord>(
    `
      SELECT ${recurringBillColumns.map((column) => `rb.${column}`).join(", ")}, c.display_name
      FROM recurring_bills rb
      JOIN counterparties c
        ON c.user_id = rb.user_id
        AND c.id = rb.counterparty_id
      WHERE rb.user_id = $1 AND rb.credit_card_id = $2
      ORDER BY rb.first_due_date, rb.id
      FOR UPDATE OF rb
    `,
    [userId, card.id],
  )

  if (!billsResult.rowCount) {
    return []
  }

  const statementsResult = await client.query<
    Pick<
      CreditCardStatementRecord,
      "period_start" | "period_end" | "lifecycle_status"
    >
  >(
    `
      SELECT
        period_start::text AS period_start,
        period_end::text AS period_end,
        lifecycle_status
      FROM credit_card_statements
      WHERE user_id = $1 AND credit_card_id = $2
    `,
    [userId, card.id],
  )
  const pending: PendingBillOccurrence[] = []

  for (const bill of billsResult.rows) {
    const payments = await getRecurringBillPayments(client, userId, bill.id)
    const occurrences = resolveRecurringBillOccurrences(bill, payments, today)

    for (const occurrence of occurrences) {
      if (
        occurrence.status === "paid" ||
        occurrence.status === "skipped" ||
        occurrence.dueDate > today
      ) {
        continue
      }

      const cycle = getBillOccurrenceStatementCycle(
        occurrence.dueDate,
        card,
        statementsResult.rows,
      )

      if (cycle.periodStart === statement.period_start) {
        pending.push({ bill, occurrence })
      }
    }
  }

  return pending
}

async function getPendingAnnualityForStatement(
  client: PoolClient,
  userId: string,
  card: CreditCardRecord,
  statement: Pick<CreditCardStatementRecord, "period_start">,
  today: string,
) {
  const overridesResult = await client.query<CreditCardAnnualityOverrideRecord>(
    `
          SELECT ${creditCardAnnualityOverrideColumns.join(", ")}
          FROM credit_card_annuality_overrides
          WHERE user_id = $1 AND credit_card_id = $2
        `,
    [userId, card.id],
  )
  const statementsResult = await client.query<
    Pick<
      CreditCardStatementRecord,
      "period_start" | "period_end" | "lifecycle_status"
    >
  >(
    `
          SELECT
            period_start::text AS period_start,
            period_end::text AS period_end,
            lifecycle_status
          FROM credit_card_statements
          WHERE user_id = $1 AND credit_card_id = $2
        `,
    [userId, card.id],
  )
  const transactionsResult = await client.query<TransactionRecord>(
    `
          SELECT ${transactionSelectColumns.join(", ")}
          FROM transactions
          WHERE user_id = $1
            AND credit_card_id = $2
            AND payment_method = 'credit_card'
            AND concept = $3
        `,
    [userId, card.id, ANNUALITY_CONCEPT],
  )

  return getPendingAnnualityInstallmentsForPeriod({
    card,
    overrides: overridesResult.rows,
    statements: statementsResult.rows,
    transactions: transactionsResult.rows,
    asOfDate: today,
    periodStart: statement.period_start,
  })
}

async function payCreditCardStatementWithClient(
  client: PoolClient,
  userId: string,
  statementId: string,
  paidAt: string,
) {
  const localToday = await assertDateNotAfterUserLocalToday(
    client,
    userId,
    paidAt,
  )
  const statementResult = await client.query<CreditCardStatementRecord>(
    `
        SELECT ${creditCardStatementColumns.join(", ")}
        FROM credit_card_statements
        WHERE user_id = $1 AND id = $2
        FOR UPDATE
      `,
    [userId, statementId],
  )

  if (!statementResult.rowCount) {
    throw new Error("Credit card statement not found.")
  }

  const statement = statementResult.rows[0]

  if (statement.lifecycle_status === "paid") {
    throw new Error("This statement has already been paid.")
  }

  const card = await getCreditCard(client, userId, statement.credit_card_id)
  const sourceAccount = await getPrimaryPaymentAccount(client, userId)

  // Materialize due occurrences of bills assigned to this card before
  // computing the payable total: pending bills only become real
  // transactions at the moment the statement gets paid.
  const pendingOccurrences = await getPendingBillOccurrencesForStatement(
    client,
    userId,
    card,
    statement,
    localToday,
  )
  const billTransactions: TransactionRecord[] = []
  const recurringBillPayments: RecurringBillPaymentRecord[] = []
  const accountSummaries: AccountSummaryRecord[] = []
  let statementAmountCents = statement.statement_amount_cents

  for (const { bill, occurrence } of pendingOccurrences) {
    const billTransaction = await insertTransactionRecord(client, userId, {
      id: crypto.randomUUID(),
      account_id: sourceAccount.id,
      counterparty_id: bill.counterparty_id,
      category_id: bill.category_id,
      concept: bill.concept,
      amount_cents: occurrence.amountCents * -1,
      is_voucher_expense: false,
      payment_method: "credit_card",
      credit_card_id: card.id,
      credit_card_statement_id: statement.id,
      posted_at: occurrence.dueDate,
      description: `Recurring bill due ${occurrence.dueDate}.`,
    })
    const billEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      billTransaction,
      1,
    )
    const updatedStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      billTransaction,
      1,
    )
    const billPayment = await insertRecurringBillPaymentRow(client, userId, {
      recurring_bill_id: bill.id,
      due_date: occurrence.dueDate,
      amount_cents: occurrence.amountCents,
      status: "paid",
      transaction_id: billTransaction.id,
      paid_at: paidAt,
    })

    billTransactions.push(billTransaction)
    recurringBillPayments.push(billPayment)

    if (billEffects?.accountSummary) {
      accountSummaries.push(billEffects.accountSummary)
    }

    if (updatedStatement) {
      statementAmountCents = updatedStatement.statement_amount_cents
    }
  }

  const category = await getDefaultPaymentCategory(client, userId)
  const counterparty = await ensureCardPaymentCounterparty(client, userId, card)
  const pendingAnnuality = await getPendingAnnualityForStatement(
    client,
    userId,
    card,
    statement,
    localToday,
  )

  for (const installment of pendingAnnuality) {
    const annualityTransaction = await insertTransactionRecord(client, userId, {
      id: crypto.randomUUID(),
      account_id: sourceAccount.id,
      counterparty_id: counterparty.id,
      category_id: category.id,
      concept: ANNUALITY_CONCEPT,
      amount_cents: installment.amountCents * -1,
      is_voucher_expense: false,
      payment_method: "credit_card",
      credit_card_id: card.id,
      credit_card_statement_id: statement.id,
      posted_at: installment.dueDate,
      description: annualityDescription(
        installment.anniversaryYear,
        installment.installmentIndex,
      ),
    })
    const annualityEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      annualityTransaction,
      1,
    )
    const updatedStatement = await applyCreditCardStatementEffectIfNeeded(
      client,
      userId,
      annualityTransaction,
      1,
    )

    billTransactions.push(annualityTransaction)

    if (annualityEffects?.accountSummary) {
      accountSummaries.push(annualityEffects.accountSummary)
    }

    if (updatedStatement) {
      statementAmountCents = updatedStatement.statement_amount_cents
    }
  }

  if (statementAmountCents <= 0) {
    throw new Error("This statement does not have a balance to pay.")
  }
  const savedTransaction = await insertTransactionRecord(client, userId, {
    id: crypto.randomUUID(),
    account_id: sourceAccount.id,
    counterparty_id: counterparty.id,
    category_id: category.id,
    concept: `Pay ${card.nickname} statement`,
    amount_cents: statementAmountCents * -1,
    is_voucher_expense: false,
    payment_method: "credit_card_payment",
    credit_card_id: card.id,
    credit_card_statement_id: statement.id,
    posted_at: paidAt,
    description: `Payment for ${statement.period_start} to ${statement.period_end}.`,
  })
  const effects = await applyAccountEffectsIfNeeded(
    client,
    userId,
    savedTransaction,
    1,
  )
  const paidStatementResult = await client.query<CreditCardStatementRecord>(
    `
        UPDATE credit_card_statements
        SET lifecycle_status = 'paid', paid_at = now()
        WHERE user_id = $1 AND id = $2
        RETURNING ${creditCardStatementColumns.join(", ")}
      `,
    [userId, statement.id],
  )
  const paymentResult = await client.query<CreditCardPaymentRecord>(
    `
        INSERT INTO credit_card_payments (
          user_id,
          credit_card_id,
          statement_id,
          source_account_id,
          cashflow_transaction_id,
          amount_cents,
          paid_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${creditCardPaymentColumns.join(", ")}
      `,
    [
      userId,
      card.id,
      statement.id,
      sourceAccount.id,
      savedTransaction.id,
      statementAmountCents,
      paidAt,
    ],
  )

  return {
    payment: paymentResult.rows[0],
    transaction: savedTransaction,
    // The auto-created "{nickname} Payment" contact must reach client
    // state, or the transactions selector cannot resolve the cashflow
    // transaction's counterparty.
    counterparty,
    accounts: effects?.account ? [effects.account] : [],
    accountSummaries,
    statement: paidStatementResult.rows[0],
    billTransactions,
    recurringBillPayments,
  }
}

export async function payCreditCardStatement(
  userId: string,
  statementId: string,
  paidAt: string,
) {
  return withFinanceTransaction(userId, (client) =>
    payCreditCardStatementWithClient(client, userId, statementId, paidAt),
  )
}

/**
 * Pays the statement cycle containing `referenceDate` for a card, creating
 * the statement row first when it does not exist yet. Used for cycles whose
 * only balance is pending recurring bills (no purchases ever created a row).
 */
export async function payCreditCardCycle(
  userId: string,
  creditCardId: string,
  referenceDate: string,
  paidAt: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const card = await getCreditCard(client, userId, creditCardId)
    const statement = await ensureOpenCreditCardStatement(
      client,
      userId,
      card,
      referenceDate,
    )

    return payCreditCardStatementWithClient(
      client,
      userId,
      statement.id,
      paidAt,
    )
  })
}

export async function closeZeroBalanceCreditCardStatement(
  userId: string,
  statementId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const statementResult = await client.query<CreditCardStatementRecord>(
      `
        SELECT ${creditCardStatementColumns.join(", ")}
        FROM credit_card_statements
        WHERE user_id = $1 AND id = $2
        FOR UPDATE
      `,
      [userId, statementId],
    )

    if (!statementResult.rowCount) {
      throw new Error("Credit card statement not found.")
    }

    const statement = statementResult.rows[0]

    if (statement.lifecycle_status === "paid") {
      throw new Error("This statement is already closed.")
    }

    if (statement.statement_amount_cents > 0) {
      throw new Error("This statement has a balance. Pay it instead.")
    }

    const cardResult = await client.query<CreditCardRecord>(
      `
        SELECT ${creditCardColumns.join(", ")}
        FROM credit_cards
        WHERE user_id = $1 AND id = $2
      `,
      [userId, statement.credit_card_id],
    )

    if (!cardResult.rowCount) {
      throw new Error("Credit card not found.")
    }

    const localToday = await getUserLocalToday(client, userId)
    const card = cardResult.rows[0]
    const pendingOccurrences = await getPendingBillOccurrencesForStatement(
      client,
      userId,
      card,
      statement,
      localToday,
    )
    const pendingAnnuality = await getPendingAnnualityForStatement(
      client,
      userId,
      card,
      statement,
      localToday,
    )

    if (pendingOccurrences.length > 0 || pendingAnnuality.length > 0) {
      throw new Error(
        "This statement has pending charges due. Pay the statement instead.",
      )
    }

    const closedStatementResult = await client.query<CreditCardStatementRecord>(
      `
          UPDATE credit_card_statements
          SET lifecycle_status = 'paid', paid_at = now()
          WHERE user_id = $1 AND id = $2
          RETURNING ${creditCardStatementColumns.join(", ")}
        `,
      [userId, statement.id],
    )

    return closedStatementResult.rows[0]
  })
}

async function getRecurringBillForUpdate(
  client: PoolClient,
  userId: string,
  billId: string,
) {
  const result = await client.query<RecurringBillRecord>(
    `
      SELECT ${recurringBillColumns.join(", ")}
      FROM recurring_bills
      WHERE user_id = $1 AND id = $2
      FOR UPDATE
    `,
    [userId, billId],
  )

  if (!result.rowCount) {
    throw new Error("Recurring bill not found.")
  }

  return result.rows[0]
}

async function resolveUnsettledOccurrence(
  client: PoolClient,
  userId: string,
  bill: RecurringBillRecord,
  today: string,
) {
  const payments = await getRecurringBillPayments(client, userId, bill.id)

  return {
    payments,
    findOccurrence(dueDate: string) {
      const occurrences = resolveRecurringBillOccurrences(bill, payments, today)
      const occurrence = occurrences.find(
        (candidate) => candidate.dueDate === dueDate,
      )

      if (!occurrence) {
        throw new Error("This due date is not on the bill's schedule.")
      }

      if (occurrence.status === "paid" || occurrence.status === "skipped") {
        throw new Error("This bill occurrence has already been settled.")
      }

      return occurrence
    },
  }
}

export async function insertRecurringBill(
  userId: string,
  bill: NewRecurringBillRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      bill.counterparty_id,
      "Contact",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      bill.category_id,
      "Category",
    )

    await assertOneTimeScheduledCharge(client, userId, bill, true)

    if (bill.credit_card_id) {
      await getCreditCard(client, userId, bill.credit_card_id)
    }

    const result = await client.query<RecurringBillRecord>(
      `
        INSERT INTO recurring_bills (
          user_id,
          id,
          counterparty_id,
          concept,
          amount_cents,
          currency,
          frequency,
          first_due_date,
          total_payments,
          credit_card_id,
          category_id,
          archived_at,
          paused_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${recurringBillColumns.join(", ")}
      `,
      [
        userId,
        bill.id,
        bill.counterparty_id,
        bill.concept,
        bill.amount_cents,
        bill.currency,
        bill.frequency,
        bill.first_due_date,
        bill.total_payments,
        bill.credit_card_id,
        bill.category_id,
        bill.archived_at,
        bill.paused_at,
      ],
    )

    return result.rows[0]
  })
}

export async function updateRecurringBill(
  userId: string,
  id: string,
  updates: Partial<Omit<RecurringBillRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const existing = await getRecurringBillForUpdate(client, userId, id)
    const paymentsResult = await client.query<{
      total: string
    }>(
      `
        SELECT count(*) AS total
        FROM recurring_bill_payments
        WHERE user_id = $1 AND recurring_bill_id = $2
      `,
      [userId, id],
    )
    const settledCount = Number(paymentsResult.rows[0]?.total ?? 0)

    if (settledCount > 0) {
      if (
        updates.frequency !== undefined &&
        updates.frequency !== existing.frequency
      ) {
        throw new Error(
          "This bill already has payments, so its frequency is locked. Archive it and create a new bill to reschedule.",
        )
      }

      if (
        updates.first_due_date !== undefined &&
        updates.first_due_date !== existing.first_due_date
      ) {
        throw new Error(
          "This bill already has payments, so its first due date is locked. Archive it and create a new bill to reschedule.",
        )
      }
    }

    if (
      updates.total_payments !== undefined &&
      updates.total_payments !== null &&
      updates.total_payments < settledCount
    ) {
      throw new Error(
        `This bill already has ${settledCount} settled payments. The number of payments cannot be lower than that.`,
      )
    }

    const nextBill = { ...existing, ...updates }
    await assertOneTimeScheduledCharge(
      client,
      userId,
      nextBill,
      updates.first_due_date !== undefined || updates.frequency === "one_time",
    )

    if (updates.counterparty_id) {
      await assertUserRecord(
        client,
        "counterparties",
        userId,
        updates.counterparty_id,
        "Contact",
      )
    }

    if (updates.category_id) {
      await assertUserRecord(
        client,
        "categories",
        userId,
        updates.category_id,
        "Category",
      )
    }

    if (updates.credit_card_id) {
      await getCreditCard(client, userId, updates.credit_card_id)
    }

    const result = await client.query<RecurringBillRecord>(
      `
        UPDATE recurring_bills
        SET
          counterparty_id = COALESCE($2, counterparty_id),
          concept = COALESCE($3, concept),
          amount_cents = COALESCE($4, amount_cents),
          currency = COALESCE($5, currency),
          frequency = COALESCE($6, frequency),
          first_due_date = COALESCE($7, first_due_date),
          total_payments = CASE WHEN $8::boolean THEN $9::integer ELSE total_payments END,
          credit_card_id = CASE WHEN $10::boolean THEN $11::uuid ELSE credit_card_id END,
          category_id = COALESCE($12, category_id)
        WHERE user_id = $1 AND id = $13
        RETURNING ${recurringBillColumns.join(", ")}
      `,
      [
        userId,
        updates.counterparty_id ?? null,
        updates.concept ?? null,
        updates.amount_cents ?? null,
        updates.currency ?? null,
        updates.frequency ?? null,
        updates.first_due_date ?? null,
        updates.total_payments !== undefined,
        updates.total_payments ?? null,
        updates.credit_card_id !== undefined,
        updates.credit_card_id ?? null,
        updates.category_id ?? null,
        id,
      ],
    )

    return result.rows[0]
  })
}

export async function archiveRecurringBill(userId: string, id: string) {
  const result = await setRecurringBillInactive(userId, id, { mode: "archive" })

  return result.bill
}

export type RecurringBillInactiveMode = "pause" | "archive"

export interface SetRecurringBillInactiveInput {
  mode: RecurringBillInactiveMode
}

export interface SetRecurringBillInactiveResult {
  bill: RecurringBillRecord
}

async function materializeScheduledRecurringBillIfDue(
  client: PoolClient,
  userId: string,
  bill: RecurringBillRecord,
  localToday: string,
  timezone: string,
): Promise<RecurringBillRecord> {
  if (!bill.scheduled_end_date || !bill.scheduled_end_mode) {
    return bill
  }

  if (localToday < bill.scheduled_end_date) {
    return bill
  }

  const inactiveAt = inactiveTimestampForCutoffDate(
    bill.scheduled_end_date,
    timezone,
  )
  const result = await client.query<RecurringBillRecord>(
    `
      UPDATE recurring_bills
      SET
        paused_at = CASE
          WHEN $3::text = 'pause' THEN $4::timestamptz
          ELSE NULL
        END,
        archived_at = CASE
          WHEN $3::text = 'archive' THEN $4::timestamptz
          ELSE archived_at
        END,
        scheduled_end_date = NULL,
        scheduled_end_mode = NULL
      WHERE user_id = $1 AND id = $2
      RETURNING ${recurringBillColumns.join(", ")}
    `,
    [userId, bill.id, bill.scheduled_end_mode, inactiveAt],
  )

  return result.rows[0]
}

async function materializeScheduledRecurringBillEnds(
  client: PoolClient,
  userId: string,
  bills: RecurringBillRecord[],
  localToday: string,
  timezone: string,
): Promise<RecurringBillRecord[]> {
  const materialized: RecurringBillRecord[] = []

  for (const bill of bills) {
    materialized.push(
      await materializeScheduledRecurringBillIfDue(
        client,
        userId,
        bill,
        localToday,
        timezone,
      ),
    )
  }

  return materialized
}

export async function setRecurringBillInactive(
  userId: string,
  id: string,
  input: SetRecurringBillInactiveInput,
): Promise<SetRecurringBillInactiveResult> {
  return withFinanceTransaction(userId, async (client) => {
    let existing = await getRecurringBillForUpdate(client, userId, id)
    const localToday = await getUserLocalToday(client, userId)
    const timezone = await getUserProfileTimezone(client, userId)

    existing = await materializeScheduledRecurringBillIfDue(
      client,
      userId,
      existing,
      localToday,
      timezone,
    )

    if (input.mode === "pause") {
      if (existing.archived_at) {
        throw new Error("This bill is archived and cannot be paused.")
      }

      if (existing.paused_at) {
        throw new Error("This bill is already paused.")
      }
    } else if (existing.archived_at) {
      throw new Error("This bill is already archived.")
    }

    const nextDueAfterToday =
      existing.credit_card_id !== null
        ? getNextDueDateAfter(existing, localToday)
        : null

    if (existing.credit_card_id && nextDueAfterToday) {
      const result = await client.query<RecurringBillRecord>(
        `
          UPDATE recurring_bills
          SET
            scheduled_end_date = $3,
            scheduled_end_mode = $4
          WHERE user_id = $1 AND id = $2
          RETURNING ${recurringBillColumns.join(", ")}
        `,
        [userId, id, nextDueAfterToday, input.mode],
      )

      return { bill: result.rows[0] }
    }

    const inactiveAt = new Date().toISOString()
    const result = await client.query<RecurringBillRecord>(
      `
        UPDATE recurring_bills
        SET
          paused_at = CASE WHEN $3::text = 'pause' THEN $4::timestamptz ELSE NULL END,
          archived_at = CASE WHEN $3::text = 'archive' THEN $4::timestamptz ELSE archived_at END,
          scheduled_end_date = NULL,
          scheduled_end_mode = NULL
        WHERE user_id = $1 AND id = $2
        RETURNING ${recurringBillColumns.join(", ")}
      `,
      [userId, id, input.mode, inactiveAt],
    )

    return { bill: result.rows[0] }
  })
}

export async function undoScheduledRecurringBillEnd(
  userId: string,
  id: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const existing = await getRecurringBillForUpdate(client, userId, id)

    if (!existing.scheduled_end_date || !existing.scheduled_end_mode) {
      throw new Error("This bill does not have a scheduled end.")
    }

    if (existing.paused_at || existing.archived_at) {
      throw new Error("This bill is no longer active. Refresh and try again.")
    }

    const result = await client.query<RecurringBillRecord>(
      `
        UPDATE recurring_bills
        SET scheduled_end_date = NULL, scheduled_end_mode = NULL
        WHERE user_id = $1 AND id = $2
        RETURNING ${recurringBillColumns.join(", ")}
      `,
      [userId, id],
    )

    return result.rows[0]
  })
}

export async function resumeRecurringBill(
  userId: string,
  id: string,
  firstDueDate: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const existing = await getRecurringBillForUpdate(client, userId, id)
    const localToday = await getUserLocalToday(client, userId)

    if (existing.archived_at) {
      throw new Error("This bill is archived and cannot be resumed.")
    }

    if (!existing.paused_at) {
      throw new Error("This bill is not paused.")
    }

    if (firstDueDate < localToday) {
      throw new Error("Choose a start date on or after today.")
    }

    const result = await client.query<RecurringBillRecord>(
      `
        UPDATE recurring_bills
        SET paused_at = NULL, first_due_date = $3
        WHERE user_id = $1 AND id = $2
        RETURNING ${recurringBillColumns.join(", ")}
      `,
      [userId, id, firstDueDate],
    )

    return result.rows[0]
  })
}

export async function deleteRecurringBill(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    await getRecurringBillForUpdate(client, userId, id)

    const paymentsResult = await client.query(
      `
        SELECT 1
        FROM recurring_bill_payments
        WHERE user_id = $1 AND recurring_bill_id = $2
        LIMIT 1
      `,
      [userId, id],
    )

    if (paymentsResult.rowCount) {
      throw new Error(
        "This bill has payment history and cannot be deleted. Archive it instead.",
      )
    }

    await client.query(
      "DELETE FROM recurring_bills WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    return { id }
  })
}

export async function payRecurringBillOccurrence(
  userId: string,
  billId: string,
  dueDate: string,
  source: RecurringBillPaymentSource,
  paidAt: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const localToday = await assertDateNotAfterUserLocalToday(
      client,
      userId,
      paidAt,
    )
    const bill = await getRecurringBillForUpdate(client, userId, billId)
    const { findOccurrence } = await resolveUnsettledOccurrence(
      client,
      userId,
      bill,
      localToday,
    )
    const occurrence = findOccurrence(dueDate)
    const sourceAccount = await getPrimaryPaymentAccount(client, userId)

    let transaction: TransactionRecord
    let creditCardStatement: CreditCardStatementRecord | null = null

    if (source.type === "credit_card") {
      const card = await getCreditCard(client, userId, source.creditCardId)
      const statement = await ensureOpenCreditCardStatement(
        client,
        userId,
        card,
        paidAt,
      )

      transaction = await insertTransactionRecord(client, userId, {
        id: crypto.randomUUID(),
        account_id: sourceAccount.id,
        counterparty_id: bill.counterparty_id,
        category_id: bill.category_id,
        concept: bill.concept,
        amount_cents: occurrence.amountCents * -1,
        is_voucher_expense: false,
        payment_method: "credit_card",
        credit_card_id: card.id,
        credit_card_statement_id: statement.id,
        posted_at: paidAt,
        description: `Recurring bill due ${occurrence.dueDate}.`,
      })
      creditCardStatement = await applyCreditCardStatementEffectIfNeeded(
        client,
        userId,
        transaction,
        1,
      )
    } else {
      transaction = await insertTransactionRecord(client, userId, {
        id: crypto.randomUUID(),
        account_id: sourceAccount.id,
        counterparty_id: bill.counterparty_id,
        category_id: bill.category_id,
        concept: bill.concept,
        amount_cents: occurrence.amountCents * -1,
        is_voucher_expense: false,
        payment_method: "bank_account",
        credit_card_id: null,
        credit_card_statement_id: null,
        posted_at: paidAt,
        description: `Recurring bill due ${occurrence.dueDate}.`,
      })
    }

    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      transaction,
      1,
    )
    const billPayment = await insertRecurringBillPaymentRow(client, userId, {
      recurring_bill_id: bill.id,
      due_date: occurrence.dueDate,
      amount_cents: occurrence.amountCents,
      status: "paid",
      transaction_id: transaction.id,
      paid_at: paidAt,
    })

    return {
      billPayment,
      transaction,
      accounts: effects?.account ? [effects.account] : [],
      accountSummaries: effects?.accountSummary ? [effects.accountSummary] : [],
      creditCardStatements: creditCardStatement ? [creditCardStatement] : [],
    }
  })
}

export async function skipRecurringBillOccurrence(
  userId: string,
  billId: string,
  dueDate: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const localToday = await getUserLocalToday(client, userId)
    const bill = await getRecurringBillForUpdate(client, userId, billId)
    const { findOccurrence } = await resolveUnsettledOccurrence(
      client,
      userId,
      bill,
      localToday,
    )
    const occurrence = findOccurrence(dueDate)

    return insertRecurringBillPaymentRow(client, userId, {
      recurring_bill_id: bill.id,
      due_date: occurrence.dueDate,
      amount_cents: occurrence.amountCents,
      status: "skipped",
      transaction_id: null,
      paid_at: localToday,
    })
  })
}

export async function insertBudget(
  userId: string,
  budget: BudgetRecord,
  spentCents: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    // language=SQL format=false
    const budgetResult = await client.query<BudgetRecord>(
      `
        INSERT INTO budgets (
          user_id,
          id,
          category_id,
          period,
          limit_cents,
          monthly_voucher_coverage_cents,
          theme_color
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${budgetColumns.join(", ")}
      `,
      [
        userId,
        budget.id,
        budget.category_id,
        budget.period,
        budget.limit_cents,
        budget.monthly_voucher_coverage_cents,
        budget.theme_color,
      ],
    )
    const summaryResult = await client.query<BudgetSummaryRecord>(
      `
        INSERT INTO budget_summaries (user_id, budget_id, spent_cents)
        VALUES ($1, $2, $3)
        RETURNING user_id, budget_id, spent_cents
      `,
      [userId, budget.id, spentCents],
    )

    return {
      budget: budgetResult.rows[0],
      budgetSummary: summaryResult.rows[0],
    }
  })
}

export async function updateBudget(
  userId: string,
  id: string,
  updates: Partial<Omit<BudgetRecord, "id" | "user_id">>,
  spentCents?: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    const budgetResult = await client.query<BudgetRecord>(
      `
        UPDATE budgets
        SET
          category_id = COALESCE($2, category_id),
          period = COALESCE($3, period),
          limit_cents = COALESCE($4, limit_cents),
          monthly_voucher_coverage_cents = COALESCE($5, monthly_voucher_coverage_cents),
          theme_color = COALESCE($6, theme_color)
        WHERE user_id = $1 AND id = $7
        RETURNING ${budgetColumns.join(", ")}
      `,
      [
        userId,
        updates.category_id ?? null,
        updates.period ?? null,
        updates.limit_cents ?? null,
        updates.monthly_voucher_coverage_cents ?? null,
        updates.theme_color ?? null,
        id,
      ],
    )

    if (!budgetResult.rowCount) {
      throw new Error("Budget not found.")
    }

    let budgetSummary: BudgetSummaryRecord | null = null

    if (spentCents !== undefined) {
      const summaryResult = await client.query<BudgetSummaryRecord>(
        `
          INSERT INTO budget_summaries (user_id, budget_id, spent_cents)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, budget_id)
          DO UPDATE SET spent_cents = excluded.spent_cents
          RETURNING user_id, budget_id, spent_cents
        `,
        [userId, id, spentCents],
      )
      budgetSummary = summaryResult.rows[0]
    }

    return {
      budget: budgetResult.rows[0],
      budgetSummary,
    }
  })
}

export async function deleteBudget(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query(
      "DELETE FROM budgets WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Budget not found.")
    }
  })
}

export async function assignTransactionToBudget(
  userId: string,
  transactionId: string,
  budgetId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const currentPeriod = getCurrentPeriod()
    const result = await client.query<BudgetTransactionAssignmentRecord>(
      `
        WITH eligible_assignment AS (
          SELECT
            t.user_id,
            b.id AS budget_id,
            t.id AS transaction_id,
            abs(t.amount_cents) AS assigned_amount_cents
          FROM transactions t
          JOIN budgets b
            ON b.user_id = t.user_id
            AND b.id = $3
            AND b.period = $4
          WHERE t.user_id = $1
            AND t.id = $2
            AND t.amount_cents < 0
            AND to_char(t.posted_at, 'YYYY-MM') = b.period
        )
        INSERT INTO budget_transaction_assignments (
          user_id,
          budget_id,
          transaction_id,
          assigned_amount_cents
        )
        SELECT
          user_id,
          budget_id,
          transaction_id,
          assigned_amount_cents
        FROM eligible_assignment
        ON CONFLICT (user_id, transaction_id)
        DO UPDATE SET
          budget_id = excluded.budget_id,
          assigned_amount_cents = excluded.assigned_amount_cents
        RETURNING user_id, id, budget_id, transaction_id, assigned_amount_cents
      `,
      [userId, transactionId, budgetId, currentPeriod],
    )

    if (!result.rowCount) {
      throw new Error(
        "Only current-month expense transactions can be assigned to budgets.",
      )
    }

    return result.rows[0]
  })
}

export async function unassignTransactionFromBudget(
  userId: string,
  transactionId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<BudgetTransactionAssignmentRecord>(
      `
        DELETE FROM budget_transaction_assignments
        WHERE user_id = $1 AND transaction_id = $2
        RETURNING user_id, id, budget_id, transaction_id, assigned_amount_cents
      `,
      [userId, transactionId],
    )

    return result.rows[0] ?? null
  })
}

export async function insertPot(userId: string, pot: PotRecord) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        INSERT INTO pots (user_id, id, name, balance_cents, target_cents, theme_color, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color, due_date::text AS due_date
      `,
      [
        userId,
        pot.id,
        pot.name,
        pot.balance_cents,
        pot.target_cents,
        pot.theme_color,
        pot.due_date,
      ],
    )

    return result.rows[0]
  })
}

export async function updatePot(
  userId: string,
  id: string,
  updates: Partial<Omit<PotRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        UPDATE pots
        SET
          name = COALESCE($2, name),
          balance_cents = COALESCE($3, balance_cents),
          target_cents = COALESCE($4, target_cents),
          theme_color = COALESCE($5, theme_color),
          due_date = CASE WHEN $6::boolean THEN $7::date ELSE due_date END
        WHERE user_id = $1 AND id = $8
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color, due_date::text AS due_date
      `,
      [
        userId,
        updates.name ?? null,
        updates.balance_cents ?? null,
        updates.target_cents ?? null,
        updates.theme_color ?? null,
        updates.due_date !== undefined,
        updates.due_date ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Pot not found.")
    }

    return result.rows[0]
  })
}

export async function movePotBalance(
  userId: string,
  movement: PotMovementRequest,
) {
  return withFinanceTransaction(userId, async (client) => {
    const isDeposit = movement.direction === "deposit"

    if (movement.source.type === "direct") {
      const result = await client.query<PotRecord>(
        `
          UPDATE pots
          SET balance_cents =
            CASE
              WHEN $3::boolean THEN balance_cents + $2
              ELSE balance_cents - $2
            END
          WHERE user_id = $1
            AND id = $4
            AND ($3::boolean OR balance_cents >= $2)
          RETURNING ${potColumns.join(", ")}
        `,
        [userId, movement.amountCents, isDeposit, movement.potId],
      )

      if (!result.rowCount) {
        throw new Error(
          isDeposit
            ? "Pot not found."
            : "This pot does not have enough money for that withdrawal.",
        )
      }

      return {
        pots: result.rows,
        transaction: null,
        accounts: [],
        accountSummaries: [],
      }
    }

    if (movement.source.type === "pot") {
      const sourcePotId = isDeposit ? movement.source.potId : movement.potId
      const destinationPotId = isDeposit
        ? movement.potId
        : movement.source.potId

      if (sourcePotId === destinationPotId) {
        throw new Error("Choose a different pot to transfer money.")
      }

      const lockedPots = await client.query<PotRecord>(
        `
          SELECT ${potColumns.join(", ")}
          FROM pots
          WHERE user_id = $1
            AND id = ANY($2::uuid[])
          ORDER BY id
          FOR UPDATE
        `,
        [userId, [sourcePotId, destinationPotId]],
      )
      const sourcePot = lockedPots.rows.find((pot) => pot.id === sourcePotId)

      if (lockedPots.rowCount !== 2 || !sourcePot) {
        throw new Error("Choose a valid pot to transfer money.")
      }

      if (sourcePot.balance_cents < movement.amountCents) {
        throw new Error("The source pot does not have enough money.")
      }

      const result = await client.query<PotRecord>(
        `
          UPDATE pots
          SET balance_cents = CASE
            WHEN id = $2 THEN balance_cents - $4
            WHEN id = $3 THEN balance_cents + $4
            ELSE balance_cents
          END
          WHERE user_id = $1
            AND id = ANY($5::uuid[])
          RETURNING ${potColumns.join(", ")}
        `,
        [
          userId,
          sourcePotId,
          destinationPotId,
          movement.amountCents,
          [sourcePotId, destinationPotId],
        ],
      )

      return {
        pots: result.rows,
        transaction: null,
        accounts: [],
        accountSummaries: [],
      }
    }

    const currentPotResult = await client.query<PotRecord>(
      `
        SELECT ${potColumns.join(", ")}
        FROM pots
        WHERE user_id = $1
          AND id = $2
        FOR UPDATE
      `,
      [userId, movement.potId],
    )
    const currentPot = currentPotResult.rows[0]

    if (!currentPot) {
      throw new Error("Pot not found.")
    }

    if (!isDeposit && currentPot.balance_cents < movement.amountCents) {
      throw new Error(
        "This pot does not have enough money for that withdrawal.",
      )
    }

    const primaryAccountResult = await client.query<AccountRecord>(
      `
            SELECT ${accountColumns.join(", ")}
            FROM accounts
            WHERE user_id = $1
              AND is_primary
              AND type IN ('checking', 'savings')
            LIMIT 1
            FOR UPDATE
          `,
      [userId],
    )
    const ownerContactResult = await client.query<CounterpartyRecord>(
      `
            SELECT ${counterpartyColumns.join(", ")}
            FROM counterparties
            WHERE user_id = $1
              AND is_account_owner
            LIMIT 1
          `,
      [userId],
    )
    const categoryResult = movement.source.categoryId
      ? await client.query<CategoryRecord>(
          `
                SELECT ${categoryColumns.join(", ")}
                FROM categories
                WHERE user_id = $1
                  AND id = $2
                LIMIT 1
              `,
          [userId, movement.source.categoryId],
        )
      : await client.query<CategoryRecord>(
          `
                SELECT ${categoryColumns.join(", ")}
                FROM categories
                WHERE user_id = $1
                  AND lower(name) = 'general'
                LIMIT 1
              `,
          [userId],
        )
    const primaryAccount = primaryAccountResult.rows[0]
    const ownerContact = ownerContactResult.rows[0]
    const category = categoryResult.rows[0]

    if (!primaryAccount) {
      throw new Error(
        "Your primary bank account is not ready yet. Refresh and try again.",
      )
    }

    if (!ownerContact) {
      throw new Error(
        "Your account owner contact is not ready yet. Refresh and try again.",
      )
    }

    if (!category) {
      throw new Error(
        movement.source.categoryId
          ? "Category not found."
          : "Your General category is not ready yet. Refresh and try again.",
      )
    }

    const postedAt =
      movement.source.postedAt ?? (await getUserLocalToday(client, userId))
    await assertDateNotAfterUserLocalToday(client, userId, postedAt)

    const updatedPotResult = await client.query<PotRecord>(
      `
        UPDATE pots
        SET balance_cents =
          CASE
            WHEN $3::boolean THEN balance_cents + $2
            ELSE balance_cents - $2
          END
        WHERE user_id = $1
          AND id = $4
        RETURNING ${potColumns.join(", ")}
      `,
      [userId, movement.amountCents, isDeposit, movement.potId],
    )
    const updatedPot = updatedPotResult.rows[0]
    const concept =
      movement.source.concept?.trim() ||
      (isDeposit
        ? `Deposit to ${currentPot.name}`
        : `Taken from ${currentPot.name}`)
    const transactionResult = await client.query<TransactionRecord>(
      `
        INSERT INTO transactions (
          user_id,
          id,
          account_id,
          counterparty_id,
          category_id,
          concept,
          amount_cents,
          is_voucher_expense,
          payment_method,
          credit_card_id,
          credit_card_statement_id,
          posted_at,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'bank_account', null, null, $8, null)
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        crypto.randomUUID(),
        primaryAccount.id,
        ownerContact.id,
        category.id,
        concept,
        isDeposit ? -movement.amountCents : movement.amountCents,
        postedAt,
      ],
    )
    const transaction = transactionResult.rows[0]
    const effects = await applyTransactionEffects(
      client,
      userId,
      transaction,
      1,
    )

    return {
      pots: [updatedPot],
      transaction,
      accounts: [effects.account],
      accountSummaries: [effects.accountSummary],
    }
  })
}

export async function deletePot(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query(
      "DELETE FROM pots WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Pot not found.")
    }
  })
}

export async function upsertCashForecastSettings(
  userId: string,
  defaultMonthlyIncomeCents: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastSettingsRecord>(
      `
        INSERT INTO cash_forecast_settings (
          user_id,
          default_monthly_income_cents,
          included_budget_category_ids
        )
        VALUES ($1, $2, '{}')
        ON CONFLICT (user_id)
        DO UPDATE SET
          default_monthly_income_cents = excluded.default_monthly_income_cents
        RETURNING ${cashForecastSettingsColumns.join(", ")}
      `,
      [userId, defaultMonthlyIncomeCents],
    )

    return result.rows[0]
  })
}

export async function updateCashForecastIncludedBudgets(
  userId: string,
  includedBudgetCategoryIds: string[],
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastSettingsRecord>(
      `
        UPDATE cash_forecast_settings
        SET included_budget_category_ids = $2::uuid[]
        WHERE user_id = $1
        RETURNING ${cashForecastSettingsColumns.join(", ")}
      `,
      [userId, includedBudgetCategoryIds],
    )

    if (!result.rowCount) {
      throw new Error("Save monthly income before choosing budget projections.")
    }

    return result.rows[0]
  })
}

export async function insertCashForecastAdjustment(
  userId: string,
  adjustment: NewCashForecastAdjustmentRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastAdjustmentRecord>(
      `
        INSERT INTO cash_forecast_adjustments (
          user_id,
          id,
          kind,
          name,
          amount_cents,
          start_period,
          recurrence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${cashForecastAdjustmentColumns.join(", ")}
      `,
      [
        userId,
        adjustment.id,
        adjustment.kind,
        adjustment.name,
        adjustment.amount_cents,
        adjustment.start_period,
        adjustment.recurrence,
      ],
    )

    return result.rows[0]
  })
}

export async function updateCashForecastAdjustment(
  userId: string,
  id: string,
  adjustment: Omit<NewCashForecastAdjustmentRecord, "id">,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastAdjustmentRecord>(
      `
        UPDATE cash_forecast_adjustments
        SET
          kind = $3,
          name = $4,
          amount_cents = $5,
          start_period = $6,
          recurrence = $7
        WHERE user_id = $1 AND id = $2
        RETURNING ${cashForecastAdjustmentColumns.join(", ")}
      `,
      [
        userId,
        id,
        adjustment.kind,
        adjustment.name,
        adjustment.amount_cents,
        adjustment.start_period,
        adjustment.recurrence,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Forecast item not found.")
    }

    return result.rows[0]
  })
}

export async function deleteCashForecastAdjustment(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<{ id: string }>(
      `
        DELETE FROM cash_forecast_adjustments
        WHERE user_id = $1 AND id = $2
        RETURNING id
      `,
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Forecast item not found.")
    }

    return result.rows[0]
  })
}

export async function upsertCashForecastExclusion(
  userId: string,
  exclusion: {
    source_type: CashForecastExclusionSourceType
    source_key: string
    period: string
  },
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastExclusionRecord>(
      `
        INSERT INTO cash_forecast_exclusions (
          user_id,
          source_type,
          source_key,
          period
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, source_type, source_key, period)
        DO UPDATE SET source_key = EXCLUDED.source_key
        RETURNING ${cashForecastExclusionColumns.join(", ")}
      `,
      [userId, exclusion.source_type, exclusion.source_key, exclusion.period],
    )

    return result.rows[0]
  })
}

export async function deleteCashForecastExclusion(
  userId: string,
  exclusion: {
    source_type: CashForecastExclusionSourceType
    source_key: string
    period: string
  },
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CashForecastExclusionRecord>(
      `
        DELETE FROM cash_forecast_exclusions
        WHERE user_id = $1
          AND source_type = $2
          AND source_key = $3
          AND period = $4
        RETURNING ${cashForecastExclusionColumns.join(", ")}
      `,
      [userId, exclusion.source_type, exclusion.source_key, exclusion.period],
    )

    return result.rows[0] ?? null
  })
}

export async function updateUiPreferences(
  userId: string,
  patch: { hideAmounts: boolean },
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<{ ui_preferences: unknown }>(
      `
        UPDATE profiles
        SET ui_preferences = COALESCE(ui_preferences, '{}'::jsonb) || $2::jsonb
        WHERE user_id = $1
        RETURNING ui_preferences
      `,
      [userId, JSON.stringify(patch)],
    )

    if (!result.rowCount) {
      throw new Error("Profile not found.")
    }

    return parseUiPreferences(result.rows[0].ui_preferences)
  })
}

export async function saveCreditCardAnnualityOverrides(
  userId: string,
  creditCardId: string,
  anniversaryYear: number,
  overrides: Array<{ installmentIndex: number; amountCents: number }>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const card = await getCreditCard(client, userId, creditCardId)

    if (
      !card.annuality_enabled ||
      card.annuality_amount_cents == null ||
      card.annuality_payment_count == null
    ) {
      throw new Error("Enable annuality on this card before saving amounts.")
    }

    if (
      overrides.some(
        (override) =>
          override.installmentIndex < 1 ||
          override.installmentIndex > card.annuality_payment_count!,
      )
    ) {
      throw new Error("Installment index is outside this year's schedule.")
    }

    const annualityTransactions = await client.query<TransactionRecord>(
      `
        SELECT ${transactionSelectColumns.join(", ")}
        FROM transactions
        WHERE user_id = $1
          AND credit_card_id = $2
          AND payment_method = 'credit_card'
          AND concept = $3
      `,
      [userId, creditCardId, ANNUALITY_CONCEPT],
    )
    const materializedSum = annualityTransactions.rows.reduce(
      (sum, transaction) => {
        const parsed = parseAnnualityDescription(transaction.description)

        if (parsed?.anniversaryYear !== anniversaryYear) {
          return sum
        }

        return sum + Math.abs(transaction.amount_cents)
      },
      0,
    )
    const overrideSum = overrides.reduce(
      (sum, override) => sum + override.amountCents,
      0,
    )

    if (overrideSum + materializedSum !== card.annuality_amount_cents) {
      throw new Error("Installment amounts must add up to the full annual fee.")
    }

    await client.query(
      `
        DELETE FROM credit_card_annuality_overrides
        WHERE user_id = $1
          AND credit_card_id = $2
          AND anniversary_year = $3
      `,
      [userId, creditCardId, anniversaryYear],
    )

    const saved: CreditCardAnnualityOverrideRecord[] = []

    for (const override of overrides) {
      const result = await client.query<CreditCardAnnualityOverrideRecord>(
        `
          INSERT INTO credit_card_annuality_overrides (
            user_id,
            credit_card_id,
            anniversary_year,
            installment_index,
            amount_cents
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING ${creditCardAnnualityOverrideColumns.join(", ")}
        `,
        [
          userId,
          creditCardId,
          anniversaryYear,
          override.installmentIndex,
          override.amountCents,
        ],
      )
      saved.push(result.rows[0])
    }

    return saved
  })
}

export async function resetCreditCardAnnualityOverrides(
  userId: string,
  creditCardId: string,
  anniversaryYear: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    await getCreditCard(client, userId, creditCardId)

    await client.query(
      `
        DELETE FROM credit_card_annuality_overrides
        WHERE user_id = $1
          AND credit_card_id = $2
          AND anniversary_year = $3
      `,
      [userId, creditCardId, anniversaryYear],
    )

    return [] as CreditCardAnnualityOverrideRecord[]
  })
}
